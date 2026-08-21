import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

let adminToken: string;
let opsToken: string;
let salesToken: string;

let locationAId: string;
let locationBId: string;
let itemId: string;
let batchId: string;

beforeAll(async () => {
  await prisma.inventoryTransaction.deleteMany();
  await prisma.customerOrder.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'testadmin@erp.com' },
    update: { password: passwordHash, role: Role.ADMIN },
    create: { email: 'testadmin@erp.com', password: passwordHash, name: 'Test Admin', role: Role.ADMIN },
  });

  await prisma.user.upsert({
    where: { email: 'testops@erp.com' },
    update: { password: passwordHash, role: Role.OPERATIONS },
    create: { email: 'testops@erp.com', password: passwordHash, name: 'Test Ops', role: Role.OPERATIONS },
  });

  await prisma.user.upsert({
    where: { email: 'testsales@erp.com' },
    update: { password: passwordHash, role: Role.SALES },
    create: { email: 'testsales@erp.com', password: passwordHash, name: 'Test Sales', role: Role.SALES },
  });

  const resAdmin = await request(app).post('/api/auth/login').send({ email: 'testadmin@erp.com', password: 'password123' });
  adminToken = resAdmin.body.token;

  const resOps = await request(app).post('/api/auth/login').send({ email: 'testops@erp.com', password: 'password123' });
  opsToken = resOps.body.token;

  const resSales = await request(app).post('/api/auth/login').send({ email: 'testsales@erp.com', password: 'password123' });
  salesToken = resSales.body.token;

  const locA = await prisma.location.create({ data: { name: 'Test Location A', code: 'LOC-A' } });
  const locB = await prisma.location.create({ data: { name: 'Test Location B', code: 'LOC-B' } });
  locationAId = locA.id;
  locationBId = locB.id;

  const cat = await prisma.category.create({ data: { name: 'Test Category' } });
  const item = await prisma.item.create({ data: { sku: 'TEST-ITEM-001', name: 'Test Steel Pipe', categoryId: cat.id } });
  itemId = item.id;

  const batch = await prisma.batch.create({ data: { batchNumber: 'TEST-BATCH-01', itemId: item.id } });
  batchId = batch.id;

  await prisma.inventory.create({
    data: {
      itemId,
      locationId: locationAId,
      batchId: batch.id,
      physicalQuantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100,
    },
  });
});

describe('Mini Operations ERP Mandatory Business Logic Tests', () => {

  // Test 1: Cannot reserve more than available inventory
  it('Test 1: Cannot reserve more than available inventory', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Acme Corp',
        locationId: locationAId,
        itemId: itemId,
        quantity: 150, // Available is 100
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Insufficient available inventory');
  });

  // Test 2: Cannot transfer more than available inventory
  it('Test 2: Cannot transfer more than available inventory', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locationAId,
        destinationLocationId: locationBId,
        itemId: itemId,
        batchId: batchId,
        quantity: 200, // Available is 100
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Cannot transfer more than available inventory');
  });

  // Test 3: Destination stock increases ONLY after transfer receipt
  it('Test 3: Destination stock increases ONLY after transfer receipt', async () => {
    const reqRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locationAId,
        destinationLocationId: locationBId,
        itemId: itemId,
        batchId: batchId,
        quantity: 50,
      });

    const transferId = reqRes.body.data.id;

    await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${opsToken}`);

    const destInvBefore = await prisma.inventory.findFirst({
      where: { locationId: locationBId, itemId },
    });
    expect(destInvBefore?.physicalQuantity || 0).toBe(0);

    await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${opsToken}`);

    const destInvAfter = await prisma.inventory.findFirst({
      where: { locationId: locationBId, itemId },
    });
    expect(destInvAfter?.physicalQuantity).toBe(50);
  });

  // Test 4: Same transfer cannot be received twice
  it('Test 4: Same transfer cannot be received twice', async () => {
    const transfers = await prisma.stockTransfer.findMany({ where: { status: 'RECEIVED' } });
    const receivedTransferId = transfers[0].id;

    const res = await request(app)
      .post(`/api/transfers/${receivedTransferId}/receive`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already been received');
  });

  // Test 5: Unauthorized user cannot perform restricted operation
  it('Test 5: Unauthorized user cannot perform restricted operation', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        locationId: locationAId,
        itemId: itemId,
        requiredQuantity: 10,
        assignedUserId: 'any-user-id',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Forbidden');
  });

  // Concurrency Test: Available = 100, User A reserves 80, User B reserves 50 -> Only one reservation succeeds!
  it('Concurrency Test: Parallel race condition reservation handling', async () => {
    const locC = await prisma.location.create({ data: { name: 'Concurrency Test Location', code: 'LOC-CONC' } });
    const invConc = await prisma.inventory.create({
      data: {
        itemId,
        locationId: locC.id,
        batchId: batchId,
        physicalQuantity: 100,
        reservedQuantity: 0,
        availableQuantity: 100,
      },
    });

    const reqA = request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'User A Corp',
        locationId: locC.id,
        itemId: itemId,
        quantity: 80,
      });

    const reqB = request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'User B Inc',
        locationId: locC.id,
        itemId: itemId,
        quantity: 50,
      });

    const [resA, resB] = await Promise.all([reqA, reqB]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    const finalInv = await prisma.inventory.findUnique({ where: { id: invConc.id } });
    expect(finalInv!.reservedQuantity).toBeLessThanOrEqual(100);
    expect(finalInv!.availableQuantity).toBeGreaterThanOrEqual(0);
  });

});

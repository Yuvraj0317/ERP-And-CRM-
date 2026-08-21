import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role, WorkOrderStatus } from '@prisma/client';
import crypto from 'crypto';

let adminToken: string;
let opsToken: string;
let salesToken: string;

let adminUserId: string;
let opsUserId: string;

let testLocationId: string;
let testItemId: string;
let testBatchId: string;
let testInventoryId: string;

beforeAll(async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: { password: hashedPassword, role: Role.ADMIN },
    create: { email: 'admin@erp.com', password: hashedPassword, name: 'System Admin', role: Role.ADMIN },
  });
  adminUserId = admin.id;

  const ops = await prisma.user.upsert({
    where: { email: 'ops@erp.com' },
    update: { password: hashedPassword, role: Role.OPERATIONS },
    create: { email: 'ops@erp.com', password: hashedPassword, name: 'Operations Manager', role: Role.OPERATIONS },
  });
  opsUserId = ops.id;

  await prisma.user.upsert({
    where: { email: 'sales@erp.com' },
    update: { password: hashedPassword, role: Role.SALES },
    create: { email: 'sales@erp.com', password: hashedPassword, name: 'Sales Executive', role: Role.SALES },
  });

  const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: 'password123' });
  adminToken = adminRes.body.token;

  const opsRes = await request(app).post('/api/auth/login').send({ email: 'ops@erp.com', password: 'password123' });
  opsToken = opsRes.body.token;

  const salesRes = await request(app).post('/api/auth/login').send({ email: 'sales@erp.com', password: 'password123' });
  salesToken = salesRes.body.token;

  const loc = await prisma.location.upsert({
    where: { code: 'LOC-WO-TEST' },
    update: {},
    create: { name: 'Work Order Test Plant', code: 'LOC-WO-TEST' },
  });
  testLocationId = loc.id;

  const cat = await prisma.category.upsert({
    where: { name: 'Work Order Category' },
    update: {},
    create: { name: 'Work Order Category' },
  });

  const item = await prisma.item.upsert({
    where: { sku: 'SKU-WO-TEST-01' },
    update: {},
    create: { sku: 'SKU-WO-TEST-01', name: 'Work Order Raw Material', categoryId: cat.id },
  });
  testItemId = item.id;

  const batch = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-WO-TEST-01' },
    update: {},
    create: { batchNumber: 'BATCH-WO-TEST-01', itemId: item.id },
  });
  testBatchId = batch.id;
});

beforeEach(async () => {
  // Set clean inventory baseline for test item/location: Physical 20, Reserved 0 -> Available 20
  const inv = await prisma.inventory.upsert({
    where: {
      itemId_locationId_batchId: {
        itemId: testItemId,
        locationId: testLocationId,
        batchId: testBatchId,
      },
    },
    update: {
      physicalQuantity: 20,
      reservedQuantity: 0,
      availableQuantity: 20,
    },
    create: {
      itemId: testItemId,
      locationId: testLocationId,
      batchId: testBatchId,
      physicalQuantity: 20,
      reservedQuantity: 0,
      availableQuantity: 20,
    },
  });
  testInventoryId = inv.id;
});

describe('Phase 4: Work Orders & Dynamic Material Shortage Engine Integration Tests', () => {

  // TEST 1: ADMIN can create a Work Order (HTTP 201)
  it('TEST 1: ADMIN can create a Work Order (HTTP 201)', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 60,
        assignedUserId: opsUserId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workOrderNumber).toBeDefined();
    expect(res.body.data.status).toBe(WorkOrderStatus.ASSIGNED);
  });

  // TEST 2: OPERATIONS cannot create a Work Order (HTTP 403)
  it('TEST 2: OPERATIONS cannot create a Work Order (HTTP 403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 60,
        assignedUserId: opsUserId,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Forbidden');
  });

  // TEST 3: SALES cannot create a Work Order (HTTP 403)
  it('TEST 3: SALES cannot create a Work Order (HTTP 403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 60,
        assignedUserId: opsUserId,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Forbidden');
  });

  // TEST 4: Created Work Order stores authenticated user as createdById
  it('TEST 4: Created Work Order stores authenticated user as createdById', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 50,
        assignedUserId: opsUserId,
        createdById: 'spoofed-user-id', // Client spoofing attempt
      });

    expect(res.status).toBe(201);
    expect(res.body.data.createdBy.id).toBe(adminUserId); // Overridden by JWT context!
  });

  // TEST 5: Work Order requires a positive integer quantity (Invalid values rejected 400)
  it('TEST 5: Work Order requires a positive integer quantity', async () => {
    // Test zero
    const resZero = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 0,
        assignedUserId: opsUserId,
      });
    expect(resZero.status).toBe(400);

    // Test float
    const resFloat = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 12.5,
        assignedUserId: opsUserId,
      });
    expect(resFloat.status).toBe(400);
  });

  // TEST 6: Unknown item rejected (404)
  it('TEST 6: Unknown item rejected (404)', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: '00000000-0000-0000-0000-000000000000',
        requiredQuantity: 60,
        assignedUserId: opsUserId,
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Item not found');
  });

  // TEST 7: Unknown location rejected (404)
  it('TEST 7: Unknown location rejected (404)', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: '00000000-0000-0000-0000-000000000000',
        itemId: testItemId,
        requiredQuantity: 60,
        assignedUserId: opsUserId,
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Location not found');
  });

  // TEST 8: Unknown assigned user rejected (404)
  it('TEST 8: Unknown assigned user rejected (404)', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 60,
        assignedUserId: '00000000-0000-0000-0000-000000000000',
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Assigned User not found');
  });

  // TEST 9: New Work Order defaults to ASSIGNED
  it('TEST 9: New Work Order defaults to status ASSIGNED', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 30,
        assignedUserId: opsUserId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ASSIGNED');
  });

  // TEST 10: Work Order shortage is calculated correctly (required=60, available=20 -> shortage=40)
  it('TEST 10: Work Order shortage is calculated correctly (required=60, available=20 -> shortage=40)', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 60,
        assignedUserId: opsUserId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.currentAvailableQuantity).toBe(20);
    expect(res.body.data.shortage).toBe(40); // 60 - 20 = 40
  });

  // TEST 11: No shortage when stock is sufficient (required=60, available=80 -> shortage=0)
  it('TEST 11: No shortage when stock is sufficient (required=60, available=80 -> shortage=0)', async () => {
    // Increase available stock to 80
    await prisma.inventory.update({
      where: { id: testInventoryId },
      data: { physicalQuantity: 80, availableQuantity: 80 },
    });

    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 60,
        assignedUserId: opsUserId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.currentAvailableQuantity).toBe(80);
    expect(res.body.data.shortage).toBe(0); // max(0, 60 - 80) = 0
  });

  // TEST 12: Shortage changes dynamically after inventory changes
  it('TEST 12: Shortage changes dynamically after inventory changes', async () => {
    // Create WO requiring 60 against available 20 -> Initial Shortage = 40
    const createRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 60,
        assignedUserId: opsUserId,
      });

    const woId = createRes.body.data.id;
    expect(createRes.body.data.shortage).toBe(40);

    // Perform stock adjustment to increase available stock to 60
    await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 40, // 20 + 40 = 60
        reason: 'Restocking for Work Order requirement',
        idempotencyKey: `KEY-WO-STOCK-ADD-${crypto.randomUUID()}`,
      });

    // Query Work Order again: Shortage must dynamically update to 0!
    const getRes = await request(app)
      .get(`/api/work-orders/${woId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.currentAvailableQuantity).toBe(60);
    expect(getRes.body.data.shortage).toBe(0); // Dynamically recalculated!
  });

  // TEST 13: Shortage increases dynamically when available inventory decreases
  it('TEST 13: Shortage increases dynamically when available inventory decreases', async () => {
    // Set stock to 60 -> Available 60
    await prisma.inventory.update({
      where: { id: testInventoryId },
      data: { physicalQuantity: 60, availableQuantity: 60 },
    });

    const createRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 60,
        assignedUserId: opsUserId,
      });

    const woId = createRes.body.data.id;
    expect(createRes.body.data.shortage).toBe(0);

    // Reduce stock by 30 -> Available becomes 30
    await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: -30,
        reason: 'Material damage reduction',
        idempotencyKey: `KEY-WO-STOCK-REDUCE-${crypto.randomUUID()}`,
      });

    const getRes = await request(app)
      .get(`/api/work-orders/${woId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.currentAvailableQuantity).toBe(30);
    expect(getRes.body.data.shortage).toBe(30); // 60 - 30 = 30
  });

  // TEST 14: Creating a Work Order does NOT change inventory
  it('TEST 14: Creating a Work Order does NOT change inventory', async () => {
    const invBefore = await prisma.inventory.findUnique({ where: { id: testInventoryId } });

    await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 60,
        assignedUserId: opsUserId,
      });

    const invAfter = await prisma.inventory.findUnique({ where: { id: testInventoryId } });

    expect(invAfter!.physicalQuantity).toBe(invBefore!.physicalQuantity);
    expect(invAfter!.reservedQuantity).toBe(invBefore!.reservedQuantity);
    expect(invAfter!.availableQuantity).toBe(invBefore!.availableQuantity);
  });

  // TEST 15: Status can move from ASSIGNED -> IN_PROGRESS
  it('TEST 15: Status can move from ASSIGNED -> IN_PROGRESS', async () => {
    const createRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 20,
        assignedUserId: opsUserId,
      });

    const woId = createRes.body.data.id;

    const patchRes = await request(app)
      .patch(`/api/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe('IN_PROGRESS');
  });

  // TEST 16: Status can move from IN_PROGRESS -> COMPLETED
  it('TEST 16: Status can move from IN_PROGRESS -> COMPLETED', async () => {
    const createRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 20,
        assignedUserId: opsUserId,
      });

    const woId = createRes.body.data.id;

    await request(app)
      .patch(`/api/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ status: 'IN_PROGRESS' });

    const completeRes = await request(app)
      .patch(`/api/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ status: 'COMPLETED' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');
  });

  // TEST 17: Invalid status is rejected (400)
  it('TEST 17: Invalid status is rejected (400)', async () => {
    const createRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 20,
        assignedUserId: opsUserId,
      });

    const woId = createRes.body.data.id;

    const patchRes = await request(app)
      .patch(`/api/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'NON_EXISTENT_STATUS' });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.success).toBe(false);
  });

  // TEST 18: Completed Work Order cannot be moved backwards to ASSIGNED (400)
  it('TEST 18: Completed Work Order cannot be moved backwards to ASSIGNED (400)', async () => {
    const createRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locationId: testLocationId,
        itemId: testItemId,
        requiredQuantity: 20,
        assignedUserId: opsUserId,
      });

    const woId = createRes.body.data.id;

    await request(app)
      .patch(`/api/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED' });

    const revertRes = await request(app)
      .patch(`/api/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ASSIGNED' });

    expect(revertRes.status).toBe(400);
    expect(revertRes.body.error).toContain('cannot be moved backwards');
  });

  // TEST 19: Shortage edge cases (never negative)
  it('TEST 19: Shortage edge cases (never negative)', async () => {
    // Case A: required = 1, available = 0 -> shortage = 1
    await prisma.inventory.update({
      where: { id: testInventoryId },
      data: { physicalQuantity: 0, availableQuantity: 0 },
    });
    const woA = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ locationId: testLocationId, itemId: testItemId, requiredQuantity: 1, assignedUserId: opsUserId });
    expect(woA.body.data.shortage).toBe(1);

    // Case B: required = 60, available = 60 -> shortage = 0
    await prisma.inventory.update({
      where: { id: testInventoryId },
      data: { physicalQuantity: 60, availableQuantity: 60 },
    });
    const woB = await request(app)
      .get(`/api/work-orders/${woA.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(woB.body.data.shortage).toBe(0);

    // Case C: required = 60, available = 100 -> shortage = 0 (never negative)
    await prisma.inventory.update({
      where: { id: testInventoryId },
      data: { physicalQuantity: 100, availableQuantity: 100 },
    });
    const woC = await request(app)
      .get(`/api/work-orders/${woA.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(woC.body.data.shortage).toBe(0);
  });

});

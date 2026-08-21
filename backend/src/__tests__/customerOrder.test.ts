import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role, CustomerOrderStatus } from '@prisma/client';
import crypto from 'crypto';

let adminToken: string;
let opsToken: string;
let salesToken: string;

let salesUserId: string;

let testLocId: string;
let testItemId: string;
let testBatchAId: string;
let testBatchBId: string;
let invAId: string;

beforeAll(async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: { password: hashedPassword, role: Role.ADMIN },
    create: { email: 'admin@erp.com', password: hashedPassword, name: 'System Admin', role: Role.ADMIN },
  });

  await prisma.user.upsert({
    where: { email: 'ops@erp.com' },
    update: { password: hashedPassword, role: Role.OPERATIONS },
    create: { email: 'ops@erp.com', password: hashedPassword, name: 'Operations Manager', role: Role.OPERATIONS },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'sales@erp.com' },
    update: { password: hashedPassword, role: Role.SALES },
    create: { email: 'sales@erp.com', password: hashedPassword, name: 'Sales Executive', role: Role.SALES },
  });
  salesUserId = sales.id;

  const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: 'password123' });
  adminToken = adminRes.body.token;

  const opsRes = await request(app).post('/api/auth/login').send({ email: 'ops@erp.com', password: 'password123' });
  opsToken = opsRes.body.token;

  const salesRes = await request(app).post('/api/auth/login').send({ email: 'sales@erp.com', password: 'password123' });
  salesToken = salesRes.body.token;

  const loc = await prisma.location.upsert({
    where: { code: 'LOC-CO-TEST' },
    update: {},
    create: { name: 'Customer Order Test Location', code: 'LOC-CO-TEST' },
  });
  testLocId = loc.id;

  const cat = await prisma.category.upsert({
    where: { name: 'Customer Order Category' },
    update: {},
    create: { name: 'Customer Order Category' },
  });

  const item = await prisma.item.upsert({
    where: { sku: 'SKU-CO-TEST-01' },
    update: {},
    create: { sku: 'SKU-CO-TEST-01', name: 'Customer Order Item', categoryId: cat.id },
  });
  testItemId = item.id;

  const bA = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-CO-A' },
    update: {},
    create: { batchNumber: 'BATCH-CO-A', itemId: item.id },
  });
  testBatchAId = bA.id;

  const bB = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-CO-B' },
    update: {},
    create: { batchNumber: 'BATCH-CO-B', itemId: item.id },
  });
  testBatchBId = bB.id;
});

beforeEach(async () => {
  // Set clean single-batch inventory baseline: Physical 100, Reserved 0 -> Available 100
  const invA = await prisma.inventory.upsert({
    where: {
      itemId_locationId_batchId: {
        itemId: testItemId,
        locationId: testLocId,
        batchId: testBatchAId,
      },
    },
    update: {
      physicalQuantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100,
    },
    create: {
      itemId: testItemId,
      locationId: testLocId,
      batchId: testBatchAId,
      physicalQuantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100,
    },
  });
  invAId = invA.id;

  // Clean Batch B inventory record if exists
  await prisma.inventory.updateMany({
    where: {
      locationId: testLocId,
      itemId: testItemId,
      batchId: testBatchBId,
    },
    data: {
      physicalQuantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
    },
  });
});

describe('Phase 6: Customer Orders & Concurrency-Safe Stock Reservation Engine Tests', () => {

  // AUTHORIZATION TESTS
  // TEST 1: SALES can create Customer Order (HTTP 201)
  it('TEST 1: SALES can create Customer Order (HTTP 201)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Acme Corp',
        locationId: testLocId,
        itemId: testItemId,
        quantity: 40,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderNumber).toBeDefined();
    expect(res.body.data.status).toBe(CustomerOrderStatus.RESERVED);
  });

  // TEST 2: OPERATIONS cannot create Customer Order (HTTP 403)
  it('TEST 2: OPERATIONS cannot create Customer Order (HTTP 403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        customerName: 'Acme Corp',
        locationId: testLocId,
        itemId: testItemId,
        quantity: 40,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // TEST 3: Unauthorized request rejected (HTTP 401)
  it('TEST 3: Unauthorized request rejected (HTTP 401)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .send({ customerName: 'Acme Corp', locationId: testLocId, itemId: testItemId, quantity: 40 });

    expect(res.status).toBe(401);
  });

  // TEST 4: salesUserId comes from JWT (cannot spoof)
  it('TEST 4: salesUserId comes from JWT', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Acme Corp',
        locationId: testLocId,
        itemId: testItemId,
        quantity: 10,
        salesUserId: 'spoofed-id',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.salesUser.id).toBe(salesUserId);
  });

  // VALIDATION TESTS
  // TEST 5: Missing customerName rejected (400)
  it('TEST 5: Missing customerName rejected (400)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: '', locationId: testLocId, itemId: testItemId, quantity: 10 });
    expect(res.status).toBe(400);
  });

  // TEST 6: Missing item rejected (400)
  it('TEST 6: Missing item rejected (400)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Acme Corp', locationId: testLocId, itemId: '', quantity: 10 });
    expect(res.status).toBe(400);
  });

  // TEST 7: Missing location rejected (400)
  it('TEST 7: Missing location rejected (400)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Acme Corp', locationId: '', itemId: testItemId, quantity: 10 });
    expect(res.status).toBe(400);
  });

  // TEST 8: Zero quantity rejected (400)
  it('TEST 8: Zero quantity rejected (400)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Acme Corp', locationId: testLocId, itemId: testItemId, quantity: 0 });
    expect(res.status).toBe(400);
  });

  // TEST 9: Negative quantity rejected (400)
  it('TEST 9: Negative quantity rejected (400)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Acme Corp', locationId: testLocId, itemId: testItemId, quantity: -10 });
    expect(res.status).toBe(400);
  });

  // TEST 10: Decimal quantity rejected (400)
  it('TEST 10: Decimal quantity rejected (400)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Acme Corp', locationId: testLocId, itemId: testItemId, quantity: 10.5 });
    expect(res.status).toBe(400);
  });

  // TEST 11: Unknown item rejected (404)
  it('TEST 11: Unknown item rejected (404)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Acme Corp', locationId: testLocId, itemId: '00000000-0000-0000-0000-000000000000', quantity: 10 });
    expect(res.status).toBe(404);
  });

  // TEST 12: Unknown location rejected (404)
  it('TEST 12: Unknown location rejected (404)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Acme Corp', locationId: '00000000-0000-0000-0000-000000000000', itemId: testItemId, quantity: 10 });
    expect(res.status).toBe(404);
  });

  // RESERVATION TESTS
  // TEST 13, 14, 15, 18, 34: Successful order reserves stock, preserves physical stock and invariants
  it('TEST 13, 14, 15, 18, 34: Successful order reserves stock', async () => {
    // Physical = 100, Reserved = 0, Available = 100. Reserve 40.
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Acme Corp', locationId: testLocId, itemId: testItemId, quantity: 40 });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('RESERVED');

    const inv = await prisma.inventory.findUnique({ where: { id: invAId } });
    // TEST 14: Physical stock remains 100!
    expect(inv!.physicalQuantity).toBe(100);
    // TEST 13 & 15: Reserved = 40, Available = 60
    expect(inv!.reservedQuantity).toBe(40);
    expect(inv!.availableQuantity).toBe(60);
    expect(inv!.availableQuantity).toBe(inv!.physicalQuantity - inv!.reservedQuantity);

    // TEST 18: RESERVATION transaction record created
    const tx = await prisma.inventoryTransaction.findFirst({
      where: { referenceId: res.body.data.id, type: 'RESERVATION' },
    });
    expect(tx).not.toBeNull();
    expect(tx!.quantity).toBe(40);
  });

  // TEST 16, 17, 19: Cannot reserve more than available stock (400)
  it('TEST 16, 17, 19: Cannot reserve more than available stock (400)', async () => {
    const ordersCountBefore = await prisma.customerOrder.count();
    const txCountBefore = await prisma.inventoryTransaction.count();

    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Acme Corp', locationId: testLocId, itemId: testItemId, quantity: 150 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient available stock');

    // TEST 17: No RESERVED order created
    const ordersCountAfter = await prisma.customerOrder.count();
    expect(ordersCountAfter).toBe(ordersCountBefore);

    // TEST 19: No transaction created
    const txCountAfter = await prisma.inventoryTransaction.count();
    expect(txCountAfter).toBe(txCountBefore);
  });

  // MULTI-BATCH RESERVATION TESTS
  // TEST 22: Multi-batch stock reservation across multiple batches
  it('TEST 22: Multi-batch stock reservation across multiple batches', async () => {
    // Set Batch A: Physical 30, Available 30. Set Batch B: Physical 40, Available 40. Total = 70.
    await prisma.inventory.update({
      where: { id: invAId },
      data: { physicalQuantity: 30, reservedQuantity: 0, availableQuantity: 30 },
    });

    const invB = await prisma.inventory.upsert({
      where: {
        itemId_locationId_batchId: { itemId: testItemId, locationId: testLocId, batchId: testBatchBId },
      },
      update: { physicalQuantity: 40, reservedQuantity: 0, availableQuantity: 40 },
      create: { itemId: testItemId, locationId: testLocId, batchId: testBatchBId, physicalQuantity: 40, reservedQuantity: 0, availableQuantity: 40 },
    });

    // Reserve 50 units (30 from Batch A, 20 from Batch B)
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Multi-Batch Corp', locationId: testLocId, itemId: testItemId, quantity: 50 });

    expect(res.status).toBe(201);

    const postInvA = await prisma.inventory.findUnique({ where: { id: invAId } });
    const postInvB = await prisma.inventory.findUnique({ where: { id: invB.id } });

    expect(postInvA!.reservedQuantity).toBe(30);
    expect(postInvA!.availableQuantity).toBe(0);

    expect(postInvB!.reservedQuantity).toBe(20);
    expect(postInvB!.availableQuantity).toBe(20);
  });

  // TEST 23: Multi-batch insufficient stock fails atomically
  it('TEST 23: Multi-batch insufficient stock fails atomically', async () => {
    // Set Batch A: 20, Batch B: 20. Total = 40. Request = 50.
    await prisma.inventory.update({
      where: { id: invAId },
      data: { physicalQuantity: 20, reservedQuantity: 0, availableQuantity: 20 },
    });

    const invB = await prisma.inventory.upsert({
      where: { itemId_locationId_batchId: { itemId: testItemId, locationId: testLocId, batchId: testBatchBId } },
      update: { physicalQuantity: 20, reservedQuantity: 0, availableQuantity: 20 },
      create: { itemId: testItemId, locationId: testLocId, batchId: testBatchBId, physicalQuantity: 20, reservedQuantity: 0, availableQuantity: 20 },
    });

    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Insufficient Multi Corp', locationId: testLocId, itemId: testItemId, quantity: 50 });

    expect(res.status).toBe(400);

    const postInvA = await prisma.inventory.findUnique({ where: { id: invAId } });
    const postInvB = await prisma.inventory.findUnique({ where: { id: invB.id } });

    expect(postInvA!.reservedQuantity).toBe(0); // Unchanged!
    expect(postInvB!.reservedQuantity).toBe(0); // Unchanged!
  });

  // CONCURRENCY TESTS
  // TEST 24: Concurrent reservation race condition (Available 100, A=80, B=50 -> 1 succeeds, 1 fails)
  it('TEST 24: Concurrent reservation race condition handling', async () => {
    const locConc = await prisma.location.upsert({
      where: { code: 'LOC-CO-CONC' },
      update: {},
      create: { name: 'Conc Customer Order Loc', code: 'LOC-CO-CONC' },
    });

    const invConc = await prisma.inventory.upsert({
      where: { itemId_locationId_batchId: { itemId: testItemId, locationId: locConc.id, batchId: testBatchAId } },
      update: { physicalQuantity: 100, reservedQuantity: 0, availableQuantity: 100 },
      create: { itemId: testItemId, locationId: locConc.id, batchId: testBatchAId, physicalQuantity: 100, reservedQuantity: 0, availableQuantity: 100 },
    });

    const reqA = request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'User A Corp', locationId: locConc.id, itemId: testItemId, quantity: 80 });

    const reqB = request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'User B Inc', locationId: locConc.id, itemId: testItemId, quantity: 50 });

    const [resA, resB] = await Promise.all([reqA, reqB]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    const finalInv = await prisma.inventory.findUnique({ where: { id: invConc.id } });
    expect(finalInv!.reservedQuantity).toBeLessThanOrEqual(100);
    expect(finalInv!.availableQuantity).toBeGreaterThanOrEqual(0);
    expect([80, 50]).toContain(finalInv!.reservedQuantity); // NEVER 130!
  });

  // TEST 25: Concurrent reservations totaling <= stock can succeed
  it('TEST 25: Concurrent reservations totaling <= stock can succeed', async () => {
    const locConc2 = await prisma.location.upsert({
      where: { code: 'LOC-CO-CONC2' },
      update: {},
      create: { name: 'Conc Customer Order Loc 2', code: 'LOC-CO-CONC2' },
    });

    await prisma.inventory.upsert({
      where: { itemId_locationId_batchId: { itemId: testItemId, locationId: locConc2.id, batchId: testBatchAId } },
      update: { physicalQuantity: 100, reservedQuantity: 0, availableQuantity: 100 },
      create: { itemId: testItemId, locationId: locConc2.id, batchId: testBatchAId, physicalQuantity: 100, reservedQuantity: 0, availableQuantity: 100 },
    });

    const reqA = request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Parallel A', locationId: locConc2.id, itemId: testItemId, quantity: 40 });

    const reqB = request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Parallel B', locationId: locConc2.id, itemId: testItemId, quantity: 50 });

    const [resA, resB] = await Promise.all([reqA, reqB]);

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
  });

  // CANCELLATION & RELEASE TESTS
  // TEST 27, 28, 31, 35: Reserved order can be cancelled, releases stock, preserves invariant
  it('TEST 27, 28, 31, 35: Order cancellation releases stock', async () => {
    const createRes = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Cancel Test Corp', locationId: testLocId, itemId: testItemId, quantity: 40 });

    const orderId = createRes.body.data.id;
    const invReserved = await prisma.inventory.findUnique({ where: { id: invAId } });
    expect(invReserved!.reservedQuantity).toBe(40);

    const cancelRes = await request(app)
      .post(`/api/customer-orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    const invReleased = await prisma.inventory.findUnique({ where: { id: invAId } });
    expect(invReleased!.reservedQuantity).toBe(0);
    expect(invReleased!.availableQuantity).toBe(100);
    expect(invReleased!.physicalQuantity).toBe(100);

    // TEST 28: RELEASE transaction created
    const tx = await prisma.inventoryTransaction.findFirst({
      where: { referenceId: orderId, type: 'RELEASE' },
    });
    expect(tx).not.toBeNull();
  });

  // TEST 29 & 30: Cancelled order cannot be cancelled twice
  it('TEST 29 & 30: Cancelled order cannot be cancelled twice', async () => {
    const createRes = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Double Cancel Corp', locationId: testLocId, itemId: testItemId, quantity: 30 });

    const orderId = createRes.body.data.id;
    await request(app).post(`/api/customer-orders/${orderId}/cancel`).set('Authorization', `Bearer ${salesToken}`);

    // Second cancel attempt
    const res2 = await request(app)
      .post(`/api/customer-orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res2.status).toBe(400);
    expect(res2.body.error).toContain('already been cancelled');

    // TEST 30: Stock not released again
    const inv = await prisma.inventory.findUnique({ where: { id: invAId } });
    expect(inv!.availableQuantity).toBe(100);
  });

  // TEST 32 & 33: Idempotency protection for reservation and release
  it('TEST 32 & 33: Idempotency protection', async () => {
    const fixedKey = `KEY-CO-IDEMPOTENT-${crypto.randomUUID()}`;

    const res1 = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .set('Idempotency-Key', fixedKey)
      .send({ customerName: 'Idempotency Corp', locationId: testLocId, itemId: testItemId, quantity: 20 });

    expect(res1.status).toBe(201);

    // Second request with same idempotency key returns duplicate order
    const res2 = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .set('Idempotency-Key', fixedKey)
      .send({ customerName: 'Idempotency Corp', locationId: testLocId, itemId: testItemId, quantity: 20 });

    expect(res2.status).toBe(201);
    expect(res2.body.data.id).toBe(res1.body.data.id);

    // TEST 32: Stock reserved ONCE (20), not twice (40)
    const inv = await prisma.inventory.findUnique({ where: { id: invAId } });
    expect(inv!.reservedQuantity).toBe(20);
  });

  // WORK ORDER DYNAMIC INTERACTION INTEGRATION TEST
  it('TEST: Customer order reservation automatically updates dynamic Work Order shortage', async () => {
    // 1. Create Work Order requiring 60 sheets against available 100 -> Shortage = 0
    const woRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ locationId: testLocId, itemId: testItemId, requiredQuantity: 60, assignedUserId: salesUserId });

    expect(woRes.body.data.shortage).toBe(0);

    // 2. Sales creates Customer Order reserving 80 sheets -> Available drops to 20
    await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: 'Interacting Customer', locationId: testLocId, itemId: testItemId, quantity: 80 });

    // 3. GET Work Order again -> Shortage automatically updates to 40 (60 - 20 = 40)!
    const getWo = await request(app)
      .get(`/api/work-orders/${woRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getWo.body.data.currentAvailableQuantity).toBe(20);
    expect(getWo.body.data.shortage).toBe(40);
  });

});

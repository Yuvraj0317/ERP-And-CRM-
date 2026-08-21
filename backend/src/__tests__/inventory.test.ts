import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import crypto from 'crypto';

let adminToken: string;
let opsToken: string;
let salesToken: string;

let testInventoryId: string;
let testLocationId: string;
let testItemId: string;
let testBatchId: string;

beforeAll(async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: { password: hashedPassword, role: Role.ADMIN },
    create: { email: 'admin@erp.com', password: hashedPassword, name: 'System Admin', role: Role.ADMIN },
  });

  const ops = await prisma.user.upsert({
    where: { email: 'ops@erp.com' },
    update: { password: hashedPassword, role: Role.OPERATIONS },
    create: { email: 'ops@erp.com', password: hashedPassword, name: 'Operations Manager', role: Role.OPERATIONS },
  });

  const sales = await prisma.user.upsert({
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
    where: { code: 'LOC-INV-TEST' },
    update: {},
    create: { name: 'Inventory Test Location', code: 'LOC-INV-TEST' },
  });
  testLocationId = loc.id;

  const cat = await prisma.category.upsert({
    where: { name: 'Test Inventory Category' },
    update: {},
    create: { name: 'Test Inventory Category' },
  });

  const item = await prisma.item.upsert({
    where: { sku: 'SKU-INV-TEST-01' },
    update: {},
    create: { sku: 'SKU-INV-TEST-01', name: 'Test Steel Beam', categoryId: cat.id },
  });
  testItemId = item.id;

  const batch = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-INV-TEST-01' },
    update: {},
    create: { batchNumber: 'BATCH-INV-TEST-01', itemId: item.id },
  });
  testBatchId = batch.id;
});

beforeEach(async () => {
  // Reset test inventory item to clean baseline: Physical 100, Reserved 20 -> Available 80
  const inv = await prisma.inventory.upsert({
    where: {
      itemId_locationId_batchId: {
        itemId: testItemId,
        locationId: testLocationId,
        batchId: testBatchId,
      },
    },
    update: {
      physicalQuantity: 100,
      reservedQuantity: 20,
      availableQuantity: 80,
    },
    create: {
      itemId: testItemId,
      locationId: testLocationId,
      batchId: testBatchId,
      physicalQuantity: 100,
      reservedQuantity: 20,
      availableQuantity: 80,
    },
  });
  testInventoryId = inv.id;
});

describe('Phase 3: Inventory Management Engine Integration Tests', () => {

  // TEST 1: Authenticated ADMIN can view inventory
  it('TEST 1: Authenticated ADMIN can view inventory', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // TEST 2: Authenticated OPERATIONS can view inventory
  it('TEST 2: Authenticated OPERATIONS can view inventory', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // TEST 3: Authenticated ADMIN can perform stock adjustment
  it('TEST 3: Authenticated ADMIN can perform stock adjustment', async () => {
    const key = `KEY-ADMIN-ADJ-${crypto.randomUUID()}`;
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 10,
        reason: 'Admin physical count add',
        idempotencyKey: key,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.physicalQuantity).toBe(110);
    expect(res.body.data.availableQuantity).toBe(90);
  });

  // TEST 4: Authenticated OPERATIONS can perform stock adjustment
  it('TEST 4: Authenticated OPERATIONS can perform stock adjustment', async () => {
    const key = `KEY-OPS-ADJ-${crypto.randomUUID()}`;
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 15,
        reason: 'Operations warehouse audit',
        idempotencyKey: key,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.physicalQuantity).toBe(115);
    expect(res.body.data.availableQuantity).toBe(95);
  });

  // TEST 5: SALES cannot perform stock adjustment (403)
  it('TEST 5: SALES cannot perform stock adjustment (403 Forbidden)', async () => {
    const key = `KEY-SALES-ADJ-${crypto.randomUUID()}`;
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 10,
        reason: 'Unauthorized sales edit',
        idempotencyKey: key,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Forbidden');
  });

  // TEST 6: Positive adjustment correctly increases physical and available stock
  it('TEST 6: Positive adjustment correctly increases physical and available stock', async () => {
    const key = `KEY-POS-${crypto.randomUUID()}`;
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 50,
        reason: 'Receiving shipment',
        idempotencyKey: key,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.physicalQuantity).toBe(150); // 100 + 50
    expect(res.body.data.reservedQuantity).toBe(20);
    expect(res.body.data.availableQuantity).toBe(130); // 150 - 20
  });

  // TEST 7: Negative adjustment correctly decreases physical and available stock
  it('TEST 7: Negative adjustment correctly decreases physical and available stock', async () => {
    const key = `KEY-NEG-${crypto.randomUUID()}`;
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: -30,
        reason: 'Damaged item write-off',
        idempotencyKey: key,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.physicalQuantity).toBe(70); // 100 - 30
    expect(res.body.data.reservedQuantity).toBe(20);
    expect(res.body.data.availableQuantity).toBe(50); // 70 - 20
  });

  // TEST 8: Adjustment cannot make physical stock negative (400)
  it('TEST 8: Adjustment cannot make physical stock negative (400)', async () => {
    const key = `KEY-OVERREDUCE-${crypto.randomUUID()}`;
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: -150, // Physical is 100
        reason: 'Excess reduction',
        idempotencyKey: key,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('negative physical stock');
  });

  // TEST 9: Adjustment cannot make physical stock lower than reserved quantity (400)
  it('TEST 9: Adjustment cannot make physical stock lower than reserved quantity (400)', async () => {
    // Physical = 100, Reserved = 20 -> Available = 80
    // Attempting adjustment = -85 (new physical would be 15, which is < reserved 20)
    const key = `KEY-BELOW-RESERVED-${crypto.randomUUID()}`;
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: -85,
        reason: 'Reduction violating reserved stock bound',
        idempotencyKey: key,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('reduce physical stock below reserved stock');
  });

  // TEST 10: Available quantity remains physical - reserved
  it('TEST 10: Available quantity remains physical - reserved', async () => {
    const res = await request(app)
      .get(`/api/inventory/${testInventoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { physicalQuantity, reservedQuantity, availableQuantity } = res.body.data;
    expect(availableQuantity).toBe(physicalQuantity - reservedQuantity);
  });

  // TEST 11: Duplicate idempotency key cannot apply the same mutation twice (409)
  it('TEST 11: Duplicate idempotency key cannot apply the same mutation twice (409)', async () => {
    const fixedKey = `KEY-IDEMPOTENT-FIXED-${crypto.randomUUID()}`;

    // First Request: Succeeds (200)
    const res1 = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 10,
        reason: 'Idempotency test mutation',
        idempotencyKey: fixedKey,
      });
    expect(res1.status).toBe(200);

    // Second Request with identical idempotencyKey: Returns 409 Conflict
    const res2 = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 10,
        reason: 'Idempotency test mutation duplicate',
        idempotencyKey: fixedKey,
      });

    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
    expect(res2.body.error).toContain('Duplicate idempotency key');
  });

  // TEST 12: Successful adjustment creates exactly one InventoryTransaction
  it('TEST 12: Successful adjustment creates exactly one InventoryTransaction', async () => {
    const key = `KEY-TX-COUNT-${crypto.randomUUID()}`;
    const initialTxCount = await prisma.inventoryTransaction.count({
      where: { inventoryId: testInventoryId },
    });

    await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 5,
        reason: 'Transaction audit counting test',
        idempotencyKey: key,
      });

    const finalTxCount = await prisma.inventoryTransaction.count({
      where: { inventoryId: testInventoryId },
    });

    expect(finalTxCount).toBe(initialTxCount + 1);
  });

  // TEST 13: Failed adjustment does not create an InventoryTransaction
  it('TEST 13: Failed adjustment does not create an InventoryTransaction', async () => {
    const key = `KEY-FAILED-TX-${crypto.randomUUID()}`;
    const initialTxCount = await prisma.inventoryTransaction.count();

    await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: -999, // Invalid reduction
        reason: 'Failing reduction test',
        idempotencyKey: key,
      });

    const finalTxCount = await prisma.inventoryTransaction.count();
    expect(finalTxCount).toBe(initialTxCount);
  });

  // TEST 14: Concurrent stock decreases cannot create negative inventory
  it('TEST 14: Concurrent stock decreases cannot create negative inventory', async () => {
    // Fresh test inventory item with Physical 100, Reserved 0 -> Available 100
    const locConc = await prisma.location.upsert({
      where: { code: 'LOC-CONC-INV' },
      update: {},
      create: { name: 'Conc Inventory Loc', code: 'LOC-CONC-INV' },
    });
    const invConc = await prisma.inventory.upsert({
      where: {
        itemId_locationId_batchId: {
          itemId: testItemId,
          locationId: locConc.id,
          batchId: testBatchId,
        },
      },
      update: {
        physicalQuantity: 100,
        reservedQuantity: 0,
        availableQuantity: 100,
      },
      create: {
        itemId: testItemId,
        locationId: locConc.id,
        batchId: testBatchId,
        physicalQuantity: 100,
        reservedQuantity: 0,
        availableQuantity: 100,
      },
    });

    // Run parallel adjustments: A = -80, B = -50 against 100 physical stock
    const reqA = request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: invConc.id,
        quantity: -80,
        reason: 'Concurrent reduction A',
        idempotencyKey: `KEY-CONC-A-${crypto.randomUUID()}`,
      });

    const reqB = request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: invConc.id,
        quantity: -50,
        reason: 'Concurrent reduction B',
        idempotencyKey: `KEY-CONC-B-${crypto.randomUUID()}`,
      });

    const [resA, resB] = await Promise.all([reqA, reqB]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(400);

    const finalInv = await prisma.inventory.findUnique({ where: { id: invConc.id } });
    expect(finalInv!.physicalQuantity).toBeGreaterThanOrEqual(0);
    expect([20, 50]).toContain(finalInv!.physicalQuantity);
    expect(finalInv!.physicalQuantity).not.toBe(-30);
  });

  // TEST 15: Unknown inventory ID returns 404
  it('TEST 15: Unknown inventory ID returns 404', async () => {
    const key = `KEY-UNK-${crypto.randomUUID()}`;
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: '00000000-0000-0000-0000-000000000000',
        quantity: 10,
        reason: 'Unknown inventory test',
        idempotencyKey: key,
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // TEST 16: Invalid quantity is rejected (400)
  it('TEST 16: Invalid quantity (zero or non-integer) is rejected (400)', async () => {
    const key = `KEY-INVALID-QTY-${crypto.randomUUID()}`;

    // Test zero quantity
    const resZero = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 0,
        reason: 'Zero quantity test',
        idempotencyKey: key,
      });
    expect(resZero.status).toBe(400);

    // Test float quantity
    const resFloat = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 10.5,
        reason: 'Float quantity test',
        idempotencyKey: `${key}-float`,
      });
    expect(resFloat.status).toBe(400);
  });

  // TEST 17: Transaction atomicity: rollback if transaction record creation fails
  it('TEST 17: Transaction atomicity rollback when transaction creation fails', async () => {
    const key = `KEY-ATOMICITY-${crypto.randomUUID()}`;
    const initialInv = await prisma.inventory.findUnique({ where: { id: testInventoryId } });

    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inventoryId: testInventoryId,
        quantity: 20,
        reason: 'Atomicity test',
        idempotencyKey: key,
        simulatedErrorForAtomicityTest: true,
      });

    expect(res.status).toBe(500); // Rolled back due to error

    const postInv = await prisma.inventory.findUnique({ where: { id: testInventoryId } });
    expect(postInv!.physicalQuantity).toBe(initialInv!.physicalQuantity); // Unchanged!
  });

});

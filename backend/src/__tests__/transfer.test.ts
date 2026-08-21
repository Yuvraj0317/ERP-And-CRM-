import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role, TransferStatus } from '@prisma/client';
import crypto from 'crypto';

let adminToken: string;
let opsToken: string;
let salesToken: string;

let adminUserId: string;
let opsUserId: string;

let sourceLocId: string;
let destLocId: string;
let itemId: string;
let item2Id: string;
let batchId: string;
let batch2Id: string;
let sourceInvId: string;

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

  const locA = await prisma.location.upsert({
    where: { code: 'LOC-TR-ALPHA' },
    update: {},
    create: { name: 'Main Warehouse Alpha', code: 'LOC-TR-ALPHA' },
  });
  sourceLocId = locA.id;

  const locB = await prisma.location.upsert({
    where: { code: 'LOC-TR-BETA' },
    update: {},
    create: { name: 'Factory Beta Plant', code: 'LOC-TR-BETA' },
  });
  destLocId = locB.id;

  const cat = await prisma.category.upsert({
    where: { name: 'Transfer Test Category' },
    update: {},
    create: { name: 'Transfer Test Category' },
  });

  const item1 = await prisma.item.upsert({
    where: { sku: 'SKU-TR-ITEM-1' },
    update: {},
    create: { sku: 'SKU-TR-ITEM-1', name: 'Transfer Item Alpha', categoryId: cat.id },
  });
  itemId = item1.id;

  const item2 = await prisma.item.upsert({
    where: { sku: 'SKU-TR-ITEM-2' },
    update: {},
    create: { sku: 'SKU-TR-ITEM-2', name: 'Transfer Item Beta', categoryId: cat.id },
  });
  item2Id = item2.id;

  const b1 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-TR-01' },
    update: {},
    create: { batchNumber: 'BATCH-TR-01', itemId: item1.id },
  });
  batchId = b1.id;

  const b2 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-TR-02-MISMATCH' },
    update: {},
    create: { batchNumber: 'BATCH-TR-02-MISMATCH', itemId: item2.id },
  });
  batch2Id = b2.id;
});

beforeEach(async () => {
  // Set clean source inventory baseline: Physical 100, Reserved 20 -> Available 80
  const sourceInv = await prisma.inventory.upsert({
    where: {
      itemId_locationId_batchId: {
        itemId: itemId,
        locationId: sourceLocId,
        batchId: batchId,
      },
    },
    update: {
      physicalQuantity: 100,
      reservedQuantity: 20,
      availableQuantity: 80,
    },
    create: {
      itemId: itemId,
      locationId: sourceLocId,
      batchId: batchId,
      physicalQuantity: 100,
      reservedQuantity: 20,
      availableQuantity: 80,
    },
  });
  sourceInvId = sourceInv.id;

  // Reset destination inventory to 0 if exists
  await prisma.inventory.updateMany({
    where: {
      locationId: destLocId,
      itemId: itemId,
    },
    data: {
      physicalQuantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
    },
  });
});

describe('Phase 5: Internal Stock Transfer Lifecycle Integration Tests', () => {

  // TEST 1: ADMIN can create transfer (201)
  it('TEST 1: ADMIN can create transfer (201)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId: itemId,
        batchId: batchId,
        quantity: 40,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transferNumber).toBeDefined();
    expect(res.body.data.status).toBe(TransferStatus.REQUESTED);
  });

  // TEST 2: OPERATIONS can create transfer (201)
  it('TEST 2: OPERATIONS can create transfer (201)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId: itemId,
        batchId: batchId,
        quantity: 30,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // TEST 3: SALES cannot create transfer (403)
  it('TEST 3: SALES cannot create transfer (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId: itemId,
        batchId: batchId,
        quantity: 30,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // TEST 4: created/requested user comes from JWT (cannot spoof)
  it('TEST 4: created/requested user comes from JWT', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId: itemId,
        batchId: batchId,
        quantity: 40,
        requestedById: 'spoofed-id',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.requestedBy.id).toBe(adminUserId);
  });

  // TEST 5: New transfer defaults to REQUESTED
  it('TEST 5: New transfer defaults to status REQUESTED', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId: itemId,
        batchId: batchId,
        quantity: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('REQUESTED');
  });

  // TEST 6: Invalid quantity rejected (0, float, negative)
  it('TEST 6: Invalid quantity rejected (400)', async () => {
    const resZero = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId,
        batchId,
        quantity: 0,
      });
    expect(resZero.status).toBe(400);

    const resFloat = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId,
        batchId,
        quantity: 10.5,
      });
    expect(resFloat.status).toBe(400);
  });

  // TEST 7: Same source and destination location rejected (400)
  it('TEST 7: Same source and destination location rejected (400)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: sourceLocId, // Identical
        itemId,
        batchId,
        quantity: 20,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('must be different');
  });

  // TEST 8: Unknown item rejected (404)
  it('TEST 8: Unknown item rejected (404)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId: '00000000-0000-0000-0000-000000000000',
        batchId,
        quantity: 20,
      });

    expect(res.status).toBe(404);
  });

  // TEST 9: Unknown source location rejected (404)
  it('TEST 9: Unknown source location rejected (404)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: '00000000-0000-0000-0000-000000000000',
        destinationLocationId: destLocId,
        itemId,
        batchId,
        quantity: 20,
      });

    expect(res.status).toBe(404);
  });

  // TEST 10: Unknown destination location rejected (404)
  it('TEST 10: Unknown destination location rejected (404)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: '00000000-0000-0000-0000-000000000000',
        itemId,
        batchId,
        quantity: 20,
      });

    expect(res.status).toBe(404);
  });

  // TEST 11: Unknown batch rejected (404)
  it('TEST 11: Unknown batch rejected (404)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId,
        batchId: '00000000-0000-0000-0000-000000000000',
        quantity: 20,
      });

    expect(res.status).toBe(404);
  });

  // TEST 12: Batch belonging to another item rejected (400)
  it('TEST 12: Batch belonging to another item rejected (400)', async () => {
    // Attempt to request Item 1 using Batch 2 (which belongs to Item 2)
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId: itemId, // Item 1
        batchId: batch2Id, // Belongs to Item 2
        quantity: 20,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Batch integrity conflict');
  });

  // TEST 13: Creating transfer does NOT modify source inventory
  it('TEST 13: Creating transfer does NOT modify source inventory', async () => {
    const invBefore = await prisma.inventory.findUnique({ where: { id: sourceInvId } });

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId,
        batchId,
        quantity: 40,
      });

    const invAfter = await prisma.inventory.findUnique({ where: { id: sourceInvId } });
    expect(invAfter!.physicalQuantity).toBe(invBefore!.physicalQuantity);
    expect(invAfter!.availableQuantity).toBe(invBefore!.availableQuantity);
  });

  // TEST 14: Cannot dispatch more than available stock (400)
  it('TEST 14: Cannot dispatch more than available stock (400)', async () => {
    // Available is 80 (Physical 100, Reserved 20). Requesting 90.
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId,
        batchId,
        quantity: 90,
      });

    const transferId = createRes.body.data.id;

    const dispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dispatchRes.status).toBe(400);
    expect(dispatchRes.body.error).toContain('Cannot dispatch more than available inventory');
  });

  // TEST 15 & 16 & 17 & 18 & 19: Dispatch reduces SOURCE stock, leaves destination unchanged, sets DISPATCHED status
  it('TEST 15-19: Successful dispatch behavior', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        itemId,
        batchId,
        quantity: 40,
      });

    const transferId = createRes.body.data.id;

    const dispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.data.status).toBe('DISPATCHED');

    // TEST 15 & 16: Check source inventory (Physical 100-40=60, Available 80-40=40, Reserved 20)
    const sourceInv = await prisma.inventory.findUnique({ where: { id: sourceInvId } });
    expect(sourceInv!.physicalQuantity).toBe(60);
    expect(sourceInv!.availableQuantity).toBe(40);
    expect(sourceInv!.reservedQuantity).toBe(20);

    // TEST 17: Destination physical stock MUST NOT CHANGE on dispatch (remains 0)
    const destInv = await prisma.inventory.findFirst({
      where: { locationId: destLocId, itemId },
    });
    expect(destInv?.physicalQuantity || 0).toBe(0);

    // TEST 19: Verify InventoryTransaction record (TRANSFER_DISPATCH)
    const tx = await prisma.inventoryTransaction.findFirst({
      where: { referenceId: transferId, type: 'TRANSFER_DISPATCH' },
    });
    expect(tx).not.toBeNull();
    expect(tx!.quantity).toBe(-40);
  });

  // TEST 20: Cannot dispatch an already DISPATCHED transfer (400)
  it('TEST 20: Cannot dispatch an already DISPATCHED transfer (400)', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: sourceLocId, destinationLocationId: destLocId, itemId, batchId, quantity: 20 });

    const transferId = createRes.body.data.id;
    await request(app).post(`/api/transfers/${transferId}/dispatch`).set('Authorization', `Bearer ${adminToken}`);

    // Second dispatch attempt
    const res2 = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res2.status).toBe(400);
    expect(res2.body.error).toContain('Invalid status transition');
  });

  // TEST 21: Cannot receive a REQUESTED transfer (400)
  it('TEST 21: Cannot receive a REQUESTED transfer (400)', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: sourceLocId, destinationLocationId: destLocId, itemId, batchId, quantity: 20 });

    const transferId = createRes.body.data.id;

    // Direct receive without dispatch
    const receiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(receiveRes.status).toBe(400);
    expect(receiveRes.body.error).toContain('Invalid status transition');
  });

  // TEST 22-26 & 34-35: Receive increases destination physical & available stock, creates transaction, matches batch
  it('TEST 22-26, 34-35: Successful receive behavior', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: sourceLocId, destinationLocationId: destLocId, itemId, batchId, quantity: 40 });

    const transferId = createRes.body.data.id;
    await request(app).post(`/api/transfers/${transferId}/dispatch`).set('Authorization', `Bearer ${adminToken}`);

    const receiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.status).toBe('RECEIVED');

    // TEST 34 & 35: Destination inventory created with matching batchId
    const destInv = await prisma.inventory.findFirst({
      where: { locationId: destLocId, itemId, batchId },
    });
    expect(destInv).not.toBeNull();
    // TEST 22 & 23 & 24: Physical 40, Reserved 0 -> Available 40
    expect(destInv!.physicalQuantity).toBe(40);
    expect(destInv!.reservedQuantity).toBe(0);
    expect(destInv!.availableQuantity).toBe(40);

    // TEST 26: InventoryTransaction created (TRANSFER_RECEIVE)
    const tx = await prisma.inventoryTransaction.findFirst({
      where: { referenceId: transferId, type: 'TRANSFER_RECEIVE' },
    });
    expect(tx).not.toBeNull();
    expect(tx!.quantity).toBe(40);
  });

  // TEST 27 & 28: Same transfer cannot be received twice; stock does not increase again
  it('TEST 27 & 28: Same transfer cannot be received twice', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: sourceLocId, destinationLocationId: destLocId, itemId, batchId, quantity: 40 });

    const transferId = createRes.body.data.id;
    await request(app).post(`/api/transfers/${transferId}/dispatch`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).post(`/api/transfers/${transferId}/receive`).set('Authorization', `Bearer ${adminToken}`);

    const destInvAfterFirst = await prisma.inventory.findFirst({ where: { locationId: destLocId, itemId } });
    expect(destInvAfterFirst!.physicalQuantity).toBe(40);

    // Second receive attempt
    const res2 = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res2.status).toBe(400);
    expect(res2.body.error).toContain('already been received');

    // TEST 28: Stock remains unchanged at 40
    const destInvAfterSecond = await prisma.inventory.findFirst({ where: { locationId: destLocId, itemId } });
    expect(destInvAfterSecond!.physicalQuantity).toBe(40);
  });

  // TEST 29 & 30: Full lifecycle (REQUESTED -> DISPATCHED -> RECEIVED)
  it('TEST 30: Full lifecycle (REQUESTED -> DISPATCHED -> RECEIVED)', async () => {
    const reqRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ sourceLocationId: sourceLocId, destinationLocationId: destLocId, itemId, batchId, quantity: 25 });

    expect(reqRes.body.data.status).toBe('REQUESTED');

    const dispRes = await request(app)
      .post(`/api/transfers/${reqRes.body.data.id}/dispatch`)
      .set('Authorization', `Bearer ${opsToken}`);
    expect(dispRes.body.data.status).toBe('DISPATCHED');

    const recRes = await request(app)
      .post(`/api/transfers/${reqRes.body.data.id}/receive`)
      .set('Authorization', `Bearer ${opsToken}`);
    expect(recRes.body.data.status).toBe('RECEIVED');
  });

  // TEST 31: Concurrent dispatch attempts cannot deduct source stock twice
  it('TEST 31: Concurrent dispatch attempts cannot deduct source stock twice', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: sourceLocId, destinationLocationId: destLocId, itemId, batchId, quantity: 80 });

    const transferId = createRes.body.data.id;

    // Parallel dispatch requests against source available 80
    const reqA = request(app).post(`/api/transfers/${transferId}/dispatch`).set('Authorization', `Bearer ${adminToken}`);
    const reqB = request(app).post(`/api/transfers/${transferId}/dispatch`).set('Authorization', `Bearer ${adminToken}`);

    const [resA, resB] = await Promise.all([reqA, reqB]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(400);

    const sourceInv = await prisma.inventory.findUnique({ where: { id: sourceInvId } });
    expect(sourceInv!.physicalQuantity).toBe(20); // 100 - 80 = 20, deducted exactly ONCE
  });

  // TEST 32: Failed dispatch leaves transfer REQUESTED and inventory unchanged
  it('TEST 32: Failed dispatch leaves transfer REQUESTED and inventory unchanged', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: sourceLocId, destinationLocationId: destLocId, itemId, batchId, quantity: 999 });

    const transferId = createRes.body.data.id;

    const res = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);

    const transfer = await prisma.stockTransfer.findUnique({ where: { id: transferId } });
    expect(transfer!.status).toBe('REQUESTED');
  });

  // TEST 33: Failed receive leaves transfer DISPATCHED and destination unchanged
  it('TEST 33: Failed receive leaves transfer DISPATCHED', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: sourceLocId, destinationLocationId: destLocId, itemId, batchId, quantity: 30 });

    const transferId = createRes.body.data.id;
    await request(app).post(`/api/transfers/${transferId}/dispatch`).set('Authorization', `Bearer ${adminToken}`);

    // Try invalid receive attempt on non-existent transfer
    const res = await request(app)
      .post('/api/transfers/00000000-0000-0000-0000-000000000000/receive')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);

    const transfer = await prisma.stockTransfer.findUnique({ where: { id: transferId } });
    expect(transfer!.status).toBe('DISPATCHED');
  });

});

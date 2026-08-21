import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

let adminToken: string;
let opsToken: string;
let salesToken: string;

let adminUserId: string;
let opsUserId: string;
let salesUserId: string;

let locAId: string;
let locBId: string;
let itemId: string;
let batchId: string;

beforeAll(async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'edge_admin@erp.com' },
    update: { password: hashedPassword, role: Role.ADMIN },
    create: { email: 'edge_admin@erp.com', password: hashedPassword, name: 'Edge Admin', role: Role.ADMIN },
  });
  adminUserId = admin.id;

  const ops = await prisma.user.upsert({
    where: { email: 'edge_ops@erp.com' },
    update: { password: hashedPassword, role: Role.OPERATIONS },
    create: { email: 'edge_ops@erp.com', password: hashedPassword, name: 'Edge Ops', role: Role.OPERATIONS },
  });
  opsUserId = ops.id;

  const sales = await prisma.user.upsert({
    where: { email: 'edge_sales@erp.com' },
    update: { password: hashedPassword, role: Role.SALES },
    create: { email: 'edge_sales@erp.com', password: hashedPassword, name: 'Edge Sales', role: Role.SALES },
  });
  salesUserId = sales.id;

  const adminRes = await request(app).post('/api/auth/login').send({ email: 'edge_admin@erp.com', password: 'password123' });
  adminToken = adminRes.body.token;

  const opsRes = await request(app).post('/api/auth/login').send({ email: 'edge_ops@erp.com', password: 'password123' });
  opsToken = opsRes.body.token;

  const salesRes = await request(app).post('/api/auth/login').send({ email: 'edge_sales@erp.com', password: 'password123' });
  salesToken = salesRes.body.token;

  const locA = await prisma.location.upsert({
    where: { code: 'LOC-EDGE-A' },
    update: {},
    create: { name: 'Edge Location A', code: 'LOC-EDGE-A' },
  });
  locAId = locA.id;

  const locB = await prisma.location.upsert({
    where: { code: 'LOC-EDGE-B' },
    update: {},
    create: { name: 'Edge Location B', code: 'LOC-EDGE-B' },
  });
  locBId = locB.id;

  const cat = await prisma.category.upsert({
    where: { name: 'Edge Category' },
    update: {},
    create: { name: 'Edge Category' },
  });

  const item = await prisma.item.upsert({
    where: { sku: 'SKU-EDGE-01' },
    update: {},
    create: { sku: 'SKU-EDGE-01', name: 'Edge Test Item', categoryId: cat.id },
  });
  itemId = item.id;

  const batch = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-EDGE-01' },
    update: {},
    create: { batchNumber: 'BATCH-EDGE-01', itemId: item.id },
  });
  batchId = batch.id;

  await prisma.inventory.upsert({
    where: { itemId_locationId_batchId: { itemId, locationId: locAId, batchId } },
    update: { physicalQuantity: 100, reservedQuantity: 40, availableQuantity: 60 },
    create: { itemId, locationId: locAId, batchId, physicalQuantity: 100, reservedQuantity: 40, availableQuantity: 60 },
  });
});

describe('Phase 8: Edge Cases, Invariants, Transactions, and Concurrency Suite', () => {

  // SECTION 1: AUTHENTICATION REGRESSION & TAMPERED JWT
  describe('Authentication & JWT Security Tests', () => {
    it('1. Tampered JWT token is rejected (401)', async () => {
      const tamperedToken = adminToken.slice(0, -10) + 'tampered123';
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tamperedToken}`);
      expect(res.status).toBe(401);
    });

    it('2. Missing Authorization header rejected (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('3. Password hash is never returned in /api/auth/me', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.password).toBeUndefined();
    });
  });

  // SECTION 2: COMPLETE RBAC MATRIX TESTS
  describe('RBAC Authorization Matrix Edge-Case Tests', () => {
    it('4. Inventory Adjustment: ADMIN (200), OPERATIONS (200), SALES (403)', async () => {
      const inv = await prisma.inventory.findFirst({ where: { locationId: locAId, itemId } });
      const invId = inv!.id;

      const adminRes = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ inventoryId: invId, quantity: 10, reason: 'Admin adjust', idempotencyKey: `ADJ-ADMIN-${crypto.randomUUID()}` });
      expect(adminRes.status).toBe(200);

      const opsRes = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({ inventoryId: invId, quantity: 10, reason: 'Ops adjust', idempotencyKey: `ADJ-OPS-${crypto.randomUUID()}` });
      expect(opsRes.status).toBe(200);

      const salesRes = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ inventoryId: invId, quantity: 10, reason: 'Sales adjust', idempotencyKey: `ADJ-SALES-${crypto.randomUUID()}` });
      expect(salesRes.status).toBe(403);
    });

    it('5. Work Order Creation: ADMIN (201), OPERATIONS (403), SALES (403)', async () => {
      const adminRes = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ locationId: locAId, itemId, requiredQuantity: 20, assignedUserId: opsUserId });
      expect(adminRes.status).toBe(201);

      const opsRes = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({ locationId: locAId, itemId, requiredQuantity: 20, assignedUserId: opsUserId });
      expect(opsRes.status).toBe(403);

      const salesRes = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ locationId: locAId, itemId, requiredQuantity: 20, assignedUserId: opsUserId });
      expect(salesRes.status).toBe(403);
    });
  });

  // SECTION 3: INVENTORY INVARIANTS & NEGATIVE ADJUSTMENT BOUNDARY
  describe('Inventory Invariants & Edge Cases', () => {
    it('6. Negative adjustment pushing physical below reserved is rejected (400)', async () => {
      const inv = await prisma.inventory.findFirst({ where: { locationId: locAId, itemId } });
      const invId = inv!.id;

      // Current inventory: physical 120, reserved 40. Adjusting by -90 makes physical 30 < reserved 40 -> Below Reserved!
      const res = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ inventoryId: invId, quantity: -90, reason: 'Excess reduction', idempotencyKey: `ADJ-NEG-${crypto.randomUUID()}` });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('below reserved stock');
    });

    it('7. Invalid adjustment quantities (decimal, float) are rejected (400)', async () => {
      const inv = await prisma.inventory.findFirst({ where: { locationId: locAId, itemId } });
      const invId = inv!.id;

      const res = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ inventoryId: invId, quantity: 10.5, reason: 'Float adjust', idempotencyKey: `ADJ-FLOAT-${crypto.randomUUID()}` });

      expect(res.status).toBe(400);
    });
  });

  // SECTION 4: WORK ORDER STATUS LIFECYCLE & SPOOFING REJECTION
  describe('Work Order Lifecycle & Edge Cases', () => {
    it('8. Backwards status transition COMPLETED -> ASSIGNED is rejected (400)', async () => {
      const woRes = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ locationId: locAId, itemId, requiredQuantity: 10, assignedUserId: opsUserId });

      const woId = woRes.body.data.id;
      await request(app).patch(`/api/work-orders/${woId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'IN_PROGRESS' });
      await request(app).patch(`/api/work-orders/${woId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'COMPLETED' });

      // Attempt backwards transition
      const backRes = await request(app)
        .patch(`/api/work-orders/${woId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ASSIGNED' });

      expect(backRes.status).toBe(400);
      expect(backRes.body.error).toContain('Invalid status transition');
    });

    it('9. Client-side createdById spoofing is ignored and set to JWT user (201)', async () => {
      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ locationId: locAId, itemId, requiredQuantity: 15, assignedUserId: opsUserId, createdById: 'spoofed-user-id' });

      expect(res.status).toBe(201);
      expect(res.body.data.createdBy.id).toBe(adminUserId);
    });
  });

  // SECTION 5: STOCK TRANSFERS CONCURRENCY & DOUBLE RECEIPT
  describe('Stock Transfer Concurrency & Edge Cases', () => {
    it('10. Concurrent dispatches against source available stock handled atomically', async () => {
      const locSrc = await prisma.location.upsert({
        where: { code: 'LOC-TR-CONC-S' },
        update: {},
        create: { name: 'TR Conc Source', code: 'LOC-TR-CONC-S' },
      });
      const locDst = await prisma.location.upsert({
        where: { code: 'LOC-TR-CONC-D' },
        update: {},
        create: { name: 'TR Conc Dest', code: 'LOC-TR-CONC-D' },
      });

      await prisma.inventory.upsert({
        where: { itemId_locationId_batchId: { itemId, locationId: locSrc.id, batchId } },
        update: { physicalQuantity: 100, reservedQuantity: 0, availableQuantity: 100 },
        create: { itemId, locationId: locSrc.id, batchId, physicalQuantity: 100, reservedQuantity: 0, availableQuantity: 100 },
      });

      const trA = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sourceLocationId: locSrc.id, destinationLocationId: locDst.id, itemId, batchId, quantity: 80 });

      const trB = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sourceLocationId: locSrc.id, destinationLocationId: locDst.id, itemId, batchId, quantity: 50 });

      // Run parallel dispatches against 100 available stock
      const reqA = request(app).post(`/api/transfers/${trA.body.data.id}/dispatch`).set('Authorization', `Bearer ${adminToken}`);
      const reqB = request(app).post(`/api/transfers/${trB.body.data.id}/dispatch`).set('Authorization', `Bearer ${adminToken}`);

      const [dispA, dispB] = await Promise.all([reqA, reqB]);

      const statuses = [dispA.status, dispB.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      const srcInv = await prisma.inventory.findFirst({ where: { locationId: locSrc.id, itemId } });
      expect(srcInv!.availableQuantity).toBeGreaterThanOrEqual(0);
    });
  });

  // SECTION 6: CUSTOMER ORDER CANCELLATION & DYNAMIC SHORTAGE CROSS-MODULE INTEGRATION
  describe('Customer Orders & Cross-Module Edge Cases', () => {
    it('11. Customer Order reservation dynamically updates Work Order shortage and restoration upon cancel', async () => {
      const locCross = await prisma.location.upsert({
        where: { code: 'LOC-CROSS-01' },
        update: {},
        create: { name: 'Cross Module Location', code: 'LOC-CROSS-01' },
      });

      await prisma.inventory.upsert({
        where: { itemId_locationId_batchId: { itemId, locationId: locCross.id, batchId } },
        update: { physicalQuantity: 100, reservedQuantity: 0, availableQuantity: 100 },
        create: { itemId, locationId: locCross.id, batchId, physicalQuantity: 100, reservedQuantity: 0, availableQuantity: 100 },
      });

      // 1. Create Work Order for 60 units (Available = 100 -> Shortage = 0)
      const woRes = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ locationId: locCross.id, itemId, requiredQuantity: 60, assignedUserId: opsUserId });

      expect(woRes.body.data.shortage).toBe(0);

      // 2. Reserve 80 units via Customer Order -> Available drops to 20
      const coRes = await request(app)
        .post('/api/customer-orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ customerName: 'Cross Module Customer', locationId: locCross.id, itemId, quantity: 80 });

      // 3. Query Work Order again -> Shortage is now 40 (60 - 20 = 40)
      const woAfterRes = await request(app)
        .get(`/api/work-orders/${woRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(woAfterRes.body.data.currentAvailableQuantity).toBe(20);
      expect(woAfterRes.body.data.shortage).toBe(40);

      // 4. Cancel Customer Order -> Available stock restored to 100
      await request(app)
        .post(`/api/customer-orders/${coRes.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${salesToken}`);

      // 5. Query Work Order again -> Shortage restored to 0
      const woAfterCancel = await request(app)
        .get(`/api/work-orders/${woRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(woAfterCancel.body.data.currentAvailableQuantity).toBe(100);
      expect(woAfterCancel.body.data.shortage).toBe(0);
    });
  });

});

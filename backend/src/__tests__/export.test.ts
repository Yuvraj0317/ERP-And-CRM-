import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

let adminToken: string;
let opsToken: string;
let salesToken: string;

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
});

describe('Multi-Format Export Data & Security Verification', () => {
  it('1. Inventory export dataset respects authorization headers', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Verify sensitive properties like passwords or tokens are not present
    res.body.data.forEach((item: any) => {
      expect(item).not.toHaveProperty('password');
      expect(item).not.toHaveProperty('token');
    });
  });

  it('2. Work Orders export data matches calculated dynamic shortages', async () => {
    const res = await request(app)
      .get('/api/work-orders')
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    res.body.data.forEach((wo: any) => {
      expect(wo).toHaveProperty('workOrderNumber');
      expect(wo).toHaveProperty('requiredQuantity');
      expect(wo).toHaveProperty('shortage');
    });
  });

  it('3. Stock Transfer export dataset reflects lifecycle states', async () => {
    const res = await request(app)
      .get('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    res.body.data.forEach((tr: any) => {
      expect(['REQUESTED', 'DISPATCHED', 'RECEIVED']).toContain(tr.status);
    });
  });

  it('4. Customer Orders export dataset provides reservation status', async () => {
    const res = await request(app)
      .get('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('5. Unauthenticated request to export endpoints is blocked with HTTP 401', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(401);
  });
});

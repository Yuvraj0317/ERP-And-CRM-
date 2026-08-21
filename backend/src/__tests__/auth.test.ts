import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

let adminToken: string;
let opsToken: string;
let salesToken: string;

beforeAll(async () => {
  // Ensure seed users exist in PostgreSQL for tests
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

  // Acquire tokens for role permission testing
  const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: 'password123' });
  adminToken = adminRes.body.token;

  const opsRes = await request(app).post('/api/auth/login').send({ email: 'ops@erp.com', password: 'password123' });
  opsToken = opsRes.body.token;

  const salesRes = await request(app).post('/api/auth/login').send({ email: 'sales@erp.com', password: 'password123' });
  salesToken = salesRes.body.token;
});

describe('Phase 2: Authentication & Role-Based Access Control (RBAC) Tests', () => {
  // TEST 1: Valid ADMIN credentials successfully log in
  it('TEST 1: Valid ADMIN credentials successfully log in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@erp.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('ADMIN');
    expect(res.body.user.password).toBeUndefined();
  });

  // TEST 2: Valid OPERATIONS credentials successfully log in
  it('TEST 2: Valid OPERATIONS credentials successfully log in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ops@erp.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('OPERATIONS');
  });

  // TEST 3: Valid SALES credentials successfully log in
  it('TEST 3: Valid SALES credentials successfully log in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales@erp.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('SALES');
  });

  // TEST 4: Incorrect password is rejected
  it('TEST 4: Incorrect password is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@erp.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid email or password');
  });

  // TEST 5: Unknown email is rejected
  it('TEST 5: Unknown email is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@erp.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid email or password');
  });

  // TEST 6: Missing Authorization header is rejected by protected endpoint
  it('TEST 6: Missing Authorization header is rejected', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing or invalid token format');
  });

  // TEST 7: Malformed/invalid JWT is rejected
  it('TEST 7: Malformed/invalid JWT is rejected', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.value');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid or malformed token');
  });

  // TEST 8: Expired JWT is rejected
  it('TEST 8: Expired JWT is rejected', async () => {
    const expiredToken = jwt.sign(
      { sub: 'some-user-id', role: 'ADMIN' },
      ENV.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Token has expired');
  });

  // TEST 9: Authenticated user can access GET /api/auth/me
  it('TEST 9: Authenticated user can access GET /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.email).toBe('admin@erp.com');
    expect(res.body.data.role).toBe('ADMIN');
    expect(res.body.data.password).toBeUndefined();
  });

  // TEST 10: Role Authorization Permission Matrix Verification
  describe('TEST 10: Role Authorization Permission Matrix', () => {
    it('ADMIN -> ADMIN-only route = ALLOWED (200)', async () => {
      const res = await request(app)
        .get('/api/auth/test/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('OPERATIONS -> ADMIN-only route = FORBIDDEN (403)', async () => {
      const res = await request(app)
        .get('/api/auth/test/admin-only')
        .set('Authorization', `Bearer ${opsToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Forbidden');
    });

    it('SALES -> ADMIN-only route = FORBIDDEN (403)', async () => {
      const res = await request(app)
        .get('/api/auth/test/admin-only')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Forbidden');
    });

    it('ADMIN -> OPERATIONS-protected route = ALLOWED (200)', async () => {
      const res = await request(app)
        .get('/api/auth/test/ops-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('OPERATIONS -> OPERATIONS-protected route = ALLOWED (200)', async () => {
      const res = await request(app)
        .get('/api/auth/test/ops-only')
        .set('Authorization', `Bearer ${opsToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('SALES -> OPERATIONS-protected route = FORBIDDEN (403)', async () => {
      const res = await request(app)
        .get('/api/auth/test/ops-only')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Forbidden');
    });

    it('SALES -> SALES-protected route = ALLOWED (200)', async () => {
      const res = await request(app)
        .get('/api/auth/test/sales-only')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('ADMIN -> SALES-protected route = ALLOWED (200)', async () => {
      const res = await request(app)
        .get('/api/auth/test/sales-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

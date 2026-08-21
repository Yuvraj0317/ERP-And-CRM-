import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();
const authController = new AuthController();

// Authentication Endpoints
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

// Test-only Protected Routes for RBAC Permission Matrix Verification
router.get(
  '/test/admin-only',
  authenticate,
  authorize(Role.ADMIN),
  (req, res) => authController.testAdminOnly(req, res)
);

router.get(
  '/test/ops-only',
  authenticate,
  authorize(Role.OPERATIONS),
  (req, res) => authController.testOpsOnly(req, res)
);

router.get(
  '/test/sales-only',
  authenticate,
  authorize(Role.SALES),
  (req, res) => authController.testSalesOnly(req, res)
);

export default router;

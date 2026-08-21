import { Router } from 'express';
import { CustomerOrderController } from '../controllers/customerOrder.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();
const customerOrderController = new CustomerOrderController();

router.use(authenticate);

// Customer Order Read endpoints: ADMIN, OPERATIONS, and SALES are permitted to view orders
router.get('/', (req, res, next) => customerOrderController.getCustomerOrders(req, res, next));
router.get('/:id', (req, res, next) => customerOrderController.getCustomerOrderById(req, res, next));

// Customer Order Creation: SALES & ADMIN only (OPERATIONS forbidden -> 403)
router.post('/', authorize(Role.SALES, Role.ADMIN), (req, res, next) =>
  customerOrderController.createCustomerOrder(req, res, next)
);

// Customer Order Cancellation: SALES & ADMIN only (OPERATIONS forbidden -> 403)
router.post('/:id/cancel', authorize(Role.SALES, Role.ADMIN), (req, res, next) =>
  customerOrderController.cancelCustomerOrder(req, res, next)
);

export default router;

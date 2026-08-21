import { Router } from 'express';
import { WorkOrderController } from '../controllers/workOrder.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();
const workOrderController = new WorkOrderController();

router.use(authenticate);

// Work Order Read endpoints: ADMIN, OPERATIONS, and SALES are permitted to view Work Orders
router.get('/', (req, res, next) => workOrderController.getWorkOrders(req, res, next));
router.get('/:id', (req, res, next) => workOrderController.getWorkOrderById(req, res, next));

// Work Order Creation: ADMIN only (OPERATIONS and SALES forbidden -> 403)
router.post('/', authorize(Role.ADMIN), (req, res, next) =>
  workOrderController.createWorkOrder(req, res, next)
);

// Work Order Status Update: ADMIN & OPERATIONS only (SALES forbidden -> 403)
router.patch('/:id/status', authorize(Role.ADMIN, Role.OPERATIONS), (req, res, next) =>
  workOrderController.updateWorkOrderStatus(req, res, next)
);

export default router;

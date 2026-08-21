import { Router } from 'express';
import {
  createWorkOrder,
  getWorkOrders,
  getWorkOrderById,
  updateWorkOrderStatus,
} from '../services/workOrder.service';
import { authenticate, authorize } from '../middleware/auth';
import { Role, WorkOrderStatus } from '../types';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const workOrders = await getWorkOrders();
    res.json({ success: true, data: workOrders });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const workOrder = await getWorkOrderById(req.params.id);
    res.json({ success: true, data: workOrder });
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize([Role.ADMIN]), async (req, res, next) => {
  try {
    const { locationId, itemId, requiredQuantity, assignedUserId } = req.body;
    if (!locationId || !itemId || !requiredQuantity || !assignedUserId) {
      return res.status(400).json({
        success: false,
        error: 'locationId, itemId, requiredQuantity, and assignedUserId are required',
      });
    }

    const workOrder = await createWorkOrder({
      locationId,
      itemId,
      requiredQuantity: Number(requiredQuantity),
      assignedUserId,
      createdById: req.user!.id,
    });

    res.status(201).json({ success: true, data: workOrder });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authorize([Role.ADMIN, Role.OPERATIONS]), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !Object.values(WorkOrderStatus).includes(status as WorkOrderStatus)) {
      return res.status(400).json({ success: false, error: 'Valid status is required' });
    }

    const updated = await updateWorkOrderStatus(req.params.id, status as WorkOrderStatus);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;

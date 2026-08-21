import { Router } from 'express';
import {
  createCustomerOrder,
  cancelCustomerOrder,
  getCustomerOrders,
} from '../services/customerOrder.service';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const orders = await getCustomerOrders();
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

// Sales user and Admin can create customer orders & reserve stock
router.post('/', authorize([Role.ADMIN, Role.SALES]), async (req, res, next) => {
  try {
    const { customerName, locationId, itemId, quantity } = req.body;
    if (!customerName || !locationId || !itemId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'customerName, locationId, itemId, and quantity are required',
      });
    }

    const order = await createCustomerOrder({
      customerName,
      locationId,
      itemId,
      quantity: Number(quantity),
      salesUserId: req.user!.id,
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', authorize([Role.ADMIN, Role.SALES]), async (req, res, next) => {
  try {
    const order = await cancelCustomerOrder(req.params.id, req.user!.id);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

export default router;

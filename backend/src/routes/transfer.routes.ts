import { Router } from 'express';
import {
  createTransferRequest,
  dispatchTransfer,
  receiveTransfer,
  getTransfers,
} from '../services/transfer.service';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const transfers = await getTransfers();
    res.json({ success: true, data: transfers });
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize([Role.ADMIN, Role.OPERATIONS]), async (req, res, next) => {
  try {
    const { sourceLocationId, destinationLocationId, itemId, quantity } = req.body;
    if (!sourceLocationId || !destinationLocationId || !itemId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'sourceLocationId, destinationLocationId, itemId, and quantity are required',
      });
    }

    const transfer = await createTransferRequest({
      sourceLocationId,
      destinationLocationId,
      itemId,
      quantity: Number(quantity),
      requestedById: req.user!.id,
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/dispatch', authorize([Role.ADMIN, Role.OPERATIONS]), async (req, res, next) => {
  try {
    const transfer = await dispatchTransfer(req.params.id, req.user!.id);
    res.json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/receive', authorize([Role.ADMIN, Role.OPERATIONS]), async (req, res, next) => {
  try {
    const transfer = await receiveTransfer(req.params.id, req.user!.id);
    res.json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
});

export default router;

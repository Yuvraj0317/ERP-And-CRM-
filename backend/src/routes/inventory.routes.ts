import { Router } from 'express';
import {
  getInventoryList,
  getInventoryById,
  updateStockLevel,
  getMasterData,
} from '../services/inventory.service';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { locationId, itemId, categoryId } = req.query;
    const data = await getInventoryList({
      locationId: locationId as string,
      itemId: itemId as string,
      categoryId: categoryId as string,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/masters', async (req, res, next) => {
  try {
    const masters = await getMasterData();
    res.json({ success: true, data: masters });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await getInventoryById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/adjust', authorize([Role.ADMIN, Role.OPERATIONS]), async (req, res, next) => {
  try {
    const { itemId, locationId, batchId, quantityChange, reason } = req.body;
    if (!itemId || !locationId || quantityChange === undefined) {
      return res.status(400).json({ success: false, error: 'itemId, locationId, and quantityChange are required' });
    }

    const updated = await updateStockLevel(
      itemId,
      locationId,
      batchId || null,
      Number(quantityChange),
      reason || 'Manual stock adjustment',
      req.user?.id
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;

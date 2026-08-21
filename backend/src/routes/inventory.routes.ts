import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();
const inventoryController = new InventoryController();

router.use(authenticate);

// Reading inventory: ADMIN, OPERATIONS, and SALES are permitted to view inventory
router.get('/', (req, res, next) => inventoryController.getInventoryList(req, res, next));
router.get('/:id', (req, res, next) => inventoryController.getInventoryById(req, res, next));

// Stock adjustment: ADMIN & OPERATIONS only (SALES is forbidden -> 403)
router.post('/adjust', authorize(Role.ADMIN, Role.OPERATIONS), (req, res, next) =>
  inventoryController.adjustStock(req, res, next)
);

export default router;

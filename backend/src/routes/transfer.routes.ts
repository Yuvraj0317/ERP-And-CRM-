import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();
const transferController = new TransferController();

router.use(authenticate);

// Transfer Read endpoints: ADMIN, OPERATIONS, and SALES are permitted to view transfers
router.get('/', (req, res, next) => transferController.getTransfers(req, res, next));
router.get('/:id', (req, res, next) => transferController.getTransferById(req, res, next));

// Transfer Creation: ADMIN & OPERATIONS only (SALES forbidden -> 403)
router.post('/', authorize(Role.ADMIN, Role.OPERATIONS), (req, res, next) =>
  transferController.createTransfer(req, res, next)
);

// Dispatch Transfer: ADMIN & OPERATIONS only (SALES forbidden -> 403)
router.post('/:id/dispatch', authorize(Role.ADMIN, Role.OPERATIONS), (req, res, next) =>
  transferController.dispatchTransfer(req, res, next)
);

// Receive Transfer: ADMIN & OPERATIONS only (SALES forbidden -> 403)
router.post('/:id/receive', authorize(Role.ADMIN, Role.OPERATIONS), (req, res, next) =>
  transferController.receiveTransfer(req, res, next)
);

export default router;

import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { TransferStatus } from '../types';
import crypto from 'crypto';

export const createTransferRequest = async (data: {
  sourceLocationId: string;
  destinationLocationId: string;
  itemId: string;
  batchId: string;
  quantity: number;
  requestedById: string;
}) => {
  if (data.quantity <= 0) {
    throw new AppError('Transfer quantity must be greater than zero', 400);
  }

  if (data.sourceLocationId === data.destinationLocationId) {
    throw new AppError('Source and Destination locations must be different', 400);
  }

  const sourceInventory = await prisma.inventory.findFirst({
    where: {
      locationId: data.sourceLocationId,
      itemId: data.itemId,
      batchId: data.batchId,
    },
  });

  const availableQuantity = sourceInventory
    ? sourceInventory.physicalQuantity - sourceInventory.reservedQuantity
    : 0;

  if (availableQuantity < data.quantity) {
    throw new AppError(
      `Cannot transfer more than available inventory. Source available: ${availableQuantity}, Requested: ${data.quantity}`,
      400
    );
  }

  const count = await prisma.stockTransfer.count();
  const transferNumber = `TR-2026-${String(count + 1).padStart(3, '0')}`;

  const transfer = await prisma.stockTransfer.create({
    data: {
      transferNumber,
      sourceLocationId: data.sourceLocationId,
      destinationLocationId: data.destinationLocationId,
      itemId: data.itemId,
      batchId: data.batchId,
      quantity: data.quantity,
      status: TransferStatus.REQUESTED,
      requestedById: data.requestedById,
    },
    include: {
      sourceLocation: true,
      destinationLocation: true,
      item: true,
      batch: true,
      requestedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return transfer;
};

export const dispatchTransfer = async (transferId: string, dispatchedById: string) => {
  const idempotencyKey = `DISPATCH-${transferId}-${Date.now()}`;

  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new AppError('Transfer request not found', 404);
    }

    if (transfer.status !== TransferStatus.REQUESTED) {
      throw new AppError(`Cannot dispatch transfer in '${transfer.status}' status`, 400);
    }

    const sourceInv = await tx.inventory.findFirst({
      where: {
        locationId: transfer.sourceLocationId,
        itemId: transfer.itemId,
        batchId: transfer.batchId,
      },
    });

    const available = sourceInv ? sourceInv.physicalQuantity - sourceInv.reservedQuantity : 0;
    if (!sourceInv || available < transfer.quantity) {
      throw new AppError(
        `Insufficient available inventory at source location to dispatch transfer. Available: ${available}`,
        400
      );
    }

    const newPhysical = sourceInv.physicalQuantity - transfer.quantity;
    const newAvailable = newPhysical - sourceInv.reservedQuantity;

    await tx.inventory.update({
      where: { id: sourceInv.id },
      data: {
        physicalQuantity: newPhysical,
        availableQuantity: newAvailable,
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        inventoryId: sourceInv.id,
        type: 'TRANSFER_DISPATCH',
        quantity: -transfer.quantity,
        referenceType: 'TRANSFER',
        referenceId: transfer.id,
        idempotencyKey,
        reason: `Dispatched Transfer ${transfer.transferNumber}`,
        createdById: dispatchedById,
      },
    });

    const updatedTransfer = await tx.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.DISPATCHED,
        dispatchedById,
      },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true,
        batch: true,
        requestedBy: { select: { id: true, name: true } },
        dispatchedBy: { select: { id: true, name: true } },
      },
    });

    return updatedTransfer;
  });
};

export const receiveTransfer = async (transferId: string, receivedById: string) => {
  const idempotencyKey = `RECEIVE-${transferId}`;

  return prisma.$transaction(async (tx) => {
    // Idempotency check: prevent duplicate receipt
    const existingTx = await tx.inventoryTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existingTx) {
      throw new AppError('Transfer has already been received. Duplicate receipt is forbidden.', 400);
    }

    const transfer = await tx.stockTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new AppError('Transfer record not found', 404);
    }

    if (transfer.status === TransferStatus.RECEIVED) {
      throw new AppError('Transfer has already been received. Duplicate receipt is forbidden.', 400);
    }

    if (transfer.status !== TransferStatus.DISPATCHED) {
      throw new AppError(
        `Cannot receive transfer. Transfer must be in 'DISPATCHED' status, current status is '${transfer.status}'`,
        400
      );
    }

    let destInv = await tx.inventory.findFirst({
      where: {
        locationId: transfer.destinationLocationId,
        itemId: transfer.itemId,
        batchId: transfer.batchId,
      },
    });

    let newPhysical: number;
    let newAvailable: number;

    if (!destInv) {
      destInv = await tx.inventory.create({
        data: {
          itemId: transfer.itemId,
          locationId: transfer.destinationLocationId,
          batchId: transfer.batchId,
          physicalQuantity: transfer.quantity,
          reservedQuantity: 0,
          availableQuantity: transfer.quantity,
        },
      });
      newPhysical = transfer.quantity;
      newAvailable = transfer.quantity;
    } else {
      newPhysical = destInv.physicalQuantity + transfer.quantity;
      newAvailable = newPhysical - destInv.reservedQuantity;

      await tx.inventory.update({
        where: { id: destInv.id },
        data: {
          physicalQuantity: newPhysical,
          availableQuantity: newAvailable,
        },
      });
    }

    await tx.inventoryTransaction.create({
      data: {
        inventoryId: destInv.id,
        type: 'TRANSFER_RECEIVE',
        quantity: transfer.quantity,
        referenceType: 'TRANSFER',
        referenceId: transfer.id,
        idempotencyKey,
        reason: `Received Transfer ${transfer.transferNumber}`,
        createdById: receivedById,
      },
    });

    const updatedTransfer = await tx.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.RECEIVED,
        receivedById,
      },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true,
        batch: true,
        requestedBy: { select: { id: true, name: true } },
        dispatchedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
      },
    });

    return updatedTransfer;
  });
};

export const getTransfers = async () => {
  return prisma.stockTransfer.findMany({
    include: {
      sourceLocation: true,
      destinationLocation: true,
      item: true,
      batch: true,
      requestedBy: { select: { id: true, name: true, email: true } },
      dispatchedBy: { select: { id: true, name: true, email: true } },
      receivedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

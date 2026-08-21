import { prisma } from '../utils/prisma';
import { StockTransfer, TransferStatus } from '@prisma/client';

export class TransferRepository {
  async findAll() {
    return prisma.stockTransfer.findMany({
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: { include: { category: true } },
        batch: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        dispatchedBy: { select: { id: true, name: true, email: true, role: true } },
        receivedBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: { include: { category: true } },
        batch: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        dispatchedBy: { select: { id: true, name: true, email: true, role: true } },
        receivedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async count() {
    return prisma.stockTransfer.count();
  }

  async create(data: {
    transferNumber: string;
    sourceLocationId: string;
    destinationLocationId: string;
    itemId: string;
    batchId: string;
    quantity: number;
    requestedById: string;
  }): Promise<StockTransfer> {
    return prisma.stockTransfer.create({
      data: {
        transferNumber: data.transferNumber,
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
        item: { include: { category: true } },
        batch: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async dispatch(transferId: string, dispatchedById: string, idempotencyKey: string) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
      });

      if (!transfer) {
        return { error: 'NOT_FOUND' };
      }

      if (transfer.status !== TransferStatus.REQUESTED) {
        return { error: 'INVALID_STATUS', currentStatus: transfer.status };
      }

      // Find source inventory
      const sourceInv = await tx.inventory.findFirst({
        where: {
          locationId: transfer.sourceLocationId,
          itemId: transfer.itemId,
          batchId: transfer.batchId,
        },
      });

      if (!sourceInv) {
        return { error: 'SOURCE_INVENTORY_NOT_FOUND' };
      }

      // Atomic conditional update on source inventory:
      // WHERE availableQuantity >= quantity
      const updatedCount = await tx.$executeRaw`
        UPDATE "Inventory"
        SET
          "physicalQuantity" = "physicalQuantity" - ${transfer.quantity},
          "availableQuantity" = "availableQuantity" - ${transfer.quantity},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${sourceInv.id}
          AND "availableQuantity" >= ${transfer.quantity}
      `;

      if (updatedCount === 0) {
        return { error: 'INSUFFICIENT_STOCK', available: sourceInv.physicalQuantity - sourceInv.reservedQuantity };
      }

      // Create InventoryTransaction (TRANSFER_DISPATCH)
      const inventoryTx = await tx.inventoryTransaction.create({
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

      // Update transfer status to DISPATCHED
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.DISPATCHED,
          dispatchedById,
        },
        include: {
          sourceLocation: true,
          destinationLocation: true,
          item: { include: { category: true } },
          batch: true,
          requestedBy: { select: { id: true, name: true, email: true, role: true } },
          dispatchedBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      return { transfer: updatedTransfer, inventoryTransaction: inventoryTx };
    });
  }

  async receive(transferId: string, receivedById: string, idempotencyKey: string) {
    return prisma.$transaction(async (tx) => {
      // Check idempotency first: prevent double receipt
      const existingTx = await tx.inventoryTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        return { error: 'ALREADY_RECEIVED' };
      }

      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
      });

      if (!transfer) {
        return { error: 'NOT_FOUND' };
      }

      if (transfer.status === TransferStatus.RECEIVED) {
        return { error: 'ALREADY_RECEIVED' };
      }

      if (transfer.status !== TransferStatus.DISPATCHED) {
        return { error: 'INVALID_STATUS', currentStatus: transfer.status };
      }

      // Find or create destination inventory record with same batch identity
      let destInv = await tx.inventory.findFirst({
        where: {
          locationId: transfer.destinationLocationId,
          itemId: transfer.itemId,
          batchId: transfer.batchId,
        },
      });

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
      } else {
        const newPhysical = destInv.physicalQuantity + transfer.quantity;
        const newAvailable = newPhysical - destInv.reservedQuantity;

        await tx.inventory.update({
          where: { id: destInv.id },
          data: {
            physicalQuantity: newPhysical,
            availableQuantity: newAvailable,
          },
        });
      }

      // Create InventoryTransaction (TRANSFER_RECEIVE)
      const inventoryTx = await tx.inventoryTransaction.create({
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

      // Update transfer status to RECEIVED
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.RECEIVED,
          receivedById,
        },
        include: {
          sourceLocation: true,
          destinationLocation: true,
          item: { include: { category: true } },
          batch: true,
          requestedBy: { select: { id: true, name: true, email: true, role: true } },
          dispatchedBy: { select: { id: true, name: true, email: true, role: true } },
          receivedBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      return { transfer: updatedTransfer, inventoryTransaction: inventoryTx };
    });
  }
}

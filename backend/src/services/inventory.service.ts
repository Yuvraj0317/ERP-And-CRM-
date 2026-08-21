import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

export const getInventoryList = async (filters?: {
  locationId?: string;
  itemId?: string;
  categoryId?: string;
}) => {
  const where: any = {};
  if (filters?.locationId) where.locationId = filters.locationId;
  if (filters?.itemId) where.itemId = filters.itemId;
  if (filters?.categoryId) {
    where.item = { categoryId: filters.categoryId };
  }

  const inventories = await prisma.inventory.findMany({
    where,
    include: {
      item: {
        include: {
          category: true,
        },
      },
      location: true,
      batch: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return inventories.map((inv) => ({
    ...inv,
    calculatedAvailable: inv.physicalQuantity - inv.reservedQuantity,
  }));
};

export const getInventoryById = async (id: string) => {
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      item: { include: { category: true } },
      location: true,
      batch: true,
    },
  });

  if (!inventory) {
    throw new AppError('Inventory record not found', 404);
  }

  return {
    ...inventory,
    calculatedAvailable: inventory.physicalQuantity - inventory.reservedQuantity,
  };
};

export const updateStockLevel = async (
  itemId: string,
  locationId: string,
  batchId: string,
  quantityChange: number,
  reason: string,
  idempotencyKeyInput?: string,
  userId?: string
) => {
  const idempotencyKey = idempotencyKeyInput || `ADJUST-${crypto.randomUUID()}`;

  return prisma.$transaction(async (tx) => {
    const existingTx = await tx.inventoryTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existingTx) {
      return tx.inventory.findUnique({ where: { id: existingTx.inventoryId } });
    }

    let inventory = await tx.inventory.findFirst({
      where: {
        itemId,
        locationId,
        batchId,
      },
    });

    if (!inventory) {
      if (quantityChange < 0) {
        throw new AppError('Cannot reduce inventory for non-existing record', 400);
      }

      inventory = await tx.inventory.create({
        data: {
          itemId,
          locationId,
          batchId,
          physicalQuantity: quantityChange,
          reservedQuantity: 0,
          availableQuantity: quantityChange,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          type: 'INITIAL_STOCK',
          quantity: quantityChange,
          idempotencyKey,
          reason,
          createdById: userId || null,
        },
      });

      return inventory;
    }

    const newPhysical = inventory.physicalQuantity + quantityChange;
    const newAvailable = newPhysical - inventory.reservedQuantity;

    if (newPhysical < 0) {
      throw new AppError('Operation rejected: Physical inventory cannot be negative', 400);
    }

    if (newAvailable < 0) {
      throw new AppError('Operation rejected: Available inventory cannot drop below zero', 400);
    }

    const updated = await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        physicalQuantity: newPhysical,
        availableQuantity: newAvailable,
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        type: quantityChange >= 0 ? 'STOCK_ADD' : 'STOCK_REDUCE',
        quantity: quantityChange,
        idempotencyKey,
        reason,
        createdById: userId || null,
      },
    });

    return updated;
  });
};

export const getMasterData = async () => {
  const [locations, categories, items, batches] = await Promise.all([
    prisma.location.findMany(),
    prisma.category.findMany(),
    prisma.item.findMany({ include: { category: true } }),
    prisma.batch.findMany({ include: { item: true } }),
  ]);

  return { locations, categories, items, batches };
};

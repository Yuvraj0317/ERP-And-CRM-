import { prisma } from '../utils/prisma';
import { Inventory, InventoryTransaction } from '@prisma/client';

export class InventoryRepository {
  async findAll(filters?: {
    locationId?: string;
    itemId?: string;
    batchId?: string;
    categoryId?: string;
  }) {
    const where: any = {};
    if (filters?.locationId) where.locationId = filters.locationId;
    if (filters?.itemId) where.itemId = filters.itemId;
    if (filters?.batchId) where.batchId = filters.batchId;
    if (filters?.categoryId) {
      where.item = { categoryId: filters.categoryId };
    }

    return prisma.inventory.findMany({
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
  }

  async findById(id: string) {
    return prisma.inventory.findUnique({
      where: { id },
      include: {
        item: { include: { category: true } },
        location: true,
        batch: true,
      },
    });
  }

  async findTransactionByIdempotencyKey(idempotencyKey: string): Promise<InventoryTransaction | null> {
    return prisma.inventoryTransaction.findUnique({
      where: { idempotencyKey },
    });
  }

  async executeAtomicAdjustment(
    inventoryId: string,
    quantityChange: number,
    idempotencyKey: string,
    reason: string,
    userId?: string,
    simulatedErrorForAtomicityTest?: boolean
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Idempotency Check
      const existingTx = await tx.inventoryTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        const inventory = await tx.inventory.findUnique({
          where: { id: existingTx.inventoryId },
          include: { item: { include: { category: true } }, location: true, batch: true },
        });
        return { isDuplicate: true, inventory, transaction: existingTx };
      }

      // 2. Lock & Read Inventory Record
      const currentInv = await tx.inventory.findUnique({
        where: { id: inventoryId },
      });

      if (!currentInv) {
        return { error: 'NOT_FOUND' };
      }

      const targetPhysical = currentInv.physicalQuantity + quantityChange;

      // Rule: Never allow physical stock to drop below 0 or below reserved stock
      if (targetPhysical < 0) {
        return { error: 'NEGATIVE_PHYSICAL' };
      }

      if (targetPhysical < currentInv.reservedQuantity) {
        return { error: 'BELOW_RESERVED' };
      }

      // 3. Atomic Database Conditional Update
      // WHERE physicalQuantity + quantityChange >= reservedQuantity AND physicalQuantity + quantityChange >= 0
      const updatedCount = await tx.$executeRaw`
        UPDATE "Inventory"
        SET
          "physicalQuantity" = "physicalQuantity" + ${quantityChange},
          "availableQuantity" = ("physicalQuantity" + ${quantityChange}) - "reservedQuantity",
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${inventoryId}
          AND ("physicalQuantity" + ${quantityChange}) >= "reservedQuantity"
          AND ("physicalQuantity" + ${quantityChange}) >= 0
      `;

      if (updatedCount === 0) {
        return { error: 'CONCURRENCY_CONFLICT' };
      }

      // Simulated error to test transaction rollback atomicity
      if (simulatedErrorForAtomicityTest) {
        throw new Error('SIMULATED_TRANSACTION_FAILURE');
      }

      // 4. Create InventoryTransaction record within the SAME transaction
      const transactionRecord = await tx.inventoryTransaction.create({
        data: {
          inventoryId,
          type: 'ADJUSTMENT',
          quantity: quantityChange,
          idempotencyKey,
          reason,
          createdById: userId || null,
        },
      });

      // 5. Query updated inventory record with relations
      const updatedInventory = await tx.inventory.findUnique({
        where: { id: inventoryId },
        include: { item: { include: { category: true } }, location: true, batch: true },
      });

      return {
        isDuplicate: false,
        inventory: updatedInventory,
        transaction: transactionRecord,
      };
    });
  }
}

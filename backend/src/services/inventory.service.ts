import { z } from 'zod';
import { InventoryRepository } from '../repositories/inventory.repository';
import { AppError } from '../middleware/errorHandler';

export const AdjustStockSchema = z.object({
  inventoryId: z.string().min(1, 'Inventory ID is required'),
  quantity: z
    .number()
    .int('Quantity must be a whole integer')
    .refine((val) => val !== 0, { message: 'Quantity cannot be zero' }),
  reason: z.string().min(1, 'Reason for adjustment is required'),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  simulatedErrorForAtomicityTest: z.boolean().optional(),
});

export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;

export class InventoryService {
  private inventoryRepository: InventoryRepository;

  constructor() {
    this.inventoryRepository = new InventoryRepository();
  }

  async getInventoryList(filters?: {
    locationId?: string;
    itemId?: string;
    batchId?: string;
    categoryId?: string;
  }) {
    const inventories = await this.inventoryRepository.findAll(filters);

    return inventories.map((inv) => {
      // Invariant assertion: availableQuantity = physicalQuantity - reservedQuantity
      const calculatedAvailable = inv.physicalQuantity - inv.reservedQuantity;
      if (inv.availableQuantity !== calculatedAvailable) {
        console.warn(`[INVARIANT WARNING] Inventory ${inv.id} balance discrepancy detected.`);
      }

      return {
        ...inv,
        availableQuantity: calculatedAvailable,
      };
    });
  }

  async getInventoryById(id: string) {
    const inventory = await this.inventoryRepository.findById(id);
    if (!inventory) {
      throw new AppError('Inventory record not found', 404);
    }

    const calculatedAvailable = inventory.physicalQuantity - inventory.reservedQuantity;
    return {
      ...inventory,
      availableQuantity: calculatedAvailable,
    };
  }

  async adjustPhysicalStock(input: AdjustStockInput, userId?: string) {
    const parseResult = AdjustStockSchema.safeParse(input);
    if (!parseResult.success) {
      const issueMessage = parseResult.error.issues[0]?.message || 'Invalid stock adjustment input';
      throw new AppError(`Validation Error: ${issueMessage}`, 400);
    }

    const { inventoryId, quantity, reason, idempotencyKey, simulatedErrorForAtomicityTest } = parseResult.data;

    const result = await this.inventoryRepository.executeAtomicAdjustment(
      inventoryId,
      quantity,
      idempotencyKey,
      reason,
      userId,
      simulatedErrorForAtomicityTest
    );

    if (result.error === 'NOT_FOUND') {
      throw new AppError('Inventory record not found', 404);
    }

    if (result.error === 'NEGATIVE_PHYSICAL') {
      throw new AppError('Inventory adjustment would create negative physical stock', 400);
    }

    if (result.error === 'BELOW_RESERVED') {
      throw new AppError('Inventory adjustment would reduce physical stock below reserved stock', 400);
    }

    if (result.error === 'CONCURRENCY_CONFLICT') {
      throw new AppError('Inventory adjustment rejected due to concurrent balance conflict', 400);
    }

    if (result.isDuplicate) {
      throw new AppError('Duplicate idempotency key: Operation already processed', 409);
    }

    const inv = result.inventory!;
    const calculatedAvailable = inv.physicalQuantity - inv.reservedQuantity;

    return {
      inventory: {
        ...inv,
        availableQuantity: calculatedAvailable,
      },
      transaction: result.transaction,
    };
  }

  async getMasterData() {
    const inventories = await this.inventoryRepository.findAll();
    return inventories;
  }
}

import { z } from 'zod';
import { TransferRepository } from '../repositories/transfer.repository';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const CreateTransferSchema = z.object({
  sourceLocationId: z.string().min(1, 'Source location ID is required'),
  destinationLocationId: z.string().min(1, 'Destination location ID is required'),
  itemId: z.string().min(1, 'Item ID is required'),
  batchId: z.string().min(1, 'Batch ID is required'),
  quantity: z
    .number()
    .int('Quantity must be a whole integer')
    .positive('Quantity must be a positive number'),
});

export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;

export class StockTransferService {
  private transferRepository: TransferRepository;

  constructor() {
    this.transferRepository = new TransferRepository();
  }

  async getTransfers() {
    return this.transferRepository.findAll();
  }

  async getTransferById(id: string) {
    const transfer = await this.transferRepository.findById(id);
    if (!transfer) {
      throw new AppError('Transfer request not found', 404);
    }
    return transfer;
  }

  async createTransferRequest(input: CreateTransferInput, requestedById: string) {
    const parseResult = CreateTransferSchema.safeParse(input);
    if (!parseResult.success) {
      const issueMessage = parseResult.error.issues[0]?.message || 'Invalid transfer payload';
      throw new AppError(`Validation Error: ${issueMessage}`, 400);
    }

    const { sourceLocationId, destinationLocationId, itemId, batchId, quantity } = parseResult.data;

    // Rule: Source and destination locations must be different
    if (sourceLocationId === destinationLocationId) {
      throw new AppError('Source and Destination locations must be different', 400);
    }

    // Verify entity existence
    const sourceLoc = await prisma.location.findUnique({ where: { id: sourceLocationId } });
    if (!sourceLoc) {
      throw new AppError('Source location not found', 404);
    }

    const destLoc = await prisma.location.findUnique({ where: { id: destinationLocationId } });
    if (!destLoc) {
      throw new AppError('Destination location not found', 404);
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new AppError('Item not found', 404);
    }

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Critical Rule: Batch/Item Composite Integrity Check
    if (batch.itemId !== itemId) {
      throw new AppError(
        `Batch integrity conflict: Batch '${batch.batchNumber}' does not belong to Item '${item.name}'`,
        400
      );
    }

    // Verify source inventory record exists for item + source location + batch
    const sourceInv = await prisma.inventory.findFirst({
      where: {
        locationId: sourceLocationId,
        itemId,
        batchId,
      },
    });

    if (!sourceInv) {
      throw new AppError(
        'Source inventory record does not exist for the requested item, location, and batch',
        404
      );
    }

    // Generate unique transfer number
    const count = await this.transferRepository.count();
    const transferNumber = `TR-2026-${String(count + 1).padStart(3, '0')}`;

    // Note: Creating a transfer does NOT mutate inventory stock!
    return this.transferRepository.create({
      transferNumber,
      sourceLocationId,
      destinationLocationId,
      itemId,
      batchId,
      quantity,
      requestedById,
    });
  }

  async dispatchTransfer(transferId: string, dispatchedById: string) {
    const idempotencyKey = `DISPATCH-${transferId}`;

    const result = await this.transferRepository.dispatch(transferId, dispatchedById, idempotencyKey);

    if (result.error === 'NOT_FOUND') {
      throw new AppError('Transfer request not found', 404);
    }

    if (result.error === 'INVALID_STATUS') {
      throw new AppError(
        `Invalid status transition: Cannot dispatch transfer in '${result.currentStatus}' status`,
        400
      );
    }

    if (result.error === 'SOURCE_INVENTORY_NOT_FOUND') {
      throw new AppError('Source inventory record not found', 404);
    }

    if (result.error === 'INSUFFICIENT_STOCK') {
      throw new AppError(
        `Cannot dispatch more than available inventory stock. Available: ${result.available}`,
        400
      );
    }

    return result.transfer;
  }

  async receiveTransfer(transferId: string, receivedById: string) {
    const idempotencyKey = `RECEIVE-${transferId}`;

    const result = await this.transferRepository.receive(transferId, receivedById, idempotencyKey);

    if (result.error === 'NOT_FOUND') {
      throw new AppError('Transfer record not found', 404);
    }

    if (result.error === 'ALREADY_RECEIVED') {
      throw new AppError('Transfer has already been received. Duplicate receipt is forbidden.', 400);
    }

    if (result.error === 'INVALID_STATUS') {
      throw new AppError(
        `Invalid status transition: Cannot receive transfer in '${result.currentStatus}' status`,
        400
      );
    }

    return result.transfer;
  }
}

import { z } from 'zod';
import { CustomerOrderRepository } from '../repositories/customerOrder.repository';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

export const CreateCustomerOrderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z
    .number()
    .int('Quantity must be a whole integer')
    .positive('Quantity must be a positive number'),
});

export type CreateCustomerOrderInput = z.infer<typeof CreateCustomerOrderSchema>;

export class CustomerOrderService {
  private customerOrderRepository: CustomerOrderRepository;

  constructor() {
    this.customerOrderRepository = new CustomerOrderRepository();
  }

  async getCustomerOrders() {
    return this.customerOrderRepository.findAll();
  }

  async getCustomerOrderById(id: string) {
    const order = await this.customerOrderRepository.findById(id);
    if (!order) {
      throw new AppError('Customer Order not found', 404);
    }
    return order;
  }

  async createCustomerOrder(input: CreateCustomerOrderInput, salesUserId: string, headerIdempotencyKey?: string) {
    const parseResult = CreateCustomerOrderSchema.safeParse(input);
    if (!parseResult.success) {
      const issueMessage = parseResult.error.issues[0]?.message || 'Invalid Customer Order payload';
      throw new AppError(`Validation Error: ${issueMessage}`, 400);
    }

    const { customerName, locationId, itemId, quantity } = parseResult.data;

    // Verify entity existence
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new AppError('Location not found', 404);
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new AppError('Item not found', 404);
    }

    // Generate unique Customer Order number
    const count = await this.customerOrderRepository.count();
    const uniqueSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const orderNumber = `CO-2026-${String(count + 1).padStart(3, '0')}-${uniqueSuffix}`;
    const idempotencyKey = headerIdempotencyKey || `RESERVE-${orderNumber}-${crypto.randomUUID()}`;

    try {
      const result = await this.customerOrderRepository.reserveStockAndCreateOrder({
        orderNumber,
        customerName,
        locationId,
        itemId,
        quantity,
        salesUserId,
        idempotencyKey,
      });

      if (result.error === 'INSUFFICIENT_STOCK') {
        throw new AppError(
          `Insufficient available stock for reservation. Available: ${result.available}, Requested: ${quantity}`,
          400
        );
      }

      return result.order;
    } catch (error: any) {
      if (error.message === 'CONCURRENCY_STOCK_RACE' || error.code === 'P2034') {
        throw new AppError('Insufficient available stock for reservation due to concurrent request', 400);
      }
      throw error;
    }
  }

  async cancelCustomerOrder(orderId: string, userId: string) {
    const idempotencyKey = `RELEASE-${orderId}`;

    const result = await this.customerOrderRepository.cancelOrderAndReleaseStock(orderId, userId, idempotencyKey);

    if (result.error === 'NOT_FOUND') {
      throw new AppError('Customer Order not found', 404);
    }

    if (result.error === 'ALREADY_CANCELLED') {
      throw new AppError('Customer Order has already been cancelled. Duplicate release is forbidden.', 400);
    }

    if (result.error === 'INVALID_STATUS') {
      throw new AppError(
        `Invalid status transition: Cannot cancel order in '${result.currentStatus}' status`,
        400
      );
    }

    return result.order;
  }
}

import { z } from 'zod';
import { WorkOrderRepository } from '../repositories/workOrder.repository';
import { UserRepository } from '../repositories/user.repository';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { WorkOrderStatus } from '@prisma/client';

export const CreateWorkOrderSchema = z.object({
  locationId: z.string().min(1, 'Location ID is required'),
  itemId: z.string().min(1, 'Item ID is required'),
  requiredQuantity: z
    .number()
    .int('Required quantity must be a whole integer')
    .positive('Required quantity must be a positive number'),
  assignedUserId: z.string().min(1, 'Assigned User ID is required'),
});

export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>;

export class WorkOrderService {
  private workOrderRepository: WorkOrderRepository;
  private userRepository: UserRepository;

  constructor() {
    this.workOrderRepository = new WorkOrderRepository();
    this.userRepository = new UserRepository();
  }

  // Dynamic shortage computation logic
  private calculateShortage(requiredQuantity: number, currentAvailableQuantity: number): number {
    return Math.max(0, requiredQuantity - currentAvailableQuantity);
  }

  async getWorkOrders() {
    const workOrders = await this.workOrderRepository.findAll();

    return Promise.all(
      workOrders.map(async (wo) => {
        const availableQuantity = await this.workOrderRepository.getItemAvailableQuantity(
          wo.locationId,
          wo.itemId
        );
        const shortage = this.calculateShortage(wo.requiredQuantity, availableQuantity);

        return {
          ...wo,
          currentAvailableQuantity: availableQuantity,
          shortage,
        };
      })
    );
  }

  async getWorkOrderById(id: string) {
    const wo = await this.workOrderRepository.findById(id);
    if (!wo) {
      throw new AppError('Work Order not found', 404);
    }

    const availableQuantity = await this.workOrderRepository.getItemAvailableQuantity(
      wo.locationId,
      wo.itemId
    );
    const shortage = this.calculateShortage(wo.requiredQuantity, availableQuantity);

    return {
      ...wo,
      currentAvailableQuantity: availableQuantity,
      shortage,
    };
  }

  async createWorkOrder(input: CreateWorkOrderInput, createdById: string) {
    const parseResult = CreateWorkOrderSchema.safeParse(input);
    if (!parseResult.success) {
      const issueMessage = parseResult.error.issues[0]?.message || 'Invalid Work Order payload';
      throw new AppError(`Validation Error: ${issueMessage}`, 400);
    }

    const { locationId, itemId, requiredQuantity, assignedUserId } = parseResult.data;

    // Verify entity existence
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new AppError('Target Location not found', 404);
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new AppError('Requested Item not found', 404);
    }

    const assignedUser = await this.userRepository.findById(assignedUserId);
    if (!assignedUser) {
      throw new AppError('Assigned User not found', 404);
    }

    // Generate unique Work Order Number
    const count = await this.workOrderRepository.count();
    const workOrderNumber = `WO-2026-${String(count + 1).padStart(3, '0')}`;

    // Note: Creating a Work Order NEVER mutates or reserves inventory!
    const wo = await this.workOrderRepository.create({
      workOrderNumber,
      locationId,
      itemId,
      requiredQuantity,
      assignedUserId,
      createdById,
      status: WorkOrderStatus.ASSIGNED,
    });

    const availableQuantity = await this.workOrderRepository.getItemAvailableQuantity(
      wo.locationId,
      wo.itemId
    );
    const shortage = this.calculateShortage(wo.requiredQuantity, availableQuantity);

    return {
      ...wo,
      currentAvailableQuantity: availableQuantity,
      shortage,
    };
  }

  async updateWorkOrderStatus(id: string, newStatus: string, userId: string) {
    if (!Object.values(WorkOrderStatus).includes(newStatus as WorkOrderStatus)) {
      throw new AppError(`Invalid Work Order status '${newStatus}'`, 400);
    }

    const targetStatus = newStatus as WorkOrderStatus;
    const wo = await this.workOrderRepository.findById(id);

    if (!wo) {
      throw new AppError('Work Order not found', 404);
    }

    // Validate lifecycle status transitions
    if (wo.status === WorkOrderStatus.COMPLETED && targetStatus !== WorkOrderStatus.COMPLETED) {
      throw new AppError('Invalid status transition: Completed Work Orders cannot be moved backwards', 400);
    }

    if (wo.status === WorkOrderStatus.IN_PROGRESS && targetStatus === WorkOrderStatus.ASSIGNED) {
      throw new AppError('Invalid status transition: Cannot revert In-Progress Work Order back to Assigned', 400);
    }

    const updated = await this.workOrderRepository.updateStatus(id, targetStatus);

    const availableQuantity = await this.workOrderRepository.getItemAvailableQuantity(
      updated.locationId,
      updated.itemId
    );
    const shortage = this.calculateShortage(updated.requiredQuantity, availableQuantity);

    return {
      ...updated,
      currentAvailableQuantity: availableQuantity,
      shortage,
    };
  }
}

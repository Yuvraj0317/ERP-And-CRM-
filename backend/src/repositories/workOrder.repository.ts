import { prisma } from '../utils/prisma';
import { WorkOrder, WorkOrderStatus } from '@prisma/client';

export class WorkOrderRepository {
  async findAll() {
    return prisma.workOrder.findMany({
      include: {
        location: true,
        item: { include: { category: true } },
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.workOrder.findUnique({
      where: { id },
      include: {
        location: true,
        item: { include: { category: true } },
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async count() {
    return prisma.workOrder.count();
  }

  async create(data: {
    workOrderNumber: string;
    locationId: string;
    itemId: string;
    requiredQuantity: number;
    assignedUserId: string;
    createdById: string;
    status?: WorkOrderStatus;
  }): Promise<WorkOrder> {
    return prisma.workOrder.create({
      data: {
        workOrderNumber: data.workOrderNumber,
        locationId: data.locationId,
        itemId: data.itemId,
        requiredQuantity: data.requiredQuantity,
        assignedUserId: data.assignedUserId,
        createdById: data.createdById,
        status: data.status || WorkOrderStatus.ASSIGNED,
      },
      include: {
        location: true,
        item: { include: { category: true } },
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async updateStatus(id: string, status: WorkOrderStatus): Promise<WorkOrder> {
    return prisma.workOrder.update({
      where: { id },
      data: { status },
      include: {
        location: true,
        item: { include: { category: true } },
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async getItemAvailableQuantity(locationId: string, itemId: string): Promise<number> {
    const inventories = await prisma.inventory.findMany({
      where: {
        locationId,
        itemId,
      },
    });

    return inventories.reduce(
      (sum, inv) => sum + (inv.physicalQuantity - inv.reservedQuantity),
      0
    );
  }
}

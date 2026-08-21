import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { WorkOrderStatus } from '../types';

export const createWorkOrder = async (data: {
  locationId: string;
  itemId: string;
  requiredQuantity: number;
  assignedUserId: string;
  createdById: string;
}) => {
  if (data.requiredQuantity <= 0) {
    throw new AppError('Required quantity must be greater than zero', 400);
  }

  const count = await prisma.workOrder.count();
  const workOrderNumber = `WO-2026-${String(count + 1).padStart(3, '0')}`;

  const workOrder = await prisma.workOrder.create({
    data: {
      workOrderNumber,
      locationId: data.locationId,
      itemId: data.itemId,
      requiredQuantity: data.requiredQuantity,
      assignedUserId: data.assignedUserId,
      createdById: data.createdById,
      status: WorkOrderStatus.ASSIGNED,
    },
    include: {
      location: true,
      item: true,
      assignedUser: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return attachShortageCalculation(workOrder);
};

export const getWorkOrders = async () => {
  const workOrders = await prisma.workOrder.findMany({
    include: {
      location: true,
      item: true,
      assignedUser: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(workOrders.map(attachShortageCalculation));
};

export const getWorkOrderById = async (id: string) => {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      location: true,
      item: true,
      assignedUser: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!workOrder) {
    throw new AppError('Work Order not found', 404);
  }

  return attachShortageCalculation(workOrder);
};

export const updateWorkOrderStatus = async (id: string, status: WorkOrderStatus) => {
  const workOrder = await prisma.workOrder.findUnique({ where: { id } });
  if (!workOrder) {
    throw new AppError('Work Order not found', 404);
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data: { status },
    include: {
      location: true,
      item: true,
      assignedUser: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return attachShortageCalculation(updated);
};

const attachShortageCalculation = async (workOrder: any) => {
  const inventories = await prisma.inventory.findMany({
    where: {
      itemId: workOrder.itemId,
      locationId: workOrder.locationId,
    },
  });

  const availableAtLocation = inventories.reduce(
    (acc, inv) => acc + (inv.physicalQuantity - inv.reservedQuantity),
    0
  );

  const shortage = Math.max(0, workOrder.requiredQuantity - availableAtLocation);

  return {
    ...workOrder,
    availableAtLocation,
    shortage,
    hasShortage: shortage > 0,
  };
};

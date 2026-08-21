import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { CustomerOrderStatus } from '../types';

export const createCustomerOrder = async (data: {
  customerName: string;
  locationId: string;
  itemId: string;
  quantity: number;
  salesUserId: string;
}) => {
  if (data.quantity <= 0) {
    throw new AppError('Order quantity must be greater than zero', 400);
  }

  return prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findFirst({
      where: {
        locationId: data.locationId,
        itemId: data.itemId,
      },
    });

    if (!inventory) {
      throw new AppError('No inventory record found for the requested item at this location', 404);
    }

    const available = inventory.physicalQuantity - inventory.reservedQuantity;

    if (available < data.quantity) {
      throw new AppError(
        `Insufficient available inventory to reserve. Available: ${available}, Requested: ${data.quantity}`,
        400
      );
    }

    const newReserved = inventory.reservedQuantity + data.quantity;
    const newAvailable = inventory.physicalQuantity - newReserved;

    if (newAvailable < 0) {
      throw new AppError('Stock reservation rejected due to concurrent balance conflict', 400);
    }

    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        reservedQuantity: newReserved,
        availableQuantity: newAvailable,
      },
    });

    const count = await tx.customerOrder.count();
    const orderNumber = `CO-2026-${String(count + 1).padStart(3, '0')}`;

    const order = await tx.customerOrder.create({
      data: {
        orderNumber,
        customerName: data.customerName,
        locationId: data.locationId,
        itemId: data.itemId,
        quantity: data.quantity,
        status: CustomerOrderStatus.RESERVED,
        salesUserId: data.salesUserId,
      },
      include: {
        location: true,
        item: true,
        salesUser: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.inventoryAuditLog.create({
      data: {
        inventoryId: inventory.id,
        changeType: 'STOCK_RESERVATION',
        quantity: data.quantity,
        previousPhysical: inventory.physicalQuantity,
        newPhysical: inventory.physicalQuantity,
        previousReserved: inventory.reservedQuantity,
        newReserved,
        reason: `Reserved stock for Customer Order ${orderNumber}`,
        userId: data.salesUserId,
      },
    });

    return order;
  });
};

export const cancelCustomerOrder = async (orderId: string, userId: string) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError('Customer order not found', 404);
    }

    if (order.status !== CustomerOrderStatus.RESERVED) {
      throw new AppError(`Cannot cancel order with status '${order.status}'`, 400);
    }

    const inventory = await tx.inventory.findFirst({
      where: {
        locationId: order.locationId,
        itemId: order.itemId,
      },
    });

    if (inventory) {
      const newReserved = Math.max(0, inventory.reservedQuantity - order.quantity);
      const newAvailable = inventory.physicalQuantity - newReserved;

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          reservedQuantity: newReserved,
          availableQuantity: newAvailable,
        },
      });

      await tx.inventoryAuditLog.create({
        data: {
          inventoryId: inventory.id,
          changeType: 'RELEASE_RESERVATION',
          quantity: -order.quantity,
          previousPhysical: inventory.physicalQuantity,
          newPhysical: inventory.physicalQuantity,
          previousReserved: inventory.reservedQuantity,
          newReserved,
          reason: `Released stock from cancelled Order ${order.orderNumber}`,
          userId,
        },
      });
    }

    const updated = await tx.customerOrder.update({
      where: { id: orderId },
      data: { status: CustomerOrderStatus.CANCELLED },
      include: {
        location: true,
        item: true,
        salesUser: { select: { id: true, name: true } },
      },
    });

    return updated;
  });
};

export const getCustomerOrders = async () => {
  return prisma.customerOrder.findMany({
    include: {
      location: true,
      item: true,
      salesUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

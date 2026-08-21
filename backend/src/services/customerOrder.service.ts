import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { CustomerOrderStatus } from '../types';

export const createCustomerOrder = async (data: {
  customerName: string;
  locationId: string;
  itemId: string;
  quantity: number;
  salesUserId: string;
  idempotencyKey?: string;
}) => {
  if (data.quantity <= 0) {
    throw new AppError('Order quantity must be greater than zero', 400);
  }

  return prisma.$transaction(async (tx) => {
    // Idempotency check
    if (data.idempotencyKey) {
      const existingTx = await tx.inventoryTransaction.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existingTx && existingTx.referenceId) {
        return tx.customerOrder.findUnique({
          where: { id: existingTx.referenceId },
          include: { location: true, item: true, salesUser: true },
        });
      }
    }

    const inventory = await tx.inventory.findFirst({
      where: {
        locationId: data.locationId,
        itemId: data.itemId,
      },
    });

    if (!inventory) {
      throw new AppError('No inventory record found for the requested item at this location', 404);
    }

    // Atomic conditional update at database level (WHERE availableQuantity >= quantity)
    const updatedCount = await tx.$executeRaw`
      UPDATE "Inventory"
      SET 
        "reservedQuantity" = "reservedQuantity" + ${data.quantity},
        "availableQuantity" = "availableQuantity" - ${data.quantity},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${inventory.id}
        AND "availableQuantity" >= ${data.quantity}
    `;

    if (updatedCount === 0) {
      throw new AppError('Insufficient available inventory for stock reservation', 400);
    }

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

    await tx.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        type: 'RESERVATION',
        quantity: data.quantity,
        referenceType: 'CUSTOMER_ORDER',
        referenceId: order.id,
        idempotencyKey: data.idempotencyKey || null,
        reason: `Reserved stock for Customer Order ${orderNumber}`,
        createdById: data.salesUserId,
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
      await tx.$executeRaw`
        UPDATE "Inventory"
        SET 
          "reservedQuantity" = GREATEST(0, "reservedQuantity" - ${order.quantity}),
          "availableQuantity" = "physicalQuantity" - GREATEST(0, "reservedQuantity" - ${order.quantity}),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${inventory.id}
      `;

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          type: 'RELEASE',
          quantity: -order.quantity,
          referenceType: 'CUSTOMER_ORDER',
          referenceId: order.id,
          reason: `Released stock from cancelled Order ${order.orderNumber}`,
          createdById: userId,
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

import { prisma } from '../utils/prisma';
import { CustomerOrder, CustomerOrderStatus } from '@prisma/client';

export class CustomerOrderRepository {
  async findAll() {
    return prisma.customerOrder.findMany({
      include: {
        location: true,
        item: { include: { category: true } },
        salesUser: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.customerOrder.findUnique({
      where: { id },
      include: {
        location: true,
        item: { include: { category: true } },
        salesUser: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async count() {
    return prisma.customerOrder.count();
  }

  async reserveStockAndCreateOrder(data: {
    orderNumber: string;
    customerName: string;
    locationId: string;
    itemId: string;
    quantity: number;
    salesUserId: string;
    idempotencyKey: string;
  }) {
    const executeTx = async () => {
      return prisma.$transaction(
        async (tx) => {
          // 1. Idempotency Check
          const existingTx = await tx.inventoryTransaction.findUnique({
            where: { idempotencyKey: data.idempotencyKey },
          });
          if (existingTx && existingTx.referenceId) {
            const order = await tx.customerOrder.findUnique({
              where: { id: existingTx.referenceId },
              include: {
                location: true,
                item: { include: { category: true } },
                salesUser: { select: { id: true, name: true, email: true, role: true } },
              },
            });
            return { isDuplicate: true, order };
          }

          // 2. Query available inventory batches for item + location ordered deterministically by creation time
          const inventories = await tx.inventory.findMany({
            where: {
              locationId: data.locationId,
              itemId: data.itemId,
            },
            orderBy: { createdAt: 'asc' },
          });

          const totalAvailable = inventories.reduce(
            (sum, inv) => sum + (inv.physicalQuantity - inv.reservedQuantity),
            0
          );

          if (totalAvailable < data.quantity) {
            return { error: 'INSUFFICIENT_STOCK', available: totalAvailable };
          }

          // 3. Multi-batch reservation allocation loop
          let remainingToReserve = data.quantity;
          const reservations: { inventoryId: string; quantityToReserve: number }[] = [];

          for (const inv of inventories) {
            if (remainingToReserve <= 0) break;
            const availableInBatch = inv.physicalQuantity - inv.reservedQuantity;
            if (availableInBatch <= 0) continue;

            const alloc = Math.min(remainingToReserve, availableInBatch);
            reservations.push({ inventoryId: inv.id, quantityToReserve: alloc });
            remainingToReserve -= alloc;
          }

          if (remainingToReserve > 0) {
            return { error: 'INSUFFICIENT_STOCK', available: totalAvailable };
          }

          // 4. Perform atomic conditional SQL update on each inventory record
          for (const res of reservations) {
            const updatedCount = await tx.$executeRaw`
              UPDATE "Inventory"
              SET
                "reservedQuantity" = "reservedQuantity" + ${res.quantityToReserve},
                "availableQuantity" = "availableQuantity" - ${res.quantityToReserve},
                "updatedAt" = CURRENT_TIMESTAMP
              WHERE "id" = ${res.inventoryId}
                AND "availableQuantity" >= ${res.quantityToReserve}
            `;

            if (updatedCount === 0) {
              throw new Error('CONCURRENCY_STOCK_RACE');
            }
          }

          // 5. Create CustomerOrder record
          const order = await tx.customerOrder.create({
            data: {
              orderNumber: data.orderNumber,
              customerName: data.customerName,
              locationId: data.locationId,
              itemId: data.itemId,
              quantity: data.quantity,
              status: CustomerOrderStatus.RESERVED,
              salesUserId: data.salesUserId,
            },
            include: {
              location: true,
              item: { include: { category: true } },
              salesUser: { select: { id: true, name: true, email: true, role: true } },
            },
          });

          // 6. Create InventoryTransaction records for each reserved batch
          for (let i = 0; i < reservations.length; i++) {
            const res = reservations[i];
            const txKey = reservations.length === 1 ? data.idempotencyKey : `${data.idempotencyKey}-${i}`;

            await tx.inventoryTransaction.create({
              data: {
                inventoryId: res.inventoryId,
                type: 'RESERVATION',
                quantity: res.quantityToReserve,
                referenceType: 'CUSTOMER_ORDER',
                referenceId: order.id,
                idempotencyKey: txKey,
                reason: `Reserved stock for Customer Order ${order.orderNumber}`,
                createdById: data.salesUserId,
              },
            });
          }

          return { isDuplicate: false, order };
        },
        { timeout: 10000 }
      );
    };

    try {
      return await executeTx();
    } catch (err: any) {
      // Retry once on write conflict / deadlock
      if (err.code === 'P2034' || err.message?.includes('write conflict') || err.message?.includes('deadlock')) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return await executeTx();
      }
      throw err;
    }
  }

  async cancelOrderAndReleaseStock(orderId: string, userId: string, idempotencyKey: string) {
    return prisma.$transaction(async (tx) => {
      // Idempotency check: prevent duplicate release
      const existingTx = await tx.inventoryTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        return { error: 'ALREADY_CANCELLED' };
      }

      const order = await tx.customerOrder.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return { error: 'NOT_FOUND' };
      }

      if (order.status === CustomerOrderStatus.CANCELLED) {
        return { error: 'ALREADY_CANCELLED' };
      }

      if (order.status !== CustomerOrderStatus.RESERVED) {
        return { error: 'INVALID_STATUS', currentStatus: order.status };
      }

      // Find reservation transactions linked to this order to release exact allocated batches
      const reservationTxs = await tx.inventoryTransaction.findMany({
        where: {
          referenceId: orderId,
          referenceType: 'CUSTOMER_ORDER',
          type: 'RESERVATION',
        },
      });

      if (reservationTxs.length > 0) {
        for (let i = 0; i < reservationTxs.length; i++) {
          const resTx = reservationTxs[i];
          const releaseKey = reservationTxs.length === 1 ? idempotencyKey : `${idempotencyKey}-${i}`;

          await tx.$executeRaw`
            UPDATE "Inventory"
            SET
              "reservedQuantity" = GREATEST(0, "reservedQuantity" - ${resTx.quantity}),
              "availableQuantity" = "physicalQuantity" - GREATEST(0, "reservedQuantity" - ${resTx.quantity}),
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ${resTx.inventoryId}
          `;

          await tx.inventoryTransaction.create({
            data: {
              inventoryId: resTx.inventoryId,
              type: 'RELEASE',
              quantity: -resTx.quantity,
              referenceType: 'CUSTOMER_ORDER',
              referenceId: order.id,
              idempotencyKey: releaseKey,
              reason: `Released stock from cancelled Customer Order ${order.orderNumber}`,
              createdById: userId,
            },
          });
        }
      } else {
        // Fallback if no individual reservation tx found
        const inventory = await tx.inventory.findFirst({
          where: { locationId: order.locationId, itemId: order.itemId },
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
              idempotencyKey,
              reason: `Released stock from cancelled Customer Order ${order.orderNumber}`,
              createdById: userId,
            },
          });
        }
      }

      // Update order status to CANCELLED
      const updatedOrder = await tx.customerOrder.update({
        where: { id: orderId },
        data: { status: CustomerOrderStatus.CANCELLED },
        include: {
          location: true,
          item: { include: { category: true } },
          salesUser: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      return { order: updatedOrder };
    });
  }
}

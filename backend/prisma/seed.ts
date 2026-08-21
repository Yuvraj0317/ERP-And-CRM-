import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export enum Role {
  ADMIN = 'ADMIN',
  OPERATIONS = 'OPERATIONS',
  SALES = 'SALES',
}

async function main() {
  console.log('🌱 Starting Database Seeding...');

  await prisma.inventoryAuditLog.deleteMany();
  await prisma.customerOrder.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@erp.com',
      password: hashedPassword,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });

  const opsUser = await prisma.user.create({
    data: {
      email: 'ops@erp.com',
      password: hashedPassword,
      name: 'Operations Manager',
      role: Role.OPERATIONS,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      email: 'sales@erp.com',
      password: hashedPassword,
      name: 'Sales Executive',
      role: Role.SALES,
    },
  });

  console.log('✅ Created Demo Users (Admin, Ops, Sales)');

  const warehouseAlpha = await prisma.location.create({
    data: { name: 'Main Warehouse Alpha', code: 'LOC-W1', address: '100 Industrial Parkway, Zone 1' },
  });

  const factoryBeta = await prisma.location.create({
    data: { name: 'Factory Beta Plant', code: 'LOC-F2', address: '45 Assembly Drive, Zone 4' },
  });

  console.log('✅ Created Locations');

  const catRaw = await prisma.category.create({ data: { name: 'Raw Materials' } });
  const catComponents = await prisma.category.create({ data: { name: 'Mechanical Components' } });

  const steelSheet = await prisma.item.create({
    data: { sku: 'RM-STEEL-001', name: 'Industrial Steel Sheet 2mm', unit: 'sheets', categoryId: catRaw.id },
  });

  const copperWire = await prisma.item.create({
    data: { sku: 'RM-COPPER-050', name: 'Copper Wiring Roll 50m', unit: 'rolls', categoryId: catRaw.id },
  });

  const pump = await prisma.item.create({
    data: { sku: 'MC-PUMP-500', name: 'Hydraulic Motor Pump 500W', unit: 'units', categoryId: catComponents.id },
  });

  console.log('✅ Created Categories & Items');

  const batch1 = await prisma.batch.create({
    data: { batchNumber: 'BATCH-2026-A', itemId: steelSheet.id, expiryDate: new Date('2027-12-31') },
  });

  const batch2 = await prisma.batch.create({
    data: { batchNumber: 'BATCH-2026-B', itemId: copperWire.id, expiryDate: new Date('2028-06-30') },
  });

  console.log('✅ Created Batches');

  await prisma.inventory.create({
    data: {
      itemId: steelSheet.id,
      locationId: warehouseAlpha.id,
      batchId: batch1.id,
      physicalQuantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100,
    },
  });

  await prisma.inventory.create({
    data: {
      itemId: steelSheet.id,
      locationId: factoryBeta.id,
      batchId: batch1.id,
      physicalQuantity: 20,
      reservedQuantity: 0,
      availableQuantity: 20,
    },
  });

  await prisma.inventory.create({
    data: {
      itemId: copperWire.id,
      locationId: warehouseAlpha.id,
      batchId: batch2.id,
      physicalQuantity: 150,
      reservedQuantity: 30,
      availableQuantity: 120,
    },
  });

  await prisma.inventory.create({
    data: {
      itemId: pump.id,
      locationId: factoryBeta.id,
      physicalQuantity: 10,
      reservedQuantity: 0,
      availableQuantity: 10,
    },
  });

  console.log('✅ Seeded Initial Inventory Records');

  await prisma.workOrder.create({
    data: {
      workOrderNumber: 'WO-2026-001',
      locationId: factoryBeta.id,
      itemId: steelSheet.id,
      requiredQuantity: 60,
      assignedUserId: opsUser.id,
      createdById: admin.id,
      status: 'ASSIGNED',
    },
  });

  console.log('✅ Created Sample Work Order (WO-2026-001)');

  console.log('🚀 Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

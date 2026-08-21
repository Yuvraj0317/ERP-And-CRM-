import { PrismaClient, Role, WorkOrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Idempotent Database Seeding...');

  // 1. Seed Demo Users (Admin, Operations, Sales)
  const defaultPassword = process.env.DEMO_USER_PASSWORD || 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: { password: hashedPassword, name: 'System Admin', role: Role.ADMIN },
    create: {
      email: 'admin@erp.com',
      password: hashedPassword,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });

  const opsUser = await prisma.user.upsert({
    where: { email: 'ops@erp.com' },
    update: { password: hashedPassword, name: 'Operations Manager', role: Role.OPERATIONS },
    create: {
      email: 'ops@erp.com',
      password: hashedPassword,
      name: 'Operations Manager',
      role: Role.OPERATIONS,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@erp.com' },
    update: { password: hashedPassword, name: 'Sales Executive', role: Role.SALES },
    create: {
      email: 'sales@erp.com',
      password: hashedPassword,
      name: 'Sales Executive',
      role: Role.SALES,
    },
  });

  console.log('✅ Demo Users Seeded (Admin, Operations, Sales)');

  // 2. Seed Locations
  const warehouseAlpha = await prisma.location.upsert({
    where: { code: 'LOC-W1' },
    update: { name: 'Main Warehouse Alpha', address: '100 Industrial Parkway, Zone 1' },
    create: { name: 'Main Warehouse Alpha', code: 'LOC-W1', address: '100 Industrial Parkway, Zone 1' },
  });

  const factoryBeta = await prisma.location.upsert({
    where: { code: 'LOC-F2' },
    update: { name: 'Factory Beta Plant', address: '45 Assembly Drive, Zone 4' },
    create: { name: 'Factory Beta Plant', code: 'LOC-F2', address: '45 Assembly Drive, Zone 4' },
  });

  console.log('✅ Locations Seeded (Main Warehouse Alpha, Factory Beta Plant)');

  // 3. Seed Categories & Items
  const catRaw = await prisma.category.upsert({
    where: { name: 'Raw Materials' },
    update: {},
    create: { name: 'Raw Materials' },
  });

  const catComponents = await prisma.category.upsert({
    where: { name: 'Mechanical Components' },
    update: {},
    create: { name: 'Mechanical Components' },
  });

  const steelSheet = await prisma.item.upsert({
    where: { sku: 'RM-STEEL-001' },
    update: { name: 'Industrial Steel Sheet 2mm', unit: 'sheets', categoryId: catRaw.id },
    create: { sku: 'RM-STEEL-001', name: 'Industrial Steel Sheet 2mm', unit: 'sheets', categoryId: catRaw.id },
  });

  const copperWire = await prisma.item.upsert({
    where: { sku: 'RM-COPPER-050' },
    update: { name: 'Copper Wiring Roll 50m', unit: 'rolls', categoryId: catRaw.id },
    create: { sku: 'RM-COPPER-050', name: 'Copper Wiring Roll 50m', unit: 'rolls', categoryId: catRaw.id },
  });

  const pump = await prisma.item.upsert({
    where: { sku: 'MC-PUMP-500' },
    update: { name: 'Hydraulic Motor Pump 500W', unit: 'units', categoryId: catComponents.id },
    create: { sku: 'MC-PUMP-500', name: 'Hydraulic Motor Pump 500W', unit: 'units', categoryId: catComponents.id },
  });

  console.log('✅ Categories & Items Seeded');

  // 4. Seed Batches
  const batch1 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-2026-A' },
    update: { itemId: steelSheet.id, expiryDate: new Date('2027-12-31') },
    create: { batchNumber: 'BATCH-2026-A', itemId: steelSheet.id, expiryDate: new Date('2027-12-31') },
  });

  const batch2 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-2026-B' },
    update: { itemId: copperWire.id, expiryDate: new Date('2028-06-30') },
    create: { batchNumber: 'BATCH-2026-B', itemId: copperWire.id, expiryDate: new Date('2028-06-30') },
  });

  console.log('✅ Batches Seeded');

  // 5. Seed Inventory Records with Required Invariants
  // Main Warehouse Alpha: 100 Physical, 0 Reserved -> 100 Available
  const invAlphaSteel = await prisma.inventory.upsert({
    where: {
      itemId_locationId_batchId: {
        itemId: steelSheet.id,
        locationId: warehouseAlpha.id,
        batchId: batch1.id,
      },
    },
    update: {
      physicalQuantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100,
    },
    create: {
      itemId: steelSheet.id,
      locationId: warehouseAlpha.id,
      batchId: batch1.id,
      physicalQuantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100,
    },
  });

  // Factory Beta Plant: 20 Physical, 0 Reserved -> 20 Available
  const invBetaSteel = await prisma.inventory.upsert({
    where: {
      itemId_locationId_batchId: {
        itemId: steelSheet.id,
        locationId: factoryBeta.id,
        batchId: batch1.id,
      },
    },
    update: {
      physicalQuantity: 20,
      reservedQuantity: 0,
      availableQuantity: 20,
    },
    create: {
      itemId: steelSheet.id,
      locationId: factoryBeta.id,
      batchId: batch1.id,
      physicalQuantity: 20,
      reservedQuantity: 0,
      availableQuantity: 20,
    },
  });

  // Main Warehouse Alpha: Copper Wire (150 Physical, 30 Reserved -> 120 Available)
  await prisma.inventory.upsert({
    where: {
      itemId_locationId_batchId: {
        itemId: copperWire.id,
        locationId: warehouseAlpha.id,
        batchId: batch2.id,
      },
    },
    update: {
      physicalQuantity: 150,
      reservedQuantity: 30,
      availableQuantity: 120,
    },
    create: {
      itemId: copperWire.id,
      locationId: warehouseAlpha.id,
      batchId: batch2.id,
      physicalQuantity: 150,
      reservedQuantity: 30,
      availableQuantity: 120,
    },
  });

  console.log('✅ Inventory Records Seeded (Alpha: 100 Steel, Beta: 20 Steel)');

  // 6. Seed Idempotent Transactions
  await prisma.inventoryTransaction.upsert({
    where: { idempotencyKey: 'SEED-INIT-ALPHA-STEEL-001' },
    update: {},
    create: {
      inventoryId: invAlphaSteel.id,
      type: 'INITIAL_STOCK',
      quantity: 100,
      idempotencyKey: 'SEED-INIT-ALPHA-STEEL-001',
      reason: 'Initial warehouse stocking',
      createdById: admin.id,
    },
  });

  await prisma.inventoryTransaction.upsert({
    where: { idempotencyKey: 'SEED-INIT-BETA-STEEL-001' },
    update: {},
    create: {
      inventoryId: invBetaSteel.id,
      type: 'INITIAL_STOCK',
      quantity: 20,
      idempotencyKey: 'SEED-INIT-BETA-STEEL-001',
      reason: 'Initial factory stocking',
      createdById: admin.id,
    },
  });

  console.log('✅ Idempotent Inventory Transactions Seeded');

  // 7. Seed Work Order for Shortage Scenario
  // Work Order requires 60 units at Factory Beta (Available = 20 -> Shortage = 40)
  await prisma.workOrder.upsert({
    where: { workOrderNumber: 'WO-2026-001' },
    update: {
      locationId: factoryBeta.id,
      itemId: steelSheet.id,
      requiredQuantity: 60,
      assignedUserId: opsUser.id,
      createdById: admin.id,
      status: WorkOrderStatus.ASSIGNED,
    },
    create: {
      workOrderNumber: 'WO-2026-001',
      locationId: factoryBeta.id,
      itemId: steelSheet.id,
      requiredQuantity: 60,
      assignedUserId: opsUser.id,
      createdById: admin.id,
      status: WorkOrderStatus.ASSIGNED,
    },
  });

  console.log('✅ Target Scenario Work Order Seeded (WO-2026-001 requires 60, Shortage = 40)');

  console.log('🚀 Seed Process Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export type Role = 'ADMIN' | 'OPERATIONS' | 'SALES';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  address?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  unit: string;
  categoryId: string;
  category?: Category;
}

export interface Batch {
  id: string;
  batchNumber: string;
  itemId: string;
  expiryDate?: string;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  locationId: string;
  batchId: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  item: Item;
  location: Location;
  batch: Batch;
}

export type Inventory = InventoryItem;

export type WorkOrderStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  locationId: string;
  itemId: string;
  requiredQuantity: number;
  assignedUserId: string;
  status: WorkOrderStatus;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
  location: Location;
  item: Item;
  assignedUser: User;
  createdBy: User;
  currentAvailableQuantity?: number;
  shortage: number;
}

export type TransferStatus = 'REQUESTED' | 'DISPATCHED' | 'RECEIVED';

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  itemId: string;
  batchId: string;
  quantity: number;
  status: TransferStatus;
  requestedById: string;
  dispatchedById?: string;
  receivedById?: string;
  createdAt: string;
  updatedAt?: string;
  sourceLocation: Location;
  destinationLocation: Location;
  item: Item;
  batch: Batch;
  requestedBy: User;
  dispatchedBy?: User;
  receivedBy?: User;
}

export type CustomerOrderStatus = 'PENDING' | 'RESERVED' | 'CANCELLED' | 'COMPLETED';

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  locationId: string;
  itemId: string;
  quantity: number;
  status: CustomerOrderStatus;
  salesUserId: string;
  createdAt: string;
  updatedAt?: string;
  location: Location;
  item: Item;
  salesUser: User;
}

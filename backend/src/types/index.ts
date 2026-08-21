export type Role = 'ADMIN' | 'OPERATIONS' | 'SALES';

export const Role = {
  ADMIN: 'ADMIN' as Role,
  OPERATIONS: 'OPERATIONS' as Role,
  SALES: 'SALES' as Role,
};

export type WorkOrderStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

export const WorkOrderStatus = {
  ASSIGNED: 'ASSIGNED' as WorkOrderStatus,
  IN_PROGRESS: 'IN_PROGRESS' as WorkOrderStatus,
  COMPLETED: 'COMPLETED' as WorkOrderStatus,
};

export type TransferStatus = 'REQUESTED' | 'DISPATCHED' | 'RECEIVED';

export const TransferStatus = {
  REQUESTED: 'REQUESTED' as TransferStatus,
  DISPATCHED: 'DISPATCHED' as TransferStatus,
  RECEIVED: 'RECEIVED' as TransferStatus,
};

export type CustomerOrderStatus = 'PENDING' | 'RESERVED' | 'CANCELLED' | 'COMPLETED';

export const CustomerOrderStatus = {
  PENDING: 'PENDING' as CustomerOrderStatus,
  RESERVED: 'RESERVED' as CustomerOrderStatus,
  CANCELLED: 'CANCELLED' as CustomerOrderStatus,
  COMPLETED: 'COMPLETED' as CustomerOrderStatus,
};

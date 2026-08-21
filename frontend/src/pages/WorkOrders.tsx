import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { WorkOrder } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ClipboardList, Plus, AlertTriangle, CheckCircle, RefreshCw, UserCheck, MapPin, Package } from 'lucide-react';

export const WorkOrdersPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [locationId, setLocationId] = useState('');
  const [itemId, setItemId] = useState('');
  const [requiredQuantity, setRequiredQuantity] = useState(10);
  const [assignedUserId, setAssignedUserId] = useState('');

  const [createLoading, setCreateLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/work-orders');
      setWorkOrders(res.data.data || []);
    } catch (err: any) {
      setError('Failed to fetch Work Orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [invRes, authRes] = await Promise.all([api.get('/inventory'), api.get('/auth/me')]);
      const invList: any[] = invRes.data.data || [];

      // Extract unique locations and items
      const locMap = new Map();
      const itemMap = new Map();
      invList.forEach((inv) => {
        if (inv.location) locMap.set(inv.location.id, inv.location);
        if (inv.item) itemMap.set(inv.item.id, inv.item);
      });

      setLocations(Array.from(locMap.values()));
      setItems(Array.from(itemMap.values()));
      setUsers([authRes.data.data]); // Current user for assignment option
    } catch (err) {
      console.error('Failed to load master data for Work Orders', err);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleOpenCreate = () => {
    fetchMasterData();
    setIsCreateOpen(true);
    setModalError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !itemId || !assignedUserId) {
      setModalError('Please fill in all required fields');
      return;
    }

    setCreateLoading(true);
    setModalError('');

    try {
      await api.post('/work-orders', {
        locationId,
        itemId,
        requiredQuantity,
        assignedUserId,
      });

      setIsCreateOpen(false);
      fetchWorkOrders();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to create Work Order');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (woId: string, newStatus: string) => {
    try {
      await api.patch(`/work-orders/${woId}/status`, { status: newStatus });
      fetchWorkOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update Work Order status');
    }
  };

  const canCreateWO = user?.role === 'ADMIN';
  const canUpdateStatus = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Work Orders & Dynamic Shortage Engine"
        description="Track operational requirements with live backend material shortage calculations."
        icon={ClipboardList}
        actionButton={
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchWorkOrders}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {canCreateWO && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Create Work Order</span>
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-2xl flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Work Orders List Grid */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-sky-500 border-t-transparent"></div>
          <p className="text-xs text-slate-500 font-medium">Computing dynamic material shortages...</p>
        </div>
      ) : workOrders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 space-y-3">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">No Work Orders Created</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {canCreateWO ? 'Click "Create Work Order" above to schedule a new production requirement.' : 'No active work orders found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workOrders.map((wo) => {
            const hasShortage = wo.shortage > 0;
            return (
              <div
                key={wo.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-mono font-bold text-slate-900 text-sm">{wo.workOrderNumber}</span>
                    <StatusBadge status={wo.status} />
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Package className="h-3.5 w-3.5 text-sky-500" />
                      <span className="font-semibold text-slate-900">{wo.item?.name || 'N/A'}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{wo.location?.name || 'N/A'}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-500">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                      <span>Assigned: {wo.assignedUser?.name || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Quantity & Dynamic Shortage Container */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-500">Required Quantity:</span>
                      <span className="font-bold text-slate-900 font-mono">{wo.requiredQuantity}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-500">Available at Location:</span>
                      <span className="font-bold text-slate-900 font-mono">{wo.currentAvailableQuantity}</span>
                    </div>

                    <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center">
                      <span className="text-slate-600 font-semibold">Shortage Status:</span>
                      {hasShortage ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Shortage: {wo.shortage}
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Stock Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Transition Control */}
                {canUpdateStatus && wo.status !== 'COMPLETED' && (
                  <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Transition:</span>
                    {wo.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStatusChange(wo.id, 'IN_PROGRESS')}
                        className="w-full bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold py-1.5 rounded-lg border border-sky-200 transition"
                      >
                        Start (IN_PROGRESS)
                      </button>
                    )}
                    {wo.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStatusChange(wo.id, 'COMPLETED')}
                        className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold py-1.5 rounded-lg border border-emerald-200 transition"
                      >
                        Complete (COMPLETED)
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Work Order Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Work Order"
          subtitle="Define production quantity requirement at specified location."
        >
          {modalError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
              {modalError}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Location</label>
              <select
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Required Item</label>
              <select
                required
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select Item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Required Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={requiredQuantity}
                onChange={(e) => setRequiredQuantity(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Operational User</label>
              <select
                required
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select User</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition active:scale-95 disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create Work Order'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

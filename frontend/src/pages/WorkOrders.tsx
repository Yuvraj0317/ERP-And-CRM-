import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { WorkOrder, Location, Item, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Plus, AlertCircle, CheckCircle, Clock, ShieldAlert } from 'lucide-react';

export const WorkOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [itemId, setItemId] = useState('');
  const [requiredQuantity, setRequiredQuantity] = useState<number>(0);
  const [assignedUserId, setAssignedUserId] = useState('');
  const [modalError, setModalError] = useState('');

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const [woRes, masterRes, usersRes] = await Promise.all([
        api.get('/work-orders'),
        api.get('/inventory/masters'),
        api.get('/auth/users'),
      ]);
      setWorkOrders(woRes.data.data);
      setLocations(masterRes.data.data.locations);
      setItems(masterRes.data.data.items);
      setUsersList(usersRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    try {
      await api.post('/work-orders', {
        locationId,
        itemId,
        requiredQuantity,
        assignedUserId,
      });
      setIsModalOpen(false);
      setRequiredQuantity(0);
      fetchWorkOrders();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to create work order');
    }
  };

  const handleStatusChange = async (workOrderId: string, status: string) => {
    try {
      await api.patch(`/work-orders/${workOrderId}/status`, { status });
      fetchWorkOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 text-purple-600 p-2 rounded-xl">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Work Orders & Stock Check</h1>
            <p className="text-slate-500 text-sm">
              Material allocation & automatic shortage calculation engine
            </p>
          </div>
        </div>

        {isAdmin ? (
          <button
            onClick={() => {
              if (locations.length > 0) setLocationId(locations[0].id);
              if (items.length > 0) setItemId(items[0].id);
              if (usersList.length > 0) setAssignedUserId(usersList[0].id);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Work Order</span>
          </button>
        ) : (
          <div className="text-xs text-slate-400 flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span>Creation restricted to Admin role</span>
          </div>
        )}
      </div>

      {/* Work Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading work orders...</div>
        ) : workOrders.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">No work orders recorded.</div>
        ) : (
          workOrders.map((wo) => (
            <div
              key={wo.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
                    {wo.workOrderNumber}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getStatusBadge(wo.status)}`}>
                    {wo.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{wo.item?.name}</h3>
                  <p className="text-slate-500 text-sm">Location: <span className="font-medium text-slate-700">{wo.location?.name}</span></p>
                  <p className="text-slate-400 text-xs mt-0.5">Assigned to: {wo.assignedUser?.name}</p>
                </div>

                {/* Shortage Calculation Box (As requested in Case Study) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Required Material:</span>
                    <span className="font-bold">{wo.requiredQuantity} {wo.item?.unit}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Available at Location:</span>
                    <span className="font-bold text-sky-600">{wo.availableAtLocation} {wo.item?.unit}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center font-sans">
                    <span className="font-bold text-slate-700">Shortage:</span>
                    {wo.hasShortage ? (
                      <span className="flex items-center space-x-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 font-mono">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{wo.shortage} {wo.item?.unit}</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>0 (Stock Ready)</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Update Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Update Status:</span>
                <select
                  value={wo.status}
                  onChange={(e) => handleStatusChange(wo.id, e.target.value)}
                  className="bg-slate-100 border border-slate-300 text-xs font-semibold rounded-lg px-2 py-1 text-slate-800"
                >
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for Admin Creating Work Order */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create New Work Order</h3>

            {modalError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Target Location</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Material / Item</label>
                <select
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Required Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={requiredQuantity}
                  onChange={(e) => setRequiredQuantity(Number(e.target.value))}
                  placeholder="e.g. 100"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Personnel</label>
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                >
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
                >
                  Create Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

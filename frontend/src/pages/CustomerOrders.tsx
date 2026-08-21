import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CustomerOrder } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ShoppingCart, Plus, RefreshCw, AlertCircle, XCircle } from 'lucide-react';

export const CustomerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(10);

  const [createLoading, setCreateLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchCustomerOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/customer-orders');
      setOrders(res.data.data || []);
    } catch (err: any) {
      setError('Failed to fetch Customer Orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const invRes = await api.get('/inventory');
      const invList: any[] = invRes.data.data || [];

      const locMap = new Map();
      const itemMap = new Map();
      invList.forEach((inv) => {
        if (inv.location) locMap.set(inv.location.id, inv.location);
        if (inv.item) itemMap.set(inv.item.id, inv.item);
      });

      setLocations(Array.from(locMap.values()));
      setItems(Array.from(itemMap.values()));
    } catch (err) {
      console.error('Failed to load master data for Customer Orders', err);
    }
  };

  useEffect(() => {
    fetchCustomerOrders();
  }, []);

  const handleOpenCreate = () => {
    fetchMasterData();
    setIsCreateOpen(true);
    setModalError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !locationId || !itemId) {
      setModalError('Please enter customer name, location, and item');
      return;
    }

    setCreateLoading(true);
    setModalError('');

    try {
      await api.post('/customer-orders', {
        customerName,
        locationId,
        itemId,
        quantity,
      });

      setIsCreateOpen(false);
      fetchCustomerOrders();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to reserve stock for customer order');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order and release the reserved stock back to available?')) {
      return;
    }

    try {
      await api.post(`/customer-orders/${orderId}/cancel`);
      fetchCustomerOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel customer order');
    }
  };

  const canCreateAndCancel = user?.role === 'ADMIN' || user?.role === 'SALES';

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Customer Orders & Atomic Stock Reservation"
        description="Concurrency-safe stock reservation engine with atomic stock release on order cancellation."
        icon={ShoppingCart}
        actionButton={
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchCustomerOrders}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {canCreateAndCancel && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Create Order & Reserve</span>
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-2xl flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer Orders Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-sky-500 border-t-transparent"></div>
            <p className="text-xs text-slate-500 font-medium">Fetching customer stock reservations...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Customer Orders Placed</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {canCreateAndCancel ? 'Click "Create Order & Reserve" above to place an order and reserve stock.' : 'No customer orders found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Order #</th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Item & Location</th>
                  <th className="py-3.5 px-4 text-right">Reserved Quantity</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  {canCreateAndCancel && <th className="py-3.5 px-5 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-slate-900">
                      {ord.orderNumber}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      {ord.customerName}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{ord.item?.name || 'N/A'}</div>
                      <div className="text-[11px] text-slate-500">{ord.location?.name || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-amber-600">
                      {ord.quantity} units
                    </td>
                    <td className="py-4 px-4 text-center">
                      <StatusBadge status={ord.status} />
                    </td>
                    {canCreateAndCancel && (
                      <td className="py-4 px-5 text-center">
                        {ord.status === 'RESERVED' && (
                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            className="inline-flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 transition active:scale-95"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Cancel & Release</span>
                          </button>
                        )}
                        {ord.status === 'CANCELLED' && (
                          <span className="text-[11px] text-slate-400 font-medium">Released</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Customer Order Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create Customer Order & Reserve Stock"
          subtitle="Atomically reserve inventory quantity for a customer order."
        >
          {modalError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
              {modalError}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Industries, Global Corp..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fulfillment Location</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ordered Item</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reservation Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
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
                {createLoading ? 'Reserving...' : 'Place Order & Reserve Stock'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

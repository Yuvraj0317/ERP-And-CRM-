import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CustomerOrder, Location, Item } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Plus, ShieldCheck, XCircle, UserCheck } from 'lucide-react';

export const CustomerOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [modalError, setModalError] = useState('');

  const fetchCustomerOrders = async () => {
    setLoading(true);
    try {
      const [ordRes, masterRes] = await Promise.all([
        api.get('/customer-orders'),
        api.get('/inventory/masters'),
      ]);
      setOrders(ordRes.data.data);
      setLocations(masterRes.data.data.locations);
      setItems(masterRes.data.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerOrders();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    try {
      await api.post('/customer-orders', {
        customerName,
        locationId,
        itemId,
        quantity,
      });
      setIsModalOpen(false);
      setCustomerName('');
      setQuantity(0);
      fetchCustomerOrders();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to create order and reserve stock');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order and release reserved stock?')) return;
    try {
      await api.post(`/customer-orders/${orderId}/cancel`);
      fetchCustomerOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Order cancellation failed');
    }
  };

  const canCreateOrder = user?.role === 'ADMIN' || user?.role === 'SALES';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESERVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Customer Orders & Stock Reservation</h1>
            <p className="text-slate-500 text-sm">
              Atomic transaction-level stock reservation (Prevents parallel over-reservation)
            </p>
          </div>
        </div>

        {canCreateOrder && (
          <button
            onClick={() => {
              if (locations.length > 0) setLocationId(locations[0].id);
              if (items.length > 0) setItemId(items[0].id);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Order & Reserve Stock</span>
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <th className="py-4 px-6">Order ID</th>
              <th className="py-4 px-6">Customer Name</th>
              <th className="py-4 px-6">Fulfillment Location</th>
              <th className="py-4 px-6">Item</th>
              <th className="py-4 px-6 text-right">Reserved Qty</th>
              <th className="py-4 px-6 text-center">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">Loading order records...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">No customer orders created yet.</td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6 font-mono text-xs font-bold text-emerald-700">
                    {ord.orderNumber}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-900">{ord.customerName}</td>
                  <td className="py-4 px-6 text-slate-700 font-medium">{ord.location?.name}</td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{ord.item?.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{ord.item?.sku}</div>
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-emerald-600">
                    {ord.quantity} <span className="text-xs font-normal text-slate-400">{ord.item?.unit}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(ord.status)}`}>
                      {ord.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {canCreateOrder && ord.status === 'RESERVED' && (
                      <button
                        onClick={() => handleCancelOrder(ord.id)}
                        className="inline-flex items-center space-x-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg border border-red-200 transition font-medium"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Cancel & Release</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Sales User Creating Order */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Order & Reserve Stock</h3>

            {modalError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Acme Industrial Ltd"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fulfillment Location</label>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item Required</label>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity to Reserve</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="e.g. 60"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                />
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
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                >
                  Reserve Stock & Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

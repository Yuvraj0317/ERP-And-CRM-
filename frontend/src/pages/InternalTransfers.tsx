import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StockTransfer, Location, Item } from '../types';
import { useAuth } from '../context/AuthContext';
import { ArrowLeftRight, Plus, Truck, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const InternalTransfersPage: React.FC = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [modalError, setModalError] = useState('');

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const [trRes, masterRes] = await Promise.all([
        api.get('/transfers'),
        api.get('/inventory/masters'),
      ]);
      setTransfers(trRes.data.data);
      setLocations(masterRes.data.data.locations);
      setItems(masterRes.data.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    try {
      await api.post('/transfers', {
        sourceLocationId,
        destinationLocationId,
        itemId,
        quantity,
      });
      setIsModalOpen(false);
      setQuantity(0);
      fetchTransfers();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to request transfer');
    }
  };

  const handleDispatch = async (transferId: string) => {
    try {
      await api.post(`/transfers/${transferId}/dispatch`);
      fetchTransfers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Dispatch failed');
    }
  };

  const handleReceive = async (transferId: string) => {
    try {
      await api.post(`/transfers/${transferId}/receive`);
      fetchTransfers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Receipt failed');
    }
  };

  const canManage = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DISPATCHED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RECEIVED':
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
          <div className="bg-amber-100 text-amber-600 p-2 rounded-xl">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Internal Stock Transfers</h1>
            <p className="text-slate-500 text-sm">
              Multi-location stock movements (Dispatch reduces source, Receive increases destination)
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => {
              if (locations.length >= 2) {
                setSourceLocationId(locations[0].id);
                setDestinationLocationId(locations[1].id);
              }
              if (items.length > 0) setItemId(items[0].id);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Request Transfer</span>
          </button>
        )}
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <th className="py-4 px-6">Transfer ID</th>
              <th className="py-4 px-6">Source Location</th>
              <th className="py-4 px-6">Destination Location</th>
              <th className="py-4 px-6">Item</th>
              <th className="py-4 px-6 text-right">Quantity</th>
              <th className="py-4 px-6 text-center">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">Loading transfer records...</td>
              </tr>
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">No stock transfers recorded.</td>
              </tr>
            ) : (
              transfers.map((tr) => (
                <tr key={tr.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6 font-mono text-xs font-bold text-amber-700">
                    {tr.transferNumber}
                  </td>
                  <td className="py-4 px-6 text-slate-700 font-medium">{tr.sourceLocation?.name}</td>
                  <td className="py-4 px-6 text-slate-700 font-medium">{tr.destinationLocation?.name}</td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{tr.item?.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{tr.item?.sku}</div>
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-slate-800">
                    {tr.quantity} <span className="text-xs font-normal text-slate-400">{tr.item?.unit}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(tr.status)}`}>
                      {tr.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {canManage && (
                      <div className="flex items-center justify-end space-x-2">
                        {tr.status === 'REQUESTED' && (
                          <button
                            onClick={() => handleDispatch(tr.id)}
                            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-sm transition"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            <span>Dispatch</span>
                          </button>
                        )}

                        {tr.status === 'DISPATCHED' && (
                          <button
                            onClick={() => handleReceive(tr.id)}
                            className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-sm transition"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Receive Stock</span>
                          </button>
                        )}

                        {tr.status === 'RECEIVED' && (
                          <span className="text-xs text-slate-400 flex items-center space-x-1 font-mono">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Requesting Transfer */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Request Stock Transfer</h3>

            {modalError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source Location (From)</label>
                <select
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Destination Location (To)</label>
                <select
                  value={destinationLocationId}
                  onChange={(e) => setDestinationLocationId(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item to Transfer</label>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="e.g. 50"
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
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
                >
                  Submit Transfer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

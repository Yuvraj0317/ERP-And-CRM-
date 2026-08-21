import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { InventoryItem, Location, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { Boxes, Filter, Plus, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modal State for Stock Adjustment
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItemId, setAdjustItemId] = useState('');
  const [adjustLocationId, setAdjustLocationId] = useState('');
  const [adjustQtyChange, setAdjustQtyChange] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [modalError, setModalError] = useState('');

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const [invRes, masterRes] = await Promise.all([
        api.get('/inventory', {
          params: {
            locationId: selectedLocation || undefined,
            categoryId: selectedCategory || undefined,
          },
        }),
        api.get('/inventory/masters'),
      ]);
      setInventories(invRes.data.data);
      setLocations(masterRes.data.data.locations);
      setCategories(masterRes.data.data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [selectedLocation, selectedCategory]);

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    try {
      await api.post('/inventory/adjust', {
        itemId: adjustItemId,
        locationId: adjustLocationId,
        quantityChange: adjustQtyChange,
        reason: adjustReason,
      });
      setIsAdjustModalOpen(false);
      setAdjustQtyChange(0);
      setAdjustReason('');
      fetchInventoryData();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to adjust stock');
    }
  };

  const canManage = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-3">
            <div className="bg-sky-100 text-sky-600 p-2 rounded-xl">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Inventory Dashboard</h1>
              <p className="text-slate-500 text-sm">
                Real-time stock monitoring & calculation (Available = Physical - Reserved)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchInventoryData}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            title="Refresh Stock Data"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={() => {
                if (inventories.length > 0) {
                  setAdjustItemId(inventories[0].itemId);
                  setAdjustLocationId(inventories[0].locationId);
                }
                setIsAdjustModalOpen(true);
              }}
              className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Adjust Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 text-slate-500 text-sm font-medium">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        <div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <th className="py-4 px-6">Item & SKU</th>
              <th className="py-4 px-6">Category</th>
              <th className="py-4 px-6">Location</th>
              <th className="py-4 px-6">Batch</th>
              <th className="py-4 px-6 text-right">Physical Qty</th>
              <th className="py-4 px-6 text-right">Reserved Qty</th>
              <th className="py-4 px-6 text-right">Available Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Loading stock data...
                </td>
              </tr>
            ) : inventories.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No inventory records match filters.
                </td>
              </tr>
            ) : (
              inventories.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{inv.item.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{inv.item.sku}</div>
                  </td>
                  <td className="py-4 px-6 text-slate-600">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium">
                      {inv.item.category?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-700 font-medium">{inv.location.name}</td>
                  <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                    {inv.batch ? inv.batch.batchNumber : 'N/A'}
                  </td>
                  <td className="py-4 px-6 text-right font-semibold text-slate-800">
                    {inv.physicalQuantity} <span className="text-xs font-normal text-slate-400">{inv.item.unit}</span>
                  </td>
                  <td className="py-4 px-6 text-right font-medium text-amber-600">
                    {inv.reservedQuantity} <span className="text-xs font-normal text-slate-400">{inv.item.unit}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200">
                      {inv.availableQuantity} {inv.item.unit}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Adjust Inventory Stock</h3>

            {modalError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Item</label>
                <select
                  value={adjustItemId}
                  onChange={(e) => setAdjustItemId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                >
                  {inventories.map((inv) => (
                    <option key={inv.id} value={inv.itemId}>
                      {inv.item.name} ({inv.location.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity Change (+ or -)</label>
                <input
                  type="number"
                  required
                  value={adjustQtyChange}
                  onChange={(e) => setAdjustQtyChange(Number(e.target.value))}
                  placeholder="e.g. +50 or -10"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reason</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Stock count correction, receiving, etc."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

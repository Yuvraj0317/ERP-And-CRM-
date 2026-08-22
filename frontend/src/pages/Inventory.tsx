import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ExportDropdown } from '../components/ExportDropdown';
import { ExportColumn } from '../utils/exportUtils';
import { Boxes, Filter, RefreshCw, SlidersHorizontal, AlertCircle, PlusCircle, MinusCircle, Layers } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Filters
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Adjust Stock Modal State
  const [selectedInv, setSelectedInv] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number | ''>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/inventory');
      setInventories(res.data.data || []);
    } catch (err: any) {
      setError('Failed to fetch inventory records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv) return;

    const parsedQty = typeof adjustQty === 'number' ? adjustQty : parseInt(String(adjustQty), 10);
    if (isNaN(parsedQty) || parsedQty === 0) {
      setModalError('Quantity change cannot be zero');
      return;
    }
    if (!adjustReason.trim()) {
      setModalError('Reason for stock adjustment is required');
      return;
    }

    setAdjustLoading(true);
    setModalError('');
    setModalSuccess('');

    try {
      await api.post('/inventory/adjust', {
        inventoryId: selectedInv.id,
        quantity: Math.floor(parsedQty),
        reason: adjustReason.trim(),
        idempotencyKey: `ADJ-UI-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      });

      setModalSuccess('Stock level updated successfully');
      setTimeout(() => {
        setSelectedInv(null);
        setModalSuccess('');
        fetchInventory();
      }, 1000);
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to adjust inventory stock');
    } finally {
      setAdjustLoading(false);
    }
  };

  const locations = Array.from(new Set(inventories.map((i) => i.location?.name).filter(Boolean)));

  const filteredInventories = inventories.filter((inv) => {
    const matchesLoc = !selectedLocation || inv.location?.name === selectedLocation;
    const matchesSearch =
      !searchQuery ||
      inv.item?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.item?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.batch?.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLoc && matchesSearch;
  });

  const canAdjust = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  // Export Data Preparation
  const inventoryColumns: ExportColumn[] = [
    { header: 'Item Name', key: 'itemName', width: 22 },
    { header: 'SKU', key: 'sku', width: 14 },
    { header: 'Location', key: 'locationName', width: 18 },
    { header: 'Batch Number', key: 'batchNumber', width: 16 },
    { header: 'Physical Stock', key: 'physicalQuantity', width: 14 },
    { header: 'Reserved Stock', key: 'reservedQuantity', width: 14 },
    { header: 'Available Stock', key: 'availableQuantity', width: 14 },
    { header: 'Stock Status', key: 'status', width: 14 },
  ];

  const mapExportRow = (inv: InventoryItem) => {
    const available = inv.physicalQuantity - inv.reservedQuantity;
    return {
      itemName: inv.item?.name || 'N/A',
      sku: inv.item?.sku || 'N/A',
      locationName: inv.location?.name || 'N/A',
      batchNumber: inv.batch?.batchNumber || 'N/A',
      physicalQuantity: inv.physicalQuantity,
      reservedQuantity: inv.reservedQuantity,
      availableQuantity: available,
      status: available > 0 ? 'In Stock' : 'Out of Stock',
    };
  };

  const currentViewExportData = filteredInventories.map(mapExportRow);
  const allExportData = inventories.map(mapExportRow);

  const activeFiltersNote = [
    searchQuery ? `Search: "${searchQuery}"` : '',
    selectedLocation ? `Location: "${selectedLocation}"` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Multi-Location Inventory Engine"
        description="Authoritative inventory tracking with physical, reserved, and real-time available stock levels."
        icon={Boxes}
        actionButton={
          <div className="flex items-center space-x-2.5">
            <button
              onClick={fetchInventory}
              disabled={loading}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition active:scale-95 shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Stock</span>
            </button>

            <ExportDropdown
              title="Mini Operations ERP — Inventory Valuation & Stock Report"
              subtitle="Filter-aware multi-location inventory records and availability"
              filenamePrefix="mini-operations-erp-inventory"
              columns={inventoryColumns}
              currentViewData={currentViewExportData}
              allData={allExportData}
              activeFiltersText={activeFiltersNote}
            />
          </div>
        }
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-2xl flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors duration-300">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-72">
            <SlidersHorizontal className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU, item name, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium text-right">
          Showing <span className="font-bold text-slate-900">{filteredInventories.length}</span> of {inventories.length} records
        </div>
      </div>

      {/* Inventory Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-colors duration-300">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#2563EB] border-t-transparent"></div>
            <p className="text-xs text-slate-500 font-medium">Fetching real-time inventory balance...</p>
          </div>
        ) : filteredInventories.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Inventory Records Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No inventory entries match your filter criteria or initial seed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Item & SKU</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Batch Number</th>
                  <th className="py-3.5 px-4 text-right">Physical Stock</th>
                  <th className="py-3.5 px-4 text-right">Reserved Stock</th>
                  <th className="py-3.5 px-5 text-right">Available Stock</th>
                  {canAdjust && <th className="py-3.5 px-5 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredInventories.map((inv) => {
                  const available = inv.physicalQuantity - inv.reservedQuantity;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900">{inv.item?.name || 'N/A'}</div>
                        <div className="text-[11px] font-mono text-slate-500">SKU: {inv.item?.sku || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-700">
                        {inv.location?.name || 'N/A'}
                        <span className="block text-[10px] text-slate-400 font-mono">{inv.location?.code}</span>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-600">
                        {inv.batch?.batchNumber || 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-slate-800">
                        {inv.physicalQuantity}
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-amber-600">
                        {inv.reservedQuantity}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                            available > 0
                              ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {available}
                        </span>
                      </td>
                      {canAdjust && (
                        <td className="py-4 px-5 text-center">
                          <button
                            onClick={() => {
                              setSelectedInv(inv);
                              setAdjustQty(0);
                              setAdjustReason('');
                              setModalError('');
                              setModalSuccess('');
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-[#2563EB] px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 transition active:scale-95"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {selectedInv && (
        <Modal
          isOpen={!!selectedInv}
          onClose={() => setSelectedInv(null)}
          title="Adjust Physical Inventory Stock"
          subtitle={`Item: ${selectedInv.item?.name} (${selectedInv.location?.name})`}
        >
          {modalError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {modalError}
            </div>
          )}
          {modalSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3.5 rounded-xl font-medium">
              {modalSuccess}
            </div>
          )}

          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Physical Stock:</span>
                <span className="font-bold text-slate-900">{selectedInv.physicalQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reserved Stock:</span>
                <span className="font-bold text-amber-600">{selectedInv.reservedQuantity}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-700 font-semibold">Current Available Stock:</span>
                <span className="font-bold text-[#2563EB]">
                  {selectedInv.physicalQuantity - selectedInv.reservedQuantity}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quantity Change (+ to Add, - to Deduct)
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setAdjustQty((prev) => (typeof prev === 'number' ? prev - 5 : -5))}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl border border-slate-200 transition active:scale-95"
                >
                  <MinusCircle className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setAdjustQty(isNaN(val) ? '' : val);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition"
                />
                <button
                  type="button"
                  onClick={() => setAdjustQty((prev) => (typeof prev === 'number' ? prev + 5 : 5))}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl border border-slate-200 transition active:scale-95"
                >
                  <PlusCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reason for Stock Adjustment
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Audit correction, physical damage..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedInv(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjustLoading}
                className="bg-[#2563EB] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {adjustLoading ? 'Updating Stock...' : 'Confirm Adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

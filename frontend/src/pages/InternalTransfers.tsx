import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { StockTransfer, Location, InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { ExportDropdown } from '../components/ExportDropdown';
import { ExportColumn } from '../utils/exportUtils';
import { ArrowLeftRight, Plus, ArrowRight, RefreshCw, AlertCircle, Filter, SlidersHorizontal } from 'lucide-react';

export const InternalTransfersPage: React.FC = () => {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Master Data State
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [itemId, setItemId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(10);

  const [createLoading, setCreateLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchTransfers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/transfers');
      setTransfers(res.data.data || []);
    } catch (err: any) {
      setError('Failed to fetch Stock Transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    setMasterLoading(true);
    try {
      const invRes = await api.get('/inventory');
      const invList: InventoryItem[] = invRes.data.data || [];
      setInventories(invList);

      const locMap = new Map<string, Location>();
      invList.forEach((inv) => {
        if (inv.location) locMap.set(inv.location.id, inv.location);
      });
      setLocations(Array.from(locMap.values()));
    } catch (err) {
      console.error('Failed to load inventory for transfers', err);
    } finally {
      setMasterLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchMasterData();
  }, []);

  const handleOpenCreate = async () => {
    setModalError('');
    setSourceLocationId('');
    setDestinationLocationId('');
    setItemId('');
    setBatchId('');
    setQuantity(10);
    setIsCreateOpen(true);
    if (inventories.length === 0) {
      await fetchMasterData();
    }
  };

  const allProjectItemsMap = new Map<string, { id: string; name: string; sku: string }>();
  inventories.forEach((inv) => {
    if (inv.item) {
      allProjectItemsMap.set(inv.item.id, {
        id: inv.item.id,
        name: inv.item.name,
        sku: inv.item.sku,
      });
    }
  });
  const allProjectItems = Array.from(allProjectItemsMap.values());

  const allProjectBatchesMap = new Map<string, { id: string; batchNumber: string; itemId: string; locationId: string; itemName?: string; availableQuantity: number }>();
  inventories.forEach((inv) => {
    if (inv.batch) {
      const available = inv.physicalQuantity - inv.reservedQuantity;
      allProjectBatchesMap.set(inv.batch.id, {
        id: inv.batch.id,
        batchNumber: inv.batch.batchNumber,
        itemId: inv.itemId,
        locationId: inv.locationId,
        itemName: inv.item?.name,
        availableQuantity: available,
      });
    }
  });
  const allProjectBatches = Array.from(allProjectBatchesMap.values());

  const availableSourceInventory = inventories.filter(
    (inv) => inv.locationId === sourceLocationId
  );

  const availableItemsAtSource = Array.from(
    new Map(
      availableSourceInventory.map((inv) => [
        inv.item.id,
        {
          id: inv.item.id,
          name: inv.item.name,
          sku: inv.item.sku,
        },
      ])
    ).values()
  );

  const filteredBatches = inventories
    .filter((inv) => {
      const matchSource = !sourceLocationId || inv.locationId === sourceLocationId;
      const matchItem = !itemId || inv.itemId === itemId;
      return matchSource && matchItem;
    })
    .map((inv) => ({
      id: inv.batch.id,
      batchNumber: inv.batch.batchNumber,
      itemId: inv.itemId,
      locationId: inv.locationId,
      itemName: inv.item?.name,
      availableQuantity: inv.physicalQuantity - inv.reservedQuantity,
    }));

  const sourceLocationOptions = locations.map((loc) => ({
    value: loc.id,
    label: `${loc.name} (${loc.code})`,
  }));

  const destinationLocationOptions = locations
    .filter((loc) => loc.id !== sourceLocationId)
    .map((loc) => ({
      value: loc.id,
      label: `${loc.name} (${loc.code})`,
    }));

  const displayItemsList = sourceLocationId ? availableItemsAtSource : allProjectItems;
  const itemOptions = displayItemsList.map((item) => ({
    value: item.id,
    label: `${item.name} (${item.sku})`,
  }));

  const displayBatchesList = (sourceLocationId || itemId) ? filteredBatches : allProjectBatches;
  const batchOptions = displayBatchesList.map((b) => ({
    value: b.id,
    label: `${b.batchNumber} (Avail: ${b.availableQuantity} units${b.itemName ? ` — ${b.itemName}` : ''})`,
  }));

  const handleSourceLocationChange = (locId: string) => {
    setSourceLocationId(locId);
    if (itemId && !availableItemsAtSource.some((i) => i.id === itemId)) {
      setItemId('');
    }
    setBatchId('');
    setModalError('');
  };

  const handleItemChange = (selectedItemId: string) => {
    setItemId(selectedItemId);
    setBatchId('');
    setModalError('');
  };

  const handleBatchChange = (selectedBatchId: string) => {
    setBatchId(selectedBatchId);
    const match = inventories.find((inv) => inv.batchId === selectedBatchId);
    if (match) {
      if (!itemId) setItemId(match.itemId);
      if (!sourceLocationId) setSourceLocationId(match.locationId);
    }
    setModalError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceLocationId) {
      setModalError('Please select a Source Location');
      return;
    }
    if (!destinationLocationId) {
      setModalError('Please select a Destination Location');
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      setModalError('Source and Destination locations must be different');
      return;
    }
    if (!itemId) {
      setModalError('Please select an Item to Transfer');
      return;
    }
    if (!batchId) {
      setModalError('Please select a Batch Number');
      return;
    }

    const parsedQty = typeof quantity === 'number' ? quantity : parseInt(String(quantity), 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setModalError('Transfer Quantity must be a positive integer');
      return;
    }

    setCreateLoading(true);
    setModalError('');

    try {
      await api.post('/transfers', {
        sourceLocationId,
        destinationLocationId,
        itemId,
        batchId,
        quantity: Math.floor(parsedQty),
      });

      setIsCreateOpen(false);
      fetchTransfers();
      fetchMasterData();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to request stock transfer');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDispatch = async (transferId: string) => {
    try {
      await api.post(`/transfers/${transferId}/dispatch`);
      fetchTransfers();
      fetchMasterData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to dispatch transfer');
    }
  };

  const handleReceive = async (transferId: string) => {
    try {
      await api.post(`/transfers/${transferId}/receive`);
      fetchTransfers();
      fetchMasterData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to receive transfer');
    }
  };

  const canMutate = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  const filteredTransfers = transfers.filter((tr) => {
    const matchesStatus = !selectedStatus || tr.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      tr.transferNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.item?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.batch?.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.sourceLocation?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.destinationLocation?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Export Columns Preparation
  const transferColumns: ExportColumn[] = [
    { header: 'Transfer ID', key: 'transferNumber', width: 18 },
    { header: 'Item Name', key: 'itemName', width: 22 },
    { header: 'Batch Number', key: 'batchNumber', width: 16 },
    { header: 'Source Location', key: 'sourceLocationName', width: 20 },
    { header: 'Destination Location', key: 'destinationLocationName', width: 20 },
    { header: 'Transfer Qty', key: 'quantity', width: 14 },
    { header: 'Lifecycle Status', key: 'status', width: 14 },
    { header: 'Dispatched Status', key: 'dispatchedBy', width: 16 },
    { header: 'Received Status', key: 'receivedBy', width: 16 },
    { header: 'Requested At', key: 'createdAt', width: 16 },
  ];

  const mapExportRow = (tr: StockTransfer) => ({
    transferNumber: tr.transferNumber,
    itemName: tr.item?.name || 'N/A',
    batchNumber: tr.batch?.batchNumber || 'N/A',
    sourceLocationName: tr.sourceLocation?.name || 'N/A',
    destinationLocationName: tr.destinationLocation?.name || 'N/A',
    quantity: tr.quantity,
    status: tr.status,
    dispatchedBy: tr.dispatchedBy?.name || (tr.status !== 'REQUESTED' ? 'Dispatched' : 'Pending'),
    receivedBy: tr.receivedBy?.name || (tr.status === 'RECEIVED' ? 'Received' : 'Pending'),
    createdAt: new Date(tr.createdAt).toLocaleDateString(),
  });

  const currentViewExportData = filteredTransfers.map(mapExportRow);
  const allExportData = transfers.map(mapExportRow);

  const activeFiltersNote = [
    searchQuery ? `Search: "${searchQuery}"` : '',
    selectedStatus ? `Status: "${selectedStatus}"` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Internal Stock Transfers Engine"
        description="Atomic inter-facility stock movement pipeline: REQUESTED → DISPATCHED → RECEIVED."
        icon={ArrowLeftRight}
        actionButton={
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                fetchTransfers();
                fetchMasterData();
              }}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#2563EB] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <ExportDropdown
              title="Mini Operations ERP — Stock Transfer Audit Trail"
              subtitle="Filter-aware inter-facility stock movement logs and timestamps"
              filenamePrefix="mini-operations-erp-transfers"
              columns={transferColumns}
              currentViewData={currentViewExportData}
              allData={allExportData}
              activeFiltersText={activeFiltersNote}
            />

            {canMutate && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center space-x-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Request Transfer</span>
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

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-72">
            <SlidersHorizontal className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Transfer#, item, batch, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
            >
              <option value="">All Lifecycle Statuses</option>
              <option value="REQUESTED">REQUESTED</option>
              <option value="DISPATCHED">DISPATCHED</option>
              <option value="RECEIVED">RECEIVED</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium text-right">
          Showing <span className="font-bold text-slate-900">{filteredTransfers.length}</span> of {transfers.length} Transfers
        </div>
      </div>

      {/* Transfers Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-colors duration-300">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#2563EB] border-t-transparent"></div>
            <p className="text-xs text-slate-500 font-medium">Fetching transfer audit trail...</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ArrowLeftRight className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Stock Transfers Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {canMutate ? 'Click "Request Transfer" above to initiate inter-facility inventory movement.' : 'No active transfer records found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Transfer #</th>
                  <th className="py-3.5 px-4">Item & Batch</th>
                  <th className="py-3.5 px-4">Source Facility</th>
                  <th className="py-3.5 px-4">Destination Facility</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-center">Lifecycle Status</th>
                  {canMutate && <th className="py-3.5 px-5 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-slate-900">{tr.transferNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(tr.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{tr.item?.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">Batch: {tr.batch?.batchNumber}</div>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700">
                      {tr.sourceLocation?.name}
                      <span className="block text-[10px] text-slate-400 font-mono">{tr.sourceLocation?.code}</span>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700">
                      {tr.destinationLocation?.name}
                      <span className="block text-[10px] text-slate-400 font-mono">{tr.destinationLocation?.code}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {tr.quantity}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <StatusBadge status={tr.status} />
                    </td>
                    {canMutate && (
                      <td className="py-4 px-5 text-center">
                        {tr.status === 'REQUESTED' && (
                          <button
                            onClick={() => handleDispatch(tr.id)}
                            className="bg-[#2563EB] hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
                          >
                            Dispatch Source Stock →
                          </button>
                        )}
                        {tr.status === 'DISPATCHED' && (
                          <button
                            onClick={() => handleReceive(tr.id)}
                            className="bg-blue-50 hover:bg-blue-100 text-[#2563EB] px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 transition active:scale-95"
                          >
                            Receive Destination Stock ✓
                          </button>
                        )}
                        {tr.status === 'RECEIVED' && (
                          <span className="text-[11px] font-semibold text-emerald-600 font-mono">
                            Completed & Verified
                          </span>
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

      {/* Request Stock Transfer Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Request Internal Stock Transfer"
          subtitle="Move stock between facilities via REQUESTED → DISPATCHED → RECEIVED pipeline"
        >
          {modalError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {modalError}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Source Location (Deducting Stock)
              </label>
              <Select
                options={sourceLocationOptions}
                value={sourceLocationId}
                onChange={handleSourceLocationChange}
                placeholder="Select source location..."
                disabled={masterLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                2. Destination Location (Receiving Stock)
              </label>
              <Select
                options={destinationLocationOptions}
                value={destinationLocationId}
                onChange={(val) => {
                  setDestinationLocationId(val);
                  setModalError('');
                }}
                placeholder="Select destination location..."
                disabled={masterLoading || !sourceLocationId}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                3. Item to Transfer
              </label>
              <Select
                options={itemOptions}
                value={itemId}
                onChange={handleItemChange}
                placeholder="Select item to move..."
                disabled={masterLoading || itemOptions.length === 0}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                4. Batch Number
              </label>
              <Select
                options={batchOptions}
                value={batchId}
                onChange={handleBatchChange}
                placeholder="Select batch number..."
                disabled={masterLoading || batchOptions.length === 0}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Transfer Quantity (Units)
              </label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantity(isNaN(val) ? '' : val);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="bg-[#2563EB] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {createLoading ? 'Requesting Transfer...' : 'Request Stock Transfer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

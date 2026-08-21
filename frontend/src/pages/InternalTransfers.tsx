import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { StockTransfer, Location, InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { ArrowLeftRight, Plus, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

export const InternalTransfersPage: React.FC = () => {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

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
      locationName: inv.location?.name,
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

  const itemOptions = sourceLocationId
    ? availableItemsAtSource.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.sku})`,
      }))
    : allProjectItems.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.sku})`,
      }));

  const batchOptions = (filteredBatches.length > 0 ? filteredBatches : allProjectBatches).map((b) => ({
    value: b.id,
    label: `Batch: ${b.batchNumber} (${b.itemName || 'Item'}) — Available: ${b.availableQuantity} units`,
  }));

  const handleSourceLocationChange = (e: any) => {
    const selectedSourceLoc = e.target.value;
    setSourceLocationId(selectedSourceLoc);
    setItemId('');
    setBatchId('');
    if (destinationLocationId === selectedSourceLoc) {
      setDestinationLocationId('');
    }
    setModalError('');
  };

  const handleItemChange = (e: any) => {
    const selectedItemId = e.target.value;
    setItemId(selectedItemId);
    setBatchId('');

    if (!sourceLocationId && selectedItemId) {
      const match = inventories.find((inv) => inv.itemId === selectedItemId);
      if (match && match.locationId) {
        setSourceLocationId(match.locationId);
      }
    }
    setModalError('');
  };

  const handleBatchChange = (e: any) => {
    const selectedBatchId = e.target.value;
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

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Internal Stock Transfers Engine"
        description="Transfer stock across locations with multi-stage lifecycle & double-receipt protection."
        icon={ArrowLeftRight}
        actionButton={
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                fetchTransfers();
                fetchMasterData();
              }}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {canMutate && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Request Transfer</span>
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs p-4 rounded-2xl flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Lifecycle Banner */}
      <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-sm">
        <span className="font-semibold text-sky-400">⚡ Transfer Lifecycle Workflow:</span>
        <div className="flex items-center space-x-2 font-mono font-bold">
          <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md border border-amber-500/30">REQUESTED</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
          <span className="bg-sky-500/20 text-sky-300 px-2.5 py-1 rounded-md border border-sky-500/30">DISPATCHED (Deducts Source)</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
          <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/30">RECEIVED (Adds Dest)</span>
        </div>
      </div>

      {/* Transfers Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-sky-500 border-t-transparent"></div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading stock transfer records...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ArrowLeftRight className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Transfers Requested</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              {canMutate ? 'Click "Request Transfer" above to initiate a stock transfer between locations.' : 'No stock transfers found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Transfer #</th>
                  <th className="py-3.5 px-4">Item & Batch</th>
                  <th className="py-3.5 px-4">Source Location</th>
                  <th className="py-3.5 px-4">Destination Location</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  {canMutate && <th className="py-3.5 px-5 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-slate-900 dark:text-white">
                      {tr.transferNumber}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{tr.item?.name || 'N/A'}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Batch: {tr.batch?.batchNumber || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {tr.sourceLocation?.name}
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {tr.destinationLocation?.name}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
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
                            className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
                          >
                            Dispatch Stock
                          </button>
                        )}
                        {tr.status === 'DISPATCHED' && (
                          <button
                            onClick={() => handleReceive(tr.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
                          >
                            Receive Stock
                          </button>
                        )}
                        {tr.status === 'RECEIVED' && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Completed</span>
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

      {/* Request Transfer Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Request Internal Stock Transfer"
          subtitle="Move item quantity from source location to destination location."
        >
          {modalError && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs p-3.5 rounded-xl font-medium">
              {modalError}
            </div>
          )}

          {masterLoading ? (
            <div className="p-8 text-center space-y-2">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent"></div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading locations & inventory...</p>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Select
                label="Source Location"
                value={sourceLocationId}
                onChange={handleSourceLocationChange}
                placeholder="-- Select Source Location --"
                options={sourceLocationOptions}
              />

              <Select
                label="Destination Location"
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(e.target.value)}
                placeholder="-- Select Destination Location --"
                options={destinationLocationOptions}
              />

              <Select
                label="Item to Transfer"
                value={itemId}
                onChange={handleItemChange}
                placeholder="-- Select Item to Transfer --"
                options={itemOptions}
              />

              <Select
                label="Source Batch Number"
                value={batchId}
                onChange={handleBatchChange}
                placeholder="-- Select Source Batch Number --"
                options={batchOptions}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Transfer Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantity(isNaN(val) ? '' : val);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition active:scale-95 disabled:opacity-50"
                >
                  {createLoading ? 'Submitting...' : 'Submit Transfer Request'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};

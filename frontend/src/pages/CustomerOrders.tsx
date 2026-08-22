import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CustomerOrder, Location, InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { ExportDropdown } from '../components/ExportDropdown';
import { ExportColumn } from '../utils/exportUtils';
import { ShoppingCart, Plus, RefreshCw, AlertCircle, XCircle, Filter, SlidersHorizontal } from 'lucide-react';

export const CustomerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Master Data State
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(10);

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
    setMasterLoading(true);
    try {
      const invRes = await api.get('/inventory');
      const invList: InventoryItem[] = invRes.data.data || [];
      setInventories(invList);

      const locMap = new Map<string, Location>();
      invList.forEach((inv) => {
        if (inv.location) {
          locMap.set(inv.location.id, inv.location);
        }
      });
      setLocations(Array.from(locMap.values()));
    } catch (err) {
      console.error('Failed to load master data for Customer Orders', err);
    } finally {
      setMasterLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerOrders();
    fetchMasterData();
  }, []);

  const handleOpenCreate = async () => {
    setModalError('');
    setCustomerName('');
    setLocationId('');
    setItemId('');
    setQuantity(10);
    setIsCreateOpen(true);
    if (locations.length === 0 || inventories.length === 0) {
      await fetchMasterData();
    }
  };

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: `${loc.name} (${loc.code})`,
  }));

  const allProjectItemsMap = new Map<string, { id: string; name: string; sku: string; locations: string[] }>();
  inventories.forEach((inv) => {
    if (inv.item) {
      const existing = allProjectItemsMap.get(inv.item.id);
      if (existing) {
        if (inv.locationId && !existing.locations.includes(inv.locationId)) {
          existing.locations.push(inv.locationId);
        }
      } else {
        allProjectItemsMap.set(inv.item.id, {
          id: inv.item.id,
          name: inv.item.name,
          sku: inv.item.sku,
          locations: inv.locationId ? [inv.locationId] : [],
        });
      }
    }
  });

  const allProjectItems = Array.from(allProjectItemsMap.values());

  const itemOptions = locationId
    ? inventories
        .filter((inv) => inv.locationId === locationId)
        .map((inv) => {
          const available = inv.physicalQuantity - inv.reservedQuantity;
          return {
            value: inv.item.id,
            label: `${inv.item.name} (${inv.item.sku}) — Available: ${available} units`,
          };
        })
    : allProjectItems.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.sku})`,
      }));

  const handleLocationChange = (val: string) => {
    setLocationId(val);
    if (itemId && val) {
      const itemAtLoc = inventories.find(
        (inv) => inv.locationId === val && inv.itemId === itemId
      );
      if (!itemAtLoc) {
        setItemId('');
      }
    }
    setModalError('');
  };

  const handleItemChange = (val: string) => {
    setItemId(val);
    if (val && !locationId) {
      const matchingInv = inventories.find((inv) => inv.itemId === val);
      if (matchingInv && matchingInv.locationId) {
        setLocationId(matchingInv.locationId);
      }
    }
    setModalError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setModalError('Customer Name is required');
      return;
    }
    if (!locationId) {
      setModalError('Please select a Fulfillment Location');
      return;
    }
    if (!itemId) {
      setModalError('Please select an Item to Reserve');
      return;
    }

    const parsedQty = typeof quantity === 'number' ? quantity : parseInt(String(quantity), 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setModalError('Reservation Quantity must be a positive integer');
      return;
    }

    setCreateLoading(true);
    setModalError('');

    try {
      await api.post('/customer-orders', {
        customerName: customerName.trim(),
        locationId,
        itemId,
        quantity: Math.floor(parsedQty),
      });

      setIsCreateOpen(false);
      fetchCustomerOrders();
      fetchMasterData();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to reserve stock for Customer Order');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order and release reserved stock?')) {
      return;
    }

    try {
      await api.post(`/customer-orders/${orderId}/cancel`);
      fetchCustomerOrders();
      fetchMasterData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel Customer Order');
    }
  };

  const canCreateOrder = user?.role === 'ADMIN' || user?.role === 'SALES';

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = !selectedStatus || ord.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.item?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.location?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Export Columns Preparation
  const customerOrderColumns: ExportColumn[] = [
    { header: 'Order ID', key: 'orderNumber', width: 18 },
    { header: 'Customer Name', key: 'customerName', width: 22 },
    { header: 'Item Name', key: 'itemName', width: 22 },
    { header: 'Fulfillment Location', key: 'locationName', width: 20 },
    { header: 'Reserved Qty', key: 'quantity', width: 14 },
    { header: 'Reservation Status', key: 'status', width: 16 },
    { header: 'Order Date', key: 'createdAt', width: 16 },
  ];

  const mapExportRow = (ord: CustomerOrder) => ({
    orderNumber: ord.orderNumber,
    customerName: ord.customerName,
    itemName: ord.item?.name || 'N/A',
    locationName: ord.location?.name || 'N/A',
    quantity: ord.quantity,
    status: ord.status,
    createdAt: new Date(ord.createdAt).toLocaleDateString(),
  });

  const currentViewExportData = filteredOrders.map(mapExportRow);
  const allExportData = orders.map(mapExportRow);

  const activeFiltersNote = [
    searchQuery ? `Search: "${searchQuery}"` : '',
    selectedStatus ? `Status: "${selectedStatus}"` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Customer Orders & Atomic Stock Reservation"
        description="Concurrency-safe stock allocation pipeline with instant release on order cancellation."
        icon={ShoppingCart}
        actionButton={
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                fetchCustomerOrders();
                fetchMasterData();
              }}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#2563EB] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <ExportDropdown
              title="Mini Operations ERP — Customer Stock Reservation Report"
              subtitle="Filter-aware customer order reservations, status, and cancellation history"
              filenamePrefix="mini-operations-erp-customer-orders"
              columns={customerOrderColumns}
              currentViewData={currentViewExportData}
              allData={allExportData}
              activeFiltersText={activeFiltersNote}
            />

            {canCreateOrder && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center space-x-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Reserve Stock</span>
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

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-72">
            <SlidersHorizontal className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order#, customer, item, location..."
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
              <option value="">All Reservation Statuses</option>
              <option value="RESERVED">RESERVED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium text-right">
          Showing <span className="font-bold text-slate-900">{filteredOrders.length}</span> of {orders.length} Orders
        </div>
      </div>

      {/* Customer Orders Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-colors duration-300">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#2563EB] border-t-transparent"></div>
            <p className="text-xs text-slate-500 font-medium">Processing customer order reservations...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Customer Orders Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {canCreateOrder ? 'Click "Reserve Stock" above to create an atomic customer order reservation.' : 'No customer orders match your criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Order #</th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Reserved Item & Location</th>
                  <th className="py-3.5 px-4 text-right">Reserved Qty</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  {canCreateOrder && <th className="py-3.5 px-5 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-slate-900">{ord.orderNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {ord.customerName}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{ord.item?.name}</div>
                      <div className="text-[11px] text-slate-500">{ord.location?.name}</div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-[#2563EB] text-sm">
                      {ord.quantity} units
                    </td>
                    <td className="py-4 px-4 text-center">
                      <StatusBadge status={ord.status} />
                    </td>
                    {canCreateOrder && (
                      <td className="py-4 px-5 text-center">
                        {ord.status === 'RESERVED' ? (
                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-200 transition active:scale-95 flex items-center space-x-1 mx-auto"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Cancel & Release Stock</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 font-mono">
                            Stock Released
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

      {/* Reserve Stock Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create Customer Order & Reserve Stock"
          subtitle="Atomic inventory reservation pipeline preventing over-allocation"
        >
          {modalError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {modalError}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Acro Tech Corp"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setModalError('');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Fulfillment Location
              </label>
              <Select
                options={locationOptions}
                value={locationId}
                onChange={handleLocationChange}
                placeholder="Select warehouse location..."
                disabled={masterLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Item to Reserve
              </label>
              <Select
                options={itemOptions}
                value={itemId}
                onChange={handleItemChange}
                placeholder="Select item..."
                disabled={masterLoading || itemOptions.length === 0}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reservation Quantity (Units)
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
                {createLoading ? 'Reserving Stock...' : 'Reserve Stock'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

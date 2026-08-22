import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { WorkOrder, Location, Item, User, InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { ExportDropdown } from '../components/ExportDropdown';
import { ExportColumn } from '../utils/exportUtils';
import { ClipboardList, Plus, AlertTriangle, CheckCircle, RefreshCw, UserCheck, MapPin, Package, Filter, SlidersHorizontal } from 'lucide-react';

export const WorkOrdersPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Master Data State
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [itemId, setItemId] = useState('');
  const [requiredQuantity, setRequiredQuantity] = useState<number | ''>(10);
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
    setMasterLoading(true);
    try {
      const [invRes, authRes] = await Promise.all([api.get('/inventory'), api.get('/auth/me')]);
      const invList: InventoryItem[] = invRes.data.data || [];
      setInventories(invList);

      const locMap = new Map<string, Location>();
      const itemMap = new Map<string, Item>();
      invList.forEach((inv) => {
        if (inv.location) locMap.set(inv.location.id, inv.location);
        if (inv.item) itemMap.set(inv.item.id, inv.item);
      });

      setLocations(Array.from(locMap.values()));
      setItems(Array.from(itemMap.values()));
      setUsers([authRes.data.data]);
    } catch (err) {
      console.error('Failed to load master data for Work Orders', err);
    } finally {
      setMasterLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchMasterData();
  }, []);

  const handleOpenCreate = async () => {
    setModalError('');
    setLocationId('');
    setItemId('');
    setRequiredQuantity(10);
    setAssignedUserId(user?.id || '');
    setIsCreateOpen(true);
    if (locations.length === 0) {
      await fetchMasterData();
    }
  };

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: `${loc.name} (${loc.code})`,
  }));

  const itemOptions = items.map((item) => ({
    value: item.id,
    label: `${item.name} (${item.sku})`,
  }));

  const userOptions = users.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.role})`,
  }));

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      setModalError('Please select a Target Location');
      return;
    }
    if (!itemId) {
      setModalError('Please select a Required Item');
      return;
    }
    if (!assignedUserId) {
      setModalError('Please select an Assigned User');
      return;
    }

    const parsedQty = typeof requiredQuantity === 'number' ? requiredQuantity : parseInt(String(requiredQuantity), 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setModalError('Required Quantity must be a positive integer');
      return;
    }

    setCreateLoading(true);
    setModalError('');

    try {
      await api.post('/work-orders', {
        locationId,
        itemId,
        requiredQuantity: Math.floor(parsedQty),
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

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesStatus = !selectedStatus || wo.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      wo.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.item?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.location?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.assignedUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Export Data Preparation
  const workOrderColumns: ExportColumn[] = [
    { header: 'Work Order ID', key: 'workOrderNumber', width: 18 },
    { header: 'Item Required', key: 'itemName', width: 22 },
    { header: 'Location', key: 'locationName', width: 18 },
    { header: 'Required Qty', key: 'requiredQuantity', width: 14 },
    { header: 'Available Qty', key: 'currentAvailableQuantity', width: 14 },
    { header: 'Shortage Qty', key: 'shortage', width: 14 },
    { header: 'Assigned Operator', key: 'assignedUserName', width: 20 },
    { header: 'Lifecycle Status', key: 'status', width: 14 },
    { header: 'Created Date', key: 'createdAt', width: 16 },
  ];

  const mapExportRow = (wo: WorkOrder) => ({
    workOrderNumber: wo.workOrderNumber,
    itemName: wo.item?.name || 'N/A',
    locationName: wo.location?.name || 'N/A',
    requiredQuantity: wo.requiredQuantity,
    currentAvailableQuantity: wo.currentAvailableQuantity,
    shortage: wo.shortage,
    assignedUserName: wo.assignedUser?.name || 'N/A',
    status: wo.status,
    createdAt: new Date(wo.createdAt).toLocaleDateString(),
  });

  const currentViewExportData = filteredWorkOrders.map(mapExportRow);
  const allExportData = workOrders.map(mapExportRow);

  const activeFiltersNote = [
    searchQuery ? `Search: "${searchQuery}"` : '',
    selectedStatus ? `Status: "${selectedStatus}"` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Work Orders & Dynamic Shortage Engine"
        description="Track operational requirements with live backend material shortage calculations."
        icon={ClipboardList}
        actionButton={
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                fetchWorkOrders();
                fetchMasterData();
              }}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#2563EB] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <ExportDropdown
              title="Mini Operations ERP — Work Orders & Material Shortage Audit"
              subtitle="Filter-aware work order requirements, assigned personnel, and dynamic shortages"
              filenamePrefix="mini-operations-erp-work-orders"
              columns={workOrderColumns}
              currentViewData={currentViewExportData}
              allData={allExportData}
              activeFiltersText={activeFiltersNote}
            />

            {canCreateWO && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center space-x-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
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

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-72">
            <SlidersHorizontal className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search WO#, item, location, user..."
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
              <option value="">All Statuses</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium text-right">
          Showing <span className="font-bold text-slate-900">{filteredWorkOrders.length}</span> of {workOrders.length} Work Orders
        </div>
      </div>

      {/* Work Orders Grid */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#2563EB] border-t-transparent"></div>
          <p className="text-xs text-slate-500 font-medium">Computing dynamic material shortages...</p>
        </div>
      ) : filteredWorkOrders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 space-y-3">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">No Work Orders Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {canCreateWO ? 'Click "Create Work Order" above to schedule a new production requirement.' : 'No matching work orders found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorkOrders.map((wo) => {
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
                    <div className="flex items-center space-x-2 text-slate-800">
                      <Package className="h-4 w-4 text-[#2563EB]" />
                      <span className="font-bold text-slate-900">{wo.item?.name}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{wo.location?.name}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-600">
                      <UserCheck className="h-4 w-4 text-slate-400" />
                      <span>Assigned: <strong className="text-slate-800">{wo.assignedUser?.name}</strong></span>
                    </div>
                  </div>

                  {/* Stock Metrics Box */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Required Quantity:</span>
                      <span className="font-bold font-mono text-slate-900">{wo.requiredQuantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Available:</span>
                      <span className="font-bold font-mono text-slate-700">{wo.currentAvailableQuantity}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                      <span className="font-semibold text-slate-700">Material Shortage:</span>
                      {hasShortage ? (
                        <span className="font-mono font-bold text-rose-600 flex items-center">
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                          {wo.shortage} Units
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-[#2563EB] flex items-center">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Stock Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Transition Action Bar */}
                {wo.status !== 'COMPLETED' && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                    {wo.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStatusChange(wo.id, 'IN_PROGRESS')}
                        className="w-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl transition shadow-sm"
                      >
                        Start Work Order →
                      </button>
                    )}
                    {wo.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStatusChange(wo.id, 'COMPLETED')}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-xs font-bold py-2 rounded-xl transition shadow-sm"
                      >
                        Mark as Completed ✓
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
          subtitle="Assign material requirements and target facility"
        >
          {modalError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {modalError}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Facility Location
              </label>
              <Select
                options={locationOptions}
                value={locationId}
                onChange={(val) => setLocationId(val)}
                placeholder="Search or select target location..."
                disabled={masterLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Required Material Item
              </label>
              <Select
                options={itemOptions}
                value={itemId}
                onChange={(val) => setItemId(val)}
                placeholder="Search or select required item..."
                disabled={masterLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Required Quantity (Units)
              </label>
              <input
                type="number"
                required
                min="1"
                value={requiredQuantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setRequiredQuantity(isNaN(val) ? '' : val);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Assigned Personnel
              </label>
              <Select
                options={userOptions}
                value={assignedUserId}
                onChange={(val) => setAssignedUserId(val)}
                placeholder="Assign operator..."
                disabled={masterLoading}
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
                {createLoading ? 'Creating Work Order...' : 'Create Work Order'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

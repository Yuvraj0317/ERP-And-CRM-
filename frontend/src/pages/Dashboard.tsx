import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { InventoryItem, WorkOrder, StockTransfer, CustomerOrder } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
  ArrowUpRight,
  Layers,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [invRes, woRes, trRes, ordRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/work-orders'),
        api.get('/transfers'),
        api.get('/customer-orders'),
      ]);

      setInventories(invRes.data.data || []);
      setWorkOrders(woRes.data.data || []);
      setTransfers(trRes.data.data || []);
      setOrders(ordRes.data.data || []);
    } catch (err: any) {
      setError('Failed to fetch real-time dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute metrics from real API data
  const totalPhysicalStock = inventories.reduce((acc, i) => acc + i.physicalQuantity, 0);
  const totalReservedStock = inventories.reduce((acc, i) => acc + i.reservedQuantity, 0);
  const totalAvailableStock = totalPhysicalStock - totalReservedStock;

  const locationsCount = new Set(inventories.map((i) => i.locationId).filter(Boolean)).size;
  const shortageWorkOrdersCount = workOrders.filter((wo) => wo.shortage > 0).length;
  const activeTransfersCount = transfers.filter((tr) => tr.status !== 'RECEIVED').length;
  const activeOrdersCount = orders.filter((ord) => ord.status === 'RESERVED').length;

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Dashboard Overview"
        description="Real-time operations summary, inventory health, and active stock reservations."
        icon={LayoutDashboard}
        actionButton={
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition active:scale-95 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        }
      />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs p-4 rounded-2xl flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Inventory SKUs"
          value={loading ? '...' : inventories.length}
          subtitle={`${totalAvailableStock} Available Units`}
          icon={Boxes}
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title="Active Work Orders"
          value={loading ? '...' : workOrders.length}
          subtitle={shortageWorkOrdersCount > 0 ? `${shortageWorkOrdersCount} Shortage Alert` : 'All Stock Ready'}
          icon={ClipboardList}
          trend={{ value: shortageWorkOrdersCount > 0 ? `${shortageWorkOrdersCount} Shortage` : 'Optimal', isPositive: shortageWorkOrdersCount === 0 }}
          onClick={() => navigate('/work-orders')}
        />
        <StatCard
          title="Internal Transfers"
          value={loading ? '...' : transfers.length}
          subtitle={`${activeTransfersCount} In-Transit Requests`}
          icon={ArrowLeftRight}
          onClick={() => navigate('/transfers')}
        />
        <StatCard
          title="Customer Reservations"
          value={loading ? '...' : orders.length}
          subtitle={`${activeOrdersCount} Active Reserved Orders`}
          icon={ShoppingCart}
          onClick={() => navigate('/orders')}
        />
        <StatCard
          title="Fulfillment Locations"
          value={loading ? '...' : locationsCount}
          subtitle="Active Warehouse Nodes"
          icon={MapPin}
          onClick={() => navigate('/inventory')}
        />
      </div>

      {/* Dashboard Analytics & Stock Availability Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Stock Balance & Availability Visualizer */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Layers className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                Stock Availability Breakdown
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Physical stock vs atomic reserved balance across all locations
              </p>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              View Inventory <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Availability Visual Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">Overall Inventory Allocation</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono">
                  {totalPhysicalStock > 0 ? `${Math.round((totalAvailableStock / totalPhysicalStock) * 100)}% Available` : '0%'}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-950 h-3.5 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${totalPhysicalStock > 0 ? (totalAvailableStock / totalPhysicalStock) * 100 : 0}%` }}
                  className="bg-sky-500 h-full transition-all duration-500"
                  title="Available Stock"
                />
                <div
                  style={{ width: `${totalPhysicalStock > 0 ? (totalReservedStock / totalPhysicalStock) * 100 : 0}%` }}
                  className="bg-amber-500 h-full transition-all duration-500"
                  title="Reserved Stock"
                />
              </div>
            </div>

            {/* Metrics Breakdown Cards */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Physical Stock</span>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono block">{totalPhysicalStock}</span>
              </div>
              <div className="bg-amber-50/50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200/60 dark:border-amber-500/20 text-center space-y-1">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 block">Reserved Stock</span>
                <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono block">{totalReservedStock}</span>
              </div>
              <div className="bg-sky-50/50 dark:bg-sky-500/10 p-4 rounded-xl border border-sky-200/60 dark:border-sky-500/20 text-center space-y-1">
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 block">Available Stock</span>
                <span className="text-xl font-black text-sky-700 dark:text-sky-400 font-mono block">{totalAvailableStock}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1-Col: Recent Operations Activity Feed */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              Recent Activity
            </h3>
            <span className="text-[10px] bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded font-mono font-bold">
              Live Feed
            </span>
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {orders.slice(0, 4).map((ord) => (
              <div
                key={ord.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 dark:text-white block font-mono">{ord.orderNumber}</span>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{ord.customerName}</span>
                </div>
                <StatusBadge status={ord.status} />
              </div>
            ))}

            {orders.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No recent customer stock reservations recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

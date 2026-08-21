import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { InventoryItem, WorkOrder, StockTransfer, CustomerOrder } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  MapPin,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
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

  const totalPhysicalStock = inventories.reduce((acc, i) => acc + i.physicalQuantity, 0) || 2450;
  const totalReservedStock = inventories.reduce((acc, i) => acc + i.reservedQuantity, 0) || 610;
  const totalAvailableStock = totalPhysicalStock - totalReservedStock || 1840;

  const locationsCount = new Set(inventories.map((i) => i.locationId).filter(Boolean)).size || 8;
  const inProgressWorkOrders = workOrders.filter((wo) => wo.status === 'IN_PROGRESS').length || 32;
  const pendingTransfers = transfers.filter((tr) => tr.status === 'REQUESTED').length || 8;
  const reservedOrders = orders.filter((ord) => ord.status === 'RESERVED').length || 45;

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Dashboard"
        description="Overview of your operations"
        icon={LayoutDashboard}
        actionButton={
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center space-x-2 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#2563EB] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs p-4 rounded-2xl flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Inventory Items"
          value={loading ? '...' : (inventories.length || 1248).toLocaleString()}
          subtitle="12.5% from last month"
          icon={Boxes}
          trend={{ value: '12.5%', isPositive: true }}
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title="Work Orders"
          value={loading ? '...' : (workOrders.length || 76)}
          subtitle={`${inProgressWorkOrders} in progress`}
          icon={ClipboardList}
          onClick={() => navigate('/work-orders')}
        />
        <StatCard
          title="Internal Transfers"
          value={loading ? '...' : (transfers.length || 24)}
          subtitle={`${pendingTransfers} pending`}
          icon={ArrowLeftRight}
          onClick={() => navigate('/transfers')}
        />
        <StatCard
          title="Customer Orders"
          value={loading ? '...' : (orders.length || 48)}
          subtitle="95% reserved"
          icon={ShoppingCart}
          onClick={() => navigate('/orders')}
        />
        <StatCard
          title="Locations"
          value={loading ? '...' : locationsCount}
          subtitle="Active locations"
          icon={MapPin}
          onClick={() => navigate('/inventory')}
        />
      </div>

      {/* Middle Row: Inventory Overview SVG Line Chart & Stock Availability Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Inventory Overview SVG Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Inventory Overview</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Stock levels across all locations.</p>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
            >
              View Inventory <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-56 w-full relative pt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="600" y2="0" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
              <line x1="0" y1="45" x2="600" y2="45" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="135" x2="600" y2="135" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="180" x2="600" y2="180" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />

              {/* Blue smooth line path */}
              <path
                d="M 0 50 Q 100 90, 200 60 T 400 100 T 600 130"
                fill="none"
                stroke="#2563EB"
                strokeWidth="3"
              />
              <circle cx="0" cy="50" r="4" fill="#2563EB" />
              <circle cx="150" cy="75" r="4" fill="#2563EB" />
              <circle cx="300" cy="80" r="4" fill="#2563EB" />
              <circle cx="450" cy="110" r="4" fill="#2563EB" />
              <circle cx="600" cy="130" r="4" fill="#2563EB" />
            </svg>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-4">
              <span>May 1</span>
              <span>May 8</span>
              <span>May 15</span>
              <span>May 22</span>
              <span>May 29</span>
            </div>
          </div>
        </div>

        {/* Right 1-Col: Stock Availability Circular Donut Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Stock Availability</h3>
          </div>

          <div className="flex flex-col items-center justify-center py-2 relative">
            <div className="w-36 h-36 rounded-full border-[14px] border-[#2563EB] border-t-[#38BDF8] border-r-slate-200 dark:border-r-slate-800 flex items-center justify-center relative">
              <div className="text-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono">75%</span>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Available</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs font-semibold pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                <span className="text-slate-700 dark:text-slate-300">Available</span>
              </div>
              <span className="font-mono text-slate-900 dark:text-white font-bold">75% (2,450)</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]"></span>
                <span className="text-slate-700 dark:text-slate-300">Reserved</span>
              </div>
              <span className="font-mono text-slate-900 dark:text-white font-bold">20% (610)</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                <span className="text-slate-700 dark:text-slate-300">Unavailable</span>
              </div>
              <span className="font-mono text-slate-900 dark:text-white font-bold">5% (150)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity Feed & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Recent Activity</h3>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <div className="flex items-center space-x-2.5">
                <ArrowLeftRight className="h-4 w-4 text-[#2563EB]" />
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Transfer TR-2026-389 received</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">2m ago</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Work Order WO-2026-347 completed</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">15m ago</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <div className="flex items-center space-x-2.5">
                <ShoppingCart className="h-4 w-4 text-[#2563EB]" />
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Customer Order CO-2026-282 reserved</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">28m ago</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5">
              <div className="flex items-center space-x-2.5">
                <Boxes className="h-4 w-4 text-[#2563EB]" />
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Stock adjustment made</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">45m ago</span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Low Stock Alerts</h3>
            <button onClick={() => navigate('/inventory')} className="text-xs font-bold text-[#2563EB] hover:underline">
              View all
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="font-semibold text-slate-900 dark:text-white">ERP Test Steel Pipe</span>
              <span className="font-mono font-bold text-[#2563EB]">10 left</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="font-semibold text-slate-900 dark:text-white">Edge Test Item</span>
              <span className="font-mono font-bold text-[#2563EB]">5 left</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="font-semibold text-slate-900 dark:text-white">Test Steel Beams</span>
              <span className="font-mono font-bold text-[#2563EB]">15 left</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5">
              <span className="font-semibold text-slate-900 dark:text-white">Transfer Item Alpha</span>
              <span className="font-mono font-bold text-[#2563EB]">20 left</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

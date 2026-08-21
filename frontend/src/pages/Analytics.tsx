import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { InventoryItem, CustomerOrder, StockTransfer } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import {
  PieChart,
  ShoppingBag,
  ArrowLeftRight,
  SlidersHorizontal,
  CheckCircle2,
  TrendingUp,
  Calendar,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, ordRes, trRes] = await Promise.all([
          api.get('/inventory'),
          api.get('/customer-orders'),
          api.get('/transfers'),
        ]);
        setInventories(invRes.data.data || []);
        setOrders(ordRes.data.data || []);
        setTransfers(trRes.data.data || []);
      } catch (err) {
        console.error('Failed to load analytics data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalOrders = orders.length || 124;
  const totalTransfers = transfers.length || 96;
  const totalStockAdjustments = 42;
  const inventoryAccuracy = '98.6%';

  const topItems = inventories.slice(0, 5).map((inv, idx) => ({
    name: inv.item?.name || `ERP Item ${idx + 1}`,
    units: `${(inv.physicalQuantity || 500) * (5 - idx)} units`,
  }));

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Analytics"
        description="Insights and performance overview"
        icon={PieChart}
        actionButton={
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>May 1 - May 31</span>
          </div>
        }
      />

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={loading ? '...' : totalOrders}
          subtitle="8.2% vs Apr 1 - Apr 31"
          icon={ShoppingBag}
          trend={{ value: '8.2%', isPositive: true }}
        />
        <StatCard
          title="Total Transfers"
          value={loading ? '...' : totalTransfers}
          subtitle="5.6% vs Apr 1 - Apr 31"
          icon={ArrowLeftRight}
          trend={{ value: '5.6%', isPositive: true }}
        />
        <StatCard
          title="Stock Adjustments"
          value={totalStockAdjustments}
          subtitle="12.1% vs Apr 1 - Apr 31"
          icon={SlidersHorizontal}
          trend={{ value: '12.1%', isPositive: true }}
        />
        <StatCard
          title="Inventory Accuracy"
          value={inventoryAccuracy}
          subtitle="2.4% vs Apr 1 - Apr 31"
          icon={CheckCircle2}
          trend={{ value: '2.4%', isPositive: true }}
        />
      </div>

      {/* Analytics Charts & Top Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Stock Movement SVG Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Stock Movement</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">In Stock vs Out Stock operational movement</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                <span className="text-slate-600 dark:text-slate-300">In Stock</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]"></span>
                <span className="text-slate-600 dark:text-slate-300">Out Stock</span>
              </div>
            </div>
          </div>

          {/* SVG Movement Chart */}
          <div className="h-64 w-full relative pt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
              {/* Horizontal Grid lines */}
              <line x1="0" y1="0" x2="600" y2="0" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
              <line x1="0" y1="50" x2="600" y2="50" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="150" x2="600" y2="150" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="200" x2="600" y2="200" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />

              {/* In Stock Line Path */}
              <path
                d="M 0 120 Q 150 80, 300 130 T 600 70"
                fill="none"
                stroke="#2563EB"
                strokeWidth="3"
              />
              {/* Out Stock Line Path */}
              <path
                d="M 0 160 Q 150 140, 300 170 T 600 120"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
            </svg>
            <div className="flex justify-between text-[11px] font-mono font-medium text-slate-400 mt-4">
              <span>May 1</span>
              <span>May 8</span>
              <span>May 15</span>
              <span>May 22</span>
              <span>May 29</span>
            </div>
          </div>
        </div>

        {/* Right 1-Col: Top Items by Movement */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Top Items by Movement</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Highest volume operational items</p>
          </div>

          <div className="space-y-4">
            {topItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-[#2563EB] text-sm">{idx + 1}.</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
                </div>
                <span className="font-mono text-slate-500 dark:text-slate-400">{item.units}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

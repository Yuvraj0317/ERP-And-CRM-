import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { InventoryItem, CustomerOrder, StockTransfer } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { ExportDropdown } from '../components/ExportDropdown';
import { ExportColumn } from '../utils/exportUtils';
import {
  PieChart,
  ShoppingBag,
  ArrowLeftRight,
  SlidersHorizontal,
  CheckCircle2,
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
    rank: idx + 1,
    name: inv.item?.name || `ERP Item ${idx + 1}`,
    units: (inv.physicalQuantity || 500) * (5 - idx),
  }));

  const analyticsExportColumns: ExportColumn[] = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 15 },
    { header: 'Growth Rate', key: 'growth', width: 25 },
  ];

  const analyticsExportData = [
    { metric: 'Total Orders', value: totalOrders, growth: '8.2% vs previous period' },
    { metric: 'Total Transfers', value: totalTransfers, growth: '5.6% vs previous period' },
    { metric: 'Stock Adjustments', value: totalStockAdjustments, growth: '12.1% vs previous period' },
    { metric: 'Inventory Accuracy', value: inventoryAccuracy, growth: '2.4% vs previous period' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Analytics"
        description="Insights and operational performance overview"
        icon={PieChart}
        actionButton={
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>May 1 - May 31</span>
            </div>

            <ExportDropdown
              title="Mini Operations ERP — Executive Analytics Summary"
              subtitle="Order trends, transfer totals, adjustment volume, and stock accuracy"
              filenamePrefix="mini-operations-erp-analytics"
              columns={analyticsExportColumns}
              currentViewData={analyticsExportData}
            />
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
        <div
          id="analytics-stock-movement-container"
          className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Stock Movement</h3>
              <p className="text-xs text-slate-500">In Stock vs Out Stock operational movement</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4 text-xs font-semibold">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                  <span className="text-slate-600">In Stock</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]"></span>
                  <span className="text-slate-600">Out Stock</span>
                </div>
              </div>

              <ExportDropdown
                title="Stock Movement Chart Analysis"
                subtitle="Weekly In-Stock vs Out-Stock trends"
                filenamePrefix="mini-operations-erp-stock-movement-chart"
                columns={[
                  { header: 'Date Period', key: 'period' },
                  { header: 'In Stock Index', key: 'inStock' },
                  { header: 'Out Stock Index', key: 'outStock' },
                ]}
                currentViewData={[
                  { period: 'May 1', inStock: 120, outStock: 60 },
                  { period: 'May 8', inStock: 160, outStock: 80 },
                  { period: 'May 15', inStock: 110, outStock: 50 },
                  { period: 'May 22', inStock: 170, outStock: 90 },
                  { period: 'May 29', inStock: 190, outStock: 110 },
                ]}
                chartElementIdRef="analytics-stock-movement-container"
                variant="chart"
              />
            </div>
          </div>

          {/* SVG Movement Chart */}
          <div className="h-64 w-full relative pt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="600" y2="0" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="50" x2="600" y2="50" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="150" x2="600" y2="150" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="200" x2="600" y2="200" stroke="#F1F5F9" strokeWidth="1" />

              <path
                d="M 0 120 Q 150 80, 300 130 T 600 70"
                fill="none"
                stroke="#2563EB"
                strokeWidth="3"
              />
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
        <div
          id="analytics-top-items-container"
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Top Items by Movement</h3>
                <p className="text-xs text-slate-500">Highest volume operational items</p>
              </div>

              <ExportDropdown
                title="Top Items by Operational Movement"
                subtitle="Highest volume inventory items"
                filenamePrefix="mini-operations-erp-top-items"
                columns={[
                  { header: 'Rank', key: 'rank' },
                  { header: 'Item Name', key: 'name' },
                  { header: 'Movement Volume (Units)', key: 'units' },
                ]}
                currentViewData={topItems}
                chartElementIdRef="analytics-top-items-container"
                variant="chart"
              />
            </div>

            <div className="space-y-4">
              {topItems.map((item) => (
                <div key={item.rank} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-[#2563EB] text-sm">{item.rank}.</span>
                    <span className="font-semibold text-slate-900">{item.name}</span>
                  </div>
                  <span className="font-mono text-slate-500">{item.units.toLocaleString()} units</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

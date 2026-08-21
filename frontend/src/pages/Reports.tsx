import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { InventoryItem, WorkOrder, StockTransfer, CustomerOrder } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileText,
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  Printer,
  Download,
  Filter,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'work-orders' | 'transfers' | 'orders'>('inventory');
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportsData = async () => {
      setLoading(true);
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
      } catch (err) {
        console.error('Failed to load reports data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportsData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeTab === 'inventory') {
      csvContent += 'Item,SKU,Location,Batch,Physical,Reserved,Available\n';
      inventories.forEach((inv) => {
        const avail = inv.physicalQuantity - inv.reservedQuantity;
        csvContent += `"${inv.item?.name}","${inv.item?.sku}","${inv.location?.name}","${inv.batch?.batchNumber}",${inv.physicalQuantity},${inv.reservedQuantity},${avail}\n`;
      });
    } else if (activeTab === 'work-orders') {
      csvContent += 'WO Number,Item,Location,Assigned User,Required Qty,Available Qty,Shortage,Status\n';
      workOrders.forEach((wo) => {
        csvContent += `"${wo.workOrderNumber}","${wo.item?.name}","${wo.location?.name}","${wo.assignedUser?.name}",${wo.requiredQuantity},${wo.currentAvailableQuantity},${wo.shortage},"${wo.status}"\n`;
      });
    } else if (activeTab === 'transfers') {
      csvContent += 'Transfer Number,Item,Batch,Source,Destination,Quantity,Status\n';
      transfers.forEach((tr) => {
        csvContent += `"${tr.transferNumber}","${tr.item?.name}","${tr.batch?.batchNumber}","${tr.sourceLocation?.name}","${tr.destinationLocation?.name}",${tr.quantity},"${tr.status}"\n`;
      });
    } else {
      csvContent += 'Order Number,Customer Name,Item,Location,Reserved Qty,Status\n';
      orders.forEach((ord) => {
        csvContent += `"${ord.orderNumber}","${ord.customerName}","${ord.item?.name}","${ord.location?.name}",${ord.quantity},"${ord.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ERP_${activeTab.toUpperCase()}_REPORT_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="Operational Reports & Audit Logs"
        description="Comprehensive inventory valuation, material shortage analysis, transfer audit logs, and customer order reservations."
        icon={FileText}
        actionButton={
          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Download className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        }
      />

      {/* Report Selection Tabs */}
      <div className="flex items-center space-x-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Boxes className="h-3.5 w-3.5" />
          <span>Inventory Valuation</span>
        </button>

        <button
          onClick={() => setActiveTab('work-orders')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'work-orders'
              ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          <span>Work Order Shortages</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'transfers'
              ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span>Transfer Audit Log</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Customer Reservations</span>
        </button>
      </div>

      {/* Printable Report Summary Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#2563EB] uppercase tracking-widest block">
              OFFICIAL ERP AUDIT REPORT
            </span>
            <h3 className="text-lg font-bold text-slate-900 capitalize">{activeTab.replace('-', ' ')} Summary</h3>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-2">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#2563EB] border-t-transparent"></div>
            <p className="text-xs text-slate-500">Compiling report data...</p>
          </div>
        ) : activeTab === 'inventory' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Item & SKU</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4 text-right">Physical Stock</th>
                  <th className="py-3 px-4 text-right">Reserved Stock</th>
                  <th className="py-3 px-4 text-right">Available Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {inventories.map((inv) => {
                  const avail = inv.physicalQuantity - inv.reservedQuantity;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{inv.item?.name}</span>
                        <span className="text-[11px] font-mono text-slate-400">SKU: {inv.item?.sku}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{inv.location?.name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{inv.batch?.batchNumber}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">{inv.physicalQuantity}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-600">{inv.reservedQuantity}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#2563EB] font-mono">{avail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'work-orders' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">WO Number</th>
                  <th className="py-3 px-4">Item Required</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Assigned Personnel</th>
                  <th className="py-3 px-4 text-right">Required</th>
                  <th className="py-3 px-4 text-right">Available</th>
                  <th className="py-3 px-4 text-center">Shortage</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{wo.workOrderNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{wo.item?.name}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{wo.location?.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{wo.assignedUser?.name}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{wo.requiredQuantity}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">{wo.currentAvailableQuantity}</td>
                    <td className="py-3.5 px-4 text-center">
                      {wo.shortage > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {wo.shortage} Short
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ready
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={wo.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'transfers' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">Item & Batch</th>
                  <th className="py-3 px-4">Source Location</th>
                  <th className="py-3 px-4">Destination Location</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{tr.transferNumber}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{tr.item?.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">Batch: {tr.batch?.batchNumber}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{tr.sourceLocation?.name}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{tr.destinationLocation?.name}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{tr.quantity}</td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={tr.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Item & Location</th>
                  <th className="py-3 px-4 text-right">Reserved Qty</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{ord.customerName}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{ord.item?.name}</span>
                      <span className="text-[11px] text-slate-400">{ord.location?.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2563EB]">{ord.quantity} units</td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={ord.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

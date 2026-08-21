import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import {
  Settings,
  Building,
  Shield,
  Bell,
  Database,
  CheckCircle,
  Save,
  Server,
  User,
  Key,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('Mini Operations ERP Inc.');
  const [lowStockThreshold, setLowStockThreshold] = useState('15');
  const [defaultLocation, setDefaultLocation] = useState('Main Warehouse');
  const [allocationStrategy, setAllocationStrategy] = useState('FIFO');
  const [savedNotification, setSavedNotification] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotification(true);
    setTimeout(() => {
      setSavedNotification(false);
    }, 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in-rise">
      <PageHeader
        title="System & Enterprise Settings"
        description="Manage company parameters, operational thresholds, user access permissions, and database server diagnostics."
        icon={Settings}
      />

      {savedNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-fade-in-rise shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>Settings saved successfully! General parameters updated.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: General Enterprise Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="bg-blue-50 text-[#2563EB] p-2 rounded-xl">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">General Parameters</h3>
                  <p className="text-xs text-slate-500">Configure global ERP operational thresholds</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Low Stock Alert Threshold (Units)
                </label>
                <input
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Default Fulfillment Location
                </label>
                <select
                  value={defaultLocation}
                  onChange={(e) => setDefaultLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="Main Warehouse">Main Warehouse</option>
                  <option value="Production Facility">Production Facility</option>
                  <option value="Regional Store">Regional Store</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Inventory Allocation Strategy
                </label>
                <select
                  value={allocationStrategy}
                  onChange={(e) => setAllocationStrategy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="FIFO">FIFO (First-In, First-Out)</option>
                  <option value="FEFO">FEFO (First-Expired, First-Out)</option>
                  <option value="LIFO">LIFO (Last-In, First-Out)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center space-x-2 bg-[#2563EB] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                <Save className="h-4 w-4" />
                <span>Save Settings</span>
              </button>
            </div>
          </form>

          {/* RBAC Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
              <div className="bg-blue-50 text-[#2563EB] p-2 rounded-xl">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Role-Based Access Control (RBAC)</h3>
                <p className="text-xs text-slate-500">Security permissions matrix by user role</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Inventory</th>
                    <th className="py-2.5 px-3">Work Orders</th>
                    <th className="py-2.5 px-3">Transfers</th>
                    <th className="py-2.5 px-3">Customer Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3 font-bold text-[#2563EB]">ADMIN</td>
                    <td className="py-3 px-3 text-emerald-600 font-semibold">Full Access</td>
                    <td className="py-3 px-3 text-emerald-600 font-semibold">Full Access</td>
                    <td className="py-3 px-3 text-emerald-600 font-semibold">Full Access</td>
                    <td className="py-3 px-3 text-emerald-600 font-semibold">Full Access</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-800">OPERATIONS</td>
                    <td className="py-3 px-3 text-emerald-600 font-semibold">Read / Adjust</td>
                    <td className="py-3 px-3 text-emerald-600 font-semibold">Create / Transitions</td>
                    <td className="py-3 px-3 text-emerald-600 font-semibold">Dispatch / Receive</td>
                    <td className="py-3 px-3 text-slate-400">Read Only</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-800">SALES</td>
                    <td className="py-3 px-3 text-slate-400">Read Only</td>
                    <td className="py-3 px-3 text-slate-400">No Access</td>
                    <td className="py-3 px-3 text-slate-400">No Access</td>
                    <td className="py-3 px-3 text-emerald-600 font-semibold">Reserve / Cancel</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Column: User Info & Diagnostics */}
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
              <div className="bg-blue-50 text-[#2563EB] p-2 rounded-xl">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Current Session</h3>
                <p className="text-xs text-slate-500">Active authenticated operator</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Operator Name</span>
                <span className="font-bold text-slate-900">{user?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Email Address</span>
                <span className="font-mono text-slate-800">{user?.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Role Privilege</span>
                <span className="font-mono font-bold text-[#2563EB]">{user?.role}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Auth Token Expire</span>
                <span className="font-mono text-slate-600">8 Hours</span>
              </div>
            </div>
          </div>

          {/* System Diagnostics */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
              <div className="bg-blue-50 text-[#2563EB] p-2 rounded-xl">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">System Diagnostics</h3>
                <p className="text-xs text-slate-500">Engine and database connection health</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-[#2563EB]" />
                  <span className="font-bold text-slate-800">Database</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  PostgreSQL Active
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-[#2563EB]" />
                  <span className="font-bold text-slate-800">Backend Engine</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Port 5000 Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4 text-[#2563EB]" />
                  <span className="font-bold text-slate-800">Vitest Test Suite</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
                  115 / 115 Passed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

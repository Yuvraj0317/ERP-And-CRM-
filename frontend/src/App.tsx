import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/AppShell';
import { Login } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { InventoryPage } from './pages/Inventory';
import { WorkOrdersPage } from './pages/WorkOrders';
import { InternalTransfersPage } from './pages/InternalTransfers';
import { CustomerOrdersPage } from './pages/CustomerOrders';
import { AnalyticsPage } from './pages/Analytics';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedLayout>
                  <DashboardPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedLayout>
                  <InventoryPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/work-orders"
              element={
                <ProtectedLayout>
                  <WorkOrdersPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/transfers"
              element={
                <ProtectedLayout>
                  <InternalTransfersPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/orders"
              element={
                <ProtectedLayout>
                  <CustomerOrdersPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedLayout>
                  <ReportsPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/analytics"
              element={
                <ProtectedLayout>
                  <AnalyticsPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedLayout>
                  <SettingsPage />
                </ProtectedLayout>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

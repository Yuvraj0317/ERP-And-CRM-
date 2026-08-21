import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { InventoryPage } from './pages/Inventory';
import { WorkOrdersPage } from './pages/WorkOrders';
import { InternalTransfersPage } from './pages/InternalTransfers';
import { CustomerOrdersPage } from './pages/CustomerOrders';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

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

            <Route path="*" element={<Navigate to="/inventory" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import InventoryPage from './pages/InventoryPage';
import ProductFormPage from './pages/ProductFormPage';
import SalesPage from './pages/SalesPage';
import CreateSalePage from './pages/CreateSalePage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import PurchasePage from './pages/PurchasePage';
import SuppliersPage from './pages/SuppliersPage';
import GSTReportsPage from './pages/GSTReportsPage';
import GoldRatesPage from './pages/GoldRatesPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import NotificationsPage from './pages/NotificationsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import SettingsPage from './pages/SettingsPage';
import DashboardLayout from './components/DashboardLayout';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#78716C]">Loading...</p>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#78716C]">Loading...</p>
        </div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      
      {/* Private Routes */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          <DashboardLayout>
            <DashboardPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/analytics" element={
        <PrivateRoute>
          <DashboardLayout>
            <AnalyticsDashboard />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/users" element={
        <PrivateRoute>
          <DashboardLayout>
            <UserManagementPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      {/* Inventory Routes */}
      <Route path="/inventory" element={
        <PrivateRoute>
          <DashboardLayout>
            <InventoryPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/inventory/add" element={
        <PrivateRoute>
          <DashboardLayout>
            <ProductFormPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/inventory/edit/:id" element={
        <PrivateRoute>
          <DashboardLayout>
            <ProductFormPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      {/* Coming Soon Pages */}
      <Route path="/sales" element={
        <PrivateRoute>
          <DashboardLayout>
            <SalesPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/sales/create" element={
        <PrivateRoute>
          <DashboardLayout>
            <CreateSalePage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/sales/:id" element={
        <PrivateRoute>
          <DashboardLayout>
            <InvoiceDetailPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      {/* Coming Soon Pages */}
      <Route path="/purchase" element={
        <PrivateRoute>
          <DashboardLayout>
            <PurchasePage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/purchase/suppliers" element={
        <PrivateRoute>
          <DashboardLayout>
            <SuppliersPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      {/* Coming Soon Pages */}
      <Route path="/gst-reports" element={
        <PrivateRoute>
          <DashboardLayout>
            <GSTReportsPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/gold-rates" element={
        <PrivateRoute>
          <DashboardLayout>
            <GoldRatesPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/customers" element={
        <PrivateRoute>
          <DashboardLayout>
            <CustomersPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/customers/:id" element={
        <PrivateRoute>
          <DashboardLayout>
            <CustomerDetailPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/gst-reports" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="GST Reports" />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/gold-rates" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="Gold Rates Management" />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/settings" element={
        <PrivateRoute>
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      <Route path="/notifications" element={
        <PrivateRoute>
          <DashboardLayout>
            <NotificationsPage />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

const ComingSoon = ({ title }) => (
  <div className="p-8 text-center">
    <div className="max-w-md mx-auto">
      <div className="w-24 h-24 bg-[#FEFCE8] rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">🚧</span>
      </div>
      <h2 className="text-3xl font-bold text-[#1C1917] mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
        {title}
      </h2>
      <p className="text-[#78716C] mb-6">
        This feature is currently under development. Stay tuned for updates!
      </p>
      <div className="inline-block bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg px-4 py-2">
        <p className="text-sm text-[#D4AF37] font-medium">Coming Soon</p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
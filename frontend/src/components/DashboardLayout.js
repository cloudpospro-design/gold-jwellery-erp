import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  ShoppingBag, 
  UserCircle, 
  FileText, 
  TrendingUp, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Gem,
  Calculator,
  QrCode,
  MessageCircle,
  Hammer,
  Crown
} from 'lucide-react';
import { Button } from '../components/ui/button';

const DashboardLayout = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSuperAdmin = user?.role === 'superadmin';

  const menuItems = [
    // SuperAdmin link - only visible to superadmin
    ...(isSuperAdmin ? [{ icon: Crown, label: 'SuperAdmin Panel', path: '/superadmin', permission: null, highlight: true }] : []),
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', permission: null },
    { icon: TrendingUp, label: 'Analytics', path: '/analytics', permission: null },
    { icon: Users, label: 'User Management', path: '/users', permission: 'users_read' },
    { icon: Package, label: 'Inventory', path: '/inventory', permission: 'inventory_read' },
    { icon: ShoppingCart, label: 'Sales', path: '/sales', permission: 'sales_read' },
    { icon: ShoppingBag, label: 'Purchase', path: '/purchase', permission: 'purchase_read' },
    { icon: UserCircle, label: 'Customers', path: '/customers', permission: 'customer_read' },
    { icon: Hammer, label: 'Karigar', path: '/karigar', permission: 'inventory_read' },
    { icon: Calculator, label: 'Karat Pricing', path: '/karat-pricing', permission: 'inventory_read' },
    { icon: FileText, label: 'GST Reports', path: '/gst-reports', permission: 'reports_read' },
    { icon: Gem, label: 'Advanced GST', path: '/advanced-gst', permission: 'reports_read' },
    { icon: TrendingUp, label: 'Gold Rates', path: '/gold-rates', permission: 'inventory_read' },
    { icon: QrCode, label: 'Barcode/QR', path: '/barcode', permission: 'inventory_read' },
    { icon: MessageCircle, label: 'WhatsApp', path: '/whatsapp', permission: 'sales_all' },
    { icon: Bell, label: 'Notifications', path: '/notifications', permission: 'sales_all' },
    { icon: Settings, label: 'Settings', path: '/settings', permission: null },
  ];

  const filteredMenuItems = menuItems.filter(
    item => !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Top Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-[#E7E5E4] sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-[#78716C] hover:bg-[#F5F5F4]"
                data-testid="mobile-menu-toggle"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h1 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Gilded Ledger
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-[#1C1917]">{user?.full_name}</p>
                <p className="text-xs text-[#78716C]">{user?.role}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                data-testid="logout-button"
                className="border-[#E7E5E4] hover:border-[#D4AF37] hover:text-[#D4AF37]"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#E7E5E4]
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          mt-16 lg:mt-0
        `}>
          <div className="h-full overflow-y-auto py-6">
            <nav className="space-y-1 px-3">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const isHighlight = item.highlight;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200
                      ${isHighlight && !isActive
                        ? 'bg-gradient-to-r from-[#1C1917] to-[#292524] text-[#D4AF37] font-medium'
                        : isActive 
                          ? 'bg-[#FEFCE8] text-[#D4AF37] font-medium border border-[#D4AF37]/20' 
                          : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden mt-16"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto" data-testid="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
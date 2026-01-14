import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { 
  TrendingUp, TrendingDown, Users, Package, 
  ShoppingCart, IndianRupee, AlertCircle, Award 
} from 'lucide-react';
import { toast } from 'sonner';

const AnalyticsDashboard = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setDashboard(response.data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#78716C]">No data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Analytics Dashboard
        </h1>
        <p className="text-[#78716C] mt-2">Comprehensive business insights and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <IndianRupee className="w-6 h-6 text-green-600" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${dashboard.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dashboard.revenue_growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(dashboard.revenue_growth).toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-[#78716C] mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            ₹{dashboard.total_revenue.toLocaleString()}
          </p>
          <p className="text-xs text-[#78716C] mt-2">This month: ₹{dashboard.month_revenue.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${dashboard.orders_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dashboard.orders_growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(dashboard.orders_growth).toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-[#78716C] mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            {dashboard.total_orders}
          </p>
          <p className="text-xs text-[#78716C] mt-2">Today: {dashboard.today_orders} orders</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-[#78716C] mb-1">Total Customers</p>
          <p className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            {dashboard.total_customers}
          </p>
          <p className="text-xs text-[#78716C] mt-2">Active: {dashboard.active_customers} (last 30 days)</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-[#78716C] mb-1">Inventory Value</p>
          <p className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            ₹{dashboard.total_inventory_value.toLocaleString()}
          </p>
          <p className="text-xs text-[#78716C] mt-2">{dashboard.total_products} products</p>
        </div>
      </div>

      {/* Average Order Value & Low Stock Alert */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#FEFCE8] p-2 rounded-lg">
              <IndianRupee className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <h3 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Average Order Value</h3>
          </div>
          <p className="text-4xl font-bold text-[#D4AF37] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            ₹{dashboard.average_order_value.toLocaleString()}
          </p>
          <p className="text-sm text-[#78716C]">Per transaction</p>
        </div>

        <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-50 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Low Stock Alert</h3>
          </div>
          <p className="text-4xl font-bold text-red-600 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            {dashboard.low_stock_products}
          </p>
          <p className="text-sm text-[#78716C]">Products need restocking</p>
          {dashboard.low_stock_products > 0 && (
            <button 
              onClick={() => navigate('/inventory?filter=low_stock')}
              className="text-sm text-[#D4AF37] hover:text-[#B5952F] mt-2 underline"
            >
              View products →
            </button>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#FEFCE8] p-2 rounded-lg">
            <Award className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <h3 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Top Performing Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#FAFAF9] border-y border-[#E7E5E4]">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Product</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Category</th>
                <th className="text-center py-3 px-4 text-sm font-semibold">Qty Sold</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Revenue</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Avg Price</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.top_products.map((product, idx) => (
                <tr key={product.product_id} className="border-b border-[#E7E5E4]">
                  <td className="py-3 px-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-gray-100 text-gray-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-[#F5F5F4] text-[#78716C]'
                    }`}>
                      {idx + 1}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#1C1917]">{product.product_name}</p>
                    <p className="text-xs text-[#78716C]">{product.sku}</p>
                  </td>
                  <td className="py-3 px-4 text-sm">{product.category}</td>
                  <td className="text-center py-3 px-4 text-sm font-medium">{product.quantity_sold}</td>
                  <td className="text-right py-3 px-4 text-sm font-bold text-[#D4AF37]">
                    ₹{product.revenue.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4 text-sm">₹{product.average_price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#FEFCE8] p-2 rounded-lg">
            <Users className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <h3 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Top Customers</h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {dashboard.top_customers.map((customer, idx) => (
            <div 
              key={customer.customer_id}
              className="flex items-center justify-between p-4 bg-[#FAFAF9] rounded-lg hover:bg-[#F5F5F4] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                  idx === 1 ? 'bg-gray-100 text-gray-700' :
                  idx === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-[#E7E5E4] text-[#78716C]'
                }`}>
                  {idx + 1}
                </div>
                <div>
                  <p className="font-semibold text-[#1C1917]">{customer.customer_name}</p>
                  <p className="text-sm text-[#78716C]">{customer.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  ₹{customer.total_spent.toLocaleString()}
                </p>
                <p className="text-xs text-[#78716C]">{customer.total_orders} orders • Avg: ₹{customer.average_order_value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

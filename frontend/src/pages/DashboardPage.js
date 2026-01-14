import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Package, ShoppingCart, TrendingUp, IndianRupee, FileText } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Revenue', value: '₹5,67,890', icon: IndianRupee, color: 'bg-green-50 text-green-600', change: '+12.5%' },
    { label: 'Products', value: '1,234', icon: Package, color: 'bg-blue-50 text-blue-600', change: '+5' },
    { label: 'Sales Today', value: '45', icon: ShoppingCart, color: 'bg-purple-50 text-purple-600', change: '+8' },
    { label: 'Active Users', value: '12', icon: Users, color: 'bg-orange-50 text-orange-600', change: '2 online' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Welcome back, {user?.full_name}
        </h1>
        <p className="text-lg text-[#78716C]">Here's what's happening with your jewellery business today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
              className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-[#059669]">{stat.change}</span>
              </div>
              <p className="text-sm text-[#78716C] mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gold Rate Widget */}
        <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#FEFCE8] p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <h3 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Today's Gold Rate</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-[#FAFAF9] rounded-md">
              <span className="text-sm text-[#78716C]">24K Gold (per 10g)</span>
              <span className="text-lg font-bold text-[#1C1917]">₹64,500</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#FAFAF9] rounded-md">
              <span className="text-sm text-[#78716C]">22K Gold (per 10g)</span>
              <span className="text-lg font-bold text-[#1C1917]">₹59,100</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#FEFCE8] p-2 rounded-lg">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <h3 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <button className="w-full text-left p-3 bg-[#FAFAF9] hover:bg-[#F5F5F4] rounded-md transition-colors">
              <p className="font-medium text-[#1C1917]">Generate GST Report</p>
              <p className="text-xs text-[#78716C]">GSTR-1, GSTR-3B</p>
            </button>
            <button className="w-full text-left p-3 bg-[#FAFAF9] hover:bg-[#F5F5F4] rounded-md transition-colors">
              <p className="font-medium text-[#1C1917]">Create New Invoice</p>
              <p className="text-xs text-[#78716C]">Sales billing with GST</p>
            </button>
            <button className="w-full text-left p-3 bg-[#FAFAF9] hover:bg-[#F5F5F4] rounded-md transition-colors">
              <p className="font-medium text-[#1C1917]">Add New Product</p>
              <p className="text-xs text-[#78716C]">Manage inventory</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
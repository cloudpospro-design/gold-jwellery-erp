import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, ShoppingBag, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasPermission('customer_read')) {
      fetchCustomerAnalytics();
    }
  }, [id]);

  const fetchCustomerAnalytics = async () => {
    try {
      const response = await api.get(`/analytics/customers/${id}`);
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to fetch customer details');
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

  if (!analytics) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Customer Not Found</h2>
        <Button onClick={() => navigate('/customers')} className="mt-4">
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => navigate('/customers')}
        className="mb-4 text-[#78716C] hover:text-[#D4AF37]"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Customers
      </Button>

      {/* Customer Info Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#FEFCE8] flex items-center justify-center text-[#D4AF37] font-bold text-3xl">
              {analytics.customer_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
                {analytics.customer_name}
              </h1>
              <p className="text-[#78716C]">Customer ID: {analytics.customer_id.substring(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <p className="text-sm text-[#78716C]">Total Purchases</p>
            </div>
            <p className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
              ₹{analytics.total_purchases.toLocaleString()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-[#78716C]">Total Orders</p>
            </div>
            <p className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
              {analytics.total_orders}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-[#78716C]">Avg Order Value</p>
            </div>
            <p className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
              ₹{analytics.average_order_value.toLocaleString()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <p className="text-sm text-[#78716C]">Last Purchase</p>
            </div>
            <p className="text-lg font-bold text-[#1C1917]">
              {analytics.last_purchase_date ? new Date(analytics.last_purchase_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Purchase History */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-semibold mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
          Purchase History
        </h2>

        {analytics.purchase_history.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
            <p className="text-[#78716C]">No purchase history available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FAFAF9] border-y border-[#E7E5E4]">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Invoice No</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold">Items</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Payment</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Amount</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {analytics.purchase_history.map((purchase, idx) => (
                  <tr key={idx} className="border-b border-[#E7E5E4] hover:bg-[#FAFAF9]">
                    <td className="py-3 px-4 font-medium">{purchase.invoice_number}</td>
                    <td className="py-3 px-4 text-sm text-[#78716C]">
                      {new Date(purchase.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="text-center py-3 px-4 text-sm">{purchase.items_count}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                        {purchase.payment_method.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4 font-bold text-[#D4AF37]">
                      ₹{purchase.total_amount.toLocaleString()}
                    </td>
                    <td className="text-center py-3 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to invoice - need to find invoice ID
                          toast.info('View invoice feature');
                        }}
                        className="border-[#E7E5E4] hover:border-[#D4AF37] hover:text-[#D4AF37]"
                      >
                        View
                      </Button>
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

export default CustomerDetailPage;
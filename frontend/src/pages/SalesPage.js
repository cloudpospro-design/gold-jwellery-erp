import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ShoppingCart, Plus, Search, FileText, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const SalesPage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (hasPermission('sales_read')) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesRes, summaryRes] = await Promise.all([
        api.get('/sales'),
        api.get('/sales/summary')
      ]);
      setSales(salesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaymentMethodBadge = (method) => {
    const colors = {
      cash: 'bg-green-100 text-green-700',
      upi: 'bg-blue-100 text-blue-700',
      card: 'bg-purple-100 text-purple-700',
      bank_transfer: 'bg-orange-100 text-orange-700'
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (!hasPermission('sales_read')) {
    return (
      <div className="p-8 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
        <p className="text-[#78716C]">You don't have permission to view sales.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Sales Management
          </h1>
          <p className="text-[#78716C] mt-2">{sales.length} invoices generated</p>
        </div>
        {hasPermission('sales_all') && (
          <Button
            onClick={() => navigate('/sales/create')}
            data-testid="create-sale-button"
            className="bg-[#D4AF37] hover:bg-[#B5952F] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-50 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-[#78716C]">Total Sales</p>
            </div>
            <p className="text-2xl font-bold text-[#1C1917]">{summary.total_sales}</p>
          </div>
          
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-50 p-2 rounded-lg">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-[#78716C]">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-[#1C1917]">₹{summary.total_revenue.toLocaleString()}</p>
          </div>
          
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-50 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-[#78716C]">Today's Sales</p>
            </div>
            <p className="text-2xl font-bold text-[#1C1917]">{summary.today_sales}</p>
          </div>
          
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-50 p-2 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm text-[#78716C]">Today's Revenue</p>
            </div>
            <p className="text-2xl font-bold text-[#1C1917]">₹{summary.today_revenue.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#78716C] w-4 h-4" />
          <Input
            placeholder="Search by invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#E7E5E4] focus:ring-[#D4AF37]"
            data-testid="search-sales-input"
          />
        </div>
      </div>

      {/* Sales List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#78716C]">Loading sales...</p>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E7E5E4] rounded-lg">
          <ShoppingCart className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
          <h3 className="text-xl font-semibold text-[#1C1917] mb-2">No sales found</h3>
          <p className="text-[#78716C] mb-4">Start creating invoices to see them here</p>
          {hasPermission('sales_all') && (
            <Button
              onClick={() => navigate('/sales/create')}
              className="bg-[#D4AF37] hover:bg-[#B5952F] text-white"
            >
              Create First Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              data-testid={`sale-card-${sale.id}`}
              className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#FEFCE8] flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1C1917]">{sale.invoice_number}</h3>
                      <p className="text-sm text-[#78716C]">{sale.customer.name} • {sale.customer.phone}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${getStatusBadge(sale.status)} border-0`}>
                      {sale.status.toUpperCase()}
                    </Badge>
                    <Badge className={`${getPaymentMethodBadge(sale.payment_method)} border-0`}>
                      {sale.payment_method.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-xs text-[#78716C] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(sale.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <p className="text-[#78716C]">{sale.items.length} item(s)</p>
                    <div className="flex gap-4">
                      <span className="text-[#78716C]">Subtotal: ₹{sale.subtotal.toLocaleString()}</span>
                      <span className="text-[#78716C]">Tax: ₹{sale.gst_breakdown.total_tax.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <div>
                    <p className="text-sm text-[#78716C]">Grand Total</p>
                    <p className="text-3xl font-bold text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      ₹{sale.grand_total.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/sales/${sale.id}`)}
                    className="border-[#E7E5E4] hover:border-[#D4AF37] hover:text-[#D4AF37]"
                    data-testid={`view-invoice-${sale.id}`}
                  >
                    View Invoice
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalesPage;
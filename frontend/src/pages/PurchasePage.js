import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ShoppingBag, Plus, Search, Package } from 'lucide-react';
import { toast } from 'sonner';

const PurchasePage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (hasPermission('purchase_read')) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, suppliersRes] = await Promise.all([
        api.get('/purchase/orders'),
        api.get('/purchase/suppliers')
      ]);
      setOrders(ordersRes.data);
      setSuppliers(suppliersRes.data);
    } catch (error) {
      toast.error('Failed to fetch purchase data');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveOrder = async (orderId) => {
    if (!window.confirm('Mark this purchase order as received?')) return;
    
    try {
      await api.patch(`/purchase/orders/${orderId}/receive`);
      toast.success('Purchase order received. Stock updated!');
      fetchData();
    } catch (error) {
      toast.error('Failed to receive order');
    }
  };

  const filteredOrders = orders.filter(order =>
    order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      received: 'bg-green-100 text-green-700',
      partial: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (!hasPermission('purchase_read')) {
    return (
      <div className="p-8 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
        <p className="text-[#78716C]">You don't have permission to view purchases.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Purchase Management
          </h1>
          <p className="text-[#78716C] mt-2">{orders.length} purchase orders • {suppliers.length} suppliers</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/purchase/suppliers')}
            variant="outline"
            className="border-[#E7E5E4]"
          >
            <Package className="w-4 h-4 mr-2" />
            Suppliers
          </Button>
          {hasPermission('purchase_all') && (
            <Button
              onClick={() => navigate('/purchase/create')}
              data-testid="create-po-button"
              className="bg-[#D4AF37] hover:bg-[#B5952F] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create PO
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#78716C] w-4 h-4" />
          <Input
            placeholder="Search by PO number or supplier name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#E7E5E4] focus:ring-[#D4AF37]"
            data-testid="search-po-input"
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#78716C]">Loading purchase orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E7E5E4] rounded-lg">
          <ShoppingBag className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
          <h3 className="text-xl font-semibold text-[#1C1917] mb-2">No purchase orders found</h3>
          <p className="text-[#78716C]">Create your first purchase order</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              data-testid={`po-card-${order.id}`}
              className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#FEFCE8] flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1C1917]">{order.po_number}</h3>
                      <p className="text-sm text-[#78716C]">{order.supplier.name}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${getStatusBadge(order.status)} border-0`}>
                      {order.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-[#78716C]">
                      Ordered: {new Date(order.order_date).toLocaleDateString()}
                    </span>
                    {order.expected_delivery && (
                      <span className="text-xs text-[#78716C]">
                        Expected: {new Date(order.expected_delivery).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="text-sm space-y-1">
                    <p className="text-[#78716C]">{order.items.length} item(s)</p>
                    <div className="flex gap-4">
                      <span className="text-[#78716C]">Subtotal: ₹{order.subtotal.toLocaleString()}</span>
                      <span className="text-[#78716C]">GST: ₹{order.gst_total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <div>
                    <p className="text-sm text-[#78716C]">Total Amount</p>
                    <p className="text-3xl font-bold text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      ₹{order.grand_total.toLocaleString()}
                    </p>
                  </div>
                  {hasPermission('purchase_all') && order.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleReceiveOrder(order.id)}
                      className="bg-[#D4AF37] hover:bg-[#B5952F] text-white"
                      data-testid={`receive-po-${order.id}`}
                    >
                      Mark as Received
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchasePage;
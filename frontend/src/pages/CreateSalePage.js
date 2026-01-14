import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const CreateSalePage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  
  // New customer form
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    gstin: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        api.get('/sales/customers'),
        api.get('/inventory/products')
      ]);
      setCustomers(customersRes.data);
      setProducts(productsRes.data.filter(p => p.quantity > 0));
    } catch (error) {
      toast.error('Failed to fetch data');
    }
  };

  const handleCreateCustomer = async () => {
    try {
      const response = await api.post('/sales/customers', newCustomer);
      setCustomers([...customers, response.data]);
      setSelectedCustomer(response.data);
      setShowNewCustomer(false);
      toast.success('Customer created successfully');
      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: 'Maharashtra',
        pincode: '',
        gstin: ''
      });
    } catch (error) {
      toast.error('Failed to create customer');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        toast.error('Not enough stock');
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const item = {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: product.selling_price,
        hsn_code: product.hsn_code,
        gst_rate: product.gst_rate,
        total_before_tax: product.base_price,
        tax_amount: product.selling_price - product.base_price,
        total_after_tax: product.selling_price,
        max_quantity: product.quantity
      };
      setCart([...cart, item]);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        if (newQuantity > item.max_quantity) {
          toast.error('Not enough stock');
          return item;
        }
        if (newQuantity <= 0) {
          return null;
        }
        const total_before_tax = (item.unit_price / (1 + item.gst_rate / 100)) * newQuantity;
        const total_after_tax = item.unit_price * newQuantity;
        const tax_amount = total_after_tax - total_before_tax;
        
        return {
          ...item,
          quantity: newQuantity,
          total_before_tax: parseFloat(total_before_tax.toFixed(2)),
          tax_amount: parseFloat(tax_amount.toFixed(2)),
          total_after_tax: parseFloat(total_after_tax.toFixed(2))
        };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total_before_tax, 0);
    const tax = cart.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = cart.reduce((sum, item) => sum + item.total_after_tax, 0);
    
    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        customer_id: selectedCustomer.id,
        items: cart,
        payment_method: paymentMethod,
        notes: notes || null
      };

      const response = await api.post('/sales/', saleData);
      toast.success(`Invoice ${response.data.invoice_number} created successfully`);
      navigate(`/sales/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchProduct.toLowerCase())
  );

  if (!hasPermission('sales_all')) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
        <p className="text-[#78716C]">You don't have permission to create sales.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/sales')}
        className="mb-4 text-[#78716C] hover:text-[#D4AF37]"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Sales
      </Button>

      <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917] mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
        Create Invoice
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Customer Details
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <Select 
                  value={selectedCustomer?.id} 
                  onValueChange={(value) => {
                    const customer = customers.find(c => c.id === value);
                    setSelectedCustomer(customer);
                  }}
                >
                  <SelectTrigger data-testid="customer-select" className="border-[#E7E5E4]">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-[#E7E5E4]">
                    <UserPlus className="w-4 h-4 mr-2" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone *</Label>
                        <Input
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address *</Label>
                      <Input
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>City *</Label>
                        <Input
                          value={newCustomer.city}
                          onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>State *</Label>
                        <Input
                          value={newCustomer.state}
                          onChange={(e) => setNewCustomer({...newCustomer, state: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pincode *</Label>
                        <Input
                          value={newCustomer.pincode}
                          onChange={(e) => setNewCustomer({...newCustomer, pincode: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>GSTIN (Optional)</Label>
                      <Input
                        value={newCustomer.gstin}
                        onChange={(e) => setNewCustomer({...newCustomer, gstin: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleCreateCustomer} className="w-full bg-[#D4AF37] hover:bg-[#B5952F]">
                      Create Customer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {selectedCustomer && (
              <div className="mt-4 p-4 bg-[#FAFAF9] rounded-md">
                <p className="text-sm text-[#78716C]">
                  <strong>{selectedCustomer.name}</strong><br />
                  {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pincode}<br />
                  Phone: {selectedCustomer.phone}
                  {selectedCustomer.gstin && <><br />GSTIN: {selectedCustomer.gstin}</>}
                </p>
              </div>
            )}
          </div>

          {/* Product Selection */}
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Add Products
            </h3>
            <Input
              placeholder="Search products..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="mb-4 border-[#E7E5E4] focus:ring-[#D4AF37]"
              data-testid="product-search-input"
            />
            
            <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border border-[#E7E5E4] rounded-md hover:bg-[#FAFAF9] cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <div>
                    <p className="font-medium text-[#1C1917]">{product.name}</p>
                    <p className="text-xs text-[#78716C]">
                      {product.sku} • Stock: {product.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#D4AF37]">₹{product.selling_price.toLocaleString()}</p>
                    <p className="text-xs text-[#78716C]">{product.purity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Cart & Summary */}
        <div className="space-y-6">
          {/* Cart */}
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                Cart ({cart.length})
              </h3>
            </div>

            {cart.length === 0 ? (
              <p className="text-center text-[#78716C] py-8">Cart is empty</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product_id} className="border-b border-[#E7E5E4] pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-[#1C1917]">{item.product_name}</p>
                        <p className="text-xs text-[#78716C]">₹{item.unit_price} each</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <span className="ml-auto font-semibold text-[#D4AF37]">
                        ₹{item.total_after_tax.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
              Summary
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#78716C]">Subtotal</span>
                <span className="font-medium">₹{totals.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">GST (3%)</span>
                <span className="font-medium">₹{totals.tax}</span>
              </div>
              <div className="border-t border-[#E7E5E4] pt-2 flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  ₹{totals.total}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="payment-method-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || cart.length === 0 || !selectedCustomer}
              data-testid="complete-sale-button"
              className="w-full bg-[#D4AF37] hover:bg-[#B5952F] text-white"
            >
              {loading ? 'Processing...' : 'Complete Sale'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSalePage;

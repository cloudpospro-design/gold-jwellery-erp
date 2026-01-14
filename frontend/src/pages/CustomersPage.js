import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Users, Plus, Search, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const CustomersPage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    pincode: ''
  });

  useEffect(() => {
    if (hasPermission('customer_read')) {
      fetchCustomers();
    }
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/sales/customers');
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.address) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await api.post('/sales/customers', newCustomer);
      toast.success('Customer created successfully');
      setShowNewCustomer(false);
      fetchCustomers();
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        gstin: '',
        address: '',
        city: '',
        state: 'Maharashtra',
        pincode: ''
      });
    } catch (error) {
      toast.error('Failed to create customer');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!hasPermission('customer_read')) {
    return (
      <div className="p-8 text-center">
        <Users className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
        <p className="text-[#78716C]">You don't have permission to view customers.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Customer Management
          </h1>
          <p className="text-[#78716C] mt-2">{customers.length} customers registered</p>
        </div>
        {hasPermission('customer_all') && (
          <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-customer-button"
                className="bg-[#D4AF37] hover:bg-[#B5952F] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                  <Label>GSTIN (Optional)</Label>
                  <Input
                    value={newCustomer.gstin}
                    onChange={(e) => setNewCustomer({...newCustomer, gstin: e.target.value})}
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
                <Button
                  onClick={handleCreateCustomer}
                  className="w-full bg-[#D4AF37] hover:bg-[#B5952F]"
                >
                  Create Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#78716C] w-4 h-4" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#E7E5E4] focus:ring-[#D4AF37]"
            data-testid="search-customers-input"
          />
        </div>
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#78716C]">Loading customers...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E7E5E4] rounded-lg">
          <Users className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
          <h3 className="text-xl font-semibold text-[#1C1917] mb-2">No customers found</h3>
          <p className="text-[#78716C]">Start by adding your first customer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              data-testid={`customer-card-${customer.id}`}
              className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => navigate(`/customers/${customer.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FEFCE8] flex items-center justify-center text-[#D4AF37] font-bold text-lg">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1C1917]">{customer.name}</h3>
                    {customer.gstin && (
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs mt-1">
                        B2B
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#78716C]">
                  <Phone className="w-4 h-4" />
                  {customer.phone}
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-[#78716C]">
                    <Mail className="w-4 h-4" />
                    {customer.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-[#78716C]">
                  <MapPin className="w-4 h-4" />
                  {customer.city}, {customer.state}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#E7E5E4]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#78716C]">
                    <CreditCard className="w-4 h-4" />
                    <span>Total Purchases</span>
                  </div>
                  <span className="text-lg font-bold text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                    ₹{customer.total_purchases?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
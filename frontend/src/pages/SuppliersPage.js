import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ArrowLeft, Package, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const SuppliersPage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    payment_terms: 'Net 30'
  });

  useEffect(() => {
    if (hasPermission('purchase_read')) {
      fetchSuppliers();
    }
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/purchase/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async () => {
    try {
      await api.post('/purchase/suppliers', newSupplier);
      toast.success('Supplier created successfully');
      setShowNewSupplier(false);
      fetchSuppliers();
      setNewSupplier({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        gstin: '',
        address: '',
        city: '',
        state: 'Maharashtra',
        pincode: '',
        payment_terms: 'Net 30'
      });
    } catch (error) {
      toast.error('Failed to create supplier');
    }
  };

  if (!hasPermission('purchase_read')) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/purchase')}
        className="mb-4 text-[#78716C] hover:text-[#D4AF37]"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Purchase
      </Button>

      <div className="flex justify-between items-center">
        <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Suppliers
        </h1>
        {hasPermission('purchase_all') && (
          <Dialog open={showNewSupplier} onOpenChange={setShowNewSupplier}>
            <DialogTrigger asChild>
              <Button className="bg-[#D4AF37] hover:bg-[#B5952F]">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input value={newSupplier.name} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Person *</Label>
                    <Input value={newSupplier.contact_person} onChange={(e) => setNewSupplier({...newSupplier, contact_person: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input value={newSupplier.phone} onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input value={newSupplier.gstin} onChange={(e) => setNewSupplier({...newSupplier, gstin: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input value={newSupplier.address} onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})} required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input value={newSupplier.city} onChange={(e) => setNewSupplier({...newSupplier, city: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Input value={newSupplier.state} onChange={(e) => setNewSupplier({...newSupplier, state: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode *</Label>
                    <Input value={newSupplier.pincode} onChange={(e) => setNewSupplier({...newSupplier, pincode: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input value={newSupplier.payment_terms} onChange={(e) => setNewSupplier({...newSupplier, payment_terms: e.target.value})} />
                </div>
                <Button onClick={handleCreateSupplier} className="w-full bg-[#D4AF37] hover:bg-[#B5952F]">
                  Create Supplier
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FEFCE8] flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1C1917]">{supplier.name}</h3>
                    <p className="text-sm text-[#78716C]">{supplier.contact_person}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-[#78716C]"><strong>Phone:</strong> {supplier.phone}</p>
                {supplier.email && <p className="text-[#78716C]"><strong>Email:</strong> {supplier.email}</p>}
                <p className="text-[#78716C]"><strong>Address:</strong> {supplier.address}, {supplier.city}, {supplier.state}</p>
                {supplier.gstin && <p className="text-[#78716C]"><strong>GSTIN:</strong> {supplier.gstin}</p>}
                <p className="text-[#78716C]"><strong>Payment Terms:</strong> {supplier.payment_terms}</p>
                <p className="text-[#78716C]"><strong>Total Purchases:</strong> ₹{supplier.total_purchases.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
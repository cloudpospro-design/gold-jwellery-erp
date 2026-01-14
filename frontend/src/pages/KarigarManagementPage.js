import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  IndianRupee,
  Briefcase,
  Edit,
  Trash2,
  Eye,
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const KarigarManagementPage = () => {
  const { token } = useAuth();
  const [karigars, setKarigars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedKarigar, setSelectedKarigar] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    specialization: 'gold',
    experience_years: 0,
    daily_rate: 0,
    per_gram_rate: 0,
    commission_percentage: 0,
    aadhar_number: '',
    pan_number: '',
    bank_account: '',
    ifsc_code: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    fetchKarigars();
  }, [statusFilter]);

  const fetchKarigars = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await axios.get(`${API_URL}/api/karigar/?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKarigars(response.data);
    } catch (error) {
      console.error('Error fetching karigars:', error);
      toast.error('Failed to load karigars');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedKarigar) {
        await axios.patch(
          `${API_URL}/api/karigar/${selectedKarigar.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Karigar updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/karigar/`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Karigar added successfully');
      }
      setShowAddDialog(false);
      resetForm();
      fetchKarigars();
    } catch (error) {
      console.error('Error saving karigar:', error);
      toast.error(error.response?.data?.detail || 'Failed to save karigar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this karigar?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/karigar/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Karigar deleted successfully');
      fetchKarigars();
    } catch (error) {
      toast.error('Failed to delete karigar');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      specialization: 'gold',
      experience_years: 0,
      daily_rate: 0,
      per_gram_rate: 0,
      commission_percentage: 0,
      aadhar_number: '',
      pan_number: '',
      bank_account: '',
      ifsc_code: '',
      status: 'active',
      notes: ''
    });
    setSelectedKarigar(null);
  };

  const openEditDialog = (karigar) => {
    setSelectedKarigar(karigar);
    setFormData({
      name: karigar.name,
      phone: karigar.phone,
      email: karigar.email || '',
      address: karigar.address || '',
      specialization: karigar.specialization,
      experience_years: karigar.experience_years,
      daily_rate: karigar.daily_rate,
      per_gram_rate: karigar.per_gram_rate,
      commission_percentage: karigar.commission_percentage,
      aadhar_number: karigar.aadhar_number || '',
      pan_number: karigar.pan_number || '',
      bank_account: karigar.bank_account || '',
      ifsc_code: karigar.ifsc_code || '',
      status: karigar.status,
      notes: karigar.notes || ''
    });
    setShowAddDialog(true);
  };

  const filteredKarigars = karigars.filter(k =>
    k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.phone.includes(searchTerm)
  );

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      on_leave: 'bg-amber-100 text-amber-800'
    };
    return <Badge className={styles[status] || styles.inactive}>{status.replace('_', ' ')}</Badge>;
  };

  const getSpecializationBadge = (spec) => {
    const colors = {
      gold: 'bg-amber-100 text-amber-800',
      silver: 'bg-slate-100 text-slate-800',
      diamond: 'bg-blue-100 text-blue-800',
      kundan: 'bg-purple-100 text-purple-800',
      meenakari: 'bg-pink-100 text-pink-800',
      antique: 'bg-orange-100 text-orange-800',
      temple: 'bg-red-100 text-red-800',
      all: 'bg-green-100 text-green-800'
    };
    return <Badge className={colors[spec] || colors.gold}>{spec}</Badge>;
  };

  return (
    <div className="p-6 space-y-6" data-testid="karigar-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Karigar Management
          </h1>
          <p className="text-[#78716C] mt-1">Manage artisans and goldsmiths</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#D4AF37] hover:bg-[#B8942D] text-white" data-testid="add-karigar-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Karigar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedKarigar ? 'Edit Karigar' : 'Add New Karigar'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select value={formData.specialization} onValueChange={(v) => setFormData({...formData, specialization: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="diamond">Diamond</SelectItem>
                      <SelectItem value="kundan">Kundan</SelectItem>
                      <SelectItem value="meenakari">Meenakari</SelectItem>
                      <SelectItem value="antique">Antique</SelectItem>
                      <SelectItem value="temple">Temple</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience (Years)</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({...formData, experience_years: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily_rate">Daily Rate (₹)</Label>
                  <Input
                    id="daily_rate"
                    type="number"
                    value={formData.daily_rate}
                    onChange={(e) => setFormData({...formData, daily_rate: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="per_gram_rate">Per Gram Rate (₹)</Label>
                  <Input
                    id="per_gram_rate"
                    type="number"
                    value={formData.per_gram_rate}
                    onChange={(e) => setFormData({...formData, per_gram_rate: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission">Commission (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    step="0.5"
                    value={formData.commission_percentage}
                    onChange={(e) => setFormData({...formData, commission_percentage: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadhar">Aadhar Number</Label>
                  <Input
                    id="aadhar"
                    value={formData.aadhar_number}
                    onChange={(e) => setFormData({...formData, aadhar_number: e.target.value})}
                    maxLength={12}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan">PAN Number</Label>
                  <Input
                    id="pan"
                    value={formData.pan_number}
                    onChange={(e) => setFormData({...formData, pan_number: e.target.value.toUpperCase()})}
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank">Bank Account</Label>
                  <Input
                    id="bank"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifsc">IFSC Code</Label>
                  <Input
                    id="ifsc"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({...formData, ifsc_code: e.target.value.toUpperCase()})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
                  {selectedKarigar ? 'Update' : 'Add'} Karigar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-[#E7E5E4]">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Karigars Table */}
      <Card className="border-[#E7E5E4]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            Karigars ({filteredKarigars.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
            </div>
          ) : filteredKarigars.length === 0 ? (
            <div className="text-center py-8 text-[#78716C]">
              No karigars found. Add your first karigar to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKarigars.map((karigar) => (
                  <TableRow key={karigar.id}>
                    <TableCell className="font-medium">{karigar.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {karigar.phone}
                        </span>
                        {karigar.email && (
                          <span className="flex items-center gap-1 text-[#78716C]">
                            <Mail className="w-3 h-3" /> {karigar.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getSpecializationBadge(karigar.specialization)}</TableCell>
                    <TableCell>{karigar.experience_years} yrs</TableCell>
                    <TableCell>
                      <span className="flex items-center">
                        <IndianRupee className="w-3 h-3" />
                        {karigar.per_gram_rate}/g
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> {karigar.total_jobs}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(karigar.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedKarigar(karigar); setShowDetailDialog(true); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(karigar)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(karigar.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Karigar Details</DialogTitle>
          </DialogHeader>
          {selectedKarigar && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#78716C]">Name</p>
                  <p className="font-medium">{selectedKarigar.name}</p>
                </div>
                <div>
                  <p className="text-[#78716C]">Phone</p>
                  <p className="font-medium">{selectedKarigar.phone}</p>
                </div>
                <div>
                  <p className="text-[#78716C]">Specialization</p>
                  <p className="font-medium capitalize">{selectedKarigar.specialization}</p>
                </div>
                <div>
                  <p className="text-[#78716C]">Experience</p>
                  <p className="font-medium">{selectedKarigar.experience_years} years</p>
                </div>
                <div>
                  <p className="text-[#78716C]">Per Gram Rate</p>
                  <p className="font-medium">₹{selectedKarigar.per_gram_rate}</p>
                </div>
                <div>
                  <p className="text-[#78716C]">Daily Rate</p>
                  <p className="font-medium">₹{selectedKarigar.daily_rate}</p>
                </div>
                <div>
                  <p className="text-[#78716C]">Total Jobs</p>
                  <p className="font-medium">{selectedKarigar.total_jobs}</p>
                </div>
                <div>
                  <p className="text-[#78716C]">Total Earnings</p>
                  <p className="font-medium">₹{selectedKarigar.total_earnings?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KarigarManagementPage;

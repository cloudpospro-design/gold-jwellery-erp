import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  Building2,
  CreditCard,
  Settings,
  Users,
  TrendingUp,
  IndianRupee,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Crown,
  Loader2,
  BarChart3,
  Calendar,
  Shield,
  Zap
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SuperAdminDashboard = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [dashboardStats, setDashboardStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [systemSettings, setSystemSettings] = useState(null);
  
  // Filter states
  const [businessSearch, setBusinessSearch] = useState('');
  const [businessStatusFilter, setBusinessStatusFilter] = useState('all');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('all');
  
  // Dialog states
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showBusinessDialog, setShowBusinessDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  
  // Form states
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: 0,
    interval: 'monthly',
    max_users: 5,
    max_products: 100,
    max_sales_per_month: 500,
    features: '',
    is_popular: false,
    is_active: true
  });
  
  const [businessForm, setBusinessForm] = useState({
    name: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: ''
  });
  
  const [subscriptionForm, setSubscriptionForm] = useState({
    business_id: '',
    plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    amount_paid: 0,
    payment_method: 'manual'
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, businessesRes, plansRes, subscriptionsRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/saas-admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/saas-admin/businesses`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/saas-admin/plans`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/saas-admin/subscriptions`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/saas-admin/system-settings`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setDashboardStats(statsRes.data);
      setBusinesses(businessesRes.data);
      setPlans(plansRes.data);
      setSubscriptions(subscriptionsRes.data);
      setSystemSettings(settingsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 403) {
        toast.error('Superadmin access required');
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializePlans = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/saas-admin/initialize-plans`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to initialize plans');
    }
  };

  // Plan CRUD
  const handleSavePlan = async () => {
    try {
      const planData = {
        ...planForm,
        features: planForm.features.split('\n').filter(f => f.trim())
      };
      
      if (selectedPlan) {
        await axios.patch(
          `${API_URL}/api/saas-admin/plans/${selectedPlan.id}`,
          planData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Plan updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/saas-admin/plans`,
          planData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Plan created successfully');
      }
      setShowPlanDialog(false);
      resetPlanForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      await axios.delete(`${API_URL}/api/saas-admin/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Plan deleted successfully');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete plan');
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      description: '',
      price: 0,
      interval: 'monthly',
      max_users: 5,
      max_products: 100,
      max_sales_per_month: 500,
      features: '',
      is_popular: false,
      is_active: true
    });
    setSelectedPlan(null);
  };

  const openEditPlan = (plan) => {
    setSelectedPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      interval: plan.interval,
      max_users: plan.max_users,
      max_products: plan.max_products,
      max_sales_per_month: plan.max_sales_per_month,
      features: plan.features.join('\n'),
      is_popular: plan.is_popular,
      is_active: plan.is_active
    });
    setShowPlanDialog(true);
  };

  // Business CRUD
  const handleSaveBusiness = async () => {
    try {
      if (selectedBusiness) {
        await axios.patch(
          `${API_URL}/api/saas-admin/businesses/${selectedBusiness.id}`,
          businessForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Business updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/saas-admin/businesses`,
          businessForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Business created successfully');
      }
      setShowBusinessDialog(false);
      resetBusinessForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save business');
    }
  };

  const handleDeleteBusiness = async (businessId) => {
    if (!window.confirm('Are you sure you want to delete this business? This will also delete all their subscriptions.')) return;
    try {
      await axios.delete(`${API_URL}/api/saas-admin/businesses/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Business deleted successfully');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete business');
    }
  };

  const handleUpdateBusinessStatus = async (businessId, status) => {
    try {
      await axios.patch(
        `${API_URL}/api/saas-admin/businesses/${businessId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Business status updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetBusinessForm = () => {
    setBusinessForm({
      name: '',
      owner_name: '',
      owner_email: '',
      owner_phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstin: '',
      pan: ''
    });
    setSelectedBusiness(null);
  };

  // Subscription
  const handleCreateSubscription = async () => {
    try {
      await axios.post(
        `${API_URL}/api/saas-admin/subscriptions`,
        subscriptionForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Subscription created successfully');
      setShowSubscriptionDialog(false);
      setSubscriptionForm({
        business_id: '',
        plan_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        amount_paid: 0,
        payment_method: 'manual'
      });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create subscription');
    }
  };

  // System Settings
  const handleSaveSettings = async () => {
    try {
      await axios.patch(
        `${API_URL}/api/saas-admin/system-settings`,
        systemSettings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-blue-100 text-blue-800',
      expired: 'bg-amber-100 text-amber-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return <Badge className={styles[status] || styles.inactive}>{status}</Badge>;
  };

  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(businessSearch.toLowerCase()) ||
                          b.owner_name.toLowerCase().includes(businessSearch.toLowerCase()) ||
                          b.owner_email.toLowerCase().includes(businessSearch.toLowerCase());
    const matchesStatus = businessStatusFilter === 'all' || b.status === businessStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredSubscriptions = subscriptions.filter(s => {
    return subscriptionStatusFilter === 'all' || s.status === subscriptionStatusFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mx-auto mb-4" />
          <p className="text-[#78716C]">Loading SuperAdmin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]" data-testid="superadmin-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1C1917] to-[#292524] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#D4AF37] rounded-lg">
                <Crown className="w-6 h-6 text-[#1C1917]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  SuperAdmin Dashboard
                </h1>
                <p className="text-[#A8A29E] text-sm">Manage your SaaS platform</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={fetchAllData}
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-[#E7E5E4] mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="businesses" className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]">
              <Building2 className="w-4 h-4 mr-2" />
              Businesses
            </TabsTrigger>
            <TabsTrigger value="plans" className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]">
              <Zap className="w-4 h-4 mr-2" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]">
              <CreditCard className="w-4 h-4 mr-2" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]">
              <Settings className="w-4 h-4 mr-2" />
              System Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-[#E7E5E4] bg-gradient-to-br from-white to-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#78716C]">Total Businesses</p>
                      <p className="text-3xl font-bold text-[#1C1917]">{dashboardStats?.total_businesses || 0}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {dashboardStats?.active_businesses || 0} active
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E7E5E4] bg-gradient-to-br from-white to-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#78716C]">Active Subscriptions</p>
                      <p className="text-3xl font-bold text-[#1C1917]">{dashboardStats?.active_subscriptions || 0}</p>
                      <p className="text-xs text-[#78716C] mt-1">
                        of {dashboardStats?.total_subscriptions || 0} total
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <CreditCard className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E7E5E4] bg-gradient-to-br from-white to-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#78716C]">Total Revenue</p>
                      <p className="text-3xl font-bold text-[#1C1917]">
                        ₹{(dashboardStats?.total_revenue || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ₹{(dashboardStats?.monthly_revenue || 0).toLocaleString()} this month
                      </p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-full">
                      <IndianRupee className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E7E5E4] bg-gradient-to-br from-white to-purple-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#78716C]">Active Plans</p>
                      <p className="text-3xl font-bold text-[#1C1917]">{dashboardStats?.active_plans || 0}</p>
                      <p className="text-xs text-[#78716C] mt-1">
                        of {dashboardStats?.total_plans || 0} total
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Zap className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Signups */}
              <Card className="border-[#E7E5E4]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-[#D4AF37]" />
                    Recent Signups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardStats?.recent_signups?.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardStats.recent_signups.map((business, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-[#F5F5F4] rounded-lg">
                          <div>
                            <p className="font-medium text-[#1C1917]">{business.name}</p>
                            <p className="text-sm text-[#78716C]">{business.owner_name}</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(business.status)}
                            <p className="text-xs text-[#78716C] mt-1">
                              {business.created_at?.split('T')[0]}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-[#78716C] py-4">No recent signups</p>
                  )}
                </CardContent>
              </Card>

              {/* Expiring Soon */}
              <Card className="border-[#E7E5E4]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Expiring Soon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardStats?.expiring_soon?.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardStats.expiring_soon.map((sub, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <div>
                            <p className="font-medium text-[#1C1917]">{sub.business_name}</p>
                            <p className="text-sm text-[#78716C]">{sub.plan_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-amber-600">
                              Expires: {sub.end_date?.split('T')[0]}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-[#78716C] py-4">No subscriptions expiring soon</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Revenue by Plan */}
            {dashboardStats?.revenue_by_plan?.length > 0 && (
              <Card className="border-[#E7E5E4]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                    Revenue by Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {dashboardStats.revenue_by_plan.map((item, idx) => (
                      <div key={idx} className="p-4 bg-[#F5F5F4] rounded-lg">
                        <p className="font-medium text-[#1C1917]">{item.plan_name}</p>
                        <p className="text-2xl font-bold text-[#D4AF37]">
                          ₹{item.total_revenue?.toLocaleString()}
                        </p>
                        <p className="text-sm text-[#78716C]">{item.subscribers} subscribers</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Businesses Tab */}
          <TabsContent value="businesses" className="space-y-6">
            <Card className="border-[#E7E5E4]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#D4AF37]" />
                    All Businesses ({filteredBusinesses.length})
                  </CardTitle>
                  <Dialog open={showBusinessDialog} onOpenChange={(open) => { setShowBusinessDialog(open); if (!open) resetBusinessForm(); }}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Business
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{selectedBusiness ? 'Edit Business' : 'Add New Business'}</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Business Name *</Label>
                          <Input
                            value={businessForm.name}
                            onChange={(e) => setBusinessForm({...businessForm, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Owner Name *</Label>
                          <Input
                            value={businessForm.owner_name}
                            onChange={(e) => setBusinessForm({...businessForm, owner_name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Owner Email *</Label>
                          <Input
                            type="email"
                            value={businessForm.owner_email}
                            onChange={(e) => setBusinessForm({...businessForm, owner_email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Owner Phone *</Label>
                          <Input
                            value={businessForm.owner_phone}
                            onChange={(e) => setBusinessForm({...businessForm, owner_phone: e.target.value})}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Address</Label>
                          <Input
                            value={businessForm.address}
                            onChange={(e) => setBusinessForm({...businessForm, address: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                            value={businessForm.city}
                            onChange={(e) => setBusinessForm({...businessForm, city: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Input
                            value={businessForm.state}
                            onChange={(e) => setBusinessForm({...businessForm, state: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>GSTIN</Label>
                          <Input
                            value={businessForm.gstin}
                            onChange={(e) => setBusinessForm({...businessForm, gstin: e.target.value.toUpperCase()})}
                            maxLength={15}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>PAN</Label>
                          <Input
                            value={businessForm.pan}
                            onChange={(e) => setBusinessForm({...businessForm, pan: e.target.value.toUpperCase()})}
                            maxLength={10}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowBusinessDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveBusiness} className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
                          {selectedBusiness ? 'Update' : 'Create'} Business
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
                    <Input
                      placeholder="Search businesses..."
                      value={businessSearch}
                      onChange={(e) => setBusinessSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={businessStatusFilter} onValueChange={setBusinessStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                {filteredBusinesses.length === 0 ? (
                  <div className="text-center py-8 text-[#78716C]">
                    No businesses found. Add your first business to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBusinesses.map((business) => (
                        <TableRow key={business.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{business.name}</p>
                              <p className="text-xs text-[#78716C]">{business.city}, {business.state}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{business.owner_name}</p>
                              <p className="text-xs text-[#78716C]">{business.owner_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{business.plan_name || 'No Plan'}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(business.status)}</TableCell>
                          <TableCell>
                            {business.subscription_end_date ? (
                              <span className="text-sm text-[#78716C]">
                                Expires: {business.subscription_end_date.split('T')[0]}
                              </span>
                            ) : (
                              <span className="text-sm text-[#78716C]">No subscription</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Select onValueChange={(v) => handleUpdateBusinessStatus(business.id, v)}>
                                <SelectTrigger className="w-24 h-8">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Activate</SelectItem>
                                  <SelectItem value="suspended">Suspend</SelectItem>
                                  <SelectItem value="inactive">Deactivate</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteBusiness(business.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
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
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <Card className="border-[#E7E5E4]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#D4AF37]" />
                    Subscription Plans ({plans.length})
                  </CardTitle>
                  <div className="flex gap-2">
                    {plans.length === 0 && (
                      <Button variant="outline" onClick={initializePlans}>
                        Initialize Default Plans
                      </Button>
                    )}
                    <Dialog open={showPlanDialog} onOpenChange={(open) => { setShowPlanDialog(open); if (!open) resetPlanForm(); }}>
                      <DialogTrigger asChild>
                        <Button className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Plan
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{selectedPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                          <div className="space-y-2">
                            <Label>Plan Name *</Label>
                            <Input
                              value={planForm.name}
                              onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Price (₹) *</Label>
                            <Input
                              type="number"
                              value={planForm.price}
                              onChange={(e) => setPlanForm({...planForm, price: parseFloat(e.target.value) || 0})}
                            />
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={planForm.description}
                              onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Billing Interval</Label>
                            <Select value={planForm.interval} onValueChange={(v) => setPlanForm({...planForm, interval: v})}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                                <SelectItem value="lifetime">Lifetime</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Max Users</Label>
                            <Input
                              type="number"
                              value={planForm.max_users}
                              onChange={(e) => setPlanForm({...planForm, max_users: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Products</Label>
                            <Input
                              type="number"
                              value={planForm.max_products}
                              onChange={(e) => setPlanForm({...planForm, max_products: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Sales/Month</Label>
                            <Input
                              type="number"
                              value={planForm.max_sales_per_month}
                              onChange={(e) => setPlanForm({...planForm, max_sales_per_month: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label>Features (one per line)</Label>
                            <Textarea
                              value={planForm.features}
                              onChange={(e) => setPlanForm({...planForm, features: e.target.value})}
                              rows={4}
                              placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={planForm.is_popular}
                              onCheckedChange={(v) => setPlanForm({...planForm, is_popular: v})}
                            />
                            <Label>Mark as Popular</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={planForm.is_active}
                              onCheckedChange={(v) => setPlanForm({...planForm, is_active: v})}
                            />
                            <Label>Active</Label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
                          <Button onClick={handleSavePlan} className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
                            {selectedPlan ? 'Update' : 'Create'} Plan
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {plans.length === 0 ? (
                  <div className="text-center py-8 text-[#78716C]">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-[#D4AF37]" />
                    <p>No plans created yet.</p>
                    <p className="text-sm mt-2">Click "Initialize Default Plans" to create starter plans.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                      <Card key={plan.id} className={`relative ${plan.is_popular ? 'border-[#D4AF37] border-2' : 'border-[#E7E5E4]'}`}>
                        {plan.is_popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-[#D4AF37] text-white">Most Popular</Badge>
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            {!plan.is_active && <Badge variant="outline">Inactive</Badge>}
                          </div>
                          <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center mb-4">
                            <span className="text-3xl font-bold text-[#D4AF37]">₹{plan.price.toLocaleString()}</span>
                            <span className="text-[#78716C]">/{plan.interval}</span>
                          </div>
                          <div className="space-y-2 text-sm mb-4">
                            <p className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-[#78716C]" />
                              Up to {plan.max_users} users
                            </p>
                            <p className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-[#78716C]" />
                              {plan.max_products} products
                            </p>
                            <p className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-[#78716C]" />
                              {plan.max_sales_per_month} sales/month
                            </p>
                          </div>
                          <div className="border-t pt-4 mb-4">
                            <p className="text-sm font-medium mb-2">Features:</p>
                            <ul className="text-sm space-y-1">
                              {plan.features.slice(0, 4).map((f, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  {f}
                                </li>
                              ))}
                              {plan.features.length > 4 && (
                                <li className="text-[#78716C]">+{plan.features.length - 4} more</li>
                              )}
                            </ul>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#78716C]">
                              {plan.total_subscribers} subscribers
                            </span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditPlan(plan)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeletePlan(plan.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <Card className="border-[#E7E5E4]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                    Subscriptions ({filteredSubscriptions.length})
                  </CardTitle>
                  <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Subscription
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Subscription</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Business *</Label>
                          <Select
                            value={subscriptionForm.business_id}
                            onValueChange={(v) => setSubscriptionForm({...subscriptionForm, business_id: v})}
                          >
                            <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                            <SelectContent>
                              {businesses.map((b) => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Plan *</Label>
                          <Select
                            value={subscriptionForm.plan_id}
                            onValueChange={(v) => {
                              const plan = plans.find(p => p.id === v);
                              setSubscriptionForm({
                                ...subscriptionForm,
                                plan_id: v,
                                amount_paid: plan?.price || 0
                              });
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                            <SelectContent>
                              {plans.filter(p => p.is_active).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} - ₹{p.price}/{p.interval}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={subscriptionForm.start_date}
                              onChange={(e) => setSubscriptionForm({...subscriptionForm, start_date: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={subscriptionForm.end_date}
                              onChange={(e) => setSubscriptionForm({...subscriptionForm, end_date: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Amount Paid (₹)</Label>
                            <Input
                              type="number"
                              value={subscriptionForm.amount_paid}
                              onChange={(e) => setSubscriptionForm({...subscriptionForm, amount_paid: parseFloat(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select
                              value={subscriptionForm.payment_method}
                              onValueChange={(v) => setSubscriptionForm({...subscriptionForm, payment_method: v})}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="razorpay">Razorpay</SelectItem>
                                <SelectItem value="stripe">Stripe</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowSubscriptionDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateSubscription} className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
                          Create Subscription
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filter */}
                <div className="mb-4">
                  <Select value={subscriptionStatusFilter} onValueChange={setSubscriptionStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredSubscriptions.length === 0 ? (
                  <div className="text-center py-8 text-[#78716C]">
                    No subscriptions found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.business_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sub.plan_name}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{sub.start_date?.split('T')[0]}</p>
                              <p className="text-[#78716C]">to {sub.end_date?.split('T')[0]}</p>
                            </div>
                          </TableCell>
                          <TableCell>₹{sub.amount_paid?.toLocaleString()}</TableCell>
                          <TableCell className="capitalize">{sub.payment_method}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {systemSettings && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-[#E7E5E4]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[#D4AF37]" />
                      Platform Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Platform Name</Label>
                      <Input
                        value={systemSettings.platform_name}
                        onChange={(e) => setSystemSettings({...systemSettings, platform_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tagline</Label>
                      <Input
                        value={systemSettings.platform_tagline}
                        onChange={(e) => setSystemSettings({...systemSettings, platform_tagline: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Support Email</Label>
                      <Input
                        type="email"
                        value={systemSettings.support_email}
                        onChange={(e) => setSystemSettings({...systemSettings, support_email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Support Phone</Label>
                      <Input
                        value={systemSettings.support_phone}
                        onChange={(e) => setSystemSettings({...systemSettings, support_phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Trial Period (days)</Label>
                      <Input
                        type="number"
                        value={systemSettings.trial_days}
                        onChange={(e) => setSystemSettings({...systemSettings, trial_days: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#E7E5E4]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#D4AF37]" />
                      System Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Maintenance Mode</p>
                        <p className="text-sm text-[#78716C]">Temporarily disable the platform</p>
                      </div>
                      <Switch
                        checked={systemSettings.maintenance_mode}
                        onCheckedChange={(v) => setSystemSettings({...systemSettings, maintenance_mode: v})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Allow Registration</p>
                        <p className="text-sm text-[#78716C]">Allow new businesses to sign up</p>
                      </div>
                      <Switch
                        checked={systemSettings.allow_registration}
                        onCheckedChange={(v) => setSystemSettings({...systemSettings, allow_registration: v})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          value={systemSettings.currency}
                          onValueChange={(v) => setSystemSettings({...systemSettings, currency: v})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Currency Symbol</Label>
                        <Input
                          value={systemSettings.currency_symbol}
                          onChange={(e) => setSystemSettings({...systemSettings, currency_symbol: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        value={systemSettings.tax_rate}
                        onChange={(e) => setSystemSettings({...systemSettings, tax_rate: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="pt-4">
                      <p className="text-sm font-medium mb-2">Integration Status</p>
                      <div className="flex gap-4">
                        <Badge className={systemSettings.smtp_configured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          SMTP: {systemSettings.smtp_configured ? 'Configured' : 'Not Configured'}
                        </Badge>
                        <Badge className={systemSettings.payment_gateway_configured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          Payment: {systemSettings.payment_gateway_configured ? 'Configured' : 'Not Configured'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="lg:col-span-2">
                  <Button onClick={handleSaveSettings} className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
                    Save All Settings
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;

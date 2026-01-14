import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Save,
  RefreshCw,
  Database,
  Download,
  Bell,
  Clock,
  Shield,
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SettingsPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Business Settings State
  const [businessSettings, setBusinessSettings] = useState({
    company_name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    logo_url: '',
    invoice_prefix: 'INV',
    po_prefix: 'PO',
    financial_year_start: '04-01'
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    low_stock_threshold_default: 5,
    default_gst_rate: 3.0,
    currency: 'INR',
    currency_symbol: '₹',
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    timezone: 'Asia/Kolkata',
    backup_frequency: 'daily',
    enable_email_notifications: true,
    enable_sms_notifications: true,
    auto_send_invoice: false
  });

  // Backup Info State
  const [backupInfo, setBackupInfo] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [businessRes, systemRes, backupRes] = await Promise.all([
        axios.get(`${API_URL}/api/settings/business`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/settings/system`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/settings/backup-info`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null)
      ]);

      setBusinessSettings(businessRes.data);
      setSystemSettings(systemRes.data);
      if (backupRes) {
        setBackupInfo(backupRes.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessChange = (field, value) => {
    setBusinessSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSystemChange = (field, value) => {
    setSystemSettings(prev => ({ ...prev, [field]: value }));
  };

  const saveBusinessSettings = async () => {
    setSaving(true);
    try {
      const response = await axios.patch(
        `${API_URL}/api/settings/business`,
        businessSettings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBusinessSettings(response.data);
      toast.success('Business settings saved successfully');
    } catch (error) {
      console.error('Error saving business settings:', error);
      toast.error(error.response?.data?.detail || 'Failed to save business settings');
    } finally {
      setSaving(false);
    }
  };

  const saveSystemSettings = async () => {
    setSaving(true);
    try {
      const response = await axios.patch(
        `${API_URL}/api/settings/system`,
        systemSettings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSystemSettings(response.data);
      toast.success('System settings saved successfully');
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast.error(error.response?.data?.detail || 'Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/settings/export-data`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Data exported successfully. ${response.data.records_exported} records exported.`);
      fetchSettings();
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mx-auto mb-4" />
          <p className="text-[#78716C]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Settings
          </h1>
          <p className="text-[#78716C] mt-1">Manage your business and system preferences</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchSettings}
          className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
          data-testid="refresh-settings-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-[#E7E5E4] p-1">
          <TabsTrigger
            value="business"
            className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]"
            data-testid="tab-business"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Business
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]"
            data-testid="tab-system"
          >
            <Shield className="w-4 h-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger
            value="backup"
            className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]"
            data-testid="tab-backup"
          >
            <Database className="w-4 h-4 mr-2" />
            Backup
          </TabsTrigger>
        </TabsList>

        {/* Business Settings Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1C1917]">
                <Building2 className="w-5 h-5 text-[#D4AF37]" />
                Company Information
              </CardTitle>
              <CardDescription>Basic details about your business</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  data-testid="input-company-name"
                  value={businessSettings.company_name}
                  onChange={(e) => handleBusinessChange('company_name', e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
                  <Input
                    id="email"
                    data-testid="input-email"
                    type="email"
                    value={businessSettings.email}
                    onChange={(e) => handleBusinessChange('email', e.target.value)}
                    className="pl-10"
                    placeholder="contact@company.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
                  <Input
                    id="phone"
                    data-testid="input-phone"
                    value={businessSettings.phone}
                    onChange={(e) => handleBusinessChange('phone', e.target.value)}
                    className="pl-10"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
                  <Input
                    id="address"
                    data-testid="input-address"
                    value={businessSettings.address}
                    onChange={(e) => handleBusinessChange('address', e.target.value)}
                    className="pl-10"
                    placeholder="Street Address"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  data-testid="input-city"
                  value={businessSettings.city}
                  onChange={(e) => handleBusinessChange('city', e.target.value)}
                  placeholder="Mumbai"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  data-testid="input-state"
                  value={businessSettings.state}
                  onChange={(e) => handleBusinessChange('state', e.target.value)}
                  placeholder="Maharashtra"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  data-testid="input-pincode"
                  value={businessSettings.pincode}
                  onChange={(e) => handleBusinessChange('pincode', e.target.value)}
                  placeholder="400001"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1C1917]">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                Tax & Legal Information
              </CardTitle>
              <CardDescription>GST and PAN details for compliance</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  data-testid="input-gstin"
                  value={businessSettings.gstin || ''}
                  onChange={(e) => handleBusinessChange('gstin', e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
                <p className="text-xs text-[#78716C]">15-character GST Identification Number</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  data-testid="input-pan"
                  value={businessSettings.pan || ''}
                  onChange={(e) => handleBusinessChange('pan', e.target.value.toUpperCase())}
                  placeholder="AAAAA0000A"
                  maxLength={10}
                />
                <p className="text-xs text-[#78716C]">10-character Permanent Account Number</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                <Input
                  id="invoice_prefix"
                  data-testid="input-invoice-prefix"
                  value={businessSettings.invoice_prefix}
                  onChange={(e) => handleBusinessChange('invoice_prefix', e.target.value.toUpperCase())}
                  placeholder="INV"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po_prefix">Purchase Order Prefix</Label>
                <Input
                  id="po_prefix"
                  data-testid="input-po-prefix"
                  value={businessSettings.po_prefix}
                  onChange={(e) => handleBusinessChange('po_prefix', e.target.value.toUpperCase())}
                  placeholder="PO"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="financial_year_start">Financial Year Start</Label>
                <Select
                  value={businessSettings.financial_year_start}
                  onValueChange={(value) => handleBusinessChange('financial_year_start', value)}
                >
                  <SelectTrigger data-testid="select-fy-start">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01-01">January (01-01)</SelectItem>
                    <SelectItem value="04-01">April (04-01)</SelectItem>
                    <SelectItem value="07-01">July (07-01)</SelectItem>
                    <SelectItem value="10-01">October (10-01)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={saveBusinessSettings}
              disabled={saving}
              className="bg-[#D4AF37] hover:bg-[#B8942D] text-white"
              data-testid="save-business-btn"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Business Settings
            </Button>
          </div>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1C1917]">
                <Shield className="w-5 h-5 text-[#D4AF37]" />
                General Settings
              </CardTitle>
              <CardDescription>Configure default system behavior</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
                <Input
                  id="low_stock_threshold"
                  data-testid="input-low-stock"
                  type="number"
                  value={systemSettings.low_stock_threshold_default}
                  onChange={(e) => handleSystemChange('low_stock_threshold_default', parseInt(e.target.value) || 0)}
                  min={1}
                />
                <p className="text-xs text-[#78716C]">Alert when stock falls below this quantity</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_gst_rate">Default GST Rate (%)</Label>
                <Input
                  id="default_gst_rate"
                  data-testid="input-gst-rate"
                  type="number"
                  step="0.5"
                  value={systemSettings.default_gst_rate}
                  onChange={(e) => handleSystemChange('default_gst_rate', parseFloat(e.target.value) || 0)}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-[#78716C]">Standard rate for gold jewellery is 3%</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={systemSettings.currency}
                  onValueChange={(value) => handleSystemChange('currency', value)}
                >
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">Indian Rupee (INR)</SelectItem>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    <SelectItem value="AED">UAE Dirham (AED)</SelectItem>
                    <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency_symbol">Currency Symbol</Label>
                <Input
                  id="currency_symbol"
                  data-testid="input-currency-symbol"
                  value={systemSettings.currency_symbol}
                  onChange={(e) => handleSystemChange('currency_symbol', e.target.value)}
                  placeholder="₹"
                  maxLength={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1C1917]">
                <Clock className="w-5 h-5 text-[#D4AF37]" />
                Date & Time Settings
              </CardTitle>
              <CardDescription>Configure display formats</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date_format">Date Format</Label>
                <Select
                  value={systemSettings.date_format}
                  onValueChange={(value) => handleSystemChange('date_format', value)}
                >
                  <SelectTrigger data-testid="select-date-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_format">Time Format</Label>
                <Select
                  value={systemSettings.time_format}
                  onValueChange={(value) => handleSystemChange('time_format', value)}
                >
                  <SelectTrigger data-testid="select-time-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                    <SelectItem value="24h">24-hour (14:30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={systemSettings.timezone}
                  onValueChange={(value) => handleSystemChange('timezone', value)}
                >
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1C1917]">
                <Bell className="w-5 h-5 text-[#D4AF37]" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-[#78716C]">Receive alerts via email</p>
                </div>
                <Switch
                  data-testid="switch-email-notifications"
                  checked={systemSettings.enable_email_notifications}
                  onCheckedChange={(checked) => handleSystemChange('enable_email_notifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-[#78716C]">Receive alerts via SMS</p>
                </div>
                <Switch
                  data-testid="switch-sms-notifications"
                  checked={systemSettings.enable_sms_notifications}
                  onCheckedChange={(checked) => handleSystemChange('enable_sms_notifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-send Invoice</Label>
                  <p className="text-sm text-[#78716C]">Automatically send invoice after sale</p>
                </div>
                <Switch
                  data-testid="switch-auto-invoice"
                  checked={systemSettings.auto_send_invoice}
                  onCheckedChange={(checked) => handleSystemChange('auto_send_invoice', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={saveSystemSettings}
              disabled={saving}
              className="bg-[#D4AF37] hover:bg-[#B8942D] text-white"
              data-testid="save-system-btn"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save System Settings
            </Button>
          </div>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-6">
          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1C1917]">
                <Database className="w-5 h-5 text-[#D4AF37]" />
                Backup & Export
              </CardTitle>
              <CardDescription>Manage your data backups and exports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {backupInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#F5F5F4] rounded-lg">
                    <p className="text-sm text-[#78716C]">Last Backup</p>
                    <p className="text-lg font-semibold text-[#1C1917]">
                      {backupInfo.last_backup_date 
                        ? new Date(backupInfo.last_backup_date).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  <div className="p-4 bg-[#F5F5F4] rounded-lg">
                    <p className="text-sm text-[#78716C]">Backup Status</p>
                    <p className={`text-lg font-semibold ${
                      backupInfo.backup_status === 'healthy' ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {backupInfo.backup_status === 'healthy' ? 'Healthy' : 'No Data'}
                    </p>
                  </div>
                  <div className="p-4 bg-[#F5F5F4] rounded-lg col-span-1 md:col-span-2">
                    <p className="text-sm text-[#78716C] mb-2">Total Records</p>
                    <div className="flex flex-wrap gap-2">
                      {backupInfo.total_records && Object.entries(backupInfo.total_records).map(([key, value]) => (
                        <span key={key} className="px-2 py-1 bg-white rounded text-sm">
                          <span className="text-[#78716C]">{key}:</span>{' '}
                          <span className="font-semibold text-[#1C1917]">{value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-[#E7E5E4] pt-6">
                <div className="space-y-2 mb-4">
                  <Label>Backup Frequency</Label>
                  <Select
                    value={systemSettings.backup_frequency}
                    onValueChange={(value) => handleSystemChange('backup_frequency', value)}
                  >
                    <SelectTrigger className="w-48" data-testid="select-backup-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleExportData}
                    disabled={exporting}
                    variant="outline"
                    className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                    data-testid="export-data-btn"
                  >
                    {exporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-full">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-800">Data Security Notice</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Your data is automatically backed up according to your backup frequency settings.
                    For additional security, we recommend regularly exporting your data and storing it
                    in a secure location outside the application.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;

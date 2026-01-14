import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  FileText,
  Upload,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  BarChart3
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdvancedGSTPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('einvoice');
  const [eInvoices, setEInvoices] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filingPeriod, setFilingPeriod] = useState('');
  const [gstr2aRecords, setGstr2aRecords] = useState([]);
  const [gstr2bRecords, setGstr2bRecords] = useState([]);

  useEffect(() => {
    if (activeTab === 'einvoice') {
      fetchEInvoices();
    }
  }, [activeTab]);

  const fetchEInvoices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/advanced-gst/e-invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEInvoices(response.data);
    } catch (error) {
      console.error('Error fetching e-invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReconciliation = async () => {
    if (!filingPeriod || filingPeriod.length !== 6) {
      toast.error('Please enter filing period in MMYYYY format (e.g., 012026)');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/advanced-gst/reconciliation/${filingPeriod}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReconciliation(response.data);
      
      // Also fetch GSTR-2A and 2B records
      const [gstr2aRes, gstr2bRes] = await Promise.all([
        axios.get(`${API_URL}/api/advanced-gst/gstr2a/${filingPeriod}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/advanced-gst/gstr2b/${filingPeriod}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setGstr2aRecords(gstr2aRes.data.records || []);
      setGstr2bRecords(gstr2bRes.data.records || []);
    } catch (error) {
      console.error('Error fetching reconciliation:', error);
      toast.error('Failed to fetch reconciliation report');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (type, file) => {
    if (!filingPeriod) {
      toast.error('Please enter filing period first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/api/advanced-gst/${type}/import?filing_period=${filingPeriod}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      toast.success(response.data.message);
      fetchReconciliation();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      generated: 'bg-green-100 text-green-800',
      pending: 'bg-amber-100 text-amber-800',
      cancelled: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800'
    };
    return <Badge className={styles[status] || styles.pending}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6" data-testid="advanced-gst-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Advanced GST
        </h1>
        <p className="text-[#78716C] mt-1">E-invoicing and GSTR-2A/2B reconciliation</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-[#E7E5E4]">
          <TabsTrigger value="einvoice" className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]">
            <FileText className="w-4 h-4 mr-2" />
            E-Invoicing
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]">
            <BarChart3 className="w-4 h-4 mr-2" />
            GSTR-2A/2B Reconciliation
          </TabsTrigger>
        </TabsList>

        {/* E-Invoicing Tab */}
        <TabsContent value="einvoice" className="space-y-6">
          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle>E-Invoice Management</CardTitle>
              <CardDescription>Generate and manage GST e-invoices for B2B transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
              ) : eInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-[#78716C] mx-auto mb-4" />
                  <p className="text-[#78716C]">No e-invoices generated yet.</p>
                  <p className="text-sm text-[#A8A29E] mt-2">E-invoices are automatically generated for B2B sales above threshold.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>IRN</TableHead>
                      <TableHead>Ack Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell className="font-mono text-xs">{inv.irn?.substring(0, 20)}...</TableCell>
                        <TableCell>{inv.ack_number}</TableCell>
                        <TableCell>{inv.ack_date?.split('T')[0]}</TableCell>
                        <TableCell>{getStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-6">
          {/* Filing Period Selector */}
          <Card className="border-[#E7E5E4]">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Filing Period (MMYYYY)</label>
                  <Input
                    placeholder="e.g., 012026"
                    value={filingPeriod}
                    onChange={(e) => setFilingPeriod(e.target.value)}
                    maxLength={6}
                  />
                </div>
                <Button onClick={fetchReconciliation} className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
                  <Search className="w-4 h-4 mr-2" />
                  Load Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-[#E7E5E4]">
              <CardHeader>
                <CardTitle className="text-lg">Import GSTR-2A</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-[#E7E5E4] rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-[#78716C] mx-auto mb-2" />
                  <p className="text-sm text-[#78716C] mb-2">Upload GSTR-2A JSON file</p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => e.target.files[0] && handleFileUpload('gstr2a', e.target.files[0])}
                    className="hidden"
                    id="gstr2a-upload"
                  />
                  <Button variant="outline" onClick={() => document.getElementById('gstr2a-upload').click()}>
                    Choose File
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E7E5E4]">
              <CardHeader>
                <CardTitle className="text-lg">Import GSTR-2B</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-[#E7E5E4] rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-[#78716C] mx-auto mb-2" />
                  <p className="text-sm text-[#78716C] mb-2">Upload GSTR-2B JSON file</p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => e.target.files[0] && handleFileUpload('gstr2b', e.target.files[0])}
                    className="hidden"
                    id="gstr2b-upload"
                  />
                  <Button variant="outline" onClick={() => document.getElementById('gstr2b-upload').click()}>
                    Choose File
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reconciliation Summary */}
          {reconciliation && (
            <Card className="border-[#E7E5E4]">
              <CardHeader>
                <CardTitle>Reconciliation Summary - {reconciliation.filing_period}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">GSTR-2A Records</p>
                    <p className="text-2xl font-bold text-blue-800">{reconciliation.total_gstr2a_records}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600">GSTR-2B Records</p>
                    <p className="text-2xl font-bold text-purple-800">{reconciliation.total_gstr2b_records}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Matched</p>
                    <p className="text-2xl font-bold text-green-800">{reconciliation.matched_records}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">Unmatched</p>
                    <p className="text-2xl font-bold text-red-800">{reconciliation.unmatched_records}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#F5F5F4] rounded-lg">
                    <p className="text-sm text-[#78716C]">GSTR-2A Value</p>
                    <p className="text-xl font-bold">₹{reconciliation.total_gstr2a_value?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-[#F5F5F4] rounded-lg">
                    <p className="text-sm text-[#78716C]">Purchase Value</p>
                    <p className="text-xl font-bold">₹{reconciliation.total_purchase_value?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-600">Variance</p>
                    <p className="text-xl font-bold text-amber-800">₹{reconciliation.variance_amount?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">ITC Claimable</span>
                    </div>
                    <p className="text-2xl font-bold text-green-800">₹{reconciliation.itc_claimable?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-800">ITC Not Claimable</span>
                    </div>
                    <p className="text-2xl font-bold text-red-800">₹{reconciliation.itc_not_claimable?.toLocaleString()}</p>
                  </div>
                </div>

                {/* Discrepancies */}
                {reconciliation.discrepancies?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Discrepancies ({reconciliation.discrepancies.length})
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Supplier GSTIN</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reconciliation.discrepancies.slice(0, 10).map((d, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Badge variant="outline">{d.type}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{d.supplier_gstin}</TableCell>
                            <TableCell>{d.invoice_number}</TableCell>
                            <TableCell>₹{d.amount?.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-[#78716C]">{d.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedGSTPage;

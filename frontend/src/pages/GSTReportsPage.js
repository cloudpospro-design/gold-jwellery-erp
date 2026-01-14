import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const GSTReportsPage = () => {
  const { hasPermission } = useAuth();
  const [reportType, setReportType] = useState('gstr1');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const generateReport = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select date range');
      return;
    }

    setLoading(true);
    try {
      const endpoint = `/gst-reports/${reportType}?from_date=${fromDate}&to_date=${toDate}`;
      const response = await api.get(endpoint);
      setReportData(response.data);
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!reportData) return;
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}_${fromDate}_to_${toDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  if (!hasPermission('gst_all') && !hasPermission('reports_read')) {
    return (
      <div className="p-8 text-center">
        <FileText className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
        <p className="text-[#78716C]">You don't have permission to view GST reports.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
          GST Reports & Compliance
        </h1>
        <p className="text-[#78716C] mt-2">Generate GST returns and reports for filing</p>
      </div>

      {/* Report Generation Form */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Generate Report
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger data-testid="report-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gstr1">GSTR-1 (Outward Supplies)</SelectItem>
                <SelectItem value="gstr3b">GSTR-3B (Monthly Summary)</SelectItem>
                <SelectItem value="hsn-summary">HSN-wise Summary</SelectItem>
                <SelectItem value="itc-reconciliation">ITC Reconciliation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>From Date</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              data-testid="from-date-input"
              className="border-[#E7E5E4] focus:ring-[#D4AF37]"
            />
          </div>

          <div className="space-y-2">
            <Label>To Date</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              data-testid="to-date-input"
              className="border-[#E7E5E4] focus:ring-[#D4AF37]"
            />
          </div>

          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button
              onClick={generateReport}
              disabled={loading}
              data-testid="generate-report-button"
              className="w-full bg-[#D4AF37] hover:bg-[#B5952F] text-white"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </div>

      {/* Report Display */}
      {reportData && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
              Report Results
            </h3>
            <Button
              onClick={downloadReport}
              variant="outline"
              className="border-[#E7E5E4]"
              data-testid="download-report-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Download JSON
            </Button>
          </div>

          {/* GSTR-1 Report */}
          {reportType === 'gstr1' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
                  <p className="text-sm text-[#78716C] mb-1">Total Taxable Value</p>
                  <p className="text-2xl font-bold text-[#1C1917]">₹{reportData.total_taxable_value?.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
                  <p className="text-sm text-[#78716C] mb-1">Total CGST</p>
                  <p className="text-2xl font-bold text-[#1C1917]">₹{reportData.total_cgst?.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
                  <p className="text-sm text-[#78716C] mb-1">Total SGST</p>
                  <p className="text-2xl font-bold text-[#1C1917]">₹{reportData.total_sgst?.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
                  <p className="text-sm text-[#78716C] mb-1">Total IGST</p>
                  <p className="text-2xl font-bold text-[#1C1917]">₹{reportData.total_igst?.toLocaleString()}</p>
                </div>
              </div>

              {/* B2B Invoices */}
              {reportData.b2b_invoices?.length > 0 && (
                <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
                  <h4 className="text-lg font-semibold mb-4">B2B Invoices ({reportData.b2b_invoices.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#FAFAF9] border-y border-[#E7E5E4]">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Invoice No</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Customer</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">GSTIN</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">Taxable Value</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">CGST</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">SGST</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">IGST</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.b2b_invoices.map((invoice, idx) => (
                          <tr key={idx} className="border-b border-[#E7E5E4]">
                            <td className="py-3 px-4 text-sm">{invoice.invoice_number}</td>
                            <td className="py-3 px-4 text-sm">{invoice.customer_name}</td>
                            <td className="py-3 px-4 text-sm">{invoice.customer_gstin}</td>
                            <td className="text-right py-3 px-4 text-sm">₹{invoice.taxable_value.toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-sm">₹{invoice.cgst.toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-sm">₹{invoice.sgst.toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-sm">₹{invoice.igst.toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-sm font-medium">₹{invoice.invoice_value.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* B2C Invoices */}
              {reportData.b2c_invoices?.length > 0 && (
                <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
                  <h4 className="text-lg font-semibold mb-4">B2C Invoices ({reportData.b2c_invoices.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#FAFAF9] border-y border-[#E7E5E4]">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Invoice No</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">State</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">Taxable Value</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">Tax Amount</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.b2c_invoices.map((invoice, idx) => (
                          <tr key={idx} className="border-b border-[#E7E5E4]">
                            <td className="py-3 px-4 text-sm">{invoice.invoice_number}</td>
                            <td className="py-3 px-4 text-sm">{invoice.customer_state}</td>
                            <td className="text-right py-3 px-4 text-sm">₹{invoice.taxable_value.toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-sm">₹{invoice.total_tax.toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-sm font-medium">₹{invoice.invoice_value.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HSN Summary Report */}
          {reportType === 'hsn-summary' && (
            <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
              <h4 className="text-lg font-semibold mb-4">HSN-wise Summary</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#FAFAF9] border-y border-[#E7E5E4]">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold">HSN Code</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Description</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold">Qty</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Taxable Value</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Tax Amount</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.items?.map((item, idx) => (
                      <tr key={idx} className="border-b border-[#E7E5E4]">
                        <td className="py-3 px-4 text-sm font-medium">{item.hsn_code}</td>
                        <td className="py-3 px-4 text-sm">{item.description}</td>
                        <td className="text-center py-3 px-4 text-sm">{item.total_quantity}</td>
                        <td className="text-right py-3 px-4 text-sm">₹{item.taxable_value.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 text-sm">₹{item.total_tax.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 text-sm font-medium">₹{item.total_value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#FEFCE8] border-t-2 border-[#D4AF37]">
                    <tr>
                      <td colSpan="3" className="py-3 px-4 text-sm font-semibold">Total</td>
                      <td className="text-right py-3 px-4 text-sm font-bold">₹{reportData.total_taxable_value?.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-sm font-bold">₹{reportData.total_tax?.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-sm font-bold">₹{(reportData.total_taxable_value + reportData.total_tax).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* GSTR-3B Report */}
          {reportType === 'gstr3b' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h4 className="text-lg font-semibold">Outward Supplies (Sales)</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[#78716C]">Taxable Value</span>
                    <span className="font-medium">₹{reportData.outward_taxable_supplies?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#78716C]">CGST</span>
                    <span className="font-medium">₹{reportData.outward_cgst?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#78716C]">SGST</span>
                    <span className="font-medium">₹{reportData.outward_sgst?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#78716C]">IGST</span>
                    <span className="font-medium">₹{reportData.outward_igst?.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-[#E7E5E4] pt-2 flex justify-between">
                    <span className="font-semibold">Total Tax</span>
                    <span className="font-bold text-[#D4AF37]">₹{reportData.outward_tax_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="w-5 h-5 text-blue-600" />
                  <h4 className="text-lg font-semibold">ITC Available (Purchases)</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[#78716C]">Taxable Value</span>
                    <span className="font-medium">₹{reportData.inward_taxable_supplies?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#78716C]">CGST Credit</span>
                    <span className="font-medium">₹{reportData.itc_cgst?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#78716C]">SGST Credit</span>
                    <span className="font-medium">₹{reportData.itc_sgst?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#78716C]">IGST Credit</span>
                    <span className="font-medium">₹{reportData.itc_igst?.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-[#E7E5E4] pt-2 flex justify-between">
                    <span className="font-semibold">Total ITC</span>
                    <span className="font-bold text-blue-600">₹{reportData.inward_tax_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-[#FEFCE8] border border-[#D4AF37] rounded-lg shadow-sm p-6">
                <h4 className="text-lg font-semibold mb-4">Net Tax Payable</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#78716C] mb-1">Net CGST</p>
                    <p className="text-xl font-bold">₹{reportData.net_cgst?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#78716C] mb-1">Net SGST</p>
                    <p className="text-xl font-bold">₹{reportData.net_sgst?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#78716C] mb-1">Net IGST</p>
                    <p className="text-xl font-bold">₹{reportData.net_igst?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#78716C] mb-1">Total Payable</p>
                    <p className="text-3xl font-bold text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      ₹{reportData.net_tax_payable?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ITC Reconciliation */}
          {reportType === 'itc-reconciliation' && (
            <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
              <h4 className="text-lg font-semibold mb-6">Input Tax Credit Reconciliation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h5 className="font-semibold text-[#1C1917]">ITC Available (Purchases)</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[#78716C]">CGST Credit</span>
                      <span className="font-medium">₹{reportData.itc_available_cgst?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#78716C]">SGST Credit</span>
                      <span className="font-medium">₹{reportData.itc_available_sgst?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#78716C]">IGST Credit</span>
                      <span className="font-medium">₹{reportData.itc_available_igst?.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-[#E7E5E4] pt-2 flex justify-between">
                      <span className="font-semibold">Total ITC</span>
                      <span className="font-bold text-blue-600">₹{reportData.total_itc_available?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold text-[#1C1917]">Output Tax (Sales)</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[#78716C]">CGST Output</span>
                      <span className="font-medium">₹{reportData.output_cgst?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#78716C]">SGST Output</span>
                      <span className="font-medium">₹{reportData.output_sgst?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#78716C]">IGST Output</span>
                      <span className="font-medium">₹{reportData.output_igst?.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-[#E7E5E4] pt-2 flex justify-between">
                      <span className="font-semibold">Total Output</span>
                      <span className="font-bold text-green-600">₹{reportData.total_output_tax?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-[#FEFCE8] border border-[#D4AF37] rounded-lg p-4">
                <h5 className="font-semibold mb-3">Net Tax Payable</h5>
                <div className="text-3xl font-bold text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  ₹{reportData.net_tax_payable?.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GSTReportsPage;

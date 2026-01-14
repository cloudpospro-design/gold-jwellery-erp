import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Printer, Download, Mail } from 'lucide-react';
import { toast } from 'sonner';

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasPermission('sales_read')) {
      fetchSale();
    }
  }, [id]);

  const fetchSale = async () => {
    try {
      const response = await api.get(`/sales/${id}`);
      setSale(response.data);
    } catch (error) {
      toast.error('Failed to fetch invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!sale.customer.email) {
      toast.error('Customer email not available');
      return;
    }

    try {
      await api.post('/notifications/send-invoice-email', {
        invoice_id: id,
        customer_email: sale.customer.email
      });
      toast.success('Invoice sent to customer email');
    } catch (error) {
      toast.error('Failed to send invoice');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Invoice Not Found</h2>
        <Button onClick={() => navigate('/sales')} className="mt-4">
          Back to Sales
        </Button>
      </div>
    );
  }

  const getGSTType = () => {
    if (sale.gst_breakdown.cgst > 0) return 'Intra-State (CGST + SGST)';
    return 'Inter-State (IGST)';
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button
          variant="ghost"
          onClick={() => navigate('/sales')}
          className="text-[#78716C] hover:text-[#D4AF37]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sales
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSendEmail}
            className="border-[#E7E5E4]"
            data-testid="email-invoice-button"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email to Customer
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="border-[#E7E5E4]"
            data-testid="print-invoice-button"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Invoice */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-lg p-8" data-testid="invoice-detail">
        {/* Header */}
        <div className="border-b-2 border-[#D4AF37] pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-[#1C1917] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Tax Invoice
              </h1>
              <p className="text-lg text-[#78716C]">Gilded Ledger</p>
              <p className="text-sm text-[#78716C]">Gold Jewellery ERP</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                {sale.invoice_number}
              </p>
              <p className="text-sm text-[#78716C] mt-1">
                Date: {new Date(sale.created_at).toLocaleDateString('en-IN')}
              </p>
              <Badge className="mt-2 bg-green-100 text-green-700 border-0">
                {sale.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-[#78716C] mb-2">BILL TO</h3>
            <div className="text-[#1C1917]">
              <p className="font-semibold text-lg">{sale.customer.name}</p>
              <p className="text-sm">{sale.customer.address}</p>
              <p className="text-sm">{sale.customer.city}, {sale.customer.state} - {sale.customer.pincode}</p>
              <p className="text-sm mt-1">Phone: {sale.customer.phone}</p>
              {sale.customer.email && <p className="text-sm">Email: {sale.customer.email}</p>}
              {sale.customer.gstin && (
                <p className="text-sm mt-1">
                  <strong>GSTIN:</strong> {sale.customer.gstin}
                </p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#78716C] mb-2">PAYMENT DETAILS</h3>
            <div className="text-[#1C1917]">
              <p className="text-sm">
                <strong>Method:</strong> {sale.payment_method.replace('_', ' ').toUpperCase()}
              </p>
              <p className="text-sm">
                <strong>GST Type:</strong> {getGSTType()}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full">
            <thead className="bg-[#FAFAF9] border-y border-[#E7E5E4]">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1C1917]">Item</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-[#1C1917]">HSN</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-[#1C1917]">Qty</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#1C1917]">Rate</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#1C1917]">Taxable Amt</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#1C1917]">GST</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#1C1917]">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={index} className="border-b border-[#E7E5E4]">
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#1C1917]">{item.product_name}</p>
                    <p className="text-xs text-[#78716C]">SKU: {item.sku}</p>
                  </td>
                  <td className="text-center py-3 px-4 text-sm">{item.hsn_code}</td>
                  <td className="text-center py-3 px-4 text-sm">{item.quantity}</td>
                  <td className="text-right py-3 px-4 text-sm">₹{item.unit_price.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-sm">₹{item.total_before_tax.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-sm">₹{item.tax_amount.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 font-medium">₹{item.total_after_tax.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-full md:w-1/2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#78716C]">Subtotal (Before Tax)</span>
              <span className="font-medium">₹{sale.subtotal.toLocaleString()}</span>
            </div>
            
            {sale.gst_breakdown.cgst > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-[#78716C]">CGST ({sale.items[0]?.gst_rate / 2}%)</span>
                  <span className="font-medium">₹{sale.gst_breakdown.cgst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#78716C]">SGST ({sale.items[0]?.gst_rate / 2}%)</span>
                  <span className="font-medium">₹{sale.gst_breakdown.sgst.toLocaleString()}</span>
                </div>
              </>
            )}
            
            {sale.gst_breakdown.igst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#78716C]">IGST ({sale.items[0]?.gst_rate}%)</span>
                <span className="font-medium">₹{sale.gst_breakdown.igst.toLocaleString()}</span>
              </div>
            )}
            
            <div className="border-t-2 border-[#D4AF37] pt-2 flex justify-between items-center">
              <span className="text-lg font-semibold text-[#1C1917]">Grand Total</span>
              <span className="text-2xl font-bold text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                ₹{sale.grand_total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {sale.notes && (
          <div className="border-t border-[#E7E5E4] pt-4">
            <p className="text-sm text-[#78716C]">
              <strong>Notes:</strong> {sale.notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#E7E5E4] mt-8 pt-4 text-center">
          <p className="text-sm text-[#78716C]">
            Thank you for your business!
          </p>
          <p className="text-xs text-[#78716C] mt-1">
            This is a computer-generated invoice and does not require a signature
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;

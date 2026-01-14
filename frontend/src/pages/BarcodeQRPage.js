import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  QrCode,
  Barcode,
  Search,
  Download,
  RefreshCw,
  Package,
  IndianRupee,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BarcodeQRPage = () => {
  const { token } = useAuth();
  const [barcodes, setBarcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [barcodeType, setBarcodeType] = useState('barcode');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchBarcodes();
    fetchProducts();
  }, []);

  const fetchBarcodes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/barcode/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBarcodes(response.data);
    } catch (error) {
      console.error('Error fetching barcodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/inventory/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const generateBarcode = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/barcode/generate`,
        {
          product_id: selectedProduct,
          barcode_type: barcodeType
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Barcode generated successfully');
      fetchBarcodes();
      setSelectedProduct('');
    } catch (error) {
      console.error('Error generating barcode:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate barcode');
    } finally {
      setGenerating(false);
    }
  };

  const scanBarcode = async () => {
    if (!scanInput.trim()) {
      toast.error('Please enter a barcode value');
      return;
    }

    setScanning(true);
    setScanResult(null);
    try {
      const response = await axios.post(
        `${API_URL}/api/barcode/scan?barcode_value=${encodeURIComponent(scanInput)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setScanResult(response.data);
      if (!response.data.found) {
        toast.error('Product not found');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const downloadBarcode = (barcode) => {
    if (!barcode.barcode_image_base64) {
      toast.error('No barcode image available');
      return;
    }

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${barcode.barcode_image_base64}`;
    link.download = `barcode_${barcode.barcode_value}.png`;
    link.click();
  };

  return (
    <div className="p-6 space-y-6" data-testid="barcode-qr-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Barcode & QR Code
          </h1>
          <p className="text-[#78716C] mt-1">Generate and scan product barcodes</p>
        </div>
        <Button variant="outline" onClick={fetchBarcodes} className="border-[#D4AF37] text-[#D4AF37]">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate Barcode */}
        <Card className="border-[#E7E5E4]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-[#D4AF37]" />
              Generate Barcode
            </CardTitle>
            <CardDescription>Create barcode or QR code for products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Product</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.sku || 'No SKU'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={barcodeType} onValueChange={setBarcodeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barcode">
                    <div className="flex items-center gap-2">
                      <Barcode className="w-4 h-4" /> Barcode
                    </div>
                  </SelectItem>
                  <SelectItem value="qr_code">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4" /> QR Code
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={generateBarcode}
              disabled={generating || !selectedProduct}
              className="w-full bg-[#D4AF37] hover:bg-[#B8942D] text-white"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : barcodeType === 'qr_code' ? (
                <QrCode className="w-4 h-4 mr-2" />
              ) : (
                <Barcode className="w-4 h-4 mr-2" />
              )}
              Generate {barcodeType === 'qr_code' ? 'QR Code' : 'Barcode'}
            </Button>
          </CardContent>
        </Card>

        {/* Scan Barcode */}
        <Card className="border-[#E7E5E4]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-[#D4AF37]" />
              Scan & Lookup
            </CardTitle>
            <CardDescription>Find product by scanning barcode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter or scan barcode..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && scanBarcode()}
              />
              <Button
                onClick={scanBarcode}
                disabled={scanning}
                className="bg-[#D4AF37] hover:bg-[#B8942D] text-white"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {/* Scan Result */}
            {scanResult && (
              <div className={`p-4 rounded-lg border ${scanResult.found ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {scanResult.found ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Product Found</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[#78716C]">Name</p>
                        <p className="font-medium">{scanResult.product_details?.name}</p>
                      </div>
                      <div>
                        <p className="text-[#78716C]">Purity</p>
                        <p className="font-medium">{scanResult.product_details?.gold_purity}</p>
                      </div>
                      <div>
                        <p className="text-[#78716C]">Weight</p>
                        <p className="font-medium">{scanResult.product_details?.weight}g</p>
                      </div>
                      <div>
                        <p className="text-[#78716C]">Stock</p>
                        <p className={`font-medium ${scanResult.stock_info?.is_low_stock ? 'text-red-600' : 'text-green-600'}`}>
                          {scanResult.stock_info?.quantity_in_stock} units
                        </p>
                      </div>
                    </div>
                    {scanResult.price_info && (
                      <div className="pt-2 border-t">
                        <p className="text-[#78716C] text-sm">Estimated Price</p>
                        <p className="text-xl font-bold text-[#D4AF37]">
                          ₹{scanResult.price_info.total?.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="w-5 h-5" />
                    <span>Product not found for this barcode</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barcodes List */}
      <Card className="border-[#E7E5E4]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#D4AF37]" />
            Generated Barcodes ({barcodes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
            </div>
          ) : barcodes.length === 0 ? (
            <div className="text-center py-8 text-[#78716C]">
              No barcodes generated yet. Generate your first barcode above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Barcode Value</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barcodes.map((barcode) => (
                  <TableRow key={barcode.id}>
                    <TableCell className="font-medium">{barcode.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {barcode.barcode_type === 'qr_code' ? (
                          <><QrCode className="w-3 h-3 mr-1" /> QR</>
                        ) : (
                          <><Barcode className="w-3 h-3 mr-1" /> Barcode</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{barcode.barcode_value}</TableCell>
                    <TableCell>
                      {barcode.barcode_image_base64 && (
                        <img
                          src={`data:image/png;base64,${barcode.barcode_image_base64}`}
                          alt="Barcode"
                          className="h-12 object-contain"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-[#78716C]">
                      {barcode.created_at?.split('T')[0]}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadBarcode(barcode)}
                      >
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
    </div>
  );
};

export default BarcodeQRPage;

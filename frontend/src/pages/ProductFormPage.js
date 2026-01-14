import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const ProductFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    gold_weight: '',
    purity: '22K',
    making_charges: '',
    stone_weight: '',
    stone_charges: '',
    hallmark_number: '',
    hsn_code: '71131900',
    base_price: '',
    gst_rate: '3',
    quantity: '',
    low_stock_threshold: '5',
    images: []
  });

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/inventory/categories');
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to fetch categories');
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/inventory/products/${id}`);
      const product = response.data;
      setFormData({
        name: product.name,
        sku: product.sku,
        description: product.description || '',
        category: product.category,
        gold_weight: product.gold_weight.toString(),
        purity: product.purity,
        making_charges: product.making_charges.toString(),
        stone_weight: product.stone_weight.toString(),
        stone_charges: product.stone_charges.toString(),
        hallmark_number: product.hallmark_number || '',
        hsn_code: product.hsn_code,
        base_price: product.base_price.toString(),
        gst_rate: product.gst_rate.toString(),
        quantity: product.quantity.toString(),
        low_stock_threshold: product.low_stock_threshold.toString(),
        images: product.images
      });
    } catch (error) {
      toast.error('Failed to fetch product');
    }
  };

  const calculateBasePrice = () => {
    const goldWeight = parseFloat(formData.gold_weight) || 0;
    const makingCharges = parseFloat(formData.making_charges) || 0;
    const stoneCharges = parseFloat(formData.stone_charges) || 0;
    
    // Assuming 22K gold rate of ₹5,910 per gram (can be made dynamic)
    const goldRates = { '24K': 6450, '22K': 5910, '18K': 4840, '14K': 3760 };
    const goldPrice = goldWeight * goldRates[formData.purity];
    
    const basePrice = goldPrice + makingCharges + stoneCharges;
    setFormData(prev => ({ ...prev, base_price: basePrice.toFixed(2) }));
  };

  useEffect(() => {
    if (formData.gold_weight && formData.making_charges !== '') {
      calculateBasePrice();
    }
  }, [formData.gold_weight, formData.purity, formData.making_charges, formData.stone_charges]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        category: formData.category,
        gold_weight: parseFloat(formData.gold_weight),
        purity: formData.purity,
        making_charges: parseFloat(formData.making_charges),
        stone_weight: parseFloat(formData.stone_weight) || 0,
        stone_charges: parseFloat(formData.stone_charges) || 0,
        hallmark_number: formData.hallmark_number || null,
        hsn_code: formData.hsn_code,
        base_price: parseFloat(formData.base_price),
        gst_rate: parseFloat(formData.gst_rate),
        quantity: parseInt(formData.quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        images: formData.images
      };

      if (id) {
        await api.patch(`/inventory/products/${id}`, productData);
        toast.success('Product updated successfully');
      } else {
        await api.post('/inventory/products', productData);
        toast.success('Product created successfully');
      }
      
      navigate('/inventory');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('inventory_all')) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
        <p className="text-[#78716C]">You don't have permission to manage products.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/inventory')}
          className="mb-4 text-[#78716C] hover:text-[#D4AF37]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inventory
        </Button>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
          {id ? 'Edit Product' : 'Add New Product'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                data-testid="product-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                data-testid="product-sku-input"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
                disabled={!!id}
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              data-testid="product-description-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger data-testid="product-category-select" className="border-[#E7E5E4]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Gold Details */}
        <div className="space-y-4 pt-4 border-t border-[#E7E5E4]">
          <h3 className="text-xl font-semibold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Gold Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gold_weight">Gold Weight (grams) *</Label>
              <Input
                id="gold_weight"
                type="number"
                step="0.01"
                data-testid="gold-weight-input"
                value={formData.gold_weight}
                onChange={(e) => setFormData({ ...formData, gold_weight: e.target.value })}
                required
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purity">Purity *</Label>
              <Select value={formData.purity} onValueChange={(value) => setFormData({ ...formData, purity: value })}>
                <SelectTrigger data-testid="purity-select" className="border-[#E7E5E4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24K">24K</SelectItem>
                  <SelectItem value="22K">22K</SelectItem>
                  <SelectItem value="18K">18K</SelectItem>
                  <SelectItem value="14K">14K</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="making_charges">Making Charges (₹) *</Label>
              <Input
                id="making_charges"
                type="number"
                step="0.01"
                data-testid="making-charges-input"
                value={formData.making_charges}
                onChange={(e) => setFormData({ ...formData, making_charges: e.target.value })}
                required
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hallmark_number">Hallmark Number</Label>
              <Input
                id="hallmark_number"
                data-testid="hallmark-input"
                value={formData.hallmark_number}
                onChange={(e) => setFormData({ ...formData, hallmark_number: e.target.value })}
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hsn_code">HSN Code *</Label>
              <Input
                id="hsn_code"
                data-testid="hsn-code-input"
                value={formData.hsn_code}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                required
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {/* Stone Details */}
        <div className="space-y-4 pt-4 border-t border-[#E7E5E4]">
          <h3 className="text-xl font-semibold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Stone Details (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stone_weight">Stone Weight (carats)</Label>
              <Input
                id="stone_weight"
                type="number"
                step="0.01"
                data-testid="stone-weight-input"
                value={formData.stone_weight}
                onChange={(e) => setFormData({ ...formData, stone_weight: e.target.value })}
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stone_charges">Stone Charges (₹)</Label>
              <Input
                id="stone_charges"
                type="number"
                step="0.01"
                data-testid="stone-charges-input"
                value={formData.stone_charges}
                onChange={(e) => setFormData({ ...formData, stone_charges: e.target.value })}
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="space-y-4 pt-4 border-t border-[#E7E5E4]">
          <h3 className="text-xl font-semibold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Pricing & Stock
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price (₹) *</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                data-testid="base-price-input"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                required
                className="border-[#E7E5E4] focus:ring-[#D4AF37] bg-[#FEFCE8]"
              />
              <p className="text-xs text-[#78716C]">Auto-calculated from gold + charges</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst_rate">GST Rate (%) *</Label>
              <Input
                id="gst_rate"
                type="number"
                step="0.01"
                data-testid="gst-rate-input"
                value={formData.gst_rate}
                onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                required
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
            <div className="space-y-2">
              <Label>Selling Price (incl. GST)</Label>
              <div className="text-2xl font-bold text-[#D4AF37] p-2 bg-[#FEFCE8] rounded-md" style={{ fontFamily: 'Playfair Display, serif' }}>
                ₹{(parseFloat(formData.base_price) * (1 + parseFloat(formData.gst_rate) / 100) || 0).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                data-testid="quantity-input"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">Low Stock Alert Threshold *</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                data-testid="low-stock-threshold-input"
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                required
                className="border-[#E7E5E4] focus:ring-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/inventory')}
            className="border-[#E7E5E4]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            data-testid="save-product-button"
            className="bg-[#D4AF37] hover:bg-[#B5952F] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : id ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductFormPage;

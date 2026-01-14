import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
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
import {
  Gem,
  Calculator,
  IndianRupee,
  Percent,
  Save,
  RefreshCw,
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const KaratPricingPage = () => {
  const { token } = useAuth();
  const [pricingList, setPricingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Calculator state
  const [calcKarat, setCalcKarat] = useState('22K');
  const [calcWeight, setCalcWeight] = useState('');
  const [calcMakingType, setCalcMakingType] = useState('per_gram');
  const [calcIncludeGST, setCalcIncludeGST] = useState(true);
  const [calcStoneValue, setCalcStoneValue] = useState('');
  const [calcDiscount, setCalcDiscount] = useState('');
  const [calculationResult, setCalculationResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/karat-pricing/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPricingList(response.data);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      toast.error('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = async () => {
    try {
      await axios.post(`${API_URL}/api/karat-pricing/initialize-defaults`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Default pricing initialized');
      fetchPricing();
    } catch (error) {
      toast.error('Failed to initialize defaults');
    }
  };

  const updatePricing = async (karat, field, value) => {
    const pricing = pricingList.find(p => p.karat === karat);
    if (!pricing) return;

    try {
      await axios.patch(
        `${API_URL}/api/karat-pricing/${karat}`,
        { [field]: parseFloat(value) || 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${karat} pricing updated`);
      fetchPricing();
    } catch (error) {
      toast.error('Failed to update pricing');
    }
  };

  const calculatePrice = async () => {
    if (!calcWeight || parseFloat(calcWeight) <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }

    setCalculating(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/karat-pricing/calculate`,
        {
          karat: calcKarat,
          weight_grams: parseFloat(calcWeight),
          making_charge_type: calcMakingType,
          include_gst: calcIncludeGST,
          stone_value: parseFloat(calcStoneValue) || 0,
          discount_percentage: parseFloat(calcDiscount) || 0
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCalculationResult(response.data);
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error(error.response?.data?.detail || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const karatOptions = ['24K', '22K', '21K', '18K', '14K', '10K', '9K'];

  return (
    <div className="p-6 space-y-6" data-testid="karat-pricing-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Karat Pricing
          </h1>
          <p className="text-[#78716C] mt-1">Configure gold pricing by karat purity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPricing} className="border-[#D4AF37] text-[#D4AF37]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={initializeDefaults} className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
            Initialize Defaults
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Table */}
        <Card className="border-[#E7E5E4]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-[#D4AF37]" />
              Pricing Configuration
            </CardTitle>
            <CardDescription>Set rates for each karat purity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
              </div>
            ) : pricingList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#78716C] mb-4">No pricing configured yet.</p>
                <Button onClick={initializeDefaults} className="bg-[#D4AF37] hover:bg-[#B8942D] text-white">
                  Initialize Default Pricing
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karat</TableHead>
                    <TableHead>Purity</TableHead>
                    <TableHead>Rate/gram</TableHead>
                    <TableHead>Making/gram</TableHead>
                    <TableHead>Wastage %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingList.map((pricing) => (
                    <TableRow key={pricing.karat}>
                      <TableCell className="font-medium">{pricing.karat}</TableCell>
                      <TableCell>{pricing.purity_percentage}%</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.base_rate_per_gram}
                          onChange={(e) => updatePricing(pricing.karat, 'base_rate_per_gram', e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.making_charge_per_gram}
                          onChange={(e) => updatePricing(pricing.karat, 'making_charge_per_gram', e.target.value)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.5"
                          value={pricing.wastage_percentage}
                          onChange={(e) => updatePricing(pricing.karat, 'wastage_percentage', e.target.value)}
                          className="w-16"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Price Calculator */}
        <Card className="border-[#E7E5E4]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#D4AF37]" />
              Price Calculator
            </CardTitle>
            <CardDescription>Calculate jewelry price based on weight and karat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Karat</Label>
                <Select value={calcKarat} onValueChange={setCalcKarat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {karatOptions.map(k => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weight (grams) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(e.target.value)}
                  placeholder="e.g., 10.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Making Charge Type</Label>
                <Select value={calcMakingType} onValueChange={setCalcMakingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_gram">Per Gram</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stone Value (₹)</Label>
                <Input
                  type="number"
                  value={calcStoneValue}
                  onChange={(e) => setCalcStoneValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  value={calcDiscount}
                  onChange={(e) => setCalcDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  checked={calcIncludeGST}
                  onCheckedChange={setCalcIncludeGST}
                />
                <Label>Include GST (3%)</Label>
              </div>
            </div>
            
            <Button 
              onClick={calculatePrice} 
              disabled={calculating}
              className="w-full bg-[#D4AF37] hover:bg-[#B8942D] text-white"
            >
              {calculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
              Calculate Price
            </Button>

            {calculationResult && (
              <div className="mt-4 p-4 bg-[#FEFCE8] rounded-lg border border-[#D4AF37]/20">
                <h4 className="font-semibold text-[#1C1917] mb-3">Price Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Gold Value ({calculationResult.karat}, {calculationResult.weight_grams}g × ₹{calculationResult.gold_rate_per_gram})</span>
                    <span>₹{calculationResult.gold_value?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Making Charges</span>
                    <span>₹{calculationResult.making_charges?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Wastage Charges</span>
                    <span>₹{calculationResult.wastage_charges?.toLocaleString()}</span>
                  </div>
                  {calculationResult.stone_value > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#78716C]">Stone Value</span>
                      <span>₹{calculationResult.stone_value?.toLocaleString()}</span>
                    </div>
                  )}
                  {calculationResult.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-₹{calculationResult.discount_amount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-[#78716C]">Taxable Amount</span>
                      <span>₹{calculationResult.taxable_amount?.toLocaleString()}</span>
                    </div>
                  </div>
                  {calculationResult.total_gst > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">CGST (1.5%)</span>
                        <span>₹{calculationResult.cgst?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">SGST (1.5%)</span>
                        <span>₹{calculationResult.sgst?.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold text-[#D4AF37]">
                      <span>Grand Total</span>
                      <span>₹{calculationResult.grand_total?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KaratPricingPage;

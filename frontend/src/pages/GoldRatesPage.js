import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { TrendingUp, TrendingDown, RefreshCw, History, Zap } from 'lucide-react';
import { toast } from 'sonner';

const GoldRatesPage = () => {
  const { hasPermission } = useAuth();
  const [currentRates, setCurrentRates] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newRates, setNewRates] = useState({
    '24K': '',
    '22K': '',
    '18K': '',
    '14K': ''
  });

  useEffect(() => {
    if (hasPermission('inventory_read')) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ratesRes, historyRes] = await Promise.all([
        api.get('/gold-rates/current'),
        api.get('/gold-rates/history?days=30')
      ]);
      setCurrentRates(ratesRes.data);
      setHistory(historyRes.data);
      
      // Populate form with current rates
      if (ratesRes.data.rates) {
        const rateMap = {};
        ratesRes.data.rates.forEach(rate => {
          rateMap[rate.purity] = rate.rate_per_gram.toString();
        });
        setNewRates(prevRates => ({ ...prevRates, ...rateMap }));
      }
    } catch (error) {
      toast.error('Failed to fetch gold rates');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRates = async () => {
    const rates = [];
    
    Object.entries(newRates).forEach(([purity, rate]) => {
      if (rate && parseFloat(rate) > 0) {
        rates.push({
          purity: purity,
          rate_per_gram: parseFloat(rate)
        });
      }
    });

    if (rates.length === 0) {
      toast.error('Please enter at least one rate');
      return;
    }

    setUpdating(true);
    try {
      await api.post('/gold-rates/', rates);
      toast.success('Gold rates updated successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to update gold rates');
    } finally {
      setUpdating(false);
    }
  };

  const handleApplyToProd = async () => {
    if (!window.confirm('This will recalculate all product prices based on current gold rates. Continue?')) {
      return;
    }

    setUpdating(true);
    try {
      const response = await api.patch('/gold-rates/apply-to-products');
      toast.success(response.data.message);
      toast.info(`${response.data.products_updated} products updated`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to apply rates');
    } finally {
      setUpdating(false);
    }
  };

  const getRateColor = (purity) => {
    const colors = {
      '24K': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      '22K': 'bg-amber-100 text-amber-700 border-amber-300',
      '18K': 'bg-orange-100 text-orange-700 border-orange-300',
      '14K': 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[purity] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (!hasPermission('inventory_read')) {
    return (
      <div className="p-8 text-center">
        <TrendingUp className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
        <p className="text-[#78716C]">You don't have permission to view gold rates.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Gold Rate Management
        </h1>
        <p className="text-[#78716C] mt-2">Manage daily gold rates and auto-update product prices</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#78716C]">Loading gold rates...</p>
        </div>
      ) : (
        <>
          {/* Current Rates Display */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['24K', '22K', '18K', '14K'].map((purity) => {
              const rate = currentRates?.rates?.find(r => r.purity === purity);
              return (
                <div 
                  key={purity}
                  className={`border-2 rounded-lg shadow-sm p-6 ${getRateColor(purity)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold">{purity} Gold</h3>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  {rate ? (
                    <>
                      <p className="text-3xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                        ₹{rate.rate_per_gram.toLocaleString()}
                      </p>
                      <p className="text-xs opacity-75">per gram</p>
                      <p className="text-xs mt-2 opacity-75">
                        Updated: {new Date(rate.created_at).toLocaleDateString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm opacity-75">No rate set</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Update Rates Form */}
          {hasPermission('inventory_all') && (
            <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Update Today's Rates
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {['24K', '22K', '18K', '14K'].map((purity) => (
                  <div key={purity} className="space-y-2">
                    <Label>{purity} Gold (₹/gram)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newRates[purity]}
                      onChange={(e) => setNewRates({...newRates, [purity]: e.target.value})}
                      placeholder="Enter rate"
                      className="border-[#E7E5E4] focus:ring-[#D4AF37]"
                      data-testid={`rate-input-${purity}`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleUpdateRates}
                  disabled={updating}
                  data-testid="update-rates-button"
                  className="bg-[#D4AF37] hover:bg-[#B5952F] text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {updating ? 'Updating...' : 'Update Rates'}
                </Button>

                <Button
                  onClick={handleApplyToProd}
                  disabled={updating}
                  variant="outline"
                  data-testid="apply-to-products-button"
                  className="border-[#E7E5E4] hover:border-[#D4AF37] hover:text-[#D4AF37]"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Apply to All Products
                </Button>
              </div>

              <p className="text-xs text-[#78716C] mt-3">
                * Updating rates will create a new record. Applying to products will recalculate all product prices based on gold weight and current rates.
              </p>
            </div>
          )}

          {/* Rate History */}
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                Rate History (Last 30 Days)
              </h3>
            </div>

            {history.length === 0 ? (
              <p className="text-center text-[#78716C] py-8">No rate history available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#FAFAF9] border-y border-[#E7E5E4]">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Purity</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Rate (₹/gram)</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 50).map((item, idx) => (
                      <tr key={idx} className="border-b border-[#E7E5E4]">
                        <td className="py-3 px-4 text-sm">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded ${getRateColor(item.purity).split(' ')[0]}`}>
                            {item.purity}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 text-sm font-medium">
                          ₹{item.rate_per_gram.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-sm">
                          {item.change_percentage !== null && item.change_percentage !== 0 ? (
                            <span className={`flex items-center justify-end gap-1 ${item.change_percentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.change_percentage > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {Math.abs(item.change_percentage).toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-[#78716C]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GoldRatesPage;

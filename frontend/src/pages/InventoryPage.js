import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Package, Plus, Search, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const InventoryPage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    if (hasPermission('inventory_read')) {
      fetchData();
    }
  }, [selectedCategory, showLowStock]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/inventory/products', {
          params: {
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            low_stock: showLowStock || undefined
          }
        }),
        api.get('/inventory/categories')
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await api.delete(`/inventory/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPurityBadgeColor = (purity) => {
    const colors = {
      '24K': 'bg-yellow-100 text-yellow-700',
      '22K': 'bg-amber-100 text-amber-700',
      '18K': 'bg-orange-100 text-orange-700',
      '14K': 'bg-red-100 text-red-700'
    };
    return colors[purity] || 'bg-gray-100 text-gray-700';
  };

  if (!hasPermission('inventory_read')) {
    return (
      <div className="p-8 text-center">
        <Package className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
        <p className="text-[#78716C]">You don't have permission to view inventory.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Inventory Management
          </h1>
          <p className="text-[#78716C] mt-2">{products.length} products in stock</p>
        </div>
        {hasPermission('inventory_all') && (
          <Button
            onClick={() => navigate('/inventory/add')}
            data-testid="add-product-button"
            className="bg-[#D4AF37] hover:bg-[#B5952F] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#78716C] w-4 h-4" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#E7E5E4] focus:ring-[#D4AF37]"
                data-testid="search-input"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger data-testid="category-filter" className="border-[#E7E5E4]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name} ({cat.product_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showLowStock ? 'default' : 'outline'}
            onClick={() => setShowLowStock(!showLowStock)}
            data-testid="low-stock-filter"
            className={showLowStock ? 'bg-[#D4AF37] hover:bg-[#B5952F]' : 'border-[#E7E5E4]'}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Low Stock
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#78716C]">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E7E5E4] rounded-lg">
          <Package className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
          <h3 className="text-xl font-semibold text-[#1C1917] mb-2">No products found</h3>
          <p className="text-[#78716C]">Try adjusting your filters or add new products</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              data-testid={`product-card-${product.id}`}
              className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Product Image */}
              <div className="h-48 bg-gradient-to-br from-[#FEFCE8] to-[#F5F5F4] flex items-center justify-center">
                {product.images.length > 0 ? (
                  <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="w-16 h-16 text-[#D4AF37]" />
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-[#1C1917] line-clamp-1">{product.name}</h3>
                    {product.is_low_stock && (
                      <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#78716C]">SKU: {product.sku}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={`${getPurityBadgeColor(product.purity)} border-0 text-xs`}>
                    {product.purity}
                  </Badge>
                  <Badge className="bg-[#F5F5F4] text-[#78716C] border-0 text-xs">
                    {product.category}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Gold Weight:</span>
                    <span className="font-medium text-[#1C1917]">{product.gold_weight}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Stock:</span>
                    <span className="font-medium text-[#1C1917]">{product.quantity} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Making Charges:</span>
                    <span className="font-medium text-[#1C1917]">₹{product.making_charges}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E7E5E4]">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-xs text-[#78716C]">Selling Price (incl. GST)</p>
                      <p className="text-2xl font-bold text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                        ₹{product.selling_price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {hasPermission('inventory_all') && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/inventory/edit/${product.id}`)}
                        className="flex-1 border-[#E7E5E4] hover:border-[#D4AF37] hover:text-[#D4AF37]"
                        data-testid={`edit-product-${product.id}`}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="border-[#E7E5E4] hover:border-red-500 hover:text-red-500"
                        data-testid={`delete-product-${product.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
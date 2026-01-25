import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Check, Star, Truck, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../hooks/use-toast';
import Navigation from '../components/Navigation';
import FirebaseService, { Product } from '../services/firebaseService';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCapacity, setSelectedCapacity] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const capacityOptions = ['128GB', '256GB', '512GB', '1TB'];
  const colorOptions = ['Space Black', 'Deep Purple', 'Gold', 'Silver'];

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const fetchedProduct = await FirebaseService.getProductById(id || '');
      setProduct(fetchedProduct);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const needsCapacity = product.brand === 'Apple' || product.brand === 'Samsung';

  const handleAddToCart = () => {
    if (needsCapacity && !selectedCapacity) {
      toast({
        title: 'Please select options',
        description: 'Please select a storage capacity before adding to cart.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedColor) {
      toast({
        title: 'Please select options',
        description: 'Please select a color before adding to cart.',
        variant: 'destructive',
      });
      return;
    }

    addItem(product);
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleWhatsAppOrder = () => {
    if (needsCapacity && !selectedCapacity) {
      toast({
        title: 'Please select options',
        description: 'Please select a storage capacity before ordering.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedColor) {
      toast({
        title: 'Please select options',
        description: 'Please select a color before ordering.',
        variant: 'destructive',
      });
      return;
    }

    const message = `Hi! I'd like to order:
    
Product: ${product.name}
Brand: ${product.brand}
Capacity: ${needsCapacity ? selectedCapacity : 'N/A'}  
Color: ${selectedColor}
Price: KSh ${product.price.toLocaleString()}

Please confirm availability and delivery details.`;

    const whatsappUrl = `https://wa.me/+254742312545?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-muted to-muted/50 p-8 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400';
                }}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {product.isNew && <Badge className="bg-green-600 text-white">New</Badge>}
                {product.isBestSeller && <Badge variant="outline" className="border-yellow-500 text-yellow-600">Best Seller</Badge>}
              </div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <p className="text-muted-foreground mb-4">{product.description}</p>
              
              <div className="flex items-center gap-4 mb-6">
                <span className="text-3xl font-bold text-blue-600">
                  KSh {product.price.toLocaleString()}
                </span>
                {product.originalPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    KSh {product.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {needsCapacity && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Storage Capacity</label>
                  <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      {capacityOptions.map((capacity) => (
                        <SelectItem key={capacity} value={capacity}>
                          {capacity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <Select value={selectedColor} onValueChange={setSelectedColor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Key Features</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Specifications</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brand</span>
                  <span className="font-medium">{product.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Availability</span>
                  <span className={product.inStock ? 'text-green-600 font-medium' : 'text-red-600'}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                {product.features[0] && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Display</span>
                    <span>{product.features[0]}</span>
                  </div>
                )}
                {product.features[1] && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processor</span>
                    <span>{product.features[1]}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
                disabled={!product.inStock}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </Button>
              
              <Button
                onClick={handleWhatsAppOrder}
                variant="outline"
                className="w-full bg-green-600 text-white hover:bg-green-700 hover:text-white"
                size="lg"
                disabled={!product.inStock}
              >
                Order via WhatsApp
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span>Free Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span>Genuine Products</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
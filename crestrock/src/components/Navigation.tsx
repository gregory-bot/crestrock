import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Search, Menu, X, Home, Info, Phone } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { products } from '../data/products';
import type { Product } from '../types/product';
import { useCart } from '../contexts/CartContext';

interface NavigationProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCartClick?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({
  searchQuery,
  onSearchChange,
  onCartClick
}) => {
  const { itemCount } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Use absolute path for the logo image
  const logoImage = '/logo.png';

  const navigationItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Shop', path: '/shop', icon: ShoppingCart },
    { name: 'About Us', path: '/about', icon: Info },
    { name: 'Contact', path: '/contact', icon: Phone },
  ];

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const closeMenu = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsAnimatingOut(false);
    }, 300);
  };

  const handleNavClick = (path: string) => {
    if (path === '/') {
      navigate('/');
    } else {
      navigate(path);
    }
    closeMenu();
  };

  const updateSuggestions = (q: string) => {
    const v = q.trim().toLowerCase();
    if (!v) {
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }

    const matches = products.filter(p => 
      p.name.toLowerCase().includes(v) || 
      p.brand.toLowerCase().includes(v) ||
      p.description.toLowerCase().includes(v)
    ).slice(0, 8);
    
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
    setHighlightedIndex(-1);
  };

  useEffect(() => {
    updateSuggestions(searchQuery);
  }, [searchQuery]);

  const handleProductClick = (productId: string) => {
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    onSearchChange('');
    navigate(`/product/${productId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleProductClick(suggestions[highlightedIndex].id);
      } else if (suggestions.length > 0) {
        handleProductClick(suggestions[0].id);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleCartClick = () => {
    if (onCartClick) {
      onCartClick();
    } else {
      navigate('/cart');
    }
    closeMenu();
  };

  // Handle suggestion item click with better event handling
  const handleSuggestionClick = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    handleProductClick(productId);
  };

  return (
    <>
      <nav className="sticky top-0 bg-white shadow-md z-50 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 no-underline">
              <div className="w-16 h-12 flex items-center justify-center">
                <img
                  src={logoImage}
                  alt="Gadgets by Crestrock logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Failed to load logo:', logoImage);
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x48/3b82f6/ffffff?text=Logo';
                  }}
                />
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-gray-800">
                  Gadgets by Crestrock
                </h1>
                <p className="text-xs text-gray-500">Your One-Stop Tech Shop</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    location.pathname === item.path ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-6" ref={searchRef}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search Laptops, iPhones, Samsung phones..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="pl-10 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white shadow-lg rounded-lg overflow-hidden z-[100] border border-gray-200 max-h-96 overflow-y-auto">
                    {suggestions.map((product, idx) => (
                      <button
                        key={product.id}
                        onMouseDown={() => handleProductClick(product.id)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full text-left flex items-center gap-3 p-3 transition-colors cursor-pointer ${
                          highlightedIndex === idx ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-12 h-12 object-cover rounded flex-shrink-0"
                          onError={(e) => {
                            console.error('Failed to load product image:', product.image);
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{product.name}</div>
                          <div className="text-xs text-gray-500">
                            {product.brand} • KES {product.price?.toLocaleString()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Desktop Cart */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCartClick}
                className="relative hover:bg-blue-50"
              >
                <ShoppingCart className="w-5 h-5 text-gray-700" />
                {itemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
                  >
                    {itemCount}
                  </Badge>
                )}
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isMobileMenuOpen) {
                    closeMenu();
                  } else {
                    setIsMobileMenuOpen(true);
                  }
                }}
                className="lg:hidden"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-3" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search laptops, phones..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                className="pl-10 border border-gray-300 focus:border-blue-500"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white shadow-lg rounded-lg overflow-hidden z-[100] border border-gray-200 max-h-80 overflow-y-auto">
                  {suggestions.map((product) => (
                    <button
                      key={product.id}
                      onMouseDown={() => handleProductClick(product.id)}
                      className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                          console.error('Failed to load product image:', product.image);
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{product.name}</div>
                        <div className="text-xs text-gray-500">
                          {product.brand} • KES {product.price?.toLocaleString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {(isMobileMenuOpen || isAnimatingOut) && (
        <div className={`fixed inset-0 z-[100] lg:hidden ${isAnimatingOut ? 'animate-fade-out' : 'animate-fade-in'}`}>
          <div 
            className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${isAnimatingOut ? 'opacity-0' : 'opacity-100'}`} 
            onClick={closeMenu} 
          />
          <div 
            ref={mobileMenuRef}
            className={`fixed left-0 top-0 h-full w-64 bg-white border-r shadow-lg transition-transform duration-300 ease-out ${isAnimatingOut ? 'transform -translate-x-full' : 'transform translate-x-0'}`}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-8">
                  <img
                    src={logoImage}
                    alt="Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40x32/3b82f6/ffffff?text=Logo';
                    }}
                  />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMenu}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-2 space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={closeMenu}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    location.pathname === item.path ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
              
              <button
                onClick={handleCartClick}
                className="w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100 relative cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="font-medium">Cart</span>
                {itemCount > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white text-xs">
                    {itemCount}
                  </Badge>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
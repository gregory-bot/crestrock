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

  const navigationItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Shop', path: '/#products', icon: ShoppingCart },
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
    if (path.startsWith('/#')) {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(path.slice(2));
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
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
    onSearchChange(''); // Clear search query
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

  return (
    <>
      <nav className="sticky top-0 bg-blue-100 z-50 glass border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-24 h-20 p-1 flex items-center justify-center">
                <img
                  src="png.jpeg"
                  alt="Gadgets by Crestrock logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-blue-100 bg-clip-text text-blue-600">
                  Gadgets by Crestrock 
                </h1>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.path)}
                  className={`text-xl font-medium text-black transition-colors hover:text-primary ${
                    location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8" ref={searchRef}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
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
                  className="pl-10 glass border-0 focus:ring-2 focus:ring-primary/50"
                />

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white shadow-xl rounded-lg overflow-hidden z-50 border border-gray-200 max-h-96 overflow-y-auto">
                    {suggestions.map((product, idx) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full text-left flex items-center gap-3 p-3 transition-colors ${
                          highlightedIndex === idx ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-12 h-12 object-cover rounded flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
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
            <div className="flex items-center space-x-2">
              {/* Desktop Cart */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCartClick}
                className="relative transition-spring hover:scale-105 hidden sm:flex"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center bg-gradient-accent text-white text-xs font-bold animate-pulse"
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
          <div className="md:hidden mt-2" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search phones..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                className="pl-10 glass border-0 focus:ring-2 focus:ring-primary/50"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white shadow-xl rounded-lg overflow-hidden z-50 border border-gray-200 max-h-80 overflow-y-auto">
                  {suggestions.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product.id)}
                      className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 active:bg-gray-100"
                    >
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
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
        <div className={`fixed inset-0 z-50 lg:hidden ${isAnimatingOut ? 'animate-fade-out' : 'animate-fade-in'}`}>
          <div 
            className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${isAnimatingOut ? 'opacity-0' : 'opacity-100'}`} 
            onClick={closeMenu} 
          />
          <div 
            ref={mobileMenuRef}
            className={`fixed left-0 top-0 h-full w-80 bg-background border-l shadow-large transition-transform duration-300 ease-out ${isAnimatingOut ? 'transform -translate-x-full' : 'transform translate-x-0'}`}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Gadgets by Crestrock</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMenu}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-4 space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-300 hover:bg-muted transform hover:translate-x-2 ${
                    location.pathname === item.path ? 'bg-muted text-primary' : ''
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              ))}
              
              <button
                onClick={handleCartClick}
                className="w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-300 hover:bg-muted transform hover:translate-x-2 relative"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Cart</span>
                {itemCount > 0 && (
                  <Badge className="ml-auto bg-gradient-accent text-white">
                    {itemCount}
                  </Badge>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        
        @keyframes slideOutLeft {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        .animate-slide-in-left {
          animation: slideInLeft 0.3s ease-out forwards;
        }
        
        .animate-slide-out-left {
          animation: slideOutLeft 0.3s ease-in forwards;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-fade-out {
          animation: fadeOut 0.3s ease-in forwards;
        }
      `}</style>
    </>
  );
};

export default Navigation;
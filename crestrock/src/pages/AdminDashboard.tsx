import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Users,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  Plus,
  LogOut,
  Bell,
  ShoppingBag,
  Check,
  X,
  Menu,
  Search,
  Filter,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Info,
  ShoppingCart,
  User,
  MapPin,
  Phone,
  CreditCard,
  Receipt,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FirebaseService, { Product, Order, Notification } from '@/services/firebaseService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    brand: 'Apple',
    price: 0,
    description: '',
    image: '',
    features: [],
    inStock: true,
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [statistics, setStatistics] = useState({
    totalRevenue: 0,
    pendingOrders: 0,
    totalProducts: 0,
    totalOrders: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderDetailsDialog, setOrderDetailsDialog] = useState<{ open: boolean; order: Order | null }>({
    open: false,
    order: null,
  });
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeProducts = FirebaseService.subscribeToProducts(setProducts);
    const unsubscribeOrders = FirebaseService.subscribeToOrders(setOrders);
    const unsubscribeNotifications = FirebaseService.subscribeToNotifications((nots) => {
      // Sort notifications by time (newest first) and limit to 20
      const sorted = nots.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(sorted.slice(0, 20));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeNotifications();
    };
  }, []);

  useEffect(() => {
    const totalRevenue = orders
      .filter((order) => order.status === 'paid' || order.status === 'delivered')
      .reduce((sum, order) => sum + (order.total ?? order.amount ?? 0), 0);

    const pendingOrders = orders.filter((order) => 
      order.status === 'pending' || order.status === 'payment_pending'
    ).length;
    const totalProducts = products.length;
    const totalOrders = orders.length;

    setStatistics({
      totalRevenue,
      pendingOrders,
      totalProducts,
      totalOrders,
    });
  }, [orders, products]);

  const handleLogout = () => {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = '/admin/login';
  };

  // Function to get detailed order information
  const getOrderDetails = (order: Order) => {
    return {
      items: order.items?.map((item: any) => `${item.name} x${item.quantity}`).join(', ') || 'No items',
      customer: order.customerName || order.customerInfo?.name || 'Unknown',
      phone: order.phone || order.customerInfo?.phone || 'Unknown',
      address: order.deliveryAddress || order.customerInfo?.deliveryAddress || 'Not specified',
      paymentMethod: order.paymentMethod || 'mpesa',
      mpesaReceipt: order.mpesaData?.receiptNumber || 'Not available',
      total: order.total || order.amount || 0,
      createdAt: order.createdAt || new Date().toISOString(),
    };
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await FirebaseService.updateOrderStatus(orderId, status);

      const order = orders.find((o) => o.id === orderId);
      if (order) {
        // Create detailed notification
        const details = getOrderDetails(order);
        let message = '';
        
        switch (status) {
          case 'paid':
            message = `💰 Payment received for Order #${orderId.slice(-8)} from ${details.customer}. Amount: KSh ${details.total.toLocaleString()}`;
            break;
          case 'delivered':
            message = `📦 Order #${orderId.slice(-8)} delivered to ${details.customer}`;
            break;
          case 'cancelled':
            message = `❌ Order #${orderId.slice(-8)} cancelled`;
            break;
          default:
            message = `Order #${orderId.slice(-8)} status changed to ${status}`;
        }

        await FirebaseService.createNotification(
          message,
          status === 'paid' ? 'success' : 'info',
          orderId
        );
      }

      toast({
        title: 'Status Updated',
        description: `Order ${orderId} marked as ${status}`,
      });
    } catch (error: any) {
      console.error('Status update failed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct({ ...product });
    setIsAddingProduct(false);
    if (window.innerWidth < 768) {
      document.getElementById('edit-product-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    try {
      await FirebaseService.modifyProduct(editingProduct.id, editingProduct);

      await FirebaseService.createNotification(
        `📦 Product "${editingProduct.name}" updated`,
        'success'
      );

      toast({
        title: 'Product Updated',
        description: `${editingProduct.name} has been updated successfully`,
      });

      setEditingProduct(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update product',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
      await FirebaseService.removeProduct(productId);

      await FirebaseService.createNotification(
        `🗑️ Product "${product.name}" deleted`,
        'warning'
      );

      toast({
        title: 'Product Deleted',
        description: 'Product has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || (newProduct.price ?? 0) <= 0 || !newProduct.image) {
      toast({
        title: 'Missing / Invalid Data',
        description: 'Name, price (> 0) and image URL are required',
        variant: 'destructive',
      });
      return;
    }

    const product: Product = {
      id: `product-${Date.now()}`,
      name: newProduct.name!,
      brand: newProduct.brand || 'Apple',
      price: newProduct.price!,
      description: newProduct.description || '',
      image: newProduct.image!,
      features: newProduct.features || [],
      inStock: newProduct.inStock !== false,
      isNew: !!newProduct.isNew,
      isBestSeller: !!newProduct.isBestSeller,
      originalPrice: newProduct.originalPrice && newProduct.originalPrice > 0 ? newProduct.originalPrice : undefined,
    };

    try {
      await FirebaseService.createProduct(product);

      await FirebaseService.createNotification(
        `📦 New product "${product.name}" added (KSh ${product.price.toLocaleString()})`,
        'success'
      );

      toast({
        title: 'Product Added',
        description: `${product.name} has been added to the store`,
      });

      setNewProduct({
        name: '',
        brand: 'Apple',
        price: 0,
        description: '',
        image: '',
        features: [],
        inStock: true,
      });
      setIsAddingProduct(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add product',
        variant: 'destructive',
      });
    }
  };

  const handleAddFeature = () => {
    setNewProduct((prev) => ({
      ...prev,
      features: [...(prev.features || []), ''],
    }));
  };

  const handleFeatureChange = (index: number, value: string) => {
    setNewProduct((prev) => {
      const features = [...(prev.features || [])];
      features[index] = value;
      return { ...prev, features };
    });
  };

  const handleRemoveFeature = (index: number) => {
    setNewProduct((prev) => {
      const features = [...(prev.features || [])];
      features.splice(index, 1);
      return { ...prev, features };
    });
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      await FirebaseService.markNotificationAsRead(notificationId);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await FirebaseService.markAllNotificationsAsRead();
      toast({
        title: 'Notifications Cleared',
        description: 'All notifications have been marked as read',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clear notifications',
        variant: 'destructive',
      });
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);

  const appleCount = products.filter((p) => p.brand === 'Apple').length;
  const samsungCount = products.filter((p) => p.brand === 'Samsung').length;
  const laptopsCount = products.filter((p) => p.brand === 'Laptops').length;
  const accessoriesCount = products.filter((p) => p.brand === 'Accessories').length;

  const filteredProducts = searchQuery
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.id?.toLowerCase().includes(query) ||
      order.customerName?.toLowerCase().includes(query) ||
      order.customerInfo?.name?.toLowerCase().includes(query) ||
      order.phone?.toLowerCase().includes(query) ||
      order.status?.toLowerCase().includes(query)
    );
  });

  const cardGridClasses = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6';

  const showOrderDetails = (order: Order) => {
    setOrderDetailsDialog({ open: true, order });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Order Details Dialog */}
      <Dialog open={orderDetailsDialog.open} onOpenChange={(open) => setOrderDetailsDialog({ ...orderDetailsDialog, open })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Complete information for Order #{orderDetailsDialog.order?.id?.slice(-8)}
            </DialogDescription>
          </DialogHeader>
          
          {orderDetailsDialog.order && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Customer Information
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Name:</strong> {getOrderDetails(orderDetailsDialog.order).customer}</p>
                        <p className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          <strong>Phone:</strong> {getOrderDetails(orderDetailsDialog.order).phone}
                        </p>
                        <p className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          <strong>Address:</strong> {getOrderDetails(orderDetailsDialog.order).address}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Order Information
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Status:</strong> 
                          <Badge className="ml-2" variant={
                            orderDetailsDialog.order.status === 'paid' ? 'default' :
                            orderDetailsDialog.order.status === 'delivered' ? 'secondary' :
                            orderDetailsDialog.order.status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {orderDetailsDialog.order.status}
                          </Badge>
                        </p>
                        <p><strong>Total:</strong> KSh {getOrderDetails(orderDetailsDialog.order).total.toLocaleString()}</p>
                        <p><strong>Payment Method:</strong> {getOrderDetails(orderDetailsDialog.order).paymentMethod}</p>
                        <p className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          <strong>Date:</strong> {new Date(getOrderDetails(orderDetailsDialog.order).createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              {orderDetailsDialog.order.mpesaData && (
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-4 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Payment Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div>
                          <strong className="text-sm">M-Pesa Receipt:</strong>
                          <p className="font-mono text-lg">{orderDetailsDialog.order.mpesaData.receiptNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <strong className="text-sm">Amount Paid:</strong>
                          <p className="text-lg font-bold">KSh {(orderDetailsDialog.order.mpesaData.amount || orderDetailsDialog.order.total || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <strong className="text-sm">Phone Number:</strong>
                          <p>{orderDetailsDialog.order.mpesaData.phoneNumber || getOrderDetails(orderDetailsDialog.order).phone}</p>
                        </div>
                        <div>
                          <strong className="text-sm">Payment Time:</strong>
                          <p>{new Date(orderDetailsDialog.order.mpesaData.completedAt || orderDetailsDialog.order.updatedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Items */}
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">Order Items ({orderDetailsDialog.order.items?.length || 0})</h4>
                  <div className="space-y-4">
                    {orderDetailsDialog.order.items?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150'}
                          />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.brand}</p>
                            <p className="text-sm">Quantity: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">KSh {(item.price * item.quantity).toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">KSh {item.price.toLocaleString()} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">Total Amount</span>
                      <span className="text-xl font-bold">KSh {getOrderDetails(orderDetailsDialog.order).total.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setOrderDetailsDialog({ open: false, order: null })}>
                  Close
                </Button>
                {orderDetailsDialog.order.status === 'paid' && (
                  <Button onClick={() => updateOrderStatus(orderDetailsDialog.order!.id, 'delivered')}>
                    Mark as Delivered
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Header */}
      <header className="bg-white shadow md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <ShoppingBag className="w-6 h-6 text-green-600" />
              <div>
                <h1 className="text-lg font-bold">Admin</h1>
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
            </div>

            <Button onClick={handleLogout} variant="ghost" size="sm">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search orders or products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="bg-white shadow hidden md:block">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ShoppingBag className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your store in real-time</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search orders or products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              <Button variant="outline" className="relative">
                <Bell className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Notifications</span>
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                )}
              </Button>

              <Button onClick={handleLogout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg fixed inset-x-0 top-[84px] z-50">
          <div className="px-4 py-3 space-y-3">
            <Button
              variant={activeTab === 'orders' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setActiveTab('orders');
                setIsMobileMenuOpen(false);
              }}
            >
              <Package className="w-4 h-4 mr-2" />
              Orders ({orders.length})
            </Button>

            <Button
              variant={activeTab === 'products' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setActiveTab('products');
                setIsMobileMenuOpen(false);
              }}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Products ({products.length})
            </Button>

            <Button
              variant={activeTab === 'notifications' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setActiveTab('notifications');
                setIsMobileMenuOpen(false);
              }}
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications ({unreadNotifications.length})
            </Button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Brand Statistics */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 sm:mb-4">Brand Statistics</h2>
          <div className={cardGridClasses}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Apple</p>
                    <h3 className="text-xl sm:text-2xl font-bold">{appleCount}</h3>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Samsung</p>
                    <h3 className="text-xl sm:text-2xl font-bold">{samsungCount}</h3>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Laptops</p>
                    <h3 className="text-xl sm:text-2xl font-bold">{laptopsCount}</h3>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Accessories</p>
                    <h3 className="text-xl sm:text-2xl font-bold">{accessoriesCount}</h3>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Store Overview */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg font-semibold mb-3 sm:mb-4">Store Overview</h2>
          <div className={cardGridClasses}>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <h3 className="text-lg sm:text-xl font-bold">
                      KSh {(statistics.totalRevenue ?? 0).toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Products</p>
                    <h3 className="text-lg sm:text-xl font-bold">{statistics.totalProducts}</h3>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pending Orders</p>
                    <h3 className="text-lg sm:text-xl font-bold">{statistics.pendingOrders}</h3>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Orders</p>
                    <h3 className="text-lg sm:text-xl font-bold">{statistics.totalOrders}</h3>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Desktop Tabs */}
          <div className="hidden md:block">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="w-full max-w-md">
                <TabsTrigger value="orders" className="flex-1">
                  Orders ({orders.length})
                </TabsTrigger>
                <TabsTrigger value="products" className="flex-1">
                  Products ({products.length})
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex-1">
                  Notifications ({unreadNotifications.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Orders</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono text-xs sm:text-sm">
                                #{order.id.slice(-8)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{order.customerName || order.customerInfo?.name}</p>
                                  <p className="text-xs text-muted-foreground">{order.phone || order.customerInfo?.phone}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold">
                                KSh {(order.total || order.amount || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    order.status === 'paid'
                                      ? 'default'
                                      : order.status === 'delivered'
                                      ? 'secondary'
                                      : order.status === 'pending' || order.status === 'payment_pending'
                                      ? 'outline'
                                      : 'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {order.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => showOrderDetails(order)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {order.status === 'paid' && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                                    >
                                      Deliver
                                    </Button>
                                  )}
                                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="products">
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                    <CardTitle>Products Management</CardTitle>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                      <Button
                        onClick={() => setIsAddingProduct(true)}
                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-10 h-10 object-cover rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        'https://via.placeholder.com/150';
                                    }}
                                  />
                                  <div>
                                    <p className="font-medium">{product.name}</p>
                                    <div className="flex gap-1 mt-1">
                                      {product.isNew && (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                          New
                                        </span>
                                      )}
                                      {product.isBestSeller && (
                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                          Best Seller
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{product.brand}</TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-bold">
                                    KSh {(product.price ?? 0).toLocaleString()}
                                  </span>
                                  {product.originalPrice !== undefined &&
                                    product.originalPrice > 0 && (
                                      <span className="text-sm text-muted-foreground line-through ml-2">
                                        KSh {(product.originalPrice ?? 0).toLocaleString()}
                                      </span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={product.inStock ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditProduct(product)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Notifications</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{unreadNotifications.length} unread</Badge>
                      {unreadNotifications.length > 0 && (
                        <Button size="sm" variant="outline" onClick={handleMarkAllNotificationsAsRead}>
                          Mark all as read
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`flex items-start p-4 border rounded-lg hover:shadow-sm transition-shadow ${
                            !notification.read ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <div
                            className={`p-2 rounded-full mr-3 flex-shrink-0 ${
                              notification.type === 'success'
                                ? 'bg-green-100'
                                : notification.type === 'warning'
                                ? 'bg-yellow-100'
                                : notification.type === 'error'
                                ? 'bg-red-100'
                                : 'bg-blue-100'
                            }`}
                          >
                            {notification.type === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : notification.type === 'warning' ? (
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                            ) : notification.type === 'error' ? (
                              <X className="w-4 h-4 text-red-600" />
                            ) : (
                              <Info className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm sm:text-base font-medium">{notification.message}</p>
                            {notification.details && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                {notification.details.customerName && (
                                  <p><strong>Customer:</strong> {notification.details.customerName}</p>
                                )}
                                {notification.details.phone && (
                                  <p><strong>Phone:</strong> {notification.details.phone}</p>
                                )}
                                {notification.details.amount && (
                                  <p><strong>Amount:</strong> KSh {notification.details.amount.toLocaleString()}</p>
                                )}
                                {notification.details.receiptNumber && (
                                  <p><strong>Receipt:</strong> {notification.details.receiptNumber}</p>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.time).toLocaleString()}
                            </p>
                          </div>
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkNotificationAsRead(notification.id)}
                              className="ml-2 flex-shrink-0"
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Mobile Views */}
          <div className="md:hidden space-y-6">
            {activeTab === 'orders' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Orders ({orders.length})
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">#{order.id.slice(-8)}</p>
                            <p className="text-sm text-muted-foreground">{order.customerName || order.customerInfo?.name}</p>
                          </div>
                          <Badge
                            variant={
                              order.status === 'paid'
                                ? 'default'
                                : order.status === 'delivered'
                                ? 'secondary'
                                : order.status === 'pending' || order.status === 'payment_pending'
                                ? 'outline'
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-semibold">
                              KSh {(order.total || order.amount || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment:</span>
                            <span className="uppercase">{order.paymentMethod || 'mpesa'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2 mt-4 pt-4 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => showOrderDetails(order)}
                          >
                            View Details
                          </Button>
                          {order.status === 'paid' && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                            >
                              Deliver
                            </Button>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'products' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Products ({products.length})
                    <Button
                      onClick={() => setIsAddingProduct(true)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isAddingProduct && (
                    <Card className="mb-4">
                      <CardContent className="pt-4">
                        <h3 className="font-semibold mb-3">Add New Product</h3>
                        <div className="space-y-3">
                          <Input
                            placeholder="Product Name"
                            value={newProduct.name ?? ''}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          />
                          <Input
                            type="number"
                            placeholder="Price"
                            value={newProduct.price ?? ''}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, price: Number(e.target.value) })
                            }
                          />
                          <Input
                            placeholder="Image URL"
                            value={newProduct.image ?? ''}
                            onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                          />
                          <Textarea
                            placeholder="Description"
                            value={newProduct.description ?? ''}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, description: e.target.value })
                            }
                            rows={2}
                          />
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleAddProduct}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              Add
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => setIsAddingProduct(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {editingProduct && (
                    <Card id="edit-product-section" className="mb-4">
                      <CardContent className="pt-4">
                        <h3 className="font-semibold mb-3">Edit Product</h3>
                        <div className="space-y-3">
                          <Input
                            placeholder="Name"
                            value={editingProduct.name}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, name: e.target.value })
                            }
                          />
                          <Input
                            type="number"
                            placeholder="Price"
                            value={editingProduct.price}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                price: Number(e.target.value),
                              })
                            }
                          />
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleSaveProduct}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => setEditingProduct(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-4">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div>
                                <p className="font-semibold">{product.name}</p>
                                <p className="text-sm text-muted-foreground">{product.brand}</p>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="font-bold">
                                KSh {(product.price ?? 0).toLocaleString()}
                              </p>
                              <Badge
                                variant={product.inStock ? 'default' : 'destructive'}
                                className="mt-1 text-xs"
                              >
                                {product.inStock ? 'In Stock' : 'Out of Stock'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Notifications
                    {unreadNotifications.length > 0 && (
                      <Badge variant="destructive">{unreadNotifications.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border rounded-lg ${
                          !notification.read ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div className="flex items-start">
                          {notification.type === 'success' ? (
                            <CheckCircle className="w-4 h-4 mr-2 mt-1 text-green-500" />
                          ) : notification.type === 'warning' ? (
                            <AlertCircle className="w-4 h-4 mr-2 mt-1 text-yellow-500" />
                          ) : (
                            <Bell className="w-4 h-4 mr-2 mt-1 text-blue-500" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.time).toLocaleString()}
                            </p>
                          </div>
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkNotificationAsRead(notification.id)}
                              className="ml-2"
                            >
                              ✓
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Desktop Add Product Form */}
          {isAddingProduct && (
            <div className="hidden md:block">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Add New Product</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Product Name *</label>
                      <Input
                        placeholder="iPhone 15 Pro Max"
                        value={newProduct.name ?? ''}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Brand *</label>
                      <Select
                        value={newProduct.brand}
                        onValueChange={(value) => setNewProduct({ ...newProduct, brand: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Apple">Apple</SelectItem>
                          <SelectItem value="Samsung">Samsung</SelectItem>
                          <SelectItem value="Laptops">Laptops</SelectItem>
                          <SelectItem value="Accessories">Accessories</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Price (KSh) *</label>
                      <Input
                        type="number"
                        placeholder="120000"
                        value={newProduct.price ?? ''}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, price: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Original Price (KSh)</label>
                      <Input
                        type="number"
                        placeholder="140000"
                        value={newProduct.originalPrice ?? ''}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            originalPrice: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1 block">Image URL *</label>
                      <Input
                        placeholder="https://example.com/image.jpg"
                        value={newProduct.image ?? ''}
                        onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1 block">Description</label>
                      <Textarea
                        placeholder="Product description..."
                        value={newProduct.description ?? ''}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, description: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1 block">Features (one per line)</label>
                      <Textarea
                        placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                        value={newProduct.features?.join('\n') ?? ''}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            features: e.target.value.split('\n').filter((f) => f.trim()),
                          })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="addStockStatus"
                          checked={newProduct.inStock !== false}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, inStock: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        <label htmlFor="addStockStatus" className="text-sm">
                          In Stock
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="addIsNew"
                          checked={newProduct.isNew ?? false}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, isNew: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        <label htmlFor="addIsNew" className="text-sm">
                          Mark as New
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="addIsBestSeller"
                          checked={newProduct.isBestSeller ?? false}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, isBestSeller: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        <label htmlFor="addIsBestSeller" className="text-sm">
                          Mark as Best Seller
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setIsAddingProduct(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddProduct}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Desktop Edit Product Form */}
          {editingProduct && (
            <div className="hidden md:block">
              <Card id="edit-product-section">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Edit Product: {editingProduct.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Product Name *</label>
                      <Input
                        placeholder="iPhone 15 Pro Max"
                        value={editingProduct.name}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Brand *</label>
                      <Select
                        value={editingProduct.brand}
                        onValueChange={(value) =>
                          setEditingProduct({ ...editingProduct, brand: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Apple">Apple</SelectItem>
                          <SelectItem value="Samsung">Samsung</SelectItem>
                          <SelectItem value="Laptops">Laptops</SelectItem>
                          <SelectItem value="Accessories">Accessories</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Price (KSh) *</label>
                      <Input
                        type="number"
                        placeholder="120000"
                        value={editingProduct.price}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            price: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Original Price (KSh)</label>
                      <Input
                        type="number"
                        placeholder="140000"
                        value={editingProduct.originalPrice ?? ''}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            originalPrice: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1 block">Image URL *</label>
                      <Input
                        placeholder="https://example.com/image.jpg"
                        value={editingProduct.image}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, image: e.target.value })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1 block">Description</label>
                      <Textarea
                        placeholder="Product description..."
                        value={editingProduct.description}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, description: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1 block">Features (one per line)</label>
                      <Textarea
                        placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                        value={editingProduct.features.join('\n')}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            features: e.target.value.split('\n').filter((f) => f.trim()),
                          })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="stockStatus"
                          checked={editingProduct.inStock}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, inStock: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        <label htmlFor="stockStatus" className="text-sm">
                          In Stock
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isNew"
                          checked={editingProduct.isNew ?? false}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, isNew: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        <label htmlFor="isNew" className="text-sm">
                          Mark as New
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isBestSeller"
                          checked={editingProduct.isBestSeller ?? false}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        <label htmlFor="isBestSeller" className="text-sm">
                          Mark as Best Seller
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setEditingProduct(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveProduct}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="flex items-center justify-around p-3">
          <Button
            variant={activeTab === 'orders' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center px-2"
            onClick={() => setActiveTab('orders')}
          >
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs">Orders</span>
          </Button>

          <Button
            variant={activeTab === 'products' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center px-2"
            onClick={() => setActiveTab('products')}
          >
            <ShoppingBag className="w-5 h-5 mb-1" />
            <span className="text-xs">Products</span>
          </Button>

          <Button
            variant={activeTab === 'notifications' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center px-2 relative"
            onClick={() => setActiveTab('notifications')}
          >
            <Bell className="w-5 h-5 mb-1" />
            <span className="text-xs">Alerts</span>
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unreadNotifications.length}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
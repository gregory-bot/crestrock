import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Smartphone, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../hooks/use-toast';
import Navigation from '../components/Navigation';
import PaymentService, { type CustomerInfo } from '../services/mpesaService';

const Cart = () => {
  const navigate = useNavigate();
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'whatsapp' | 'cash'>('mpesa');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    location: '',
    deliveryAddress: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Test backend connection when component mounts
  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        console.log('🔄 Testing backend connection...');
        console.log('Backend URL:', PaymentService.getBackendUrl());
        
        const result = await PaymentService.testConnection();
        
        if (result.success) {
          console.log('✅ Backend is reachable:', result.data);
          setIsBackendConnected(true);
        } else {
          console.error('❌ Backend connection failed:', result.error);
          setIsBackendConnected(false);
        }
      } catch (error) {
        console.error('❌ Error testing backend connection:', error);
        setIsBackendConnected(false);
      }
    };

    testBackendConnection();
  }, [toast]);

  // Clear cart only when navigating away if order was created
  useEffect(() => {
    return () => {
      if (orderCreated && currentOrderId) {
        // Keep cart for now, will be cleared after successful payment
        console.log('Order created, keeping cart for reference');
      }
    };
  }, [orderCreated, currentOrderId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleWhatsAppCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add some items to your cart before checking out.",
        variant: "destructive",
      });
      return;
    }

    const orderDetails = items.map(item => 
      `• ${item.name} - Qty: ${item.quantity} - KSh ${(item.price * item.quantity).toLocaleString()}`
    ).join('\n');

    const message = `Hi! I'd like to place an order:

${orderDetails}

Total: KSh ${total.toLocaleString()}

Please confirm availability and delivery details.`;

    const whatsappUrl = `https://wa.me/254742312545?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Order sent",
      description: "Your order has been sent via WhatsApp. We'll get back to you soon!",
    });
    
    // Clear cart for WhatsApp orders
    clearCart();
  };

  const handleMpesaPayment = async () => {
    if (isBackendConnected === false) {
      toast({
        title: "Payment Server Unavailable",
        description: "Cannot connect to payment server. Please try again later or use WhatsApp ordering.",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.phone || !customerInfo.deliveryAddress) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!PaymentService.validatePhoneNumber(customerInfo.phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Kenyan phone number (e.g., 0712345678)",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🔄 Starting M-Pesa payment process...');
      
      const orderData = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          brand: item.brand
        })),
        total,
        customerInfo: {
          ...customerInfo,
          phone: PaymentService.formatPhoneNumber(customerInfo.phone)
        },
        paymentMethod
      };

      console.log('Creating order with data:', orderData);
      const orderResponse = await PaymentService.createOrder(orderData);
      console.log('✅ Order created:', orderResponse);
      
      // Store order ID for reference
      setCurrentOrderId(orderResponse.order.id);
      setOrderCreated(true);

      const mpesaResponse = await PaymentService.initiateMpesaPayment({
        phoneNumber: orderData.customerInfo.phone,
        amount: total,
        orderId: orderResponse.order.id,
        accountReference: `ORD-${orderResponse.order.id}`,
        transactionDesc: 'Gadgets Purchase'
      });

      if (mpesaResponse.success) {
        toast({
          title: "Payment initiated! ✅",
          description: "Check your phone to complete the M-Pesa payment.",
        });

        // DON'T clear cart yet - wait for payment confirmation
        // The cart will be cleared when user navigates away or payment is confirmed
        setIsPaymentDialogOpen(false);
        navigate(`/order-confirmation/${orderResponse.order.id}`);
      } else {
        toast({
          title: "Payment failed",
          description: mpesaResponse.message || "Failed to initiate payment.",
          variant: "destructive",
        });
        setOrderCreated(false);
        setCurrentOrderId(null);
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      
      let errorMessage = "Something went wrong. Please try again.";
      
      if (error.response?.status === 0) {
        errorMessage = "Cannot connect to payment server.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      setOrderCreated(false);
      setCurrentOrderId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashOnDelivery = () => {
    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add some items to your cart before checking out.",
        variant: "destructive",
      });
      return;
    }

    const orderDetails = items.map(item => 
      `• ${item.name} - Qty: ${item.quantity} - KSh ${(item.price * item.quantity).toLocaleString()}`
    ).join('\n');

    const message = `Hi! I'd like to place a cash on delivery order:

${orderDetails}

Total: KSh ${total.toLocaleString()}

Delivery Address: ${customerInfo.deliveryAddress}
Phone: ${customerInfo.phone}
Name: ${customerInfo.name}

Please confirm availability and delivery details.`;

    const whatsappUrl = `https://wa.me/254742312545?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Cash on Delivery Order Sent",
      description: "Your order has been sent via WhatsApp. We'll get back to you soon!",
    });
    
    // Clear cart for cash on delivery
    clearCart();
    setIsPaymentDialogOpen(false);
  };

  const handleCheckout = () => {
    if (paymentMethod === 'whatsapp') {
      handleWhatsAppCheckout();
      setIsPaymentDialogOpen(false);
    } else if (paymentMethod === 'mpesa') {
      handleMpesaPayment();
    } else if (paymentMethod === 'cash') {
      handleCashOnDelivery();
    }
  };

  // Clear cart when leaving page if order was created
  const handleBackNavigation = () => {
    if (orderCreated && currentOrderId) {
      // Show warning that cart will be cleared
      if (window.confirm('You have an order in progress. Navigating away will clear your cart. Continue?')) {
        clearCart();
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-md mx-auto">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Button onClick={() => navigate('/')}>
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      {/* Backend Connection Status Banner */}
      {isBackendConnected === false && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4">
          <div className="container mx-auto px-4">
            <div className="flex items-start gap-2">
              <span className="text-red-500 flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-xs sm:text-sm text-red-700">
                <strong>Payment server unavailable.</strong> M-Pesa payments disabled. Use WhatsApp ordering.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Order in Progress Banner */}
      {orderCreated && currentOrderId && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4">
          <div className="container mx-auto px-4">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 flex-shrink-0 mt-0.5">🔄</span>
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-blue-700">
                  <strong>Order in progress:</strong> Order #{currentOrderId?.slice(-8)}. Complete payment on your phone.
                </p>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800 mt-1"
                  onClick={() => navigate(`/order-confirmation/${currentOrderId}`)}
                >
                  View order status →
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              onClick={handleBackNavigation}
              size="sm"
              className="sm:px-4"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <h1 className="text-xl sm:text-3xl font-bold">Cart</h1>
          </div>
          
          <Button
            variant="outline"
            onClick={clearCart}
            size="sm"
            className="text-destructive hover:text-destructive self-end sm:self-auto"
            disabled={orderCreated}
          >
            <Trash2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg bg-gradient-to-br from-muted to-muted/50 p-2 flex items-center justify-center flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{item.name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">{item.brand}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                          disabled={orderCreated}
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            disabled={orderCreated}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-medium w-6 sm:w-8 text-center text-sm sm:text-base">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            disabled={orderCreated}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="text-left sm:text-right">
                          <p className="font-bold text-sm sm:text-base">
                            KSh {(item.price * item.quantity).toLocaleString()}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            KSh {item.price.toLocaleString()} each
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold mb-4">Order Summary</h2>
                
                <div className="space-y-2 mb-4 text-sm sm:text-base">
                  <div className="flex justify-between">
                    <span>Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                    <span>KSh {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="text-green-600">Free</span>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex justify-between text-base sm:text-lg font-bold mb-6">
                  <span>Total</span>
                  <span>KSh {total.toLocaleString()}</span>
                </div>
                
                <div className="space-y-3">
                  <Button
                    onClick={() => setIsPaymentDialogOpen(true)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 transition-opacity text-sm sm:text-base"
                    size="lg"
                    disabled={isBackendConnected === false || orderCreated}
                  >
                    <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {orderCreated ? 'Order in Progress' : 
                     isBackendConnected === false ? 'M-Pesa Unavailable' : 
                     'Pay with M-Pesa'}
                  </Button>
                  
                  <Button
                    onClick={handleWhatsAppCheckout}
                    variant="outline"
                    className="w-full border-green-400 text-green-600 hover:bg-green-50 text-sm sm:text-base"
                    size="lg"
                    disabled={orderCreated}
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Order via WhatsApp
                  </Button>
                </div>
                
                {orderCreated && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs sm:text-sm text-blue-700 text-center">
                      <strong>Order #{currentOrderId?.slice(-8)} created.</strong><br />
                      Complete payment on your phone to finish the order.
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Secure payments powered by M-Pesa
                </p>
                
                {/* Backend status indicator */}
                <div className="mt-4 text-xs text-center">
                  <div className="inline-flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${isBackendConnected === true ? 'bg-green-500' : isBackendConnected === false ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                    <span className="text-muted-foreground">
                      {isBackendConnected === true ? 'Server connected' : 
                       isBackendConnected === false ? 'Server offline' : 
                       'Checking...'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Dialog - Fully Responsive */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader className="mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-lg sm:text-xl">Complete Your Order</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm mt-1">
                    Enter your details to complete the purchase
                  </DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full -mt-1 -mr-1"
                  onClick={() => setIsPaymentDialogOpen(false)}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Payment Method Selection */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Payment Method</Label>
                <RadioGroup 
                  value={paymentMethod} 
                  onValueChange={(value: 'mpesa' | 'whatsapp' | 'cash') => setPaymentMethod(value)} 
                  className="space-y-2"
                  disabled={isProcessing}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="mpesa" id="mpesa" disabled={isProcessing} />
                    <Label htmlFor="mpesa" className="flex items-center cursor-pointer flex-1">
                      <Smartphone className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-sm">Pay with M-Pesa</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="whatsapp" id="whatsapp" disabled={isProcessing} />
                    <Label htmlFor="whatsapp" className="flex items-center cursor-pointer flex-1">
                      <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-sm">Order via WhatsApp</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="cash" id="cash" disabled={isProcessing} />
                    <Label htmlFor="cash" className="cursor-pointer flex-1">
                      <span className="text-sm">Cash on Delivery</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Customer Information Form */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" className="text-sm">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={customerInfo.name}
                    onChange={handleInputChange}
                    placeholder="Brian Obina"
                    required
                    disabled={isProcessing}
                    className="mt-1.5 text-sm"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone" className="text-sm">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={customerInfo.phone}
                    onChange={handleInputChange}
                    placeholder="0742 312 545"
                    required
                    disabled={isProcessing}
                    className="mt-1.5 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Kenyan number (e.g., 0742312545)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={handleInputChange}
                    placeholder="info@shop.gadgets.crestrock.ltd"
                    disabled={isProcessing}
                    className="mt-1.5 text-sm"
                  />
                </div>
                
                <div>
                  <Label htmlFor="deliveryAddress" className="text-sm">Delivery Address *</Label>
                  <Input
                    id="deliveryAddress"
                    name="deliveryAddress"
                    value={customerInfo.deliveryAddress}
                    onChange={handleInputChange}
                    placeholder="Your delivery address"
                    required
                    disabled={isProcessing}
                    className="mt-1.5 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
                disabled={isProcessing}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={isProcessing || (paymentMethod === 'mpesa' && isBackendConnected === false)}
                className="w-full sm:flex-1 bg-gradient-to-r from-green-500 to-green-600 text-sm"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : 
                  paymentMethod === 'mpesa' ? 'Pay with M-Pesa' :
                  paymentMethod === 'whatsapp' ? 'Continue to WhatsApp' :
                  'Place Order (Cash)'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cart;
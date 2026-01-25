import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Smartphone, 
  Home, 
  Package, 
  Truck, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import PaymentService from '@/services/mpesaService';
import { sendOrderConfirmationEmail } from '@/services/emailService'; // Import email service

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState<NodeJS.Timeout | null>(null);
  const [emailSent, setEmailSent] = useState(false); // Track if email was sent

  useEffect(() => {
    const fetchOrderStatus = async () => {
      if (!orderId) return;
      
      try {
        setLoading(true);
        const response = await PaymentService.checkOrderStatus(orderId);
        
        if (response.success && response.order) {
          setOrder(response.order);
          
          // If payment is pending, start polling
          if (response.order.status === 'payment_pending') {
            startPolling();
          }
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast({
          title: "Error",
          description: "Failed to load order details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const startPolling = () => {
      // Clear any existing polling
      if (polling) clearInterval(polling);
      
      // Start new polling every 10 seconds for 5 minutes
      const interval = setInterval(async () => {
        if (!orderId) return;
        
        try {
          const response = await PaymentService.checkOrderStatus(orderId);
          if (response.success && response.order) {
            const newStatus = response.order.status;
            setOrder(response.order);
            
            // Stop polling if payment is no longer pending
            if (newStatus !== 'payment_pending') {
              clearInterval(interval);
              setPolling(null);
              
              if (newStatus === 'paid') {
                toast({
                  title: "Payment Successful! 🎉",
                  description: "Your payment has been confirmed. We'll process your order soon.",
                });
              } else if (newStatus === 'payment_failed') {
                toast({
                  title: "Payment Failed",
                  description: "The payment was not completed. Please try again.",
                  variant: "destructive",
                });
              }
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 10000);
      
      setPolling(interval);
      
      // Stop polling after 5 minutes
      setTimeout(() => {
        if (interval) {
          clearInterval(interval);
          setPolling(null);
        }
      }, 300000);
    };

    fetchOrderStatus();

    // Cleanup polling on unmount
    return () => {
      if (polling) {
        clearInterval(polling);
      }
    };
  }, [orderId, toast]);

  // Send email when order is paid
  useEffect(() => {
    const sendEmailIfPaid = async () => {
      if (order?.status === 'paid' && order?.customerInfo?.email && !emailSent) {
        try {
          console.log('📧 Preparing to send order confirmation email...');
          
          const orderIdShort = order.id.slice(-8).toUpperCase();
          
          // Create HTML for items list
          const itemsListHTML = order.items.map((item: any) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <strong>${item.name}</strong><br>
                <small>${item.brand} • Qty: ${item.quantity}</small>
              </td>
              <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e5e7eb;">
                KSh ${(item.price * item.quantity).toLocaleString()}
              </td>
            </tr>
          `).join('');

          const emailData = {
            customer_name: order.customerInfo.name,
            order_id: orderIdShort,
            items_list: itemsListHTML,
            total_amount: order.total.toLocaleString(),
            delivery_address: order.customerInfo.deliveryAddress || 'Not specified',
            phone: order.customerInfo.phone,
            order_date: new Date(order.createdAt).toLocaleString(),
            receipt_number: order.mpesaData?.receiptNumber || '',
            amount_paid: (order.mpesaData?.amount || order.total).toLocaleString(),
            payment_time: new Date(order.updatedAt).toLocaleString(),
            order_link: `${window.location.origin}/order-confirmation/${order.id}`,
            current_year: new Date().getFullYear().toString(),
          };

          console.log('📧 Sending email with data:', {
            to: order.customerInfo.email,
            orderId: orderIdShort,
          });

          const result = await sendOrderConfirmationEmail(order.customerInfo.email, emailData);
          
          if (result.success) {
            setEmailSent(true);
            console.log('✅ Email sent successfully from frontend');
            
            // Show success toast
            toast({
              title: "Confirmation Email Sent",
              description: "Order confirmation has been sent to your email.",
            });
          } else {
            console.error('❌ Email sending failed:', result.message);
            
            // Show error toast
            toast({
              title: "Email Not Sent",
              description: "Could not send confirmation email. Please check your email address.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('❌ Error sending email:', error);
          
          toast({
            title: "Email Error",
            description: "Failed to send confirmation email. Please contact support.",
            variant: "destructive",
          });
        }
      }
    };

    sendEmailIfPaid();
  }, [order, emailSent, toast]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          icon: <CheckCircle className="w-12 h-12 text-green-500" />,
          title: "Payment Successful!",
          description: "Your payment has been confirmed. We'll process your order soon.",
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200"
        };
      case 'payment_failed':
        return {
          icon: <XCircle className="w-12 h-12 text-red-500" />,
          title: "Payment Failed",
          description: "The payment was not completed. Please try again or contact support.",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200"
        };
      case 'pending':
        return {
          icon: <Clock className="w-12 h-12 text-yellow-500" />,
          title: "Order Pending",
          description: "Your order has been created and is awaiting payment.",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200"
        };
      default:
        return {
          icon: <Clock className="w-12 h-12 text-blue-500" />,
          title: "Payment Pending",
          description: "Please complete the payment on your phone. Enter your M-Pesa PIN when prompted.",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200"
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation searchQuery="" onSearchChange={() => {}} />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation searchQuery="" onSearchChange={() => {}} />
        <div className="container mx-auto px-4 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
              <p className="text-muted-foreground mb-6">
                We couldn't find an order with ID: {orderId}
              </p>
              <Button onClick={() => navigate('/')}>
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);

  return (
    <div className="min-h-screen bg-background">
      <Navigation searchQuery="" onSearchChange={() => {}} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          {statusConfig.icon}
          <h1 className={`text-2xl font-bold mt-4 ${statusConfig.color}`}>
            {statusConfig.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {statusConfig.description}
          </p>
          
          <div className="mt-4 inline-block">
            <Badge variant="outline" className="text-sm font-mono">
              Order: #{order.id?.slice(-8).toUpperCase()}
            </Badge>
          </div>
          
          {/* Email Status Badge */}
          {order.status === 'paid' && order.customerInfo?.email && (
            <div className="mt-4">
              {emailSent ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Confirmation Email Sent
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                  Sending Confirmation...
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold">Order Summary</h2>
                </div>
                
                <div className="space-y-4">
                  {order.items?.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-muted to-muted/50 p-1 flex items-center justify-center">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Brand: {item.brand}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-semibold">KSh {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>KSh {order.total?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery</span>
                      <span className="text-green-600">Free</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>KSh {order.total?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold">Customer Details</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{order.customerInfo?.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{order.customerInfo?.phone}</p>
                      </div>
                    </div>
                    
                    {order.customerInfo?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{order.customerInfo.email}</p>
                          {order.status === 'paid' && (
                            <p className="text-xs text-green-600 mt-1">
                              {emailSent ? '✓ Confirmation sent' : '⏳ Sending confirmation...'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Delivery Address</p>
                        <p className="font-medium">{order.customerInfo?.deliveryAddress || 'To be confirmed'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                        <Badge variant="outline" className="uppercase">
                          {order.paymentMethod}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Status & Actions */}
          <div className="space-y-6">
            {/* Order Status Card */}
            <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Order Status</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {statusConfig.icon}
                    </div>
                    <div>
                      <p className={`font-medium ${statusConfig.color}`}>
                        {order.status?.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* M-Pesa Receipt if paid */}
                  {order.mpesaData?.receiptNumber && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-1">M-Pesa Receipt</p>
                      <p className="font-mono text-lg">{order.mpesaData.receiptNumber}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Paid: KSh {order.mpesaData.amount?.toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  {/* Checkout Request ID if pending */}
                  {order.mpesaData?.checkoutRequestId && order.status === 'payment_pending' && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-1">Transaction Reference</p>
                      <p className="text-xs font-mono break-all">
                        {order.mpesaData.checkoutRequestId}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">What's Next?</h2>
                
                <div className="space-y-3">
                  {order.status === 'payment_pending' && (
                    <>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold">1</span>
                        </div>
                        <p className="text-sm">
                          Check your phone for the M-Pesa STK Push
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold">2</span>
                        </div>
                        <p className="text-sm">
                          Enter your M-Pesa PIN to complete payment
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold">3</span>
                        </div>
                        <p className="text-sm">
                          This page will automatically update when payment is confirmed
                        </p>
                      </div>
                    </>
                  )}
                  
                  {order.status === 'paid' && (
                    <>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                          ✅ Payment confirmed via M-Pesa
                        </p>
                      </div>
                      {order.customerInfo?.email && (
                        <div className="flex items-start gap-2">
                          <Mail className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">
                            {emailSent ? '✅ Confirmation email sent' : '📧 Sending confirmation email...'}
                          </p>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <Truck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                          We'll contact you soon about delivery details
                        </p>
                      </div>
                    </>
                  )}
                  
                  {order.status === 'payment_failed' && (
                    <>
                      <div className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                          Payment was not completed. Please try again
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex flex-col gap-3 mt-6 pt-6 border-t">
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    className="w-full"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Continue Shopping
                  </Button>
                  
                  {order.status === 'payment_pending' && (
                    <Button
                      onClick={() => {
                        // Refresh order status
                        if (orderId) {
                          PaymentService.checkOrderStatus(orderId)
                            .then(response => {
                              if (response.success && response.order) {
                                setOrder(response.order);
                                toast({
                                  title: "Status Updated",
                                  description: "Order status refreshed",
                                });
                              }
                            })
                            .catch(error => {
                              console.error('Error refreshing:', error);
                            });
                        }
                      }}
                      className="w-full"
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Refresh Status
                    </Button>
                  )}
                  
                  {order.status === 'payment_failed' && (
                    <Button
                      onClick={() => navigate('/cart')}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Try Payment Again
                    </Button>
                  )}
                  
                  {/* Resend Email Button */}
                  {order.status === 'paid' && order.customerInfo?.email && emailSent && (
                    <Button
                      onClick={async () => {
                        try {
                          // Resend email logic here
                          toast({
                            title: "Email Resent",
                            description: "Order confirmation email has been resent.",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to resend email.",
                            variant: "destructive",
                          });
                        }
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Confirmation Email
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Need Help?</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  If you're having issues with your payment or have any questions about your order, please contact us:
                </p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open('https://wa.me/254742312545', '_blank')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp Support
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open('tel:+254742312545', '_blank')}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
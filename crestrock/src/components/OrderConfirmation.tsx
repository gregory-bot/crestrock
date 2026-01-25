import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle, 
  Clock, 
  Package, 
  Home, 
  Truck, 
  ArrowLeft, 
  Phone, 
  MessageSquare 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FirebaseService from '../services/firebaseService';
import { useToast } from '@/hooks/use-toast';

// Note: If you need MessageCircle, import it here:
// import { MessageCircle } from 'lucide-react';
// But we're using MessageSquare instead

const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [orderStatus, setOrderStatus] = useState<'processing' | 'confirmed' | 'paid' | 'delivered'>('processing');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      
      // Poll more aggressively for first 2 minutes (every 3 seconds)
      const pollInterval = setInterval(() => {
        if (pollingCount < 40) { // 2 minutes (40 * 3 seconds)
          fetchOrder();
        } else {
          clearInterval(pollInterval);
        }
      }, 3000);
      
      return () => clearInterval(pollInterval);
    }
  }, [orderId, pollingCount]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      
      // Try backend API first
      const response = await fetch(`https://backend-payment-cv4c.onrender.com/api/orders/${orderId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrder(data.order);
          updateOrderStatus(data.order.status);
          
          // Check for payment status
          if (data.order.mpesaData?.receiptNumber) {
            setPaymentStatus('completed');
            setPaymentDetails({
              receiptNumber: data.order.mpesaData.receiptNumber,
              amount: data.order.total,
              phone: data.order.customerInfo?.phone,
              timestamp: data.order.updatedAt
            });
          } else if (data.order.status === 'payment_failed') {
            setPaymentStatus('failed');
          } else if (data.order.status === 'payment_pending') {
            setPaymentStatus('processing');
          }
        } else {
          // Fallback to Firebase
          await fetchOrderFromFirebase();
        }
      } else {
        // Fallback to Firebase
        await fetchOrderFromFirebase();
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      // Silently fail - user can still see the processing state
    } finally {
      setLoading(false);
      setPollingCount(prev => prev + 1);
    }
  };

  const fetchOrderFromFirebase = async () => {
    try {
      const firebaseOrder = await FirebaseService.getOrderById(orderId || '');
      if (firebaseOrder) {
        setOrder(firebaseOrder);
        updateOrderStatus(firebaseOrder.status);
        
        // Check for payment status in Firebase
        if (firebaseOrder.mpesaData?.receiptNumber) {
          setPaymentStatus('completed');
          setPaymentDetails({
            receiptNumber: firebaseOrder.mpesaData.receiptNumber,
            amount: firebaseOrder.total,
            phone: firebaseOrder.customerInfo?.phone,
            timestamp: firebaseOrder.updatedAt
          });
        } else if (firebaseOrder.status === 'payment_failed') {
          setPaymentStatus('failed');
        } else if (firebaseOrder.status === 'payment_pending') {
          setPaymentStatus('processing');
        }
      }
    } catch (error) {
      console.error('Error fetching from Firebase:', error);
    }
  };

  const updateOrderStatus = (status: string) => {
    switch (status) {
      case 'paid':
      case 'delivered':
        setOrderStatus(status as any);
        break;
      case 'payment_pending':
        setOrderStatus('processing');
        break;
      default:
        setOrderStatus('processing');
    }
  };

  const getStatusDisplay = () => {
    if (!order) return { text: 'Processing', color: 'text-blue-600', bg: 'bg-blue-100' };
    
    switch (order.status) {
      case 'paid':
        return { text: 'Payment Confirmed', color: 'text-green-600', bg: 'bg-green-100' };
      case 'delivered':
        return { text: 'Delivered', color: 'text-purple-600', bg: 'bg-purple-100' };
      case 'payment_pending':
        return { text: 'Awaiting Payment', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'payment_failed':
        return { text: 'Payment Failed', color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { text: 'Processing', color: 'text-blue-600', bg: 'bg-blue-100' };
    }
  };

  const getStatusIcon = () => {
    if (!order) return <Clock className="w-8 h-8 text-blue-600 animate-spin" />;
    
    switch (order.status) {
      case 'paid':
      case 'delivered':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'payment_failed':
        return <Clock className="w-8 h-8 text-red-600" />;
      default:
        return <Clock className="w-8 h-8 text-blue-600 animate-spin" />;
    }
  };

  const getStatusMessage = () => {
    if (!order) return 'Please complete the M-Pesa prompt on your phone.';
    
    switch (order.status) {
      case 'paid':
        return 'Thank you for your purchase! Your payment has been confirmed.';
      case 'delivered':
        return 'Your order has been delivered! Thank you for shopping with us.';
      case 'payment_pending':
        return 'Please complete the M-Pesa prompt on your phone.';
      case 'payment_failed':
        return 'Payment was not completed. Please try again or contact support.';
      default:
        return 'Processing your order...';
    }
  };

  const statusDisplay = getStatusDisplay();

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Clock className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Loading Order Details...</h1>
                <p className="text-muted-foreground">Please wait while we fetch your order information.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: statusDisplay.bg.replace('bg-', '') }}>
                  {getStatusIcon()}
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  {order?.status === 'paid' || order?.status === 'delivered' 
                    ? 'Order Confirmed!' 
                    : 'Processing Your Order'}
                </h1>
                
                <p className="text-muted-foreground">
                  {getStatusMessage()}
                </p>
                
                <div className="mt-4">
                  <Badge className={`${statusDisplay.bg} ${statusDisplay.color} border-0 font-medium`}>
                    {statusDisplay.text}
                  </Badge>
                </div>
              </div>

              {/* Payment Confirmation Section */}
              {paymentStatus === 'completed' && paymentDetails && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold mb-3 text-green-800 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Payment Confirmed
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-green-700">
                    <div>
                      <span className="font-medium">Receipt No:</span>
                      <p className="font-mono text-lg">{paymentDetails.receiptNumber || order?.mpesaData?.receiptNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Amount Paid:</span>
                      <p className="font-bold text-lg">KSh {paymentDetails.amount?.toLocaleString() || order?.total?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span>
                      <p>{paymentDetails.phone || order?.customerInfo?.phone}</p>
                    </div>
                    <div>
                      <span className="font-medium">Time:</span>
                      <p>{new Date(paymentDetails.timestamp || order?.updatedAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Details */}
              {order && (
                <div className="space-y-6 mb-8">
                  {/* Order Summary Section */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                    
                    {/* Order Items Details */}
                    <div className="border rounded-lg overflow-hidden mb-4">
                      <div className="bg-gray-50 p-3 border-b">
                        <h4 className="font-medium">Items in your order ({order.items?.length || 0})</h4>
                      </div>
                      <div className="divide-y">
                        {order.items?.map((item: any, index: number) => (
                          <div key={index} className="p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-16 h-16 object-cover rounded"
                                onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150'}
                              />
                              <div>
                                <h5 className="font-medium">{item.name}</h5>
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
                      <div className="bg-gray-50 p-4 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total Amount</span>
                          <span className="text-xl font-bold">KSh {order.total?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Status */}
                    {order.mpesaData?.receiptNumber && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          <h4 className="font-semibold text-green-800">Payment Successful</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-green-700">M-Pesa Receipt:</span>
                            <p className="font-mono">{order.mpesaData.receiptNumber}</p>
                          </div>
                          <div>
                            <span className="font-medium text-green-700">Paid From:</span>
                            <p>{order.mpesaData.phoneNumber || order.customerInfo?.phone}</p>
                          </div>
                          <div>
                            <span className="font-medium text-green-700">Payment Time:</span>
                            <p>{new Date(order.updatedAt).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="font-medium text-green-700">Order Status:</span>
                            <Badge className="bg-green-100 text-green-800 border-0">
                              {order.status === 'paid' ? 'Payment Confirmed' : order.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delivery Information */}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <h3 className="font-semibold mb-3 text-blue-800">Delivery Information</h3>
                    {order.customerInfo?.deliveryAddress ? (
                      <div className="space-y-2 text-sm text-blue-700">
                        <div className="flex items-start">
                          <Truck className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{order.customerInfo.deliveryAddress}</span>
                        </div>
                        {order.customerInfo.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span>{order.customerInfo.phone}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-blue-700">
                        Our team will contact you to confirm delivery details.
                      </p>
                    )}
                  </div>

                  {/* Next Steps */}
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 text-green-800">What happens next?</h3>
                    <ol className="space-y-2 text-sm text-green-700">
                      {order.status === 'payment_pending' && (
                        <li>1. Complete M-Pesa payment on your phone</li>
                      )}
                      {order.status === 'paid' && (
                        <>
                          <li>1. ✅ Payment confirmed via M-Pesa</li>
                          <li>2. We're preparing your order for dispatch</li>
                          <li>3. You'll receive a call/SMS with delivery time</li>
                          <li>4. Delivery within 24-48 hours</li>
                        </>
                      )}
                      {order.status === 'delivered' && (
                        <>
                          <li>1. ✅ Payment confirmed</li>
                          <li>2. ✅ Order prepared</li>
                          <li>3. ✅ Delivery completed</li>
                          <li>4. Thank you for shopping with us!</li>
                        </>
                      )}
                      {(!order.status || order.status === 'pending') && (
                        <>
                          <li>1. Complete M-Pesa payment on your phone</li>
                          <li>2. Receive SMS confirmation from M-Pesa</li>
                          <li>3. Our team verifies payment (15 mins)</li>
                          <li>4. We contact you for delivery details</li>
                          <li>5. Delivery within 24-48 hours</li>
                        </>
                      )}
                    </ol>
                  </div>
                </div>
              )}

              {/* Action Buttons - FIXED: Using MessageSquare instead of MessageCircle */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild className="flex-1">
                  <Link to="/">
                    <Home className="w-4 h-4 mr-2" />
                    Continue Shopping
                  </Link>
                </Button>
                
                <Button variant="outline" className="flex-1" asChild>
                  <a href="https://wa.me/+254742312545?text=Hi! I have a question about my order">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Support
                  </a>
                </Button>
              </div>

              {/* Support Information */}
              <div className="mt-8 pt-6 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Need help? Call{' '}
                  <a href="tel:+254742312545" className="text-blue-600 hover:underline font-medium">
                    +254742312545
                  </a>
                  {' '}or{' '}
                  <a href="https://wa.me/+254742312545" className="text-green-600 hover:underline font-medium">
                    WhatsApp
                  </a>
                </p>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Order updates will be sent to your phone and email
                </p>
                
                {/* Real-time update indicator */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">
                    {order?.status === 'payment_pending' 
                      ? 'Waiting for payment confirmation...' 
                      : order?.status === 'paid'
                      ? 'Payment confirmed! Preparing order...'
                      : 'Checking for updates...'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
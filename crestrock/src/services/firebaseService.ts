// src/services/firebaseService.ts
import { 
  database, 
  productsRef, 
  ordersRef, 
  notificationsRef, 
  addProduct, 
  updateProduct, 
  deleteProduct,
  addOrder,
  updateOrderStatus,
  addNotification
} from '../firebase/config';
import { onValue, ref, set, push, update, get, query, orderByChild, equalTo } from 'firebase/database';

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  description: string;
  image: string;
  features: string[];
  inStock: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  originalPrice?: number;
  category?: string;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  deliveryAddress?: string;
  amount: number;
  status: 'pending' | 'payment_pending' | 'paid' | 'delivered' | 'cancelled' | 'payment_failed';
  items: any[];
  createdAt: string;
  updatedAt?: string;
  paymentMethod: string;
  mpesaReceipt?: string;
  mpesaRequestId?: string;
  checkoutRequestId?: string;
  transactionId?: string;
  customerInfo?: {
    name: string;
    phone: string;
    email?: string;
    deliveryAddress?: string;
    location?: string;
  };
  mpesaData?: {
    merchantRequestID?: string;
    checkoutRequestID?: string;
    resultCode?: string;
    resultDesc?: string;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    phoneNumber?: string;
  };
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  time: string;
  read: boolean;
  orderId?: string;
}

class FirebaseService {
  // ==================== PRODUCTS ====================
  
  async getProducts(): Promise<Product[]> {
    return new Promise((resolve, reject) => {
      onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const productsArray = Object.values(data) as Product[];
          resolve(productsArray);
        } else {
          resolve([]);
        }
      }, {
        onlyOnce: true
      }, (error) => {
        console.error('Error fetching products:', error);
        reject(error);
      });
    });
  }

  async getProductById(id: string): Promise<Product | null> {
    return new Promise((resolve, reject) => {
      const productRef = ref(database, `products/${id}`);
      onValue(productRef, (snapshot) => {
        const data = snapshot.val();
        resolve(data ? { id, ...data } as Product : null);
      }, {
        onlyOnce: true
      }, (error) => {
        console.error('Error fetching product by ID:', error);
        reject(error);
      });
    });
  }

  async getProductsByBrand(brand: string): Promise<Product[]> {
    return new Promise((resolve, reject) => {
      onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const productsArray = Object.values(data) as Product[];
          const filteredProducts = productsArray.filter(product => 
            product.brand.toLowerCase() === brand.toLowerCase()
          );
          resolve(filteredProducts);
        } else {
          resolve([]);
        }
      }, {
        onlyOnce: true
      }, (error) => {
        console.error('Error fetching products by brand:', error);
        reject(error);
      });
    });
  }

  async createProduct(product: Product): Promise<void> {
    try {
      await addProduct(product);
      console.log('✅ Product created successfully:', product.id);
    } catch (error) {
      console.error('❌ Error creating product:', error);
      throw error;
    }
  }

  async modifyProduct(productId: string, updates: Partial<Product>): Promise<void> {
    try {
      await updateProduct(productId, updates);
      console.log('✅ Product updated successfully:', productId);
    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw error;
    }
  }

  async removeProduct(productId: string): Promise<void> {
    try {
      await deleteProduct(productId);
      console.log('✅ Product deleted successfully:', productId);
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      throw error;
    }
  }

  // ==================== ORDERS ====================
  
  async getOrders(): Promise<Order[]> {
    return new Promise((resolve, reject) => {
      onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const ordersArray = Object.values(data) as Order[];
          ordersArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          resolve(ordersArray);
        } else {
          resolve([]);
        }
      }, {
        onlyOnce: true
      }, (error) => {
        console.error('Error fetching orders:', error);
        reject(error);
      });
    });
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    return new Promise((resolve, reject) => {
      const orderRef = ref(database, `orders/${orderId}`);
      onValue(orderRef, (snapshot) => {
        const data = snapshot.val();
        resolve(data ? { id: orderId, ...data } as Order : null);
      }, {
        onlyOnce: true
      }, (error) => {
        console.error('Error fetching order by ID:', error);
        reject(error);
      });
    });
  }

  async saveOrder(orderData: Partial<Order>): Promise<Order> {
    try {
      const newOrderRef = push(ordersRef);
      const orderId = newOrderRef.key!;
      
      const order: Order = {
        id: orderId,
        customerName: orderData.customerName || orderData.customerInfo?.name || '',
        phone: orderData.phone || orderData.customerInfo?.phone || '',
        email: orderData.email || orderData.customerInfo?.email || '',
        deliveryAddress: orderData.deliveryAddress || orderData.customerInfo?.deliveryAddress || '',
        amount: orderData.amount || 0,
        status: orderData.status || 'pending',
        items: orderData.items || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentMethod: orderData.paymentMethod || 'mpesa',
        mpesaReceipt: orderData.mpesaReceipt,
        mpesaRequestId: orderData.mpesaRequestId,
        checkoutRequestId: orderData.checkoutRequestId,
        transactionId: orderData.transactionId,
        customerInfo: orderData.customerInfo || {
          name: orderData.customerName || '',
          phone: orderData.phone || '',
          email: orderData.email || '',
          deliveryAddress: orderData.deliveryAddress || ''
        },
        mpesaData: orderData.mpesaData
      };
      
      await set(newOrderRef, order);
      
      // Create notification
      await this.createNotification(
        `New order #${orderId.slice(-6)} from ${order.customerName}`,
        'info',
        orderId
      );
      
      console.log('✅ Order saved successfully:', orderId);
      return order;
    } catch (error) {
      console.error('❌ Error saving order:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: Order['status'], mpesaData?: any): Promise<void> {
    try {
      const orderRef = ref(database, `orders/${orderId}`);
      
      const updates: any = {
        status,
        updatedAt: new Date().toISOString()
      };
      
      if (mpesaData) {
        updates.mpesaData = mpesaData;
        if (mpesaData.mpesaReceiptNumber) {
          updates.mpesaReceipt = mpesaData.mpesaReceiptNumber;
        }
        if (mpesaData.transactionDate) {
          updates.transactionId = mpesaData.mpesaReceiptNumber;
        }
      }
      
      await update(orderRef, updates);
      
      // Create notification based on status
      const statusMessages = {
        'paid': `Order #${orderId.slice(-6)} payment confirmed ✅`,
        'payment_failed': `Order #${orderId.slice(-6)} payment failed ❌`,
        'delivered': `Order #${orderId.slice(-6)} delivered 📦`,
        'cancelled': `Order #${orderId.slice(-6)} cancelled`,
        'pending': `Order #${orderId.slice(-6)} is pending`,
        'payment_pending': `Order #${orderId.slice(-6)} awaiting payment`
      };
      
      const notificationType = status === 'paid' ? 'success' : 
                              status === 'payment_failed' ? 'error' : 
                              status === 'delivered' ? 'success' : 'info';
      
      await this.createNotification(
        statusMessages[status] || `Order #${orderId.slice(-6)} status: ${status}`,
        notificationType,
        orderId
      );
      
      console.log('✅ Order status updated:', orderId, status);
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  }

  async updateOrderWithMpesaRequest(orderId: string, mpesaRequestId: string, checkoutRequestId: string): Promise<void> {
    try {
      const orderRef = ref(database, `orders/${orderId}`);
      
      await update(orderRef, {
        mpesaRequestId,
        checkoutRequestId,
        status: 'payment_pending',
        updatedAt: new Date().toISOString()
      });
      
      await this.createNotification(
        `M-Pesa payment initiated for order #${orderId.slice(-6)} 📱`,
        'info',
        orderId
      );
      
      console.log('✅ Order updated with M-Pesa request:', orderId);
    } catch (error) {
      console.error('❌ Error updating order with M-Pesa request:', error);
      throw error;
    }
  }

  async findOrderByCheckoutRequestId(checkoutRequestId: string): Promise<Order | null> {
    return new Promise((resolve, reject) => {
      onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const orders = Object.values(data) as Order[];
          const order = orders.find(o => o.checkoutRequestId === checkoutRequestId);
          resolve(order || null);
        } else {
          resolve(null);
        }
      }, {
        onlyOnce: true
      }, (error) => {
        console.error('Error finding order by checkout request ID:', error);
        reject(error);
      });
    });
  }

  async findOrderByMpesaRequestId(mpesaRequestId: string): Promise<Order | null> {
    return new Promise((resolve, reject) => {
      onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const orders = Object.values(data) as Order[];
          const order = orders.find(o => o.mpesaRequestId === mpesaRequestId);
          resolve(order || null);
        } else {
          resolve(null);
        }
      }, {
        onlyOnce: true
      }, (error) => {
        console.error('Error finding order by M-Pesa request ID:', error);
        reject(error);
      });
    });
  }

  // ==================== NOTIFICATIONS ====================
  
  async createNotification(message: string, type: Notification['type'] = 'info', orderId?: string): Promise<void> {
    try {
      const notification: Notification = {
        id: Date.now().toString(),
        message,
        type,
        time: new Date().toISOString(),
        read: false,
        orderId
      };
      await addNotification(notification);
      console.log('✅ Notification created:', message);
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = ref(database, `notifications/${notificationId}`);
      await update(notificationRef, { read: true });
      console.log('✅ Notification marked as read:', notificationId);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(): Promise<void> {
    try {
      const notifications = await new Promise<Notification[]>((resolve, reject) => {
        onValue(notificationsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const notificationsArray = Object.values(data) as Notification[];
            resolve(notificationsArray);
          } else {
            resolve([]);
          }
        }, {
          onlyOnce: true
        }, (error) => {
          reject(error);
        });
      });

      const updatePromises = notifications
        .filter(n => !n.read)
        .map(async (notification) => {
          const notificationRef = ref(database, `notifications/${notification.id}`);
          await update(notificationRef, { read: true });
        });

      await Promise.all(updatePromises);
      console.log(`✅ Marked ${updatePromises.length} notifications as read`);
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notificationRef = ref(database, `notifications/${notificationId}`);
      await set(notificationRef, null);
      console.log('✅ Notification deleted:', notificationId);
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================
  
  subscribeToProducts(callback: (products: Product[]) => void) {
    return onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsArray = Object.values(data) as Product[];
        callback(productsArray);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Error in products subscription:', error);
    });
  }

  subscribeToOrders(callback: (orders: Order[]) => void) {
    return onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const ordersArray = Object.values(data) as Order[];
        ordersArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(ordersArray);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Error in orders subscription:', error);
    });
  }

  subscribeToNotifications(callback: (notifications: Notification[]) => void) {
    return onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notificationsArray = Object.values(data) as Notification[];
        notificationsArray.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        callback(notificationsArray);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Error in notifications subscription:', error);
    });
  }

  subscribeToOrder(orderId: string, callback: (order: Order | null) => void) {
    const orderRef = ref(database, `orders/${orderId}`);
    return onValue(orderRef, (snapshot) => {
      const data = snapshot.val();
      callback(data ? { id: orderId, ...data } as Order : null);
    }, (error) => {
      console.error('Error in order subscription:', error);
    });
  }

  // ==================== STATISTICS ====================
  
  getStatistics(orders: Order[], products: Product[]) {
    const totalRevenue = orders
      .filter(order => order.status === 'paid' || order.status === 'delivered')
      .reduce((sum, order) => sum + order.amount, 0);

    const pendingOrders = orders.filter(order => 
      order.status === 'pending' || order.status === 'payment_pending'
    ).length;

    const paidOrders = orders.filter(order => order.status === 'paid').length;
    const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
    const failedOrders = orders.filter(order => order.status === 'payment_failed').length;
    
    const totalProducts = products.length;
    const inStockProducts = products.filter(p => p.inStock).length;
    const outOfStockProducts = products.filter(p => !p.inStock).length;
    const totalOrders = orders.length;

    return {
      totalRevenue,
      pendingOrders,
      paidOrders,
      deliveredOrders,
      cancelledOrders,
      failedOrders,
      totalProducts,
      inStockProducts,
      outOfStockProducts,
      totalOrders
    };
  }

  // ==================== INITIALIZATION ====================
  
  async initializeDatabaseWithSampleProducts(sampleProducts: Product[]): Promise<void> {
    try {
      const productsSnapshot = await new Promise((resolve, reject) => {
        onValue(productsRef, (snapshot) => {
          resolve(snapshot.val());
        }, {
          onlyOnce: true
        }, (error) => {
          reject(error);
        });
      });

      if (!productsSnapshot) {
        console.log('🔄 Initializing database with sample products...');
        const promises = sampleProducts.map(product => addProduct(product));
        await Promise.all(promises);
        console.log(`✅ Database initialized with ${sampleProducts.length} sample products`);
      } else {
        console.log('✅ Database already has products');
      }
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      throw error;
    }
  }

  // ==================== LEGACY METHODS (Deprecated) ====================
  
  /** @deprecated Use saveOrder instead */
  async createOrder(order: Order): Promise<void> {
    console.warn('⚠️ createOrder is deprecated. Use saveOrder instead.');
    return addOrder(order);
  }

  /** @deprecated Use updateOrderStatus instead */
  async modifyOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    console.warn('⚠️ modifyOrderStatus is deprecated. Use updateOrderStatus instead.');
    return updateOrderStatus(orderId, status);
  }
}

export default new FirebaseService();
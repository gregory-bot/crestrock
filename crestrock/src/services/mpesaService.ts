import axios from 'axios';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Always use your Render URL for now
  return 'https://backend-payment-cv4c.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('📡 API Base URL:', API_BASE_URL);

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  brand: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  location?: string;
  deliveryAddress?: string;
}

export interface OrderData {
  items: OrderItem[];
  total: number;
  customerInfo: CustomerInfo;
  paymentMethod: 'mpesa' | 'whatsapp' | 'cash';
}

export interface MpesaPaymentRequest {
  phoneNumber: string;
  amount: number;
  orderId: string;
  accountReference?: string;
  transactionDesc?: string;
}

export interface MpesaPaymentResponse {
  success: boolean;
  data?: {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    ResponseDescription: string;
    CustomerMessage: string;
  };
  message: string;
  error?: any;
}

export interface OrderResponse {
  success: boolean;
  order: {
    id: string;
    items: OrderItem[];
    total: number;
    customerInfo: CustomerInfo;
    paymentMethod: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}

class PaymentService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: 60000, // Increased timeout for Render cold starts
    withCredentials: false, // Don't send credentials for CORS
  });

  // Test backend connection
  async testConnection(): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      console.log('🔄 Testing backend connection to:', API_BASE_URL);
      const response = await this.api.get('/health');
      console.log('✅ Backend connection successful:', response.data);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Backend connection failed');
      console.error('URL tried:', API_BASE_URL + '/health');
      console.error('Error:', error.message);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', error.response.data);
      }
      
      return { 
        success: false, 
        error: error.response?.data || error.message 
      };
    }
  }

  // Create order
  async createOrder(orderData: OrderData): Promise<OrderResponse> {
    try {
      console.log('📦 Creating order...');
      console.log('URL:', API_BASE_URL + '/orders');
      console.log('Order data:', JSON.stringify(orderData, null, 2));
      
      const response = await this.api.post('/orders', orderData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      console.log('✅ Order created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating order');
      console.error('URL tried:', API_BASE_URL + '/orders');
      console.error('Full error object:', error);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received. This is likely a CORS or network issue.');
        console.error('Request was made but no response received.');
      }
      
      throw this.handleApiError(error, 'create order');
    }
  }

  // Initiate M-Pesa payment
  async initiateMpesaPayment(paymentData: MpesaPaymentRequest): Promise<MpesaPaymentResponse> {
    try {
      console.log('📱 Initiating M-Pesa payment...');
      console.log('URL:', API_BASE_URL + '/mpesa/stk-push');
      console.log('Payment data:', JSON.stringify(paymentData, null, 2));
      
      const response = await this.api.post('/mpesa/stk-push', paymentData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      console.log('✅ M-Pesa payment initiated successfully:', response.data);
      
      // Extract the nested data from the backend response
      return {
        success: response.data.success || true,
        data: response.data.data, // The M-Pesa response data
        message: response.data.message || 'Payment initiated successfully'
      };
    } catch (error: any) {
      console.error('❌ Error initiating M-Pesa payment');
      console.error('URL tried:', API_BASE_URL + '/mpesa/stk-push');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', error.response.data);
      }
      
      throw this.handleApiError(error, 'initiate M-Pesa payment');
    }
  }

  // Check order status
  async checkOrderStatus(orderId: string) {
    try {
      console.log('🔍 Checking order status for:', orderId);
      const response = await this.api.get(`/orders/${orderId}`);
      console.log('✅ Order status retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error checking order status:', error);
      throw this.handleApiError(error, 'check order status');
    }
  }

  // Format phone number for M-Pesa
  formatPhoneNumber(phone: string): string {
    try {
      let cleaned = phone.replace(/\D/g, '');
      
      if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
      } else if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
      }
      
      if (!cleaned.startsWith('254')) {
        cleaned = '254' + cleaned;
      }
      
      if (cleaned.length !== 12) {
        throw new Error(`Invalid phone number length: ${cleaned.length} (expected 12)`);
      }
      
      return cleaned;
    } catch (error: any) {
      throw new Error(`Failed to format phone number "${phone}": ${error.message}`);
    }
  }

  // Validate phone number
  validatePhoneNumber(phone: string): boolean {
    try {
      const formatted = this.formatPhoneNumber(phone);
      return formatted.length === 12 && formatted.startsWith('254');
    } catch (error) {
      console.warn('Phone validation failed:', error);
      return false;
    }
  }

  // Generate order reference
  generateOrderReference(orderId: string): string {
    const shortId = orderId.slice(-8).toUpperCase();
    return `ORD-${shortId}`;
  }

  // Handle API errors
  private handleApiError(error: any, context: string): Error {
    console.error(`🔴 API Error in ${context}:`, error);
    
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout. The server is taking too long to respond. Please try again.');
    }
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      let message = `Failed to ${context}`;
      
      if (status === 404) {
        message = `API endpoint not found (${status}). Check if backend is running correctly.`;
      } else if (status === 400) {
        message = data.message || `Invalid request: ${data.error || 'Please check your input'}`;
      } else if (status === 500) {
        message = data.message || 'Server error. Please try again later.';
      } else if (status === 403 || status === 401) {
        message = 'CORS error: Request blocked. Please check backend CORS configuration.';
      } else if (data.message) {
        message = data.message;
      } else if (data.error) {
        message = data.error;
      }
      
      const apiError = new Error(message);
      (apiError as any).status = status;
      (apiError as any).data = data;
      return apiError;
    } else if (error.request) {
      // No response received - Likely CORS issue or server offline
      console.error('No response received. This could be due to:');
      console.error('1. CORS policy blocking the request');
      console.error('2. Server is offline or sleeping');
      console.error('3. Network connectivity issue');
      
      return new Error('Cannot connect to payment server. This could be due to CORS restrictions or the server being offline.');
    } else {
      // Request setup error
      console.error('Request setup error:', error.message);
      return new Error(`Error setting up request to ${context}: ${error.message}`);
    }
  }

  // Get current backend URL (for debugging)
  getBackendUrl(): string {
    return API_BASE_URL;
  }

  // Get available endpoints (for debugging)
  getAvailableEndpoints(): string[] {
    return [
      'GET /health',
      'POST /orders',
      'GET /orders/:id',
      'POST /mpesa/stk-push',
      'POST /mpesa/callback'
    ];
  }

  // Test if backend is reachable (simple ping)
  async pingBackend(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default new PaymentService();
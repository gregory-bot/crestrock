// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, remove } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBO--4yHvKbkKgqcH7bs1noXQYPd_RoRPE",
  authDomain: "gadgets-83800.firebaseapp.com",
  databaseURL: "https://gadgets-83800-default-rtdb.firebaseio.com",
  projectId: "gadgets-83800",
  storageBucket: "gadgets-83800.firebasestorage.app",
  messagingSenderId: "653161553774",
  appId: "1:653161553774:web:8569f17388fad37fe82b7f",
  measurementId: "G-EXPEZYVJKS"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Database references
export const productsRef = ref(database, 'products');
export const ordersRef = ref(database, 'orders');
export const notificationsRef = ref(database, 'notifications');

// Helper functions
export const addProduct = (product: any) => {
  const productRef = ref(database, `products/${product.id}`);
  return set(productRef, product);
};

export const updateProduct = (productId: string, updates: any) => {
  const productRef = ref(database, `products/${productId}`);
  return update(productRef, updates);
};

export const deleteProduct = (productId: string) => {
  const productRef = ref(database, `products/${productId}`);
  return remove(productRef);
};

export const addOrder = (order: any) => {
  const orderRef = ref(database, `orders/${order.id}`);
  return set(orderRef, order);
};

export const updateOrderStatus = (orderId: string, status: string) => {
  const orderRef = ref(database, `orders/${orderId}/status`);
  return set(orderRef, status);
};

export const addNotification = (notification: any) => {
  const notificationRef = ref(database, `notifications/${Date.now()}`);
  return set(notificationRef, notification);
};

export const adminLogin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const adminLogout = async () => {
  await signOut(auth);
};

export { database, auth };
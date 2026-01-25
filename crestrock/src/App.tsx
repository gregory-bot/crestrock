import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { CartProvider } from "./contexts/CartContext";
import { initializeProducts } from "./services/initializeProducts";

import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Category from "./pages/Category";
import Cart from "./pages/Cart";
import OrderConfirmation from "./pages/OrderConfirmation"; // ADDED
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";

import Footer from "./components/Footer";
import WhatsAppFab from "./components/WhatsAppFab";
import AdminLogin from "./components/AdminLogin";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * 🔹 Initialize database / seed products on app startup
   * Runs once when the app mounts
   */
  useEffect(() => {
    const initDB = async () => {
      try {
        console.log("🗄️ Initializing product database...");
        await initializeProducts();
        console.log("✅ Product database initialized");
      } catch (error) {
        console.error("❌ Failed to initialize product database", error);
      }
    };

    initDB();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          {/* Notifications */}
          <Toaster />
          <Sonner />

          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/"
                element={
                  <Index
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                  />
                }
              />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route
                path="/category/:slug"
                element={
                  <Category
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                  />
                }
              />
              <Route path="/cart" element={<Cart />} />
              <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} /> {/* ADDED */}
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={<Navigate to="/admin/dashboard" replace />}
              />
              <Route
                path="/admin/*"
                element={<Navigate to="/admin/dashboard" replace />}
              />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>

          {/* Global UI */}
          <Footer />
          <WhatsAppFab />
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
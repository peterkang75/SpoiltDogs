import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/cart-context";
import { PetProvider } from "@/context/pet-context";
import { AuthProvider } from "@/context/auth-context";
import { PetWizard } from "@/components/pet-wizard";
import Home from "@/pages/home";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Categories from "@/pages/categories";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Success from "@/pages/success";
import Cancel from "@/pages/cancel";
import MyOrders from "@/pages/my-orders";
import AdminCRM from "@/pages/admin-crm";
import AdminProducts from "@/pages/admin-products";
import AdminMarketing from "@/pages/admin-marketing";
import AdminBrandStudio from "@/pages/admin-brand-studio";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminScheduler from "@/pages/admin-scheduler";
import AdminLogin from "@/pages/admin-login";
import Login from "@/pages/login";
import MyAccount from "@/pages/my-account";
import OurStory from "@/pages/our-story";
import ShippingPolicy from "@/pages/shipping-policy";
import RefundPolicy from "@/pages/refund-policy";
import PrivacyPolicy from "@/pages/privacy-policy";
import ContactUs from "@/pages/contact";
import NotFound from "@/pages/not-found";
import ChatWidget from "@/components/ChatWidget";
import { NewsletterPopup } from "@/components/newsletter-popup";

function StorefrontExtras() {
  const [location] = useLocation();
  if (location.startsWith("/admin") || location === "/checkout" || location === "/login") return null;
  return <NewsletterPopup />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/products/:slug" component={ProductDetail} />
      <Route path="/categories" component={Categories} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/success" component={Success} />
      <Route path="/cancel" component={Cancel} />
      <Route path="/my-orders" component={MyOrders} />
      <Route path="/login" component={Login} />
      <Route path="/my-account" component={MyAccount} />
      <Route path="/our-story" component={OurStory} />
      <Route path="/shipping-policy" component={ShippingPolicy} />
      <Route path="/refund-policy" component={RefundPolicy} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/crm" component={AdminCRM} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/marketing" component={AdminMarketing} />
      <Route path="/admin/brand-studio" component={AdminBrandStudio} />
      <Route path="/admin/scheduler" component={AdminScheduler} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function StorefrontChat() {
  const [location] = useLocation();
  if (location.startsWith("/admin")) return null;
  return <ChatWidget />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <PetProvider>
            <CartProvider>
              <Toaster />
              <PetWizard />
              <Router />
              <StorefrontChat />
              <StorefrontExtras />
            </CartProvider>
          </PetProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Link, useLocation } from "wouter";
import { ShoppingBag, Search, Menu, X, Dog, Sparkles, ClipboardList, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart-context";
import { usePet } from "@/context/pet-context";
import { useAuth } from "@/context/auth-context";
import { CartDrawer } from "@/components/cart-drawer";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { totalItems } = useCart();
  const { hasPet, petName, setShowWizard } = usePet();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const openDrawer = () => setCartOpen(true);
    window.addEventListener("open-cart-drawer", openDrawer);
    return () => window.removeEventListener("open-cart-drawer", openDrawer);
  }, []);
  const [, navigate] = useLocation();

  const displayName = user
    ? (user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Account")
    : null;
  const initials = displayName
    ? displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : null;

  const handleAdminQuickAccess = async () => {
    try {
      await apiRequest("POST", "/api/admin/dev-login");
      navigate("/admin/dashboard");
    } catch {
      navigate("/admin/dashboard");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }} data-testid="navbar">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button
              size="icon"
              variant="ghost"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
            <Link href="/" data-testid="link-logo">
              <span className="inline-flex items-center gap-2">
                <Dog className="h-6 w-6 text-sage" />
                <span className="font-serif text-xl font-bold tracking-tight text-dark">
                  SpoiltDogs
                </span>
              </span>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-8" data-testid="nav-desktop">
            <Link href="/" className="text-sm font-medium text-dark/80 transition-colors" data-testid="link-nav-home">
              Home
            </Link>
            <Link href="/products" className="text-sm font-medium text-dark/80 transition-colors" data-testid="link-nav-shop">
              Shop
            </Link>
            <Link href="/our-story" className="text-sm font-medium text-dark/80 transition-colors" data-testid="link-nav-our-story">
              Our Story
            </Link>
            <a href="#ai-concierge" className="text-sm font-medium text-sage transition-colors flex items-center gap-1" data-testid="link-nav-consultant">
              <Sparkles className="h-3 w-3" />
              Consultant
            </a>
            <Link href="/my-orders" className="text-sm font-medium text-dark/80 transition-colors flex items-center gap-1" data-testid="link-nav-orders">
              <ClipboardList className="h-3 w-3" />
              My Orders
            </Link>
            <a href="#faq" className="text-sm font-medium text-dark/80 transition-colors" data-testid="link-nav-faq">
              FAQ
            </a>
            <a href="#blog" className="text-sm font-medium text-dark/80 transition-colors" data-testid="link-nav-blog">
              Blog
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex gap-1.5 text-sage text-xs font-medium rounded-full"
              onClick={() => setShowWizard(true)}
              data-testid="button-personalise-nav"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {hasPet ? petName : "Personalise"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleAdminQuickAccess}
              data-testid="button-admin-quick"
              title="Admin CRM"
            >
              <Shield className="h-5 w-5 text-amber-600" />
            </Button>
            <Button size="icon" variant="ghost" data-testid="button-search">
              <Search className="h-5 w-5" />
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="relative rounded-full" data-testid="button-account-menu">
                    <div className="w-7 h-7 rounded-full bg-sage flex items-center justify-center text-cream text-xs font-bold">
                      {initials}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/my-account" data-testid="link-my-account-nav">My Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-orders" data-testid="link-my-orders-nav">My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive" data-testid="button-nav-sign-out">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button size="icon" variant="ghost" data-testid="button-account-login">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="relative"
              onClick={() => setCartOpen(true)}
              data-testid="button-cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-cream" data-testid="badge-cart-count">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden bg-cream px-4 pb-4" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }} data-testid="nav-mobile">
            <nav className="flex flex-col gap-2 pt-2">
              <Link href="/" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-dark/80" data-testid="link-mobile-home">Home</Link>
              <Link href="/products" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-dark/80" data-testid="link-mobile-shop">Shop</Link>
              <Link href="/our-story" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-dark/80" data-testid="link-mobile-our-story">Our Story</Link>
              <a href="#ai-concierge" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-sage flex items-center gap-1.5" data-testid="link-mobile-consultant">
                <Sparkles className="h-3.5 w-3.5" />
                Consultant
              </a>
              <Link href="/my-orders" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-dark/80 flex items-center gap-1.5" data-testid="link-mobile-orders">
                <ClipboardList className="h-3.5 w-3.5" />
                My Orders
              </Link>
              <Link href="/contact" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-dark/80" data-testid="link-mobile-contact">Contact Us</Link>
              <a href="#faq" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-dark/80" data-testid="link-mobile-faq">FAQ</a>
              <a href="#blog" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-dark/80" data-testid="link-mobile-blog">Blog</a>
              <button
                className="py-2 text-sm font-medium text-sage flex items-center gap-1.5"
                onClick={() => { setMobileOpen(false); setShowWizard(true); }}
                data-testid="button-personalise-mobile"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {hasPet ? `${petName}'s Profile` : "Personalise My Shop"}
              </button>
            </nav>
          </div>
        )}
      </header>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}

import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Truck, MapPin, ArrowRight, Loader2, Dog, PawPrint, Star, ShieldCheck, Mail } from "lucide-react";
import { Link } from "wouter";
import { usePet } from "@/context/pet-context";
import { useCart } from "@/context/cart-context";
import { useEffect, useState, useMemo, useRef } from "react";
import { formatAud } from "@/lib/currency";
import { saveOrder, type SavedOrder } from "@/lib/orders";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

function FallingTreats() {
  const treats = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 3,
      size: 12 + Math.random() * 14,
      rotation: Math.random() * 360,
      icon: i % 3,
    })), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {treats.map((t) => (
        <div
          key={t.id}
          className="absolute animate-treat-fall"
          style={{
            left: `${t.left}%`,
            animationDelay: `${t.delay}s`,
            animationDuration: `${t.duration}s`,
          }}
        >
          {t.icon === 0 ? (
            <PawPrint
              className="text-sage/25"
              style={{ width: t.size, height: t.size, transform: `rotate(${t.rotation}deg)` }}
            />
          ) : t.icon === 1 ? (
            <Star
              className="text-gold/30 fill-gold/15"
              style={{ width: t.size, height: t.size, transform: `rotate(${t.rotation}deg)` }}
            />
          ) : (
            <Dog
              className="text-terracotta/20"
              style={{ width: t.size, height: t.size, transform: `rotate(${t.rotation}deg)` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function WaggingTail() {
  return (
    <div className="flex justify-center" data-testid="icon-success">
      <div className="relative">
        <div
          className="h-28 w-28 rounded-full flex items-center justify-center animate-success-pop"
          style={{ backgroundColor: "rgba(45,90,71,0.08)" }}
        >
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(45,90,71,0.12)" }}
          >
            <CheckCircle className="h-10 w-10 text-sage animate-success-check" />
          </div>
        </div>
        <div className="absolute -bottom-1 -right-1 animate-wag origin-bottom-left">
          <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center">
            <PawPrint className="h-5 w-5 text-gold" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Success() {
  const { petName: contextPetName } = usePet();
  const { items: cartItems, totalPriceAud, clearCart } = useCart();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<{
    petName: string;
    customerEmail: string | null;
    amountTotal: number | null;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const orderSaved = useRef(false);

  const stableOrderId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const storageKey = sessionId ? `spoiltdog_orderid_${sessionId}` : null;
    if (storageKey) {
      const existing = localStorage.getItem(storageKey);
      if (existing) return existing;
    }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const newId = "SD-AU-" + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    if (storageKey) localStorage.setItem(storageKey, newId);
    return newId;
  }, []);

  const [savedOrderData, setSavedOrderData] = useState<SavedOrder | null>(null);

  useEffect(() => {
    if (orderSaved.current) return;

    const itemsSnapshot = cartItems.length > 0
      ? cartItems.map((e) => ({ name: e.product.name, priceAud: e.product.priceAud, quantity: e.quantity }))
      : [];
    const totalSnapshot = totalPriceAud;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (sessionId) {
      fetch(`/api/checkout/session?session_id=${sessionId}`)
        .then((r) => r.json())
        .then((data) => {
          setSessionData(data);

          if (data.customerEmail) {
            setEmailInput(data.customerEmail);
            setEmailSent(true);
          }

          const order: SavedOrder = {
            orderId: stableOrderId,
            petName: data.petName || contextPetName,
            totalAud: data.amountTotal ?? totalSnapshot,
            status: "preparing",
            date: new Date().toISOString(),
            items: itemsSnapshot,
          };
          saveOrder(order);
          setSavedOrderData(order);
          orderSaved.current = true;
          setLoading(false);
        })
        .catch(() => {
          saveOrderFromCart(itemsSnapshot, totalSnapshot);
          setLoading(false);
        });
    } else {
      saveOrderFromCart(itemsSnapshot, totalSnapshot);
      setLoading(false);
    }

    clearCart();
  }, []);

  function saveOrderFromCart(items: SavedOrder["items"], total: number) {
    if (orderSaved.current) return;
    const order: SavedOrder = {
      orderId: stableOrderId,
      petName: contextPetName,
      totalAud: total > 0 ? total : null,
      status: "preparing",
      date: new Date().toISOString(),
      items,
    };
    saveOrder(order);
    setSavedOrderData(order);
    orderSaved.current = true;
  }

  const displayName = sessionData?.petName || contextPetName;

  const handleSendEmail = async () => {
    if (!emailInput.trim()) {
      toast({ title: "Enter an email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    const order = savedOrderData || {
      orderId: stableOrderId,
      petName: displayName,
      totalAud: sessionData?.amountTotal ?? null,
      date: new Date().toISOString(),
      items: [],
    };

    setEmailSending(true);
    try {
      const res = await fetch("/api/email/order-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailInput.trim(),
          order: {
            orderId: order.orderId,
            petName: order.petName,
            totalAud: order.totalAud,
            date: order.date,
            items: order.items,
          },
        }),
      });
      const data = await res.json();

      if (data.success) {
        setEmailSent(true);
        toast({ title: "Email Sent!", description: `Confirmation email sent to ${emailInput.trim()}` });
      } else {
        toast({ title: "Email Failed", description: data.error || "Something went wrong.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Email Failed", description: err.message || "Could not send email.", variant: "destructive" });
    } finally {
      setEmailSending(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 bg-cream flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sage" />
        </div>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <FallingTreats />

      <div className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #2D5A47 0%, #2D5A47 35%, #FCF9F1 35%, #FCF9F1 100%)",
          }}
        />

        <div className="relative z-10 flex items-start justify-center px-4 py-12 sm:py-16">
          <div className="max-w-lg w-full space-y-6">

            <div className="text-center space-y-5 pt-4 pb-2">
              <WaggingTail />

              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-widest text-cream/70 animate-fade-in" data-testid="text-success-eyebrow">
                  Order Confirmed
                </p>
                <h1
                  className="font-serif text-3xl sm:text-4xl font-bold text-cream animate-fade-in-up"
                  data-testid="text-success-title"
                >
                  Woohoo, {displayName}!
                </h1>
                <p
                  className="text-base text-cream/80 leading-relaxed max-w-md mx-auto animate-fade-in-up"
                  style={{ animationDelay: "0.1s" }}
                  data-testid="text-success-message"
                >
                  G'day! We've received your order. We're now prepping the best for your furry mate.
                  You'll receive a tracking link via email shortly.
                </p>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl overflow-hidden animate-fade-in-up"
              style={{
                boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
                animationDelay: "0.2s",
                animationFillMode: "backwards",
              }}
              data-testid="card-order-receipt"
            >
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    Order Number
                  </p>
                  <p className="font-mono text-sm font-bold text-dark mt-0.5" data-testid="text-order-id">
                    {stableOrderId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    Total
                  </p>
                  <p className="font-serif text-lg font-bold text-dark mt-0.5" data-testid="text-success-amount">
                    {(sessionData?.amountTotal ?? savedOrderData?.totalAud) != null
                      ? formatAud((sessionData?.amountTotal ?? savedOrderData?.totalAud)!)
                      : "$--"}
                    <span className="text-[10px] font-normal text-muted-foreground ml-0.5">AUD</span>
                  </p>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4" data-testid="card-order-info">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-sage/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Package className="h-4 w-4 text-sage" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-serif font-bold text-dark text-sm">Being Prepared</p>
                      <span className="text-[10px] font-semibold text-sage bg-sage/8 px-2.5 py-0.5 rounded-full">
                        In Progress
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Handpicked and packed with care in Australia
                    </p>
                  </div>
                </div>

                <div className="relative flex items-center gap-2 pl-4 ml-0.5">
                  <div className="absolute left-[17px] -top-4 w-px h-4 bg-sage/15" />
                  <div className="h-2 w-2 rounded-full bg-sage/20 shrink-0" />
                  <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full w-1/4 rounded-full bg-sage animate-pulse" />
                  </div>
                </div>

                <div className="flex items-start gap-3 opacity-40">
                  <div className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-dark text-sm">Shipping</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Estimated delivery: 3–5 business days within AU
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 opacity-25">
                  <div className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-dark text-sm">Delivered</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {displayName} will be spoilt rotten!
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="px-6 py-4 flex items-center gap-3"
                style={{ borderTop: "1px solid rgba(0,0,0,0.05)", backgroundColor: "rgba(45,90,71,0.03)" }}
              >
                <ShieldCheck className="h-4 w-4 text-sage shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  Secure payment processed by Stripe. 30-day happiness guarantee on all SpoiltDogs products.
                </p>
              </div>
            </div>

            <div
              className="space-y-3 pt-1 animate-fade-in-up"
              style={{ animationDelay: "0.35s", animationFillMode: "backwards" }}
            >
              <Link href="/">
                <Button
                  className="w-full bg-sage text-cream rounded-full gap-2 h-12 shadow-sm"
                  data-testid="button-back-home"
                >
                  Continue Shopping for {displayName}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              {!emailSent ? (
                <div
                  className="bg-white rounded-2xl p-4 space-y-3"
                  style={{ border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
                  data-testid="card-email-send"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-sage" />
                    <p className="text-sm font-medium text-dark">Send Order Confirmation</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="flex-1 rounded-full text-sm"
                      data-testid="input-email"
                    />
                    <Button
                      className="bg-sage text-cream rounded-full gap-2 px-5 shadow-sm"
                      onClick={handleSendEmail}
                      disabled={emailSending}
                      data-testid="button-send-email"
                    >
                      {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      {emailSending ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="bg-sage/5 rounded-2xl p-4 flex items-center gap-3"
                  style={{ border: "1px solid rgba(45,90,71,0.1)" }}
                  data-testid="card-email-sent"
                >
                  <CheckCircle className="h-5 w-5 text-sage shrink-0" />
                  <p className="text-sm text-dark">
                    Confirmation sent to <span className="font-semibold">{emailInput}</span>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-4 pt-1">
                <Link href="/my-orders" className="text-xs text-sage font-medium underline-offset-2 hover:underline" data-testid="link-my-orders">
                  View My Orders
                </Link>
                <span className="text-xs text-muted-foreground/30">|</span>
                <p className="text-xs text-muted-foreground">
                  Contact: <span className="text-sage font-medium">hello@spoiltdogs.com.au</span>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

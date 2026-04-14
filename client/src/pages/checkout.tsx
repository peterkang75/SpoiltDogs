import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { useCart } from "@/context/cart-context";
import { formatAud } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  ShoppingBag, Truck, RotateCcw, ChevronRight, ArrowLeft,
  MapPin, Lock, Package, Loader2, CheckCircle2
} from "lucide-react";
import { SiAfterpay } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";

const FREE_SHIPPING_THRESHOLD = 10000;
const STANDARD_SHIPPING = 995;

let stripePromise: ReturnType<typeof loadStripe> | null = null;

async function getStripePromise() {
  if (!stripePromise) {
    const res = await fetch("/api/stripe/publishable-key");
    const { publishableKey } = await res.json();
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

interface CheckoutFormProps {
  orderTotal: number;
  freeShipping: boolean;
  shippingCost: number;
}

function CheckoutForm({ orderTotal, freeShipping, shippingCost }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [paymentReady, setPaymentReady] = useState(false);

  const { items, totalPriceAud, totalItems } = useCart();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErrorMsg("");

    const returnUrl = `${window.location.origin}/success`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: {
          billing_details: {
            name: `${firstName} ${lastName}`.trim(),
            email,
            address: {
              line1: address,
              city: suburb,
              state,
              postal_code: postcode,
              country: "AU",
            },
          },
        },
        shipping: {
          name: `${firstName} ${lastName}`.trim(),
          address: {
            line1: address,
            city: suburb,
            state,
            postal_code: postcode,
            country: "AU",
          },
        },
      },
    });

    if (error) {
      setErrorMsg(error.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    }
  };

  const fieldClass = "w-full rounded-xl px-4 py-3 text-sm text-dark outline-none transition-shadow focus:shadow-[0_0_0_2px_#4B9073]";
  const fieldStyle = {
    backgroundColor: "#F9F9F9",
    border: "1px solid rgba(0,0,0,0.1)",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="checkout-form-panel">

      {/* Contact */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
        data-testid="section-contact-info"
      >
        <h2 className="font-semibold text-dark text-base">Contact information</h2>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={fieldClass}
          style={fieldStyle}
          data-testid="input-checkout-email"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className={fieldClass}
            style={fieldStyle}
            data-testid="input-checkout-first-name"
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className={fieldClass}
            style={fieldStyle}
            data-testid="input-checkout-last-name"
          />
        </div>
      </div>

      {/* Shipping address */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
        data-testid="section-shipping"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-sage" />
          <h2 className="font-semibold text-dark text-base">Shipping address</h2>
        </div>
        <input
          type="text"
          placeholder="Street address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          className={fieldClass}
          style={fieldStyle}
          data-testid="input-checkout-address"
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Suburb / City"
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            required
            className={`${fieldClass} col-span-2`}
            style={fieldStyle}
            data-testid="input-checkout-suburb"
          />
          <input
            type="text"
            placeholder="Postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            required
            className={fieldClass}
            style={fieldStyle}
            data-testid="input-checkout-postcode"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
            className={fieldClass}
            style={{ ...fieldStyle, appearance: "auto" }}
            data-testid="select-checkout-state"
          >
            <option value="">State / Territory</option>
            <option value="NSW">New South Wales</option>
            <option value="VIC">Victoria</option>
            <option value="QLD">Queensland</option>
            <option value="WA">Western Australia</option>
            <option value="SA">South Australia</option>
            <option value="TAS">Tasmania</option>
            <option value="ACT">Australian Capital Territory</option>
            <option value="NT">Northern Territory</option>
          </select>
          <div
            className={`${fieldClass} text-dark/40 cursor-not-allowed`}
            style={fieldStyle}
          >
            Australia
          </div>
        </div>
      </div>

      {/* Shipping method */}
      <div
        className="rounded-2xl p-6 space-y-3"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
        data-testid="section-shipping-method"
      >
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-4 w-4 text-sage" />
          <h2 className="font-semibold text-dark text-base">Shipping method</h2>
        </div>
        <div
          className="flex items-center justify-between rounded-xl p-4"
          style={{ backgroundColor: "#E3EDE6", border: "2px solid #4B9073" }}
        >
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full border-2 border-sage flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-sage" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dark">Standard Shipping</p>
              <p className="text-xs text-dark/50">3–5 business days · Metro AU</p>
            </div>
          </div>
          <span className="text-sm font-semibold text-dark">
            {freeShipping ? <span className="text-sage">FREE</span> : formatAud(STANDARD_SHIPPING)}
          </span>
        </div>
        <div
          className="flex items-center justify-between rounded-xl p-4 opacity-50 cursor-not-allowed"
          style={{ backgroundColor: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full border-2 border-dark/20" />
            <div>
              <p className="text-sm font-medium text-dark/60">Express Shipping</p>
              <p className="text-xs text-dark/35">1–2 business days · Metro AU</p>
            </div>
          </div>
          <span className="text-sm font-medium text-dark/50">{formatAud(1495)}</span>
        </div>
      </div>

      {/* Payment — Stripe Payment Element */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
        data-testid="section-payment"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-sage" />
            <h2 className="font-semibold text-dark text-base">Payment</h2>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-dark/40">
            <Lock className="h-3 w-3" />
            SSL encrypted
          </div>
        </div>

        {/* Afterpay promo strip */}
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ backgroundColor: "#000", border: "none" }}
          data-testid="afterpay-promo-strip"
        >
          <SiAfterpay className="h-5 w-5 shrink-0" style={{ color: "#B2FCE4" }} />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            <span className="font-bold" style={{ color: "#B2FCE4" }}>Afterpay available</span>
            {" "}— Buy now, pay in 4 interest-free instalments. Select Afterpay below.
          </p>
        </div>

        {/* Stripe Payment Element */}
        <div data-testid="payment-methods-panel">
          <PaymentElement
            onReady={() => setPaymentReady(true)}
            options={{
              layout: "tabs",
              paymentMethodOrder: ["afterpay_clearpay", "apple_pay", "google_pay", "card"],
            }}
          />
          {!paymentReady && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-dark/40" data-testid="payment-element-loading">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payment options…
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-red-700"
            style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}
            data-testid="checkout-error"
          >
            {errorMsg}
          </div>
        )}
      </div>

      {/* Place order CTA */}
      <Button
        type="submit"
        size="lg"
        className="w-full rounded-full py-6 text-base font-semibold gap-2"
        style={{ backgroundColor: "#4B9073", color: "#fff", border: "none" }}
        disabled={!stripe || !elements || submitting}
        data-testid="button-place-order"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Complete Order · {formatAud(orderTotal)}
          </>
        )}
      </Button>

      <p className="text-center text-xs text-dark/35">
        By completing your order you agree to our{" "}
        <Link href="/privacy-policy" className="underline hover:text-dark/60">Privacy Policy</Link>
        {" "}and{" "}
        <Link href="/refund-policy" className="underline hover:text-dark/60">Refund Policy</Link>.
      </p>
    </form>
  );
}

export default function Checkout() {
  const { items, totalPriceAud, totalItems } = useCart();
  const freeShipping = totalPriceAud >= FREE_SHIPPING_THRESHOLD;
  const shippingCost = freeShipping ? 0 : STANDARD_SHIPPING;
  const orderTotal = totalPriceAud + shippingCost;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeInstance, setStripeInstance] = useState<Awaited<ReturnType<typeof loadStripe>> | null>(null);
  const [intentError, setIntentError] = useState("");
  const [loadingIntent, setLoadingIntent] = useState(false);

  useEffect(() => {
    if (items.length === 0 || loadingIntent || clientSecret) return;

    setLoadingIntent(true);
    Promise.all([
      getStripePromise(),
      apiRequest("POST", "/api/payment-intent", { amountAud: orderTotal }),
    ])
      .then(async ([stripe, res]) => {
        const data = await res.json();
        setStripeInstance(stripe);
        setClientSecret(data.clientSecret);
      })
      .catch((err) => {
        console.error("[checkout] payment intent error:", err);
        setIntentError("Could not initialise payment. Please refresh and try again.");
      })
      .finally(() => setLoadingIntent(false));
  }, [items.length, orderTotal]);

  const stripeAppearance = {
    theme: "stripe" as const,
    variables: {
      colorPrimary: "#4B9073",
      colorBackground: "#FFFFFF",
      colorText: "#1a3a2e",
      colorDanger: "#EF4444",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      borderRadius: "12px",
    },
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FCF9F1" }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-dark/40 mb-6">
          <Link href="/" className="hover:text-dark/60 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/cart" className="hover:text-dark/60 transition-colors">Cart</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-dark/70">Checkout</span>
        </nav>

        <div className="flex items-center gap-3 mb-8">
          <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm text-sage hover:opacity-70 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* LEFT — Form */}
          <div className="lg:col-span-7">
            {items.length === 0 ? (
              <div
                className="rounded-2xl p-12 text-center space-y-4"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <ShoppingBag className="h-12 w-12 text-dark/15 mx-auto" />
                <p className="text-dark/50">Your cart is empty</p>
                <Link href="/products">
                  <Button className="rounded-full" style={{ backgroundColor: "#4B9073", color: "#fff", border: "none" }}>
                    Browse Products
                  </Button>
                </Link>
              </div>
            ) : intentError ? (
              <div
                className="rounded-2xl p-8 text-center space-y-3"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <p className="text-sm text-red-600">{intentError}</p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="rounded-full text-sm"
                >
                  Retry
                </Button>
              </div>
            ) : !clientSecret || !stripeInstance ? (
              <div
                className="rounded-2xl p-12 flex flex-col items-center gap-4"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
                data-testid="checkout-loading"
              >
                <Loader2 className="h-8 w-8 animate-spin text-sage" />
                <p className="text-sm text-dark/40">Setting up secure checkout…</p>
              </div>
            ) : (
              <Elements
                stripe={stripeInstance}
                options={{
                  clientSecret,
                  appearance: stripeAppearance,
                }}
              >
                <CheckoutForm
                  orderTotal={orderTotal}
                  freeShipping={freeShipping}
                  shippingCost={shippingCost}
                />
              </Elements>
            )}
          </div>

          {/* RIGHT — Order summary */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4" data-testid="checkout-summary-panel">
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif font-bold text-dark text-lg">Order Summary</h2>
                <Link href="/cart">
                  <span className="text-xs text-sage hover:opacity-70 transition-opacity cursor-pointer">
                    Edit cart
                  </span>
                </Link>
              </div>

              {items.length === 0 ? (
                <div className="py-8 text-center space-y-3" data-testid="checkout-empty-cart">
                  <ShoppingBag className="h-10 w-10 text-dark/15 mx-auto" />
                  <p className="text-sm text-dark/40">Your cart is empty</p>
                  <Link href="/products">
                    <Button size="sm" className="rounded-full" style={{ backgroundColor: "#4B9073", color: "#fff", border: "none" }}>
                      Shop now
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((entry) => (
                    <div key={entry.product.id} className="flex items-center gap-3" data-testid={`checkout-item-${entry.product.id}`}>
                      <div
                        className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-stone-100"
                        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                      >
                        {entry.product.imageUrl ? (
                          <img src={entry.product.imageUrl} alt={entry.product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-dark/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark truncate">{entry.product.name}</p>
                        <p className="text-xs text-dark/40">Qty {entry.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-dark shrink-0">
                        {formatAud(entry.product.priceAud * entry.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.06)" }} />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark/60">Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
                  <span className="font-medium text-dark">{formatAud(totalPriceAud)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-dark/60">
                    <Truck className="h-3.5 w-3.5" />
                    Shipping
                  </div>
                  {freeShipping ? (
                    <span className="font-semibold text-sage text-xs">FREE</span>
                  ) : (
                    <span className="font-medium text-dark">{formatAud(shippingCost)}</span>
                  )}
                </div>
                {!freeShipping && (
                  <p className="text-xs text-dark/40 text-right">
                    Spend {formatAud(FREE_SHIPPING_THRESHOLD - totalPriceAud)} more for free shipping
                  </p>
                )}
              </div>

              <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.06)" }} />

              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-dark">Total (AUD)</span>
                <span className="font-serif text-2xl font-bold text-dark" data-testid="text-checkout-total">
                  {formatAud(orderTotal)}
                </span>
              </div>

              {/* Afterpay installment in summary */}
              {orderTotal >= 3500 && orderTotal <= 200000 && (
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ backgroundColor: "#E8FFF5", border: "1px solid rgba(0,200,120,0.2)" }}
                  data-testid="afterpay-installment-compact"
                >
                  <SiAfterpay className="h-4 w-4 shrink-0" style={{ color: "#00C878" }} />
                  <p className="text-xs text-dark/70">
                    or 4 payments of{" "}
                    <strong>${((orderTotal / 4) / 100).toFixed(2)}</strong>
                    {" "}with <strong>Afterpay</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Trust signals */}
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
              data-testid="checkout-trust-panel"
            >
              {[
                { icon: Truck, text: "Free shipping on orders over $100" },
                { icon: RotateCcw, text: "30-day hassle-free returns" },
                { icon: Lock, text: "Secure, encrypted checkout" },
                { icon: CheckCircle2, text: "Afterpay — 4 interest-free payments" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-dark/60">
                  <Icon className="h-3.5 w-3.5 text-sage shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

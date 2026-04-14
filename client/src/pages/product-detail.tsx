import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { MarqueeBanner } from "@/components/marquee-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, ArrowLeft, Star, Truck, Shield, RotateCcw,
  Lock, Plus, Minus, ChevronDown, ChevronRight, Loader2, Dog, Leaf, Award
} from "lucide-react";
import { PaymentBadges } from "@/components/payment-badges";
import { SiAfterpay } from "react-icons/si";
import { useCart } from "@/context/cart-context";
import { useToast } from "@/hooks/use-toast";
import { formatAud } from "@/lib/currency";
import type { Product } from "@shared/schema";

import imgTreats from "@assets/product-treats.png";
import imgBed from "@assets/product-bed.png";
import imgBall from "@assets/product-ball.png";
import imgCollar from "@assets/product-collar.png";

const relatedProducts = [
  { id: "prod-1", name: "Organic Kangaroo & Turmeric Bites", priceAud: 2495, badge: "Best Seller", image: imgTreats, rating: 4.9, reviews: 128, slug: "kangaroo-jerky-treats" },
  { id: "prod-2", name: "Orthopedic Memory Foam Bed", priceAud: 12900, badge: null, image: imgBed, rating: 4.8, reviews: 87, slug: "memory-foam-bed" },
  { id: "prod-3", name: "Smart Interactive Ball", priceAud: 8900, badge: "Trending", image: imgBall, rating: 4.7, reviews: 203, slug: "interactive-ball" },
  { id: "prod-4", name: "Italian Leather Collar", priceAud: 5500, badge: "Limited", image: imgCollar, rating: 5.0, reviews: 64, slug: "leather-collar" },
];

const sampleReviews = [
  { name: "Sarah M.", location: "Sydney, NSW", rating: 5, date: "Feb 2026", text: "Absolutely obsessed with this! My golden Max won't stop asking for more. The quality is incredible — you can tell it's genuinely premium. Fast delivery too.", verified: true },
  { name: "James K.", location: "Melbourne, VIC", rating: 5, date: "Jan 2026", text: "My vet actually recommended switching to higher-quality treats and this ticked every box. Grain-free, natural ingredients and my boy loves them. Worth every cent.", verified: true },
  { name: "Priya L.", location: "Brisbane, QLD", rating: 4, date: "Jan 2026", text: "Great product, my pup took to it straight away. Packaging is beautiful and feels very premium. Knocked off one star only because I wish the bag was bigger!", verified: false },
];

const productFeatures: Record<string, { icon: typeof Leaf; label: string }[]> = {
  default: [
    { icon: Leaf, label: "All-natural, no artificial additives" },
    { icon: Award, label: "Vet-approved formula" },
    { icon: Dog, label: "Guk-dung tested & approved" },
    { icon: Truck, label: "Free shipping on orders over $100" },
  ],
};

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${i <= Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-dark/15"}`}
        />
      ))}
    </div>
  );
}

function AccordionItem({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-dark hover:text-sage transition-colors"
        onClick={() => setOpen(!open)}
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-dark/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-5 text-sm text-dark/60 leading-relaxed space-y-2">{children}</div>}
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data: product, isLoading, isError } = useQuery<Product>({
    queryKey: [`/api/products/${slug}`],
    enabled: !!slug,
  });

  const handleAddToCart = () => {
    if (!product) return;
    addItem({ id: product.id, name: product.name, priceAud: product.priceAud, imageUrl: product.imageUrl ?? undefined }, qty);
    window.dispatchEvent(new CustomEvent("open-cart-drawer"));
    toast({ title: "Added to cart", description: `${qty}× ${product.name} is in your cart.` });
  };

  const savings = product?.compareAtPriceAud ? product.compareAtPriceAud - product.priceAud : 0;
  const savingsPct = product?.compareAtPriceAud ? Math.round((savings / product.compareAtPriceAud) * 100) : 0;
  const features = productFeatures.default;

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FCF9F1" }}>
      <MarqueeBanner />
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-dark/40 mb-8" data-testid="product-breadcrumb">
          <Link href="/" className="hover:text-dark/60 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/products" className="hover:text-dark/60 transition-colors">Shop</Link>
          <ChevronRight className="h-3 w-3" />
          {isLoading ? <span className="w-24 h-3 bg-dark/10 rounded animate-pulse inline-block" /> : (
            <span className="text-dark/70 truncate max-w-[200px]">{product?.name ?? "Product"}</span>
          )}
        </nav>

        {/* Back link */}
        <Link href="/products" className="inline-flex items-center gap-1.5 text-sm font-medium text-sage hover:text-sage/70 transition-colors mb-8" data-testid="link-back-products">
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center py-32" data-testid="loading-product">
            <Loader2 className="h-10 w-10 animate-spin text-sage" />
          </div>
        ) : !product || isError ? (
          <div className="text-center py-32 space-y-3" data-testid="product-not-found">
            <p className="text-2xl font-serif font-bold text-dark">Product not found</p>
            <p className="text-dark/50 text-sm">This product may no longer be available.</p>
            <Link href="/products">
              <Button className="mt-4 rounded-full" style={{ backgroundColor: "#4B9073", color: "#fff" }}>Browse all products</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start" data-testid={`product-detail-${product.slug}`}>

              {/* LEFT — Image */}
              <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-3">
                <div
                  className="relative rounded-3xl overflow-hidden bg-white shadow-md"
                  style={{ aspectRatio: "1 / 1", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      data-testid="img-product"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "#E3EDE6" }}>
                      <Dog className="h-16 w-16 text-sage/50" />
                      <p className="text-xs text-dark/40 font-medium">Image coming soon</p>
                    </div>
                  )}
                  {product.badge && (
                    <div className="absolute top-4 left-4">
                      <span
                        className="text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full shadow"
                        style={{ backgroundColor: "#FFD54F", color: "#1a1a1a" }}
                        data-testid="badge-product-image"
                      >
                        {product.badge}
                      </span>
                    </div>
                  )}
                  {/* Guk-dung stamp */}
                  <div
                    className="absolute bottom-4 right-4 flex flex-col items-center justify-center rounded-full text-center shadow-lg"
                    style={{ width: 72, height: 72, backgroundColor: "#1a3a2e", border: "2px solid rgba(255,213,79,0.6)" }}
                  >
                    <Dog className="h-4 w-4 mb-0.5" style={{ color: "#FFD54F" }} />
                    <p className="text-white font-bold leading-tight" style={{ fontSize: "8px", lineHeight: "1.1" }}>GUK-DUNG<br/>APPROVED</p>
                  </div>
                </div>

                {/* Trust badges strip below image */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Truck, label: "Free over $100" },
                    { icon: RotateCcw, label: "30-day returns" },
                    { icon: Shield, label: "Vet approved" },
                    { icon: Lock, label: "Secure checkout" },
                  ].map(({ icon: Icon, label }, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-dark/60"
                      style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-sage" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT — Info */}
              <div className="lg:col-span-6 space-y-6">

                {/* Badges + in-stock */}
                <div className="flex flex-wrap items-center gap-2">
                  {product.badge && (
                    <span
                      className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full"
                      style={{ backgroundColor: "#FFD54F", color: "#1a1a1a" }}
                    >
                      {product.badge}
                    </span>
                  )}
                  {product.inStock ? (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#E3EDE6", color: "#4B9073" }} data-testid="badge-stock">
                      In Stock
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-600" data-testid="badge-stock">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Product name */}
                <h1
                  className="font-serif font-bold text-dark leading-tight"
                  style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}
                  data-testid="text-product-name"
                >
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-3">
                  <StarRow rating={4.9} size="md" />
                  <span className="text-sm text-dark/50">4.9 <span className="text-dark/30">·</span> 128 reviews</span>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-serif font-bold text-dark" style={{ fontSize: "2rem" }} data-testid="text-product-price">
                      {formatAud(product.priceAud)}
                    </span>
                    {product.compareAtPriceAud && (
                      <>
                        <span className="text-base text-dark/35 line-through" data-testid="text-product-compare-price">
                          {formatAud(product.compareAtPriceAud)}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#4B9073", color: "#FFFFFF" }}>
                          Save {savingsPct}%
                        </span>
                      </>
                    )}
                  </div>
                  {/* Afterpay installment line */}
                  <div className="flex items-center gap-1.5 text-xs text-dark/60" data-testid="afterpay-installment-price">
                    <span>or 4 payments of</span>
                    <span className="font-semibold text-dark">
                      ${((product.priceAud / 4) / 100).toFixed(2)}
                    </span>
                    <span>with</span>
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5" style={{ backgroundColor: "#000" }}>
                      <SiAfterpay className="h-3 w-3" style={{ color: "#B2FCE4" }} />
                      <span className="text-[10px] font-bold" style={{ color: "#B2FCE4" }}>Afterpay</span>
                    </span>
                    <a
                      href="https://www.afterpay.com/en-AU/how-it-works"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dark/30 hover:text-dark/50 transition-colors underline underline-offset-2"
                    >
                      Info
                    </a>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-dark/65 leading-relaxed text-sm" data-testid="text-product-description">
                    {product.description}
                  </p>
                )}

                {/* Feature highlights */}
                <div className="space-y-2.5 py-1">
                  {features.map(({ icon: Icon, label }, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-dark/70">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#E3EDE6" }}>
                        <Icon className="h-3.5 w-3.5 text-sage" />
                      </div>
                      {label}
                    </div>
                  ))}
                </div>

                <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.07)" }} />

                {/* Quantity + CTA */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold text-dark">Quantity</p>
                    <div
                      className="inline-flex items-center rounded-full overflow-hidden"
                      style={{ border: "1.5px solid rgba(0,0,0,0.12)" }}
                    >
                      <button
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        className="h-10 w-10 flex items-center justify-center text-dark/50 hover:text-dark hover:bg-dark/5 transition-colors"
                        data-testid="button-qty-minus"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-dark" data-testid="text-qty">{qty}</span>
                      <button
                        onClick={() => setQty(q => q + 1)}
                        className="h-10 w-10 flex items-center justify-center text-dark/50 hover:text-dark hover:bg-dark/5 transition-colors"
                        data-testid="button-qty-plus"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full rounded-full py-6 text-base font-semibold gap-2.5 shadow-md hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: "#4B9073", color: "#FFFFFF", border: "none" }}
                    disabled={!product.inStock}
                    onClick={handleAddToCart}
                    data-testid="button-add-to-cart"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {product.inStock ? `Add to Cart — ${formatAud(product.priceAud * qty)}` : "Out of Stock"}
                  </Button>

                </div>

                {/* Payment methods */}
                <PaymentBadges priceAud={product.priceAud * qty} variant="compact" />

                {/* Accordion */}
                <div className="space-y-0 pt-2">
                  <AccordionItem title="Product Details">
                    <p>Premium Australian-sourced ingredients, carefully selected to meet the nutritional needs of active dogs. No artificial colours, flavours, or preservatives. Suitable for all breeds and ages.</p>
                  </AccordionItem>
                  <AccordionItem title="Ingredients & Nutrition">
                    <p>100% natural ingredients. Free from grain, soy, and dairy. Rich in Omega-3 fatty acids and essential vitamins. Full nutritional panel available on the product label.</p>
                  </AccordionItem>
                  <AccordionItem title="Shipping & Returns">
                    <p>Free shipping on orders over $100 AUD. Standard delivery: 3–5 business days (metro) / 5–10 business days (regional). 30-day returns for change of mind.</p>
                    <p className="mt-2">
                      <Link href="/shipping-policy" className="text-sage underline underline-offset-2 hover:opacity-70">View full Shipping Policy →</Link>
                    </p>
                  </AccordionItem>
                </div>
              </div>
            </div>

            {/* REVIEWS */}
            <section className="mt-20 lg:mt-24" data-testid="section-reviews">
              <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-dark">Customer Reviews</h2>
                  <div className="flex items-center gap-3">
                    <StarRow rating={4.9} size="md" />
                    <span className="text-sm text-dark/50">4.9 out of 5 · 128 reviews</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {sampleReviews.map((review, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-6 space-y-4"
                    style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
                    data-testid={`review-card-${i}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-dark text-sm">{review.name}</p>
                        <p className="text-xs text-dark/40">{review.location}</p>
                      </div>
                      {review.verified && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "#E3EDE6", color: "#4B9073" }}>
                          Verified
                        </span>
                      )}
                    </div>
                    <StarRow rating={review.rating} />
                    <p className="text-sm text-dark/65 leading-relaxed">"{review.text}"</p>
                    <p className="text-xs text-dark/30">{review.date}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* RELATED PRODUCTS */}
            <section className="mt-20 lg:mt-24 pb-4" data-testid="section-related">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-dark mb-8">You May Also Like</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {relatedProducts.map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`} data-testid={`card-related-${p.id}`}>
                    <div
                      className="group rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
                    >
                      <div className="relative overflow-hidden aspect-square bg-stone-100">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {p.badge && (
                          <span
                            className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: "#FFD54F", color: "#1a1a1a" }}
                          >
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-xs font-semibold text-dark leading-snug line-clamp-2">{p.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold" style={{ color: "#4B9073" }}>{formatAud(p.priceAud)}</span>
                          <div className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs text-dark/40">{p.rating}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

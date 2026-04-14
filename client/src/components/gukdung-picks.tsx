import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Star, ArrowRight, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/context/cart-context";
import { useToast } from "@/hooks/use-toast";
import { formatAud } from "@/lib/currency";
import { Link } from "wouter";
import type { Product } from "@shared/schema";

function GukdungStamp() {
  return (
    <div
      className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
      style={{
        background: "conic-gradient(from 0deg, #FFD54F 0%, #F7B500 50%, #FFD54F 100%)",
        boxShadow: "0 0 0 3px #1a3a2e, 0 0 0 5px #FFD54F44",
      }}
      aria-label="Guk-dung Approved Stamp"
    >
      <div
        className="absolute inset-1.5 rounded-full flex flex-col items-center justify-center"
        style={{ backgroundColor: "#1a3a2e" }}
      >
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="11" cy="8" rx="3.2" ry="2.5" fill="#FFD54F" />
          <ellipse cx="21" cy="8" rx="3.2" ry="2.5" fill="#FFD54F" />
          <ellipse cx="6" cy="14" rx="2.4" ry="2" fill="#FFD54F" />
          <ellipse cx="26" cy="14" rx="2.4" ry="2" fill="#FFD54F" />
          <path d="M7 18 Q16 26 25 18 Q22 28 16 29 Q10 28 7 18Z" fill="#FFD54F" />
        </svg>
        <p className="text-[7px] font-black tracking-tight leading-none mt-0.5" style={{ color: "#FFD54F" }}>APPROVED</p>
      </div>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white/8">
      <Skeleton className="h-52 w-full rounded-none" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />
      <div className="p-5 space-y-3">
        <Skeleton className="h-3 w-2/3 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />
        <Skeleton className="h-4 w-full rounded" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />
        <Skeleton className="h-4 w-3/4 rounded" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />
        <Skeleton className="h-9 w-full rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />
      </div>
    </div>
  );
}

export function GukdungPicks() {
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/featured"],
  });

  const { addItem } = useCart();
  const { toast } = useToast();

  const picks = products?.slice(0, 4) ?? [];

  const handleAdd = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      priceAud: product.priceAud,
      imageUrl: product.imageUrl ?? "",
    });
    window.dispatchEvent(new CustomEvent("open-cart-drawer"));
    toast({
      title: "국둥이's pick added!",
      description: `${product.name} is now in your cart.`,
    });
  };

  return (
    <section
      className="relative py-16 sm:py-24"
      style={{ backgroundColor: "#1a3a2e" }}
      data-testid="section-gukdung-picks"
    >
      {/* Subtle texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1.5px 1.5px, #fff 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ─── EDITORIAL HEADER ─── */}
        <div className="mb-14 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 items-center">

          {/* Left — text */}
          <div>
            {/* Eyebrow badge */}
            <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5"
              style={{ borderColor: "rgba(255,213,79,0.35)", backgroundColor: "rgba(255,213,79,0.08)" }}>
              <BadgeCheck className="h-3.5 w-3.5" style={{ color: "#FFD54F" }} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#FFD54F" }}>
                Chief Taste Officer's Selection
              </span>
            </div>

            {/* Heading row */}
            <div className="flex items-center gap-5 mb-5">
              <GukdungStamp />
              <div>
                <h2
                  className="font-serif font-bold leading-[1.05]"
                  style={{ fontSize: "clamp(2.25rem,5vw,3rem)", color: "#fff" }}
                  data-testid="text-gukdung-picks-title"
                >
                  Guk-dung's
                  <br />
                  <span style={{ color: "#FFD54F" }}>Picks</span>
                </h2>
              </div>
            </div>

            {/* Quote from the dog */}
            <blockquote
              className="relative pl-5 mb-7 text-base leading-relaxed italic"
              style={{
                color: "rgba(255,255,255,0.65)",
                borderLeft: "3px solid rgba(255,213,79,0.4)",
              }}
            >
              "Woof. I personally sniffed, chewed, and napped on every single one.
              These are the good ones. Trust me — I'm a professional."
              <footer className="mt-2 not-italic text-sm font-semibold" style={{ color: "#FFD54F" }}>
                — Guk-dung, Corgi · Chief Taste Officer, SpoiltDogs
              </footer>
            </blockquote>

            {/* Perks */}
            <ul className="space-y-2.5 mb-8">
              {[
                "Hand-tested by Guk-dung himself",
                "Vet-checked before every approval",
                "Sourced from premium Australian suppliers",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <span
                    className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
                    style={{ backgroundColor: "rgba(255,213,79,0.15)", color: "#FFD54F" }}
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/products">
              <Button
                className="rounded-full gap-2 font-semibold text-sm px-6"
                style={{ backgroundColor: "#FFD54F", color: "#1a1a1a", border: "none" }}
                data-testid="button-gukdung-see-all"
              >
                See All Recommendations
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Right — 국둥이 photo */}
          <div className="relative hidden lg:block">
            {/* Decorative ring */}
            <div
              className="absolute -inset-3 rounded-3xl opacity-20"
              style={{ border: "2px dashed #FFD54F" }}
            />
            <div
              className="relative overflow-hidden rounded-3xl"
              style={{ aspectRatio: "4 / 3" }}
            >
              <img
                src="/banner-2-kukdungi-park.jpeg"
                alt="Guk-dung at the park"
                className="h-full w-full object-cover"
                style={{ objectPosition: "center 15%" }}
                data-testid="img-gukdung-hero"
              />
              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(26,58,46,0.1) 0%, rgba(26,58,46,0.45) 100%)",
                }}
              />
              {/* Floating name tag */}
              <div
                className="absolute bottom-5 left-5 rounded-2xl px-4 py-3"
                style={{ backgroundColor: "rgba(26,58,46,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,213,79,0.25)" }}
              >
                <p className="text-xs font-bold" style={{ color: "#FFD54F" }}>국둥이</p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>Chief Taste Officer · Sydney, AU</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── PRODUCT GRID ─── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="grid-gukdung-picks">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : picks.map((product, index) => (
              <div
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white transition-transform duration-300 hover:-translate-y-1"
                style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.25)" }}
                data-testid={`card-gukdung-pick-${product.id}`}
              >
                {/* Image */}
                <div className="relative overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
                  <img
                    src={product.imageUrl ?? ""}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    data-testid={`img-gukdung-pick-${product.id}`}
                  />

                  {/* Badge (top-left) */}
                  {product.badge && (
                    <Badge
                      className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full border-none shadow"
                      style={{ backgroundColor: "#1a3a2e", color: "#FFD54F" }}
                      data-testid={`badge-gukdung-pick-${product.id}`}
                    >
                      {product.badge}
                    </Badge>
                  )}

                  {/* Pick number medallion */}
                  <div
                    className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shadow"
                    style={{ backgroundColor: "#FFD54F", color: "#1a1a1a" }}
                    data-testid={`pick-number-${product.id}`}
                  >
                    #{index + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4 space-y-3">
                  {/* Guk-dung approved strip */}
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 w-fit"
                    style={{ backgroundColor: "rgba(75,144,115,0.1)" }}
                  >
                    <svg viewBox="0 0 20 20" className="h-3 w-3 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="7" cy="4.5" rx="2" ry="1.6" fill="#4B9073" />
                      <ellipse cx="13" cy="4.5" rx="2" ry="1.6" fill="#4B9073" />
                      <ellipse cx="3.5" cy="8" rx="1.6" ry="1.3" fill="#4B9073" />
                      <ellipse cx="16.5" cy="8" rx="1.6" ry="1.3" fill="#4B9073" />
                      <path d="M4 11 Q10 17 16 11 Q14 18 10 18.5 Q6 18 4 11Z" fill="#4B9073" />
                    </svg>
                    <span className="text-[10px] font-semibold" style={{ color: "#4B9073" }}>Guk-dung Approved</span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3 w-3 fill-terracotta text-terracotta" />
                    ))}
                    <span className="text-[11px] text-muted-foreground ml-1">5.0</span>
                  </div>

                  {/* Name */}
                  <h3
                    className="font-serif font-bold text-dark leading-snug text-[14px] flex-1"
                    data-testid={`text-gukdung-pick-name-${product.id}`}
                  >
                    {product.name}
                  </h3>

                  {/* Price + Add to cart */}
                  <div
                    className="flex items-center justify-between pt-3"
                    style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <div>
                      <span
                        className="text-base font-bold text-dark"
                        data-testid={`text-gukdung-pick-price-${product.id}`}
                      >
                        {formatAud(product.priceAud)}
                      </span>
                      {product.compareAtPriceAud && product.compareAtPriceAud > product.priceAud && (
                        <span className="ml-1.5 text-[11px] text-muted-foreground line-through">
                          {formatAud(product.compareAtPriceAud)}
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground block leading-none">AUD</span>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full gap-1 text-xs font-bold"
                      style={{ backgroundColor: "#1a3a2e", color: "#FFD54F", border: "none" }}
                      onClick={() => handleAdd(product)}
                      data-testid={`button-gukdung-add-${product.id}`}
                    >
                      <ShoppingBag className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Hover CTA strip */}
                <Link href={`/products/${product.slug}`}>
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center py-2.5 text-xs font-semibold cursor-pointer"
                    style={{ backgroundColor: "#FFD54F", color: "#1a1a1a" }}
                    data-testid={`link-gukdung-pick-detail-${product.id}`}
                  >
                    View Product →
                  </div>
                </Link>
              </div>
            ))}
        </div>

        {/* Bottom CTA */}
        {!isLoading && (
          <div className="mt-12 text-center">
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              There are more Guk-dung approved products waiting for you
            </p>
            <Link href="/products">
              <Button
                variant="outline"
                className="rounded-full px-8 gap-2 font-semibold text-sm"
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.8)",
                  backgroundColor: "transparent",
                }}
                data-testid="button-gukdung-view-all"
              >
                Browse Full Collection
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

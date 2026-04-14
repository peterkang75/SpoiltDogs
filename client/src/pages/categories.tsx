import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { MarqueeBanner } from "@/components/marquee-banner";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Star, ChevronRight, Loader2, Dog } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useToast } from "@/hooks/use-toast";
import { formatAud } from "@/lib/currency";
import type { Category, Product } from "@shared/schema";

const categoryMeta: Record<string, { emoji: string; color: string; bg: string; hero: string }> = {
  "dog-toys": {
    emoji: "🎾",
    color: "#F37052",
    bg: "#FFF4F1",
    hero: "https://images.pexels.com/photos/1629781/pexels-photo-1629781.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "beds": {
    emoji: "🛏️",
    color: "#4B9073",
    bg: "#EDF4F0",
    hero: "https://images.pexels.com/photos/4587998/pexels-photo-4587998.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "grooming": {
    emoji: "✂️",
    color: "#9B6FA3",
    bg: "#F4EFF7",
    hero: "https://images.pexels.com/photos/7210754/pexels-photo-7210754.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
};

function CategorySection({ category }: { category: Category }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const meta = categoryMeta[category.slug] ?? { color: "#4B9073", bg: "#EDF4F0", hero: "" };

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: [`/api/categories/${category.slug}/products`],
  });

  const handleAdd = (product: Product) => {
    addItem({ id: product.id, name: product.name, priceAud: product.priceAud, imageUrl: product.imageUrl ?? undefined });
    window.dispatchEvent(new CustomEvent("open-cart-drawer"));
    toast({ title: "Added to cart", description: `${product.name} is in your cart.` });
  };

  return (
    <section className="py-12 sm:py-16" data-testid={`section-category-${category.slug}`}>
      {/* Category header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: meta.bg }}
          >
            {meta.emoji}
          </div>
          <div>
            <h2
              className="font-serif text-xl sm:text-2xl font-bold text-dark"
              data-testid={`heading-category-${category.slug}`}
            >
              {category.name}
            </h2>
            {category.description && (
              <p className="text-sm text-dark/50 hidden sm:block">{category.description}</p>
            )}
          </div>
        </div>
        <Link href="/products">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5 text-sm"
            style={{ borderColor: meta.color, color: meta.color }}
            data-testid={`button-view-all-${category.slug}`}
          >
            View All
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: meta.color }} />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl" style={{ backgroundColor: meta.bg }}>
          <Dog className="h-10 w-10 text-dark/20" />
          <p className="text-sm text-dark/40">Products coming soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {products.slice(0, 3).map((product) => (
            <div
              key={product.id}
              className="group rounded-2xl overflow-hidden bg-white flex flex-col"
              style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              data-testid={`card-category-product-${product.id}`}
            >
              <Link href={`/products/${product.slug}`} className="block relative overflow-hidden aspect-square bg-stone-50">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    data-testid={`img-category-product-${product.id}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
                    <Dog className="h-10 w-10 text-dark/20" />
                  </div>
                )}
                {product.badge && (
                  <span
                    className="absolute top-2 left-2 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm"
                    style={{ backgroundColor: "#FFD54F", color: "#1a1a1a" }}
                    data-testid={`badge-category-product-${product.id}`}
                  >
                    {product.badge}
                  </span>
                )}
              </Link>

              <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
                <Link href={`/products/${product.slug}`}>
                  <h3 className="text-xs sm:text-sm font-semibold text-dark leading-snug line-clamp-2 hover:text-sage transition-colors" data-testid={`text-category-product-name-${product.id}`}>
                    {product.name}
                  </h3>
                </Link>

                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-[10px] text-dark/30 ml-1">5.0</span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-auto pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                  <div>
                    <span className="text-sm font-bold text-dark" data-testid={`text-category-product-price-${product.id}`}>
                      {formatAud(product.priceAud)}
                    </span>
                    {product.compareAtPriceAud && (
                      <span className="text-xs text-dark/30 line-through ml-1.5">
                        {formatAud(product.compareAtPriceAud)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAdd(product)}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-80 shrink-0"
                    style={{ backgroundColor: meta.color }}
                    data-testid={`button-add-category-product-${product.id}`}
                    aria-label={`Add ${product.name} to cart`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.06)", marginTop: "3rem" }} />
    </section>
  );
}

export default function Categories() {
  const { data: allCategories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const orderedCategories = ["dog-toys", "beds", "grooming"];
  const categories = orderedCategories
    .map((slug) => allCategories.find((c) => c.slug === slug))
    .filter(Boolean) as Category[];

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FCF9F1" }}>
      <MarqueeBanner />
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-8">

        {/* Page header */}
        <div className="mb-2 sm:mb-4">
          <nav className="flex items-center gap-2 text-xs text-dark/40 mb-4">
            <Link href="/" className="hover:text-dark/60 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-dark/70">Shop by Category</span>
          </nav>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#F37052" }}>
                Browse by Category
              </p>
              <h1 className="font-serif font-bold text-dark" style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }} data-testid="text-categories-title">
                Shop by Category
              </h1>
            </div>
            <Link href="/products">
              <Button
                variant="outline"
                className="rounded-full text-sm gap-1.5"
                data-testid="button-all-products"
              >
                <ShoppingBag className="h-4 w-4" />
                All Products
              </Button>
            </Link>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 flex-wrap pt-4 pb-2">
          {orderedCategories.map((slug) => {
            const meta = categoryMeta[slug];
            const cat = allCategories.find((c) => c.slug === slug);
            if (!cat) return null;
            return (
              <a
                key={slug}
                href={`#category-${slug}`}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                style={{ backgroundColor: meta.bg, color: meta.color }}
              >
                <span>{meta.emoji}</span>
                {cat.name}
              </a>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-10 w-10 animate-spin text-sage" />
          </div>
        ) : (
          <div>
            {categories.map((cat) => (
              <div key={cat.id} id={`category-${cat.slug}`}>
                <CategorySection category={cat} />
              </div>
            ))}
          </div>
        )}

        {/* CTA banner */}
        <div
          className="rounded-3xl p-8 sm:p-12 text-center mt-4"
          style={{ backgroundColor: "#1a3a2e" }}
          data-testid="cta-banner-categories"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-cream/50 mb-2">Can't decide?</p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream mb-3">
            Let our AI Concierge help
          </h2>
          <p className="text-cream/60 text-sm max-w-md mx-auto mb-6">
            Tell us about your dog — breed, age, lifestyle — and we'll recommend the perfect products from every category.
          </p>
          <a href="/#ai-concierge">
            <Button
              className="rounded-full px-8 font-semibold"
              style={{ backgroundColor: "#FFD54F", color: "#1a1a1a", border: "none" }}
              data-testid="button-ai-concierge-cta"
            >
              Get Personalised Picks
            </Button>
          </a>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

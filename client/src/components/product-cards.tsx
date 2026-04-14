import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Star, Truck, PackageOpen } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { formatAud } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

function ProductSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Skeleton className="aspect-[4/3] w-full rounded-t-lg rounded-b-none" />
        <div className="p-5 space-y-3">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-4">
      <PackageOpen className="h-14 w-14 text-muted-foreground/40" />
      <div>
        <p className="font-serif text-xl font-semibold text-dark mb-1">Products coming soon</p>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Our team is curating the finest products for your pup. Check back shortly.
        </p>
      </div>
    </div>
  );
}

export function ProductCards({ limit }: { limit?: number } = {}) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const displayProducts = limit ? products.slice(0, limit) : products;

  const handleAdd = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      priceAud: product.priceAud,
      imageUrl: product.imageUrl ?? undefined,
    });
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <section className="bg-sage-light py-16 sm:py-24" data-testid="section-products">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-medium uppercase tracking-widest text-terracotta mb-3" data-testid="text-products-eyebrow">
            Our Collection
          </p>
          <h2 className="font-serif text-3xl font-bold text-dark sm:text-4xl lg:text-5xl" data-testid="text-products-title">
            Spoil them <span className="text-sage">rotten</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground" data-testid="text-products-subtitle">
            Handpicked products that your dog will love and you'll feel great about.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
          ) : displayProducts.length === 0 ? (
            <EmptyState />
          ) : (
            displayProducts.map((product) => (
              <Card
                key={product.id}
                className="group relative overflow-visible bg-white hover-elevate transition-all duration-300"
                data-testid={`card-product-${product.id}`}
              >
                {product.badge && (
                  <Badge
                    className="absolute -top-2.5 right-4 z-10 bg-gold text-dark border-none text-xs font-bold px-3 shadow-sm"
                    data-testid={`badge-product-${product.id}`}
                  >
                    {product.badge}
                  </Badge>
                )}
                <CardContent className="p-0">
                  <Link href={`/products/${product.slug}`}>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-neutral-100 cursor-pointer">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          data-testid={`img-product-${product.id}`}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-3.5 w-3.5 fill-terracotta text-terracotta" />
                      ))}
                    </div>

                    <Link href={`/products/${product.slug}`}>
                      <h3
                        className="font-serif font-bold text-dark leading-snug text-[15px] hover:text-sage transition-colors cursor-pointer"
                        data-testid={`text-product-name-${product.id}`}
                      >
                        {product.name}
                      </h3>
                    </Link>

                    {product.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-sage">
                      <Truck className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">AU Shipping Available</span>
                    </div>

                    <div
                      className="flex items-center justify-between gap-3 pt-2"
                      style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
                    >
                      <span className="text-lg font-bold text-dark" data-testid={`text-product-price-${product.id}`}>
                        {formatAud(product.priceAud)}
                        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">AUD</span>
                      </span>
                      <Button
                        size="sm"
                        className="bg-sage text-cream rounded-full gap-1.5"
                        onClick={() => handleAdd(product)}
                        disabled={!product.inStock}
                        data-testid={`button-add-to-cart-${product.id}`}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        {product.inStock ? "Add" : "Sold Out"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {!isLoading && products.length > 0 && (
          <div className="text-center mt-14">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-dark rounded-full"
              style={{ border: "1px solid rgba(0,0,0,0.1)" }}
              data-testid="button-view-all-products"
            >
              <Link href="/products">View All Products</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

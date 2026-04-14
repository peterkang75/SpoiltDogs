import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { useCart } from "@/context/cart-context";
import { formatAud } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Cart() {
  const { items, totalItems, totalPriceAud, updateQuantity, removeItem, clearCart } = useCart();

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 bg-cream">
        <section className="mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-10">
          <h1 className="font-serif text-3xl font-bold text-dark" data-testid="text-cart-title">Your Cart</h1>
          <p className="mt-2 text-muted-foreground" data-testid="text-cart-subtitle">
            {totalItems === 0
              ? "Your cart is empty. Time to treat your furry mate!"
              : `${totalItems} item${totalItems > 1 ? "s" : ""} in your cart`}
          </p>

          {items.length === 0 ? (
            <div className="mt-16 text-center space-y-6" data-testid="cart-empty">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sage-light mx-auto">
                <ShoppingBag className="h-10 w-10 text-sage/50" />
              </div>
              <p className="text-muted-foreground">Nothing here yet!</p>
              <Link href="/">
                <Button className="bg-sage text-cream rounded-full gap-2" data-testid="button-continue-shopping">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mt-10 space-y-4" data-testid="cart-items">
              {items.map((entry) => (
                <Card key={entry.product.id} className="bg-card" data-testid={`cart-item-${entry.product.id}`}>
                  <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-neutral-50 overflow-hidden">
                      {entry.product.imageUrl ? (
                        <img
                          src={entry.product.imageUrl}
                          alt={entry.product.name}
                          className="h-full w-full object-cover"
                          data-testid={`img-cart-item-${entry.product.id}`}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-sage/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-bold text-dark truncate" data-testid={`text-cart-item-name-${entry.product.id}`}>
                        {entry.product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-cart-item-price-${entry.product.id}`}>
                        {formatAud(entry.product.priceAud)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                        onClick={() => updateQuantity(entry.product.id, entry.quantity - 1)}
                        data-testid={`button-decrease-${entry.product.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold text-dark" data-testid={`text-quantity-${entry.product.id}`}>
                        {entry.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                        onClick={() => updateQuantity(entry.product.id, entry.quantity + 1)}
                        data-testid={`button-increase-${entry.product.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="w-24 text-right font-bold text-dark" data-testid={`text-cart-item-total-${entry.product.id}`}>
                      {formatAud(entry.product.priceAud * entry.quantity)}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => removeItem(entry.product.id)}
                      data-testid={`button-remove-${entry.product.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              <div className="flex items-center justify-between pt-8" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                <Button variant="ghost" className="text-muted-foreground text-sm" onClick={clearCart} data-testid="button-clear-cart">
                  Clear Cart
                </Button>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="text-2xl font-serif font-bold text-dark" data-testid="text-cart-total">
                    {formatAud(totalPriceAud)}
                  </p>
                  {totalPriceAud >= 9900 && (
                    <p className="text-xs text-sage font-medium mt-1">Free shipping included!</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full text-dark rounded-full" style={{ border: "1px solid rgba(0,0,0,0.1)" }} data-testid="button-keep-shopping">
                    Keep Shopping
                  </Button>
                </Link>
                <Link href="/checkout" className="flex-1">
                  <Button className="w-full bg-sage text-cream rounded-full gap-2 shadow-sm" data-testid="button-checkout">
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}

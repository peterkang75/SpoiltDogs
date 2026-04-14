import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart-context";
import { usePet } from "@/context/pet-context";
import { formatAud } from "@/lib/currency";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items, totalItems, totalPriceAud, updateQuantity, removeItem, clearCart } = useCart();
  const { petName } = usePet();
  const { toast } = useToast();
  const [checkingOut, setCheckingOut] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckingOut(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((entry) => ({
            name: entry.product.name,
            priceAud: entry.product.priceAud,
            quantity: entry.quantity,
            imageUrl: entry.product.imageUrl,
          })),
          petName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      if (url) {
        window.open(url, "_blank");
        setCheckingOut(false);
        onOpenChange(false);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch {
      toast({
        title: "Checkout Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setCheckingOut(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md flex flex-col bg-cream p-0"
        style={{ border: "none" }}
        data-testid="drawer-cart"
      >
        <SheetHeader className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <SheetTitle className="font-serif text-xl font-bold text-dark flex items-center gap-2" data-testid="text-drawer-title">
            <ShoppingBag className="h-5 w-5 text-sage" />
            Your Cart
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalItems} item{totalItems !== 1 ? "s" : ""})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sage/8">
              <ShoppingBag className="h-8 w-8 text-sage/40" />
            </div>
            <p className="text-muted-foreground text-sm" data-testid="text-drawer-empty">Your cart is empty</p>
            <Button
              className="bg-sage text-cream rounded-full gap-2"
              onClick={() => onOpenChange(false)}
              data-testid="button-drawer-continue"
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" data-testid="drawer-cart-items">
              {items.map((entry) => (
                <div
                  key={entry.product.id}
                  className="flex gap-3 bg-white rounded-xl p-3"
                  style={{ border: "1px solid rgba(0,0,0,0.04)" }}
                  data-testid={`drawer-item-${entry.product.id}`}
                >
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-neutral-50 overflow-hidden">
                    {entry.product.imageUrl ? (
                      <img
                        src={entry.product.imageUrl}
                        alt={entry.product.name}
                        className="h-full w-full object-cover"
                        data-testid={`img-drawer-item-${entry.product.id}`}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-sage/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif text-sm font-bold text-dark truncate" data-testid={`text-drawer-item-name-${entry.product.id}`}>
                      {entry.product.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-drawer-item-price-${entry.product.id}`}>
                      {formatAud(entry.product.priceAud)} each
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground"
                        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
                        onClick={() => updateQuantity(entry.product.id, entry.quantity - 1)}
                        data-testid={`button-drawer-decrease-${entry.product.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-semibold text-dark w-5 text-center" data-testid={`text-drawer-qty-${entry.product.id}`}>
                        {entry.quantity}
                      </span>
                      <button
                        className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground"
                        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
                        onClick={() => updateQuantity(entry.product.id, entry.quantity + 1)}
                        data-testid={`button-drawer-increase-${entry.product.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        className="ml-auto text-muted-foreground/50 hover:text-terracotta transition-colors"
                        onClick={() => removeItem(entry.product.id)}
                        data-testid={`button-drawer-remove-${entry.product.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-dark shrink-0 pt-0.5" data-testid={`text-drawer-item-total-${entry.product.id}`}>
                    {formatAud(entry.product.priceAud * entry.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-6 py-5 space-y-4" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-xl font-serif font-bold text-dark" data-testid="text-drawer-total">
                  {formatAud(totalPriceAud)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">AUD</span>
                </span>
              </div>
              {totalPriceAud >= 9900 && (
                <p className="text-xs text-sage font-medium text-center">Free shipping on orders over $99!</p>
              )}
              <Button
                className="w-full bg-sage text-cream rounded-full gap-2 h-11 shadow-sm"
                onClick={handleCheckout}
                disabled={checkingOut}
                data-testid="button-drawer-checkout"
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting to Checkout...
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <div className="flex justify-between">
                <button
                  className="text-xs text-muted-foreground/60 underline-offset-2 hover:underline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-drawer-keep-shopping"
                >
                  Keep Shopping
                </button>
                <button
                  className="text-xs text-muted-foreground/60 underline-offset-2 hover:underline"
                  onClick={clearCart}
                  data-testid="button-drawer-clear"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

import { createContext, useContext, useState, useCallback } from "react";

export interface CartProduct {
  id: string;
  name: string;
  priceAud: number;
  imageUrl?: string;
}

export interface CartEntry {
  product: CartProduct;
  quantity: number;
}

interface CartContextValue {
  items: CartEntry[];
  totalItems: number;
  totalPriceAud: number;
  addItem: (product: CartProduct, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartEntry[]>([]);

  const addItem = useCallback((product: CartProduct, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((e) => e.product.id === product.id);
      if (existing) {
        return prev.map((e) =>
          e.product.id === product.id ? { ...e, quantity: e.quantity + qty } : e
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((e) => e.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((e) => e.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((e) => (e.product.id === productId ? { ...e, quantity: qty } : e))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, e) => sum + e.quantity, 0);
  const totalPriceAud = items.reduce(
    (sum, e) => sum + e.product.priceAud * e.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ items, totalItems, totalPriceAud, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

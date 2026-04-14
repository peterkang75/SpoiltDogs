import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, MapPin, ArrowRight, ClipboardList, Dog } from "lucide-react";
import { Link } from "wouter";
import { getOrders, type SavedOrder } from "@/lib/orders";
import { formatAud } from "@/lib/currency";
import { useState, useEffect } from "react";

function StatusBadge({ status }: { status: SavedOrder["status"] }) {
  const config = {
    preparing: { label: "Being Prepared", className: "bg-sage/10 text-sage border-none" },
    shipped: { label: "Shipped", className: "bg-dusty-blue/10 text-dusty-blue border-none" },
    delivered: { label: "Delivered", className: "bg-gold/15 text-dark border-none" },
  };
  const { label, className } = config[status];
  return <Badge className={`text-[10px] font-semibold ${className}`} data-testid={`badge-status-${status}`}>{label}</Badge>;
}

function StatusTracker({ status }: { status: SavedOrder["status"] }) {
  const steps = [
    { key: "preparing", icon: Package, label: "Preparing" },
    { key: "shipped", icon: Truck, label: "Shipped" },
    { key: "delivered", icon: MapPin, label: "Delivered" },
  ];
  const activeIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((step, i) => {
        const isActive = i <= activeIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center gap-1 flex-1">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                isActive ? "bg-sage/12" : "bg-neutral-100"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-sage" : "text-muted-foreground/40"}`} />
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full ${i < activeIdx ? "bg-sage/30" : "bg-neutral-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order }: { order: SavedOrder }) {
  const dateStr = new Date(order.date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      data-testid={`card-order-${order.orderId}`}
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
      >
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Order
          </p>
          <p className="font-mono text-xs font-bold text-dark mt-0.5" data-testid={`text-order-id-${order.orderId}`}>
            {order.orderId}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="px-5 py-4 space-y-2">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-1.5 w-1.5 rounded-full bg-sage/30 shrink-0" />
              <p className="text-sm text-dark truncate" data-testid={`text-item-name-${order.orderId}-${idx}`}>
                {item.name}
              </p>
              {item.quantity > 1 && (
                <span className="text-xs text-muted-foreground shrink-0">x{item.quantity}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-dark shrink-0">
              {formatAud(item.priceAud * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(0,0,0,0.04)", backgroundColor: "rgba(45,90,71,0.02)" }}
      >
        <div className="flex items-center gap-3">
          <Dog className="h-3.5 w-3.5 text-sage/50" />
          <span className="text-xs text-muted-foreground">
            For <span className="font-semibold text-dark">{order.petName}</span> · {dateStr}
          </span>
        </div>
        <span className="font-serif text-sm font-bold text-dark" data-testid={`text-order-total-${order.orderId}`}>
          {order.totalAud != null ? formatAud(order.totalAud) : "--"}
          <span className="text-[9px] font-normal text-muted-foreground ml-0.5">AUD</span>
        </span>
      </div>

      <div className="px-5 pb-4">
        <StatusTracker status={order.status} />
      </div>
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState<SavedOrder[]>([]);

  useEffect(() => {
    setOrders(getOrders());
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 bg-cream">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-medium uppercase tracking-widest text-terracotta mb-3" data-testid="text-orders-eyebrow">
              Order History
            </p>
            <h1 className="font-serif text-3xl font-bold text-dark sm:text-4xl" data-testid="text-orders-title">
              My Orders
            </h1>
            <p className="mt-2 text-sm text-muted-foreground" data-testid="text-orders-subtitle">
              Track all your SpoiltDogs purchases
            </p>
          </div>

          {orders.length === 0 ? (
            <div
              className="bg-white rounded-2xl p-10 text-center"
              style={{ border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              data-testid="card-empty-orders"
            >
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-sage/8 flex items-center justify-center">
                  <ClipboardList className="h-8 w-8 text-sage/40" />
                </div>
              </div>
              <h2 className="font-serif text-lg font-bold text-dark mb-1">No orders yet</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Once you complete a purchase, your orders will appear here.
              </p>
              <Link href="/">
                <Button
                  className="bg-sage text-cream rounded-full gap-2 shadow-sm"
                  data-testid="button-start-shopping"
                >
                  Start Shopping
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order.orderId} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

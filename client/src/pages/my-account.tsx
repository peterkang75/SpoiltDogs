import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Package, LogOut, User } from "lucide-react";

interface Message {
  id: string;
  subject: string | null;
  body: string;
  direction: string;
  createdAt: string;
  status: string | null;
}

interface Order {
  id: string;
  stripeSessionId: string;
  totalAud: number;
  status: string;
  createdAt: string;
}

export default function MyAccount() {
  const { user, loading, signOut } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const { data: profile, isLoading: profileLoading } = useQuery<{ messages: Message[]; orders: Order[]; name: string | null; email: string }>({
    queryKey: ["/api/auth/my-account", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/auth/my-account", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Customer";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const conversations = profile?.messages || [];
  const orders = profile?.orders || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg" data-testid="avatar-initials">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground" data-testid="text-display-name">{displayName}</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-user-email">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} data-testid="button-sign-out">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="bg-card border border-border rounded-2xl p-6" data-testid="section-conversations">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Active Conversations</h2>
              {conversations.length > 0 && (
                <span className="ml-auto text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">{conversations.length}</span>
              )}
            </div>
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-conversations">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No conversations yet.
                <br />Start a chat or send us an email.
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.slice(0, 5).map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50" data-testid={`conversation-item-${msg.id}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${msg.direction === "incoming" ? "bg-primary" : "bg-secondary"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{msg.subject || "Chat message"}</p>
                      <p className="text-xs text-muted-foreground truncate">{msg.body.replace(/<[^>]+>/g, "").slice(0, 80)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(msg.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-card border border-border rounded-2xl p-6" data-testid="section-orders">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Order Status</h2>
              {orders.length > 0 && (
                <span className="ml-auto text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">{orders.length}</span>
              )}
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-orders">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No orders yet.
                <br />Browse our premium range to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50" data-testid={`order-item-${order.id}`}>
                    <div>
                      <p className="text-sm font-medium">Order #{order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">${(order.totalAud / 100).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 bg-card border border-border rounded-2xl p-6" data-testid="section-profile">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Account Details</h2>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium" data-testid="detail-email">{user.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">{new Date(user.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Sign-in method</span>
              <span className="font-medium capitalize">{user.app_metadata?.provider || "email"}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

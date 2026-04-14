import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { XCircle, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { usePet } from "@/context/pet-context";

export default function Cancel() {
  const { petName } = usePet();

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 bg-cream flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="flex justify-center">
            <div
              className="h-24 w-24 rounded-full bg-terracotta/10 flex items-center justify-center"
              data-testid="icon-cancel"
            >
              <XCircle className="h-12 w-12 text-terracotta" />
            </div>
          </div>

          <div className="space-y-3">
            <h1
              className="font-serif text-4xl font-bold text-dark"
              data-testid="text-cancel-title"
            >
              Payment Cancelled
            </h1>
            <p
              className="text-lg text-muted-foreground leading-relaxed"
              data-testid="text-cancel-message"
            >
              No worries — {petName}'s goodies are still in your cart waiting for you.
            </p>
          </div>

          <div
            className="bg-white rounded-2xl p-6"
            style={{ border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
            data-testid="card-cancel-info"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 rounded-full bg-sage/10 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-5 w-5 text-sage" />
              </div>
              <div>
                <p className="font-serif font-bold text-dark text-sm">Your cart is safe</p>
                <p className="text-xs text-muted-foreground">
                  All items are still saved. Come back anytime to complete your order for {petName}.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Link href="/">
              <Button
                className="w-full bg-sage text-cream rounded-full gap-2 h-12 shadow-sm"
                data-testid="button-back-shopping"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Shop
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

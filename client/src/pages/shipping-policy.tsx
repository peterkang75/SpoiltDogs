import { Link } from "wouter";
import { Package, MapPin, Clock, Search, ChevronRight } from "lucide-react";
import { MarqueeBanner } from "@/components/marquee-banner";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

const sections = [
  {
    icon: MapPin,
    title: "Shipping Locations",
    content: (
      <p className="text-dark/65 leading-relaxed">
        We offer shipping <strong className="text-dark">Australia-wide</strong> to all states and territories — from metropolitan Sydney and Melbourne to regional Queensland, WA, and everywhere in between.
      </p>
    ),
  },
  {
    icon: Package,
    title: "Shipping Rates",
    content: (
      <div className="space-y-3">
        <div className="flex items-start gap-4 rounded-2xl p-5" style={{ backgroundColor: "#F5F0E8" }}>
          <div className="h-2 w-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: "#4B9073" }} />
          <div>
            <p className="font-semibold text-dark text-sm">Standard Shipping</p>
            <p className="text-dark/60 text-sm mt-0.5">Flat rate of <strong className="text-dark">$9.95 AUD</strong> on all orders.</p>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-2xl p-5" style={{ backgroundColor: "#E3EDE6" }}>
          <div className="h-2 w-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: "#FFD54F" }} />
          <div>
            <p className="font-semibold text-dark text-sm">Free Shipping</p>
            <p className="text-dark/60 text-sm mt-0.5">Complimentary on all orders over <strong className="text-dark">$100 AUD</strong>.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Clock,
    title: "Delivery Times",
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#4B9073" }}>
            1
          </div>
          <div>
            <p className="font-semibold text-dark text-sm">Order Handling</p>
            <p className="text-dark/60 text-sm mt-0.5">1–2 business days to pack and dispatch your order.</p>
          </div>
        </div>
        <div className="ml-12 space-y-3 pl-1" style={{ borderLeft: "2px solid #E3EDE6" }}>
          <div className="pl-5">
            <p className="font-semibold text-dark text-sm">Metro Areas</p>
            <p className="text-dark/60 text-sm mt-0.5">3–5 business days after dispatch.</p>
          </div>
          <div className="pl-5">
            <p className="font-semibold text-dark text-sm">Regional Areas</p>
            <p className="text-dark/60 text-sm mt-0.5">5–10 business days after dispatch.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Search,
    title: "Order Tracking",
    content: (
      <p className="text-dark/65 leading-relaxed">
        Once your order has been dispatched, a <strong className="text-dark">tracking number</strong> will be sent to your registered email address. You can use it to follow your order's journey in real time.
      </p>
    ),
  },
];

export default function ShippingPolicy() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FCF9F1" }}>
      <MarqueeBanner />
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-14 sm:py-20" data-testid="section-shipping-policy">

        <nav className="flex items-center gap-2 text-xs text-dark/40 mb-10" data-testid="shipping-breadcrumb">
          <Link href="/" className="hover:text-dark/70 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-dark/70">Shipping Policy</span>
        </nav>

        <header className="mb-12 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4B9073" }}>
            SpoiltDogs Australia
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-dark leading-tight" data-testid="text-shipping-title">
            Shipping Policy
          </h1>
          <p className="text-dark/55 leading-relaxed pt-1">
            We want your order to arrive safely and on time. Here's everything you need to know about how we ship across Australia.
          </p>
        </header>

        <div className="space-y-6">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <div
                key={i}
                className="rounded-3xl p-7 sm:p-9 space-y-5"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
                data-testid={`shipping-section-${i}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "#E3EDE6" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "#4B9073" }} />
                  </div>
                  <h2 className="font-serif text-xl font-bold text-dark" data-testid={`shipping-section-title-${i}`}>
                    {section.title}
                  </h2>
                </div>
                <div>{section.content}</div>
              </div>
            );
          })}
        </div>

        <div
          className="mt-10 rounded-3xl px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{ backgroundColor: "#1a3a2e" }}
          data-testid="shipping-contact-note"
        >
          <div className="flex-1">
            <p className="font-semibold text-white text-sm">Questions about your order?</p>
            <p className="text-white/55 text-sm mt-0.5">Our team is happy to help with any shipping or delivery queries.</p>
          </div>
          <a
            href="mailto:hello@spoiltdogs.com.au"
            className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#FFD54F", color: "#1a1a1a" }}
            data-testid="link-shipping-contact"
          >
            Contact Us
          </a>
        </div>

        <p className="mt-8 text-center text-xs text-dark/35">
          Last updated: March 2026 — Subject to change without notice.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}

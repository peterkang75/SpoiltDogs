import { Search, ShoppingBag, Heart } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Browse & Discover",
    description: "Explore our curated collection of premium, all-natural products made right here in Australia.",
  },
  {
    number: "02",
    icon: ShoppingBag,
    title: "Order with Ease",
    description: "Add your picks to cart, checkout securely, and enjoy free shipping on orders over $99 AUD.",
  },
  {
    number: "03",
    icon: Heart,
    title: "Spoil Your Dog",
    description: "Watch your furry mate enjoy the best products Australia has to offer. Tail wags guaranteed.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-cream py-16 sm:py-24" data-testid="section-how-it-works">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-medium uppercase tracking-widest text-terracotta mb-3" data-testid="text-how-eyebrow">
            Simple as Fetch
          </p>
          <h2 className="font-serif text-3xl font-bold text-dark sm:text-4xl lg:text-5xl" data-testid="text-how-title">
            How it <span className="text-sage">works</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center space-y-4" data-testid={`step-${i}`}>
              <div className="relative mx-auto">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sage-light mx-auto">
                  <step.icon className="h-8 w-8 text-sage" />
                </div>
                <span className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-terracotta font-serif text-sm font-bold text-cream">
                  {step.number}
                </span>
              </div>
              <h3 className="font-serif text-xl font-bold text-dark">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[calc(100%-20%)] border-t-2 border-dashed border-sage/20" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

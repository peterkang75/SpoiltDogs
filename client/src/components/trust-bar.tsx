import { Truck, Leaf, ShieldCheck, Undo2 } from "lucide-react";

const trustItems = [
  { icon: Truck, title: "Free Shipping", description: "On orders over $99 AUD" },
  { icon: Leaf, title: "100% Natural", description: "No artificial ingredients" },
  { icon: ShieldCheck, title: "Aussie Made", description: "Proudly Australian" },
  { icon: Undo2, title: "30-Day Returns", description: "Hassle-free guarantee" },
];

export function TrustBar() {
  return (
    <section className="bg-cream py-12 sm:py-16" data-testid="section-trust-bar">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {trustItems.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3" data-testid={`trust-item-${i}`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage/10">
                <item.icon className="h-6 w-6 text-sage" />
              </div>
              <div>
                <h3 className="font-semibold text-dark text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Check, X } from "lucide-react";

const features = [
  "100% Australian Made",
  "All-Natural Ingredients",
  "Vet Approved Formulas",
  "Eco-Friendly Packaging",
  "Free Shipping over $99",
  "30-Day Satisfaction Guarantee",
  "Handcrafted in Small Batches",
  "No Artificial Preservatives",
];

export function ComparisonTable() {
  return (
    <section className="bg-cream py-16 sm:py-24" data-testid="section-comparison">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-medium uppercase tracking-widest text-terracotta mb-3" data-testid="text-comparison-eyebrow">
            The SpoiltDogs Difference
          </p>
          <h2 className="font-serif text-3xl font-bold text-dark sm:text-4xl" data-testid="text-comparison-title">
            How we <span className="text-sage">compare</span>
          </h2>
        </div>

        <div className="overflow-hidden rounded-xl shadow-sm" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
          <table className="w-full" data-testid="table-comparison">
            <thead>
              <tr className="bg-sage text-cream">
                <th className="py-4 px-6 text-left text-sm font-semibold">Feature</th>
                <th className="py-4 px-4 text-center text-sm font-semibold w-32">SpoiltDogs</th>
                <th className="py-4 px-4 text-center text-sm font-semibold w-32 opacity-70">Others</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
                <tr key={i} className={`${i % 2 === 0 ? "bg-cream" : "bg-sage-light/30"}`} style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                  <td className="py-3.5 px-6 text-sm text-dark">{feature}</td>
                  <td className="py-3.5 px-4 text-center">
                    <Check className="h-5 w-5 text-sage mx-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {i < 2 ? (
                      <span className="text-xs text-muted-foreground">Sometimes</span>
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

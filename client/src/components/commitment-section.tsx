import { Button } from "@/components/ui/button";
import { Leaf, Heart, MapPin } from "lucide-react";

export function CommitmentSection() {
  return (
    <section className="bg-sage py-16 sm:py-24" data-testid="section-commitment">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-widest text-cream/70" data-testid="text-commitment-eyebrow">
              Our Promise
            </p>
            <h2 className="font-serif text-3xl font-bold text-cream sm:text-4xl lg:text-5xl leading-tight" data-testid="text-commitment-title">
              Committed to your dog's happiness &amp; our planet
            </h2>
            <p className="text-cream/80 leading-relaxed text-lg" data-testid="text-commitment-body">
              Every SpoiltDogs product starts with a simple question: "Is this good enough for our own dogs?" If the answer isn't a resounding yes, it doesn't make the cut. We're proudly Australian, fiercely sustainable, and absolutely obsessed with quality.
            </p>
            <Button size="lg" className="bg-cream text-sage rounded-full shadow-md" data-testid="button-commitment-cta">
              Learn More About Our Values
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Leaf, value: "100%", label: "Recyclable Packaging" },
              { icon: Heart, value: "50K+", label: "Happy Dogs" },
              { icon: MapPin, value: "100%", label: "Aussie Sourced" },
            ].map((stat, i) => (
              <div key={i} className="text-center space-y-3 p-6 rounded-2xl bg-white/10 backdrop-blur-sm" data-testid={`stat-${i}`}>
                <stat.icon className="h-8 w-8 text-cream mx-auto" />
                <p className="font-serif text-3xl font-bold text-cream">{stat.value}</p>
                <p className="text-sm text-cream/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

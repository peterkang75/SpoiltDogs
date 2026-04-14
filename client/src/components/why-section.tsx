import { Heart, Sparkles, Award, Recycle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const reasons = [
  {
    icon: Heart,
    title: "Made with Love",
    description: "Every product is crafted with genuine care for your dog's wellbeing and happiness.",
    color: "text-terracotta",
    bg: "bg-terracotta-light",
  },
  {
    icon: Sparkles,
    title: "Premium Quality",
    description: "We source only the finest Australian ingredients and materials — nothing less for your best mate.",
    color: "text-sage",
    bg: "bg-sage-light",
  },
  {
    icon: Award,
    title: "Vet Approved",
    description: "All our products are developed in consultation with leading Australian veterinarians.",
    color: "text-dusty-blue",
    bg: "bg-dusty-blue-light",
  },
  {
    icon: Recycle,
    title: "Eco Friendly",
    description: "Sustainable packaging and ethical sourcing — because we care about the planet too.",
    color: "text-sage",
    bg: "bg-sage-light",
  },
];

export function WhySection() {
  return (
    <section className="bg-cream py-16 sm:py-24" data-testid="section-why">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-medium uppercase tracking-widest text-terracotta mb-3" data-testid="text-why-eyebrow">
            Why SpoiltDogs?
          </p>
          <h2 className="font-serif text-3xl font-bold text-dark sm:text-4xl lg:text-5xl" data-testid="text-why-title">
            The difference is in the <span className="text-sage">details</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground" data-testid="text-why-subtitle">
            We're not just another pet brand. We're Aussie pet parents who believe every dog deserves the absolute best.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason, i) => (
            <Card key={i} className="border-none shadow-none bg-transparent" data-testid={`card-why-${i}`}>
              <CardContent className="flex flex-col items-center text-center p-6 space-y-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${reason.bg}`}>
                  <reason.icon className={`h-7 w-7 ${reason.color}`} />
                </div>
                <h3 className="font-serif text-lg font-bold text-dark">{reason.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{reason.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

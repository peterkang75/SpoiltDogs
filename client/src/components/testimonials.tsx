import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const reviews = [
  {
    name: "Sarah M.",
    location: "Sydney, NSW",
    dog: "Max, Golden Retriever",
    rating: 5,
    text: "Max absolutely loves the Lamb & Rosemary Kibble. His coat has never looked better, and he practically dances when it's dinner time. Best decision we've made!",
  },
  {
    name: "James K.",
    location: "Melbourne, VIC",
    dog: "Bella, Border Collie",
    rating: 5,
    text: "The Heritage Leather Collar is stunning — genuinely premium quality. Bella gets compliments on every walk. Worth every cent.",
  },
  {
    name: "Emily R.",
    location: "Brisbane, QLD",
    dog: "Cooper, Cavoodle",
    rating: 5,
    text: "We've tried everything for Cooper's sensitive skin. The Botanical Shampoo was a game-changer. No more itching, and he smells amazing!",
  },
  {
    name: "David L.",
    location: "Perth, WA",
    dog: "Luna, Labrador",
    rating: 5,
    text: "Luna refused to sleep anywhere else after we got the Cloud Nine Bed. The orthopaedic support is brilliant for her joints. Highly recommend!",
  },
];

export function Testimonials() {
  return (
    <section className="bg-terracotta py-16 sm:py-24" data-testid="section-testimonials">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-medium uppercase tracking-widest text-cream/70 mb-3" data-testid="text-testimonials-eyebrow">
            Happy Tails
          </p>
          <h2 className="font-serif text-3xl font-bold text-cream sm:text-4xl lg:text-5xl" data-testid="text-testimonials-title">
            What our <span className="text-cream/80">pack</span> says
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {reviews.map((review, i) => (
            <Card key={i} className="bg-cream/95 border-none shadow-md" data-testid={`card-testimonial-${i}`}>
              <CardContent className="p-6 space-y-4">
                <Quote className="h-6 w-6 text-terracotta/40" />
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: review.rating }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-terracotta text-terracotta" />
                  ))}
                </div>
                <p className="text-sm text-dark/80 leading-relaxed">{review.text}</p>
                <div className="pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                  <p className="text-sm font-semibold text-dark">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.location}</p>
                  <p className="text-xs text-sage font-medium mt-0.5">{review.dog}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

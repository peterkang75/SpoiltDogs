import { Button } from "@/components/ui/button";
import { ArrowRight, Star, PawPrint, Sparkles } from "lucide-react";
import { usePet } from "@/context/pet-context";
import heroImg from "@assets/Gemini_Generated_Image_wyvrwmwyvrwmwyvr_1772413881341.png";

export function HeroSection() {
  const { setShowWizard, hasPet, petName } = usePet();

  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#4B9073" }}
      data-testid="section-hero"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 sm:px-8 sm:py-32 lg:px-10 lg:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-5 py-2 text-sm font-medium text-cream" data-testid="badge-hero">
              <Star className="h-4 w-4 fill-gold text-gold" />
              Australia's #1 Premium Dog Brand
            </div>
            <h1
              className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.1]"
              style={{ color: "#FFFFFF" }}
              data-testid="text-hero-title"
            >
              Because your dog
              <span className="text-gold"> deserves</span> the best
            </h1>
            <p
              className="max-w-lg text-lg leading-relaxed"
              style={{ color: "rgba(255, 255, 255, 0.9)" }}
              data-testid="text-hero-subtitle"
            >
              Handcrafted, all-natural products made right here in Australia. From nourishing meals to luxurious accessories — everything your furry mate needs to live their best life.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="bg-cream text-sage gap-2 rounded-full border-none shadow-sm"
                data-testid="button-hero-shop"
              >
                Shop Now
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 rounded-full"
                style={{ border: "1px solid rgba(255,255,255,0.25)", color: "#FFFFFF" }}
                onClick={() => setShowWizard(true)}
                data-testid="button-hero-personalise"
              >
                <Sparkles className="h-4 w-4" />
                {hasPet ? `${petName}'s Shop` : "Personalise My Shop"}
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded-full bg-cream/20 backdrop-blur-sm flex items-center justify-center text-xs font-bold"
                    style={{ border: "1.5px solid rgba(255,255,255,0.2)", color: "#FFFFFF" }}
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }} data-testid="text-hero-reviews">
                  Trusted by <strong style={{ color: "#FFFFFF" }}>10,000+</strong> Aussie pet parents
                </p>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:flex items-center justify-center min-h-[520px]" data-testid="hero-image-container">
            <svg
              viewBox="0 0 500 580"
              className="absolute w-[90%] h-[95%]"
              style={{ filter: "drop-shadow(0 8px 30px rgba(0,0,0,0.12))" }}
              data-testid="hero-oval-bg"
            >
              <path
                d="M250,20 C380,20 460,100 470,200 C480,310 450,420 400,490 C350,550 300,570 250,570 C200,570 150,550 100,490 C50,420 20,310 30,200 C40,100 120,20 250,20Z"
                fill="rgba(200, 230, 215, 0.25)"
              />
            </svg>

            <div className="relative z-10 w-[88%]" style={{ marginTop: "-3rem", marginBottom: "-4rem" }}>
              <img
                src={heroImg}
                alt="Happy dog relaxing in the park"
                className="w-full h-auto rounded-[2rem]"
                style={{
                  transform: "scale(1.12)",
                  filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.25))",
                  objectFit: "cover",
                }}
                data-testid="img-hero"
              />
            </div>

            <div
              className="absolute top-6 right-4 z-20 flex items-center gap-1.5 rounded-full px-4 py-2.5 shadow-lg"
              style={{ backgroundColor: "#1a3a2e", color: "#FFFFFF" }}
              data-testid="badge-hero-sticker"
            >
              <PawPrint className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wide uppercase">Vet Approved</span>
            </div>

            <div className="absolute bottom-8 left-4 z-20">
              <div
                className="h-14 w-14 rounded-full bg-gold shadow-lg flex items-center justify-center"
                style={{ transform: "rotate(12deg)" }}
              >
                <PawPrint className="h-6 w-6 text-dark" style={{ transform: "rotate(-12deg)" }} />
              </div>
            </div>

            <div
              className="absolute -bottom-1 -right-1 z-20 h-16 w-16 rounded-2xl bg-gold shadow-lg flex items-center justify-center rotate-12"
            >
              <span className="font-serif text-sm text-dark font-bold -rotate-12">NEW</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

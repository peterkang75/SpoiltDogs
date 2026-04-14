import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePet } from "@/context/pet-context";

const slides = [
  {
    id: 1,
    image: "/banner-1-kukdungi-harbour.jpeg",
    imagePosition: "center 30%",
    eyebrow: "Meet 국둥이",
    title: "Life's Better",
    titleAccent: "Spoilt.",
    subtitle: "Our Jindo mascot 국둥이 helps us test every product so yours gets nothing but the best. Premium. All-Australian. Tail-approved.",
    cta: { label: "Shop Now", href: "/products" },
    ctaSecondary: { label: "Meet 국둥이", href: "#blog" },
    gradient: "from-black/65 via-black/30 to-transparent",
    accentColor: "#FFD54F",
  },
  {
    id: 2,
    image: "/banner-2-kukdungi-park.jpeg",
    imagePosition: "center 20%",
    eyebrow: "Curated with Love",
    title: "Every Dog",
    titleAccent: "Deserves More.",
    subtitle: "국둥이 sits tall in Sydney's parks wearing only the finest harnesses and accessories. Explore our handpicked collection built for Australian dogs.",
    cta: { label: "Browse Collection", href: "/products" },
    ctaSecondary: { label: "View Accessories", href: "/categories" },
    gradient: "from-black/60 via-black/25 to-transparent",
    accentColor: "#F37052",
  },
  {
    id: 3,
    image: "/banner-3-beach-dogs.png",
    imagePosition: "center 40%",
    eyebrow: "Adventure Ready",
    title: "Built for the",
    titleAccent: "Aussie Life.",
    subtitle: "From sunrise beach runs to weekend park sessions — every product is made to match your dog's big energy and even bigger personality.",
    cta: { label: "Shop Outdoor Gear", href: "/products" },
    ctaSecondary: null,
    gradient: "from-black/70 via-black/35 to-transparent",
    accentColor: "#4B9073",
  },
  {
    id: 4,
    image: "/banner-4-sleeping-dog.png",
    imagePosition: "center 35%",
    eyebrow: "Premium Comfort",
    title: "Rest Easy,",
    titleAccent: "Dream Big.",
    subtitle: "The finest beds, toys, and comfort essentials for your dog's downtime. Because after a big day at the beach, they deserve serious luxury.",
    cta: { label: "Shop Comfort", href: "/products" },
    ctaSecondary: { label: "Personalise My Shop", action: "wizard" },
    gradient: "from-black/55 via-black/20 to-transparent",
    accentColor: "#FFD54F",
  },
];

export function HeroSlider() {
  const { setShowWizard } = usePet();
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isPausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setIsTransitioning(false);
    }, 400);
  }, [isTransitioning]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);

  const handleMouseEnter = useCallback(() => {
    isPausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isPausedRef.current = false;
    }, 6000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPausedRef.current) {
        next();
      }
    }, 5500);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(500px, 80svh, 720px)" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="section-hero-slider"
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? (isTransitioning ? 0 : 1) : 0 }}
        >
          <img
            src={s.image}
            alt={`Banner ${s.id}`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: s.imagePosition }}
            loading={i === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}

      <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} transition-all duration-700`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      <div className="relative h-full max-w-7xl mx-auto px-5 sm:px-10 lg:px-14 flex items-end sm:items-center pb-16 sm:pb-0">
        <div
          className="max-w-lg space-y-4 sm:space-y-5 transition-all duration-500"
          style={{ opacity: isTransitioning ? 0 : 1, transform: isTransitioning ? "translateY(12px)" : "translateY(0)" }}
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-widest backdrop-blur-sm"
            style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.25)" }}
            data-testid="slider-eyebrow"
          >
            {slide.eyebrow}
          </div>

          <h1 className="font-serif text-[2rem] leading-[1.1] sm:text-5xl lg:text-6xl font-bold sm:leading-[1.08] text-white drop-shadow-lg" data-testid="slider-title">
            {slide.title}{" "}
            <span style={{ color: slide.accentColor }}>{slide.titleAccent}</span>
          </h1>

          <p className="text-sm sm:text-base leading-relaxed max-w-sm sm:max-w-md text-white/85 drop-shadow line-clamp-3 sm:line-clamp-none" data-testid="slider-subtitle">
            {slide.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
            <Link href={slide.cta.href}>
              <Button
                size="sm"
                className="gap-1.5 sm:gap-2 rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow text-sm sm:text-base sm:h-11 sm:px-6"
                style={{ backgroundColor: slide.accentColor, color: "#1a1a1a", border: "none" }}
                data-testid="slider-cta-primary"
              >
                {slide.cta.label}
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Link>
            {slide.ctaSecondary && (
              slide.ctaSecondary.action === "wizard" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 rounded-full font-medium text-white hover:bg-white/15 text-sm sm:text-base sm:h-11 sm:px-6"
                  style={{ border: "1px solid rgba(255,255,255,0.3)" }}
                  onClick={() => setShowWizard(true)}
                  data-testid="slider-cta-secondary"
                >
                  {slide.ctaSecondary.label}
                </Button>
              ) : (
                <a href={slide.ctaSecondary.href}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 rounded-full font-medium text-white hover:bg-white/15 text-sm sm:text-base sm:h-11 sm:px-6"
                    style={{ border: "1px solid rgba(255,255,255,0.3)" }}
                    data-testid="slider-cta-secondary"
                  >
                    {slide.ctaSecondary.label}
                  </Button>
                </a>
              )
            )}
          </div>
        </div>
      </div>

      <button
        onClick={prev}
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm text-white hover:bg-black/45 transition-colors"
        data-testid="slider-prev"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm text-white hover:bg-black/45 transition-colors"
        data-testid="slider-next"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2" data-testid="slider-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === current ? "28px" : "8px",
              height: "8px",
              backgroundColor: i === current ? slide.accentColor : "rgba(255,255,255,0.45)",
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <div className="absolute bottom-5 right-5 z-10">
        <span className="text-white/50 text-xs font-mono tabular-nums">
          {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}

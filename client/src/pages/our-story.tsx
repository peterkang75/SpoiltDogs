import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { Navbar } from "@/components/navbar";
import { MarqueeBanner } from "@/components/marquee-banner";

const puppyWild = "/story-puppy-wild.jpeg";
const puppyCrate = "/story-puppy-crate.jpeg";
const koreaFlowers = "/story-korea-flowers.jpeg";
const koreaSunrise = "/story-korea-sunrise.jpeg";
const sydneyHarbour = "/story-sydney-harbour.jpeg";

export default function OurStory() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FCF9F1" }}>
      <MarqueeBanner />
      <Navbar />

      {/* HERO — full bleed cinematic */}
      <section
        className="relative flex items-end overflow-hidden"
        style={{ height: "clamp(500px, 72vh, 720px)", backgroundColor: "#0f2419" }}
        data-testid="section-story-hero"
      >
        <img
          src={sydneyHarbour}
          alt="Guk-dung at Sydney Harbour"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 35%", opacity: 0.5 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 lg:px-14 pb-16 w-full">
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: "#FFD54F" }}
          >
            SpoiltDogs — Our Story
          </p>
          <h1
            className="font-serif font-bold text-white leading-[1.04]"
            style={{ fontSize: "clamp(2.6rem, 6vw, 5rem)" }}
            data-testid="text-story-hero-title"
          >
            From a Remote Island
            <br />
            <span style={{ color: "#FFD54F" }}>to the Sydney Harbour.</span>
          </h1>
          <p
            className="mt-5 text-white/65 leading-relaxed max-w-lg"
            style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)" }}
          >
            A wild-born Jindo pup, a promise, and a journey that started everything.
          </p>
        </div>
      </section>

      {/* OPENING — text left, puppy collage right */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-20 lg:py-28" data-testid="section-opening">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="space-y-7">
            <h2
              className="font-serif font-bold text-dark leading-tight"
              style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}
              data-testid="text-opening-title"
            >
              Every great story starts with a chance encounter.
            </h2>
            <p className="text-dark/65 leading-[1.85] text-base">
              Ours began on a small, windswept island off the coast of South Korea called Heuksandow. There lived a semi-wild dog — strong, resilient, but lonely. When she gave birth to a litter of pups in the rugged outdoors, fate brought us together.
            </p>
            <p className="text-dark/65 leading-[1.85] text-base">
              Among those tiny fluffballs was Guk-dung, a proud Jindo dog born into the wild but destined for a life of love.
            </p>
            <blockquote
              className="pl-6 py-1"
              style={{ borderLeft: "3px solid #FFD54F" }}
            >
              <p className="font-serif text-xl italic text-dark/80 leading-snug">
                "I made a promise — to give this boy the world."
              </p>
            </blockquote>
          </div>

          {/* Staggered puppy collage */}
          <div className="grid grid-cols-2 gap-4" data-testid="story-photo-collage-puppies">
            <div
              className="rounded-2xl overflow-hidden shadow-md"
              style={{ height: "clamp(240px, 32vw, 400px)", marginTop: "2.5rem" }}
            >
              <img
                src={puppyWild}
                alt="Guk-dung and siblings as newborn puppies"
                className="w-full h-full object-cover hover:scale-[1.04] transition-transform duration-700"
              />
            </div>
            <div
              className="rounded-2xl overflow-hidden shadow-md"
              style={{ height: "clamp(240px, 32vw, 400px)", marginTop: "-2.5rem" }}
            >
              <img
                src={puppyCrate}
                alt="Guk-dung in a crate, newly rescued"
                className="w-full h-full object-cover hover:scale-[1.04] transition-transform duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* PULL QUOTE — full bleed sage */}
      <section
        className="py-20 sm:py-24"
        style={{ backgroundColor: "#1a3a2e" }}
        data-testid="section-pull-quote"
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-10 text-center space-y-5">
          <p
            className="font-serif font-bold text-white leading-tight"
            style={{ fontSize: "clamp(1.8rem, 4vw, 3.25rem)" }}
          >
            The Jindo is Korea's National Treasure — known for unwavering loyalty and a spirit that cannot be tamed.
          </p>
          <p className="text-white/55 max-w-2xl mx-auto leading-relaxed">
            Yet many of them live a contrasting reality: spending their lives at the end of a short chain, or surviving as strays in rural villages. Having seen Guk-dung's mother struggle, the path forward was clear.
          </p>
        </div>
      </section>

      {/* GROWING UP — flower photo left, text right */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-20 lg:py-28" data-testid="section-growing-up">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div
            className="rounded-3xl overflow-hidden shadow-lg"
            style={{ height: "clamp(360px, 50vw, 580px)" }}
            data-testid="story-photo-flowers"
          >
            <img
              src={koreaFlowers}
              alt="Guk-dung as a young dog in a wildflower meadow"
              className="w-full h-full object-cover object-top hover:scale-[1.04] transition-transform duration-700"
            />
          </div>
          <div className="space-y-7">
            <h2
              className="font-serif font-bold text-dark leading-tight"
              style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}
              data-testid="text-growing-title"
            >
              A boy, a dog, and a country full of wildflowers.
            </h2>
            <p className="text-dark/65 leading-[1.85] text-base">
              From a tiny rescue pup to a confident, curious young dog, Guk-dung grew into himself. Together we explored wildflower meadows, misty riverside mornings, and the kind of quiet moments that stay with you forever.
            </p>
            <p className="text-dark/65 leading-[1.85] text-base">
              Caring for him became an obsession — finding the healthiest treats, the most comfortable harnesses, toys that genuinely engaged his brilliant Jindo mind. We didn't just want him to survive. We wanted him to <em>thrive</em>.
            </p>
          </div>
        </div>
      </section>

      {/* CINEMATIC SUNRISE — full bleed with overlay text */}
      <div
        className="relative overflow-hidden mx-auto"
        style={{ height: "clamp(320px, 48vw, 560px)" }}
        data-testid="story-photo-sunrise"
      >
        <img
          src={koreaSunrise}
          alt="Guk-dung watching the sunrise over a Korean river"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 w-full">
            <p
              className="font-serif text-white font-bold leading-tight max-w-lg"
              style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.75rem)" }}
            >
              Guk-dung watched the river before it was time to cross the ocean.
            </p>
          </div>
        </div>
      </div>

      {/* SYDNEY — dark section, text + photo */}
      <section
        className="py-20 lg:py-28"
        style={{ backgroundColor: "#0f2419" }}
        data-testid="section-sydney"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="space-y-7 order-2 lg:order-1">
              <h2
                className="font-serif font-bold text-white leading-tight"
                style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}
                data-testid="text-sydney-title"
              >
                Sydney changed everything —
                <br />
                <span style={{ color: "#FFD54F" }}>for both of us.</span>
              </h2>
              <p className="text-white/60 leading-[1.85] text-base">
                When Guk-dung and I arrived in Sydney, we discovered a city that truly loves its dogs. From the sandy beaches at sunrise to the leafy parks on weekends — Guk-dung took to it all with the grace of a dog who was always meant to be here.
              </p>
              <p className="text-white/60 leading-[1.85] text-base">
                The dog-loving culture here was unlike anything back home. Owners who treated their pets as family. And a market full of products that didn't quite meet the standards a Jindo would approve of. That gap became an opportunity. <strong className="text-white">SpoiltDogs was born.</strong>
              </p>
            </div>
            <div
              className="order-1 lg:order-2 rounded-3xl overflow-hidden shadow-2xl"
              style={{ height: "clamp(360px, 50vw, 580px)" }}
              data-testid="story-photo-sydney"
            >
              <img
                src={sydneyHarbour}
                alt="Guk-dung at Sydney Harbour, happy and free"
                className="w-full h-full object-cover hover:scale-[1.04] transition-transform duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* BRAND MANIFESTO — cream, centered editorial */}
      <section
        className="py-24 lg:py-32"
        style={{ backgroundColor: "#FCF9F1" }}
        data-testid="section-manifesto"
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-10 text-center space-y-8">
          <h2
            className="font-serif font-bold text-dark leading-tight"
            style={{ fontSize: "clamp(2.2rem, 4vw, 3.5rem)" }}
            data-testid="text-manifesto-title"
          >
            Every dog deserves to be
            <span style={{ color: "#4B9073" }}> Spoilt.</span>
          </h2>

          <div
            className="rounded-3xl px-8 py-10 sm:px-14 sm:py-14 text-left space-y-5"
            style={{ backgroundColor: "#E3EDE6" }}
          >
            <p className="font-serif text-2xl sm:text-3xl text-dark italic leading-relaxed">
              "We believe that being 'spoilt' isn't about excess — it's about the deep, intentional love we show our furry family members every single day."
            </p>
            <p className="text-sm text-dark/50 font-medium tracking-wide uppercase">
              — Founder, SpoiltDogs Australia
            </p>
          </div>

          <p className="text-dark/60 leading-[1.9] text-base max-w-2xl mx-auto">
            At SpoiltDogs, everything is curated with Guk-dung's high standards in mind. We are here for the owners who, like us, see their dogs not just as animals — but as soulmates who deserve the finest life has to offer.
          </p>

          <p
            className="font-serif text-xl font-bold"
            style={{ color: "#4B9073" }}
            data-testid="text-closing-line"
          >
            Because every dog has a story. Let's make theirs a beautiful one.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link href="/products">
              <Button
                size="lg"
                className="gap-2 rounded-full font-semibold shadow-sm"
                style={{ backgroundColor: "#4B9073", color: "#FFFFFF", border: "none" }}
                data-testid="button-story-shop"
              >
                Shop the Collection
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

import { MarqueeBanner } from "@/components/marquee-banner";
import { Navbar } from "@/components/navbar";
import { HeroSlider } from "@/components/hero-slider";
import { TrustBar } from "@/components/trust-bar";
import { WhySection } from "@/components/why-section";
import { WaveDivider } from "@/components/wave-divider";
import { ProductCards } from "@/components/product-cards";
import { AiConcierge } from "@/components/ai-concierge";
import { HowItWorks } from "@/components/how-it-works";
import { ComparisonTable } from "@/components/comparison-table";
import { CommitmentSection } from "@/components/commitment-section";
import { Testimonials } from "@/components/testimonials";
import { FaqSection } from "@/components/faq-section";
import { BlogPreview } from "@/components/blog-preview";
import { GukdungPicks } from "@/components/gukdung-picks";
import { NewsletterSection } from "@/components/newsletter-section";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <MarqueeBanner />
      <Navbar />
      <HeroSlider />
      <WaveDivider fillColor="#FCF9F1" />
      <TrustBar />
      <WhySection />
      <WaveDivider fillColor="#E3EDE6" />
      <ProductCards />
      <WaveDivider fillColor="#1a3a2e" />
      <GukdungPicks />
      <WaveDivider fillColor="#FCF9F1" />
      <AiConcierge />
      <WaveDivider fillColor="#FCF9F1" />
      <HowItWorks />
      <ComparisonTable />
      <CommitmentSection />
      <WaveDivider fillColor="#F37052" />
      <Testimonials />
      <WaveDivider fillColor="#FCF9F1" />
      <FaqSection />
      <BlogPreview />
      <NewsletterSection />
      <SiteFooter />
    </main>
  );
}

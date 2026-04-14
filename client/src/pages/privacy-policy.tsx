import { Link } from "wouter";
import { UserCheck, Lock, Share2, ChevronRight } from "lucide-react";
import { MarqueeBanner } from "@/components/marquee-banner";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

const sections = [
  {
    icon: UserCheck,
    title: "Information We Collect",
    badge: "Minimal & Purposeful",
    content: (
      <div className="space-y-4">
        <p className="text-dark/65 leading-relaxed">
          We collect only the personal information that is necessary to process your order and deliver a great shopping experience. This includes:
        </p>
        <ul className="space-y-2.5">
          {[
            { label: "Full name", detail: "To personalise your order and communications." },
            { label: "Shipping address", detail: "To deliver your order to the correct location." },
            { label: "Email address", detail: "For order confirmations, tracking updates, and support." },
          ].map(({ label, detail }, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#4B9073" }} />
              <span className="text-dark/65">
                <strong className="text-dark">{label}</strong> — {detail}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-dark/55 text-sm leading-relaxed">
          We do not collect any information beyond what is needed to fulfil your order and improve your experience with SpoiltDogs.
        </p>
      </div>
    ),
  },
  {
    icon: Lock,
    title: "Data Security",
    badge: "Encrypted & Secure",
    content: (
      <div className="space-y-4">
        <p className="text-dark/65 leading-relaxed">
          The security of your payment and personal data is a top priority. All transactions on SpoiltDogs are processed through <strong className="text-dark">industry-standard encrypted payment gateways</strong>.
        </p>
        <div className="space-y-3">
          {[
            "Your payment card details are encrypted end-to-end and never transmitted in plain text.",
            "Payment information is never stored on our servers.",
            "All data is transmitted over HTTPS using TLS encryption.",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl px-5 py-4 text-sm" style={{ backgroundColor: "#F5F0E8" }}>
              <Lock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#4B9073" }} />
              <span className="text-dark/65">{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Share2,
    title: "Third-Party Sharing",
    badge: "No Data Selling",
    content: (
      <div className="space-y-4">
        <p className="text-dark/65 leading-relaxed">
          We treat your personal data with respect. We share your information only where strictly necessary to fulfil your order:
        </p>
        <div
          className="rounded-xl px-5 py-5 space-y-3"
          style={{ backgroundColor: "#E3EDE6" }}
        >
          <div className="flex items-start gap-3 text-sm">
            <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#4B9073" }} />
            <span className="text-dark/70">
              <strong className="text-dark">Delivery partners</strong> (courier services) receive your shipping address solely for the purpose of fulfilling your order.
            </span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#4B9073" }} />
            <span className="text-dark/70">
              No other third parties receive your personal data without your explicit consent.
            </span>
          </div>
        </div>
        <div
          className="rounded-xl px-5 py-4 text-sm"
          style={{ backgroundColor: "#1a3a2e" }}
        >
          <p className="text-white/80 font-medium">
            We will never sell, rent, or trade your personal information to any third party. Ever.
          </p>
        </div>
      </div>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FCF9F1" }}>
      <MarqueeBanner />
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-14 sm:py-20" data-testid="section-privacy-policy">

        <nav className="flex items-center gap-2 text-xs text-dark/40 mb-10" data-testid="privacy-breadcrumb">
          <Link href="/" className="hover:text-dark/70 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-dark/70">Privacy Policy</span>
        </nav>

        <header className="mb-12 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4B9073" }}>
            SpoiltDogs Australia
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-dark leading-tight" data-testid="text-privacy-title">
            Privacy Policy
          </h1>
          <p className="text-dark/55 leading-relaxed pt-1">
            Your privacy matters to us. This policy explains what information we collect, how we protect it, and who we share it with — in plain, honest language.
          </p>
        </header>

        <div className="space-y-5">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <div
                key={i}
                className="rounded-3xl p-7 sm:p-9 space-y-5"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
                data-testid={`privacy-section-${i}`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "#E3EDE6" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: "#4B9073" }} />
                    </div>
                    <h2 className="font-serif text-xl font-bold text-dark" data-testid={`privacy-section-title-${i}`}>
                      {section.title}
                    </h2>
                  </div>
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ backgroundColor: "#E3EDE6", color: "#4B9073" }}
                  >
                    {section.badge}
                  </span>
                </div>
                <div>{section.content}</div>
              </div>
            );
          })}
        </div>

        <div
          className="mt-10 rounded-3xl px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{ backgroundColor: "#1a3a2e" }}
          data-testid="privacy-contact-note"
        >
          <div className="flex-1">
            <p className="font-semibold text-white text-sm">Questions about your data?</p>
            <p className="text-white/50 text-sm mt-1 leading-relaxed">
              You have the right to access, correct, or request deletion of your personal information at any time.
            </p>
          </div>
          <a
            href="mailto:hello@spoiltdogs.com.au"
            className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#FFD54F", color: "#1a1a1a" }}
            data-testid="link-privacy-contact"
          >
            Contact Us
          </a>
        </div>

        <p className="mt-8 text-center text-xs text-dark/35">
          Last updated: March 2026 — Subject to change without notice.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}

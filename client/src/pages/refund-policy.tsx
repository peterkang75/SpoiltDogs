import { Link } from "wouter";
import { RefreshCw, ShieldCheck, CreditCard, ChevronRight, ExternalLink } from "lucide-react";
import { MarqueeBanner } from "@/components/marquee-banner";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

const sections = [
  {
    icon: RefreshCw,
    title: "Change of Mind",
    badge: "30-Day Returns",
    content: (
      <div className="space-y-4">
        <p className="text-dark/65 leading-relaxed">
          We want you and your dog to be completely happy with every purchase. If for any reason you change your mind, we accept returns within <strong className="text-dark">30 days of purchase</strong>, provided the item is:
        </p>
        <ul className="space-y-2.5">
          {[
            "Unused and in its original condition",
            "In its original, undamaged packaging",
            "Not a perishable or consumable product (e.g. food or treats)",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-dark/65">
              <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#4B9073" }} />
              {item}
            </li>
          ))}
        </ul>
        <div
          className="rounded-xl px-5 py-4 text-sm"
          style={{ backgroundColor: "#F5F0E8", borderLeft: "3px solid #FFD54F" }}
        >
          <strong className="text-dark">Please note:</strong>
          <span className="text-dark/65"> Return shipping costs are at the customer's expense for change-of-mind returns.</span>
        </div>
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    title: "Damaged or Faulty Items",
    badge: "ACL Protected",
    content: (
      <div className="space-y-4">
        <p className="text-dark/65 leading-relaxed">
          Under the <strong className="text-dark">Australian Consumer Law (ACL)</strong>, you are entitled to a replacement or full refund if a product is:
        </p>
        <ul className="space-y-2.5">
          {[
            "Faulty or defective",
            "Not of acceptable quality",
            "Not as described or advertised",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-dark/65">
              <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#4B9073" }} />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-dark/65 leading-relaxed text-sm">
          To lodge a claim, please contact us at{" "}
          <a
            href="mailto:hello@spoiltdogs.com.au"
            className="font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: "#4B9073" }}
          >
            hello@spoiltdogs.com.au
          </a>{" "}
          with a description of the issue and clear photos of the defect. We will respond within 1–2 business days.
        </p>
        <div
          className="rounded-xl px-5 py-4 text-sm flex items-start gap-3"
          style={{ backgroundColor: "#E3EDE6" }}
        >
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#4B9073" }} />
          <p className="text-dark/65">
            In cases covered by the ACL, SpoiltDogs will cover all return shipping costs.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: CreditCard,
    title: "Refund Process",
    badge: "5–7 Business Days",
    content: (
      <div className="space-y-4">
        <p className="text-dark/65 leading-relaxed">
          Once your return has been received and inspected, we will notify you of the outcome by email. Approved refunds are processed as follows:
        </p>
        <div className="space-y-3">
          {[
            { step: "1", label: "Return received & inspected", detail: "We'll email you confirmation upon receipt." },
            { step: "2", label: "Refund approved", detail: "You'll receive an approval email within 1–2 business days." },
            { step: "3", label: "Funds returned", detail: "Refunds are issued to the original payment method within 5–7 business days." },
          ].map(({ step, label, detail }) => (
            <div key={step} className="flex items-start gap-4">
              <div
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#4B9073" }}
              >
                {step}
              </div>
              <div>
                <p className="font-semibold text-dark text-sm">{label}</p>
                <p className="text-dark/55 text-sm mt-0.5">{detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-dark/55 text-sm leading-relaxed pt-1">
          Processing times may vary depending on your bank or payment provider.
        </p>
      </div>
    ),
  },
];

export default function RefundPolicy() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FCF9F1" }}>
      <MarqueeBanner />
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-14 sm:py-20" data-testid="section-refund-policy">

        <nav className="flex items-center gap-2 text-xs text-dark/40 mb-10" data-testid="refund-breadcrumb">
          <Link href="/" className="hover:text-dark/70 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-dark/70">Refund Policy</span>
        </nav>

        <header className="mb-12 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4B9073" }}>
            SpoiltDogs Australia
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-dark leading-tight" data-testid="text-refund-title">
            Refund Policy
          </h1>
          <p className="text-dark/55 leading-relaxed pt-1">
            We stand behind every product we sell. Our refund policy is designed to be fair, transparent, and fully compliant with the Australian Consumer Law.
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
                data-testid={`refund-section-${i}`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "#E3EDE6" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: "#4B9073" }} />
                    </div>
                    <h2 className="font-serif text-xl font-bold text-dark" data-testid={`refund-section-title-${i}`}>
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
          className="mt-10 rounded-3xl px-8 py-7 space-y-3"
          style={{ backgroundColor: "#1a3a2e" }}
          data-testid="refund-acl-note"
        >
          <div className="flex items-start gap-3">
            <ExternalLink className="h-4 w-4 mt-0.5 shrink-0 text-white/50" />
            <div>
              <p className="font-semibold text-white text-sm">Your rights under Australian Consumer Law</p>
              <p className="text-white/50 text-sm mt-1 leading-relaxed">
                Our policy operates alongside and does not limit your statutory rights under the Australian Consumer Law. For more information, visit the{" "}
                <a
                  href="https://www.accc.gov.au/consumers/consumer-rights-guarantees"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white/80 transition-colors"
                  style={{ color: "#FFD54F" }}
                >
                  ACCC website
                </a>.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-dark/35">
          Last updated: March 2026 — Subject to change without notice.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}

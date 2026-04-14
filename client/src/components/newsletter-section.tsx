import { useState } from "react";
import { CheckCircle2, Gift, Loader2, Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

const DISCOUNT_CODE = "SPOILT10";

type SectionState = "idle" | "submitting" | "success";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SectionState>("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setState("submitting");
    try {
      await apiRequest("POST", "/api/newsletter", { email: email.trim() });
      setState("success");
      localStorage.setItem("spoiltdogs_newsletter", "subscribed");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setState("idle");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(DISCOUNT_CODE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section
      className="relative overflow-hidden py-0"
      data-testid="section-newsletter"
    >
      <div className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[420px]">
        {/* LEFT — dog image */}
        <div className="relative hidden lg:block">
          <img
            src="/banner-3-beach-dogs.png"
            alt="Happy dogs on the beach"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 30%" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(26,58,46,0.15) 0%, rgba(26,58,46,0.85) 100%)",
            }}
          />
        </div>

        {/* RIGHT — content */}
        <div
          className="relative flex flex-col justify-center px-8 py-14 sm:px-14 lg:py-16"
          style={{ backgroundColor: "#1a3a2e" }}
        >
          {/* Background texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="relative z-10 max-w-sm">
            {state !== "success" ? (
              <>
                {/* Eyebrow tag */}
                <div
                  className="mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest"
                  style={{ backgroundColor: "#FFD54F", color: "#1a1a1a" }}
                >
                  <Gift className="h-3 w-3" />
                  Limited Offer
                </div>

                {/* Headline */}
                <h2 className="font-serif leading-none mb-2" data-testid="text-newsletter-title">
                  <span
                    className="block font-bold"
                    style={{ fontSize: "clamp(2.75rem,5.5vw,3.5rem)", color: "#FFD54F" }}
                  >
                    10% OFF
                  </span>
                  <span className="block text-2xl sm:text-3xl font-bold text-white mt-1">
                    Your First Order
                  </span>
                </h2>

                {/* Sub */}
                <p
                  className="mt-4 text-sm leading-relaxed mb-6"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                  data-testid="text-newsletter-subtitle"
                >
                  Join thousands of Aussie dog owners getting exclusive deals,
                  new product drops, and expert pup care advice — straight to
                  their inbox. No spam. Just the good stuff.
                </p>

                {/* Perks */}
                <ul className="space-y-2 mb-7">
                  {[
                    "Free shipping thresholds just for subscribers",
                    "Early access to new arrivals",
                    "Monthly vet tips & nutrition guides",
                  ].map((perk) => (
                    <li
                      key={perk}
                      className="flex items-start gap-2 text-xs"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0 mt-0.5"
                        style={{ color: "#4B9073" }}
                      />
                      {perk}
                    </li>
                  ))}
                </ul>

                {/* Form */}
                <form
                  onSubmit={handleSubmit}
                  className="space-y-3"
                  data-testid="form-newsletter"
                >
                  <div className="relative">
                    <Mail
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                      style={{ color: "#4B9073" }}
                    />
                    <input
                      type="email"
                      placeholder="your@email.com.au"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.09)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                      }}
                      data-testid="input-newsletter-email"
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-300">{error}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={state === "submitting"}
                    className="w-full rounded-full py-3 text-sm font-bold gap-2"
                    style={{
                      backgroundColor: "#FFD54F",
                      color: "#1a1a1a",
                      border: "none",
                    }}
                    data-testid="button-newsletter-submit"
                  >
                    {state === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Claim My 10% Off"
                    )}
                  </Button>
                </form>

                <p
                  className="mt-3 text-[10px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  No spam, ever. Unsubscribe anytime. New subscribers only.
                </p>
              </>
            ) : (
              /* Success */
              <div className="space-y-5" data-testid="newsletter-success">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                >
                  <CheckCircle2
                    className="h-7 w-7"
                    style={{ color: "#FFD54F" }}
                  />
                </div>
                <div>
                  <p className="font-serif text-xl font-bold text-white">
                    You're in the pack!
                  </p>
                  <p
                    className="mt-1.5 text-sm"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    Your welcome email is on its way. Use this code now:
                  </p>
                </div>

                <div
                  className="rounded-2xl p-5"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,213,79,0.35)",
                  }}
                >
                  <p
                    className="text-xs mb-1.5"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Your discount code
                  </p>
                  <p
                    className="font-mono text-3xl font-bold tracking-[0.18em]"
                    style={{ color: "#FFD54F" }}
                  >
                    {DISCOUNT_CODE}
                  </p>
                </div>

                <button
                  onClick={copyCode}
                  className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-75"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                  data-testid="button-copy-code-section"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" style={{ color: "#FFD54F" }} />
                      Copied to clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </button>

                <Button
                  asChild
                  className="rounded-full text-sm font-bold px-7"
                  style={{
                    backgroundColor: "#4B9073",
                    color: "#fff",
                    border: "none",
                  }}
                  data-testid="button-shop-now-newsletter"
                >
                  <a href="/products">Shop Now</a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

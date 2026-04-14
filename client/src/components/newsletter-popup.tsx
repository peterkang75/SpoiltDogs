import { useState, useEffect } from "react";
import { X, Gift, Copy, CheckCircle2, Dog, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

const STORAGE_KEY = "spoiltdogs_newsletter";
const POPUP_DELAY_MS = 4000;
const DISCOUNT_CODE = "SPOILT10";

type PopupState = "idle" | "submitting" | "success";

export function NewsletterPopup() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<PopupState>("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "subscribed") return;

    const timer = setTimeout(() => {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => setMounted(false), 400);
    localStorage.setItem(STORAGE_KEY, "dismissed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setState("submitting");
    try {
      await apiRequest("POST", "/api/newsletter", { email: email.trim() });
      setState("success");
      localStorage.setItem(STORAGE_KEY, "subscribed");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setState("idle");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(DISCOUNT_CODE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{
        backgroundColor: visible ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
        transition: "background-color 0.4s ease",
        backdropFilter: visible ? "blur(4px)" : "none",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      data-testid="newsletter-popup-backdrop"
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
        data-testid="newsletter-popup"
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }}
          data-testid="button-popup-close"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* LEFT — dog image (hidden on mobile) */}
          <div className="hidden sm:block relative min-h-[400px]">
            <img
              src="/banner-2-kukdungi-park.jpeg"
              alt="국둥이 at the park"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 20%" }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 60%, rgba(26,58,46,0.6))" }} />
            <div className="absolute bottom-6 left-6">
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: "#FFD54F", color: "#1a1a1a" }}
              >
                <Dog className="h-3 w-3" />
                Guk-dung Approved
              </div>
            </div>
          </div>

          {/* RIGHT — form */}
          <div
            className="flex flex-col justify-center px-7 py-9 sm:px-8"
            style={{ backgroundColor: "#1a3a2e" }}
          >
            {state !== "success" ? (
              <>
                {/* Eyebrow */}
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Exclusive offer · New members only
                </p>

                {/* Headline */}
                <div className="mb-2">
                  <p className="font-serif font-bold leading-none" style={{ fontSize: "clamp(2.5rem,6vw,3.25rem)", color: "#FFD54F" }}>
                    10% OFF
                  </p>
                  <p className="font-serif font-bold text-white leading-tight text-xl sm:text-2xl mt-1">
                    Your First Order
                  </p>
                </div>

                {/* Subtext */}
                <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Join thousands of Aussie dog owners getting the best deals, new product drops, and expert pup care tips — straight to their inbox.
                </p>

                {/* Benefits */}
                <ul className="space-y-1.5 mb-6">
                  {[
                    "10% off your first purchase",
                    "Early access to new arrivals",
                    "Vet tips & dog care guides",
                    "Free shipping offers",
                  ].map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
                      <Gift className="h-3 w-3 shrink-0" style={{ color: "#FFD54F" }} />
                      {b}
                    </li>
                  ))}
                </ul>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3" data-testid="form-popup-newsletter">
                  <input
                    type="email"
                    placeholder="your@email.com.au"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm text-dark placeholder:text-dark/40 outline-none"
                    style={{ backgroundColor: "#FCF9F1", border: "none" }}
                    data-testid="input-popup-email"
                  />
                  {error && <p className="text-xs text-red-300">{error}</p>}
                  <Button
                    type="submit"
                    disabled={state === "submitting"}
                    className="w-full rounded-full py-3 text-sm font-bold gap-2"
                    style={{ backgroundColor: "#FFD54F", color: "#1a1a1a", border: "none" }}
                    data-testid="button-popup-subscribe"
                  >
                    {state === "submitting" ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                    ) : (
                      "Claim My 10% Off"
                    )}
                  </Button>
                </form>

                <p className="mt-3 text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                  No spam, ever. Unsubscribe anytime. By subscribing you agree to our{" "}
                  <a href="/privacy-policy" className="underline hover:opacity-60">Privacy Policy</a>.
                </p>
              </>
            ) : (
              /* Success state */
              <div className="text-center space-y-5" data-testid="popup-success">
                <div className="flex justify-center">
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                  >
                    <CheckCircle2 className="h-8 w-8" style={{ color: "#FFD54F" }} />
                  </div>
                </div>
                <div>
                  <p className="font-serif font-bold text-white text-xl mb-1">You're in the pack!</p>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                    Check your inbox for your welcome email. Here's your code:
                  </p>
                </div>

                {/* Code box */}
                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,213,79,0.3)" }}
                >
                  <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>Your discount code</p>
                  <p className="font-mono text-3xl font-bold tracking-[0.15em]" style={{ color: "#FFD54F" }}>
                    {DISCOUNT_CODE}
                  </p>
                </div>

                <button
                  onClick={copyCode}
                  className="w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors"
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}
                  data-testid="button-copy-code"
                >
                  {copied ? (
                    <><CheckCircle2 className="h-4 w-4" style={{ color: "#FFD54F" }} /> Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4" /> Copy Code</>
                  )}
                </button>

                <Button
                  onClick={dismiss}
                  className="w-full rounded-full text-sm font-bold"
                  style={{ backgroundColor: "#FFD54F", color: "#1a1a1a", border: "none" }}
                  data-testid="button-start-shopping"
                >
                  Start Shopping
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

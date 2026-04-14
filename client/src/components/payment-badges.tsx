import { SiAfterpay, SiApplepay, SiGooglepay, SiVisa, SiMastercard } from "react-icons/si";
import { Lock } from "lucide-react";

interface PaymentBadgesProps {
  priceAud?: number;
  variant?: "compact" | "full";
}

export function PaymentBadges({ priceAud, variant = "full" }: PaymentBadgesProps) {
  const installment = priceAud ? `$${((priceAud / 4) / 100).toFixed(2)}` : null;

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-2" data-testid="payment-badges-compact">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium uppercase tracking-wider text-dark/35">Pay with</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <PayBadge label="Apple Pay" dark>
              <SiApplepay className="h-4 w-4" />
            </PayBadge>
            <PayBadge label="Google Pay" light>
              <SiGooglepay className="h-5 w-5" style={{ color: "#4285F4" }} />
            </PayBadge>
            <PayBadge label="Afterpay" afterpay>
              <SiAfterpay className="h-4 w-4" style={{ color: "#B2FCE4" }} />
            </PayBadge>
            <PayBadge label="Visa" light>
              <SiVisa className="h-4 w-4" style={{ color: "#1A1F71" }} />
            </PayBadge>
            <PayBadge label="Mastercard" light>
              <SiMastercard className="h-4 w-4" style={{ color: "#EB001B" }} />
            </PayBadge>
          </div>
        </div>
        {installment && (
          <div
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
            style={{ backgroundColor: "#E8FFF5", border: "1px solid #B2FCE4" }}
            data-testid="afterpay-installment-compact"
          >
            <SiAfterpay className="h-3.5 w-3.5 shrink-0" style={{ color: "#00C878" }} />
            <span style={{ color: "#1a1a1a" }}>
              Or 4 interest-free payments of <strong>{installment}</strong> with <strong>Afterpay</strong>
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="payment-badges-full">
      {installment && (
        <div
          className="flex items-start gap-3 rounded-xl p-4"
          style={{ backgroundColor: "#E8FFF5", border: "1px solid rgba(0,200,120,0.25)" }}
          data-testid="afterpay-banner"
        >
          <SiAfterpay className="h-6 w-6 shrink-0 mt-0.5" style={{ color: "#00C878" }} />
          <div>
            <p className="text-sm font-semibold text-dark">
              4 interest-free payments of <span style={{ color: "#00C878" }}>{installment}</span>
            </p>
            <p className="text-xs text-dark/50 mt-0.5">
              Available at checkout via Afterpay. No fees when you pay on time.
            </p>
          </div>
        </div>
      )}

      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: "#FAFAFA", border: "1px solid rgba(0,0,0,0.06)" }}
        data-testid="payment-methods-panel"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-dark/35">
          Accepted Payment Methods
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium"
            style={{ backgroundColor: "#000000", minWidth: 90 }}
            data-testid="badge-apple-pay"
            title="Apple Pay"
          >
            <SiApplepay className="h-5 w-5 text-white" />
            <span className="text-white text-xs font-semibold tracking-tight">Pay</span>
          </div>

          <div
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.1)", minWidth: 90 }}
            data-testid="badge-google-pay"
            title="Google Pay"
          >
            <SiGooglepay className="h-6 w-6" style={{ color: "#4285F4" }} />
          </div>

          <div
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium"
            style={{ backgroundColor: "#000000", minWidth: 90 }}
            data-testid="badge-afterpay"
            title="Afterpay"
          >
            <SiAfterpay className="h-4 w-4" style={{ color: "#B2FCE4" }} />
            <span className="text-[11px] font-bold tracking-tight" style={{ color: "#B2FCE4" }}>afterpay</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className="inline-flex items-center justify-center rounded-lg px-3 py-2"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.1)", minWidth: 54 }}
              data-testid="badge-visa"
              title="Visa"
            >
              <SiVisa className="h-5 w-5" style={{ color: "#1A1F71" }} />
            </div>
            <div
              className="inline-flex items-center justify-center rounded-lg px-3 py-2"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.1)", minWidth: 54 }}
              data-testid="badge-mastercard"
              title="Mastercard"
            >
              <SiMastercard className="h-5 w-5" style={{ color: "#EB001B" }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <Lock className="h-3 w-3 text-dark/30 shrink-0" />
          <p className="text-[10px] text-dark/35">
            256-bit SSL encryption · Your payment info is never stored on our servers
          </p>
        </div>
      </div>
    </div>
  );
}

function PayBadge({
  children,
  label,
  dark,
  light,
  afterpay,
}: {
  children: React.ReactNode;
  label: string;
  dark?: boolean;
  light?: boolean;
  afterpay?: boolean;
}) {
  const bg = dark ? "#000" : afterpay ? "#000" : "#fff";
  const border = dark || afterpay ? "none" : "1px solid rgba(0,0,0,0.1)";
  return (
    <div
      className="inline-flex items-center justify-center rounded px-2 py-1"
      style={{ backgroundColor: bg, border, minWidth: 36, height: 24 }}
      title={label}
    >
      {children}
    </div>
  );
}

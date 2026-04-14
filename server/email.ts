import { Resend } from "resend";

const FROM_ADDRESS = "SpoiltDogs <hello@spoiltdogs.com.au>";

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export interface OrderEmailData {
  orderId: string;
  petName: string;
  totalAud: number | null;
  date: string;
  items: Array<{
    name: string;
    priceAud: number;
    quantity: number;
  }>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOrderHtml(order: OrderEmailData): string {
  const safePetName = escapeHtml(order.petName);
  const safeOrderId = escapeHtml(order.orderId);

  const itemRows = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0ede6;font-family:Georgia,serif;font-size:14px;color:#1A1A1A;">${escapeHtml(item.name)}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0ede6;text-align:center;font-size:14px;color:#1A1A1A;">${item.quantity}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0ede6;text-align:right;font-family:Georgia,serif;font-weight:bold;font-size:14px;color:#1A1A1A;">$${((item.priceAud * item.quantity) / 100).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const totalFormatted = order.totalAud != null ? `$${(order.totalAud / 100).toFixed(2)}` : "$--";
  const dateFormatted = new Date(order.date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#FCF9F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">

    <div style="background-color:#2D5A47;border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.6);">Order Confirmed</p>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#FFFFFF;">G'day, ${safePetName}!</h1>
      <p style="margin:12px 0 0;font-size:14px;color:rgba(255,255,255,0.8);line-height:1.6;">
        We've received your order and we're now prepping the best for your furry mate.
      </p>
    </div>

    <div style="background-color:#FFFFFF;padding:0;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

      <div style="padding:20px 32px;border-bottom:1px solid #f0ede6;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;">Order Number<br><span style="font-family:monospace;font-size:14px;font-weight:bold;color:#1A1A1A;letter-spacing:0;">${safeOrderId}</span></td>
          <td style="text-align:right;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;">Date<br><span style="font-size:14px;font-weight:bold;color:#1A1A1A;letter-spacing:0;">${dateFormatted}</span></td>
        </tr></table>
      </div>

      <div style="padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:8px 16px 12px;text-align:left;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;border-bottom:2px solid #2D5A47;">Product</th>
              <th style="padding:8px 16px 12px;text-align:center;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;border-bottom:2px solid #2D5A47;">Qty</th>
              <th style="padding:8px 16px 12px;text-align:right;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;border-bottom:2px solid #2D5A47;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:16px 16px 8px;text-align:right;font-size:14px;font-weight:bold;color:#1A1A1A;">Total (AUD)</td>
              <td style="padding:16px 16px 8px;text-align:right;font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#2D5A47;">${totalFormatted}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="padding:20px 32px;background-color:rgba(45,90,71,0.04);border-top:1px solid #f0ede6;text-align:center;">
        <p style="margin:0 0 16px;font-size:13px;color:#666;line-height:1.5;">
          You'll receive a tracking link once your order ships.<br>Estimated delivery: 3–5 business days within Australia.
        </p>
        <a href="https://spoiltdogs.com.au/my-orders" style="display:inline-block;background-color:#2D5A47;color:#FFFFFF;font-weight:bold;font-size:14px;text-decoration:none;padding:12px 32px;border-radius:999px;">Track My Order</a>
      </div>

      <div style="padding:16px 32px;text-align:center;border-top:1px solid #f0ede6;">
        <p style="margin:0;font-size:11px;color:#999;">
          SpoiltDogs — Premium Australian Pet Boutique<br>
          hello@spoiltdogs.com.au · 30-day happiness guarantee
        </p>
      </div>
    </div>

  </div>
</body>
</html>`;
}

const emailRateLimit = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 3;

export function checkEmailRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = emailRateLimit.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  emailRateLimit.set(ip, recent);
  return true;
}

export async function sendOrderConfirmationEmail(
  to: string,
  order: OrderEmailData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const resend = getResendClient();
    const html = buildOrderHtml(order);
    const safePetName = escapeHtml(order.petName);
    const safeOrderId = escapeHtml(order.orderId);

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Order Confirmed for ${safePetName} — ${safeOrderId}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log(`Email sent to ${to} — Resend ID: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("Email send failed:", err);
    return { success: false, error: err.message };
  }
}

export { buildOrderHtml };

export async function sendNewsletterWelcomeEmail(
  to: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Your 10% Off Code Is Here — Welcome to SpoiltDogs!",
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#FCF9F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    <div style="background-color:#1a3a2e;border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.5);">Welcome to the Pack</p>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:30px;font-weight:bold;color:#FFFFFF;">SpoiltDogs</h1>
      <p style="margin:12px 0 0;font-size:14px;color:rgba(255,255,255,0.75);">G'day! Your exclusive discount is waiting.</p>
    </div>
    <div style="background-color:#FFFFFF;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06);text-align:center;">
      <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6;">
        As a welcome gift, here's <strong>10% off</strong> your first order. Use this code at checkout:
      </p>
      <div style="background-color:#1a3a2e;border-radius:12px;padding:20px 32px;display:inline-block;margin:0 auto 20px;">
        <p style="margin:0;font-family:monospace;font-size:28px;font-weight:bold;letter-spacing:6px;color:#FFD54F;">SPOILT10</p>
      </div>
      <p style="margin:0 0 24px;font-size:13px;color:#888;line-height:1.6;">
        Valid for new subscribers only. One use per customer.<br>No minimum spend. Expires in 30 days.
      </p>
      <a href="https://spoiltdogs.com.au/products" style="display:inline-block;background-color:#4B9073;color:#FFFFFF;font-weight:bold;font-size:14px;text-decoration:none;padding:14px 36px;border-radius:999px;">Shop Now</a>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #f0ede6;">
        <p style="margin:0;font-size:11px;color:#999;">
          SpoiltDogs — Premium Australian Pet Boutique<br>
          hello@spoiltdogs.com.au · spoiltdogs.com.au<br>
          <a href="#" style="color:#999;">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`,
    });
    if (error) return { success: false, error: error.message };
    console.log(`[newsletter] Welcome email sent to ${to} — ID: ${data?.id}`);
    return { success: true };
  } catch (err: any) {
    console.error("[newsletter] Email failed:", err);
    return { success: false, error: err.message };
  }
}

export interface ContactEmailData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

function buildContactHtml(data: ContactEmailData): string {
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safePhone = data.phone ? escapeHtml(data.phone) : "Not provided";
  const safeSubject = escapeHtml(data.subject);
  const safeMessage = escapeHtml(data.message).replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#FCF9F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    <div style="background-color:#1a3a2e;border-radius:16px 16px 0 0;padding:36px 32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.55);">New Customer Enquiry</p>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#FFFFFF;">SpoiltDogs</h1>
      <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">A customer has submitted a contact request</p>
    </div>

    <div style="background-color:#FFFFFF;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0ede6;">
            <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;display:block;margin-bottom:3px;">From</span>
            <span style="font-size:15px;font-weight:600;color:#1a1a1a;">${safeName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0ede6;">
            <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;display:block;margin-bottom:3px;">Email</span>
            <a href="mailto:${safeEmail}" style="font-size:15px;color:#4B9073;text-decoration:none;">${safeEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0ede6;">
            <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;display:block;margin-bottom:3px;">Phone</span>
            <span style="font-size:15px;color:#1a1a1a;">${safePhone}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0ede6;">
            <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;display:block;margin-bottom:3px;">Subject</span>
            <span style="font-size:15px;font-weight:600;color:#1a1a1a;">${safeSubject}</span>
          </td>
        </tr>
      </table>

      <div style="background-color:#FCF9F1;border-radius:12px;padding:20px 24px;">
        <p style="margin:0 0 8px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;">Message</p>
        <p style="margin:0;font-size:14px;color:#333;line-height:1.7;">${safeMessage}</p>
      </div>

      <div style="margin-top:24px;text-align:center;">
        <a href="mailto:${safeEmail}?subject=Re: ${safeSubject}" style="display:inline-block;background-color:#4B9073;color:#FFFFFF;font-weight:bold;font-size:14px;text-decoration:none;padding:12px 32px;border-radius:999px;">Reply to ${safeName}</a>
      </div>

      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f0ede6;text-align:center;">
        <p style="margin:0;font-size:11px;color:#999;">SpoiltDogs — Premium Australian Pet Boutique<br>hello@spoiltdogs.com.au · spoiltdogs.com.au</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildContactAutoReplyHtml(data: ContactEmailData): string {
  const safeName = escapeHtml(data.name);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#FCF9F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    <div style="background-color:#1a3a2e;border-radius:16px 16px 0 0;padding:36px 32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.55);">We've Got Your Message</p>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#FFFFFF;">Thanks, ${safeName}!</h1>
    </div>
    <div style="background-color:#FFFFFF;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06);text-align:center;">
      <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">
        We've received your enquiry and our team will get back to you within <strong>1–2 business days</strong>.<br><br>
        In the meantime, feel free to browse our range of premium Australian pet products.
      </p>
      <a href="https://spoiltdogs.com.au/products" style="display:inline-block;background-color:#4B9073;color:#FFFFFF;font-weight:bold;font-size:14px;text-decoration:none;padding:12px 32px;border-radius:999px;">Shop Now</a>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #f0ede6;">
        <p style="margin:0;font-size:11px;color:#999;">SpoiltDogs — Premium Australian Pet Boutique<br>hello@spoiltdogs.com.au · 30-day happiness guarantee</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendContactInquiryEmail(
  data: ContactEmailData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const resend = getResendClient();
    const adminEmail = process.env.CONTACT_RECIPIENT_EMAIL ?? "hello@spoiltdogs.com.au";

    const [ownerResult, customerResult] = await Promise.allSettled([
      resend.emails.send({
        from: FROM_ADDRESS,
        to: adminEmail,
        replyTo: data.email,
        subject: `New Enquiry: ${data.subject} — from ${data.name}`,
        html: buildContactHtml(data),
      }),
      resend.emails.send({
        from: FROM_ADDRESS,
        to: data.email,
        subject: `We've received your message — SpoiltDogs`,
        html: buildContactAutoReplyHtml(data),
      }),
    ]);

    const ownerOk = ownerResult.status === "fulfilled" && !ownerResult.value.error;
    const ownerId = ownerResult.status === "fulfilled" ? ownerResult.value.data?.id : undefined;

    if (!ownerOk) {
      const err = ownerResult.status === "rejected" ? ownerResult.reason?.message : ownerResult.value.error?.message;
      console.error("[contact email] Owner send failed:", err);
      return { success: false, error: err ?? "Failed to send email" };
    }

    if (customerResult.status === "rejected") {
      console.warn("[contact email] Auto-reply failed (non-critical):", customerResult.reason?.message);
    }

    return { success: true, id: ownerId };
  } catch (err: any) {
    console.error("[contact email] Unexpected error:", err);
    return { success: false, error: err.message };
  }
}

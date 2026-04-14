const STORAGE_KEY = "spoiltdog_orders";

export interface SavedOrder {
  orderId: string;
  petName: string;
  totalAud: number | null;
  status: "preparing" | "shipped" | "delivered";
  date: string;
  items: Array<{
    name: string;
    priceAud: number;
    quantity: number;
  }>;
}

export function getOrders(): SavedOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedOrder[];
  } catch {
    return [];
  }
}

export function saveOrder(order: SavedOrder): void {
  const existing = getOrders();
  const alreadyExists = existing.some((o) => o.orderId === order.orderId);
  if (alreadyExists) return;
  existing.unshift(order);
  if (existing.length > 50) existing.length = 50;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getOrder(orderId: string): SavedOrder | undefined {
  return getOrders().find((o) => o.orderId === orderId);
}

export function generateOrderEmail(order: SavedOrder): string {
  const itemRows = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0ede6;font-family:Georgia,serif;font-size:14px;color:#1A1A1A;">${item.name}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0ede6;text-align:center;font-size:14px;color:#1A1A1A;">${item.quantity}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0ede6;text-align:right;font-family:Georgia,serif;font-weight:bold;font-size:14px;color:#1A1A1A;">$${((item.priceAud * item.quantity) / 100).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const totalFormatted = order.totalAud != null ? `$${(order.totalAud / 100).toFixed(2)}` : "$--";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#FCF9F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">

    <div style="background-color:#2D5A47;border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.6);">Order Confirmed</p>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#FFFFFF;">G'day, ${order.petName}!</h1>
      <p style="margin:12px 0 0;font-size:14px;color:rgba(255,255,255,0.8);line-height:1.6;">
        We've received your order and we're now prepping the best for your furry mate.
      </p>
    </div>

    <div style="background-color:#FFFFFF;padding:0;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

      <div style="padding:20px 32px;border-bottom:1px solid #f0ede6;display:flex;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;">Order Number<br><span style="font-family:monospace;font-size:14px;font-weight:bold;color:#1A1A1A;letter-spacing:0;">${order.orderId}</span></td>
          <td style="text-align:right;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;">Date<br><span style="font-size:14px;font-weight:bold;color:#1A1A1A;letter-spacing:0;">${new Date(order.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span></td>
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
        <a href="#" style="display:inline-block;background-color:#2D5A47;color:#FFFFFF;font-weight:bold;font-size:14px;text-decoration:none;padding:12px 32px;border-radius:999px;">Track My Order</a>
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

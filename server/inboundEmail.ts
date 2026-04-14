import { storage } from "./storage";

function extractEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1] : raw.trim().toLowerCase();
}

async function fetchInboundEmailContent(emailId: string): Promise<{ html: string; text: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, cannot fetch email content");
    return { html: "", text: "" };
  }

  const maxAttempts = 3;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Fetching inbound email from Resend (attempt ${attempt}/${maxAttempts}): ${emailId}`);

      const res = await fetch(`https://api.resend.com/emails/inbound/${emailId}`, {
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "User-Agent": "SpoiltDogs/1.0",
        },
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.warn(`Resend inbound API ${res.status} (attempt ${attempt}): ${errBody}`);
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        return { html: "", text: "" };
      }

      const email = await res.json();
      const html = email.html || "";
      const text = email.text || "";
      console.log(`Resend inbound API success — html: ${html.length} chars, text: ${text.length} chars`);
      return { html, text };
    } catch (err: any) {
      console.error(`Resend inbound API exception (attempt ${attempt}):`, err.message);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
    }
  }

  return { html: "", text: "" };
}

export async function handleInboundEmail(payload: any) {
  console.log("Inbound webhook received — full payload:", JSON.stringify(payload).slice(0, 2000));

  const eventType = payload.type;

  if (eventType && eventType !== "email.received") {
    console.log(`Ignoring Resend event type: ${eventType}`);
    return;
  }

  const data = payload.data || payload;

  const fromRaw = data.from || payload.from || "";
  const toRaw = data.to || payload.to || "";
  const subject = data.subject || payload.subject || "(No subject)";
  const resendId = data.email_id || data.id || payload.email_id || payload.id || null;

  let body = "";
  body = data.html || payload.html || "";
  if (!body) body = data.text || payload.text || "";
  if (!body) body = data.body || payload.body || "";

  if (!body && resendId) {
    console.log(`No body in webhook payload — fetching via Resend Inbound API: ${resendId}`);
    const fetched = await fetchInboundEmailContent(resendId);
    body = fetched.html || fetched.text || "";
  }

  const fromEmail = extractEmail(
    typeof fromRaw === "string"
      ? fromRaw
      : Array.isArray(fromRaw)
        ? fromRaw[0]
        : String(fromRaw)
  );

  let toEmail = "hello@spoiltdogs.com.au";
  if (toRaw) {
    const toStr = Array.isArray(toRaw) ? toRaw[0] : toRaw;
    toEmail = extractEmail(typeof toStr === "string" ? toStr : String(toStr));
  }

  if (!fromEmail) {
    console.warn("Inbound email missing 'from', skipping.");
    console.warn("Top-level keys:", Object.keys(payload));
    if (payload.data) console.warn("Data keys:", Object.keys(payload.data));
    return;
  }

  console.log(`Inbound email — from: ${fromEmail}, to: ${toEmail}, subject: ${subject}, body length: ${body.length}, resendId: ${resendId}`);

  let profileId: string | null = null;
  try {
    const profile = await storage.getProfileByEmail(fromEmail);
    if (profile) {
      profileId = profile.id;
      console.log(`Matched existing profile: ${profileId}`);
    } else {
      const newProfile = await storage.upsertProfileByEmail(fromEmail, {
        email: fromEmail,
      });
      profileId = newProfile.id;
      console.log(`New profile created for ${fromEmail}: ${profileId}`);
    }
  } catch (err) {
    console.error("Failed to link inbound email to profile:", err);
  }

  const message = await storage.createMessage({
    profileId,
    direction: "incoming",
    subject,
    body: body || "(본문을 가져올 수 없습니다)",
    toEmail,
    fromEmail,
    resendId,
    status: "received",
  });

  console.log(`Inbound email saved — id: ${message.id}, from: ${fromEmail}, profile: ${profileId || "none"}, body: ${body.length > 0 ? "YES (" + body.length + " chars)" : "EMPTY"}`);
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCartItemSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendOrderConfirmationEmail, sendContactInquiryEmail, sendNewsletterWelcomeEmail, checkEmailRateLimit } from "./email";
import { createClient } from "@supabase/supabase-js";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.get("/api/categories/:slug", async (req, res) => {
    const category = await storage.getCategoryBySlug(req.params.slug);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  });

  app.get("/api/products", async (_req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get("/api/products/featured", async (_req, res) => {
    const products = await storage.getFeaturedProducts();
    res.json(products);
  });

  app.get("/api/products/:slug", async (req, res) => {
    const product = await storage.getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.get("/api/categories/:slug/products", async (req, res) => {
    const category = await storage.getCategoryBySlug(req.params.slug);
    if (!category) return res.status(404).json({ message: "Category not found" });
    const products = await storage.getProductsByCategory(category.id);
    res.json(products);
  });

  app.get("/api/cart", async (req, res) => {
    const sessionId = req.sessionID || "anonymous";
    const items = await storage.getCartItems(sessionId);
    res.json(items);
  });

  app.post("/api/cart", async (req, res) => {
    const sessionId = req.sessionID || "anonymous";
    const addToCartSchema = insertCartItemSchema.pick({ productId: true, quantity: true }).extend({
      productId: z.string().min(1),
      quantity: z.number().int().positive().optional().default(1),
    });
    const parsed = addToCartSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
    const item = await storage.addCartItem({ sessionId, productId: parsed.data.productId, quantity: parsed.data.quantity });
    res.json(item);
  });

  app.patch("/api/cart/:id", async (req, res) => {
    const updateSchema = z.object({ quantity: z.number().int().positive() });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
    const item = await storage.updateCartItemQuantity(req.params.id, parsed.data.quantity);
    if (!item) return res.status(404).json({ message: "Cart item not found" });
    res.json(item);
  });

  app.delete("/api/cart/:id", async (req, res) => {
    await storage.removeCartItem(req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/orders", async (req, res) => {
    const sessionId = req.sessionID || "anonymous";
    const createOrderSchema = insertOrderSchema.omit({ sessionId: true, status: true }).extend({
      totalAud: z.number().int().positive(),
      customerEmail: z.string().email().optional(),
      customerName: z.string().min(1).optional(),
      shippingAddress: z.string().min(1).optional(),
    });
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
    const order = await storage.createOrder({
      sessionId,
      totalAud: parsed.data.totalAud,
      customerEmail: parsed.data.customerEmail ?? null,
      customerName: parsed.data.customerName ?? null,
      shippingAddress: parsed.data.shippingAddress ?? null,
      status: "pending",
    });
    await storage.clearCart(sessionId);
    res.json(order);
  });

  app.get("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const SYSTEM_PROMPT = `You are a professional Australian Pet Care Consultant for "SpoiltDogs" — a premium boutique for discerning dog owners. You are witty, warm, and expert-level knowledgeable about all SpoiltDogs products. You speak with a friendly Australian charm and back up your recommendations with real nutritional and behavioural expertise. Keep responses concise (2-4 sentences) unless the user asks for detail.

PRODUCT CATALOGUE — you are an expert on every item:

1. prod-1: "Organic Kangaroo & Turmeric Bites" — $24.95 AUD
   - Expert knowledge: Best for WEIGHT MANAGEMENT and dogs with common protein allergies (Beef/Chicken). Kangaroo is a novel, lean protein — high in Zinc and Iron, naturally anti-inflammatory thanks to the turmeric. Grain-free and vet-approved.
   - Ideal for: Overweight dogs, allergy-prone dogs, active dogs needing lean fuel.
   - Tags: Local Aussie Made, High Protein.

2. prod-2: "Orthopedic Memory Foam Bed — Seafoam Green" — $129.00 AUD
   - Expert knowledge: Uses MEDICAL-GRADE memory foam (not regular foam). Essential for senior dogs or large breeds prone to hip dysplasia, arthritis, or joint issues. Organic cotton cover is hypoallergenic and machine washable.
   - Ideal for: Senior dogs (7+), large/giant breeds, post-surgery recovery, dogs with joint pain.
   - Tags: Joint Support, AU Fast Shipping.

3. prod-3: "Smart Interactive Ball with App Control" — $89.00 AUD
   - Expert knowledge: Designed for HIGH-ENERGY dogs and owners who work long hours. Bluetooth-connected with auto-roll patterns that keep dogs mentally stimulated. Tracks play time via the app. Proven to help PREVENT SEPARATION ANXIETY and destructive behaviour.
   - Ideal for: Working breed dogs, puppies with excess energy, dogs left home alone, boredom-prone dogs.
   - Tags: High Tech, Bestseller.

4. prod-4: "Hand-Stitched Italian Leather Collar" — $55.00 AUD
   - Expert knowledge: Full-grain Italian leather with solid brass hardware — sustainable luxury that ages beautifully. Built to last years. The collar for dogs who want to look ELEGANT in the park.
   - Ideal for: Style-conscious owners, "Spoilt" dogs who deserve the best, gifts for dog lovers.
   - Tags: Premium Quality, Limited Edition.

CRITICAL RULES:
- When recommending ANY product, you MUST include the product tag in this exact format: [PRODUCT:prod-1], [PRODUCT:prod-2], [PRODUCT:prod-3], or [PRODUCT:prod-4]. This triggers the product card to appear in the chat. Always include it when mentioning a specific product by name.
- You can recommend multiple products in one response — include a tag for each.
- If the user's dog has a name (provided in context), ALWAYS use their dog's name in your recommendations to make it personal (e.g. "For kookdung, I'd recommend...").
- If the user asks about HEALTH CONCERNS (allergies, joint pain, anxiety, weight), recommend the appropriate product but always add a gentle note: "Of course, for anything serious, a quick chat with your vet is always a good idea."
- Never make up products that aren't in the catalogue. If asked about something you don't carry, say so politely and suggest what you do have.

AUSTRALIAN CONTEXT: All prices are AUD. Free shipping on orders over $99. Locally made products (like the Kangaroo Bites) ship faster within Australia.`;

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, petName, petBreed, petAge } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
      }

      let systemContent = SYSTEM_PROMPT;
      if (petName) {
        systemContent += `\n\nThe user's dog is named "${petName}"`;
        if (petBreed) systemContent += `, breed: ${petBreed}`;
        if (petAge) systemContent += `, age: ${petAge}`;
        systemContent += ". Use this to personalise your recommendations.";
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemContent },
          ...messages.slice(-10),
        ],
        stream: true,
        max_tokens: 500,
        temperature: 0.7,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("AI chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to get AI response" });
      }
    }
  });

  const emailSchema = z.object({
    to: z.string().email(),
    order: z.object({
      orderId: z.string(),
      petName: z.string(),
      totalAud: z.number().nullable(),
      date: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          priceAud: z.number(),
          quantity: z.number(),
        })
      ),
    }),
  });

  app.post("/api/email/order-confirmation", async (req, res) => {
    try {
      if (!process.env.RESEND_API_KEY) {
        return res.status(503).json({ success: false, error: "Email service is not configured" });
      }

      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkEmailRateLimit(clientIp)) {
        return res.status(429).json({ success: false, error: "Too many requests. Please try again later." });
      }

      const parsed = emailSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const result = await sendOrderConfirmationEmail(parsed.data.to, parsed.data.order);
      if (result.success) {
        res.json({ success: true, id: result.id });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error("Email endpoint error:", error);
      res.status(500).json({ success: false, error: "Failed to send email" });
    }
  });

  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error: any) {
      console.error("Failed to get publishable key:", error);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  const checkoutSchema = z.object({
    items: z.array(
      z.object({
        name: z.string(),
        priceAud: z.number().int().positive(),
        quantity: z.number().int().positive(),
        imageUrl: z.string().optional(),
      })
    ).min(1),
    petName: z.string().optional(),
  });

  const emailSentForSession = new Set<string>();

  app.get("/api/checkout/session", async (req, res) => {
    try {
      const sessionId = req.query.session_id as string;
      if (!sessionId) {
        return res.status(400).json({ error: "session_id is required" });
      }
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items"],
      });

      const petName = session.metadata?.petName || "Buddy";
      const customerEmail = session.customer_details?.email || null;
      const amountTotal = session.amount_total;

      if (
        session.payment_status === "paid" &&
        customerEmail &&
        process.env.RESEND_API_KEY &&
        !emailSentForSession.has(sessionId)
      ) {
        emailSentForSession.add(sessionId);

        const lineItems = session.line_items?.data || [];
        const items = lineItems.map((li) => ({
          name: li.description || "Product",
          priceAud: li.price?.unit_amount || 0,
          quantity: li.quantity || 1,
        }));

        const orderId = "SD-AU-" + sessionId.slice(-8).toUpperCase();

        sendOrderConfirmationEmail(customerEmail, {
          orderId,
          petName,
          totalAud: amountTotal,
          date: new Date().toISOString(),
          items,
        }).catch((err) => console.error("Auto-email failed:", err));
      }

      res.json({
        petName,
        customerEmail,
        amountTotal,
        currency: session.currency,
        status: session.payment_status,
      });
    } catch (error: any) {
      console.error("Session retrieval error:", error);
      res.status(500).json({ error: "Failed to retrieve session" });
    }
  });

  app.post("/api/checkout", async (req, res) => {
    try {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid checkout data", details: parsed.error.flatten() });
      }

      const { items, petName } = parsed.data;
      const stripe = await getUncachableStripeClient();

      const proto = req.get("x-forwarded-proto") || req.protocol;
      const baseUrl = `${proto}://${req.get("host")}`;

      const lineItems = items.map((item) => {
        let images: string[] | undefined;
        if (item.imageUrl) {
          const imgUrl = item.imageUrl.startsWith("http")
            ? item.imageUrl
            : `${baseUrl}${item.imageUrl.startsWith("/") ? "" : "/"}${item.imageUrl}`;
          images = [imgUrl];
        }

        return {
          price_data: {
            currency: "aud" as const,
            product_data: {
              name: item.name,
              ...(images ? { images } : {}),
            },
            unit_amount: item.priceAud,
          },
          quantity: item.quantity,
        };
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cancel`,
        metadata: {
          petName: petName || "Buddy",
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/chat/history/:email", async (req, res) => {
    try {
      const profile = await storage.getProfileByEmail(req.params.email);
      if (!profile) return res.json([]);
      const messages = await storage.getMessagesByProfile(profile.id);
      const chatMessages = messages
        .filter(m => m.status === "chat")
        .sort((a, b) => (a.createdAt || "") > (b.createdAt || "") ? 1 : -1)
        .slice(-50)
        .map(m => {
          let productCard: any = undefined;
          let displayText = m.body;
          const pcardMatch = m.body?.match(/<!--PCARD:(.*?)-->/);
          if (pcardMatch) {
            try {
              productCard = JSON.parse(pcardMatch[1]);
              displayText = m.body!.replace(/\n?<!--PCARD:.*?-->/, "").trim();
            } catch {}
          }
          return {
            id: m.id,
            text: displayText,
            from: m.direction === "incoming" ? "visitor" : "agent",
            time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", timeZone: "Australia/Sydney" }) : "",
            ...(productCard ? { productCard } : {}),
          };
        });
      res.json(chatMessages);
    } catch (err: any) {
      console.error("Chat history error:", err.message);
      res.json([]);
    }
  });

  app.post("/api/auth/sync-profile", async (req, res) => {
    try {
      const { supabaseId, email, name } = req.body;
      if (!email) return res.status(400).json({ error: "email required" });

      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: "Invalid token" });
      }

      const normalizedEmail = email.trim().toLowerCase();
      let profile = await storage.getProfileByEmail(normalizedEmail);
      if (!profile) {
        profile = await storage.createProfile({ email: normalizedEmail, name: name || null });
      } else if (name && !profile.name) {
        profile = await storage.updateProfile(profile.id, { name });
      }

      res.json({ success: true, profileId: profile.id });
    } catch (err: any) {
      console.error("[auth/sync-profile]", err.message);
      res.status(500).json({ error: "Failed to sync profile" });
    }
  });

  app.get("/api/auth/my-account", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });

      const token = authHeader.slice(7);
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user?.email) return res.status(401).json({ error: "Invalid token" });

      const profile = await storage.getProfileByEmail(user.email.toLowerCase());
      if (!profile) return res.json({ name: null, email: user.email, messages: [], orders: [] });

      const [messages, orders] = await Promise.all([
        storage.getMessagesByProfile(profile.id),
        storage.getOrdersByEmail(user.email),
      ]);

      res.json({
        name: profile.name,
        email: profile.email,
        messages: messages.slice(0, 20),
        orders: orders.slice(0, 20),
      });
    } catch (err: any) {
      console.error("[auth/my-account]", err.message);
      res.status(500).json({ error: "Failed to load account" });
    }
  });

  app.post("/api/payment-intent", async (req, res) => {
    try {
      const { amountAud } = req.body;
      if (!amountAud || typeof amountAud !== "number" || amountAud < 100) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amountAud),
        currency: "aud",
        automatic_payment_methods: { enabled: true },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err: any) {
      console.error("[payment-intent]", err.message);
      res.status(500).json({ error: "Could not create payment intent" });
    }
  });

  app.post("/api/newsletter", async (req, res) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? "unknown";
    if (!checkEmailRateLimit(ip)) {
      return res.status(429).json({ error: "Too many requests. Please try again shortly." });
    }
    const { email } = req.body;
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    const result = await sendNewsletterWelcomeEmail(email.toLowerCase().trim());
    if (!result.success) {
      console.error("[POST /api/newsletter] Email failed:", result.error);
      return res.status(500).json({ error: "Failed to send your welcome email. Please try again." });
    }
    res.json({ success: true, code: "SPOILT10" });
  });

  const contactSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().max(30).optional(),
    subject: z.string().min(2).max(200),
    message: z.string().min(10).max(3000),
  });

  app.post("/api/contact", async (req, res) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? "unknown";
    if (!checkEmailRateLimit(ip)) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment before trying again." });
    }

    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid form data", details: parsed.error.flatten() });
    }

    const result = await sendContactInquiryEmail(parsed.data);
    if (!result.success) {
      console.error("[POST /api/contact] Email send failed:", result.error);
      return res.status(500).json({ error: "Failed to send your message. Please try again or email us directly." });
    }

    res.json({ success: true, message: "Message sent successfully" });
  });

  return httpServer;
}

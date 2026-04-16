import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { db } from "./db";
import { profiles as profilesTable } from "@shared/schema";
import { z } from "zod";
import { sendOrderConfirmationEmail } from "./email";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { sourcingService, type SupplierName } from "./services/sourcingService";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 100 } });
const musicUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 1 } });

let prodSessionCookie: string | null = null;

async function prodProxy(path: string): Promise<any> {
  const prodUrl = process.env.PRODUCTION_API_URL;
  if (!prodUrl || process.env.NODE_ENV === "production") return null;

  try {
    if (!prodSessionCookie) {
      const loginRes = await fetch(`${prodUrl}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
        redirect: "manual",
      });
      const cookies = loginRes.headers.getSetCookie?.() || [];
      const sid = cookies.find((c: string) => c.includes("connect.sid"));
      if (sid) {
        prodSessionCookie = sid.split(";")[0];
      }
    }

    if (!prodSessionCookie) return null;

    const res = await fetch(`${prodUrl}${path}`, {
      headers: { Cookie: prodSessionCookie },
    });

    if (res.status === 401) {
      prodSessionCookie = null;
      return prodProxy(path);
    }

    if (!res.ok) return null;
    return res.json();
  } catch (err: any) {
    console.warn(`Production proxy failed for ${path}:`, err.message);
    return null;
  }
}

declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAdmin) {
    return next();
  }
  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === process.env.ADMIN_PASSWORD) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

// Claude 출력에서 JSON을 추출하는 강력한 파서
function extractJsonFromClaudeOutput(raw: string): any | null {
  // 1단계: ```json ... ``` 또는 ``` ... ``` 블록 안의 내용 추출
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 2단계: { ... } 형태의 JSON 직접 추출
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }

  return null;
}

export function registerAdminRoutes(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  app.set("trust proxy", 1);

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    }),
  );

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(503).json({ error: "Admin password not configured" });
    }
    if (password === process.env.ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      return res.json({ success: true });
    }
    return res.status(401).json({ error: "Invalid password" });
  });

  app.post("/api/admin/dev-login", (req, res) => {
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(503).json({ error: "Admin password not configured" });
    }
    req.session.isAdmin = true;
    return res.json({ success: true });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/admin/me", (req, res) => {
    res.json({ isAdmin: !!req.session?.isAdmin });
  });

  app.get("/api/admin/profiles", requireAdmin, async (_req, res) => {
    try {
      const prodData = await prodProxy("/api/admin/profiles");
      if (prodData) return res.json(prodData);
      const profiles = await storage.getProfiles();
      res.json(profiles);
    } catch (error: any) {
      console.error("Failed to get profiles:", error);
      res.status(500).json({ error: "Failed to get profiles" });
    }
  });

  app.get("/api/admin/profiles/:id", requireAdmin, async (req, res) => {
    try {
      const prodData = await prodProxy(`/api/admin/profiles/${req.params.id}`);
      if (prodData) return res.json(prodData);
      const profile = await storage.getProfile(req.params.id);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  const updateProfileSchema = z.object({
    name: z.string().optional(),
    dogName: z.string().optional(),
    dogBreed: z.string().optional(),
    dogAge: z.string().optional(),
    preferences: z.string().optional(),
    notes: z.string().optional(),
  });

  app.patch("/api/admin/profiles/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ error: "Invalid data" });
      const profile = await storage.updateProfile(req.params.id, parsed.data);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/admin/profiles/merge", requireAdmin, async (req, res) => {
    try {
      const mergeSchema = z.object({
        keepId: z.string(),
        mergeId: z.string(),
      });
      const parsed = mergeSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ error: "Invalid data" });
      if (parsed.data.keepId === parsed.data.mergeId)
        return res
          .status(400)
          .json({ error: "Cannot merge profile with itself" });
      const result = await storage.mergeProfiles(
        parsed.data.keepId,
        parsed.data.mergeId,
      );
      if (!result) return res.status(404).json({ error: "Profile not found" });
      res.json(result);
    } catch (error: any) {
      console.error("Profile merge error:", error);
      res.status(500).json({ error: "Failed to merge profiles" });
    }
  });

  app.post("/api/admin/profiles", requireAdmin, async (req, res) => {
    try {
      const createSchema = z.object({
        email: z.string().email(),
        name: z.string().optional(),
        dogName: z.string().optional(),
        dogBreed: z.string().optional(),
        dogAge: z.string().optional(),
        preferences: z.string().optional(),
        notes: z.string().optional(),
      });
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success)
        return res
          .status(400)
          .json({ error: "Invalid data", details: parsed.error.flatten() });
      const profile = await storage.upsertProfileByEmail(
        parsed.data.email,
        parsed.data,
      );
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create profile" });
    }
  });

  app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
    try {
      const prodData = await prodProxy("/api/admin/orders");
      if (prodData) return res.json(prodData);
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get orders" });
    }
  });

  const VALID_ORDER_STATUSES = [
    "pending",
    "paid",
    "shipped",
    "complete",
    "cancelled",
  ] as const;

  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !VALID_ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `Status must be one of: ${VALID_ORDER_STATUSES.join(", ")}`,
        });
      }
      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  app.get("/api/admin/messages", requireAdmin, async (_req, res) => {
    try {
      const prodData = await prodProxy("/api/admin/messages");
      if (prodData) return res.json(prodData);
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.get(
    "/api/admin/messages/profile/:profileId",
    requireAdmin,
    async (req, res) => {
      try {
        const prodData = await prodProxy(
          `/api/admin/messages/profile/${req.params.profileId}`,
        );
        if (prodData) return res.json(prodData);
        const messages = await storage.getMessagesByProfile(
          req.params.profileId,
        );
        res.json(messages);
      } catch (error: any) {
        res.status(500).json({ error: "Failed to get messages" });
      }
    },
  );

  const sendEmailSchema = z.object({
    to: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
    profileId: z.string().optional(),
  });

  app.post("/api/admin/messages/send", requireAdmin, async (req, res) => {
    try {
      const parsed = sendEmailSchema.safeParse(req.body);
      if (!parsed.success)
        return res
          .status(400)
          .json({ error: "Invalid data", details: parsed.error.flatten() });

      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      const bodyHtml =
        parsed.data.body.includes("<") && parsed.data.body.includes(">")
          ? parsed.data.body
          : parsed.data.body
              .split("\n")
              .map((line) => (line.trim() ? `<p>${line}</p>` : ""))
              .join("\n");

      const result = await resend.emails.send({
        from: "SpoiltDogs <hello@spoiltdogs.com.au>",
        to: parsed.data.to,
        subject: parsed.data.subject,
        html: bodyHtml,
      });

      if (result.error) {
        console.error("Admin email error:", result.error);
        return res.status(500).json({ error: result.error.message });
      }

      let profileId = parsed.data.profileId || null;
      if (profileId) {
        const existingProfile = await storage.getProfile(profileId);
        if (!existingProfile) {
          try {
            await storage.createProfile({ email: parsed.data.to });
          } catch {}
          const allProfiles = await storage.getProfiles();
          const match = allProfiles.find((p) => p.email === parsed.data.to);
          profileId = match?.id || null;
        }
      }

      const message = await storage.createMessage({
        profileId,
        direction: "outgoing",
        subject: parsed.data.subject,
        body: parsed.data.body,
        toEmail: parsed.data.to,
        fromEmail: "hello@spoiltdogs.com.au",
        resendId: result.data?.id || null,
        status: "sent",
      });

      res.json({ success: true, message });
    } catch (error: any) {
      console.error("Admin send email error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const prodData = await prodProxy("/api/admin/stats");
      if (prodData) return res.json(prodData);
      const [profiles, orders, messages] = await Promise.all([
        storage.getProfiles(),
        storage.getAllOrders(),
        storage.getMessages(),
      ]);
      const totalRevenue = orders.reduce(
        (sum, o) => sum + (o.totalAud || 0),
        0,
      );
      const paidOrders = orders.filter(
        (o) => o.status === "paid" || o.status === "complete",
      );
      res.json({
        totalCustomers: profiles.length,
        totalOrders: orders.length,
        totalMessages: messages.length,
        totalRevenue,
        paidOrders: paidOrders.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  function getOpenAI() {
    if (
      !process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
      !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
    ) {
      return null;
    }
    return new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }

  const analyzeMessageSchema = z.object({
    messageBody: z.string().min(1),
    subject: z.string().nullish(),
  });

  app.post("/api/admin/ai/analyze-message", requireAdmin, async (req, res) => {
    try {
      const openai = getOpenAI();
      if (!openai)
        return res
          .status(503)
          .json({ error: "AI 서비스가 설정되지 않았습니다" });

      const parsed = analyzeMessageSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ error: "Invalid data" });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a bilingual assistant for "SpoiltDogs", a premium Australian pet boutique. Your job is to analyze incoming customer messages (email, live chat, WhatsApp, or SMS) and provide:

1. **Korean Summary (한국어 요약)**: A concise summary in Korean (1-3 sentences, shorter for chat messages).
2. **Mood Analysis (감정 분석)**: Classify the customer's mood. Choose ONE:
   - 😊 만족 (Happy/Satisfied)
   - 😐 일반 문의 (Neutral Inquiry)
   - 😟 불만 (Complaining)
   - 🔥 긴급 (Urgent)
   - 💕 감사 (Grateful)
   - 😢 실망 (Disappointed)
3. **Suggested Action (권장 조치)**: Brief recommendation in Korean on how to respond.

The message may be in English or Korean. Handle both languages.
For short chat messages, keep the summary brief and focused.
If the text contains HTML tags, analyze the plain text content only.

Respond ONLY in JSON format:
{
  "koreanSummary": "...",
  "mood": "...",
  "moodEmoji": "...",
  "suggestedAction": "..."
}`,
          },
          {
            role: "user",
            content: `Subject: ${parsed.data.subject || "(No subject)"}\n\n${parsed.data.messageBody}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return res.json(analysis);
        }
      } catch {}
      res.json({
        koreanSummary: content,
        mood: "일반 문의",
        moodEmoji: "😐",
        suggestedAction: "확인 후 답변",
      });
    } catch (error: any) {
      console.error("AI analyze error:", error);
      res.status(500).json({ error: "AI 분석에 실패했습니다" });
    }
  });

  const draftEmailSchema = z.object({
    instruction: z.string().min(1),
    customerName: z.string().nullish(),
    customerEmail: z.string().nullish(),
    dogName: z.string().nullish(),
    dogBreed: z.string().nullish(),
    dogAge: z.string().nullish(),
    context: z.string().nullish(),
  });

  app.post("/api/admin/ai/draft-email", requireAdmin, async (req, res) => {
    try {
      const openai = getOpenAI();
      if (!openai)
        return res
          .status(503)
          .json({ error: "AI 서비스가 설정되지 않았습니다" });

      const parsed = draftEmailSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ error: "Invalid data" });

      const { instruction, customerName, dogName, dogBreed, dogAge, context } =
        parsed.data;

      let customerContext = "";
      if (customerName) customerContext += `Customer name: ${customerName}\n`;
      if (dogName) customerContext += `Dog's name: ${dogName}\n`;
      if (dogBreed) customerContext += `Dog's breed: ${dogBreed}\n`;
      if (dogAge) customerContext += `Dog's age: ${dogAge}\n`;
      if (context)
        customerContext += `Previous conversation context: ${context}\n`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional email writer for "SpoiltDogs", a premium Australian pet boutique. 

Your writing style is:
- Sophisticated, warm, and empathetic — like a high-end Australian lifestyle brand
- Use the customer's dog name naturally and affectionately throughout
- Professional but never cold; think "luxury concierge" tone
- Australian English (colour, favour, organisation, etc.)
- Sign off as "The SpoiltDogs Team" or "Warm regards, The SpoiltDogs Team"

The admin will give you instructions in Korean. You must generate the email body in polished, high-class Australian English.

Respond in JSON format:
{
  "subject": "Email subject line in English",
  "body": "Full email body in plain text. Use line breaks for paragraphs. Do NOT use any HTML tags."
}`,
          },
          {
            role: "user",
            content: `Customer Information:\n${customerContext || "No customer details available."}\n\nAdmin's instruction (Korean):\n${instruction}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const draft = JSON.parse(jsonMatch[0]);
          return res.json(draft);
        }
      } catch {}
      res.json({ subject: "", body: content });
    } catch (error: any) {
      console.error("AI draft error:", error);
      res.status(500).json({ error: "AI 초안 생성에 실패했습니다" });
    }
  });

  app.get("/api/admin/products/search", requireAdmin, async (req, res) => {
    try {
      const keyword = (req.query.q as string) || "";
      if (!keyword.trim()) {
        const allProducts = await storage.getProducts();
        return res.json(allProducts.slice(0, 20));
      }
      const results = await storage.searchProducts(keyword);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to search products" });
    }
  });

  app.get("/api/admin/products", requireAdmin, async (_req, res) => {
    try {
      const prodData = await prodProxy("/api/admin/products");
      if (prodData) return res.json(prodData);

      const allProducts = await storage.getProducts();
      const allSourcing = await storage.getSourcingEntries();
      const sourcingMap = new Map(allSourcing.map((s) => [s.productId, s]));
      const result = allProducts.map((p) => ({
        ...p,
        sourcing: sourcingMap.get(p.id) || null,
      }));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const {
        name,
        slug,
        description,
        priceAud,
        compareAtPriceAud,
        categoryId,
        imageUrl,
        badge,
        inStock,
        featured,
        supplierName,
        supplierProductId,
        supplierUrl,
        sourcingCostAud,
        shippingCostAud,
        tier,
        sourcingStatus,
        notes,
      } = req.body;

      if (!name || !slug || priceAud === undefined) {
        return res
          .status(400)
          .json({ error: "name, slug, priceAud are required" });
      }

      const product = await storage.createProduct({
        name,
        slug,
        description: description || null,
        priceAud: Math.round(Number(priceAud)),
        compareAtPriceAud: compareAtPriceAud
          ? Math.round(Number(compareAtPriceAud))
          : null,
        categoryId: categoryId || null,
        imageUrl: imageUrl || null,
        images: null,
        badge: badge || null,
        inStock: inStock !== false,
        featured: featured === true,
      });

      let sourcing = null;
      if (supplierName || sourcingCostAud) {
        sourcing = await storage.createSourcing({
          productId: product.id,
          supplierName: supplierName || "",
          supplierProductId: supplierProductId || null,
          supplierUrl: supplierUrl || null,
          sourcingCostAud: Math.round(Number(sourcingCostAud || 0)),
          shippingCostAud: Math.round(Number(shippingCostAud || 0)),
          tier: tier || "smart_choice",
          sourcingStatus: sourcingStatus || "researching",
          notes: notes || null,
        });
      }

      res.json({ ...product, sourcing });
    } catch (error: any) {
      console.error("Create product error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to create product" });
    }
  });

  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        slug,
        description,
        priceAud,
        compareAtPriceAud,
        categoryId,
        imageUrl,
        badge,
        inStock,
        featured,
        supplierName,
        supplierProductId,
        supplierUrl,
        sourcingCostAud,
        shippingCostAud,
        tier,
        sourcingStatus,
        notes,
      } = req.body;

      const productData: Record<string, any> = {};
      if (name !== undefined) productData.name = name;
      if (slug !== undefined) productData.slug = slug;
      if (description !== undefined) productData.description = description;
      if (priceAud !== undefined)
        productData.priceAud = Math.round(Number(priceAud));
      if (compareAtPriceAud !== undefined)
        productData.compareAtPriceAud = compareAtPriceAud
          ? Math.round(Number(compareAtPriceAud))
          : null;
      if (categoryId !== undefined) productData.categoryId = categoryId || null;
      if (imageUrl !== undefined) productData.imageUrl = imageUrl;
      if (badge !== undefined) productData.badge = badge || null;
      if (inStock !== undefined) productData.inStock = inStock;
      if (featured !== undefined) productData.featured = featured;

      const product = await storage.updateProduct(id, productData);
      if (!product) return res.status(404).json({ error: "Product not found" });

      const sourcingData: Record<string, any> = {};
      if (supplierName !== undefined) sourcingData.supplierName = supplierName;
      if (supplierProductId !== undefined)
        sourcingData.supplierProductId = supplierProductId;
      if (supplierUrl !== undefined) sourcingData.supplierUrl = supplierUrl;
      if (sourcingCostAud !== undefined)
        sourcingData.sourcingCostAud = Math.round(Number(sourcingCostAud));
      if (shippingCostAud !== undefined)
        sourcingData.shippingCostAud = Math.round(Number(shippingCostAud));
      if (tier !== undefined) sourcingData.tier = tier;
      if (sourcingStatus !== undefined)
        sourcingData.sourcingStatus = sourcingStatus;
      if (notes !== undefined) sourcingData.notes = notes;

      let sourcing = null;
      if (Object.keys(sourcingData).length > 0) {
        const existing = await storage.getSourcingByProductId(id);
        if (existing) {
          sourcing = await storage.updateSourcing(existing.id, sourcingData);
        } else {
          sourcing = await storage.createSourcing({
            productId: id,
            supplierName: sourcingData.supplierName || "",
            supplierProductId: sourcingData.supplierProductId || null,
            supplierUrl: sourcingData.supplierUrl || null,
            sourcingCostAud: sourcingData.sourcingCostAud ?? 0,
            shippingCostAud: sourcingData.shippingCostAud ?? 0,
            tier: sourcingData.tier || "smart_choice",
            sourcingStatus: sourcingData.sourcingStatus || "researching",
            notes: sourcingData.notes || null,
          });
        }
      } else {
        sourcing = await storage.getSourcingByProductId(id);
      }

      res.json({ ...product, sourcing });
    } catch (error: any) {
      console.error("Update product error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.getProductById(id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      await storage.deleteProduct(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.delete(
    "/api/admin/products-cleanup-seeds",
    requireAdmin,
    async (_req, res) => {
      try {
        const count = await storage.deleteProductsWithoutSourcing();
        res.json({
          success: true,
          deleted: count,
          message: `Deleted ${count} seed products (no sourcing record)`,
        });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: "Cleanup failed", detail: error.message });
      }
    },
  );

  app.get("/api/admin/sourcing", requireAdmin, async (_req, res) => {
    try {
      const entries = await storage.getSourcingEntries();
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch sourcing entries" });
    }
  });

  app.post("/api/admin/sourcing", requireAdmin, async (req, res) => {
    try {
      const entry = await storage.createSourcing(req.body);
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create sourcing entry" });
    }
  });

  app.patch("/api/admin/sourcing/:id", requireAdmin, async (req, res) => {
    try {
      const entry = await storage.updateSourcing(req.params.id, req.body);
      if (!entry) return res.status(404).json({ error: "Not found" });
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update sourcing entry" });
    }
  });

  app.delete("/api/admin/sourcing/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSourcing(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete sourcing entry" });
    }
  });

  app.post(
    "/api/admin/ai/recommend-products",
    requireAdmin,
    async (req, res) => {
      try {
        const openai = getOpenAI();
        if (!openai)
          return res.status(503).json({ error: "AI service not configured" });

        const {
          messages: threadMessages,
          profileContext,
          focusMessageBody,
          focusMessageSubject,
        } = req.body;
        if (!threadMessages || !Array.isArray(threadMessages)) {
          return res.status(400).json({ error: "messages array required" });
        }

        const allProducts = await storage.getProducts();
        if (allProducts.length === 0) {
          return res.json({
            recommendations: [],
            reason: "No products in catalogue",
          });
        }

        const productCatalogue = allProducts.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description || "",
          priceAud: (p.priceAud / 100).toFixed(2),
          badge: p.badge || "",
          inStock: p.inStock,
          featured: p.featured,
        }));

        const isFocused = !!(focusMessageBody || focusMessageSubject);
        const threadSummary = threadMessages
          .slice(-10)
          .map(
            (m: any) =>
              `[${m.direction}] ${m.subject ? m.subject + ": " : ""}${(m.body || "").replace(/<[^>]*>/g, "").slice(0, 200)}`,
          )
          .join("\n");

        const focusInstruction = isFocused
          ? `\n\nIMPORTANT — FOCUSED RECOMMENDATION MODE:
The admin has selected a SPECIFIC message for targeted product recommendations.
You MUST prioritize the content of this specific message above all else.
Focus message${focusMessageSubject ? ` (subject: "${focusMessageSubject}")` : ""}:
"${(focusMessageBody || "").replace(/<[^>]*>/g, "").slice(0, 500)}"

Base your recommendations primarily on what this specific message is asking about or discussing.`
          : "";

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a product recommendation engine for "SpoiltDogs", a premium Australian pet boutique.

CRITICAL RULES:
- You may ONLY recommend products from the catalogue below. Do NOT invent, suggest, or reference any product that is not in this exact list.
- Every "productId" in your response MUST match an "id" from the catalogue below. If no product fits well, return fewer recommendations or an empty array.
- Never recommend generic products, external brands, or items not listed below.

${isFocused ? "Recommend the most relevant products (up to 3) based on the SPECIFIC MESSAGE the admin selected." : "Given a conversation thread between admin and customer, recommend the most relevant products (up to 3)."}

Consider:
- What the customer is asking about or interested in
- Their dog's breed, age, and needs (if mentioned)
- Products that solve their problem or match their interest
- In-stock products preferred over out-of-stock

AVAILABLE PRODUCT CATALOGUE (ONLY these products exist):
${JSON.stringify(productCatalogue, null, 2)}

${profileContext ? `Customer Profile: ${profileContext}` : ""}${focusInstruction}

Respond ONLY in JSON:
{
  "recommendations": [
    {
      "productId": "must be an exact id from the catalogue above",
      "reason": "Brief Korean explanation why this product fits (1 sentence)",
      "confidence": 0.0-1.0
    }
  ],
  "threadSummary": "Brief Korean summary of what the customer needs (1 sentence)"
}`,
            },
            { role: "user", content: threadSummary || "No messages yet." },
          ],
          max_tokens: 600,
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content || "";
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const enriched = (parsed.recommendations || [])
              .map((rec: any) => {
                const product = allProducts.find((p) => p.id === rec.productId);
                return product ? { ...rec, product } : null;
              })
              .filter(Boolean);
            return res.json({
              recommendations: enriched,
              threadSummary: parsed.threadSummary,
            });
          }
        } catch {}
        res.json({ recommendations: [], threadSummary: "" });
      } catch (error: any) {
        console.error("AI recommend error:", error);
        res.status(500).json({ error: "AI recommendation failed" });
      }
    },
  );

  const sendCardSchema = z.object({
    productId: z.string().min(1),
    profileId: z.string().min(1),
    channel: z.enum(["email", "chat", "whatsapp", "sms"]),
  });

  app.post("/api/admin/products/send-card", requireAdmin, async (req, res) => {
    try {
      const parsed = sendCardSchema.safeParse(req.body);
      if (!parsed.success)
        return res
          .status(400)
          .json({ error: "productId, profileId, and valid channel required" });
      const { productId, profileId, channel } = parsed.data;

      const product = await storage.getProductById(productId);
      if (!product) return res.status(404).json({ error: "Product not found" });

      let profile = await storage.getProfile(profileId);
      if (!profile) {
        const prodData = await prodProxy(`/api/admin/profiles/${profileId}`);
        if (prodData && prodData.email) {
          try {
            const existingByEmail = await storage.getProfileByEmail(
              prodData.email,
            );
            if (existingByEmail) {
              profile = existingByEmail;
            } else {
              await db
                .insert(profilesTable)
                .values({
                  id: profileId,
                  email: prodData.email,
                  name: prodData.name || null,
                  dogName: prodData.dogName || null,
                  dogBreed: prodData.dogBreed || null,
                  dogAge: prodData.dogAge || null,
                  preferences: prodData.preferences || null,
                  notes: prodData.notes || null,
                  totalOrders: prodData.totalOrders || 0,
                  totalSpentAud: prodData.totalSpentAud || 0,
                })
                .onConflictDoNothing();
              profile = await storage.getProfile(profileId);
            }
          } catch (upsertErr: any) {
            console.error("Profile upsert failed:", upsertErr.message);
          }
          if (!profile) profile = prodData;
        }
      }
      if (!profile) return res.status(404).json({ error: "Profile not found" });

      const priceStr = `$${(product.priceAud / 100).toFixed(2)} AUD`;
      const compareStr = product.compareAtPriceAud
        ? `$${(product.compareAtPriceAud / 100).toFixed(2)} AUD`
        : null;
      const isProduction = process.env.NODE_ENV === "production";
      const baseUrl = isProduction ? "https://spoiltdogs.com.au" : "";
      const productUrl = `${baseUrl}/products/${product.slug}`;

      if (channel === "whatsapp" || channel === "sms") {
        const text = [
          product.name,
          product.description ? product.description.slice(0, 120) : "",
          compareStr ? `Was ${compareStr} - Now ${priceStr}` : priceStr,
          productUrl,
        ]
          .filter(Boolean)
          .join("\n");

        return res.json({
          type: "text",
          text,
          imageUrl: product.imageUrl || null,
          productUrl,
        });
      }

      const htmlCard = `
<div style="max-width:480px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border:1px solid #e5e0d8;border-radius:12px;overflow:hidden;background:#fff;">
  ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" style="width:100%;height:240px;object-fit:cover;display:block;" />` : ""}
  <div style="padding:20px;">
    ${product.badge ? `<span style="display:inline-block;background:#f59e0b;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;margin-bottom:8px;">${product.badge}</span>` : ""}
    <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a1a;">${product.name}</h2>
    ${product.description ? `<p style="margin:0 0 12px;font-size:14px;color:#666;line-height:1.5;">${product.description.slice(0, 200)}</p>` : ""}
    <div style="margin-bottom:16px;">
      <span style="font-size:20px;font-weight:700;color:#b45309;">${priceStr}</span>
      ${compareStr ? `<span style="font-size:14px;color:#999;text-decoration:line-through;margin-left:8px;">${compareStr}</span>` : ""}
    </div>
    <a href="${productUrl}" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">View Product</a>
  </div>
</div>`;

      if (channel === "email") {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const result = await resend.emails.send({
          from: "SpoiltDogs <hello@spoiltdogs.com.au>",
          to: profile.email,
          subject: `Check out ${product.name} - SpoiltDogs`,
          html: htmlCard,
        });
        if (result.error)
          return res.status(500).json({ error: result.error.message });
        await storage.createMessage({
          profileId: profile.id,
          direction: "outgoing",
          subject: `Check out ${product.name} - SpoiltDogs`,
          body: htmlCard,
          toEmail: profile.email,
          fromEmail: "hello@spoiltdogs.com.au",
          resendId: result.data?.id || null,
          status: "sent",
        });
        return res.json({ success: true, type: "email", htmlCard });
      }

      if (channel === "chat") {
        const productCardMeta = {
          name: product.name,
          description: product.description
            ? product.description.slice(0, 150)
            : undefined,
          price: priceStr,
          comparePrice: compareStr || undefined,
          imageUrl: product.imageUrl || undefined,
          productUrl,
          badge: product.badge || undefined,
        };
        const plainText = [
          `[${product.name}]`,
          product.description ? product.description.slice(0, 120) : "",
          compareStr ? `Was ${compareStr} - Now ${priceStr}` : priceStr,
          productUrl,
          `<!--PCARD:${JSON.stringify(productCardMeta)}-->`,
        ]
          .filter(Boolean)
          .join("\n");

        const message = await storage.createMessage({
          profileId: profile.id,
          direction: "outgoing",
          subject: null,
          body: plainText,
          toEmail: profile.email,
          fromEmail: "hello@spoiltdogs.com.au",
          resendId: null,
          status: "chat",
        });

        const { getIO, getVisitorRoom, getVisitorRoomByEmail } = await import(
          "./chat"
        );
        const ioInstance = getIO();
        let deliveredViaSocket = false;

        if (ioInstance) {
          const targetRoom =
            getVisitorRoom(profile.id) ||
            getVisitorRoom(profileId) ||
            getVisitorRoomByEmail(profile.email);
          if (targetRoom) {
            ioInstance.to(targetRoom).emit("chat:reply", {
              text: plainText,
              id: message.id,
              createdAt: message.createdAt,
              productCard: productCardMeta,
            });
            deliveredViaSocket = true;
          }
          ioInstance
            .to("admin:crm")
            .emit("chat:new-message", { message, profile });
        }

        if (!deliveredViaSocket) {
          let emailFallbackOk = false;
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            const emailResult = await resend.emails.send({
              from: "SpoiltDogs <hello@spoiltdogs.com.au>",
              to: profile.email,
              subject: `Check out ${product.name} - SpoiltDogs`,
              html: htmlCard,
            });
            if (emailResult.data?.id) {
              await storage.createMessage({
                profileId: profile.id,
                direction: "outgoing",
                subject: `Check out ${product.name} - SpoiltDogs`,
                body: htmlCard,
                toEmail: profile.email,
                fromEmail: "hello@spoiltdogs.com.au",
                resendId: emailResult.data.id,
                status: "sent",
              });
              emailFallbackOk = true;
            }
          } catch (emailErr: any) {
            console.error(
              "[send-card] Email fallback failed:",
              emailErr.message,
            );
          }
          return res.json({
            success: true,
            type: emailFallbackOk ? "email-fallback" : "chat-only",
            emailFailed: !emailFallbackOk,
          });
        }
        return res.json({ success: true, type: "chat" });
      }

      res.json({ success: true, type: "html", htmlCard, productUrl });
    } catch (error: any) {
      console.error("Send product card error:", error);
      res.status(500).json({ error: "Failed to send product card" });
    }
  });

  app.post("/api/admin/ai/translate", requireAdmin, async (req, res) => {
    try {
      const openai = getOpenAI();
      if (!openai)
        return res
          .status(503)
          .json({ error: "AI 서비스가 설정되지 않았습니다" });

      const { text, targetLang, tone } = req.body;
      if (!text) return res.status(400).json({ error: "text is required" });

      const target = targetLang || "ko";
      const isChatTone = tone === "chat";

      let systemPrompt: string;
      if (tone === "refine") {
        systemPrompt = `You are a writing assistant for "SpoiltDogs", a premium Australian pet boutique.
The user has written a message in English. Your job is to refine it: fix grammar, spelling, and punctuation errors, and adjust the tone to be friendly, professional Australian chat language.
Keep the meaning exactly the same. Make it sound warm and approachable — like a friendly concierge texting a valued customer.
Use natural Aussie expressions where appropriate — e.g. "Cheers," "No worries," "Happy to help!"
Do NOT make it longer or add new content. Just polish what's there.
Respond in JSON format:
{
  "translated": "refined text here",
  "detectedLang": "영어"
}`;
      } else if (isChatTone && target === "en") {
        systemPrompt = `You are a translation assistant for "SpoiltDogs", a premium Australian pet boutique.
Translate the given text into friendly, professional Australian English suitable for live chat or messaging.
Tone: Polite yet concise. Use natural Aussie chat language — e.g. "Cheers," "No worries," "I'll check that for you right away," "Happy to help!"
Do NOT sound like a formal letter. Keep it warm, approachable, and brief — like a friendly concierge texting a valued customer.
If the text contains HTML tags, strip them and translate the plain text content only.
Respond in JSON format:
{
  "translated": "translated text here",
  "detectedLang": "detected source language name in Korean (e.g. 한국어, 일본어)"
}`;
      } else {
        systemPrompt = `You are a translation assistant. Detect the source language and translate the given text to ${target === "ko" ? "Korean" : target}.
If the text contains HTML tags, strip them and translate the plain text content only.
Respond in JSON format:
{
  "translated": "translated text here",
  "detectedLang": "detected source language name in Korean (e.g. 영어, 일본어, 중국어)"
}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        max_tokens: 1000,
        temperature: isChatTone ? 0.6 : 0.3,
      });

      const content = response.choices[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) return res.json(JSON.parse(jsonMatch[0]));
      } catch {}
      res.json({ translated: content, detectedLang: "알 수 없음" });
    } catch (error: any) {
      console.error("AI translate error:", error);
      res.status(500).json({ error: "번역에 실패했습니다" });
    }
  });

  app.get("/api/admin/suppliers/status", requireAdmin, (_req, res) => {
    res.json(sourcingService.getStatus());
  });

  app.get("/api/admin/suppliers/search", requireAdmin, async (req, res) => {
    const {
      supplier,
      q = "",
      page = "1",
      pageSize = "20",
    } = req.query as Record<string, string>;
    const validSuppliers: SupplierName[] = ["CJ Dropshipping", "Syncee"];
    if (!validSuppliers.includes(supplier as SupplierName)) {
      return res
        .status(400)
        .json({ error: "supplier must be 'CJ Dropshipping' or 'Syncee'" });
    }
    if (!q.trim()) {
      return res.status(400).json({ error: "Search query (q) is required" });
    }
    try {
      const result = await sourcingService.searchSupplier(
        supplier as SupplierName,
        q.trim(),
        parseInt(page),
        parseInt(pageSize),
      );
      res.json(result);
    } catch (error: any) {
      console.error(`[Supplier Search] ${supplier} error:`, error.message);
      res.status(503).json({
        error: error.message || "Supplier search failed",
        hint:
          supplier === "CJ Dropshipping"
            ? "Ensure CJ_API_EMAIL and CJ_API_PASSWORD are set"
            : "Ensure SYNCEE_API_KEY is set",
      });
    }
  });

  app.get("/api/admin/suppliers/product", requireAdmin, async (req, res) => {
    const { supplier, productId } = req.query as Record<string, string>;
    const validSuppliers: SupplierName[] = ["CJ Dropshipping", "Syncee"];
    if (!validSuppliers.includes(supplier as SupplierName)) {
      return res.status(400).json({ error: "Invalid supplier" });
    }
    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }
    try {
      const product = await sourcingService.getProductDetail(
        supplier as SupplierName,
        productId,
      );
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error: any) {
      res
        .status(503)
        .json({ error: error.message || "Failed to fetch product detail" });
    }
  });

  app.get("/api/admin/suppliers/shipping-profile", requireAdmin, (req, res) => {
    const { supplier } = req.query as { supplier: string };
    const validSuppliers: SupplierName[] = ["CJ Dropshipping", "Syncee"];
    if (!validSuppliers.includes(supplier as SupplierName)) {
      return res.status(400).json({ error: "Invalid supplier" });
    }
    res.json(sourcingService.getShippingProfile(supplier as SupplierName));
  });

  // ── Marketing Prompts ────────────────────────────────────────────
  app.get("/api/admin/marketing/prompts", requireAdmin, async (_req, res) => {
    const prompts = await storage.getMarketingPrompts();
    res.json(prompts);
  });

  app.post("/api/admin/marketing/prompts", requireAdmin, async (req, res) => {
    const { name, systemInstruction, category, section, modelTarget } =
      req.body;
    if (!name || !systemInstruction) {
      return res
        .status(400)
        .json({ error: "name and systemInstruction are required" });
    }
    const prompt = await storage.createMarketingPrompt({
      name,
      systemInstruction,
      category: category || "global",
      section: section || "instagram_post",
      modelTarget: modelTarget || null,
    });
    res.status(201).json(prompt);
  });

  app.patch(
    "/api/admin/marketing/prompts/:id",
    requireAdmin,
    async (req, res) => {
      const prompt = await storage.updateMarketingPrompt(
        req.params.id,
        req.body,
      );
      if (!prompt) return res.status(404).json({ error: "Prompt not found" });
      res.json(prompt);
    },
  );

  app.delete(
    "/api/admin/marketing/prompts/:id",
    requireAdmin,
    async (req, res) => {
      await storage.deleteMarketingPrompt(req.params.id);
      res.json({ success: true });
    },
  );

  // ── Marketing Queue ──────────────────────────────────────────────
  app.get("/api/admin/marketing/queue", requireAdmin, async (_req, res) => {
    const queue = await storage.getMarketingQueue();
    res.json(queue);
  });

  app.post("/api/admin/marketing/queue", requireAdmin, async (req, res) => {
    const body = { ...req.body };

    if (body.generated_content) {
      const raw = body.generated_content as string;

      // extractJsonFromClaudeOutput: 어떤 형태로 와도 JSON을 찾아냄
      const parsed = extractJsonFromClaudeOutput(raw);

      if (parsed) {
        // 구조 1: { "caption": "...", "hashtags": "...", "imagePrompt": "..." }
        if (parsed.caption) {
          body.caption = parsed.caption;
          body.hashtags = parsed.hashtags || null;
          body.imagePrompt = parsed.imagePrompt || null;
        }
        // 구조 2: { "post": { "caption": "..." } }
        else if (parsed.post?.caption) {
          body.caption = parsed.post.caption;
          body.hashtags = parsed.post.hashtags || null;
          body.imagePrompt = parsed.post.imagePrompt || null;
        }
        // 구조 3: JSON은 파싱됐는데 caption 키가 없는 경우
        else {
          body.caption = raw;
        }
      } else {
        // JSON이 전혀 없으면 텍스트 그대로 caption에 저장
        body.caption = raw;
      }

      delete body.generated_content;
    }

    const item = await storage.createMarketingQueueItem(body);
    res.status(201).json(item);
  });

  app.patch(
    "/api/admin/marketing/queue/:id/approve",
    requireAdmin,
    async (req, res) => {
      const item = await storage.updateMarketingQueueItem(req.params.id, {
        status: "approved",
        approvedBy: "admin",
      });
      if (!item) return res.status(404).json({ error: "Queue item not found" });
      res.json(item);
    },
  );

  app.patch(
    "/api/admin/marketing/queue/:id/reject",
    requireAdmin,
    async (req, res) => {
      const { rejectionReason } = req.body;
      const item = await storage.updateMarketingQueueItem(req.params.id, {
        status: "rejected",
        rejectionReason: rejectionReason || null,
      });
      if (!item) return res.status(404).json({ error: "Queue item not found" });
      res.json(item);
    },
  );

  app.delete(
    "/api/admin/marketing/queue/:id",
    requireAdmin,
    async (req, res) => {
      await storage.deleteMarketingQueueItem(req.params.id);
      res.json({ success: true });
    },
  );

  // ── Claude Direct Content Generation ─────────────────────────────────────
  app.post("/api/admin/marketing/generate", requireAdmin, async (req, res) => {
    const { topic, prompt_id, platform, contentType, model, additionalInstructions, attachedImageUrls } = req.body;

    if (!topic || typeof topic !== "string") {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    const safeAttachedImageUrls: string[] = Array.isArray(attachedImageUrls) ? attachedImageUrls : [];

    try {
      let promptText = "";
      if (prompt_id) {
        const prompt = await storage.getMarketingPrompt(prompt_id);
        if (prompt) promptText = prompt.systemInstruction ?? "";
      }

      const { generateMarketingContent } = await import(
        "./services/claudeMarketingService"
      );
      const result = await generateMarketingContent({
        topic: topic.trim(),
        platform: platform ?? "instagram",
        promptText,
        contentType: contentType ?? "feed_image",
        additionalInstructions: additionalInstructions ?? "",
        attachedImageUrls: safeAttachedImageUrls,
      });

      // Append image guidelines (from brand context) to the image prompt
      // so they are available during FAL.AI generation without re-querying.
      const fullImagePrompt = result.imagePrompt
        ? result.imagePrompt +
          (result.imageGuidelines
            ? `\n\n=== STYLE GUIDELINES ===\n${result.imageGuidelines}`
            : "")
        : "";

      const item = await storage.createMarketingQueueItem({
        platform: platform ?? "instagram",
        contentType: contentType ?? "feed_image",
        caption: result.caption,
        hashtags: result.hashtags,
        imagePrompt: fullImagePrompt,
        imageUrl: safeAttachedImageUrls[0] || null,
        topic: topic.trim(),
        status: "pending",
      });

      res.json({ success: true, item });
    } catch (error: any) {
      console.error("Marketing generate error:", error);
      res
        .status(500)
        .json({ error: error.message || "Content generation failed" });
    }
  });

  // ── FAL.AI Image Generation ───────────────────────────────────────
  app.post(
    "/api/admin/marketing/queue/:id/generate-image",
    requireAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const {
          model: modelOverride,
          duration = "8",
          audioEnabled = false,
          musicUrl = null,
          musicVolume = 40,
          motionDirective = "",
        } = req.body;

        const item = await storage.getMarketingQueueItem(id);
        if (!item) {
          res.status(404).json({ error: "Queue item not found" });
          return;
        }

        const basePrompt = item.imagePrompt || item.caption || "";
        if (!basePrompt) {
          res.status(400).json({ error: "No image prompt available" });
          return;
        }

        // Fetch live image guidelines from brand context (always up-to-date)
        const brandContext = await storage.getBrandContextItems();
        const imageGuidelineText = brandContext
          .filter((bc) => bc.isActive && bc.type === "image_guideline")
          .map((bc) => bc.content)
          .join("\n");

        // Build enhanced prompt: base prompt + live image guidelines
        const prompt = basePrompt +
          (imageGuidelineText
            ? `\n\nSTRICT VISUAL REQUIREMENTS - MUST FOLLOW:\n${imageGuidelineText}`
            : "");

        // Get Gukdung reference images
        // - 비디오: isVideoReference 플래그 (국둥이 대표 7장, 브랜드 일관성)
        // - 이미지: isTrainingData 플래그 (기존 로직)
        const isVideoContent = item.contentType === "reel" || item.contentType === "tiktok";
        const gukdungImages = await storage.getGukdungImages();
        const referenceImages = isVideoContent
          ? gukdungImages
              .filter((img) => img.isVideoReference && img.imageUrl && img.imageUrl.startsWith("http"))
              .slice(0, 7)
              .map((img) => img.imageUrl)
          : gukdungImages
              .filter((img) => img.isTrainingData && img.imageUrl && img.imageUrl.startsWith("http"))
              .slice(0, 5)
              .map((img) => img.imageUrl);

        // Auto-select model and aspect ratio from contentType
        const contentType = item.contentType || "feed_image";
        let autoModel = "nano-banana-2";
        let aspectRatio = "1:1";

        if (contentType === "card_news") {
          autoModel = "ideogram";
        } else if (contentType === "reel" || contentType === "tiktok") {
          autoModel = "kling-3";
          aspectRatio = "9:16";
        } else if (contentType === "story_image") {
          autoModel = "nano-banana-2";
          aspectRatio = "9:16";
        }

        const selectedModel = modelOverride || autoModel;
        const isCardNews = contentType === "card_news";
        const isVideo = contentType === "reel" || contentType === "tiktok";

        if (isCardNews) {
          // ── Card News: Nano Banana 2 → Sharp text overlay ──
          const captionLines = (item.caption || "")
            .split("\n")
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0 && !l.startsWith("#"));

          const textLines = captionLines.slice(0, 2).map((l: string) =>
            l.length > 28 ? l.slice(0, 28) + "..." : l
          );

          const { generateCardNewsImage } = await import("./services/cardNewsService");
          const result = await generateCardNewsImage({
            imagePrompt: item.imagePrompt || "",
            textLines,
            referenceImageUrls: referenceImages,
            aspectRatio: "1:1",
          });

          const updated = await storage.updateMarketingQueueItem(id, {
            imageUrl: result.imageUrl,
          });

          return res.json({ success: true, imageUrl: result.imageUrl, item: updated });
        }

        if (isVideo) {
          // ── Kling O1 reference-to-video (참조 7장 직접 전달, 무음) ──
          const gukdungProfile = brandContext
            .filter((i) => i.isActive && i.type === "gukdung_profile")
            .map((i) => i.content)
            .join("\n");

          const { generateVideoWithKlingO1 } = await import("./services/falService");
          const result = await generateVideoWithKlingO1({
            prompt: prompt,
            caption: item.caption || "",
            motionDirective: motionDirective || "",
            referenceImageUrls: referenceImages,
            aspectRatio: "9:16",
            duration,
            gukdungProfile,
            imageGuidelines: imageGuidelineText,
          });

          let finalVideoUrl = result.videoUrl;
          if (audioEnabled && musicUrl) {
            try {
              const { mixVideoWithMusic } = await import("./services/musicMixService");
              finalVideoUrl = await mixVideoWithMusic({
                videoUrl: result.videoUrl,
                musicUrl,
                musicVolume: Number(musicVolume) || 40,
              });
              console.log("[KlingO1] Music mixed:", finalVideoUrl);
            } catch (mixErr: any) {
              console.error("[KlingO1] Music mix failed, returning silent video:", mixErr?.message);
            }
          }

          const updateData: Record<string, string | null> = {
            videoUrl: finalVideoUrl,
            imagePrompt: result.videoPrompt || item.imagePrompt || null,
          };
          const updated = await storage.updateMarketingQueueItem(id, updateData as any);
          res.json({
            success: true,
            videoUrl: finalVideoUrl,
            videoPrompt: result.videoPrompt || null,
            item: updated,
          });
        } else {
          // ── Standard image generation ─────────────────────────────────────
          const { generateImage } = await import("./services/falService");
          const result = await generateImage({
            prompt: `${prompt}. Professional pet photography style, high quality.`,
            model: selectedModel as any,
            referenceImageUrls:
              selectedModel !== "ideogram" && selectedModel !== "kling"
                ? referenceImages
                : [],
            aspectRatio,
          });

          if (!result.imageUrl && !result.videoUrl) {
            res
              .status(500)
              .json({ error: "Generation failed — no URL returned" });
            return;
          }

          const updateData: Record<string, string> = result.videoUrl
            ? { videoUrl: result.videoUrl }
            : { imageUrl: result.imageUrl! };
          const updated = await storage.updateMarketingQueueItem(id, updateData);
          res.json({
            success: true,
            imageUrl: result.imageUrl || null,
            videoUrl: result.videoUrl || null,
            item: updated,
          });
        }
      } catch (error: any) {
        const msg = error?.message || "";
        if (msg.startsWith("CREDIT_EXHAUSTED:")) {
          const service = msg.split(":")[1] || "FAL.AI";
          res.status(402).json({
            error: "CREDIT_EXHAUSTED",
            service,
            message: `${service} 크레딧이 부족합니다. 충전 후 다시 시도해주세요.`,
            chargeUrl: "https://fal.ai/dashboard/usage-billing/credits",
          });
          return;
        }
        const detail = JSON.stringify(error?.body?.detail || error?.body || "");
        console.error(`FAL.AI generate image error: status=${error?.status} detail=${detail} msg=${error?.message}`);
        res
          .status(500)
          .json({ error: error.message || "Image generation failed", detail });
      }
    },
  );

  // ── Queue Item Translation (Claude) ──────────────────────────────
  app.post(
    "/api/admin/marketing/queue/:id/translate",
    requireAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const item = await storage.getMarketingQueueItem(id);
        if (!item) {
          res.status(404).json({ error: "Queue item not found" });
          return;
        }

        if (!item.caption) {
          res.status(400).json({ error: "No caption to translate" });
          return;
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const textToTranslate = [
          `CAPTION:\n${item.caption}`,
          item.hashtags ? `HASHTAGS:\n${item.hashtags}` : "",
        ].filter(Boolean).join("\n\n");

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 1500,
          system: `You are a Korean translator for "Spoilt Dogs", a premium Australian pet boutique.
Translate the given Instagram post caption and hashtags into natural, engaging Korean.
Keep the same tone (warm, witty, premium), preserve all emojis, and translate hashtags to Korean equivalents (keep # prefix).
For English-only brand terms (SpoiltDogs, Gukdung, etc.) keep them as-is.
Respond ONLY with a JSON object:
{
  "caption": "Korean translated caption",
  "hashtags": "Korean translated hashtags"
}`,
          messages: [{ role: "user", content: textToTranslate }],
        });

        const responseText = message.content
          .filter((b) => b.type === "text")
          .map((b) => (b as any).text)
          .join("");

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          res.status(500).json({ error: "Translation parsing failed" });
          return;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        res.json({
          success: true,
          captionKo: parsed.caption || "",
          hashtagsKo: parsed.hashtags || "",
        });
      } catch (error: any) {
        console.error("Translation error:", error);
        res.status(500).json({ error: error.message || "Translation failed" });
      }
    },
  );

  // ── FAL.AI LoRA Training (async queue) ───────────────────────────
  app.post("/api/admin/brand/lora-train", requireAdmin, async (req, res) => {
    try {
      const images = await storage.getGukdungImages();
      const trainingImages = images.filter(
        (img) => img.isTrainingData && img.imageUrl,
      );

      if (trainingImages.length < 5) {
        res.status(400).json({
          error: "최소 5장의 학습용 사진이 필요합니다.",
          current: trainingImages.length,
        });
        return;
      }

      const imageUrls = trainingImages
        .map((img) => img.imageUrl)
        .filter((url) => url.startsWith("http"));

      const { submitLoRATraining } = await import("./services/falService");
      const { requestId } = await submitLoRATraining({ imageUrls });

      res.json({
        success: true,
        requestId,
        trainedWith: trainingImages.length,
        status: "training_started",
      });
    } catch (error: any) {
      console.error("LoRA training error:", error);
      res.status(500).json({ error: error.message || "LoRA training failed" });
    }
  });

  // ── FAL.AI LoRA Status Polling ────────────────────────────────────
  app.get("/api/admin/brand/lora-status/:requestId", requireAdmin, async (req, res) => {
    try {
      const { requestId } = req.params;
      const { checkLoRAStatus } = await import("./services/falService");
      const result = await checkLoRAStatus(requestId);

      if (result.status === "completed" && result.loraModelId) {
        const images = await storage.getGukdungImages();
        const trainingImages = images.filter((img) => img.isTrainingData);
        for (const img of trainingImages) {
          await storage.updateGukdungImage(img.id, { loraModelId: result.loraModelId });
        }
        console.log(`[LoRA] Saved loraModelId to ${trainingImages.length} images.`);
      }

      res.json(result);
    } catch (error: any) {
      console.error("LoRA status check error:", error);
      res.status(500).json({ error: error.message || "Status check failed" });
    }
  });

  // ── Brand Context CRUD ────────────────────────────────────────────
  app.get("/api/admin/brand/context", requireAdmin, async (req: Request, res: Response) => {
    const items = await storage.getBrandContextItems();
    res.json(items);
  });

  app.post("/api/admin/brand/context", requireAdmin, async (req: Request, res: Response) => {
    const { type, title, content, isActive } = req.body;
    if (!type || !title || !content) {
      res.status(400).json({ error: "type, title, content are required" });
      return;
    }
    const item = await storage.createBrandContextItem({ type, title, content, isActive: isActive ?? true });
    res.json(item);
  });

  app.patch("/api/admin/brand/context/:id", requireAdmin, async (req: Request, res: Response) => {
    const item = await storage.updateBrandContextItem(req.params.id, req.body);
    if (!item) { res.status(404).json({ error: "Not found" }); return; }
    res.json(item);
  });

  app.delete("/api/admin/brand/context/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteBrandContextItem(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/brand/identity", requireAdmin, async (req: Request, res: Response) => {
    const identity = req.body;
    if (!identity || typeof identity !== "object") {
      res.status(400).json({ error: "Invalid body" });
      return;
    }
    const items = await storage.getBrandContextItems();
    const existing = items.find((i) => i.type === "brand_identity");
    const content = JSON.stringify(identity);
    if (existing) {
      const updated = await storage.updateBrandContextItem(existing.id, { content, isActive: true });
      res.json(updated);
    } else {
      const created = await storage.createBrandContextItem({
        type: "brand_identity",
        title: "브랜드 아이덴티티",
        content,
        isActive: true,
      });
      res.json(created);
    }
  });

  // ── Gukdung Images CRUD ───────────────────────────────────────────
  app.get("/api/admin/brand/images", requireAdmin, async (req: Request, res: Response) => {
    const images = await storage.getGukdungImages();
    res.json(images);
  });

  app.post("/api/admin/brand/images", requireAdmin, async (req: Request, res: Response) => {
    const { imageUrl, description, tags, isTrainingData, loraModelId } = req.body;
    if (!imageUrl) {
      res.status(400).json({ error: "imageUrl is required" });
      return;
    }
    const image = await storage.createGukdungImage({ imageUrl, description, tags, isTrainingData: isTrainingData ?? false, loraModelId });
    res.json(image);
  });

  app.patch("/api/admin/brand/images/:id", requireAdmin, async (req: Request, res: Response) => {
    const image = await storage.updateGukdungImage(req.params.id, req.body);
    if (!image) { res.status(404).json({ error: "Not found" }); return; }
    res.json(image);
  });

  app.delete("/api/admin/brand/images/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteGukdungImage(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/brand/images/upload", requireAdmin, upload.array("files", 100), async (req: Request, res: Response) => {
    try {
      const { uploadBufferToStorage } = await import("./services/storageService");

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "No files uploaded" });
        return;
      }

      const { description, tags, isTrainingData } = req.body;
      const results = [];

      for (const file of files) {
        const ext = (file.originalname.split(".").pop() ?? "jpg").toLowerCase();
        const filename = `gukdung_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        let imageUrl: string;
        try {
          imageUrl = await uploadBufferToStorage(
            file.buffer,
            filename,
            file.mimetype || "image/jpeg",
            "uploads"
          );
        } catch (uploadErr: any) {
          console.error("Supabase upload error:", uploadErr.message);
          continue;
        }

        const image = await storage.createGukdungImage({
          imageUrl,
          description: description || null,
          tags: tags || null,
          isTrainingData: isTrainingData === "true" || isTrainingData === true,
          loraModelId: null,
        });

        results.push(image);
      }

      res.json({ success: true, uploaded: results.length, images: results });
    } catch (error: any) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  app.get("/api/admin/brand/music", requireAdmin, async (_req: Request, res: Response) => {
    const items = await storage.getBrandContextByType("brand_music");
    res.json(items);
  });

  app.post("/api/admin/brand/music/upload", requireAdmin, musicUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const { uploadBufferToStorage } = await import("./services/storageService");
      const { parseBuffer } = await import("music-metadata");

      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const { title, mood } = req.body as { title?: string; mood?: string };
      if (!title) {
        res.status(400).json({ error: "Title is required" });
        return;
      }

      let durationSec = 0;
      try {
        const meta = await parseBuffer(file.buffer, { mimeType: file.mimetype });
        durationSec = Math.round(meta.format.duration ?? 0);
      } catch (metaErr: any) {
        console.warn("[Music] Failed to parse duration:", metaErr.message);
      }

      const ext = (file.originalname.split(".").pop() ?? "mp3").toLowerCase();
      const filename = `music_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const url = await uploadBufferToStorage(
        file.buffer,
        filename,
        file.mimetype || "audio/mpeg",
        "music"
      );

      const item = await storage.createBrandContextItem({
        type: "brand_music",
        title,
        content: JSON.stringify({
          url,
          mood: mood || "neutral",
          durationSec,
          fileName: file.originalname,
          sizeBytes: file.size,
        }),
        isActive: true,
      });

      res.json(item);
    } catch (error: any) {
      console.error("Music upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  app.patch("/api/admin/brand/music/:id", requireAdmin, async (req: Request, res: Response) => {
    const { title, mood, isActive } = req.body as { title?: string; mood?: string; isActive?: boolean };
    const existing = await storage.getBrandContextByType("brand_music");
    const item = existing.find((i) => i.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const patch: any = {};
    if (typeof isActive === "boolean") patch.isActive = isActive;
    if (title !== undefined) patch.title = title;
    if (mood !== undefined) {
      try {
        const parsed = JSON.parse(item.content ?? "{}");
        parsed.mood = mood;
        patch.content = JSON.stringify(parsed);
      } catch {}
    }

    const updated = await storage.updateBrandContextItem(req.params.id, patch);
    res.json(updated);
  });

  app.delete("/api/admin/brand/music/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { deleteFromStorage } = await import("./services/storageService");
      const items = await storage.getBrandContextByType("brand_music");
      const item = items.find((i) => i.id === req.params.id);
      if (item?.content) {
        try {
          const parsed = JSON.parse(item.content);
          if (parsed.url) await deleteFromStorage(parsed.url);
        } catch {}
      }
      await storage.deleteBrandContextItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Music delete error:", error);
      res.status(500).json({ error: error.message || "Delete failed" });
    }
  });
}

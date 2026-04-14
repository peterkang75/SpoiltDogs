import dotenv from "dotenv";
dotenv.config();
import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { registerAdminRoutes } from "./adminRoutes";
import { registerWooCommerceRoutes } from "./woocommerceRoutes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { WebhookHandlers } from "./webhookHandlers";
import { setupChat } from "./chat";
import { seedProducts } from "./storage";

const app = express();
const httpServer = createServer(app);
setupChat(httpServer);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

if (process.env.STRIPE_SECRET_KEY) {
  log("Stripe configured via env vars", "stripe");
} else {
  log("STRIPE_SECRET_KEY not set — payment routes will fail until configured", "stripe");
}

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
        return res.status(500).json({ error: "Webhook processing error" });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.post(
  "/api/webhooks/resend/inbound",
  express.json(),
  async (req, res) => {
    try {
      const { handleInboundEmail } = await import("./inboundEmail");
      await handleInboundEmail(req.body);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Inbound email webhook error:", error.message);
      res.status(200).json({ received: true });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { storage } = await import("./storage");
  storage.deleteProductsWithoutSourcing()
    .then(n => { if (n > 0) console.log(`[Startup] Removed ${n} seed product(s) with no sourcing record`); })
    .catch(err => console.error("[Startup] Seed cleanup error:", err));
  storage.deduplicateBySupplierProductId()
    .then(n => { if (n > 0) console.log(`[Startup] Removed ${n} duplicate product(s) by SKU`); })
    .catch(err => console.error("[Startup] Dedup cleanup error:", err));

  const { ensureBucketsExist, cleanupOldContent } = await import("./services/storageService");
  ensureBucketsExist().catch((err: any) =>
    console.error("[Storage] Bucket init error:", err.message)
  );

  cleanupOldContent().catch(console.error);
  setInterval(() => {
    cleanupOldContent().catch(console.error);
  }, 24 * 60 * 60 * 1000);

  const uploadsDir = path.join(process.cwd(), "client", "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  registerAdminRoutes(app);
  registerWooCommerceRoutes(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
  httpServer.listen(port, host, () => {
    log(`serving on ${host}:${port}`);
  });
})();
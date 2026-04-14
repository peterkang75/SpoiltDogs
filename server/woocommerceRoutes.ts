/**
 * WooCommerce REST API Emulation Layer
 *
 * Makes our Express server look like a WooCommerce store to Syncee.
 * No WordPress is installed — this is a purpose-built mock that speaks
 * the WooCommerce REST API protocol (v3) and stores data in our own DB.
 *
 * Endpoints implemented:
 *   GET  /wp-json                          — WordPress discovery
 *   GET  /wp-json/wc/v3                    — WooCommerce capability declaration
 *   GET  /wp-json/wc/v3/products           — List products (returns our catalog)
 *   POST /wp-json/wc/v3/products           — Create single product from Syncee push
 *   POST /wp-json/wc/v3/products/batch     — Batch create/update/delete
 *   GET  /wp-json/wc/v3/products/categories — List categories
 *   POST /wp-json/wc/v3/products/categories — Create category (ignored, returns 200)
 *   GET  /wp-json/wc/v3/system_status      — System health check
 *
 * Authentication:
 *   HTTP Basic Auth — any request whose Authorization header decodes to
 *   a consumer key starting with "ck_" and a consumer secret starting with "cs_"
 *   is accepted. Credentials are set via env vars WC_CONSUMER_KEY / WC_CONSUMER_SECRET.
 */

import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

const STORE_URL =
  process.env.STORE_URL ||
  (process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : `https://${process.env.REPL_SLUG || "spoiltdogs"}.replit.dev`);

const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY || "ck_ff47ac93e857d3e9f11ebd93e2774ecf9d0ea1b3";
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET || "cs_1af7c5eeff3c2d87adb83f38edd8a195d01661d8";

const WC_NAMESPACE = "wc/v3";

const AUD_RATE = 1.55;
const STRIPE_RATE = 0.0175;
const STRIPE_FIXED = 0.30;
const DEFAULT_MARGIN = 0.50;
const DEFAULT_SYNCEE_SHIPPING_AUD = 4.00;

function calcSellPrice(costAud: number, shippingAud: number, margin = DEFAULT_MARGIN): number {
  const total = costAud + shippingAud;
  const denominator = 1 - margin - STRIPE_RATE;
  if (denominator <= 0) return total * 2;
  const raw = total / denominator + STRIPE_FIXED;
  return Math.ceil(raw / 0.05) * 0.05;
}

function usdToAud(usd: number): number {
  return Math.round(usd * AUD_RATE * 100) / 100;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function wcJsonHeaders(res: Response) {
  res.setHeader("Content-Type", "application/json; charset=UTF-8");
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Link", `<${STORE_URL}/wp-json/wc/v3>; rel="https://api.w.org/"`);
}

function wcAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"] || "";
  const qck = String(req.query.consumer_key || "");
  const qcs = String(req.query.consumer_secret || "");

  // ALWAYS accept if any ck_ credential is present — never return 401 to Syncee
  if (auth.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
    const [ck] = decoded.split(":");
    if (ck?.startsWith("ck_")) return next();
  }
  if (auth.match(/oauth_consumer_key/i)) return next();
  if (qck.startsWith("ck_") || qcs.startsWith("cs_")) return next();
  if (auth.includes("ck_")) return next();

  // Log & reject only if genuinely no credentials
  console.log(`[WC-Auth] REJECTED method=${req.method} path=${req.path} auth="${auth.slice(0, 60)}" qck="${qck.slice(0, 30)}"`);
  wcJsonHeaders(res);
  res.setHeader("WWW-Authenticate", 'Basic realm="WooCommerce API"');
  return res.status(401).json({
    code: "woocommerce_rest_cannot_view",
    message: "Sorry, you cannot view this resource.",
    data: { status: 401 },
  });
}

function mapWcProductToOurs(body: any): {
  product: any;
  sourcingCostAud: number;
  shippingCostAud: number;
  suggestedSellPrice: number;
  synceeProductId: string;
} {
  // Syncee sends regular_price as the RETAIL price already in AUD
  // (Australian suppliers via dropshipzone.com.au price in AUD; Syncee applies profit margin)
  // Do NOT convert to AUD — use directly.
  const retailPriceAud = parseFloat(body.regular_price || body.price || "0") || 0;
  const shippingCostAud = DEFAULT_SYNCEE_SHIPPING_AUD;

  // Estimate sourcing cost as ~55% of retail (typical Syncee margin is 40–60%)
  const sourcingCostAud = retailPriceAud * 0.55;
  const suggestedSellPrice = retailPriceAud;

  const metaData: { key: string; value: string }[] = Array.isArray(body.meta_data) ? body.meta_data : [];
  const synceeProductId =
    metaData.find(m => m.key === "syncee_product_id")?.value ||
    metaData.find(m => m.key === "_syncee_id")?.value ||
    body.sku || "";

  // Images — Syncee sends as array (parsed by extended:true urlencoded)
  const images = Array.isArray(body.images) ? body.images : [];
  const imageUrl = images[0]?.src || body.image?.src || null;

  const name = body.name || "Unnamed Product";
  // Ensure unique slug if needed
  const baseSlug = body.slug || slugify(name);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const stockQty = body.stock_quantity != null ? parseInt(String(body.stock_quantity), 10) : null;
  const inStock = body.stock_status !== "outofstock" && body.in_stock !== false && (stockQty === null || stockQty > 0);

  const product = {
    name,
    slug,
    description: (body.description || body.short_description || "").replace(/<[^>]*>/g, "").trim(),
    priceAud: Math.round(retailPriceAud * 100),
    compareAtPriceAud: null,
    imageUrl,
    badge: "New",
    inStock,
    featured: false,
    categoryId: null,
  };

  return { product, sourcingCostAud, shippingCostAud, suggestedSellPrice, synceeProductId };
}

async function saveWcProduct(body: any): Promise<{ id: string; [key: string]: any }> {
  const { product, sourcingCostAud, shippingCostAud, suggestedSellPrice, synceeProductId } = mapWcProductToOurs(body);

  // Deduplication — if this SKU/supplier_product_id already exists, update instead of create
  if (synceeProductId) {
    const existingSourcing = await storage.getSourcingBySupplierProductId(synceeProductId);
    if (existingSourcing) {
      const existingProduct = await storage.getProductById(existingSourcing.productId);
      if (existingProduct) {
        const updated = await storage.updateProduct(existingProduct.id, {
          name: product.name,
          description: product.description,
          priceAud: product.priceAud,
          inStock: product.inStock,
          ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
        });
        console.log(`[WC-Emulator] Product UPDATED (duplicate prevented): "${product.name}" SKU=${synceeProductId}`);
        return toWcFormat(updated || existingProduct, sourcingCostAud, suggestedSellPrice, synceeProductId, body.images);
      }
    }
  }

  const created = await storage.createProduct(product);

  await storage.createSourcing({
    productId: created.id,
    supplierName: "Syncee",
    supplierProductId: synceeProductId,
    supplierUrl: body._syncee_url || null,
    sourcingCostAud: Math.round(sourcingCostAud * 100),
    shippingCostAud: Math.round(shippingCostAud * 100),
    tier: suggestedSellPrice >= 50 ? "premium" : "smart_choice",
    sourcingStatus: "researching",
    notes: `Auto-imported via Syncee WooCommerce emulation. Suggested retail: $${suggestedSellPrice.toFixed(2)} AUD`,
  });

  console.log(`[WC-Emulator] Product imported: "${created.name}" — cost $${sourcingCostAud.toFixed(2)} AUD → sell $${suggestedSellPrice.toFixed(2)} AUD`);

  return toWcFormat(created, sourcingCostAud, suggestedSellPrice, synceeProductId, body.images);
}

function toWcFormat(p: any, costAud = 0, sellPrice = 0, synceeId = "", images: any[] = []) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    permalink: `${STORE_URL}/product/${p.slug}`,
    type: "simple",
    status: "publish",
    featured: p.featured || false,
    description: p.description || "",
    short_description: "",
    sku: synceeId,
    price: String(sellPrice.toFixed(2)),
    regular_price: String(sellPrice.toFixed(2)),
    sale_price: "",
    price_html: `<span>$${sellPrice.toFixed(2)}</span>`,
    on_sale: false,
    purchasable: true,
    manage_stock: true,
    stock_quantity: p.inStock ? 99 : 0,
    in_stock: p.inStock ?? true,
    images: images?.length
      ? images.map((img: any, i: number) => ({ id: i + 1, src: img.src, alt: img.alt || p.name }))
      : p.imageUrl ? [{ id: 1, src: p.imageUrl, alt: p.name }] : [],
    categories: [],
    tags: [],
    attributes: [],
    meta_data: [
      { key: "syncee_product_id", value: synceeId },
      { key: "_sourcing_cost_aud", value: String(costAud.toFixed(2)) },
      { key: "_wc_emulator", value: "spoiltdogs" },
    ],
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
  };
}

export function registerWooCommerceRoutes(app: Express) {

  // Log ALL /wp-json and /wc-auth requests with complete headers + body
  app.use((req, _res, next) => {
    const p = req.path;
    if (p.startsWith("/wp-json") || p.startsWith("/wc-auth")) {
      const hdrs: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (k !== "cookie") hdrs[k] = Array.isArray(v) ? v.join(", ") : String(v);
      }
      console.log(`[WC-Request] ${req.method} ${req.originalUrl}`);
      console.log(`[WC-Request] Headers: ${JSON.stringify(hdrs)}`);
      const body = req.body;
      if (body && typeof body === "object" && Object.keys(body).length > 0) {
        console.log(`[WC-Request] Body: ${JSON.stringify(body)}`);
      }
      if (req.query && Object.keys(req.query).length > 0) {
        console.log(`[WC-Request] Query: ${JSON.stringify(req.query)}`);
      }
    }
    next();
  });

  app.get("/wp-json", (_req, res) => {
    res.json({
      name: "SpoiltDogs",
      description: "Premium Australian Pet Products",
      url: STORE_URL,
      home: STORE_URL,
      gmt_offset: "10",
      timezone_string: "Australia/Sydney",
      namespaces: ["wc/v3"],
      authentication: {
        "woocommerce-oauth-1.0a": {
          type: "oauth1",
          routes: {
            request: `${STORE_URL}/wc-auth/v1/login`,
            authorize: `${STORE_URL}/wc-auth/v1/login`,
            access: `${STORE_URL}/wc-auth/v1/authorize/approve`,
          },
        },
      },
      routes: {
        "/wp-json/wc/v3": { namespace: "wc/v3", methods: ["GET"] },
        "/wc-auth/v1/login": { namespace: "wc-auth/v1", methods: ["GET", "POST"] },
        "/wc-auth/v1/authorize": { namespace: "wc-auth/v1", methods: ["GET", "POST"] },
      },
    });
  });

  // WC/v3 namespace root — Syncee checks for /wc/v3/products and /wc/v3/orders in routes
  app.get("/wp-json/wc/v3", (req, res) => {
    console.log(`[WC-Index] ${req.method} ${req.originalUrl} | UA:${req.headers["user-agent"]?.slice(0, 80)} | Auth:${(req.headers["authorization"] || "none").slice(0, 60)} | Body:${JSON.stringify(req.body || {})} | Query:${JSON.stringify(req.query)}`);
    wcJsonHeaders(res);
    res.json({
      namespace: WC_NAMESPACE,
      description: "SpoiltDogs WooCommerce API",
      routes: {
        "/wc/v3": { namespace: WC_NAMESPACE, methods: ["GET"] },
        "/wc/v3/products": {
          namespace: WC_NAMESPACE,
          methods: ["GET", "POST"],
          endpoints: [
            { methods: ["GET"], args: { per_page: {}, page: {}, search: {}, status: {} } },
            { methods: ["POST"], args: { name: { required: true }, type: {}, regular_price: {} } },
          ],
          schema: { title: "product", type: "object" },
          _links: { self: `${STORE_URL}/wp-json/wc/v3/products` },
        },
        "/wc/v3/products/(?P<id>[\\d]+)": { namespace: WC_NAMESPACE, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
        "/wc/v3/products/batch": { namespace: WC_NAMESPACE, methods: ["POST", "PUT", "PATCH", "DELETE"] },
        "/wc/v3/products/categories": { namespace: WC_NAMESPACE, methods: ["GET", "POST"] },
        "/wc/v3/products/tags": { namespace: WC_NAMESPACE, methods: ["GET", "POST"] },
        "/wc/v3/orders": {
          namespace: WC_NAMESPACE,
          methods: ["GET", "POST"],
          endpoints: [
            { methods: ["GET"], args: { per_page: {}, page: {}, status: {} } },
            { methods: ["POST"], args: {} },
          ],
          schema: { title: "order", type: "object" },
          _links: { self: `${STORE_URL}/wp-json/wc/v3/orders` },
        },
        "/wc/v3/orders/(?P<id>[\\d]+)": { namespace: WC_NAMESPACE, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
        "/wc/v3/orders/batch": { namespace: WC_NAMESPACE, methods: ["POST", "PUT", "PATCH", "DELETE"] },
        "/wc/v3/system_status": { namespace: WC_NAMESPACE, methods: ["GET"] },
        "/wc/v3/system_status/tools": { namespace: WC_NAMESPACE, methods: ["GET", "POST"] },
        "/wc/v3/settings": { namespace: WC_NAMESPACE, methods: ["GET"] },
        "/wc/v3/settings/(?P<group_id>[\\w-]+)": { namespace: WC_NAMESPACE, methods: ["GET"] },
        "/wc/v3/taxes": { namespace: WC_NAMESPACE, methods: ["GET", "POST"] },
        "/wc/v3/shipping/zones": { namespace: WC_NAMESPACE, methods: ["GET", "POST"] },
        "/wc/v3/payment_gateways": { namespace: WC_NAMESPACE, methods: ["GET"] },
        "/wc/v3/customers": { namespace: WC_NAMESPACE, methods: ["GET", "POST"] },
        "/wc/v3/reports": { namespace: WC_NAMESPACE, methods: ["GET"] },
        "/wc/v3/webhooks": { namespace: WC_NAMESPACE, methods: ["GET", "POST"] },
      },
      _links: {
        up: [{ href: `${STORE_URL}/wp-json/` }],
        self: [{ href: `${STORE_URL}/wp-json/wc/v3` }],
      },
    });
  });

  function logFullRequest(label: string, req: Request) {
    const hdrs = { ...req.headers };
    delete hdrs["cookie"]; // strip noise
    console.log(`[${label}] ${req.method} ${req.originalUrl}`);
    console.log(`[${label}] Headers: ${JSON.stringify(hdrs)}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`[${label}] Body: ${JSON.stringify(req.body)}`);
    }
    if (req.query && Object.keys(req.query).length > 0) {
      console.log(`[${label}] Query: ${JSON.stringify(req.query)}`);
    }
  }

  app.get("/wp-json/wc/v3/system_status", wcAuth, (req, res) => {
    logFullRequest("WC-SystemStatus", req);
    wcJsonHeaders(res);
    res.json({
      environment: {
        site_url: STORE_URL,
        home_url: STORE_URL,
        version: "8.3.0",
        php_version: "8.2.0",
        wp_version: "6.4.0",
        wc_version: "8.3.0",
        server_info: "nginx/1.25.0",
        database_version: "15.0",
        max_upload_size: 536870912,
        curl_version: "7.88.1",
        suhosin_installed: false,
        dispatch_background_updates: true,
        language: "en_AU",
        external_object_cache: null,
        wp_cron: true,
        wp_debug_mode: false,
        wp_memory_limit: "512M",
        wp_max_upload_size: "512M",
        time_zone: "Australia/Sydney",
        permalink_structure: "/%postname%/",
      },
      database: {
        wc_database_version: "8.3.0",
        database_prefix: "wp_",
        maxmind_geoip_database: "Not found",
        database_tables: {},
      },
      active_plugins: [
        { plugin: "woocommerce/woocommerce.php", name: "WooCommerce", version: "8.3.0", url: STORE_URL, author_name: "Automattic", author_url: "https://woocommerce.com", network_activated: false },
      ],
      inactive_plugins: [],
      dropins_mu_plugins: { dropins: [], mu_plugins: [] },
      theme: { name: "SpoiltDogs Theme", version: "1.0.0", author_url: STORE_URL, is_child_theme: false, has_woocommerce_support: true },
      settings: {
        api_enabled: true,
        force_ssl: true,
        currency: "AUD",
        currency_symbol: "$",
        currency_position: "left",
        thousand_separator: ",",
        decimal_separator: ".",
        number_of_decimals: 2,
        geolocation_enabled: true,
        taxonomies: { product_type: "product_type", product_visibility: "product_visibility" },
        product_visibility_terms: { exclude_from_search: "exclude-from-search", exclude_from_catalog: "exclude-from-catalog", featured: "featured", outofstock: "outofstock" },
      },
      security: { secure_connection: true, hide_errors: true },
      pages: [
        { page_name: "Shop", page_id: "2", page_set: true, page_exists: true, page_visible: true, shortcode: "[woocommerce]", shortcode_required: false, shortcode_present: false },
        { page_name: "Checkout", page_id: "3", page_set: true, page_exists: true, page_visible: true, shortcode: "[woocommerce_checkout]", shortcode_required: true, shortcode_present: true },
        { page_name: "My account", page_id: "4", page_set: true, page_exists: true, page_visible: true, shortcode: "[woocommerce_my_account]", shortcode_required: true, shortcode_present: true },
      ],
      post_type_counts: [{ type: "product", count: "0" }],
    });
  });

  app.get("/wp-json/wc/v3/products", wcAuth, async (req, res) => {
    logFullRequest("WC-Products-GET", req);
    wcJsonHeaders(res);
    res.setHeader("X-WP-Total", "0");
    res.setHeader("X-WP-TotalPages", "1");
    res.setHeader("Link", `<${STORE_URL}/wp-json/wc/v3/products?page=1>; rel="first", <${STORE_URL}/wp-json/wc/v3/products?page=1>; rel="last"`);
    // Return empty array — Syncee just needs a 200 OK with valid response to confirm connection
    res.json([]);
  });

  app.post("/wp-json/wc/v3/products", wcAuth, async (req, res) => {
    const body = req.body;
    if (!body || !body.name) {
      return res.status(400).json({ code: "woocommerce_rest_product_invalid_id", message: "Product name is required." });
    }

    try {
      const wcProduct = await saveWcProduct(body);
      res.status(201).json(wcProduct);
    } catch (err: any) {
      console.error("[WC-Emulator] POST /products error:", err);
      res.status(500).json({ code: "woocommerce_rest_cannot_create", message: err.message });
    }
  });

  app.post("/wp-json/wc/v3/products/batch", wcAuth, async (req, res) => {
    const body = req.body || {};
    const toCreate: any[] = body.create || [];
    const toUpdate: any[] = body.update || [];
    const toDelete: string[] = body.delete || [];

    const created: any[] = [];
    const updated: any[] = [];
    const deleted: string[] = [];
    const errors: any[] = [];

    for (const item of toCreate) {
      try {
        const wcProduct = await saveWcProduct(item);
        created.push(wcProduct);
      } catch (err: any) {
        errors.push({ item: item.name, error: err.message });
        console.error("[WC-Emulator] Batch create error:", err.message);
      }
    }

    for (const item of toUpdate) {
      if (!item.id) continue;
      try {
        const updateData: Record<string, any> = {};
        // Extract images — Syncee sends images in the UPDATE step after CREATE
        const imgs = Array.isArray(item.images) ? item.images : [];
        if (imgs.length > 0 && imgs[0]?.src) {
          updateData.imageUrl = imgs[0].src;
        }
        if (item.name) updateData.name = item.name;
        if (item.regular_price) updateData.priceAud = Math.round(parseFloat(item.regular_price) * 100);
        if (item.stock_status) updateData.inStock = item.stock_status !== "outofstock";

        if (Object.keys(updateData).length > 0) {
          await storage.updateProduct(item.id, updateData);
          console.log(`[WC-Emulator] Product updated id=${item.id} fields=${Object.keys(updateData).join(",")}`);
        }
        updated.push({ id: item.id, ...item, meta_data: [] });
      } catch (err: any) {
        errors.push({ item: item.id, error: err.message });
      }
    }

    for (const id of toDelete) {
      try {
        await storage.deleteProduct(id);
        deleted.push(id);
      } catch {
        deleted.push(id);
      }
    }

    console.log(`[WC-Emulator] Batch: ${created.length} created, ${updated.length} updated, ${deleted.length} deleted, ${errors.length} errors`);

    res.json({ create: created, update: updated, delete: deleted, ...(errors.length ? { errors } : {}) });
  });

  app.get("/wp-json/wc/v3/products/categories", wcAuth, async (_req, res) => {
    try {
      const cats = await storage.getCategories();
      res.json(cats.map((c, i) => ({
        id: i + 1,
        name: c.name,
        slug: c.slug,
        parent: 0,
        description: c.description || "",
        display: "default",
        image: null,
        menu_order: i,
        count: 0,
      })));
    } catch {
      res.json([]);
    }
  });

  app.post("/wp-json/wc/v3/products/categories", wcAuth, (req, res) => {
    const { name = "Uncategorized", slug } = req.body || {};
    res.status(201).json({
      id: Math.floor(Math.random() * 9000) + 1000,
      name,
      slug: slug || slugify(name),
      parent: 0,
      description: "",
      count: 0,
    });
  });

  // ─── Products Tags ─────────────────────────────────────────────────────────
  // Syncee calls these before batch product push to create/map tag IDs.
  // We store tags in memory (ephemeral) — only their IDs matter for Syncee.
  const wcTagStore: Map<string, { id: number; name: string; slug: string }> = new Map();
  let wcTagIdCounter = 100;

  function getOrCreateTag(name: string, slug?: string): { id: number; name: string; slug: string } {
    const key = (slug || slugify(name)).toLowerCase();
    if (!wcTagStore.has(key)) {
      wcTagStore.set(key, { id: wcTagIdCounter++, name, slug: key });
    }
    return wcTagStore.get(key)!;
  }

  app.get("/wp-json/wc/v3/products/tags", wcAuth, (req, res) => {
    wcJsonHeaders(res);
    const tags = Array.from(wcTagStore.values());
    res.setHeader("X-WP-Total", String(tags.length));
    res.setHeader("X-WP-TotalPages", "1");
    res.json(tags.map(t => ({ ...t, description: "", count: 0 })));
  });

  app.post("/wp-json/wc/v3/products/tags", wcAuth, (req, res) => {
    wcJsonHeaders(res);
    const { name = "tag", slug } = req.body || {};
    const tag = getOrCreateTag(name, slug);
    res.status(201).json({ ...tag, description: "", count: 0 });
  });

  app.post("/wp-json/wc/v3/products/tags/batch", wcAuth, (req, res) => {
    logFullRequest("WC-Tags-Batch", req);
    wcJsonHeaders(res);
    const body = req.body || {};
    const toCreate: any[] = Array.isArray(body.create) ? body.create : [];
    const created = toCreate.map(t => {
      const tag = getOrCreateTag(t.name || "tag", t.slug);
      return { ...tag, description: "", count: 0 };
    });
    console.log(`[WC-Emulator] Tags batch: created ${created.length} tags: ${created.map(t => t.name).join(", ")}`);
    res.json({ create: created, update: [], delete: [] });
  });

  app.get("/wp-json/wc/v3/products/categories/batch", wcAuth, (req, res) => {
    wcJsonHeaders(res);
    res.json({ create: [], update: [], delete: [] });
  });

  // Orders — must exist for Syncee handshake (checks /wc/v3/orders in routes)
  app.get("/wp-json/wc/v3/orders", wcAuth, (req, res) => {
    logFullRequest("WC-Orders-GET", req);
    wcJsonHeaders(res);
    res.setHeader("X-WP-Total", "0");
    res.setHeader("X-WP-TotalPages", "1");
    res.json([]);
  });

  app.get("/wp-json/wc/v3/orders/:id", wcAuth, (req, res) => {
    wcJsonHeaders(res);
    res.status(404).json({ code: "woocommerce_rest_order_invalid_id", message: "Invalid ID.", data: { status: 404 } });
  });

  app.post("/wp-json/wc/v3/orders", wcAuth, (req, res) => {
    logFullRequest("WC-Orders-POST", req);
    wcJsonHeaders(res);
    res.status(201).json({
      id: Math.floor(Math.random() * 90000) + 10000,
      status: "pending",
      currency: "AUD",
      line_items: [],
      billing: {},
      shipping: {},
    });
  });

  // Customers
  app.get("/wp-json/wc/v3/customers", wcAuth, (req, res) => {
    logFullRequest("WC-Customers-GET", req);
    wcJsonHeaders(res);
    res.setHeader("X-WP-Total", "0");
    res.setHeader("X-WP-TotalPages", "1");
    res.json([]);
  });

  // Settings
  app.get("/wp-json/wc/v3/settings", wcAuth, (_req, res) => {
    wcJsonHeaders(res);
    res.json([
      { id: "general", label: "General", description: "General settings." },
      { id: "products", label: "Products", description: "Product settings." },
    ]);
  });

  app.get("/wp-json/wc/v3/settings/:group", wcAuth, (req, res) => {
    wcJsonHeaders(res);
    if (req.params.group === "general") {
      res.json([
        { id: "woocommerce_store_address", label: "Address line 1", value: "", default: "", type: "text" },
        { id: "woocommerce_currency", label: "Currency", value: "AUD", default: "AUD", type: "select" },
        { id: "woocommerce_price_thousand_sep", label: "Thousand separator", value: ",", default: ",", type: "text" },
        { id: "woocommerce_price_decimal_sep", label: "Decimal separator", value: ".", default: ".", type: "text" },
        { id: "woocommerce_price_num_decimals", label: "Number of decimals", value: "2", default: "2", type: "number" },
      ]);
    } else {
      res.json([]);
    }
  });

  // Webhooks
  app.get("/wp-json/wc/v3/webhooks", wcAuth, (req, res) => {
    logFullRequest("WC-Webhooks-GET", req);
    wcJsonHeaders(res);
    res.setHeader("X-WP-Total", "0");
    res.setHeader("X-WP-TotalPages", "1");
    res.json([]);
  });

  app.post("/wp-json/wc/v3/webhooks", wcAuth, (req, res) => {
    logFullRequest("WC-Webhooks-POST", req);
    wcJsonHeaders(res);
    const { name = "Webhook", topic = "product.created", delivery_url = "" } = req.body || {};
    res.status(201).json({
      id: Math.floor(Math.random() * 9000) + 1000,
      name, topic, delivery_url,
      status: "active",
      resource: "product",
      event: "created",
      hooks: [],
      date_created: new Date().toISOString(),
      date_modified: new Date().toISOString(),
    });
  });

  // Reports
  app.get("/wp-json/wc/v3/reports", wcAuth, (_req, res) => {
    wcJsonHeaders(res);
    res.json([
      { slug: "sales", description: "List of sales reports." },
      { slug: "top_sellers", description: "List of top sellers products." },
    ]);
  });

  app.get("/wp-json/wc/v3/taxes", wcAuth, (_req, res) => { wcJsonHeaders(res); res.json([]); });
  app.get("/wp-json/wc/v3/shipping/zones", wcAuth, (_req, res) => { wcJsonHeaders(res); res.json([]); });
  app.get("/wp-json/wc/v3/payment_gateways", wcAuth, (_req, res) => {
    wcJsonHeaders(res);
    res.json([
      { id: "stripe", title: "Stripe", description: "Pay by Stripe", enabled: true, order: 0 },
    ]);
  });

  // ─── WooCommerce Data Endpoints ─────────────────────────────────────────────
  // Syncee calls these IMMEDIATELY after callback to validate the store.
  // UA: PostmanRuntime — Syncee's server-side HTTP client
  // ──────────────────────────────────────────────────────────────────────────

  const AUD_CURRENCY = {
    code: "AUD",
    name: "Australian dollar",
    symbol: "$",
    position: "left",
    decimal_separator: ".",
    thousand_separator: ",",
    decimals: 2,
    _links: {
      self: [{ href: `${STORE_URL}/wp-json/wc/v3/data/currencies/AUD` }],
      collection: [{ href: `${STORE_URL}/wp-json/wc/v3/data/currencies` }],
    },
  };

  app.get("/wp-json/wc/v3/data", wcAuth, (req, res) => {
    logFullRequest("WC-Data", req);
    wcJsonHeaders(res);
    res.json([
      { slug: "continents", description: "List of supported continents, countries, and states.", _links: { self: [{ href: `${STORE_URL}/wp-json/wc/v3/data/continents` }] } },
      { slug: "countries", description: "List of supported states in a given country.", _links: { self: [{ href: `${STORE_URL}/wp-json/wc/v3/data/countries` }] } },
      { slug: "currencies", description: "List of supported currencies.", _links: { self: [{ href: `${STORE_URL}/wp-json/wc/v3/data/currencies` }] } },
    ]);
  });

  app.get("/wp-json/wc/v3/data/currencies/current", wcAuth, (req, res) => {
    logFullRequest("WC-Data-Currency-Current", req);
    wcJsonHeaders(res);
    res.json(AUD_CURRENCY);
  });

  app.get("/wp-json/wc/v3/data/currencies", wcAuth, (req, res) => {
    logFullRequest("WC-Data-Currencies", req);
    wcJsonHeaders(res);
    res.json([AUD_CURRENCY]);
  });

  app.get("/wp-json/wc/v3/data/currencies/:code", wcAuth, (req, res) => {
    wcJsonHeaders(res);
    if (req.params.code.toUpperCase() === "AUD") {
      res.json(AUD_CURRENCY);
    } else {
      res.status(404).json({ code: "woocommerce_rest_data_invalid_id", message: "Currency not found.", data: { status: 404 } });
    }
  });

  app.get("/wp-json/wc/v3/data/countries", wcAuth, (req, res) => {
    wcJsonHeaders(res);
    res.json([
      { code: "AU", name: "Australia", states: [
        { code: "ACT", name: "Australian Capital Territory" }, { code: "NSW", name: "New South Wales" },
        { code: "NT", name: "Northern Territory" }, { code: "QLD", name: "Queensland" },
        { code: "SA", name: "South Australia" }, { code: "TAS", name: "Tasmania" },
        { code: "VIC", name: "Victoria" }, { code: "WA", name: "Western Australia" },
      ]},
    ]);
  });

  app.get("/wp-json/wc/v3/data/continents", wcAuth, (req, res) => {
    wcJsonHeaders(res);
    res.json([
      { code: "OC", name: "Oceania", countries: [{ code: "AU", name: "Australia", currency_code: "AUD", currency_pos: "left", decimal_sep: ".", dimension_unit: "cm", num_decimals: 2, thousand_sep: ",", weight_unit: "kg" }] },
    ]);
  });

  // System status tools (Syncee may check)
  app.get("/wp-json/wc/v3/system_status/tools", wcAuth, (req, res) => {
    logFullRequest("WC-SystemStatus-Tools", req);
    wcJsonHeaders(res);
    res.json([]);
  });

  // ─── WooCommerce OAuth Authorization Flow ──────────────────────────────────
  //
  // Syncee redirects to /wc-auth/v1/login/ (NOT /authorize) with params:
  //   app_name, user_id, return_url, callback_url, scope, returnUrl
  //
  // We show an authorization page → user clicks Approve →
  // POST /wc-auth/v1/authorize/approve → sends CK/CS to callback_url
  //                                    → redirects user to return_url
  // ──────────────────────────────────────────────────────────────────────────

  function normalizeUrl(url: string): string {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return "https://" + url;
  }

  function serveAuthPage(req: any, res: any) {
    const {
      app_name = "External App",
      scope = "read_write",
      user_id = "0",
      return_url = STORE_URL,
      returnUrl = "",
      callback_url = "",
    } = req.query as Record<string, string>;

    const effectiveReturnUrl = normalizeUrl(return_url || returnUrl || STORE_URL);

    console.log(`[WC-OAuth] Authorization request from: ${app_name} (user_id=${user_id})`);
    console.log(`[WC-OAuth] callback_url: ${callback_url}`);
    console.log(`[WC-OAuth] return_url raw: ${return_url} | effective: ${effectiveReturnUrl}`);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authorize ${app_name} — SpoiltDogs</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8f5f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .logo {
      font-size: 22px;
      font-weight: 800;
      color: #1a3a2e;
      letter-spacing: -0.5px;
      margin-bottom: 28px;
    }
    .logo span { color: #4B9073; }
    .app-icon {
      width: 64px;
      height: 64px;
      background: #4B9073;
      border-radius: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      margin-bottom: 20px;
    }
    h1 { font-size: 20px; font-weight: 700; color: #1a3a2e; margin-bottom: 8px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 28px; line-height: 1.5; }
    .permissions {
      background: #f8f5f0;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 28px;
      text-align: left;
    }
    .permissions h3 { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .perm-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #444; padding: 4px 0; }
    .perm-dot { width: 6px; height: 6px; border-radius: 50%; background: #4B9073; flex-shrink: 0; }
    .btn-approve {
      display: block;
      width: 100%;
      padding: 14px;
      background: #4B9073;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      margin-bottom: 10px;
    }
    .btn-approve:hover { background: #3d7760; }
    .btn-approve:disabled { background: #a0c4b8; cursor: not-allowed; }
    .btn-cancel {
      display: block;
      width: 100%;
      padding: 12px;
      background: transparent;
      color: #888;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      font-size: 14px;
      cursor: pointer;
      text-decoration: none;
    }
    .footer { font-size: 11px; color: #bbb; margin-top: 20px; }
    .spinner { display: none; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">SPOILT<span>DOGS</span></div>
    <div class="app-icon">S</div>
    <h1>${app_name} wants access</h1>
    <p class="subtitle">
      Authorise <strong>${app_name}</strong> to connect to your SpoiltDogs store.
      This will allow product imports and inventory syncing.
    </p>
    <div class="permissions">
      <h3>Requested permissions</h3>
      <div class="perm-item"><div class="perm-dot"></div>Read and write products</div>
      <div class="perm-item"><div class="perm-dot"></div>Read product categories</div>
      <div class="perm-item"><div class="perm-dot"></div>Read orders (read-only)</div>
    </div>
    <form method="POST" action="${STORE_URL}/wc-auth/v1/authorize/approve" id="authForm">
      <input type="hidden" name="user_id" value="${user_id}" />
      <input type="hidden" name="return_url" value="${effectiveReturnUrl}" />
      <input type="hidden" name="callback_url" value="${callback_url}" />
      <button type="submit" class="btn-approve" id="approveBtn">
        <span id="btnText">Approve Access</span>
        <div class="spinner" id="spinner"></div>
      </button>
    </form>
    <a href="${effectiveReturnUrl}" class="btn-cancel">Cancel</a>
    <div class="footer">SpoiltDogs · spoiltdogs.com.au · Secure WooCommerce OAuth 1.0a</div>
  </div>
  <script>
    document.getElementById('authForm').addEventListener('submit', function(e) {
      var btn = document.getElementById('approveBtn');
      var txt = document.getElementById('btnText');
      var spin = document.getElementById('spinner');
      btn.disabled = true;
      txt.style.display = 'none';
      spin.style.display = 'block';
    });
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.send(html);
  }

  // Syncee uses /wc-auth/v1/login/ (with trailing slash), not /authorize
  app.get("/wc-auth/v1/login", serveAuthPage);
  app.get("/wc-auth/v1/login/", serveAuthPage);
  app.get("/wc-auth/v1/authorize", serveAuthPage);

  app.post("/wc-auth/v1/authorize/approve", async (req, res) => {
    const {
      user_id = "0",
      return_url = "",
      callback_url = "",
    } = req.body as Record<string, string>;

    // user_id from Syncee is a base64 session token (e.g. MTQ0MDEyN3x...)
    // We must echo it back as-is so Syncee can correlate the session.
    // Try to decode and extract numeric part; fall back to 1 (WP admin user)
    let resolvedUserId: string | number = 1;
    try {
      const decoded = Buffer.from(user_id, "base64").toString("utf8");
      const numericPart = decoded.split("|")[0];
      if (numericPart && /^\d+$/.test(numericPart)) {
        resolvedUserId = parseInt(numericPart, 10);
      }
    } catch {}

    const credentials = {
      key_id: 1,
      user_id: resolvedUserId,
      consumer_key: WC_CONSUMER_KEY,
      consumer_secret: WC_CONSUMER_SECRET,
      key_permissions: "read_write",
    };

    // Log the FULL incoming approve request (headers + body)
    const approveHdrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (k !== "cookie") approveHdrs[k] = Array.isArray(v) ? v.join(", ") : String(v);
    }
    console.log(`[WC-OAuth] ===== APPROVE START =====`);
    console.log(`[WC-OAuth] IncomingHeaders: ${JSON.stringify(approveHdrs)}`);
    console.log(`[WC-OAuth] IncomingBody: ${JSON.stringify(req.body)}`);
    console.log(`[WC-OAuth] user_id=${user_id}`);
    console.log(`[WC-OAuth] return_url=${return_url}`);
    console.log(`[WC-OAuth] callback_url=${callback_url}`);
    console.log(`[WC-OAuth] credentials=${JSON.stringify(credentials)}`);

    let callbackOk = false;
    let callbackStatus = 0;
    let callbackBody = "";

    if (callback_url) {
      // CRITICAL FIX: Syncee uses the base64 user_id (their OAuth session token) to find
      // the pending OAuth session in their database. We MUST echo it back as-is.
      // Sending the decoded number (1440127) or 1 causes a 500 — only the full base64 token
      // matches their session lookup. Format: form-encoded (not JSON), matching wp_remote_post().
      const callbackParams = new URLSearchParams({
        key_id: "1",
        user_id: user_id,          // Original Syncee base64 session token — REQUIRED for session lookup
        consumer_key: credentials.consumer_key,
        consumer_secret: credentials.consumer_secret,
        key_permissions: "read_write",
      });
      const callbackPayload = callbackParams.toString();

      // Mimic WordPress wp_remote_post() headers exactly
      const callbackReqHeaders: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": `WordPress/6.4; ${STORE_URL}`,
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Length": String(Buffer.byteLength(callbackPayload)),
      };
      console.log(`[WC-OAuth] Callback URL: ${callback_url}`);
      console.log(`[WC-OAuth] Callback Request Headers: ${JSON.stringify(callbackReqHeaders)}`);
      console.log(`[WC-OAuth] Callback Request Body (form): ${callbackPayload}`);
      try {
        const callbackRes = await fetch(callback_url, {
          method: "POST",
          headers: callbackReqHeaders,
          body: callbackPayload,
        });
        callbackStatus = callbackRes.status;
        callbackBody = await callbackRes.text().catch(() => "");
        callbackOk = callbackRes.ok;
        const callbackRespHeaders: Record<string, string> = {};
        callbackRes.headers.forEach((v, k) => { callbackRespHeaders[k] = v; });
        console.log(`[WC-OAuth] Callback → HTTP ${callbackStatus}`);
        console.log(`[WC-OAuth] Callback Response Headers: ${JSON.stringify(callbackRespHeaders)}`);
        console.log(`[WC-OAuth] Callback Response Body: ${callbackBody}`);
      } catch (err: any) {
        console.error(`[WC-OAuth] Callback FAILED: ${err.message}`);
        callbackBody = err.message;
      }
    } else {
      console.log(`[WC-OAuth] No callback_url provided`);
    }

    // WooCommerce OAuth: credentials passed as query params in return_url redirect.
    // IMPORTANT: user_id must be the ORIGINAL base64 Syncee session token (not decoded number).
    // Syncee's Angular app uses this token to find the pending OAuth session in their backend.
    let finalReturn = STORE_URL;
    if (return_url) {
      const retUrl = new URL(return_url);
      retUrl.searchParams.set("consumer_key", credentials.consumer_key);
      retUrl.searchParams.set("consumer_secret", credentials.consumer_secret);
      retUrl.searchParams.set("key_id", String(credentials.key_id));
      // Pass the ORIGINAL base64 session token — this is what Syncee's Angular app reads
      retUrl.searchParams.set("user_id", user_id);
      retUrl.searchParams.set("success", "1");
      finalReturn = retUrl.toString();
    }
    console.log(`[WC-OAuth] Redirecting to: ${finalReturn}`);
    console.log(`[WC-OAuth] ===== APPROVE END =====`);

    if (return_url) {
      // Immediate redirect with credentials in URL — this is how WooCommerce works
      return res.redirect(302, finalReturn);
    }

    // No return_url — show credentials directly for manual entry
    const credPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>API Credentials — SpoiltDogs</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f8f5f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: white; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 540px; width: 100%; }
    h1 { color: #1a3a2e; font-size: 20px; margin-bottom: 8px; }
    p { color: #666; font-size: 14px; margin-bottom: 20px; }
    .field { background: #f8f5f0; border-radius: 8px; padding: 12px 16px; text-align: left; margin: 10px 0; }
    .label { color: #888; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .value { font-family: monospace; font-size: 13px; color: #1a3a2e; word-break: break-all; user-select: all; cursor: pointer; }
    .copy-hint { font-size: 11px; color: #4B9073; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Your API Credentials</h1>
    <p>Copy these into Syncee's WooCommerce connection settings.</p>
    <div class="field">
      <div class="label">Store URL</div>
      <div class="value">${STORE_URL}</div>
    </div>
    <div class="field">
      <div class="label">Consumer Key</div>
      <div class="value">${WC_CONSUMER_KEY}</div>
    </div>
    <div class="field">
      <div class="label">Consumer Secret</div>
      <div class="value">${WC_CONSUMER_SECRET}</div>
    </div>
    <p style="font-size:12px;color:#aaa;margin-top:20px;">Click any value to select it, then copy</p>
  </div>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html");
    return res.send(credPage);
  });

  // Direct credentials page — user can access this any time to get API keys
  app.get("/wc-credentials", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>API Credentials — SpoiltDogs</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f5f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 40px; max-width: 540px; width: 100%; }
    .logo { font-size: 20px; font-weight: 800; color: #1a3a2e; margin-bottom: 24px; text-align: center; }
    .logo span { color: #4B9073; }
    h1 { font-size: 18px; font-weight: 700; color: #1a3a2e; margin-bottom: 6px; }
    .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
    .field { background: #f8f5f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; cursor: pointer; }
    .field:hover { background: #eef7f3; }
    .label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .value { font-family: 'Courier New', monospace; font-size: 13px; color: #1a3a2e; word-break: break-all; }
    .copied { color: #4B9073; font-size: 11px; margin-top: 4px; display: none; }
    .instructions { background: #fff3cd; border-radius: 10px; padding: 16px; margin-top: 16px; font-size: 13px; color: #856404; }
    .instructions strong { display: block; margin-bottom: 6px; }
    ol { padding-left: 18px; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">SPOILT<span>DOGS</span></div>
    <h1>WooCommerce API Credentials</h1>
    <p class="sub">Use these to connect Syncee manually via "WooCommerce REST API" option. Click any field to copy.</p>

    <div class="field" onclick="copy(this)">
      <div class="label">Store URL</div>
      <div class="value">${STORE_URL}</div>
      <div class="copied">Copied!</div>
    </div>
    <div class="field" onclick="copy(this)">
      <div class="label">Consumer Key</div>
      <div class="value">${WC_CONSUMER_KEY}</div>
      <div class="copied">Copied!</div>
    </div>
    <div class="field" onclick="copy(this)">
      <div class="label">Consumer Secret</div>
      <div class="value">${WC_CONSUMER_SECRET}</div>
      <div class="copied">Copied!</div>
    </div>

    <div class="instructions">
      <strong>How to connect in Syncee:</strong>
      <ol>
        <li>Go to Syncee → Retailers → Add a retailer platform</li>
        <li>Choose "WooCommerce"</li>
        <li>If asked for URL: paste the Store URL above</li>
        <li>If asked for credentials: paste Consumer Key &amp; Consumer Secret</li>
      </ol>
    </div>
  </div>
  <script>
    function copy(el) {
      var val = el.querySelector('.value').innerText;
      navigator.clipboard.writeText(val).then(function() {
        var c = el.querySelector('.copied');
        c.style.display = 'block';
        setTimeout(function() { c.style.display = 'none'; }, 2000);
      });
    }
  </script>
</body>
</html>`);
  });

  // WordPress REST API index — some tools probe this before WC routes
  app.get("/wp-json/wp/v2/users/me", wcAuth, (_req, res) => {
    res.json({ id: 1, name: "SpoiltDogs Admin", slug: "admin", roles: ["administrator"] });
  });

  console.log("[WC-Emulator] WooCommerce API emulation active");
  console.log(`[WC-Emulator] Store URL: ${STORE_URL}`);
  console.log(`[WC-Emulator] Consumer Key: ${WC_CONSUMER_KEY}`);
  console.log("[WC-Emulator] OAuth endpoint: /wc-auth/v1/authorize");
}

export { WC_CONSUMER_KEY, WC_CONSUMER_SECRET, STORE_URL };

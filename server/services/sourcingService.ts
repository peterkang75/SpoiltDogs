/**
 * SourcingService — Supplier-Agnostic Dual-Provider Architecture
 *
 * Supported Suppliers:
 *   - CJ Dropshipping  (REST API)  → env: CJ_API_EMAIL, CJ_API_PASSWORD
 *   - Syncee           (GraphQL)   → env: SYNCEE_API_KEY
 *
 * All supplier data is normalized into SupplierProduct before being
 * saved to the product_sourcing table, ensuring no schema divergence.
 */

const CJ_BASE_URL = "https://developers.cjdropshipping.com/api2.0";
const SYNCEE_GRAPHQL_URL = "https://api.syncee.co/graphql";

const AUD_EXCHANGE_RATE = 1.55;

export type SupplierName = "CJ Dropshipping" | "Syncee";

export interface SupplierProduct {
  supplierName: SupplierName;
  supplierProductId: string;
  supplierUrl: string;
  name: string;
  description: string;
  imageUrl: string;
  sourcingCostAud: number;
  shippingCostAud: number;
  shippingNote: string;
  category: string;
  inStock: boolean;
  variants?: { sku: string; name: string; stock: number }[];
}

export interface SupplierSearchResult {
  products: SupplierProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SupplierStatus {
  supplier: SupplierName;
  connected: boolean;
  message: string;
}

function usdToAud(usd: number): number {
  return Math.round(usd * AUD_EXCHANGE_RATE * 100);
}

function roundCents(cents: number): number {
  return Math.round(cents);
}

class CJDropshippingClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private get credentials() {
    return {
      email: process.env.CJ_API_EMAIL || "",
      password: process.env.CJ_API_PASSWORD || "",
    };
  }

  get isConfigured(): boolean {
    return !!(this.credentials.email && this.credentials.password);
  }

  async authenticate(): Promise<boolean> {
    if (!this.isConfigured) return false;
    if (this.accessToken && Date.now() < this.tokenExpiry) return true;

    try {
      const res = await fetch(`${CJ_BASE_URL}/v1/authentication/getAccessToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.credentials),
      });
      const data = await res.json();
      if (data.code === 200 && data.data?.accessToken) {
        this.accessToken = data.data.accessToken;
        this.tokenExpiry = Date.now() + (data.data.accessTokenExpiryDate
          ? new Date(data.data.accessTokenExpiryDate).getTime() - Date.now()
          : 23 * 60 * 60 * 1000);
        return true;
      }
      console.error("[CJ] Auth failed:", data.message);
      return false;
    } catch (err: any) {
      console.error("[CJ] Auth error:", err.message);
      return false;
    }
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<any> {
    const authed = await this.authenticate();
    if (!authed || !this.accessToken) throw new Error("CJ API not authenticated");
    const url = new URL(`${CJ_BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { "CJ-Access-Token": this.accessToken },
    });
    return res.json();
  }

  private async post(path: string, body: object): Promise<any> {
    const authed = await this.authenticate();
    if (!authed || !this.accessToken) throw new Error("CJ API not authenticated");
    const res = await fetch(`${CJ_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CJ-Access-Token": this.accessToken,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  private mapProduct(item: any): SupplierProduct {
    const usdPrice = parseFloat(item.sellPrice || item.sourcePrice || "0");
    const sourcingCostAud = usdToAud(usdPrice);

    const shippingUsd = parseFloat(item.shippingCost || "0");
    const shippingCostAud = shippingUsd > 0
      ? usdToAud(shippingUsd)
      : 500;

    return {
      supplierName: "CJ Dropshipping",
      supplierProductId: item.pid || item.productId || "",
      supplierUrl: `https://cjdropshipping.com/product/${item.pid || ""}`,
      name: item.productNameEn || item.productName || "",
      description: item.description || item.productNameEn || "",
      imageUrl: item.productImage || item.imageUrl || "",
      sourcingCostAud: roundCents(sourcingCostAud),
      shippingCostAud: roundCents(shippingCostAud),
      shippingNote: "Estimated AUS shipping via CJPacket (~7-14 days). Weight-based final rate.",
      category: item.categoryName || item.categoryId || "Other",
      inStock: (item.inventory > 0) || item.inventoryWarehouse === "oversea",
      variants: (item.variants || []).map((v: any) => ({
        sku: v.variantSku || v.sku || "",
        name: v.variantNameEn || v.variantName || "",
        stock: v.variantStock || 0,
      })),
    };
  }

  async searchProducts(keyword: string, page = 1, pageSize = 20): Promise<SupplierSearchResult> {
    const data = await this.post("/v1/product/searchByPage", {
      productNameEn: keyword,
      pageNum: page,
      pageSize,
      isJoinInventory: true,
    });

    if (data.code !== 200) {
      throw new Error(`CJ search failed: ${data.message}`);
    }

    const list = data.data?.list || [];
    return {
      products: list.map((item: any) => this.mapProduct(item)),
      total: data.data?.total || 0,
      page,
      pageSize,
    };
  }

  async getProductDetail(pid: string): Promise<SupplierProduct | null> {
    const data = await this.get("/v1/product/query", { pid });
    if (data.code !== 200 || !data.data) return null;
    return this.mapProduct(data.data);
  }

  async getShippingCost(pid: string, countryCode = "AU"): Promise<number> {
    try {
      const data = await this.post("/v1/logistic/freightCalculate", {
        startCountryCode: "CN",
        endCountryCode: countryCode,
        quantity: 1,
        pid,
      });
      if (data.code === 200 && data.data?.logisticPrice) {
        return usdToAud(parseFloat(data.data.logisticPrice));
      }
    } catch {}
    return 500;
  }
}

class SynceeClient {
  private get apiKey() {
    return process.env.SYNCEE_API_KEY || "";
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  private async graphql(query: string, variables: object = {}): Promise<any> {
    if (!this.isConfigured) throw new Error("Syncee API key not configured");
    const res = await fetch(SYNCEE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(`Syncee GraphQL error: ${json.errors[0]?.message}`);
    return json.data;
  }

  private mapProduct(item: any): SupplierProduct {
    const variant = item.variants?.[0] || {};
    const retailPrice = parseFloat(variant.price || item.retailPrice || "0");
    const costPrice = parseFloat(variant.cost || item.compareAtPrice || String(retailPrice * 0.45));
    const sourcingCostAud = roundCents(costPrice * 100);

    const supplierShipping = parseFloat(item.supplier?.shippingCost || "0");
    const shippingCostAud = supplierShipping > 0
      ? roundCents(supplierShipping * 100)
      : 400;

    return {
      supplierName: "Syncee",
      supplierProductId: item.id || "",
      supplierUrl: `https://syncee.co/marketplace/product/${item.id || ""}`,
      name: item.title || "",
      description: item.bodyHtml || item.description || "",
      imageUrl: item.images?.[0]?.src || item.featuredImage?.src || "",
      sourcingCostAud,
      shippingCostAud,
      shippingNote: "Shipping cost set by individual Syncee supplier. May include free shipping over threshold.",
      category: item.productType || item.vendor || "Other",
      inStock: item.variants?.some((v: any) => v.inventoryQuantity > 0) ?? true,
      variants: (item.variants || []).map((v: any) => ({
        sku: v.sku || "",
        name: v.title || "",
        stock: v.inventoryQuantity || 0,
      })),
    };
  }

  async searchProducts(keyword: string, page = 1, pageSize = 20): Promise<SupplierSearchResult> {
    const query = `
      query SearchProducts($query: String!, $first: Int!, $after: String) {
        products(query: $query, first: $first) {
          edges {
            node {
              id
              title
              bodyHtml
              productType
              vendor
              images(first: 1) { edges { node { src } } }
              variants(first: 5) {
                edges {
                  node {
                    sku
                    title
                    price
                    compareAtPrice
                    inventoryQuantity
                  }
                }
              }
              supplier {
                name
                shippingCost
                country
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;

    const data = await this.graphql(query, { query: keyword, first: pageSize });
    const edges = data?.products?.edges || [];
    const products = edges.map((e: any) => {
      const node = e.node;
      const images = node.images?.edges?.map((i: any) => ({ src: i.node.src })) || [];
      const variants = node.variants?.edges?.map((v: any) => v.node) || [];
      return this.mapProduct({ ...node, images, variants });
    });

    return {
      products,
      total: products.length,
      page,
      pageSize,
    };
  }

  async getProductDetail(id: string): Promise<SupplierProduct | null> {
    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id title bodyHtml productType vendor
          images(first: 5) { edges { node { src } } }
          variants(first: 20) {
            edges {
              node { sku title price compareAtPrice inventoryQuantity }
            }
          }
          supplier { name shippingCost country }
        }
      }
    `;
    const data = await this.graphql(query, { id });
    if (!data?.product) return null;
    const node = data.product;
    const images = node.images?.edges?.map((i: any) => ({ src: i.node.src })) || [];
    const variants = node.variants?.edges?.map((v: any) => v.node) || [];
    return this.mapProduct({ ...node, images, variants });
  }
}

export class SourcingService {
  readonly cj = new CJDropshippingClient();
  readonly syncee = new SynceeClient();

  getStatus(): SupplierStatus[] {
    return [
      {
        supplier: "CJ Dropshipping",
        connected: this.cj.isConfigured,
        message: this.cj.isConfigured
          ? "API credentials configured (CJ_API_EMAIL + CJ_API_PASSWORD)"
          : "Missing env vars: CJ_API_EMAIL, CJ_API_PASSWORD",
      },
      {
        supplier: "Syncee",
        connected: this.syncee.isConfigured,
        message: this.syncee.isConfigured
          ? "API key configured (SYNCEE_API_KEY)"
          : "Missing env var: SYNCEE_API_KEY",
      },
    ];
  }

  async searchSupplier(
    supplier: SupplierName,
    keyword: string,
    page = 1,
    pageSize = 20,
  ): Promise<SupplierSearchResult> {
    if (supplier === "CJ Dropshipping") {
      return this.cj.searchProducts(keyword, page, pageSize);
    }
    if (supplier === "Syncee") {
      return this.syncee.searchProducts(keyword, page, pageSize);
    }
    throw new Error(`Unknown supplier: ${supplier}`);
  }

  async getProductDetail(
    supplier: SupplierName,
    productId: string,
  ): Promise<SupplierProduct | null> {
    if (supplier === "CJ Dropshipping") return this.cj.getProductDetail(productId);
    if (supplier === "Syncee") return this.syncee.getProductDetail(productId);
    return null;
  }

  getShippingProfile(supplier: SupplierName): {
    label: string;
    estimate: string;
    note: string;
    defaultShippingAud: number;
  } {
    if (supplier === "CJ Dropshipping") {
      return {
        label: "CJPacket (China → Australia)",
        estimate: "7–14 business days",
        note: "Rate calculated by weight. Small items typically $3–$8 AUD.",
        defaultShippingAud: 5.00,
      };
    }
    return {
      label: "Supplier-defined shipping",
      estimate: "Varies by supplier",
      note: "Check individual Syncee supplier for exact rates. Some offer free shipping over threshold.",
      defaultShippingAud: 4.00,
    };
  }
}

export const sourcingService = new SourcingService();

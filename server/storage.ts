import {
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Product, type InsertProduct,
  type CartItem, type InsertCartItem,
  type Order, type InsertOrder,
  type Profile, type InsertProfile,
  type Message, type InsertMessage,
  type ProductSourcing, type InsertProductSourcing,
  type MarketingPrompt, type InsertMarketingPrompt,
  type MarketingQueue, type InsertMarketingQueue,
  type BrandContext, type InsertBrandContext,
  type GukdungImage, type InsertGukdungImage,
  users, categories, products, cartItems, orders, profiles, messages, productSourcing,
  marketingPrompts, marketingQueue, brandContext, gukdungImages,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  getProducts(): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  searchProducts(keyword: string): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;

  getSourcingEntries(): Promise<ProductSourcing[]>;
  getSourcingByProductId(productId: string): Promise<ProductSourcing | undefined>;
  getSourcingBySupplierProductId(supplierProductId: string): Promise<ProductSourcing | undefined>;
  getSourcingById(id: string): Promise<ProductSourcing | undefined>;
  deleteProductsWithoutSourcing(): Promise<number>;
  deduplicateBySupplierProductId(): Promise<number>;
  createSourcing(data: InsertProductSourcing): Promise<ProductSourcing>;
  updateSourcing(id: string, data: Partial<InsertProductSourcing>): Promise<ProductSourcing | undefined>;
  deleteSourcing(id: string): Promise<void>;

  getCartItems(sessionId: string): Promise<CartItem[]>;
  addCartItem(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeCartItem(id: string): Promise<void>;
  clearCart(sessionId: string): Promise<void>;

  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersBySession(sessionId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  getOrdersByEmail(email: string): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  getProfiles(): Promise<Profile[]>;
  getProfile(id: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, data: Partial<InsertProfile>): Promise<Profile | undefined>;
  upsertProfileByEmail(email: string, data: Partial<InsertProfile>): Promise<Profile>;
  mergeProfiles(keepId: string, mergeId: string): Promise<Profile | undefined>;

  getMessages(): Promise<Message[]>;
  getMessagesByProfile(profileId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  getMarketingPrompts(): Promise<MarketingPrompt[]>;
  getMarketingPrompt(id: string): Promise<MarketingPrompt | undefined>;
  createMarketingPrompt(data: InsertMarketingPrompt): Promise<MarketingPrompt>;
  updateMarketingPrompt(id: string, data: Partial<InsertMarketingPrompt>): Promise<MarketingPrompt | undefined>;
  deleteMarketingPrompt(id: string): Promise<void>;

  getMarketingQueue(): Promise<MarketingQueue[]>;
  getMarketingQueueItem(id: string): Promise<MarketingQueue | undefined>;
  createMarketingQueueItem(data: InsertMarketingQueue): Promise<MarketingQueue>;
  updateMarketingQueueItem(id: string, data: Partial<InsertMarketingQueue>): Promise<MarketingQueue | undefined>;
  deleteMarketingQueueItem(id: string): Promise<void>;

  getBrandContextItems(): Promise<BrandContext[]>;
  getBrandContextByType(type: string): Promise<BrandContext[]>;
  createBrandContextItem(data: InsertBrandContext): Promise<BrandContext>;
  updateBrandContextItem(id: string, data: Partial<InsertBrandContext>): Promise<BrandContext | undefined>;
  deleteBrandContextItem(id: string): Promise<void>;

  getGukdungImages(): Promise<GukdungImage[]>;
  createGukdungImage(data: InsertGukdungImage): Promise<GukdungImage>;
  updateGukdungImage(id: string, data: Partial<InsertGukdungImage>): Promise<GukdungImage | undefined>;
  deleteGukdungImage(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, slug));
    return cat;
  }

  async createCategory(insert: InsertCategory): Promise<Category> {
    const [cat] = await db.insert(categories).values(insert).returning();
    return cat;
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [prod] = await db.select().from(products).where(eq(products.slug, slug));
    return prod;
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.categoryId, categoryId));
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.featured, true));
  }

  async createProduct(insert: InsertProduct): Promise<Product> {
    const [prod] = await db.insert(products).values(insert).returning();
    return prod;
  }

  async searchProducts(keyword: string): Promise<Product[]> {
    const lower = keyword.toLowerCase();
    const allProducts = await db.select().from(products);
    return allProducts.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      (p.description && p.description.toLowerCase().includes(lower)) ||
      (p.badge && p.badge.toLowerCase().includes(lower))
    );
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [prod] = await db.select().from(products).where(eq(products.id, id));
    return prod;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [prod] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return prod;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(productSourcing).where(eq(productSourcing.productId, id));
    await db.delete(products).where(eq(products.id, id));
  }

  async getSourcingEntries(): Promise<ProductSourcing[]> {
    return db.select().from(productSourcing).orderBy(desc(productSourcing.createdAt));
  }

  async getSourcingByProductId(productId: string): Promise<ProductSourcing | undefined> {
    const [entry] = await db.select().from(productSourcing).where(eq(productSourcing.productId, productId));
    return entry;
  }

  async getSourcingBySupplierProductId(supplierProductId: string): Promise<ProductSourcing | undefined> {
    const [entry] = await db.select().from(productSourcing)
      .where(eq(productSourcing.supplierProductId, supplierProductId));
    return entry;
  }

  async deleteProductsWithoutSourcing(): Promise<number> {
    const allProducts = await db.select({ id: products.id }).from(products);
    const allSourcing = await db.select({ productId: productSourcing.productId }).from(productSourcing);
    const sourcedIds = new Set(allSourcing.map(s => s.productId));
    const toDelete = allProducts.filter(p => !sourcedIds.has(p.id));
    for (const p of toDelete) {
      await db.delete(products).where(eq(products.id, p.id));
    }
    return toDelete.length;
  }

  async deduplicateBySupplierProductId(): Promise<number> {
    const allSourcing = await db.select().from(productSourcing)
      .orderBy(desc(productSourcing.createdAt));
    const seen = new Map<string, string>();
    const toDelete: string[] = [];
    for (const s of allSourcing) {
      if (!s.supplierProductId) continue;
      const key = `${s.supplierName}::${s.supplierProductId}`;
      if (seen.has(key)) {
        toDelete.push(s.productId);
      } else {
        seen.set(key, s.productId);
      }
    }
    for (const pid of toDelete) {
      await db.delete(productSourcing).where(eq(productSourcing.productId, pid));
      await db.delete(products).where(eq(products.id, pid));
    }
    return toDelete.length;
  }

  async getSourcingById(id: string): Promise<ProductSourcing | undefined> {
    const [entry] = await db.select().from(productSourcing).where(eq(productSourcing.id, id));
    return entry;
  }

  async createSourcing(data: InsertProductSourcing): Promise<ProductSourcing> {
    const [entry] = await db.insert(productSourcing).values(data).returning();
    return entry;
  }

  async updateSourcing(id: string, data: Partial<InsertProductSourcing>): Promise<ProductSourcing | undefined> {
    const [entry] = await db.update(productSourcing)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productSourcing.id, id))
      .returning();
    return entry;
  }

  async deleteSourcing(id: string): Promise<void> {
    await db.delete(productSourcing).where(eq(productSourcing.id, id));
  }

  async getCartItems(sessionId: string): Promise<CartItem[]> {
    return db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  async addCartItem(insert: InsertCartItem): Promise<CartItem> {
    const existing = await db.select().from(cartItems)
      .where(eq(cartItems.sessionId, insert.sessionId));
    const match = existing.find(c => c.productId === insert.productId);
    if (match) {
      const [updated] = await db.update(cartItems)
        .set({ quantity: match.quantity + (insert.quantity ?? 1) })
        .where(eq(cartItems.id, match.id))
        .returning();
      return updated;
    }
    const [item] = await db.insert(cartItems).values(insert).returning();
    return item;
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const [item] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return item;
  }

  async removeCartItem(id: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(sessionId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  async createOrder(insert: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insert).returning();
    return order;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.sessionId, sessionId));
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    return db.select().from(orders)
      .where(sql`lower(${orders.customerEmail}) = lower(${email})`)
      .orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return order;
  }

  async getProfiles(): Promise<Profile[]> {
    return db.select().from(profiles).orderBy(desc(profiles.createdAt));
  }

  async getProfile(id: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles)
      .where(sql`lower(${profiles.email}) = lower(${email})`);
    return profile;
  }

  async createProfile(insert: InsertProfile): Promise<Profile> {
    const normalized = { ...insert, email: insert.email.toLowerCase().trim() };
    const [profile] = await db.insert(profiles).values(normalized).returning();
    return profile;
  }

  async updateProfile(id: string, data: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [profile] = await db.update(profiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    return profile;
  }

  async upsertProfileByEmail(email: string, data: Partial<InsertProfile>): Promise<Profile> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.getProfileByEmail(normalizedEmail);
    if (existing) {
      return (await this.updateProfile(existing.id, data))!;
    }
    return this.createProfile({ email: normalizedEmail, ...data });
  }

  async mergeProfiles(keepId: string, mergeId: string): Promise<Profile | undefined> {
    const keep = await this.getProfile(keepId);
    const merge = await this.getProfile(mergeId);
    if (!keep || !merge) return undefined;

    let existingPrefs: Record<string, any> = {};
    try { existingPrefs = keep.preferences ? JSON.parse(keep.preferences) : {}; } catch { existingPrefs = {}; }
    const mergedAliases: string[] = existingPrefs.aliases || [];
    if (!mergedAliases.includes(merge.email)) mergedAliases.push(merge.email);
    existingPrefs.aliases = mergedAliases;

    const updatedData: Partial<InsertProfile> = {
      preferences: JSON.stringify(existingPrefs),
      name: keep.name || merge.name,
      dogName: keep.dogName || merge.dogName,
      dogBreed: keep.dogBreed || merge.dogBreed,
      dogAge: keep.dogAge || merge.dogAge,
      notes: [keep.notes, merge.notes].filter(Boolean).join("\n") || null,
      totalOrders: (keep.totalOrders || 0) + (merge.totalOrders || 0),
      totalSpentAud: (keep.totalSpentAud || 0) + (merge.totalSpentAud || 0),
    };

    await db.update(messages)
      .set({ profileId: keepId })
      .where(eq(messages.profileId, mergeId));

    await db.update(orders)
      .set({ customerEmail: keep.email })
      .where(sql`lower(${orders.customerEmail}) = lower(${merge.email})`);

    await this.updateProfile(keepId, updatedData);
    await db.delete(profiles).where(eq(profiles.id, mergeId));

    return this.getProfile(keepId);
  }

  async getMessages(): Promise<Message[]> {
    return db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getMessagesByProfile(profileId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.profileId, profileId)).orderBy(desc(messages.createdAt));
  }

  async createMessage(insert: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insert).returning();
    return message;
  }

  async getMarketingPrompts(): Promise<MarketingPrompt[]> {
    return db.select().from(marketingPrompts).orderBy(desc(marketingPrompts.createdAt));
  }

  async getMarketingPrompt(id: string): Promise<MarketingPrompt | undefined> {
    const [row] = await db.select().from(marketingPrompts).where(eq(marketingPrompts.id, id));
    return row;
  }

  async createMarketingPrompt(data: InsertMarketingPrompt): Promise<MarketingPrompt> {
    const [row] = await db.insert(marketingPrompts).values(data).returning();
    return row;
  }

  async updateMarketingPrompt(id: string, data: Partial<InsertMarketingPrompt>): Promise<MarketingPrompt | undefined> {
    const [row] = await db.update(marketingPrompts).set(data).where(eq(marketingPrompts.id, id)).returning();
    return row;
  }

  async deleteMarketingPrompt(id: string): Promise<void> {
    await db.delete(marketingPrompts).where(eq(marketingPrompts.id, id));
  }

  async getMarketingQueue(): Promise<MarketingQueue[]> {
    return db.select().from(marketingQueue).orderBy(desc(marketingQueue.createdAt));
  }

  async getMarketingQueueItem(id: string): Promise<MarketingQueue | undefined> {
    const [row] = await db.select().from(marketingQueue).where(eq(marketingQueue.id, id));
    return row;
  }

  async createMarketingQueueItem(data: InsertMarketingQueue): Promise<MarketingQueue> {
    const [row] = await db.insert(marketingQueue).values(data).returning();
    return row;
  }

  async updateMarketingQueueItem(id: string, data: Partial<InsertMarketingQueue>): Promise<MarketingQueue | undefined> {
    const [row] = await db.update(marketingQueue).set(data).where(eq(marketingQueue.id, id)).returning();
    return row;
  }

  async deleteMarketingQueueItem(id: string): Promise<void> {
    await db.delete(marketingQueue).where(eq(marketingQueue.id, id));
  }

  async getBrandContextItems(): Promise<BrandContext[]> {
    return db.select().from(brandContext).orderBy(desc(brandContext.createdAt));
  }

  async getBrandContextByType(type: string): Promise<BrandContext[]> {
    return db.select().from(brandContext).where(eq(brandContext.type, type)).orderBy(desc(brandContext.createdAt));
  }

  async createBrandContextItem(data: InsertBrandContext): Promise<BrandContext> {
    const [row] = await db.insert(brandContext).values(data).returning();
    return row;
  }

  async updateBrandContextItem(id: string, data: Partial<InsertBrandContext>): Promise<BrandContext | undefined> {
    const [row] = await db.update(brandContext).set({ ...data, updatedAt: new Date() }).where(eq(brandContext.id, id)).returning();
    return row;
  }

  async deleteBrandContextItem(id: string): Promise<void> {
    await db.delete(brandContext).where(eq(brandContext.id, id));
  }

  async getGukdungImages(): Promise<GukdungImage[]> {
    return db.select().from(gukdungImages).orderBy(desc(gukdungImages.createdAt));
  }

  async createGukdungImage(data: InsertGukdungImage): Promise<GukdungImage> {
    const [row] = await db.insert(gukdungImages).values(data).returning();
    return row;
  }

  async updateGukdungImage(id: string, data: Partial<InsertGukdungImage>): Promise<GukdungImage | undefined> {
    const [row] = await db.update(gukdungImages).set(data).where(eq(gukdungImages.id, id)).returning();
    return row;
  }

  async deleteGukdungImage(id: string): Promise<void> {
    await db.delete(gukdungImages).where(eq(gukdungImages.id, id));
  }
}

export const storage = new DatabaseStorage();

const PRODUCT_IMAGES: Record<string, string> = {
  "kangaroo-jerky-treats": "https://images.pexels.com/photos/6568501/pexels-photo-6568501.jpeg?auto=compress&cs=tinysrgb&w=400",
  "salmon-oil-supplement": "https://images.pexels.com/photos/6816860/pexels-photo-6816860.jpeg?auto=compress&cs=tinysrgb&w=400",
  "merino-wool-dog-bed": "https://images.pexels.com/photos/4587998/pexels-photo-4587998.jpeg?auto=compress&cs=tinysrgb&w=400",
  "bush-herb-shampoo": "https://images.pexels.com/photos/7210754/pexels-photo-7210754.jpeg?auto=compress&cs=tinysrgb&w=400",
  "dental-chew-sticks": "https://images.pexels.com/photos/6568941/pexels-photo-6568941.jpeg?auto=compress&cs=tinysrgb&w=400",
  "puppy-welcome-box": "https://images.pexels.com/photos/7210262/pexels-photo-7210262.jpeg?auto=compress&cs=tinysrgb&w=400",
};

export async function seedProducts() {
  const existing = await db.select().from(products);
  if (existing.length > 0) {
    for (const p of existing) {
      if (!p.imageUrl && p.slug && PRODUCT_IMAGES[p.slug]) {
        await db.update(products).set({ imageUrl: PRODUCT_IMAGES[p.slug] }).where(eq(products.id, p.id));
      }
    }
    return;
  }

  const sampleProducts: InsertProduct[] = [
    {
      name: "Australian Kangaroo Jerky Treats",
      slug: "kangaroo-jerky-treats",
      description: "Premium air-dried kangaroo jerky treats. High protein, low fat, grain-free. Perfect for dogs with sensitive stomachs.",
      priceAud: 2490,
      compareAtPriceAud: 2990,
      badge: "Best Seller",
      inStock: true,
      featured: true,
      imageUrl: PRODUCT_IMAGES["kangaroo-jerky-treats"],
    },
    {
      name: "Organic Salmon Oil Supplement",
      slug: "salmon-oil-supplement",
      description: "Cold-pressed wild Australian salmon oil. Rich in Omega-3 and 6 for healthy skin and shiny coat. 500ml bottle.",
      priceAud: 3490,
      badge: "New",
      inStock: true,
      featured: true,
      imageUrl: PRODUCT_IMAGES["salmon-oil-supplement"],
    },
    {
      name: "Merino Wool Dog Bed",
      slug: "merino-wool-dog-bed",
      description: "Handcrafted Australian merino wool dog bed. Temperature regulating, hypoallergenic. Available in S/M/L.",
      priceAud: 18900,
      compareAtPriceAud: 22900,
      badge: "Premium",
      inStock: true,
      featured: true,
      imageUrl: PRODUCT_IMAGES["merino-wool-dog-bed"],
    },
    {
      name: "Native Bush Herb Shampoo",
      slug: "bush-herb-shampoo",
      description: "All-natural dog shampoo with Australian tea tree, eucalyptus, and lavender. Gentle formula for sensitive skin. 300ml.",
      priceAud: 1890,
      inStock: true,
      featured: false,
      imageUrl: PRODUCT_IMAGES["bush-herb-shampoo"],
    },
    {
      name: "Dental Health Chew Sticks",
      slug: "dental-chew-sticks",
      description: "Vet-approved dental chew sticks made from Australian sweet potato and peppermint. Pack of 20.",
      priceAud: 1690,
      inStock: true,
      featured: false,
      imageUrl: PRODUCT_IMAGES["dental-chew-sticks"],
    },
    {
      name: "Puppy Welcome Box",
      slug: "puppy-welcome-box",
      description: "The perfect gift for new puppy parents! Includes training treats, plush toy, puppy shampoo, and feeding guide.",
      priceAud: 5990,
      compareAtPriceAud: 7490,
      badge: "Gift Set",
      inStock: true,
      featured: true,
      imageUrl: PRODUCT_IMAGES["puppy-welcome-box"],
    },
  ];

  for (const p of sampleProducts) {
    await db.insert(products).values(p);
  }
  console.log(`Seeded ${sampleProducts.length} sample products`);
}

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  priceAud: integer("price_aud").notNull(),
  compareAtPriceAud: integer("compare_at_price_aud"),
  categoryId: varchar("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  images: text("images").array(),
  badge: text("badge"),
  inStock: boolean("in_stock").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  status: text("status").notNull().default("pending"),
  totalAud: integer("total_aud").notNull(),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  petName: text("pet_name"),
  shippingAddress: text("shipping_address"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  dogName: text("dog_name"),
  dogBreed: text("dog_breed"),
  dogAge: text("dog_age"),
  preferences: text("preferences"),
  notes: text("notes"),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpentAud: integer("total_spent_aud").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").references(() => profiles.id),
  direction: text("direction").notNull().default("outgoing"),
  subject: text("subject"),
  body: text("body").notNull(),
  toEmail: text("to_email").notNull(),
  fromEmail: text("from_email").notNull(),
  resendId: text("resend_id"),
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productSourcing = pgTable("product_sourcing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id),
  supplierName: text("supplier_name").notNull().default(""),
  supplierProductId: text("supplier_product_id"),
  supplierUrl: text("supplier_url"),
  sourcingCostAud: integer("sourcing_cost_aud").notNull().default(0),
  shippingCostAud: integer("shipping_cost_aud").notNull().default(0),
  tier: text("tier").notNull().default("smart_choice"),
  sourcingStatus: text("sourcing_status").notNull().default("researching"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const marketingPrompts = pgTable("marketing_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull().default("global"),
  section: text("section").notNull().default("instagram_post"),
  systemInstruction: text("system_instruction").notNull(),
  modelTarget: text("model_target"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const marketingQueue = pgTable("marketing_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptId: varchar("prompt_id").references(() => marketingPrompts.id),
  productId: varchar("product_id").references(() => products.id),
  platform: text("platform").notNull().default("instagram"),
  contentType: text("content_type").notNull().default("post"),
  caption: text("caption"),
  hashtags: text("hashtags"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  imagePrompt: text("image_prompt"),
  status: text("status").notNull().default("pending"),
  approvedBy: text("approved_by"),
  scheduledAt: timestamp("scheduled_at"),
  postedAt: timestamp("posted_at"),
  makeWebhookId: text("make_webhook_id"),
  metaPostId: text("meta_post_id"),
  rejectionReason: text("rejection_reason"),
  topic: text("topic"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const brandContext = pgTable("brand_context", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gukdungImages = pgTable("gukdung_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  tags: text("tags"),
  isTrainingData: boolean("is_training_data").notNull().default(false),
  isVideoReference: boolean("is_video_reference").notNull().default(false),
  loraModelId: text("lora_model_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Content Scheduler
export const contentScheduleTemplate = pgTable("content_schedule_template", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun ~ 6=Sat
  platform: text("platform").notNull(), // instagram, facebook, tiktok
  contentType: text("content_type").notNull(), // post, reel, story_image, tiktok, card_news
  preferredTime: text("preferred_time").notNull().default("18:00"), // HH:mm (Sydney time)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentScheduleItem = pgTable("content_schedule_item", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD
  dayOfWeek: integer("day_of_week").notNull(),
  platform: text("platform").notNull(),
  contentType: text("content_type").notNull(),
  theme: text("theme"), // 월간 테마
  topic: text("topic"), // AI 생성 주제
  description: text("description"), // 간단한 내용 설명
  scheduledTime: text("scheduled_time"), // HH:mm (Sydney time)
  status: text("status").notNull().default("draft"), // draft, approved, generating, generated, failed
  queueItemId: varchar("queue_item_id").references(() => marketingQueue.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true, totalOrders: true, totalSpentAud: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const insertProductSourcingSchema = createInsertSchema(productSourcing).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMarketingPromptSchema = createInsertSchema(marketingPrompts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMarketingQueueSchema = createInsertSchema(marketingQueue).omit({ id: true, createdAt: true });
export const insertBrandContextSchema = createInsertSchema(brandContext).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGukdungImageSchema = createInsertSchema(gukdungImages).omit({ id: true, createdAt: true });

export type InsertProductSourcing = z.infer<typeof insertProductSourcingSchema>;
export type ProductSourcing = typeof productSourcing.$inferSelect;
export type InsertMarketingPrompt = z.infer<typeof insertMarketingPromptSchema>;
export type MarketingPrompt = typeof marketingPrompts.$inferSelect;
export type InsertMarketingQueue = z.infer<typeof insertMarketingQueueSchema>;
export type MarketingQueue = typeof marketingQueue.$inferSelect;
export type InsertBrandContext = z.infer<typeof insertBrandContextSchema>;
export type BrandContext = typeof brandContext.$inferSelect;
export type InsertGukdungImage = z.infer<typeof insertGukdungImageSchema>;
export type GukdungImage = typeof gukdungImages.$inferSelect;

export const insertContentScheduleTemplateSchema = createInsertSchema(contentScheduleTemplate).omit({ id: true, createdAt: true });
export const insertContentScheduleItemSchema = createInsertSchema(contentScheduleItem).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentScheduleTemplate = z.infer<typeof insertContentScheduleTemplateSchema>;
export type ContentScheduleTemplate = typeof contentScheduleTemplate.$inferSelect;
export type InsertContentScheduleItem = z.infer<typeof insertContentScheduleItemSchema>;
export type ContentScheduleItem = typeof contentScheduleItem.$inferSelect;

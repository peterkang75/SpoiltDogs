CREATE TABLE "brand_context" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_schedule_item" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"scheduled_date" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"platform" text NOT NULL,
	"content_type" text NOT NULL,
	"theme" text,
	"topic" text,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"queue_item_id" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_schedule_template" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_of_week" integer NOT NULL,
	"platform" text NOT NULL,
	"content_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gukdung_images" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_url" text NOT NULL,
	"description" text,
	"tags" text,
	"is_training_data" boolean DEFAULT false NOT NULL,
	"is_video_reference" boolean DEFAULT false NOT NULL,
	"lora_model_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketing_prompts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'global' NOT NULL,
	"section" text DEFAULT 'instagram_post' NOT NULL,
	"system_instruction" text NOT NULL,
	"model_target" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketing_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" varchar,
	"product_id" varchar,
	"platform" text DEFAULT 'instagram' NOT NULL,
	"content_type" text DEFAULT 'post' NOT NULL,
	"caption" text,
	"hashtags" text,
	"image_url" text,
	"video_url" text,
	"image_prompt" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"scheduled_at" timestamp,
	"posted_at" timestamp,
	"make_webhook_id" text,
	"meta_post_id" text,
	"rejection_reason" text,
	"topic" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar,
	"direction" text DEFAULT 'outgoing' NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"to_email" text NOT NULL,
	"from_email" text NOT NULL,
	"resend_id" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_aud" integer NOT NULL,
	"customer_email" text,
	"customer_name" text,
	"pet_name" text,
	"shipping_address" text,
	"stripe_session_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_sourcing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar,
	"supplier_name" text DEFAULT '' NOT NULL,
	"supplier_product_id" text,
	"supplier_url" text,
	"sourcing_cost_aud" integer DEFAULT 0 NOT NULL,
	"shipping_cost_aud" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'smart_choice' NOT NULL,
	"sourcing_status" text DEFAULT 'researching' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"price_aud" integer NOT NULL,
	"compare_at_price_aud" integer,
	"category_id" varchar,
	"image_url" text,
	"images" text[],
	"badge" text,
	"in_stock" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"dog_name" text,
	"dog_breed" text,
	"dog_age" text,
	"preferences" text,
	"notes" text,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spent_aud" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_schedule_item" ADD CONSTRAINT "content_schedule_item_queue_item_id_marketing_queue_id_fk" FOREIGN KEY ("queue_item_id") REFERENCES "public"."marketing_queue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_queue" ADD CONSTRAINT "marketing_queue_prompt_id_marketing_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."marketing_prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_queue" ADD CONSTRAINT "marketing_queue_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sourcing" ADD CONSTRAINT "product_sourcing_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
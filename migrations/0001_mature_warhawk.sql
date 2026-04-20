ALTER TABLE "content_schedule_item" ADD COLUMN "scheduled_time" text;--> statement-breakpoint
ALTER TABLE "content_schedule_template" ADD COLUMN "preferred_time" text DEFAULT '18:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketing_queue" ADD COLUMN "slide_urls" text[];
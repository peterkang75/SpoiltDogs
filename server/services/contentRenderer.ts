/**
 * Content Renderer — Puppeteer-based multi-slide content generation
 *
 * Replaces Sharp SVG overlay with full HTML/CSS rendering for:
 * - card_news: cover + body slides + CTA (8-10 slides)
 * - carousel: cover + body slides + CTA (3-5 slides)
 * - post: single image with text overlay
 * - story_image: single 9:16 story with promo
 */

import fs from "fs";
import path from "path";
import { renderHtmlToImage } from "./templateRenderer";
import { storage } from "../storage";

const TEMPLATE_DIR = path.join(__dirname, "..", "templates");

function loadCSS(): string {
  return fs.readFileSync(path.join(TEMPLATE_DIR, "design-system.css"), "utf-8");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline CSS into a template (replaces <link rel="stylesheet"> with <style>) */
function inlineCSS(html: string): string {
  const css = loadCSS();
  return html.replace(
    /<link[^>]*design-system\.css[^>]*>/,
    `<style>${css}</style>`
  );
}

/** Load a template file and substitute {{variables}} */
function buildSlideHtml(
  templateName: string,
  variables: Record<string, string>
): string {
  const filePath = path.join(TEMPLATE_DIR, `${templateName}.html`);
  let html = fs.readFileSync(filePath, "utf-8");

  // Inline the CSS so Puppeteer doesn't need to resolve file:// links
  html = inlineCSS(html);

  for (const [key, value] of Object.entries(variables)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), escapeHtml(value));
  }

  // Remove any remaining unreplaced placeholders
  html = html.replace(/\{\{[a-zA-Z_]+\}\}/g, "");

  return html;
}

// ─── Slide content structure from Claude ───

export interface SlideContent {
  heading: string;
  body: string;
  tipIcon?: string;
  tipText?: string;
}

export interface ContentPlan {
  tag: string;
  title: string;
  subtitle: string;
  slides: SlideContent[];
  ctaHeading: string;
  ctaBody: string;
  ctaButton: string;
}

// ─── Render functions ───

/** Render a card news series: cover + N body slides + CTA → PNG buffers */
export async function renderCardNews(
  plan: ContentPlan,
  imageUrl: string,
): Promise<Buffer[]> {
  const totalSlides = plan.slides.length + 2; // cover + body slides + CTA
  const buffers: Buffer[] = [];

  // Slide 1: Cover
  const coverHtml = buildSlideHtml("card-news-cover", {
    imageUrl,
    tag: plan.tag,
    title: plan.title,
    subtitle: plan.subtitle,
  });
  buffers.push(await renderHtmlToImage(coverHtml, 1080, 1350));

  // Slides 2..N-1: Body
  for (let i = 0; i < plan.slides.length; i++) {
    const slide = plan.slides[i];
    const bodyHtml = buildSlideHtml("card-news-body", {
      slideNumber: String(i + 1).padStart(2, "0"),
      heading: slide.heading,
      body: slide.body.replace(/\n/g, "<br>"),
      tipIcon: slide.tipIcon || "💡",
      tipText: slide.tipText || "",
      totalSlides: String(totalSlides),
    });
    buffers.push(await renderHtmlToImage(bodyHtml, 1080, 1350));
  }

  // Last slide: CTA
  const ctaHtml = buildSlideHtml("card-news-cta", {
    ctaHeading: plan.ctaHeading,
    ctaBody: plan.ctaBody,
    ctaButton: plan.ctaButton,
  });
  buffers.push(await renderHtmlToImage(ctaHtml, 1080, 1350));

  return buffers;
}

/** Render a single post with image overlay → PNG buffer */
export async function renderPost(
  imageUrl: string,
  variables: { tag: string; heading: string; body: string; hashtag: string },
): Promise<Buffer> {
  const html = buildSlideHtml("post-feed", { imageUrl, ...variables });
  return renderHtmlToImage(html, 1080, 1350);
}

/** Render a story promo → PNG buffer */
export async function renderStory(
  imageUrl: string,
  variables: { tag: string; heading: string; body: string; ctaText: string },
): Promise<Buffer> {
  const html = buildSlideHtml("story-promo", { imageUrl, ...variables });
  return renderHtmlToImage(html, 1080, 1920);
}

/** Upload multiple slide buffers to Supabase and return URLs */
export async function uploadSlides(buffers: Buffer[]): Promise<string[]> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const urls: string[] = [];
  const batchId = Date.now();

  for (let i = 0; i < buffers.length; i++) {
    const filename = `slide_${batchId}_${i + 1}.png`;
    const { error } = await supabase.storage
      .from("generated-images")
      .upload(filename, buffers[i], {
        contentType: "image/png",
        upsert: false,
      });

    if (error) throw new Error(`Slide ${i + 1} upload failed: ${error.message}`);

    const { data } = supabase.storage
      .from("generated-images")
      .getPublicUrl(filename);

    urls.push(data.publicUrl);
  }

  return urls;
}

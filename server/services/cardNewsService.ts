import sharp from "sharp";
import * as fal from "@fal-ai/serverless-client";
import { storage } from "../storage";

fal.config({ credentials: process.env.FAL_API_KEY });

const DEFAULT_IDENTITY = {
  primaryColor: "#4B9073",
  secondaryColor: "#FCF9F1",
  accentColor: "#E8B84B",
  headingFont: "Fraunces",
  bodyFont: "Inter",
  textStyle: "light_on_dark",
};

async function getBrandIdentity() {
  try {
    const items = await storage.getBrandContextItems();
    const item = items.find((i) => i.type === "brand_identity" && i.isActive);
    if (item) return { ...DEFAULT_IDENTITY, ...JSON.parse(item.content) };
  } catch {}
  return DEFAULT_IDENTITY;
}

export async function generateCardNewsImage({
  imagePrompt,
  textLines,
  referenceImageUrls = [],
  aspectRatio = "1:1",
}: {
  imagePrompt: string;
  textLines: string[];
  referenceImageUrls?: string[];
  aspectRatio?: string;
}): Promise<{ imageUrl: string }> {
  try {
    // Step 1: Generate Gukdung image with Nano Banana 2/edit
    console.log("[CardNews] Step 1: Generating Gukdung image...");

    // Strip text overlay instructions from prompt so Nano Banana doesn't bake in text
    const cleanPrompt = imagePrompt
      .replace(/text overlay[^.]*\./gi, "")
      .replace(/text at (top|bottom)[^.]*\./gi, "")
      .replace(/'[^']*' in [a-z]+ (font|script)[^.]*\./gi, "")
      .replace(/include text[^.]*\./gi, "")
      .trim();

    const imageInput: any = {
      prompt: cleanPrompt + ". NO text, NO words, NO typography, NO letters anywhere on the image. Clean composition with open space at top for text overlay.",
      aspect_ratio: aspectRatio,
      output_format: "png",
      safety_tolerance: "4",
      resolution: "1K",
    };

    if (referenceImageUrls.length > 0) {
      imageInput.image_urls = referenceImageUrls.slice(0, 5);
    }

    const imageResult = (await fal.run(
      referenceImageUrls.length > 0 ? "fal-ai/nano-banana-2/edit" : "fal-ai/nano-banana-2",
      { input: imageInput }
    )) as any;

    const generatedImageUrl = imageResult.images?.[0]?.url || "";
    if (!generatedImageUrl) throw new Error("Step 1 failed: No image generated");
    console.log("[CardNews] Step 1 complete:", generatedImageUrl);

    // Step 2: Download image and add brand-colored text overlay with Sharp
    console.log("[CardNews] Step 2: Adding text overlay with Sharp...");
    const identity = await getBrandIdentity();

    // Determine text and overlay colors from brand identity
    const textColor = identity.textStyle === "light_on_dark"
      ? identity.secondaryColor
      : identity.textStyle === "brand_on_white"
      ? identity.primaryColor
      : identity.primaryColor;

    const overlayBgColor = identity.textStyle === "light_on_dark"
      ? identity.primaryColor
      : identity.textStyle === "dark_on_light"
      ? identity.secondaryColor
      : "#ffffff";

    const response = await fetch(generatedImageUrl);
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    const fontSize = Math.floor(width * 0.038);
    const lineHeight = fontSize * 1.5;
    const padding = Math.floor(width * 0.05);
    const boxHeight = Math.floor(height * 0.22);

    // Convert hex to rgba with alpha for gradient
    function hexToRgba(hex: string, alpha: number) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    const gradStart = hexToRgba(overlayBgColor, 0.82);
    const gradEnd = hexToRgba(overlayBgColor, 0);

    const textSvgLines = textLines
      .slice(0, 3)
      .map((line, i) => {
        const y = padding + fontSize + i * lineHeight;
        const safeText = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
        return `<text
          x="${width / 2}"
          y="${y}"
          font-family="Georgia, serif"
          font-size="${fontSize}"
          font-weight="bold"
          fill="${textColor}"
          text-anchor="middle"
          filter="url(#shadow)"
        >${safeText}</text>`;
      })
      .join("\n");

    const svgOverlay = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.6)" />
          </filter>
          <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${gradStart}" />
            <stop offset="100%" stop-color="${gradEnd}" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${boxHeight}" fill="url(#topGrad)" />
        ${textSvgLines}
      </svg>`;

    const finalBuffer = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0,
        },
      ])
      .jpeg({ quality: 95 })
      .toBuffer();

    console.log("[CardNews] Step 2 complete. Text overlay applied.");

    // Step 3: Upload to Supabase Storage
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const filename = `card_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(filename, finalBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
      .from("generated-images")
      .getPublicUrl(filename);

    console.log("[CardNews] Upload complete:", urlData.publicUrl);
    return { imageUrl: urlData.publicUrl };
  } catch (error: any) {
    const errorBody = error?.body?.detail || error?.message || "";
    if (
      error?.status === 403 ||
      errorBody.includes("Exhausted balance") ||
      errorBody.includes("locked") ||
      errorBody.includes("balance")
    ) {
      throw new Error("CREDIT_EXHAUSTED:FAL.AI");
    }
    throw error;
  }
}

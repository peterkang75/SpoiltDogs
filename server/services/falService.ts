import * as fal from "@fal-ai/serverless-client";
import { saveImageFromUrl, saveVideoFromUrl } from "./storageService";

fal.config({ credentials: process.env.FAL_API_KEY });

export type ImageModel =
  | "nano-banana-2"
  | "nano-banana-pro"
  | "nano-banana"
  | "ideogram"
  | "kling"
  | "kling-3"
  | "veo2"
  | "veo3";

export async function generateImage({
  prompt,
  model = "nano-banana-2",
  referenceImageUrls = [],
  aspectRatio = "1:1",
}: {
  prompt: string;
  model?: ImageModel;
  referenceImageUrls?: string[];
  aspectRatio?: string;
}): Promise<{ imageUrl?: string; videoUrl?: string }> {

  // ── Nano Banana family — reference-image aware ─────────────────────
  if (
    model === "nano-banana-2" ||
    model === "nano-banana-pro" ||
    model === "nano-banana"
  ) {
    const endpointMap: Record<string, string> = {
      "nano-banana-2":
        referenceImageUrls.length > 0
          ? "fal-ai/nano-banana-2/edit"
          : "fal-ai/nano-banana-2",
      "nano-banana-pro":
        referenceImageUrls.length > 0
          ? "fal-ai/nano-banana-pro/edit"
          : "fal-ai/nano-banana-pro",
      "nano-banana":
        referenceImageUrls.length > 0
          ? "fal-ai/nano-banana/edit"
          : "fal-ai/nano-banana",
    };
    const endpoint = endpointMap[model];

    const input: any = {
      prompt,
      aspect_ratio: aspectRatio,
      output_format: "png",
      safety_tolerance: "4",
      resolution: "1K",
    };

    if (referenceImageUrls.length > 0) {
      input.image_urls = referenceImageUrls.slice(0, 5);
    }

    console.log(
      `[${model}] endpoint=${endpoint} refs=${referenceImageUrls.length}`,
    );
    try {
      const result = (await fal.run(endpoint, { input })) as any;
      const imageUrl = result.images?.[0]?.url || "";
      if (!imageUrl) throw new Error(`${model} returned no image URL`);
      const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const permanentUrl = await saveImageFromUrl(imageUrl, filename);
      return { imageUrl: permanentUrl };
    } catch (error: any) {
      const errorBody = error?.body?.detail || error?.message || "";
      if (
        error?.status === 403 ||
        errorBody.includes("Exhausted balance") ||
        errorBody.includes("locked") ||
        errorBody.includes("balance") ||
        errorBody.includes("credit")
      ) {
        throw new Error("CREDIT_EXHAUSTED:fal.ai");
      }
      throw error;
    }
  }

  // ── Ideogram V3 — text / card news ─────────────────────────────────
  if (model === "ideogram") {
    try {
      const result = (await fal.run("fal-ai/ideogram/v3", {
        input: {
          prompt,
          aspect_ratio: aspectRatio === "9:16" ? "ASPECT_9_16" : "ASPECT_1_1",
          style: "REALISTIC",
        },
      })) as any;
      const imageUrl = result.images?.[0]?.url || "";
      if (!imageUrl) throw new Error("Ideogram returned no image URL");
      const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const permanentUrl = await saveImageFromUrl(imageUrl, filename);
      return { imageUrl: permanentUrl };
    } catch (error: any) {
      const errorBody = error?.body?.detail || error?.message || "";
      if (
        error?.status === 403 ||
        errorBody.includes("Exhausted balance") ||
        errorBody.includes("locked") ||
        errorBody.includes("balance") ||
        errorBody.includes("credit")
      ) {
        throw new Error("CREDIT_EXHAUSTED:fal.ai");
      }
      throw error;
    }
  }

  // ── Kling 1.6 — video / reels / tiktok ─────────────────────────────
  if (model === "kling") {
    try {
      const result = (await fal.run(
        "fal-ai/kling-video/v1.6/pro/text-to-video",
        {
          input: { prompt, duration: "5", aspect_ratio: "9:16" },
        },
      )) as any;
      const videoUrl = result.video?.url || "";
      if (!videoUrl) throw new Error("Kling returned no video URL");
      const filename = `video_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const permanentUrl = await saveVideoFromUrl(videoUrl, filename);
      return { videoUrl: permanentUrl };
    } catch (error: any) {
      const errorBody = error?.body?.detail || error?.message || "";
      if (
        error?.status === 403 ||
        errorBody.includes("Exhausted balance") ||
        errorBody.includes("locked") ||
        errorBody.includes("balance") ||
        errorBody.includes("credit")
      ) {
        throw new Error("CREDIT_EXHAUSTED:fal.ai");
      }
      throw error;
    }
  }

  // ── Kling 3.0 (v2.5-turbo) — high quality video ─────────────────────
  if (model === "kling-3") {
    try {
      const result = (await fal.run(
        "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
        {
          input: { prompt, duration: "5", aspect_ratio: "9:16" },
        },
      )) as any;
      const videoUrl = result.video?.url || "";
      if (!videoUrl) throw new Error("Kling 3.0 returned no video URL");
      const filename = `video_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const permanentUrl = await saveVideoFromUrl(videoUrl, filename);
      return { videoUrl: permanentUrl };
    } catch (error: any) {
      const errorBody = error?.body?.detail || error?.message || "";
      if (
        error?.status === 403 ||
        errorBody.includes("Exhausted balance") ||
        errorBody.includes("locked") ||
        errorBody.includes("balance") ||
        errorBody.includes("credit")
      ) {
        throw new Error("CREDIT_EXHAUSTED:fal.ai");
      }
      throw error;
    }
  }

  // ── Veo 2 — Google physics-based motion ──────────────────────────────
  if (model === "veo2") {
    try {
      console.log("[veo2] Submitting to fal-ai/veo2");
      const result = (await fal.run("fal-ai/veo2", {
        input: { prompt, aspect_ratio: "9:16" },
      })) as any;
      console.log("[veo2] Result keys:", Object.keys(result));
      const videoUrl = result.video?.url || result.video_url || result.url || "";
      if (!videoUrl) throw new Error("Veo 2 returned no video URL");
      const filename = `video_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const permanentUrl = await saveVideoFromUrl(videoUrl, filename);
      return { videoUrl: permanentUrl };
    } catch (error: any) {
      const detail = JSON.stringify(error?.body?.detail || error?.body || "");
      console.error(`[veo2] Error status=${error?.status} detail=${detail} msg=${error?.message}`);
      const errorBody = detail + (error?.message || "");
      if (
        error?.status === 403 ||
        errorBody.includes("Exhausted balance") ||
        errorBody.includes("locked") ||
        errorBody.includes("balance") ||
        errorBody.includes("credit")
      ) {
        throw new Error("CREDIT_EXHAUSTED:fal.ai");
      }
      throw error;
    }
  }

  // ── Veo 3 — Google highest quality with sound ────────────────────────
  if (model === "veo3") {
    try {
      console.log("[veo3] Submitting to fal-ai/veo3");
      const result = (await fal.run("fal-ai/veo3", {
        input: { prompt, aspect_ratio: "9:16" },
      })) as any;
      console.log("[veo3] Result keys:", Object.keys(result));
      const videoUrl = result.video?.url || result.video_url || result.url || "";
      if (!videoUrl) throw new Error("Veo 3 returned no video URL");
      const filename = `video_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const permanentUrl = await saveVideoFromUrl(videoUrl, filename);
      return { videoUrl: permanentUrl };
    } catch (error: any) {
      const detail = JSON.stringify(error?.body?.detail || error?.body || "");
      console.error(`[veo3] Error status=${error?.status} detail=${detail} msg=${error?.message}`);
      const errorBody = detail + (error?.message || "");
      if (
        error?.status === 403 ||
        errorBody.includes("Exhausted balance") ||
        errorBody.includes("locked") ||
        errorBody.includes("balance") ||
        errorBody.includes("credit")
      ) {
        throw new Error("CREDIT_EXHAUSTED:fal.ai");
      }
      throw error;
    }
  }

  throw new Error(`Unknown model: ${model}`);
}

// ── 2-Step Card News Pipeline: Nano Banana 2 → Ideogram V3 Edit ──────────────
export async function generateCardNews({
  prompt,
  textContent,
  referenceImageUrls = [],
  aspectRatio = "1:1",
}: {
  prompt: string;
  textContent: string;
  referenceImageUrls?: string[];
  aspectRatio?: string;
}): Promise<{ imageUrl: string; thumbnailUrl?: string }> {
  try {
    // Step 1: Generate Gukdung image with Nano Banana 2/edit
    console.log("[CardNews] Step 1: Generating Gukdung image...");

    const imageInput: any = {
      prompt: `${prompt}. Clean background suitable for text overlay. No text in image.`,
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
      { input: imageInput },
    )) as any;

    const generatedImageUrl = imageResult.images?.[0]?.url || "";
    if (!generatedImageUrl) throw new Error("Step 1 failed: No image generated");
    console.log("[CardNews] Step 1 complete:", generatedImageUrl);

    // Step 2: Generate card news image with text overlay using Ideogram V3
    console.log("[CardNews] Step 2: Generating text overlay image with Ideogram...");

    const ideogramResult = (await fal.run("fal-ai/ideogram/v3", {
      input: {
        prompt: `${prompt}. Include elegant text overlay: "${textContent}". 
          Clean serif typography, clearly readable, premium pet boutique aesthetic.
          Text should be prominent but not overwhelming the main subject.
          Square format card news style.`,
        aspect_ratio: aspectRatio === "9:16" ? "ASPECT_9_16" : "ASPECT_1_1",
        style: "DESIGN",
      },
    })) as any;

    const finalImageUrl = ideogramResult.images?.[0]?.url || "";
    if (!finalImageUrl) throw new Error("Step 2 failed: No image from Ideogram");
    console.log("[CardNews] Step 2 complete:", finalImageUrl);

    // Save both to Supabase Storage
    const thumbFilename = `thumb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const thumbnailUrl = await saveImageFromUrl(generatedImageUrl, thumbFilename);

    const finalFilename = `card_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const permanentUrl = await saveImageFromUrl(finalImageUrl, finalFilename);

    return { imageUrl: permanentUrl, thumbnailUrl };
  } catch (error: any) {
    const errorBody = error?.body?.detail || error?.message || "";
    if (
      error?.status === 403 ||
      errorBody.includes("Exhausted balance") ||
      errorBody.includes("locked") ||
      errorBody.includes("balance") ||
      errorBody.includes("credit")
    ) {
      throw new Error("CREDIT_EXHAUSTED:fal.ai");
    }
    throw error;
  }
}

// ── 2-Step Video Pipeline: Nano Banana 2 → Image-to-Video ────────────────────
export async function generateVideo({
  prompt,
  caption,
  model = "kling-3-img2vid",
  referenceImageUrls = [],
  aspectRatio = "9:16",
  duration = "8",
  gukdungProfile,
  imageGuidelines,
}: {
  prompt: string;
  caption?: string;
  model?: string;
  referenceImageUrls?: string[];
  aspectRatio?: string;
  duration?: string;
  gukdungProfile?: string;
  imageGuidelines?: string;
}): Promise<{ videoUrl: string; thumbnailUrl?: string; videoPrompt?: string }> {
  try {
    // ── Pre-Step: Convert caption to motion prompt via Claude ───────────────
    let videoMotionPrompt = prompt;
    if (caption) {
      try {
        const { convertCaptionToVideoPrompt } = await import(
          "./claudeMarketingService"
        );
        videoMotionPrompt = await convertCaptionToVideoPrompt({
          caption,
          gukdungProfile,
          imageGuidelines,
        });
        console.log("[Video] Motion prompt generated:", videoMotionPrompt);
      } catch (err) {
        console.warn(
          "[Video] Caption conversion failed, using original prompt:",
          err,
        );
        videoMotionPrompt = prompt;
      }
    }

    // ── Step 1: Generate accurate Gukdung image with Nano Banana 2 ──────────
    console.log("[Video] Step 1: Generating Gukdung image with Nano Banana 2...");

    const imageInput: any = {
      prompt: `${prompt}. Single frame, still image, photorealistic.`,
      aspect_ratio: aspectRatio,
      output_format: "png",
      safety_tolerance: "4",
      resolution: "1K",
    };

    if (referenceImageUrls.length > 0) {
      imageInput.image_urls = referenceImageUrls.slice(0, 5);
    }

    const imageResult = (await fal.run(
      referenceImageUrls.length > 0
        ? "fal-ai/nano-banana-2/edit"
        : "fal-ai/nano-banana-2",
      { input: imageInput },
    )) as any;

    const generatedImageUrl = imageResult.images?.[0]?.url || "";
    if (!generatedImageUrl)
      throw new Error("Step 1 failed: No image generated");
    console.log("[Video] Step 1 complete. Image URL:", generatedImageUrl);

    // ── Step 2: Convert image to video using motion prompt ─────────────────
    const finalVideoPrompt =
      videoMotionPrompt +
      " Real-time speed. Normal motion. Not slow motion. Natural dog movement speed.";
    console.log(
      "[Video] Step 2: Converting image to video with",
      model,
      `duration=${duration}s ...`,
    );

    let videoUrl = "";

    // Kling only supports "5" or "10" — map "8" → "10"
    const klingDuration = duration === "5" ? "5" : "10";

    if (model === "veo2-img2vid") {
      const videoResult = (await fal.run("fal-ai/veo2/image-to-video", {
        input: {
          image_url: generatedImageUrl,
          prompt: finalVideoPrompt,
          aspect_ratio: aspectRatio,
          duration: `${duration}s`,
        },
      })) as any;
      videoUrl =
        videoResult.video?.url || videoResult.video_url || videoResult.url || "";
    } else if (model === "kling-3-img2vid") {
      const videoResult = (await fal.run(
        "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
        {
          input: {
            image_url: generatedImageUrl,
            prompt: finalVideoPrompt,
            duration: klingDuration,
            aspect_ratio: aspectRatio,
          },
        },
      )) as any;
      videoUrl =
        videoResult.video?.url || videoResult.video_url || videoResult.url || "";
    } else if (model === "kling-img2vid") {
      const videoResult = (await fal.run(
        "fal-ai/kling-video/v1.6/pro/image-to-video",
        {
          input: {
            image_url: generatedImageUrl,
            prompt: finalVideoPrompt,
            duration: klingDuration,
            aspect_ratio: aspectRatio,
          },
        },
      )) as any;
      videoUrl =
        videoResult.video?.url || videoResult.video_url || videoResult.url || "";
    }

    if (!videoUrl) throw new Error("Step 2 failed: No video generated");
    console.log("[Video] Step 2 complete. Video URL:", videoUrl);

    // ── Save both to Supabase Storage ──────────────────────────────────────
    const imgFilename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const thumbnailUrl = await saveImageFromUrl(generatedImageUrl, imgFilename);

    const vidFilename = `video_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const permanentVideoUrl = await saveVideoFromUrl(videoUrl, vidFilename);

    return { videoUrl: permanentVideoUrl, thumbnailUrl, videoPrompt: videoMotionPrompt };
  } catch (error: any) {
    const errorBody =
      JSON.stringify(error?.body?.detail || error?.body || "") +
      (error?.message || "");
    console.error(
      `[Video] Pipeline error: status=${error?.status} msg=${error?.message}`,
    );
    if (
      error?.status === 403 ||
      errorBody.includes("Exhausted balance") ||
      errorBody.includes("locked") ||
      errorBody.includes("balance") ||
      errorBody.includes("credit")
    ) {
      throw new Error("CREDIT_EXHAUSTED:fal.ai");
    }
    throw error;
  }
}

export async function submitLoRATraining({
  imageUrls,
  triggerWord = "GUKDUNG",
}: {
  imageUrls: string[];
  triggerWord?: string;
}): Promise<{ requestId: string; zipUrl: string }> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const folder = zip.folder("images")!;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const ext = url.split(".").pop()?.split("?")[0] || "jpg";
      folder.file(`image_${String(i + 1).padStart(3, "0")}.${ext}`, buffer);
    } catch (err) {
      console.warn(`[LoRA] Failed to download image ${i + 1}:`, url);
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  const { uploadBufferToStorage } = await import("./storageService");
  const zipFilename = `lora_training_${Date.now()}.zip`;
  const zipUrl = await uploadBufferToStorage(
    zipBuffer,
    zipFilename,
    "application/zip",
    "training"
  );
  console.log(`[LoRA] ZIP uploaded to Supabase: ${zipUrl} (${imageUrls.length} images)`);

  const { request_id } = await fal.queue.submit("fal-ai/flux-lora-fast-training", {
    input: {
      images_data_url: zipUrl,
      trigger_word: triggerWord,
      steps: 1000,
      multiresolution_training: true,
    },
  });

  console.log(`[LoRA] Training submitted. requestId: ${request_id}`);
  return { requestId: request_id, zipUrl };
}

export async function checkLoRAStatus(requestId: string): Promise<{
  status: "in_queue" | "in_progress" | "completed" | "failed";
  loraModelId?: string;
  progress?: number;
  queuePosition?: number;
  currentStep?: number;
  totalSteps?: number;
}> {
  const status = await fal.queue.status("fal-ai/flux-lora-fast-training", {
    requestId,
    includeLogs: true,
  }) as any;

  const rawStatus: string = status?.status ?? "";

  if (rawStatus === "COMPLETED") {
    const result = await fal.queue.result("fal-ai/flux-lora-fast-training", {
      requestId,
    }) as any;
    const loraModelId =
      result.diffusers_lora_file?.url || result.lora_file?.url || "";
    console.log(`[LoRA] Training complete. Model ID: ${loraModelId}`);
    return { status: "completed", loraModelId, progress: 100 };
  }

  if (rawStatus === "FAILED") return { status: "failed" };

  if (rawStatus === "IN_PROGRESS") {
    // Parse logs to extract step progress: e.g. "500/1000" or "50%"
    const logs: Array<{ message: string }> = status?.logs ?? [];
    let progress: number | undefined;
    let currentStep: number | undefined;
    let totalSteps: number | undefined;

    for (let i = logs.length - 1; i >= 0; i--) {
      const msg = logs[i]?.message ?? "";
      // Pattern: "500/1000" (step/total)
      const stepMatch = msg.match(/(\d+)\s*\/\s*(\d+)/);
      if (stepMatch) {
        currentStep = parseInt(stepMatch[1], 10);
        totalSteps = parseInt(stepMatch[2], 10);
        if (totalSteps > 0) {
          progress = Math.round((currentStep / totalSteps) * 100);
        }
        break;
      }
      // Pattern: "50%" or "50.0%"
      const pctMatch = msg.match(/(\d+(?:\.\d+)?)\s*%/);
      if (pctMatch) {
        progress = Math.round(parseFloat(pctMatch[1]));
        break;
      }
    }

    if (progress !== undefined) {
      console.log(`[LoRA] Progress: ${progress}% (${currentStep}/${totalSteps})`);
    }

    return { status: "in_progress", progress, currentStep, totalSteps };
  }

  // IN_QUEUE
  const queuePosition: number | undefined = status?.queue_position ?? undefined;
  return { status: "in_queue", queuePosition };
}

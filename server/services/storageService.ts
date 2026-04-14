import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKETS = {
  images: "generated-images",
  videos: "generated-videos",
  uploads: "uploads",
  training: "training-images",
};

export async function ensureBucketsExist() {
  for (const [key, name] of Object.entries(BUCKETS)) {
    try {
      const { error } = await supabase.storage.getBucket(name);
      if (error && (error.message.includes("not found") || error.message.includes("does not exist"))) {
        const { error: createErr } = await supabase.storage.createBucket(name, {
          public: true,
          fileSizeLimit: key === "videos" ? 524288000 : 52428800,
        });
        if (createErr) {
          console.warn(`[Storage] Could not create bucket "${name}":`, createErr.message);
        } else {
          console.log(`[Storage] Created bucket: ${name}`);
        }
      }
    } catch (err: any) {
      console.warn(`[Storage] Bucket check failed for "${name}":`, err.message);
    }
  }
}

export async function uploadBufferToStorage(
  buffer: Buffer,
  filename: string,
  contentType: string,
  bucket: keyof typeof BUCKETS = "uploads"
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKETS[bucket])
    .upload(filename, buffer, { contentType, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKETS[bucket]).getPublicUrl(filename);
  return data.publicUrl;
}

export async function saveImageFromUrl(
  imageUrl: string,
  filename: string
): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    const { error } = await supabase.storage
      .from(BUCKETS.images)
      .upload(`${filename}.jpg`, uint8Array, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage
      .from(BUCKETS.images)
      .getPublicUrl(`${filename}.jpg`);

    return urlData.publicUrl;
  } catch (err: any) {
    console.error("[Storage] saveImageFromUrl error:", err.message);
    return imageUrl;
  }
}

export async function saveVideoFromUrl(
  videoUrl: string,
  filename: string
): Promise<string> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    const { error } = await supabase.storage
      .from(BUCKETS.videos)
      .upload(`${filename}.mp4`, uint8Array, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage
      .from(BUCKETS.videos)
      .getPublicUrl(`${filename}.mp4`);

    return urlData.publicUrl;
  } catch (err: any) {
    console.error("[Storage] saveVideoFromUrl error:", err.message);
    return videoUrl;
  }
}

export async function deleteFromStorage(url: string) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/storage/v1/object/public/");
    if (pathParts.length < 2) return;

    const fullPath = pathParts[1];
    const [bucket, ...fileParts] = fullPath.split("/");
    const filePath = fileParts.join("/");

    await supabase.storage.from(bucket).remove([filePath]);
    console.log(`[Storage] Deleted: ${fullPath}`);
  } catch (err: any) {
    console.error("[Storage] Delete failed:", err.message);
  }
}

export async function cleanupOldContent() {
  try {
    const { storage: db } = await import("../storage");
    const queue = await db.getMarketingQueue();
    const now = new Date();

    for (const item of queue) {
      const createdAt = new Date(item.createdAt ?? now);
      const daysSinceCreated =
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (item.status === "rejected" && daysSinceCreated > 7) {
        if (item.imageUrl) await deleteFromStorage(item.imageUrl);
        if (item.videoUrl) await deleteFromStorage(item.videoUrl);
        await db.deleteMarketingQueueItem(item.id);
        console.log(`[Cleanup] Deleted rejected item: ${item.id}`);
        continue;
      }

      const postedAt = item.postedAt ? new Date(item.postedAt) : null;
      if (item.status === "posted" && postedAt) {
        const daysSincePosted =
          (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePosted > 30) {
          if (item.imageUrl && item.imageUrl.includes("supabase")) {
            await deleteFromStorage(item.imageUrl);
            await db.updateMarketingQueueItem(item.id, { imageUrl: null });
          }
          if (item.videoUrl && item.videoUrl.includes("supabase")) {
            await deleteFromStorage(item.videoUrl);
            await db.updateMarketingQueueItem(item.id, { videoUrl: null });
          }
        }
      }
    }

    console.log("[Cleanup] Storage cleanup completed");
  } catch (err: any) {
    console.error("[Cleanup] Storage cleanup error:", err.message);
  }
}

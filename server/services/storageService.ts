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
  music: "brand-music",
};

export async function ensureBucketsExist() {
  for (const [key, name] of Object.entries(BUCKETS)) {
    try {
      const { error } = await supabase.storage.getBucket(name);
      if (error && (error.message.includes("not found") || error.message.includes("does not exist"))) {
        const fileSizeLimit =
          key === "videos" ? 52428800 :
          key === "music" ? 52428800 :
          52428800;
        const { error: createErr } = await supabase.storage.createBucket(name, {
          public: true,
          fileSizeLimit,
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

/**
 * Delete all URLs in slideUrls array from Storage. Returns count deleted.
 */
async function deleteSlideUrls(slideUrls: string[] | null | undefined): Promise<number> {
  if (!slideUrls || slideUrls.length === 0) return 0;
  let count = 0;
  for (const url of slideUrls) {
    if (!url) continue;
    await deleteFromStorage(url);
    count++;
  }
  return count;
}

export async function cleanupOldContent() {
  const stats = {
    rejectedDeleted: 0,
    failedDeleted: 0,
    slideUrlsPurged: 0,
    postedArchived: 0,
  };

  try {
    const { storage: db } = await import("../storage");
    const queue = await db.getMarketingQueue();
    const now = new Date();

    for (const item of queue) {
      const createdAt = new Date(item.createdAt ?? now);
      const daysSinceCreated =
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      // rejected → 7일 경과 시 완전 삭제
      if (item.status === "rejected" && daysSinceCreated > 7) {
        if (item.imageUrl) await deleteFromStorage(item.imageUrl);
        if (item.videoUrl) await deleteFromStorage(item.videoUrl);
        const purged = await deleteSlideUrls(item.slideUrls);
        stats.slideUrlsPurged += purged;
        await db.deleteMarketingQueueItem(item.id);
        stats.rejectedDeleted++;
        continue;
      }

      // failed → 14일 경과 시 완전 삭제
      if (item.status === "failed" && daysSinceCreated > 14) {
        if (item.imageUrl) await deleteFromStorage(item.imageUrl);
        if (item.videoUrl) await deleteFromStorage(item.videoUrl);
        const purged = await deleteSlideUrls(item.slideUrls);
        stats.slideUrlsPurged += purged;
        await db.deleteMarketingQueueItem(item.id);
        stats.failedDeleted++;
        continue;
      }

      // posted → 30일 경과 시 Storage 파일만 아카이브 (DB row 유지)
      // NOTE: 현재 postedAt을 세팅하는 경로가 없음 (Phase 2.8 Meta Graph 연동 전).
      // Meta 연동 후 자동 활성화됨.
      const postedAt = item.postedAt ? new Date(item.postedAt) : null;
      if (item.status === "posted" && postedAt) {
        const daysSincePosted =
          (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePosted > 30) {
          const updates: Record<string, any> = {};
          if (item.imageUrl && item.imageUrl.includes("supabase")) {
            await deleteFromStorage(item.imageUrl);
            updates.imageUrl = null;
          }
          if (item.videoUrl && item.videoUrl.includes("supabase")) {
            await deleteFromStorage(item.videoUrl);
            updates.videoUrl = null;
          }
          if (item.slideUrls && item.slideUrls.length > 0) {
            const purged = await deleteSlideUrls(item.slideUrls);
            stats.slideUrlsPurged += purged;
            updates.slideUrls = null;
          }
          if (Object.keys(updates).length > 0) {
            await db.updateMarketingQueueItem(item.id, updates);
            stats.postedArchived++;
          }
        }
      }
    }

    console.log("[Cleanup] Storage cleanup completed:", stats);
  } catch (err: any) {
    console.error("[Cleanup] Storage cleanup error:", err.message);
  }

  return stats;
}

export type StorageUsage = {
  bucket: string;
  fileCount: number;
  totalBytes: number;
};

/**
 * Returns per-bucket file count + total bytes. Iterates with pagination to
 * survive large buckets. Lists at the root only — subfolders are flattened via
 * search with empty prefix (Supabase list includes nested files when prefix="").
 */
export async function getStorageUsage(): Promise<StorageUsage[]> {
  const results: StorageUsage[] = [];

  for (const [, bucketName] of Object.entries(BUCKETS)) {
    let fileCount = 0;
    let totalBytes = 0;
    let offset = 0;
    const limit = 1000;

    try {
      while (true) {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .list("", { limit, offset });

        if (error) {
          console.warn(`[Storage usage] Bucket "${bucketName}" list error:`, error.message);
          break;
        }
        if (!data || data.length === 0) break;

        for (const f of data) {
          // Skip directory markers (id=null and no metadata)
          if (!f.id && !f.metadata) continue;
          const size = (f.metadata as any)?.size;
          if (typeof size === "number") {
            totalBytes += size;
            fileCount++;
          }
        }

        if (data.length < limit) break;
        offset += limit;
      }
    } catch (err: any) {
      console.warn(`[Storage usage] Bucket "${bucketName}" failed:`, err.message);
    }

    results.push({ bucket: bucketName, fileCount, totalBytes });
  }

  return results;
}

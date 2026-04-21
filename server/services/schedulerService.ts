import cron from "node-cron";
import { storage } from "../storage";
import { generateMarketingContent } from "./claudeMarketingService";
import type { ContentScheduleItem } from "@shared/schema";

function getSydneyDateStr(): string {
  const now = new Date();
  const parts = now.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" }); // YYYY-MM-DD
  return parts;
}

function getSydneyTime(): string {
  return new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney", hour12: false });
}

/**
 * Generates Claude copy for a single schedule item and creates (or reuses)
 * a marketing_queue row. Sets schedule_item.status to "generated" and links queueItemId.
 *
 * Returns the queue item id on success. Throws on failure — caller is responsible
 * for setting status to "failed" and recording rejectionReason if needed.
 *
 * Idempotent: if the item already has queueItemId, returns it without regeneration.
 */
export async function generateCopyForScheduleItem(
  scheduleItem: ContentScheduleItem
): Promise<string> {
  if (scheduleItem.queueItemId) {
    return scheduleItem.queueItemId;
  }

  await storage.updateScheduleItem(scheduleItem.id, { status: "generating" });

  const topic =
    scheduleItem.topic ||
    scheduleItem.description ||
    scheduleItem.theme ||
    "국둥이 일상";

  const result = await generateMarketingContent({
    topic,
    platform: scheduleItem.platform,
    contentType: scheduleItem.contentType,
    additionalInstructions: scheduleItem.description || "",
  });

  const fullImagePrompt = result.imagePrompt
    ? result.imagePrompt +
      (result.imageGuidelines
        ? `\n\n=== STYLE GUIDELINES ===\n${result.imageGuidelines}`
        : "")
    : "";

  const queueItem = await storage.createMarketingQueueItem({
    platform: scheduleItem.platform,
    contentType: scheduleItem.contentType,
    caption: result.caption,
    hashtags: result.hashtags,
    imagePrompt: fullImagePrompt,
    topic,
    status: "approved", // ready for image generation
    scheduledAt: new Date(scheduleItem.scheduledDate),
  });

  await storage.updateScheduleItem(scheduleItem.id, {
    status: "generated",
    queueItemId: queueItem.id,
  });

  return queueItem.id;
}

async function processScheduledItems() {
  const todayStr = getSydneyDateStr();
  const [yearStr, monthStr] = todayStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  console.log(`[Scheduler] Running for ${todayStr} (Sydney: ${getSydneyTime()})`);

  const items = await storage.getScheduleItems(year, month);
  const todayApproved = items.filter(
    (i) => i.scheduledDate === todayStr && i.status === "approved"
  );

  if (todayApproved.length === 0) {
    console.log("[Scheduler] No approved items for today");
    return;
  }

  console.log(`[Scheduler] Processing ${todayApproved.length} items`);

  for (const scheduleItem of todayApproved) {
    try {
      const queueItemId = await generateCopyForScheduleItem(scheduleItem);
      console.log(
        `[Scheduler] Created queue item ${queueItemId} for schedule ${scheduleItem.id} (${scheduleItem.platform}/${scheduleItem.contentType})`
      );
    } catch (err: any) {
      console.error(
        `[Scheduler] Failed to process schedule item ${scheduleItem.id}:`,
        err.message
      );
      await storage.updateScheduleItem(scheduleItem.id, { status: "failed" });
    }
  }

  console.log("[Scheduler] Daily processing complete");
}

export function startScheduler() {
  // Run daily at 6:00 AM Sydney time
  const schedule = "0 6 * * *";

  cron.schedule(schedule, async () => {
    console.log("[Scheduler] Cron triggered");
    try {
      await processScheduledItems();
    } catch (err: any) {
      console.error("[Scheduler] Cron error:", err.message);
    }
  }, {
    timezone: "Australia/Sydney",
  });

  console.log("[Scheduler] Started — runs daily at 06:00 Sydney time");
}

export { processScheduledItems };

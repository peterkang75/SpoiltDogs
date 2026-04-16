import cron from "node-cron";
import { storage } from "../storage";
import { generateMarketingContent } from "./claudeMarketingService";

function getSydneyDateStr(): string {
  const now = new Date();
  const parts = now.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" }); // YYYY-MM-DD
  return parts;
}

function getSydneyTime(): string {
  return new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney", hour12: false });
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
      // Mark as generating
      await storage.updateScheduleItem(scheduleItem.id, { status: "generating" });

      // Generate marketing content (caption, hashtags, imagePrompt)
      const topic = scheduleItem.topic || scheduleItem.description || scheduleItem.theme || "국둥이 일상";
      const result = await generateMarketingContent({
        topic,
        platform: scheduleItem.platform,
        contentType: scheduleItem.contentType,
        additionalInstructions: scheduleItem.description || "",
      });

      // Build full image prompt with guidelines
      const fullImagePrompt = result.imagePrompt
        ? result.imagePrompt +
          (result.imageGuidelines
            ? `\n\n=== STYLE GUIDELINES ===\n${result.imageGuidelines}`
            : "")
        : "";

      // Create marketing queue item
      const queueItem = await storage.createMarketingQueueItem({
        platform: scheduleItem.platform,
        contentType: scheduleItem.contentType,
        caption: result.caption,
        hashtags: result.hashtags,
        imagePrompt: fullImagePrompt,
        topic,
        status: "approved", // auto-approved, ready for image generation
        scheduledAt: new Date(scheduleItem.scheduledDate),
      });

      // Link schedule item to queue item
      await storage.updateScheduleItem(scheduleItem.id, {
        status: "generated",
        queueItemId: queueItem.id,
      });

      console.log(
        `[Scheduler] Created queue item ${queueItem.id} for schedule ${scheduleItem.id} (${scheduleItem.platform}/${scheduleItem.contentType}: "${topic}")`
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
  // Sydney is UTC+10 (AEST) or UTC+11 (AEDT)
  // We use node-cron with timezone support
  const schedule = "0 6 * * *"; // 6:00 AM every day

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

// Manual trigger for testing
export { processScheduledItems };

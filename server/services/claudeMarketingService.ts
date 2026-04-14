import Anthropic from "@anthropic-ai/sdk";
import { storage } from "../storage";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CONTENT_TYPE_GUIDE: Record<string, string> = {
  feed_image:
    "피드 이미지 (1:1 정방형) — 캡션은 임팩트 있는 첫 줄로 시작, 중간 본문, 해시태그 순서로 작성. 이모지 자연스럽게 활용.",
  story_image:
    "스토리 이미지 (9:16 세로형) — 캡션은 짧고 강렬하게. 스와이프 유도 문구 포함 권장.",
  reel: "릴스/영상 (9:16 세로형) — 캡션은 첫 1-2줄이 핵심. 영상 내용을 보완하는 텍스트. 댓글/공유 유도 문구 포함.",
  card_news:
    "카드뉴스 (텍스트 포함 이미지) — 캡션은 카드 내용을 요약. imagePrompt에는 각 슬라이드 텍스트 내용도 포함할 것.",
  tiktok:
    "틱톡 영상 — 캡션은 짧고 트렌디하게. 틱톡 특유의 캐주얼한 톤 유지. 관련 틱톡 해시태그 포함.",
};

const ASPECT_RATIO_HINT: Record<string, string> = {
  feed_image: "square format, 1:1 ratio",
  story_image: "vertical format, 9:16 ratio",
  reel: "vertical format, 9:16 ratio",
  card_news: "square format, include text overlay area",
  tiktok: "vertical format, 9:16 ratio",
};

export async function generateMarketingContent({
  topic,
  platform,
  promptText,
  contentType = "feed_image",
  additionalInstructions = "",
  attachedImageUrls = [],
}: {
  topic: string;
  platform: string;
  promptText?: string;
  contentType?: string;
  additionalInstructions?: string;
  attachedImageUrls?: string[];
}): Promise<{
  caption: string;
  hashtags: string;
  imagePrompt: string;
  imageGuidelines: string;
}> {
  const brandContextItems = await storage.getBrandContextItems();
  const activeItems = brandContextItems.filter((item) => item.isActive);

  const gukdungProfile = activeItems
    .filter((i) => i.type === "gukdung_profile")
    .map((i) => `[${i.title}]\n${i.content}`)
    .join("\n\n");

  const brandVoice = activeItems
    .filter((i) => i.type === "brand_voice")
    .map((i) => `[${i.title}]\n${i.content}`)
    .join("\n\n");

  const campaignMemory = activeItems
    .filter((i) => i.type === "campaign_memory")
    .map((i) => `[${i.title}]\n${i.content}`)
    .join("\n\n");

  const postGuidelines = activeItems
    .filter((i) => i.type === "post_guideline")
    .map((i) => `[${i.title}]\n${i.content}`)
    .join("\n\n");

  // image_guideline is NOT passed to Claude — it goes directly to FAL.AI
  const imageGuidelines = activeItems
    .filter((i) => i.type === "image_guideline")
    .map((i) => `[${i.title}]\n${i.content}`)
    .join("\n\n");

  const contentTypeInstruction =
    CONTENT_TYPE_GUIDE[contentType] ?? CONTENT_TYPE_GUIDE["feed_image"];
  const aspectRatioHint =
    ASPECT_RATIO_HINT[contentType] ?? ASPECT_RATIO_HINT["feed_image"];

  const systemPrompt = `You are the senior copywriter for "Spoilt Dogs", a premium Australian pet boutique.

== BRAND VOICE ==
${brandVoice || "Warm, witty, premium Australian tone. Use emojis naturally."}

== GUKDUNG PROFILE ==
${gukdungProfile || "Gukdung is the brand dog — loveable, spoilt, and full of personality."}

${campaignMemory ? `== CAMPAIGN MEMORY ==\n${campaignMemory}` : ""}
${postGuidelines ? `== POST GUIDELINES ==\n${postGuidelines}` : ""}
${promptText ? `== ADDITIONAL TONE INSTRUCTION ==\n${promptText}` : ""}

== CONTENT TYPE ==
${contentTypeInstruction}

You must respond ONLY with a valid JSON object. No markdown, no explanation, no code blocks. Start directly with {
{
  "caption": "the full post caption with emojis",
  "hashtags": "#tag1 #tag2 #tag3",
  "imagePrompt": "detailed English prompt for AI image generation featuring Gukdung in the scene — include aspect ratio: ${aspectRatioHint}"
}`;

  const attachmentContext =
    attachedImageUrls.length > 0
      ? `\n\nAttached media (${attachedImageUrls.length} file(s)): ${attachedImageUrls.join(", ")}\nWrite the caption based on this actual content — describe what's happening in the attached photo/video. Do NOT generate an imagePrompt; set imagePrompt to empty string "" since the real photo will be used instead.`
      : "";

  const userMessage = `Create a ${platform} post about: ${topic}${attachmentContext}${additionalInstructions ? `\n\nAdditional instructions: ${additionalInstructions}` : ""}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: userMessage }],
    system: systemPrompt,
  });

  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("");

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      caption: responseText,
      hashtags: "",
      imagePrompt: "",
      imageGuidelines,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      caption: parsed.caption || responseText,
      hashtags: parsed.hashtags || "",
      imagePrompt: parsed.imagePrompt || "",
      imageGuidelines,
    };
  } catch {
    return {
      caption: responseText,
      hashtags: "",
      imagePrompt: "",
      imageGuidelines,
    };
  }
}

// ── Caption → Video Motion Prompt Converter ───────────────────────────────────
export async function convertCaptionToVideoPrompt({
  caption,
  gukdungProfile,
  imageGuidelines,
}: {
  caption: string;
  gukdungProfile?: string;
  imageGuidelines?: string;
}): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    system: `You are an AI video prompt engineer.
Convert Instagram captions into concise video generation prompts for Veo 2 image-to-video model.

Rules:
- Focus on MOTION and MOVEMENT only
- Describe what the dog is physically doing
- ALWAYS start with: "Real-time speed, normal motion, not slow motion."
- ALWAYS include: handheld camera, natural realistic movement
- ALWAYS end with: "Normal playback speed. No cinematic slow motion."
- Keep under 100 words
- No marketing language, no emojis
- Output ONLY the prompt, nothing else

${gukdungProfile ? `Dog profile: ${gukdungProfile}` : ""}
${imageGuidelines ? `Visual style: ${imageGuidelines}` : ""}`,
    messages: [
      {
        role: "user",
        content: `Convert this Instagram caption into a video motion prompt:\n\n${caption}`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("");

  return text.trim();
}

import Anthropic from "@anthropic-ai/sdk";
import { storage } from "../storage";
import { MOOD_VALUES, MOOD_DESCRIPTIONS, normalizeMood, type Mood } from "@shared/moods";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CONTENT_TYPE_GUIDE: Record<string, string> = {
  feed_image:
    "피드 이미지 (1:1 정방형) — 캡션은 임팩트 있는 첫 줄로 시작, 중간 본문, 해시태그 순서로 작성. 이모지 자연스럽게 활용.",
  story_image:
    "스토리 이미지 (9:16 세로형) — 캡션은 짧고 강렬하게. 스와이프 유도 문구 포함 권장.",
  reel: "릴스/영상 (9:16 세로형) — 캡션은 첫 1-2줄이 핵심. 영상 내용을 보완하는 텍스트. 댓글/공유 유도 문구 포함.",
  motion_reel:
    "모션 릴스 (9:16 세로형) — AI 이미지 + Ken Burns 모션 + AIDA 텍스트 오버레이. 캡션은 AIDA 구조 (Attention→Interest→Desire→Action)를 자연스럽게 녹인 80-150자. imagePrompt는 세로형 배경 이미지 묘사.",
  card_news:
    "카드뉴스 (텍스트 포함 이미지) — 캡션은 카드 내용을 요약. imagePrompt에는 각 슬라이드 텍스트 내용도 포함할 것.",
  tiktok:
    "틱톡 영상 — 캡션은 짧고 트렌디하게. 틱톡 특유의 캐주얼한 톤 유지. 관련 틱톡 해시태그 포함.",
};

const ASPECT_RATIO_HINT: Record<string, string> = {
  feed_image: "square format, 1:1 ratio",
  story_image: "vertical format, 9:16 ratio",
  reel: "vertical format, 9:16 ratio",
  motion_reel: "vertical format, 9:16 ratio, leave bottom 40% visually simple for text overlay",
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
  mood: Mood;
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

== MOOD CLASSIFICATION ==
Also classify this post's overall emotional mood. Pick exactly ONE from this Korean controlled vocabulary (music library uses same tags for track selection):
${MOOD_VALUES.map((m) => `- "${m}" — ${MOOD_DESCRIPTIONS[m]}`).join("\n")}

You must respond ONLY with a valid JSON object. No markdown, no explanation, no code blocks. Start directly with {
{
  "caption": "the full post caption with emojis",
  "hashtags": "#tag1 #tag2 #tag3",
  "imagePrompt": "detailed English prompt for AI image generation featuring Gukdung in the scene — include aspect ratio: ${aspectRatioHint}",
  "mood": "one of: ${MOOD_VALUES.join(" | ")}"
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
      mood: normalizeMood(undefined),
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      caption: parsed.caption || responseText,
      hashtags: parsed.hashtags || "",
      imagePrompt: parsed.imagePrompt || "",
      imageGuidelines,
      mood: normalizeMood(parsed.mood),
    };
  } catch {
    return {
      caption: responseText,
      hashtags: "",
      imagePrompt: "",
      imageGuidelines,
      mood: normalizeMood(undefined),
    };
  }
}

// ── Mood classifier for already-generated captions ──────────────────────────
// Used by regenerate flow when we need to re-derive mood without regenerating caption.
// Kept separate from generateMarketingContent so the two endpoints share vocabulary
// but avoid full copy re-generation cost.
export async function classifyMoodFromCaption({
  caption,
  topic,
  contentType,
}: {
  caption: string;
  topic?: string;
  contentType?: string;
}): Promise<Mood> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Classify the emotional mood of this Instagram post about "${topic || contentType || "pet brand"}".

Caption:
${caption}

Pick exactly ONE Korean mood tag:
${MOOD_VALUES.map((m) => `- "${m}" — ${MOOD_DESCRIPTIONS[m]}`).join("\n")}

Respond with ONLY the Korean tag (e.g., 따뜻함). No quotes, no explanation.`,
        },
      ],
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("")
      .trim();
    return normalizeMood(text);
  } catch (err: any) {
    console.warn("[Mood] classify failed:", err.message);
    return normalizeMood(undefined);
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
Convert Instagram captions into concise video generation prompts for image-to-video models (Kling/Veo2).

Rules:
- Focus on MOTION and MOVEMENT only
- Describe what the dog is physically doing
- ALWAYS start with: "Real-time speed, normal motion, not slow motion."
- ALWAYS include: handheld camera, natural realistic movement
- ALWAYS end with: "Normal playback speed. No cinematic slow motion."
- Keep under 100 words
- No marketing language, no emojis
- Output ONLY the prompt, nothing else

FORBIDDEN MOTIONS — these produce obvious AI artifacts, NEVER describe them:
- Mouth opening/closing with an object in it (chewing, eating, licking a treat, swallowing)
- Food or objects dropping from the mouth, food morphing, food appearing/disappearing
- Tongue extending or retracting, teeth showing in motion
- Barking, yawning, panting that shows deep inside the mouth
- Any action requiring inside-mouth anatomy to animate

Even if the caption mentions "씹는", "먹는", "핥는", "간식", "입에", "물고" — REFRAME the motion
into a safe alternative that keeps the mouth closed or motionless. Example:
"dog chewing on a treat" → "dog sitting calmly, ears twitching, tail wagging gently"
"dog licking lips" → "dog blinking slowly, head tilting to one side"

SAFE MOTION VOCABULARY — build prompts from these:
- Tail wagging, ears twitching or perking up, head tilting, slow blinking
- Gentle walking or stepping, looking up / looking around / turning head
- Fur rustling in breeze, light head bob, chest breathing
- Sitting down, lying down slowly, stretching front legs
- Eyes following something off-screen, nose gently sniffing air (mouth closed)

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

// ── AIDA Script Generator for Motion Reels ──────────────────────────────────
export interface AIDAScript {
  attention: string;
  interest: string;
  desire: string;
  action: string;
  suggestedMotion?: "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "tilt-up";
  sceneHints?: [string, string, string, string];
}

export async function generateAIDAScript({
  caption,
  topic,
  brandVoice,
  postGuidelines,
}: {
  caption: string;
  topic?: string;
  brandVoice?: string;
  postGuidelines?: string;
}): Promise<AIDAScript> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 800,
    system: `You write AIDA-structured text overlays for Instagram Reels.
Target: Australian 30-40s premium pet owners.
Brand tone: Quiet Confidence — understated, observational, no hard sell.
Reference brands: Aesop, Bellroy, Frank Body.

Rules:
- Each step is displayed as a TEXT OVERLAY on a 20-second Reel (5 seconds each)
- Keep each step SHORT — max 2 lines on screen (under 80 characters)
- Language: English (Australian English)
- No emojis, no exclamation marks, no ALL CAPS
- No Korean, no educational tone, no "Did you know" patterns
- Attention: observational hook, quiet confidence
- Interest: empathy, "this brand gets me" feeling
- Desire: sensory, scene-based — show the after, not the features
- Action: gentle invitation, never pushy

${brandVoice ? `\nBrand voice:\n${brandVoice}` : ""}
${postGuidelines ? `\nPost guidelines:\n${postGuidelines}` : ""}

Also pick the best camera motion effect for this content's mood:
- "zoom-in": slow zoom into subject — contemplative, focused, intimate
- "zoom-out": reveal the full scene — expansive, storytelling, dramatic reveal
- "pan-right": horizontal sweep left→right — journey, progression, discovery
- "pan-left": horizontal sweep right→left — retrospective, returning, nostalgic
- "tilt-up": vertical sweep bottom→top — aspirational, uplifting, grand

Also generate 4 short image scene descriptions (sceneHints) for multi-image reels.
Each hint describes a subtle ATMOSPHERIC VARIATION of the SAME scene — same subject, same setting, but different mood/lighting/angle.
Example: if the topic is "morning walk", hints could be:
  1. "golden sunrise light filtering through trees, dog looking ahead on path"
  2. "soft morning mist, dog sniffing wildflowers by the trail"
  3. "warm sunlight on dewy grass, dog mid-stride with ears perked"
  4. "gentle backlight silhouette, dog pausing to look back at owner"

IMPORTANT — these images will be animated as video. NEVER describe the dog with
food or objects in the mouth, mouth open, tongue out, or mid-chew. The dog's
mouth must be closed or neutral in every scene. Reframe food-related topics as
lifestyle moments: instead of "dog chewing treat on couch", use "dog resting on
couch with treat placed on the floor nearby".

Return ONLY valid JSON, no markdown. Start with {`,
    messages: [
      {
        role: "user",
        content: `Create AIDA text overlays for a Motion Reel about: ${topic || caption}

Caption context: ${caption}

Return JSON:
{
  "attention": "hook text (max 80 chars)",
  "interest": "empathy text (max 80 chars)",
  "desire": "sensory desire text (max 80 chars)",
  "action": "gentle CTA text (max 60 chars)",
  "suggestedMotion": "one of: zoom-in, zoom-out, pan-left, pan-right, tilt-up",
  "sceneHints": ["scene 1 desc", "scene 2 desc", "scene 3 desc", "scene 4 desc"]
}`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      attention: "Some moments speak for themselves.",
      interest: "The quiet details that make all the difference.",
      desire: "Crafted for dogs who deserve the finer things.",
      action: "Discover more. Link in bio.",
    };
  }

  const validMotions = ["zoom-in", "zoom-out", "pan-left", "pan-right", "tilt-up"] as const;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const hints = Array.isArray(parsed.sceneHints) && parsed.sceneHints.length === 4
      ? parsed.sceneHints as [string, string, string, string]
      : undefined;
    return {
      attention: parsed.attention || "Some moments speak for themselves.",
      interest: parsed.interest || "The quiet details that make all the difference.",
      desire: parsed.desire || "Crafted for dogs who deserve the finer things.",
      action: parsed.action || "Discover more. Link in bio.",
      suggestedMotion: validMotions.includes(parsed.suggestedMotion) ? parsed.suggestedMotion : "zoom-in",
      sceneHints: hints,
    };
  } catch {
    return {
      attention: "Some moments speak for themselves.",
      interest: "The quiet details that make all the difference.",
      desire: "Crafted for dogs who deserve the finer things.",
      action: "Discover more. Link in bio.",
    };
  }
}

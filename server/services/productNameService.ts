import Anthropic from "@anthropic-ai/sdk";

export interface PolishInput {
  rawName: string;
  rawDescription?: string | null;
  supplierCategory?: string | null;
  supplierName?: string | null;
}

export interface PolishOutput {
  name: string;
  description: string;
}

const SYSTEM = `You rewrite raw dropshipping product titles and descriptions in the SpoiltDogs voice.

SpoiltDogs is a premium Australian dog boutique with Korean roots. The brand voice is "Quiet Confidence" — references: Aesop, Bellroy, Frank Body. Calm, precise, observational. Never marketing-shouty.

Rules for the product name:
- English. Title Case.
- 3 to 7 words, max 55 characters.
- Strip supplier prefixes (NNEDSZ, OEM codes, brand names like CJPACKET).
- Strip generic stuffing ("Pet", "for Cats and Dogs and Pets") unless it carries real meaning.
- Keep one concrete differentiator (material, capacity, function), drop the rest.
- No exclamation marks. No ALL CAPS. No "Premium" / "Best" / "High Quality" filler.
- Do not invent specs that are not implied by the source.

Rules for the description:
- 1 to 2 sentences. 25 to 60 words total.
- English, calm and observational. Sentence case.
- Lead with the function or use moment, not the product category.
- Do not start with "Hi", "Hey", or any direct address.
- No emojis. No exclamation marks. No "perfect for", "must-have", "amazing".
- Keep one concrete spec (capacity, material, size) if available.

Return ONLY valid JSON in this exact shape, no prose, no code fences:
{"name": "...", "description": "..."}`;

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 400;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

function buildUserPrompt(input: PolishInput): string {
  const parts: string[] = [];
  parts.push(`Original name: ${input.rawName}`);
  if (input.rawDescription) {
    const trimmed = input.rawDescription.length > 1500
      ? input.rawDescription.slice(0, 1500) + "..."
      : input.rawDescription;
    parts.push(`Original description: ${trimmed}`);
  }
  if (input.supplierCategory) parts.push(`Supplier category: ${input.supplierCategory}`);
  if (input.supplierName) parts.push(`Supplier: ${input.supplierName}`);
  parts.push("");
  parts.push("Rewrite name and description per the rules. Return JSON only.");
  return parts.join("\n");
}

function extractJson(text: string): { name?: unknown; description?: unknown } | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < 0 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function clampName(name: string, fallback: string): string {
  const trimmed = name.trim().replace(/^[\-•\s"']+|[\-\s"']+$/g, "");
  if (!trimmed) return fallback;
  if (trimmed.length <= 60) return trimmed;
  return trimmed.slice(0, 57).trimEnd() + "...";
}

function clampDescription(desc: string, fallback: string): string {
  const trimmed = desc.trim();
  if (!trimmed) return fallback;
  if (trimmed.length <= 400) return trimmed;
  return trimmed.slice(0, 397).trimEnd() + "...";
}

export async function polishProductCopy(input: PolishInput): Promise<PolishOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });
  const text = response.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");

  const parsed = extractJson(text);
  if (!parsed) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const fallbackName = input.rawName;
  const fallbackDesc = input.rawDescription || "";
  const name = typeof parsed.name === "string"
    ? clampName(parsed.name, fallbackName)
    : fallbackName;
  const description = typeof parsed.description === "string"
    ? clampDescription(parsed.description, fallbackDesc)
    : fallbackDesc;

  return { name, description };
}

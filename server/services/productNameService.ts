import Anthropic from "@anthropic-ai/sdk";

export interface CategoryChoice {
  id: string;
  name: string;
  slug: string;
}

export interface PolishInput {
  rawName: string;
  rawDescription?: string | null;
  supplierCategory?: string | null;
  supplierName?: string | null;
  availableCategories?: CategoryChoice[];
}

export interface PolishOutput {
  name: string;
  description: string;
  categoryId: string | null;
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

Rules for the category:
- If the user provides a "Categories" list, choose exactly one whose product clearly fits.
- Match by what the product *is*, not what it's made of (a wool dog bed is "Beds & Furniture", not "Apparel").
- If no listed category is a clear fit, return null. Never invent a category.
- Use the categoryId value (UUID) from the list, not the name.
- If no Categories list is provided, return null for categoryId.

Return ONLY valid JSON in this exact shape, no prose, no code fences:
{"name": "...", "description": "...", "categoryId": "<uuid-or-null>"}`;

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
  if (input.supplierCategory) parts.push(`Supplier category hint: ${input.supplierCategory}`);
  if (input.supplierName) parts.push(`Supplier: ${input.supplierName}`);
  if (input.availableCategories && input.availableCategories.length > 0) {
    parts.push("");
    parts.push("Categories (choose one categoryId or null):");
    for (const c of input.availableCategories) {
      parts.push(`- ${c.id}  ${c.name}  (slug: ${c.slug})`);
    }
  }
  parts.push("");
  parts.push("Rewrite name and description per the rules and classify into one of the listed categories. Return JSON only.");
  return parts.join("\n");
}

function extractJson(text: string): { name?: unknown; description?: unknown; categoryId?: unknown } | null {
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

  let categoryId: string | null = null;
  if (typeof parsed.categoryId === "string" && input.availableCategories) {
    const valid = input.availableCategories.some(c => c.id === parsed.categoryId);
    if (valid) categoryId = parsed.categoryId;
  }

  return { name, description, categoryId };
}

// Last-resort matcher used when the AI call fails. Mirrors the client's
// matchSupplierCategory: case-insensitive name/slug/token containment.
export function matchCategoryByName(
  supplierCat: string | null | undefined,
  categories: CategoryChoice[],
): CategoryChoice | null {
  const raw = (supplierCat || "").toLowerCase().trim();
  if (!raw) return null;
  const tokens = raw.split(/[^a-z0-9]+/).filter(t => t.length >= 3);
  for (const c of categories) {
    const name = c.name.toLowerCase();
    const slug = c.slug.toLowerCase();
    if (raw.includes(name) || name.includes(raw)) return c;
    if (raw.includes(slug) || slug.includes(raw)) return c;
    if (tokens.some(t => name.includes(t) || slug.includes(t))) return c;
  }
  return null;
}

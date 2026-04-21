import { storage } from "../storage";
import { MOOD_FALLBACK, normalizeMood, type Mood } from "@shared/moods";

export type SelectedTrack = {
  trackId: string;
  title: string;
  url: string;
  durationSec: number;
  mood: Mood;
  matchedExactMood: boolean;
};

type MusicMeta = {
  url: string;
  mood: string;
  durationSec: number;
  fileName?: string;
  sizeBytes?: number;
  lastUsedAt?: string;
};

type Candidate = {
  id: string;
  title: string;
  meta: MusicMeta;
  lastUsedTs: number;
};

function parseMeta(raw: string | null | undefined): MusicMeta | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MusicMeta;
  } catch {
    return null;
  }
}

function loadCandidates(
  items: Awaited<ReturnType<typeof storage.getBrandContextByType>>
): Candidate[] {
  const out: Candidate[] = [];
  for (const item of items) {
    if (!item.isActive) continue;
    const meta = parseMeta(item.content);
    if (!meta || !meta.url) continue;
    const ts = meta.lastUsedAt ? new Date(meta.lastUsedAt).getTime() : 0;
    out.push({
      id: item.id,
      title: item.title ?? "Untitled",
      meta,
      lastUsedTs: Number.isFinite(ts) ? ts : 0,
    });
  }
  return out;
}

function pickLru(candidates: Candidate[]): Candidate {
  // Oldest lastUsedTs wins. Ties broken by trackId for deterministic output.
  return [...candidates].sort((a, b) => {
    if (a.lastUsedTs !== b.lastUsedTs) return a.lastUsedTs - b.lastUsedTs;
    return a.id.localeCompare(b.id);
  })[0];
}

/**
 * Select one brand music track for a given post mood.
 *
 * Contract (per user spec):
 * - Match active tracks whose mood === postMood
 * - If none match, fall back to `따뜻함`. If that also has nothing,
 *   fall back to ANY active track. Never return null.
 * - On multiple candidates, pick the least-recently-used (lastUsedAt).
 * - Update lastUsedAt on the selected track so the next call rotates.
 *
 * Returns null ONLY when the library has zero active tracks — caller must
 * surface an error since user policy forbids publishing silent reels.
 */
export async function selectBrandMusicForMood(
  postMood: string
): Promise<SelectedTrack | null> {
  const mood = normalizeMood(postMood);
  const items = await storage.getBrandContextByType("brand_music");
  const all = loadCandidates(items);

  if (all.length === 0) return null;

  let pool = all.filter((c) => c.meta.mood === mood);
  let matchedExactMood = pool.length > 0;

  if (pool.length === 0 && mood !== MOOD_FALLBACK) {
    pool = all.filter((c) => c.meta.mood === MOOD_FALLBACK);
  }
  if (pool.length === 0) {
    pool = all;
  }

  const chosen = pickLru(pool);

  const updatedMeta: MusicMeta = {
    ...chosen.meta,
    lastUsedAt: new Date().toISOString(),
  };
  try {
    await storage.updateBrandContextItem(chosen.id, {
      content: JSON.stringify(updatedMeta),
    });
  } catch (err: any) {
    console.warn("[BrandMusic] lastUsedAt update failed:", err.message);
  }

  return {
    trackId: chosen.id,
    title: chosen.title,
    url: chosen.meta.url,
    durationSec: chosen.meta.durationSec ?? 0,
    mood: normalizeMood(chosen.meta.mood),
    matchedExactMood,
  };
}

// Controlled vocabulary for brand music mood tags.
// Used by:
//   - client: music library upload/edit dropdown (admin-brand-studio)
//   - server: Claude caption generation output + music selector matching
// Values are Korean; stored as-is in brand_context.content.mood and classified
// by Claude as post mood. Never add/remove without migrating existing tags.

export const MOOD_VALUES = [
  "발랄함",
  "따뜻함",
  "차분함",
  "신나는",
  "포근함",
  "당당함",
  "아련함",
  "명랑함",
] as const;

export type Mood = (typeof MOOD_VALUES)[number];

export const MOOD_FALLBACK: Mood = "따뜻함";

export const MOOD_DESCRIPTIONS: Record<Mood, string> = {
  발랄함: "활기찬 장난, 점프, 러닝",
  따뜻함: "가족·교감·사랑스러운 장면",
  차분함: "휴식, 조용한 관찰, 산책",
  신나는: "파티, 생일, 이벤트, 축하",
  포근함: "실내, 수면, 낮잠, 담요",
  당당함: "프리미엄 제품 소개, 브랜드 자랑",
  아련함: "추억, 성장 스토리, 회상",
  명랑함: "일상 브이로그, 가벼운 유머",
};

export function isValidMood(v: unknown): v is Mood {
  return typeof v === "string" && (MOOD_VALUES as readonly string[]).includes(v);
}

export function normalizeMood(v: unknown): Mood {
  return isValidMood(v) ? v : MOOD_FALLBACK;
}

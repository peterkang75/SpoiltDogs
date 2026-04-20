# SpoiltDogs — Build Plan & Change Log

## Stack (as of 2026-04-20)
- React 18 + Vite + Express 5 (NOT Next.js)
- Routing: wouter | Styling: Tailwind + shadcn/ui | Icons: Lucide React
- Hosting: Railway (Nixpacks → `node dist/index.cjs`, port 8080). Domain `spoiltdogs.com.au` via CrazyDomains + Cloudflare DNS.
- DB: Supabase Postgres (pooler) via Drizzle ORM
- Auth: Supabase Auth
- Payments: Stripe (keys via env vars, no Replit sync) + Afterpay
- AI: Claude (claude-sonnet-4-5), FAL.AI (nano-banana-2/edit, nano-banana-pro/edit, nano-banana/edit, ideogram, kling), OpenAI `gpt-4o-mini`
- Rendering: Puppeteer (HTML→PNG 이미지 합성), FFmpeg (영상+음악 합성, Ken Burns 모션)
- Storage: Supabase Storage buckets (`uploads`, `generated-images`, `training-images`, `generated-videos`)
- ~~Sharp~~: 제거됨 — Puppeteer로 완전 교체 (2026-04-20). `cardNewsService.ts`는 데드 코드

---

## Completed Features

### Phase 2.5 — Marketing Command Center

#### 2.5-H Admin Navigation
- CRM "← 어드민" back button added
- Admin Dashboard hub `/admin/dashboard` with 4 section cards
- Shield icon → `/admin/dashboard`
- AdminLayout bypasses sidebar for `/admin/crm`

#### 2.5-I QueueCard Model Selector (updated 2026-04-02)
- `IMAGE_MODEL_OPTIONS` constant with 5 options: nano-banana-2, nano-banana-pro, nano-banana, ideogram, kling
- Each option has `forTypes[]` array to filter by contentType
- QueueCard has `useState(selectedImageModel)` + `useEffect` to auto-set default from contentType
- Model selector dropdown shown above generate button (only when approved + no imageUrl)
- Passing selected model to `onGenerateImage(id, model)` → backend route

#### 2.5-J Brand Studio File Upload
- multer installed (100 files max, 20 MB/file)
- `POST /api/admin/brand/images/upload` saves to `client/public/uploads/`
- Express static `/uploads/` route in `server/index.ts`
- Drag-and-drop upload dialog with 4-col preview grid
- Edit dialog: thumbnail + desc/tags/training fields only

#### 2.5-K Freeform Post — File Attachment
- **Files changed**: `client/src/pages/admin-marketing.tsx`, `server/adminRoutes.ts`, `server/services/claudeMarketingService.ts`
- Freeform Post dialog: file attachment section (drag-drop, click-to-select)
  - Accepts `image/*,video/*`, multiple files, 50 MB max
  - Selected files shown as removable chips with filename + size
- Upload flow: files → `/api/admin/brand/images/upload` → get back URLs
- Button states: "파일 업로드 중..." → "생성 중..."
- `attachedImageUrls` passed to Claude service:
  - Claude adds attachment context to user message
  - Claude returns empty `imagePrompt` when files are attached
- Queue item saved with `imageUrl: attachedImageUrls[0]` (real photo priority)
- QueueCard: shows "첨부된 사진" label when `imageUrl` exists but `imagePrompt` is empty

#### 2.5-L LoRA Training Fix
- **Problem 1**: FAL.AI `flux-lora-fast-training` requires a single ZIP URL, not individual image URLs → "Unprocessable Entity"
- **Problem 2**: Supabase Storage DNS unreachable → "ZIP upload failed: fetch failed"
- **Problem 3**: DB image URLs are relative paths (`/uploads/...`), Node.js `fetch` needs absolute URLs
- **Fix**: `server/services/falService.ts` + `server/adminRoutes.ts`
  - `adminRoutes.ts`: converts relative `/uploads/` paths → `https://{REPLIT_DEV_DOMAIN}/uploads/` before passing to trainLoRA
  - `falService.ts` `trainLoRA()`: downloads all images via fetch, packages into ZIP using `jszip`
  - ZIP saved to `client/public/uploads/` (served via Express static), NOT Supabase
  - Public URL constructed with `REPLIT_DEV_DOMAIN` env var → passed as `images_data_url` to FAL.AI
  - Added `multiresolution_training: true`
  - Proper error handling: throws if no model URL returned
- **Package added**: `jszip`

---

## Architecture Notes

### File Upload
- `POST /api/admin/brand/images/upload` uses multer memoryStorage
- Uploads to Supabase Storage (`uploads` bucket); public URL returned

### Auto-Model Logic (generate-image route, updated 2026-04-20)
- `card_news` | `carousel` → **isMultiSlide 파이프라인**: Nano Banana 2 → Claude 슬라이드 플랜 → Puppeteer 렌더링 → slideUrls 저장
- `reel` | `tiktok` → Kling O1 reference-to-video (참조 이미지 최대 7장)
- `story_image` → nano-banana-2, aspectRatio 9:16
- else → nano-banana-2, aspectRatio 1:1
- Manual override via `model` field in POST body

### Nano Banana Image Generation
- Endpoint: `fal-ai/nano-banana-2` (text-to-image) or `fal-ai/nano-banana-2/edit` (with reference images)
- Reference images: up to 5 Gukdung training images passed as `image_urls[]` using Supabase Storage public URLs
- LoRA approach deprecated in favor of reference-image approach (nano-banana models support direct image references)

### AdminLayout
- Skips sidebar for `/admin/crm` (returns `<>{children}</>` after all hooks)
- `menuItems[]` controls sidebar nav items
- Collapsed state key: `"admin_sidebar_collapsed"`

### POST_FORMAT_OPTIONS
- 6 options: `value`, `label`, `platform`, `contentType`, `model`, `aspectRatio`, `description`

### WooCommerce Emulator
- Consumer Keys: `ck_ff47ac93...`, `cs_1af7c5ee...`
- Supplier detection via User-Agent (AutoDS vs Syncee)
- Endpoints live under `/wp-json/wc/v3/*`; OAuth callback tries JSON first, falls back to form-urlencoded

---

#### 2.5-M Instagram Preview Modal
- `InstagramPreview` component added to `admin-marketing.tsx` (below QueueCard)
- iPhone frame (375×812px) with full Instagram UI simulation:
  - Status bar with dynamic island notch
  - Instagram header + story bar (4 fake accounts)
  - Post header with spoiltdogs avatar
  - Post image (1:1 for feed, 9:16 capped at 500px for story)
  - Play overlay + Film icon for video content types
  - Like / Comment / Share / Bookmark actions
  - Caption (truncated at 150 chars) + hashtags (blue, truncated at 100 chars)
  - Bottom nav bar (Home, Search, Create, Reels, Profile)
- "미리보기" button added to every QueueCard (outline, Eye icon)
- Modal closes on backdrop click or X button
- Works with or without image (shows placeholder if no imageUrl)
- New lucide-react imports: Eye, Heart, MessageCircle, Send, Bookmark, Play, Home, Search

#### 2.5-N Image Guideline Pipeline (2026-04-02)
- New `image_guideline` type added to `brand_context` table (no schema change — new value for existing `type` column)
- **Two separate pipelines:**
  - 카피 생성 파이프라인 (Claude): `gukdung_profile`, `brand_voice`, `campaign_memory`, `post_guideline` 사용
  - 이미지 생성 파이프라인 (FAL.AI): `image_guideline` 타입만 사용. Claude 개입 없음
- `claudeMarketingService.ts`: `imageGuidelines` 분리 추출 → return에 포함. Claude system prompt에는 포함 안 함
- `adminRoutes.ts` `/generate`: `imageGuidelines`를 `imagePrompt`에 `=== STYLE GUIDELINES ===` 구분자로 append 후 DB 저장
- `adminRoutes.ts` `/generate-image`: 매 생성 시 brand_context에서 `image_guideline` 라이브 조회 → `STRICT VISUAL REQUIREMENTS - MUST FOLLOW:` 접두사로 프롬프트 append
- Brand Studio UI: 캠페인 메모리 탭에 "🎨 이미지 생성 가이드라인" 섹션 추가 (위쪽)
  - 타입 셀렉터에 "이미지 가이드라인" 옵션 추가
  - "이미지 가이드라인 추가" 버튼 별도 존재

| image_guideline | FAL.AI 이미지 생성 파이프라인에 직접 전달되는 시각적 가이드라인 (배경, 조명, 스타일, 금지사항) |

#### 2.5-O Credit Exhaustion Error Handler (2026-04-02)
- **Pattern**: `CREDIT_EXHAUSTED:<service>` error string thrown in `falService.ts`, caught in `adminRoutes.ts`, returned as HTTP 402
- `falService.ts`: All `fal.run()` calls (nano-banana family, ideogram, kling) wrapped with try/catch → detects `status 403`, "Exhausted balance", "locked", "balance", "credit" in error body → throws `CREDIT_EXHAUSTED:fal.ai`
- `adminRoutes.ts` `/generate-image`: catch block checks `msg.startsWith("CREDIT_EXHAUSTED:")` → returns `{ error: "CREDIT_EXHAUSTED", service, message, chargeUrl }` with HTTP 402
- `admin-marketing.tsx`:
  - `generateImageMut` uses direct `fetch()` (not `apiRequest`) to preserve error response body
  - `onError`: checks `err.responseData.error === "CREDIT_EXHAUSTED"` → opens `AlertDialog` with 충전 링크
  - `creditAlert` state: `{ open, service, chargeUrl }` drives dialog visibility
  - Dialog: 닫기 button + 충전하러 가기 button (opens `chargeUrl` in new tab)
- Pattern is reusable for future services (Claude, Anthropic, etc.)

#### 2.5-P Video Model Expansion (2026-04-02)
- **IMAGE_MODEL_OPTIONS** updated with full video model set:
  - `kling` (Kling 1.6 · ~$0.50/5초)
  - `kling-3` (Kling 3.0 v2.5-turbo · ~$1.00/5초 · ⭐추천)
  - `veo2` (Google Veo 2 · 물리 기반 모션 · ~$2.50/5초)
  - `veo3` (Google Veo 3 · 최고품질 + 사운드 · ~$1.00/5초)
- `falService.ts`: Added `kling-3`, `veo2`, `veo3` cases; ImageModel type union updated; all wrapped with CREDIT_EXHAUSTED detection
- `adminRoutes.ts`: Server-side autoModel default for reel/tiktok changed from "kling" → "kling-3"
- `QueueCard` useEffect default changed from "kling" → "kling-3"
- Reel/TikTok 큐카드 모델 드롭다운: 4가지 옵션 (Kling 1.6, Kling 3.0, Veo 2, Veo 3)

#### 2.5-Q 2-Step Video Generation Pipeline (2026-04-02)
- **Architecture**: Reel/TikTok 영상 생성 = 2단계 파이프라인
  - Step 1: `fal-ai/nano-banana-2(/edit)` → 국둥이 정확도 높은 썸네일 이미지 생성
  - Step 2: 이미지-to-비디오 변환 (Kling 1.6/3.0 또는 Veo 2)
- **`falService.ts`**: `generateVideo()` 함수 추가
  - `model` param: `veo2-img2vid`, `kling-3-img2vid`, `kling-img2vid`
  - Step 1: `nano-banana-2` (referenceImages 있으면 `/edit` 엔드포인트)
  - Step 2: `fal-ai/veo2/image-to-video`, `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`, `fal-ai/kling-video/v1.6/pro/image-to-video`
  - 두 결과물 (썸네일 + 영상) 모두 Supabase Storage 저장
  - CREDIT_EXHAUSTED 감지 포함
- **`adminRoutes.ts`**: `/generate-image` 엔드포인트 분기 처리
  - `isVideo = contentType === "reel" || contentType === "tiktok"`
  - isVideo=true → `generateVideo()` 호출, `videoUrl` + `imageUrl`(썸네일) 둘 다 DB 저장
  - isVideo=false → 기존 `generateImage()` 유지
  - 모델 매핑: `kling→kling-img2vid`, `kling-3→kling-3-img2vid`, `veo2/veo3→veo2-img2vid`
- **`admin-marketing.tsx`** QueueCard 미디어 표시 업데이트:
  - `videoUrl` 존재 시: 썸네일(STEP 1) + 영상(STEP 2) 순서로 표시
  - `imageUrl`만 존재 시: 이미지 표시 (기존 동작 유지)
- **InstagramPreview**: `videoUrl` 존재 시 `<video autoPlay muted loop>` 표시 (썸네일 이미지 대신)
- **MODEL_OPTIONS 설명** 업데이트: "Nano Banana → [모델] 변환" 형식으로 2단계 파이프라인 명시

#### 2.5-R Caption → Video Motion Prompt (Claude) (2026-04-02)
- **`claudeMarketingService.ts`**: `convertCaptionToVideoPrompt()` 함수 추가
  - 입력: `{ caption, gukdungProfile?, imageGuidelines? }`
  - Claude `claude-sonnet-4-5` 호출 (max_tokens: 300)
  - System prompt: 모션/움직임 중심, 100단어 이내, 마케팅 문구 제외, handheld 카메라
  - 결과: 순수 영상 모션 프롬프트 문자열 반환 (~$0.001/회)
- **`falService.ts`** `generateVideo()` 업데이트:
  - 새 파라미터: `caption?`, `gukdungProfile?`, `imageGuidelines?`
  - Pre-Step: `caption` 있으면 `convertCaptionToVideoPrompt()` 호출 → `videoMotionPrompt` 생성
  - 실패 시 graceful fallback → 원래 `prompt` 사용
  - Step 1 (이미지 생성): 원래 `prompt` (비주얼 설명) 사용
  - Step 2 (영상 변환): `videoMotionPrompt` (모션 설명) 사용
  - 반환값에 `videoPrompt` 필드 추가
- **`adminRoutes.ts`** isVideo 분기 업데이트:
  - brandContext에서 `gukdung_profile` 타입 별도 추출
  - `generateVideo()` 호출 시 `caption`, `gukdungProfile`, `imageGuidelines` 전달
  - DB 업데이트: `imagePrompt` 필드에 `result.videoPrompt` 저장 (이후 UI 표시용)
  - 응답에 `videoPrompt` 필드 포함
- **`admin-marketing.tsx`** QueueCard 업데이트:
  - `item.imagePrompt` 레이블: `item.videoUrl` 존재 시 "VIDEO MOTION PROMPT", 없으면 "IMAGE PROMPT"

#### 2.5-S 슬로우모션 수정 + 영상 길이 선택기 (2026-04-02)
- **슬로우모션 방지**:
  - `claudeMarketingService.ts` 시스템 프롬프트 강화: ALWAYS start with "Real-time speed, normal motion, not slow motion." / ALWAYS end with "Normal playback speed. No cinematic slow motion."
  - `falService.ts` Step 2 직전: `finalVideoPrompt = videoMotionPrompt + " Real-time speed. Normal motion. Not slow motion. Natural dog movement speed."`
  - 모든 영상 모델 (veo2, kling-3, kling)에 `finalVideoPrompt` 적용
- **영상 길이 선택기**:
  - `VIDEO_DURATION_OPTIONS`: 5초 (짧고 임팩트), 8초 (기본 추천 ⭐), 10초 (스토리텔링)
  - `generateVideo()` 함수: `duration = "8"` 파라미터 추가
  - veo2: `duration: "${duration}s"` 형태로 전달
  - Kling (1.6/3.0): 5 또는 10만 지원 → `klingDuration = duration === "5" ? "5" : "10"` 매핑
  - `adminRoutes.ts`: `req.body.duration` (기본값 "8") 추출 → `generateVideo()` 전달
  - `generateImageMut` mutationFn: `{ id, model, duration }` 타입으로 확장
  - QueueCard: `selectedDuration` state (기본값 "8") 추가
  - 영상 모델 선택 시에만 duration 버튼 3개 표시 (`["kling", "kling-3", "veo2", "veo3"].includes(selectedImageModel)`)
  - 모든 영상 모델에서 버튼 레이블 "영상 생성" 표시 (기존 kling만 체크하던 것 수정)
  - `onGenerateImage(id, model, duration)` 시그니처 전파: QueueCard prop → parent call → mutate

#### 2.5-S Ideogram V3 Style Fix + Video Quality Selector UX (2026-04-02)
- **Ideogram V3 `style` 파라미터 수정** (`falService.ts` line 97):
  - `"PHOTO"` → `"REALISTIC"` (API 변경으로 인한 422 오류 해결)
  - 현재 허용값: `AUTO`, `GENERAL`, `REALISTIC`, `DESIGN`
- **영상 생성 UX 개선** — 기술적 모델명 → 직관적 품질 선택기:
  - `VIDEO_QUALITY_OPTIONS` 추가:
    - `fast`: ⚡ 빠름 · Kling 1.6 · ~$1.00
    - `recommended`: ⭐ 추천 · Kling 3.0 · ~$1.50 (기본값)
    - `high`: ✨ 고품질 · Veo 2 · ~$3.00
  - `IMAGE_MODEL_OPTIONS`에서 비디오 모델(kling, kling-3, veo2, veo3) 완전 분리
  - `IMAGE_MODEL_OPTIONS` 단순화: nano-banana-2, nano-banana-pro, ideogram만 유지
  - `QueueCard`: `selectedVideoQuality` state 추가 (기본값 `"recommended"`)
  - UI 분기: `isVideo` 여부에 따라 품질 버튼 3개 + 기간 버튼 3개 vs 이미지 모델 드롭다운
  - 영상 생성 클릭 시 `VIDEO_QUALITY_OPTIONS.find(q => q.value === selectedVideoQuality).model` → `onGenerateImage()` 전달
  - `useEffect`: 비디오 타입엔 `selectedImageModel` 세팅 안 함 (별도 `selectedVideoQuality` 사용)
- **`generateVideo()` 기본 모델** (`falService.ts`): `veo2-img2vid` → `kling-3-img2vid` (슬로우 모션 방지 + 속도/품질 균형)

#### 2.5-T 2-Step Card News Pipeline (2026-04-02) — ⚠️ Phase 2.7에서 교체됨
- ~~**Sharp 기반**~~ → **Phase 2.7 Puppeteer 멀티슬라이드로 완전 교체** (2026-04-20)
- `cardNewsService.ts` + `sharp` 패키지는 데드 코드 (삭제 예정)
- 현재 카드뉴스 파이프라인: Phase 2.7-D 참조 (Nano Banana 2 → Claude 플랜 → Puppeteer → Supabase)

#### 2.5-R 브랜드 아이덴티티 탭 (2026-04-02)
- **파일**: `client/src/pages/admin-brand-studio.tsx`, `server/adminRoutes.ts`, `server/services/cardNewsService.ts`
- **Brand Studio 5번째 탭** "🎨 브랜드 아이덴티티" 추가 (value: `identity`)
- **UI 구성**:
  - 브랜드 컬러 3종: Primary, Secondary, Accent — native color picker + hex input
  - 컬러 프리뷰 박스: 실시간 색상 반영
  - 헤딩/본문 폰트 선택 (16종 Google Fonts 드롭다운) + 인라인 폰트 프리뷰
  - 카드뉴스 텍스트 스타일 3종: 밝은 텍스트+어두운 배경 / 어두운 텍스트+밝은 배경 / 브랜드 컬러+흰 배경
- **저장**: `POST /api/admin/brand/identity` → `brand_context` 테이블에 type=`brand_identity`로 저장
  - 기존 항목 있으면 PATCH, 없으면 POST (upsert)
- **로드**: 컴포넌트 마운트 시 `contextItems`에서 `brand_identity` 찾아 상태 복원
- **카드뉴스 자동 적용**: `cardNewsService.ts`가 생성 시 `getBrandIdentity()` 호출
  - textStyle에 따라 텍스트 색상, 그라데이션 배경 색상 결정 (hex → rgba 변환)
  - 기본값: primaryColor `#4B9073`, secondaryColor `#FCF9F1`, `light_on_dark`

#### 2.5-S 카드뉴스 텍스트 이중 합성 방지 (2026-04-02)
- **파일**: `server/services/cardNewsService.ts`
- imagePrompt에서 텍스트 관련 지시 제거 regex 적용 후 Nano Banana 2에 전달
- 프롬프트 끝에 "NO text, NO words, NO typography" 명시적 금지 추가
- Sharp SVG 오버레이에서만 텍스트 렌더링하도록 단일화

## Pending

- ~~Phase 2.5-I: Kling O1/O3 영상 파이프라인 교체~~ — ✅ 완료
- ~~Phase 2.7 Puppeteer 디자인 시스템 + 멀티슬라이드 파이프라인~~ — ✅ 완료
- Phase 2.5-J: 고정 배경 합성 (Inpainting) — 배경 라이브러리 + 마스크 편집기 + FAL inpaint 모델로 국둥이 합성. 배경 일치도 90~95% 목표.
- Phase 2.6 Content Scheduler — 진행 중 (카피 자동 생성 완료, 이미지/영상 자동 생성 미완)
- Phase 2.8 Meta/TikTok SNS publishing
- **Phase 2.9 모션 Reels 파이프라인** — ✅ 2.9-A MVP 완료 (2026-04-20), 2.9-B/C 미완
- Caption inline edit feature
- `cardNewsService.ts` + `sharp` 패키지 정리 (데드 코드 제거)

## Post-Replit Migration Debt (2026-04-14~)
- ✅ Railway 배포, Supabase Postgres/Storage 전환, 커스텀 도메인 연결 완료
- ✅ Stripe 키 env 기반 전환 (`stripe-replit-sync` 제거, `[stripe] Stripe configured via env vars` 로그 확인)
- ✅ WooCommerce 에뮬레이터 AutoDS/Syncee User-Agent 분기
- [ ] OpenAI 호출 경로: Replit modelfarm proxy → 실제 `OPENAI_API_KEY` 사용으로 검증 필요
- [ ] 남아있는 `REPLIT_*` 환경변수 참조/로컬 `client/public/uploads/` 쓰기 경로 정리 (project_replit_debt 메모리 참조)

---

## Phase 2.5-I. 영상 생성 파이프라인 개선 (계획)

### 변경 방향
기존 2단계 (Nano Banana → Veo 2) → **Kling O1/O3 단독**으로 교체

**절대 건드리지 않는 것:**
- 이미지 생성 파이프라인 (Nano Banana 2/edit) — 현재 세팅 유지
- 카드뉴스 생성 (Nano Banana + Puppeteer 멀티슬라이드) — Phase 2.7에서 Sharp→Puppeteer 교체 완료
- 이미지 관련 모든 코드

### 새로운 영상 파이프라인

**오디오 없음:**
국둥이 사진 최대 7장 → Kling O1 (`fal-ai/kling-video/o1/reference-to-video`) → 영상
비용: $0.112/초 × 8초 = $0.90

**오디오 있음:**
국둥이 사진 최대 7장 → Kling O3 (`fal-ai/kling-video/o3`) → 환경음 포함 영상
→ FFmpeg으로 브랜드 음악 합성 → 최종 영상
비용: $0.168/초 × 8초 = $1.34

### Kling 모델 정리 (참고)
| 모델 | FAL ID | 특징 | 단가 |
|------|--------|------|------|
| Kling O1 | `fal-ai/kling-video/o1/reference-to-video` | 참조 이미지 특화, 최대 7장, 오디오 없음 | $0.112/초 |
| Kling O3 | `fal-ai/kling-video/o3` | O1 업그레이드, 오디오+환경음 지원 | $0.168/초 |
| Kling 3.0 Standard | - | 프롬프트 기반 | $0.084/초 |
| Kling 3.0 Pro | - | 최고품질 | $0.112/초 |

### 구현 체크리스트

#### Phase 2.5-I-1: 브랜드 스튜디오 음악 라이브러리 ✅ (2026-04-16)
- [x] 브랜드 스튜디오 "🎵 음악 라이브러리" 탭 추가 (6번째 탭)
- [x] 음악 파일 업로드 (MP3/WAV, 50MB) → Supabase Storage `brand-music` 버킷
- [x] 업로드 목록 표시 (제목, 분위기 배지, `m:ss` 길이, HTML5 `<audio>` 미리듣기)
- [x] 활성/비활성 스위치, 삭제 버튼 (Storage + DB row 동시 삭제)
- [x] DB: `brand_context` type=`brand_music`, content는 `{url, mood, durationSec, fileName, sizeBytes}` JSON
- [x] Duration 추출: `music-metadata` npm 패키지
- [x] 엔드포인트: `GET/POST/PATCH/DELETE /api/admin/brand/music[...]`

#### Phase 2.5-I-2: 큐 카드 오디오 선택 UI ✅ (2026-04-16)
- [x] 릴스/틱톡 타입 큐 카드에 오디오 토글 추가 (없음/있음, 비용 표시)
- [x] 오디오 있음 선택 시 배경음악 드롭다운 (활성 트랙만)
- [x] 음악 볼륨 슬라이더 (0~100%, 기본 40%)
- [x] 활성 음악 없을 때 안내 메시지
- [x] `generateImageMut` 가 `audioEnabled/musicUrl/musicVolume` 전달 (백엔드 수신은 2.5-I-3)

#### Phase 2.5-I-3: 서버 영상 생성 로직 ✅ (2026-04-16)
- [x] `falService.ts`에 `generateVideoWithKlingO1()` 추가
  - `fal-ai/kling-video/o1/reference-to-video` 단일 모델 (Option A: 항상 O1, 오디오 켬이면 FFmpeg 합성)
  - 국둥이 참조 사진 최대 7장 직접 전달 (Nano Banana 단계 생략)
  - 비용: $0.112/sec = $0.896/8초
- [x] FFmpeg 음악 합성 서비스 (`musicMixService.ts`)
  - 영상/음악 임시 다운로드 → ffmpeg 합성 → Supabase `videos` 버킷 업로드
  - `volume=0~1.0` 필터로 음량 조절, `-shortest` 로 영상 길이에 맞춤
- [x] `nixpacks.toml` 추가 — Railway 빌드에 `ffmpeg` 포함
- [x] `adminRoutes.ts` `/generate-image` 라우트 업데이트
  - `audioEnabled/musicUrl/musicVolume` 수신
  - 비디오 콘텐츠 → 참조 이미지 최대 7장 로드
  - 오디오 켬 + 음악 URL 있을 때만 FFmpeg 합성 시도 (실패해도 무음 영상 fallback)

**상태**: Phase 2.5-I 전체 완료 (2026-04-16). Railway 배포 완료.

#### Phase 2.5-I-4: 음악 소스 결정 (2026-04-16)
- 음악 소스: **Suno AI 구독 ($10/월)** → 수동 다운로드 → 사이트 업로드
- 보조 소스: Pixabay, Mixkit (무료, Attribution 불필요)
- API 연동 없음 — 무료 + 상업적 사용 + API 제공 조건을 모두 만족하는 서비스 없음 확인 완료
- 워크플로우: Suno에서 음원 다운로드 → 브랜드 스튜디오 음악 탭에서 업로드 → 영상 생성 시 선택

#### Phase 2.5-I-5: 이미지 + 음악 합성 (2026-04-16)
- [x] `musicMixService.ts`에 `mixImageWithMusic()` 추가 — 정지이미지 + 음악 → MP4 (ffmpeg, 추가 비용 $0)
- [x] 이미지 생성 라우트에서 `audioEnabled + musicUrl` 시 이미지+음악 합성 실행
- [x] 이미지 QueueCard에 배경음악 선택 UI 추가 (없음/있음 토글 + 곡 선택 + 볼륨)
- [x] `generated-videos` 버킷 생성 실패 수정 — fileSizeLimit 500MB→50MB (Supabase plan 제한 초과 원인)
- [x] 이미지+음악 영상 길이 선택기 추가 (10초/20초/30초)

#### Phase 2.5-I-6: 영상 생성 진행률 바 (2026-04-16)
- [x] `falService.ts`: 인메모리 진행률 추적 (`videoProgress` Map)
- [x] `fal.run()` → `fal.subscribe()` 교체 — `onQueueUpdate` 콜백으로 단계별 상태 수신
- [x] 진행률 단계: 프롬프트 생성 → 대기열 → 영상 생성 중 → 저장 → 음악 합성 → 완료
- [x] `GET /api/admin/marketing/queue/:id/progress` 엔드포인트 추가
- [x] QueueCard: 3초 간격 폴링 + 진행률 바 UI (파란색, 퍼센트 표시)

#### Phase 2.5-I-7: 미리보기 음악 재생 (2026-04-16)
- [x] InstagramPreview: 비디오 음소거/재생 토글 버튼 추가 (Volume2/VolumeX 아이콘)
- [x] 이미지+음악 혼합 영상도 미리보기에서 소리 재생 가능

---

## Phase 2.6 Content Scheduler

### 구현 체크리스트

#### Phase 2.6-A: DB 스키마 + API + 기본 UI ✅ (2026-04-16)
- [x] `content_schedule_template` 테이블 — 주간 반복 패턴 (요일, 플랫폼, 콘텐츠 타입)
- [x] `content_schedule_item` 테이블 — 개별 스케줄 항목 (날짜, 주제, 설명, 상태, queueItemId 연결)
- [x] Storage CRUD 메서드 (templates + items, bulk create, month 단위 조회/삭제)
- [x] API 엔드포인트: templates CRUD, items 조회/수정/삭제, AI 스케줄 생성, 전체 승인
- [x] 주간 패턴 탭: 7일 그리드 + 플랫폼/콘텐츠 타입 추가/삭제/토글
- [x] 캘린더 탭: 월간 캘린더 뷰, 인라인 주제/설명 편집, 개별/전체 승인, 삭제
- [x] AI 스케줄 생성: 주간 패턴 + 월간 테마 → Claude가 각 슬롯별 주제/설명 자동 생성
- [x] Admin 사이드바 "스케줄러" 메뉴 추가

#### Phase 2.6-B: 자동 실행 (cron) ✅ (2026-04-16)
- [x] `node-cron` 설치 — 매일 06:00 시드니 시간 (Australia/Sydney TZ)
- [x] `schedulerService.ts`: 오늘 날짜의 승인된 스케줄 항목 → Claude 카피 생성 → marketing_queue에 "approved" 상태로 등록
- [x] 에러 핸들링: 개별 항목 실패 시 status → "failed", 나머지 계속 처리
- [x] 생성 완료 시 schedule_item.status → "generated", queueItemId 연결
- [x] `POST /api/admin/schedule/run-now` 수동 실행 엔드포인트
- [x] UI: "오늘 스케줄 실행" 버튼 (테스트용)
- [ ] 자동 이미지/영상 생성 (현재는 카피만 자동 생성, 이미지는 마케팅 큐에서 수동 생성)

---

## Phase 2.7 Puppeteer 디자인 시스템 + 멀티슬라이드 파이프라인

### 구현 완료 (2026-04-20)

#### 2.7-A: Puppeteer 렌더링 엔진
- [x] `puppeteer` v24 설치
- [x] `server/services/templateRenderer.ts` — 싱글턴 브라우저, `renderHtmlToImage()`, `renderTemplate()`, `renderSlides()`, `closeBrowser()`
- [x] deviceScaleFactor: 2 (레티나), 기본 1080×1350 (4:5)

#### 2.7-B: 브랜드 디자인 시스템
- [x] `server/templates/design-system.css` — CSS 변수 기반 디자인 토큰
  - 컬러: Primary `#1a3a2e`, Secondary `#FCF9F1`, Accent `#FFD54F`
  - 폰트: Fraunces (heading), Inter (body) — Google Fonts
  - 사이즈 스케일: 8단계 (18px caption ~ 80px display)
  - 간격: 8px 그리드 (6단계), content-padding 64px
  - 카드: border-radius 16px, box-shadow
  - 테마: dark / light / accent
  - 유틸리티: flex-center, overlay, badge, CTA button

#### 2.7-C: HTML 템플릿 5종
- [x] `card-news-cover.html` — 커버 슬라이드 (이미지 + 제목 오버레이 + Swipe 힌트)
- [x] `card-news-body.html` — 본문 슬라이드 (크림배경, 헤딩+본문+팁박스, 페이지번호)
- [x] `card-news-cta.html` — CTA 마감 슬라이드 (다크배경, CTA버튼, 브랜드)
- [x] `post-feed.html` — 피드 포스트 (이미지 + 하단 그라데이션 텍스트)
- [x] `story-promo.html` — 스토리/릴스 (9:16, 이미지 상단 + 프로모 하단)
- [x] 샘플 프리뷰 파일 + `preview.html` (브라우저 확인용)

#### 2.7-D: 생성 파이프라인 연결
- [x] `server/services/contentRenderer.ts` — 멀티슬라이드 렌더링 서비스
  - CSS 인라인화 (Puppeteer file:// 해결)
  - `renderCardNews(plan, imageUrl)` → Buffer[] (cover + body slides + CTA)
  - `renderPost()`, `renderStory()` — 단일 이미지 렌더링
  - `uploadSlides()` — Supabase Storage 배치 업로드
- [x] `shared/schema.ts` — `marketing_queue`에 `slideUrls` text[] 필드 추가
- [x] `adminRoutes.ts` — `isMultiSlide` 분기 (card_news + carousel)
  - Step 1: Nano Banana 2 이미지 생성
  - Step 2: Claude로 슬라이드 컨텐츠 플랜 JSON 생성
  - Step 3: Puppeteer 렌더링
  - Step 4: Supabase 업로드, slideUrls + imageUrl DB 저장

#### 2.7-E: 마케팅 UI 다중 슬라이드 지원
- [x] QueueCard: `slideUrls` 가로 스크롤 캐러셀 뷰 (슬라이드 수 표시)
- [x] 카드뉴스/캐러셀 생성 버튼 통합 (3단계 파이프라인 설명)
- [x] 생성 완료 토스트: 슬라이드 수 표시
- [x] 기존 단일 이미지/비디오 표시와 충돌 없이 공존

#### 2.7-F: Railway 배포 + 버그픽스 (2026-04-20)
- [x] `nixpacks.toml` — Puppeteer 시스템 라이브러리 21종 추가 (nss, freetype, harfbuzz, gtk3 등)
  - Puppeteer 번들 Chromium 사용 (시스템 Chromium 아님), nixPkgs는 공유 라이브러리만 제공
  - `PUPPETEER_EXECUTABLE_PATH` env var 지원 (선택적 오버라이드)
- [x] Railway 빌드 성공 (첫 빌드: `ca-certificates` Nix 오류 → chromium/ca-certificates 제거로 해결)
- [x] Claude 모델 ID 버그픽스: `claude-sonnet-4-5-20250514` → `claude-sonnet-4-5` (2곳)
  - `adminRoutes.ts` L1633: 슬라이드 컨텐츠 플랜 생성
  - `adminRoutes.ts` L2299: 기타 Claude 호출
  - 증상: 슬라이드 생성 시 404 "model not found" 에러
- [ ] 슬라이드 생성 E2E 테스트 (배포 확인 후 검증 필요)

---

## 인스타그램 콘텐츠 전략 (2026-04-20)

### 타겟 및 시장 정의
- 주 타겟: 호주 30-40대 프리미엄 반려견 보호자
- 시장 특성: 호주 Instagram 사용자는 직설적·캐주얼 톤에 반응. 한국식 교육형 카드뉴스 포맷은 부적합
- 브랜드 포지션: Quiet Confidence (조용한 자신감) — 허세 없는 프리미엄

### 알고리즘 핵심 원칙

Instagram 알고리즘이 판단하는 것은 콘텐츠 제작 도구(AI vs 실촬영)가 아니라 "행동 유발력"이다.

알고리즘이 실제로 측정하는 것 (가중치 순):
1. Watch time — 끝까지 보는가
2. Sends per reach — DM으로 공유되는가
3. Saves — 나중에 다시 보려고 저장하는가
4. Likes per reach — 보조 신호

### AI 콘텐츠 관련 사실관계
- Instagram "Made with AI" 라벨 부착 가능하나, 라벨 자체가 노출 차단 사유는 아님
- Adam Mosseri 2025-12 "raw, real human content" 발언 = "저품질 AI 양산 금지"의 의미 (AI 금지가 아님)
- 80% 노출 감소 데이터 = aggregator/저품질 AI 대량생산 계정 기준. 자체 브랜드 콘텐츠는 직접 대상 아님
- Nano Banana 2 SynthID 워터마크: 감지 가능하나 노출 차단되지 않음

### Spoilt Dogs 실질적 의미
- AI 이미지 사용 두려워할 필요 없음 → Nano Banana 2 파이프라인 유지
- 핵심: "이 콘텐츠가 타겟 고객의 저장/공유를 유발하는가"
- Reels가 Single Image 대비 3-5배 engagement (watch time 측정 가능해서)
- Ken Burns 같은 정적 이미지 + 모션도 Reels로 인식 → 같은 알고리즘 이점

### 콘텐츠 포맷 전환 계획

| 기간 | Single Image | Carousel | Reels |
|------|-------------|----------|-------|
| 현재 → 3개월 | 50% | 30% | 20% |
| 3 → 6개월 | 20% | 30% | 50% |
| 6개월 이후 | 15% | 35% | 50% |

월 30개 게시물 최종 목표:
- 이미지 + 모션 Reels (AI 이미지 기반): 15개 (50%)
- UGC 재공유: 8개 (27%)
- 실제 촬영 Reels (월 1회 배치 촬영): 5개 (17%)
- 정적 이미지 피드 (그리드 미학 유지): 2개 (6%)

---

## AIDA 프레임워크 (호주 시장 버전)

AIDA (Attention-Interest-Desire-Action). 구조만 차용, 표현은 호주 프리미엄 시장 최적화.
타겟: 호주 30-40대 프리미엄 반려견 보호자
톤: Quiet Confidence — 절제된 자신감, 관찰자적 시선
참고 브랜드: Aesop, Bellroy, Frank Body

### 글로벌 원칙
1. 한국식 교육조/설교조 금지 ("99%가 모르는 OO하는 법" 금지 → 조용한 확신, 전문가적 관찰)
2. 이모지 절제. 필요 시 🐾 정도만
3. 해시태그 3-5개, 캡션 마지막 배치 (필수: #SpoiltDogs #AustralianDogs)
4. CTA는 자연스럽게. Push 금지 ("Link in bio", "Available now at spoiltdogs.com.au")

### AIDA 4단계
| 단계 | 목표 | 피할 것 | 권장 |
|------|------|--------|------|
| Attention | 조용한 확신으로 주목 | "Hi everyone!", 과장 | 관찰형, 디테일형, 감각형 |
| Interest | "이 브랜드는 나를 이해한다" | 브랜드 자랑 | 일상 관찰, 작은 디테일 공감 |
| Desire | 구매 후 만족감 | 성분 나열, 뻔한 문구 | 장면 묘사, 감각적 표현 |
| Action | 조용한 초대 | "Buy now!", "50% OFF!" | "Discover the range. Link in bio." |

### 절대 금지 표현
- "Hey guys!", "Hi everyone!", "Swipe up", "Click NOW"
- 느낌표 2개 이상 연속, 과장 형용사 ("AMAZING", "BEST EVER")
- 한국식 번역투 ("~해보세요", "~하지 않으셨나요?")

### 글자 수 가이드
- Hook (첫 줄): 최대 60자 | 전체 캡션: 80-150자 | 문단: 2-3문장

> **적용**: Brand Studio `post_guideline`에 AIDA 가이드라인 반영 필요

---

## Phase 2.9 모션 Reels 파이프라인

### 배경
- Single Image는 알고리즘상 불리 (engagement 측정 어려움)
- 실촬영은 운영 부담, AI 영상(Kling)은 강아지 얼굴 일관성 한계
- 해결: AI 정적 이미지 + Puppeteer 텍스트 렌더링 + FFmpeg 모션/음악 합성

### 기술 스택 역할 구분

| 도구 | 역할 | 비고 |
|------|------|------|
| Nano Banana 2/edit | 이미지 생성 | 설정 변경 금지 |
| Puppeteer | 이미지 합성 (텍스트, 레이아웃, 브랜드 토큰) | Phase 2.7 카드뉴스 시스템 재사용 |
| FFmpeg | 영상 합성 (Ken Burns, 텍스트 애니메이션, 음악) | Phase 2.5-I 음악 합성 코드 재사용 |
| Brand Studio 음악 라이브러리 | 배경 음악 소스 | ✅ Phase 2.5-I-1 구현 완료 |
| Brand Studio 브랜드 아이덴티티 | 색상/폰트 설정 | ✅ Phase 2.5-R 구현 완료 |
| Kling O1/O3 | 실제 영상 생성 | 별도 파이프라인, 독립 |

### Phase 2.9-A: MVP (이미지 1장 + Ken Burns + AIDA 텍스트) ✅ (2026-04-20)

**범위:**
- Freeform Post "게시 형태"에 "모션 Reels" 옵션 추가
- 이미지 1장 + Ken Burns 효과
- AIDA 텍스트 4단계 (5초씩 순차)
- 배경 음악 1곡
- 길이: 20초 고정, 해상도: 1080x1920 (9:16)

**파이프라인:**
1. Claude → AIDA 4단계 대본 생성 (Attention, Interest, Desire, Action)
2. Nano Banana 2/edit → 세로 9:16 이미지 생성
3. Puppeteer → 텍스트 레이어 4장 PNG 사전 렌더링 (Brand Identity 색상/폰트 적용)
4. FFmpeg → 영상 합성:
   - Ken Burns 줌인 (1.0x → 1.15x, 20초)
   - 텍스트 레이어 시간별 오버레이 (0-5초: Attention, 5-10초: Interest, 10-15초: Desire, 15-20초: Action)
   - 각 텍스트 페이드 인(0.5초) + 페이드 아웃(0.5초)
5. Brand Studio 음악 합성 (볼륨 0.3, 끝에 페이드 아웃)
6. Supabase Storage 저장

**구현 완료 (2026-04-20):**
- [x] `server/services/motionReelsService.ts` — 파이프라인 오케스트레이터 (Puppeteer 4장 렌더 → FFmpeg 합성 → Supabase 업로드)
- [x] `server/services/claudeMarketingService.ts` — `generateAIDAScript()` 함수 + `AIDAScript` 인터페이스, Quiet Confidence 톤
- [x] `server/templates/reel-text-overlay.html` — AIDA 텍스트 오버레이 템플릿 (1080×1920, 투명 배경, 하단 그라데이션)
- [x] `server/adminRoutes.ts` — `isMotionReel` 분기, 비동기 백그라운드 생성 + 진행률 추적
- [x] `client/src/pages/admin-marketing.tsx` — 모션 Reels UI (AIDA 파이프라인 안내, 음악 선택, 볼륨 슬라이더, 진행률 바)
- [x] FFmpeg zoompan `-loop 1 -t 20` 입력 제한 (무한 스트림 방지)
- [x] Instagram Reels UI 하단 영역 고려한 brand-mark 위치 조정 (60px → 220px)

**의존성 (모두 구현 완료):**
- [x] Brand Studio 음악 라이브러리 (Phase 2.5-I-1)
- [x] Brand Studio 브랜드 아이덴티티 (Phase 2.5-R)
- [x] Puppeteer 렌더링 엔진 (Phase 2.7-A)
- [x] FFmpeg 음악 합성 (Phase 2.5-I-3)

**제약사항:**
- 이미지 생성 설정 절대 수정 금지
- 기존 Puppeteer 카드뉴스 파이프라인 파괴 금지 (재사용만)
- Kling O1/O3 코드와 분리

### Phase 2.9-B: 효과 다양화 ✅ (2026-04-20)
- [x] 5가지 모션 효과: Zoom In, Zoom Out, Pan Left, Pan Right, Tilt Up
  - Zoom: zoompan 필터 (1.2x 스케일), Pan/Tilt: crop 필터 (1.4x 스케일, 떨림 방지)
- [x] Claude AIDA 대본 생성 시 `suggestedMotion` 자동 추천
  - 관찰형 → zoom-in / 확장형 → zoom-out / 여정형 → pan-right / 상승형 → tilt-up
- [x] UI: "AI 자동" 기본값 + 6개 수동 선택 버튼 (3열 그리드)
- [x] adminRoutes: "auto" → Claude 추천 효과 사용, 수동 선택 시 직접 전달

### Phase 2.9-C-1: 멀티이미지 슬라이드쇼 ✅ (2026-04-20)
- [x] Claude AIDA 대본에 `sceneHints[4]` 추가 — 같은 장면의 분위기/조명/앵글 미세 변형 4가지
- [x] 4개 이미지 병렬 생성 (Nano Banana 2 + reference images), Promise.allSettled + 단일이미지 폴백
- [x] 1-pass FFmpeg 파이프라인: 4개 세그먼트(5.5초) × 개별 모션 → xfade(0.5초) → 텍스트 오버레이 → 20초
- [x] AIDA 서사 구조 모션 매핑: Attention=zoom-in, Interest=pan-right, Desire=zoom-out, Action=tilt-up
- [x] `buildSegmentMotionFilter()` — 세그먼트 단위 duration/fps 파라미터화
- [x] 기존 단일이미지 파이프라인은 `generateSingleImageReel()`로 분리, 완전 호환
- [x] sceneHints 없는 경우 자동 단일이미지 폴백

### Phase 2.9-C: 미완료 고급 기능
- [ ] 가변 길이 (대본 길이에 따라 15-30초 자동 조정)
- [ ] Puppeteer 애니메이션 프레임 캡처로 정교한 텍스트 모션 (우선순위 낮음)
- [ ] 음악 비트 동기화 (우선순위 낮음)

---

## 운영 준비 사항

### UGC 수집
- 고객 제품 발송 시 #MySpoiltDog 해시태그 안내 카드 동봉
- UGC 재공유 목표: 월 8개 (전체의 27%)

### 콘텐츠 촬영
- 월 1회 Gukdung 배치 촬영 루틴 수립
- 실촬영 Reels 목표: 월 5개 (전체의 17%)

### Brand Ambassador
- 단골 고객 5-10명 지정
- 제품 리뷰/일상 콘텐츠 제공 대가로 할인 또는 무료 제품

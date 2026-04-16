# SpoiltDogs — Build Plan & Change Log

## Stack (as of 2026-04-16)
- React 18 + Vite + Express 5 (NOT Next.js)
- Routing: wouter | Styling: Tailwind + shadcn/ui | Icons: Lucide React
- Hosting: Railway (Nixpacks → `node dist/index.cjs`, port 8080). Domain `spoiltdogs.com.au` via CrazyDomains + Cloudflare DNS.
- DB: Supabase Postgres (pooler) via Drizzle ORM
- Auth: Supabase Auth
- Payments: Stripe (keys via env vars, no Replit sync) + Afterpay
- AI: Claude (claude-sonnet-4-5), FAL.AI (nano-banana-2/edit, nano-banana-pro/edit, nano-banana/edit, ideogram, kling), OpenAI `gpt-4o-mini`
- Storage: Supabase Storage buckets (`uploads`, `generated-images`, `training-images`, `generated-videos`)

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

### Auto-Model Logic (generate-image route)
- `card_news` → ideogram (no reference images)
- `reel` | `tiktok` → kling (no reference images)
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

#### 2.5-T 2-Step Card News Pipeline (2026-04-02)
- **`generateCardNews()` 함수** (`falService.ts`):
  - Step 1: `fal-ai/nano-banana-2(/edit)` → 국둥이 이미지 생성 (reference images 포함)
  - Step 2: **Sharp** → 생성된 이미지에 SVG 텍스트 오버레이 합성 (상단 그라데이션 + 흰색 볼드 텍스트)
  - 최종 이미지 Supabase Storage 업로드 → `imageUrl` 반환
  - CREDIT_EXHAUSTED 감지 포함
  - **파일**: `server/services/cardNewsService.ts`; npm 패키지: `sharp`, `@types/sharp`
- **`adminRoutes.ts`**: `isCardNews` 분기 (`isVideo` 체크 이전에 처리)
  - `textLines` = caption 첫 2줄 (최대 40자, # 해시태그 제외)
  - `generateCardNewsImage()` 호출 → `imageUrl` DB 저장
- **QueueCard UI** (`admin-marketing.tsx`):
  - card_news 타입: 파란색 안내 박스 + "카드뉴스 생성" 버튼 (`model = "card_news"`)
  - `onSuccess`: `variables.model === "card_news"` 시 "카드뉴스 생성 완료 / 국둥이 이미지 + 텍스트 합성 완료" 토스트

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

- Phase 2.5-I: Kling O1/O3 영상 파이프라인 교체 (아래 섹션) — ✅ 완료
- Phase 2.5-J: 고정 배경 합성 (Inpainting) — 배경 라이브러리 + 마스크 편집기 + FAL inpaint 모델로 국둥이 합성. 배경 일치도 90~95% 목표. 개발 5~7일 예상.
- Caption inline edit feature
- Phase 2.6 Content Scheduler (아래 섹션) — 진행 중
- Phase 2.7 Meta/TikTok SNS publishing

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
- 카드뉴스 생성 (Nano Banana + Sharp) — 현재 세팅 유지
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

#### Phase 2.6-B: 자동 실행 (cron) — 미구현
- [ ] node-cron으로 매일 시드니 시간 기준 실행
- [ ] 승인된 항목 → 해당 날짜에 marketing_queue 생성 → 자동 카피+이미지/영상 생성
- [ ] 에러 핸들링 (크레딧 부족, 생성 실패 등)
- [ ] 생성 완료 시 schedule_item.status → "generated", queueItemId 연결

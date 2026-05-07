# SpoiltDogs — Completed Implementation Archive

> 완료된 구현 상세 내용을 PLAN.md에서 분리해 보관. PLAN.md가 단일 소스이므로 이 파일은 참고 전용.
> Last archived: 2026-05-05

---

## §2.5-H ~ §2.5-L: Marketing Command Center 기반 기능

#### 2.5-H Admin Navigation
- CRM "← 어드민" back button added
- Admin Dashboard hub `/admin/dashboard` with 4 section cards
- Shield icon → `/admin/dashboard`
- AdminLayout bypasses sidebar for `/admin/crm`

#### 2.5-I QueueCard Model Selector
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

## 2026-04-20 — 첨부 미디어 우선 사용 파이프라인

**문제**: Freeform Post에서 실촬영 사진/영상을 첨부해도 "Generate Image" 클릭 시 AI가 새 이미지를 생성해 덮어쓰는 버그

**수정** (`server/adminRoutes.ts`, `client/src/pages/admin-marketing.tsx`):
- `multer` 파일 크기 한도: 20MB → 50MB (영상 파일 지원)
- 클라이언트: 첨부 파일을 이미지/영상으로 분리해 업로드, `attachedVideoUrls` 별도 전달
- `/generate` 라우트: `attachedVideoUrls[0]` → `videoUrl` 저장 (기존 `imageUrl`과 함께)
- `/generate-image` 라우트: 첨부 미디어 감지 후 3가지 단락처리 추가
  1. **릴스/틱톡 + 첨부 영상**: Kling 생성 생략 → 첨부 영상 직접 사용, 음악 합성만 실행
  2. **일반 이미지 + 첨부 사진**: AI 생성 생략 → 바로 `status: "approved"`
  3. **모션 Reels + 첨부 사진**: Nano Banana 이미지 생성 생략 → 첨부 사진으로 Ken Burns 영상 합성
- **감지 신호**: `!item.imagePrompt && item.imageUrl` = 첨부 사진, `item.videoUrl` = 첨부 영상

---

## §2.5-M ~ §2.5-S: 완료된 Marketing Command Center 기능

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


---

## Phase 2.5-I: 영상 파이프라인 구현 체크리스트 (✅ 완료)

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

#### Phase 2.6-C: Bulk Generate + 주차별 UI ✅ (2026-04-21)

**목적**: 사장님이 월간 39개 스케줄 승인 완료 상태. 승인→제작 단계를 한 번의 클릭으로 끝내는 bulk 자동화 추가. 월간 캘린더는 여백 낭비가 심해 주차별 Accordion 리스트로 교체.

**범위 (Meta Graph 게시는 Phase 2.8로 분리)**:
- 제작: 전체 일괄 + 개별 재생성
- UI: 달력 → 주차별 Accordion 리스트
- 진행률: 스케줄러 페이지 상단 통합 (3초 폴링, generating=0이면 중단)

**완료 체크리스트**:
- [x] `schedulerService.ts` — `generateCopyForScheduleItem(item)` 함수 추출, 기존 `processScheduledItems()`가 이 함수를 호출하도록 리팩토 (동작 동일, 멱등)
- [x] `POST /api/admin/schedule/bulk-generate` — `{ year, month, force? }` 요청. 응답 `{ total, queued, alreadyCompleted, estimatedCostUsd }` 즉시 반환, 실제 생성은 백그라운드
  - 동시성: Puppeteer 계열(card_news/carousel/motion_reel) `p-limit(2)`, FAL 이미지(post/story_image) `p-limit(5)`, 비디오(reel/tiktok) `p-limit(3)` 유형별 분리
  - **HTTP 루프백 self-call**: 기존 `/generate-image` 라우트 전체(540줄)를 함수 추출 없이 재사용. `x-api-key=ADMIN_PASSWORD` 헤더로 `requireAdmin` 통과
  - CREDIT_EXHAUSTED 402 응답 감지 → `rejectionReason`에 보존
- [x] `GET /api/admin/schedule/bulk-generate/preview?year=&month=&force=` — 비용/시간/개수 사전 조회
- [x] `GET /api/admin/schedule/bulk-progress?year=&month=` — schedule ↔ queue 상태 reconcile + generating 항목의 percent/stage + failed 항목의 rejectionReason
- [x] `POST /api/admin/schedule/items/:id/regenerate` — 개별 재생성 엔드포인트
- [x] `admin-scheduler.tsx` `MonthlyCalendarTab` 주차별 Accordion으로 재작성
  - 1~5주차 버킷팅 (Sydney TZ 첫날 오프셋 기반)
  - 헤더: 주차 라벨 + 기간 + 콘텐츠 타입 카운트 + 총 개수 + 완료/생성중/실패 배지
  - 본문: 요일/날짜/시간/플랫폼/타입 배지 + 주제/설명 인라인 편집 + 상태 배지 + 진행률 바 + 개별 재생성 버튼
- [x] 상단 진행 바 `"제작 진행: N/M 완료 · K개 생성 중 · P개 실패"` + "실패 항목 보기" 링크 (해당 주차 Accordion 자동 펼침)
- [x] 비용 경고 `AlertDialog` — "전체 제작" 클릭 시 preview 먼저 조회 → 확인 시 bulk-generate POST
- [x] CREDIT_EXHAUSTED 감지 → `admin-marketing`과 동일한 `creditAlert` 다이얼로그 (충전 링크 포함)
- [x] 개별 재생성: `generated`/`failed` 상태 + `queueItemId` 있을 때만 노출
- [x] `WeeklyPatternTab`은 손대지 않음 ✓

**핵심 변경 파일**:
- `server/services/schedulerService.ts` — `generateCopyForScheduleItem()` export
- `server/adminRoutes.ts` — 4개 엔드포인트 신설 (`bulk-generate`, `bulk-generate/preview`, `bulk-progress`, `items/:id/regenerate`)
- `client/src/pages/admin-scheduler.tsx` — `MonthlyCalendarTab` 전면 재작성 (달력 → Accordion)

#### Phase 2.6-D: Storage Cleanup 확장 ✅ (2026-04-21)

**검증 결과 (원칙 7: 가설 → 증거 → 진단 → 수정)**:
- `storageService.ts:154`의 `status === "posted"` 30일 삭제 규칙은 **데드 룰**로 확인됨 — `postedAt` / `"posted"` 세팅 코드가 전 코드베이스에 0곳 (grep 증거). Meta Graph 연동(Phase 2.8) 전까지 영원히 미실행.
- `slideUrls[]` 배열 처리 누락 — 카드뉴스/캐러셀 슬라이드 PNG 5-7장/건이 영구 누적되던 상태.
- `status === "failed"` 정리 규칙 없음 — 실패 항목이 영원히 쌓임.

**완료 체크리스트**:
- [x] `cleanupOldContent` 확장
  - `rejected` 7일 규칙에 `slideUrls[]` 순회 삭제 추가
  - `failed` + 14일 경과 → Storage(imageUrl/videoUrl/slideUrls) + DB row 완전 삭제 (신규)
  - `posted` 30일 규칙은 유지하되 Meta 연동 전 데드 상태임을 코드 주석으로 문서화
  - 반환값 `{ rejectedDeleted, failedDeleted, slideUrlsPurged, postedArchived }` 통계 객체
- [x] `getStorageUsage()` 함수 — 버킷별 파일 개수 + 총 바이트 합산 (페이지네이션 지원, 1000개/요청)
- [x] `GET /api/admin/storage/usage` 엔드포인트 — 모든 버킷 집계 + 합계

**범위 밖 (Phase 2.8로 분리)**: Meta Graph OAuth, `postedAt`/`metaPostId` 세팅, 자동 게시, 게시 후 재생성 가드

#### Phase 2.6-E: 무드 기반 브랜드 음악 자동 선택 ✅ (2026-04-21)

**동기**: 인스타그램 내장 음악 라이브러리는 Graph API로 쓸 수 없음 (Meta 라이선스 제약). 대신 `brand-music` 버킷에 올려둔 자체 트랙 중 **포스트 분위기에 맞는 음악을 자동 선택**해서 reel/tiktok/motion_reel에 합성.

**통제 어휘 8종** (`shared/moods.ts`, value = label, 한글 고정):
- 발랄함 / 따뜻함 / 차분함 / 신나는 / 포근함 / 당당함 / 아련함 / 명랑함

**완료 체크리스트**:
- [x] `shared/moods.ts` — `MOOD_VALUES`, `MOOD_FALLBACK="따뜻함"`, `normalizeMood()`, `MOOD_DESCRIPTIONS`
- [x] `claudeMarketingService.generateMarketingContent` 응답에 `mood` 필드 추가 (시스템 프롬프트에 통제 어휘 주입)
- [x] `classifyMoodFromCaption()` 신규 함수 — 이미 생성된 caption을 분류 (regenerate 경로용). 1회당 ≈ $0.001
- [x] `server/services/brandMusicSelector.ts` — `selectBrandMusicForMood(mood)`
  - 활성 `brand_music` 트랙 중 mood 일치 → LRU(`content.lastUsedAt`) → 선택
  - 일치 없으면 `따뜻함` fallback → 그래도 없으면 전체 중 LRU
  - 라이브러리 empty면 null 반환 → 호출자가 item을 `failed`로 마킹 (사용자 정책: 무음 게시 절대 금지)
  - 선택 직후 `lastUsedAt` write-back으로 로테이션 보장
- [x] `adminRoutes.buildGenerateImageBody(queueItemId)` — `MUSIC_ENABLED_TYPES={reel, tiktok, motion_reel}`에만 `{audioEnabled, musicUrl, musicVolume:40}` 주입. 외 타입은 `{}` 반환
- [x] bulk-generate + regenerate 두 경로 모두 빈 `{}` → `buildGenerateImageBody()` 경유로 변경
- [x] 라이브러리 비어있을 때 에러 → schedule_item + queue_item 모두 `failed` + rejectionReason에 한글 안내 메시지 저장 (bulk-progress UI 툴팁에 표출)
- [x] `admin-brand-studio` 업로드 드롭다운을 8개 한글 통제 어휘로 교체. 업로드된 각 트랙 행에 **인라인 mood Select 추가** — 사용자가 기존 3개 트랙을 새 어휘로 즉시 재태깅 가능. 무효 태그는 amber 경고 스타일로 표시

**persistence 결정**: marketing_queue에 mood 컬럼 추가 없이, caption을 기반으로 bulk/regenerate 시점에 `classifyMoodFromCaption` 재호출. schema.ts 금칙 준수. 추가 Claude 호출 비용은 39개/월 기준 ≈ $0.04 (무시 가능)

**사용자 운영 플로우**:
1. `/admin/brand-studio` → 음악 탭에서 8가지 mood별로 최소 1곡씩 업로드 (기존 3곡은 인라인 Select로 재태깅)
2. `/admin/scheduler`에서 "전체 제작" 클릭
3. 각 reel/tiktok/motion_reel마다 Claude가 caption mood 분류 → selector가 트랙 선택 → FFmpeg가 영상에 합성
4. 콘솔 로그: `[BrandMusic] queue=... mood=발랄함 → track="아침산책테마" (exact)`

**범위 밖**: 시즌/시간대 혼합 태깅, Claude에 트랙 목록 직접 제시해서 고르게 하는 방식, Meta 자동 게시

#### Phase 2.6-F: 영상 품질 가드 — 입/음식 왜곡 억제 ✅ (2026-04-21)

**증상**: bulk-generate로 만든 motion reel에서 "간식을 입에 물고 뱉는" 장면이 명백히 AI 티가 나는 왜곡(턱 morphing, 음식 픽셀 변형, 혀 아티팩트)을 보임. image-to-video 모델(Kling v2.5-turbo / v1.6 / Veo2) 모두 **입-음식 복합 모션**에서 실패율이 매우 높음.

**원인**:
- `claudeMarketingService.convertCaptionToVideoPrompt` 시스템 규칙이 속도만 통제하고 **피해야 할 동작 금칙어가 없음** → 캡션에 "씹는 리듬" 있으면 Claude가 그대로 모션 프롬프트로 변환
- `falService.ts` Kling 호출 3곳(v2.5-turbo/pro img2vid, v1.6/pro img2vid, o1 ref-to-vid) 모두 `negative_prompt` 미사용 → 실패 양태를 억제할 수단 없음

**수정 (이중 방어)**:
- [x] `convertCaptionToVideoPrompt` 시스템 프롬프트에 **FORBIDDEN MOTIONS** 섹션 추가: 입 벌리고 씹기/먹기/핥기, 음식 떨어뜨리기, 혀 내밀기, 짖기/하품 등 금지. 캡션에 "씹는/먹는/핥는/간식/물고" 단어가 나와도 안전 모션(꼬리 흔들기, 귀 씰룩, 고개 기울이기, 느린 눈 깜빡임, 걷기)으로 reframe 의무
- [x] `generateAIDAScript.sceneHints` 규칙에 "영상 애니메이션 대상이므로 입에 음식/혀 내밀기/입 벌림 장면 금지. 음식 관련 토픽은 간접 구도로 전환(예: 간식이 바닥에 놓인 채 소파에서 쉬는 강아지)" 추가 — 참조 이미지부터 애초에 안전 구도로 생성
- [x] `falService.ts`에 공용 `KLING_NEGATIVE_PROMPT` 상수 추가 (morphing face, distorted mouth, deformed jaw, melting teeth, food appearing/morphing, unnatural chewing, tongue/saliva artifacts, uncanny valley) → Kling v2.5-turbo/pro img2vid, v1.6/pro img2vid, o1 ref-to-vid 3곳 모두 `negative_prompt` 전달. Veo2는 API 상 negative_prompt 미지원이므로 Claude 프롬프트 레이어만으로 방어

**추가 비용**: 0 (프롬프트 수정과 negative_prompt 필드 추가뿐). Kling 호출 비용·지연시간 동일

**범위 밖 (효과 부족 시 다음 단계)**:
- 복잡도 라우팅 — Claude가 `simple/medium/complex` 태그 반환 → complex면 Veo2 + 5초로 강제
- 콘텐츠 플래너 단에서 릴스 주제 추천 시 "먹는 컷/씹는 컷" 원천 배제
- Post-QA — 생성 후 첫/끝 프레임을 Claude Vision으로 비교해 얼굴 왜곡 자동 탐지 후 재생성

#### Phase 2.6-G: 스케줄러 진행 박스 stale 카운트 수정 ✅ (2026-04-21)

**증상**: 이전 배치에서 39개를 생성했던 사용자가 모두 삭제하고 2개만 다시 만드는데, 상단 "제작 진행" 박스가 여전히 `0 / 39 완료`로 나오고, 실제 생성 중인 2개에 대해 "N개 생성 중" 문구가 표시 안 됨

**원인 (두 버그 중첩)**:
- 클라이언트 — `deleteMut`/`bulkGenerateMut`/`generateMut`/`approveAllMut`/`regenerateMut` 모두 `schedule/items` 쿼리만 invalidate하고 `schedule/bulk-progress`는 건드리지 않음. `refetchInterval`이 캐시된 `counts.generating`을 읽고 0이면 `false` 반환하는 구조라서 stale 캐시가 스스로 갱신을 차단 → 39/0/0/0 캐시가 영원히 남음
- 서버 — `bulk-progress` reconcile이 `queue.status === "approved" && queue.imageUrl` 조건만 체크. copy 생성 직후 `queue.imageUrl=null`인 전이 구간에서 조건 실패 → `item.status`(`generateCopyForScheduleItem`이 copy 직후 `"generated"`로 세팅)로 fallback → 이미지 생성 시작 전에도 "완료"로 오분류

**수정**:
- [x] `admin-scheduler.tsx`에 `invalidateScheduleQueries()` 헬퍼 도입 — items + bulk-progress 두 키를 함께 invalidate. 7개 mutation(generate/update/delete/approveAll/runNow/bulkGenerate/regenerate) 전 경로 적용
- [x] `bulk-progress` reconcile 우선순위 재정의: `queue.status === "failed"` → failed; `queue.status === "generating"` → generating; `queue.imageUrl || queue.videoUrl` → generated; **그 외 queue 로우 존재만으로 → generating** (copy 끝나고 이미지 대기 중인 전이 구간 안전 처리)

---

#### Phase 2.6-H: 주차 Accordion 배지 stale 상태 수정 ✅ (2026-04-21)

**증상**: 2개 컨텐츠 모두 생성 완료되어 상단 "제작 진행" 박스는 `2 / 2 완료`를 올바르게 표시하는데, 주차 Accordion 헤더의 "생성 중" 스피너 배지와 개별 행의 상태 배지가 계속 "생성 중"으로 남음

**원인**: 상단 박스는 서버의 `progress.counts`(bulk-progress reconcile 결과)를 사용하지만, Accordion 헤더 loop와 행 렌더링은 클라이언트 로컬 `effStatus` 계산에서 `item.status`(`schedule_item` DB 컬럼)로 fallback. `schedule_item.status`는 `generateCopyForScheduleItem`이 copy 완료 시 한 번 세팅한 뒤 이후 큐 전이(success/failure)를 반영하지 않음 → 상단과 하단이 서로 다른 출처를 읽어 불일치

**수정**:
- [x] `bulk-progress` 응답에 `statusByItemId: Record<string, string>` 맵 추가 — reconcile한 최종 상태를 item id별로 클라이언트에 노출
- [x] `BulkProgress` 타입에 `statusByItemId?` 필드 추가
- [x] Accordion 헤더 loop(라인 734)와 행 렌더링(라인 780)의 `effStatus`/`effectiveStatus` 계산이 `progress?.statusByItemId?.[id] || item.status` 순서로 서버 reconcile 결과를 우선 사용하도록 변경

---

## Phase 2.6: Content Scheduler 구현 체크리스트 (✅ 완료)


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

---

## Phase 2.9-A, B, C1: 모션 Reels 완료 구현 (✅)

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


---

## 2026-04-20 버그픽스 기록

## 2026-04-20 — Puppeteer 타임아웃 수정 (Motion Reel 생성 실패 대응)

**문제**: 연속 모션 릴 생성 시 Puppeteer `Page.captureScreenshot timed out` 에러 — FFmpeg 대량 처리 후 리소스 부족으로 브라우저 응답 불가
**원인**: `protocolTimeout` 미설정 (기본 30초), 브라우저 재사용 시 stale 연결 처리 없음
**수정** (`templateRenderer.ts`):
- `protocolTimeout: 120_000` 추가 (30초 → 120초)
- `--single-process` Chromium 플래그 추가 (Railway 메모리 절약)
- 비연결 브라우저 자동 정리 후 재시작
- `renderHtmlToImage`에 1회 재시도 로직 추가 — 타임아웃 시 브라우저 재시작 후 재시도

## 2026-04-20 — 모션 릴 4컷 콜라주 출력 버그 수정

**문제**: 모션 릴 생성 시 각 scene 이미지가 2×2 그리드 콜라주로 나옴 → 4 scene × 4컷 = 16개 사진이 한 영상에 박혀 있는 모양.

**근본 원인**: `nano-banana-2/edit`에 참조 이미지(국둥이 사진)를 최대 5장(`image_urls`)을 통째로 전달 → 모델이 "참조 이미지를 다 보여달라"로 해석해 한 출력 프레임에 그리드/몽타주로 합성. 모션 릴은 4 scene을 병렬로 호출하므로 모든 scene이 동일한 콜라주를 만들어냄.

**수정** (`server/adminRoutes.ts` motion_reel 분기):
1. **참조 이미지 라운드로빈 1장 제한**: 4 scene 각각 `referenceImages[i % len]` 1장만 전달. 국둥이 얼굴 일관성은 유지하면서 모델이 "여러 장 합성" 해석할 근거 자체를 제거.
2. **프롬프트 안전장치**: cleanPrompt 끝에 `Single unified composition, one continuous scene with one dog. NO grid, NO collage, NO split-screen, NO multi-panel, NO photo montage.` 추가.
3. Single-image 폴백도 `referenceImages.slice(0, 1)`로 통일.

**영향 범위**: 모션 릴 전용. 일반 이미지/카드뉴스/Kling 영상 파이프라인은 손대지 않음.

## 2026-04-20 — 비동기 생성 흐름 CREDIT_EXHAUSTED 알림 복구

**문제**: FAL.AI 잔액 부족 시 모션 릴/영상/이미지 생성이 그냥 "생성 실패" 토스트만 띄우고, 기존에 만들어둔 "잔액 부족 + 충전하러 가기" AlertDialog가 뜨지 않음.

**근본 원인**: `/generate-image` 라우트가 비동기 IIFE 패턴(`res.json({status:"generating"}); (async () => {...})();`)을 쓰는데, 200 응답이 먼저 나간 뒤 IIFE 내부에서 `CREDIT_EXHAUSTED:fal.ai` 에러가 던져짐. 라우트 끝의 402 catch 핸들러는 동기 경로에서만 작동하므로 IIFE catch가 에러를 그냥 삼키고 `status: "failed"`만 저장 → 프런트엔드 폴링이 사유를 알 수 없음.

**수정**:
- `server/adminRoutes.ts` 세 IIFE catch 블록 (motion_reel L1741, video L1886, image L1966) 모두 `bgErr.message`를 `rejectionReason` 컬럼에 저장하도록 변경. CREDIT_EXHAUSTED 외 일반 실패 사유도 보존.
- `client/src/pages/admin-marketing.tsx` 폴링 루프 (L387~): `item.rejectionReason`이 `CREDIT_EXHAUSTED:`로 시작하면 기존 `setCreditAlert({...})` 다이얼로그를 자동 트리거. 그 외 실패는 사유를 토스트 description으로 표시.
- `chargeUrl`은 동기 경로와 동일하게 `https://fal.ai/dashboard/usage-billing/credits` 하드코딩 (서비스명만 메시지에서 파싱).

**스키마**: `marketing_queue.rejection_reason` 필드 기존 존재. 마이그레이션 불필요.

## 2026-04-20 — FFmpeg zoompan 프레임 폭주 버그 수정 (Motion Reel 생성 실패 근본 원인)

**문제**: 멀티 이미지 모션 릴 세그먼트 렌더링 시 FFmpeg가 타임아웃 (`ffmpeg timed out after 120s`, frame=21209)
**근본 원인**: `-loop 1 -t 5.5 -i image.jpg`가 138개 입력 프레임 생성 → zoompan `d=138`이 **입력 프레임당** 138개 출력 → 138×138 = 19,044 프레임(14분 분량). 5.5초짜리 세그먼트에 14분짜리 영상을 인코딩하고 있었음.
**수정** (`motionReelsService.ts`):
- 멀티 이미지 세그먼트: `-t SEG_DURATION` 제거, `-frames:v 138` 추가로 출력 프레임 수 정확히 제한
- 싱글 이미지: 입력에서 불필요한 `-t DURATION` 제거 (출력 `-t 20`이 이미 제한)
- 세그먼트당 렌더링 시간: ~120초 → ~1-2초로 단축

---

## 2026-04-20 — Reel 오버레이 디자인 탐색 (미커밋 작업 정리)

**배경**: Motion Reel AIDA 텍스트 오버레이의 시각적 시안을 비교하기 위해 4/20 오후에 9종의 후보 템플릿을 만들고, Puppeteer로 일괄 렌더링해 PNG로 비교한 작업이 있었음. 현재 일부 후보가 미커밋 상태로 작업 트리에 남아 있음.

**타임라인 (mtime 기준)**:
1. 15:17 — 1차 후보 4종 생성: `reel-overlay-bottom.html`, `-center.html`, `-cinematic.html`, `-lower-third.html`
2. 15:36 — 2차 후보 2종: `-clean.html`, `-gradient.html` (1차에서 디테일 정제)
3. 16:35~16:43 — 3차 후보 3종: `-canva-1.html`, `-canva-2.html`, `-canva-3.html` (Canva 스타일 변형, design-system 미사용)
4. 16:44 — `render-reel-previews.ts` 작성: 2·3차 후보 5종(`gradient/clean/canva-1/2/3`)을 1080×1920 PNG로 렌더링하는 일회성 비교 스크립트
5. 16:58 — `test-motion-effects.sh` 작성: FFmpeg Ken Burns/Pan/Tilt 5종 효과 로컬 검증 스크립트 (Phase 2.9-B 효과 다양화 작업의 일부)

**채택 결과**:
- 프로덕션은 5종 채택 → `motionReelsService.ts:32-36` `OVERLAY_TEMPLATES` 맵에서 `gradient/clean/canva-1/canva-2/canva-3` 사용 중. 모두 커밋 완료.
- 1차 후보 4종(`bottom/center/cinematic/lower-third`)은 코드 어디에서도 참조되지 않음 → 비채택 디자인 시안

**현재 작업 트리 상태 (미커밋)**:
- `server/templates/reel-overlay-bottom.html` — 비채택 시안 (production 미참조)
- `server/templates/reel-overlay-center.html` — 비채택 시안
- `server/templates/reel-overlay-cinematic.html` — 비채택 시안
- `server/templates/reel-overlay-lower-third.html` — 비채택 시안
- `render-reel-previews.ts` — 1회성 비교 렌더 스크립트 (PNG 결과는 `/tmp`로 저장, 하드코딩된 사용자 스크린샷 경로 의존)
- `test-motion-effects.sh` — FFmpeg 효과 검증 스크립트 (output: `/tmp/motion-*.mp4`)

**처리 완료 ✅ (2026-05-05)**:
- 비채택 시안 4종(`reel-overlay-bottom/center/cinematic/lower-third.html`) 삭제 — production 미참조, 디자인 탐색 잔재 정리
- Dev 스크립트 2종을 새 `tools/` 디렉터리로 이동·커밋:
  - `tools/render-reel-previews.ts` — 하드코딩된 macOS 임시 스크린샷 경로를 CLI 인자(`process.argv[2]`)로 변경, 누락 시 usage 출력 후 종료. 사용법: `tsx tools/render-reel-previews.ts <background-image-path>`
  - `tools/test-motion-effects.sh` — 그대로 이동 (FFmpeg 효과 5종 로컬 검증, output `/tmp/motion-*.mp4`)
- 향후 새 오버레이 시안 추가 또는 모션 효과 튜닝 시 두 스크립트 재사용 가능

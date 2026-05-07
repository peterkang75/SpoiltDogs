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

## Pending

- Phase 3.0-B: 상품명 SpoiltDogs 톤 자동 정리 (AI rename) — 2026-05-07 배포 완료
  - `server/services/productNameService.ts`: Claude (claude-sonnet-4-5)로 supplier 키워드 스터핑형 제목 → "Quiet Confidence" 톤. 50자 이내 영어 Title Case + 25–60단어 description
  - `POST /api/admin/ai/polish-name` (제안만), `POST /api/admin/products/:id/rename` (즉시 적용)
  - 공급사 import 직후 자동 polish + 폼에 적용 (사장님 확인 후 저장)
  - 상품 행에 ✨ rename 버튼 (즉시 AI 적용 + DB 갱신)
  - 편집 다이얼로그 상품명 옆 "AI 자동 이름" 버튼
  - JSON 파싱 실패/AI 호출 실패 시 원본 이름 fallback. 수동 input 그대로 유지
- Phase 3.0-C: 호주 시장 기본 카테고리 8개 시드 — 2026-05-07
  - Food & Treats, Toys, Beds & Furniture, Walking & Travel, Grooming & Care, Health & Wellness, Apparel, Bowls & Feeding
  - 각 카테고리 영문 slug + Quiet Confidence 톤 1문장 description
  - Supabase production DB에 직접 POST (어드민 API 8회 호출). 코드 변경 없음
  - 기존 "Toy" (slug=`Toy`, 대문자) 1개는 사장님 정리 대기
- Phase 3.0-A: 어드민 상품 카테고리 관리 + 공급사 자동 매핑 — 구현 완료, UI 검증 대기 (2026-05-07)
  - [x] `server/storage.ts`: `getCategoryById`, `updateCategory`, `deleteCategory` (삭제 시 사용 중 상품 `categoryId` NULL 처리)
  - [x] `server/adminRoutes.ts`: `GET/POST/PATCH/DELETE /api/admin/categories` (productCount 포함, slug 충돌 방지)
  - [x] `client/.../admin-products.tsx`:
    - 헤더 "카테고리 관리" 버튼 + `CategoryManagerDialog` (CRUD + 인라인 수정)
    - 필터 바에 "전체 카테고리/미지정/카테고리별" select 추가
    - 테이블에 카테고리 컬럼 + 인라인 카테고리 변경 select
    - `fillFormFromSupplierProduct`에 `matchSupplierCategory` 자동 매핑 (이름/슬러그/토큰 부분일치)
    - 공급사 검색 결과 행에 매칭 미리보기 (→ 카테고리명 / 매칭 없음)
    - 편집 다이얼로그 카테고리 select의 `value=""` Radix 위반 수정 (`__none__` 사용)
  - 스키마 변경 없음 (기존 `categories` + `products.categoryId` 활용)
- Phase 2.5-J: 고정 배경 합성 (Inpainting) — 배경 라이브러리 + 마스크 편집기 + FAL inpaint 모델로 국둥이 합성. 배경 일치도 90~95% 목표.
- Phase 2.6 Content Scheduler — 진행 중 (2.6-A/B/C/D/E 완료, Meta 연동은 Phase 2.8)
- Phase 2.8 Meta/TikTok SNS publishing
- Phase 2.9-C 미완료 고급 기능:
  - [ ] 가변 길이 (대본 길이에 따라 15-30초 자동 조정)
  - [ ] Puppeteer 애니메이션 프레임 캡처로 정교한 텍스트 모션 (우선순위 낮음)
  - [ ] 음악 비트 동기화 (우선순위 낮음)
- Caption inline edit feature
- `cardNewsService.ts` + `sharp` 패키지 정리 (데드 코드 제거)
- Brand Studio `post_guideline`에 AIDA 가이드라인 반영 (→ `BRAND_STRATEGY.md` 참고)

## Post-Replit Migration Debt (2026-04-14~)
- ✅ Railway 배포, Supabase Postgres/Storage 전환, 커스텀 도메인 연결 완료
- ✅ Stripe 키 env 기반 전환 (`stripe-replit-sync` 제거)
- ✅ WooCommerce 에뮬레이터 AutoDS/Syncee User-Agent 분기
- [ ] OpenAI 호출 경로: Replit modelfarm proxy → 실제 `OPENAI_API_KEY` 사용으로 검증 필요
- [ ] 남아있는 `REPLIT_*` 환경변수 참조/로컬 `client/public/uploads/` 쓰기 경로 정리 (memory/project_replit_debt.md 참조)

---

## Completed (상세는 PLAN_ARCHIVE.md 참고)

- ✅ Phase 2.5-H ~ 2.5-S: Marketing Command Center 전체
- ✅ Phase 2.6-A ~ 2.6-G: Content Scheduler 핵심 기능
- ✅ Phase 2.7: Puppeteer 디자인 시스템 + 멀티슬라이드 파이프라인
- ✅ Phase 2.9-A: 모션 Reels MVP (Ken Burns + AIDA 텍스트 오버레이 + 음악 합성)
- ✅ Phase 2.9-B/C1: 오버레이 레이아웃 · 인스타그램 프리뷰 모달
- ✅ 2026-04-20: 첨부 미디어 우선 사용 파이프라인

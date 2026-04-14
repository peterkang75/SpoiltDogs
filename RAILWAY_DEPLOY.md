# Railway 배포 가이드

## 1. GitHub 저장소 준비

```bash
git add -A
git commit -m "chore: migrate uploads to Supabase Storage; prepare Railway"
git push origin main
```

(GitHub에 push할 remote가 없으면 먼저 repo 만들고 `git remote add origin ...`)

## 2. Railway 프로젝트 생성

1. https://railway.app 로그인 (GitHub 연동 권장)
2. **New Project** → **Deploy from GitHub repo** → SpoiltDogs 저장소 선택
3. Railway가 자동으로 `railway.json` 감지 → Nixpacks 빌드 시작

## 3. 환경변수 설정

Railway 프로젝트 대시보드 → **Variables** 탭 → `.env.example` 참고하여 추가.

최소 필수:
- `DATABASE_URL` (현재 `.env`에서 복사)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `ADMIN_PASSWORD`
- `SESSION_SECRET` (새로 생성 — `openssl rand -hex 32`)
- `ANTHROPIC_API_KEY`
- `FAL_API_KEY`
- `NODE_ENV=production`

Railway는 `PORT`를 자동 주입합니다.

## 4. 도메인 설정

Variables 탭 아래쪽 → **Networking** → **Generate Domain** 클릭 → `xxx.up.railway.app` URL 발급.

원하면 **Custom Domain** 추가 (CNAME 설정 필요).

## 5. 배포 확인

- Railway 대시보드 상단 **Deployments** 탭에서 빌드 로그 모니터링
- 빌드 성공 후 발급 URL 접속 → `/admin/login` 로그인 테스트
- `/admin/brand-studio`에서 국둥이 이미지 55개 보이는지 확인

## 6. 로컬 개발

여전히 로컬에서 `npm run dev` 가능. 로컬과 배포 환경 모두 같은 Supabase DB/Storage를 바라봄.

로컬 테스트용 환경변수는 `.env` (gitignore됨), 배포용은 Railway Variables.

## 주의사항

- `client/public/uploads/`는 더 이상 사용 안 함. 파일은 로컬에만 남아있음(백업용).
- `stripe-replit-sync` 패키지는 Replit 환경 전용 토큰(`X-Replit-Token`)을 찾음. Railway에선 Stripe 키를 직접 env var로 넣거나 이 통합 비활성화 필요 (별도 작업).
- `REPLIT_*` 환경변수는 이제 참조되지 않음.

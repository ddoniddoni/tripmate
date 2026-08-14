# TripMate

TripMate는 여행 일정을 여러 사용자가 함께 만들고 편집하는 협업형 여행 플래너입니다. 인증된 멤버의 여행 메타데이터는 Supabase에, 함께 편집하는 일정 문서는 Liveblocks에 저장하는 첫 번째 수직 슬라이스를 제공합니다.

## Current scope

- `/trips`: 실제 Supabase 인증 사용자에게 RLS로 보호된 여행 목록·생성
- `/trips/[tripId]`: 실제 인증 멤버가 Liveblocks Storage에서 같은 일정을 보고 추가·수정·삭제·날짜 안팎 순서 변경을 함께 하는 편집기. owner는 editor/viewer 초대 링크 생성·대기 초대 취소 가능
- 개발 환경 이메일 즉시 시작, Supabase 매직 링크 로그인·로그아웃, 서버 검증 기반의 `/trips` 접근 보호
- 데스크톱 3열 레이아웃과 모바일 단일 열 레이아웃
- 공식 Pretendard 가변 다이나믹 서브셋을 자체 번들로 로드하는 한글 UI
- Zod로 검증하는 여행·일정·장소 도메인 모델과 결정론적 제주 fixture
- 포인터·키보드 드래그 핸들, 다른 날짜 드롭 대상, 위·아래·날짜 간 이동 컨트롤
- 디바운스·취소 처리가 있는 mock 장소 검색, 타임라인·지도 마커 선택 동기화, 확정된 일정 순서 기반 mock 경로 계산
- 날짜–아이템 참조 무결성, CRUD, 같은 날짜·다른 날짜 이동과 주요 편집 흐름에 대한 Vitest 테스트
- Zod 기반 공개 앱 URL 검증
- TypeScript strict, ESLint, production build 설정

실제 인증 멤버의 일정은 `trip:{tripId}` Liveblocks 방의 Storage가 단일 원본입니다. 새 방은 여행 날짜로 초기화되고, 이후 추가·수정·삭제·이동은 확정 시점에 한 번만 공유 저장소에 반영되어 새로고침과 다른 멤버 화면에도 남습니다. 각 멤버는 헤더의 되돌리기·다시 실행 버튼 또는 `⌘/Ctrl+Z`, `⌘/Ctrl+Shift+Z`로 자신이 수행한 마지막 변경을 되돌리거나 다시 적용할 수 있습니다. Supabase 서버는 멤버십을 확인해 owner/editor에는 쓰기 권한, viewer에는 읽기 권한만 발급합니다. 다른 날짜 버튼으로 드래그하면 해당 날짜의 마지막에 추가되고, 카드의 이동 버튼에서는 날짜 내 위치까지 지정할 수 있습니다. 장소 검색과 경로 계산은 Mapbox 교체를 전제로 한 합성 제주 어댑터입니다. 경로는 확정된 추가·수정·삭제·순서 변경 뒤에만 다시 계산하며, 동일한 이동 수단과 좌표 순서는 메모리 캐시를 재사용합니다. 개발 모드의 “이메일로 바로 시작하기”는 메일을 발송하지 않고 실제 Supabase 사용자·세션을 만듭니다. 따라서 개발 중에도 여행 생성, 초대, RLS, Liveblocks 권한이 모두 동일하게 적용됩니다. 이 경로는 `NODE_ENV=development`에서만 켜지며, 누구나 입력한 이메일로 로그인할 수 있으므로 외부에 노출된 개발 서버에서는 사용하면 안 됩니다. 프로덕션에서는 Supabase 매직 링크 로그인만 사용됩니다. owner는 이메일과 `editor` 또는 `viewer` 권한을 지정해 7일짜리 초대 링크를 만들 수 있으며, 링크와 일치하는 이메일의 실제 인증 계정만 수락할 수 있습니다. 초대 이메일 발송은 아직 연결하지 않았으므로 링크를 직접 전달해야 합니다. `profiles`, `trips`, `trip_members`, `trip_invitations` 스키마와 RLS 정책은 [`supabase/migrations`](supabase/migrations)에 있습니다. 구현 순서와 상태 소유권 원칙은 [`docs/TRIPMATE_ENGINEERING_GUIDE.md`](docs/TRIPMATE_ENGINEERING_GUIDE.md)를 따릅니다.

## Supabase authentication setup

`.env` 또는 `.env.local`에 아래 값을 채웁니다. 새 프로젝트는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 권장하며, 기존 `NEXT_PUBLIC_SUPABASE_ANON_KEY`도 호환됩니다.

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
LIVEBLOCKS_SECRET_KEY=sk_...
```

Supabase Dashboard의 **Authentication → URL Configuration**에서 Site URL을 위 앱 URL로 설정하고, 배포 주소도 Redirect URLs에 추가하세요. **Authentication → Email Templates**에서 **Confirm signup**과 **Magic link** 템플릿 모두의 링크를 다음 형식으로 바꾸면 서버가 토큰을 쿠키 세션으로 바꿀 수 있습니다.

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## Liveblocks collaboration setup

Liveblocks Dashboard에서 프로젝트를 만든 뒤 server secret key를 `.env` 또는 `.env.local`의 `LIVEBLOCKS_SECRET_KEY`에 넣습니다. `NEXT_PUBLIC_` 접두사는 사용하지 않으며, 키를 브라우저나 채팅에 공유하지 마세요. 실제 Supabase 인증 멤버만 `/api/liveblocks-auth`를 통해 `trip:{tripId}` 방에 접속합니다. 방의 `dayOrder`, 날짜별 아이템 순서와 아이템 상세는 Liveblocks Storage에 보관되고, 여행 정보·멤버십·초대는 Supabase가 계속 관리합니다.

로컬 `npm run dev`의 즉시 로그인도 실제 Supabase 계정과 멤버십을 사용하므로, `LIVEBLOCKS_SECRET_KEY`가 설정돼 있으면 협업 권한도 받습니다. 서로 다른 두 이메일로 로그인해 한 사람이 만든 여행에 다른 사람을 초대하면 실제 공동 편집을 확인할 수 있습니다.

## Requirements

- Node.js 20.9.0 이상
- npm

## Applying the trip membership migration

Supabase CLI가 필요하며, 로컬 Docker 환경 또는 연결된 Supabase 프로젝트 중 하나가 있어야 합니다. 원격 프로젝트에 적용할 때는 CLI 로그인을 완료하고 Dashboard의 **Project Settings → Database**에서 확인할 수 있는 database password를 입력합니다. service-role key는 마이그레이션 적용에는 필요하지 않지만, 개발용 직접 로그인에만 서버 내부에서 사용됩니다. 브라우저 변수(`NEXT_PUBLIC_*`)로 노출하면 안 됩니다.

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push --linked
```

이 마이그레이션은 새 Auth 사용자와 기존 Auth 사용자 모두에 빈 공개 프로필을 만들고, 여행 생성자를 자동으로 owner 멤버로 등록합니다. 공개 API 테이블에는 모두 RLS가 켜져 있습니다. `viewer`는 읽기 전용, `editor`는 공유 일정 편집 가능, `owner`만 멤버 관리와 여행 삭제 권한을 갖습니다. 초대 토큰과 수락 흐름은 `trip_invitations` 마이그레이션으로 추가되어 있습니다.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

개발 서버가 시작되면 `http://localhost:3000/login`에서 이메일을 입력해 실제 Supabase 세션으로 바로 시작한 뒤, `http://localhost:3000/trips`에서 여행을 만들고 편집할 수 있습니다. `NEXT_PUBLIC_APP_URL`을 설정하지 않으면 로컬 개발 기본값으로 `http://localhost:3000`을 사용합니다.

## Commands

```bash
npm run dev        # 개발 서버
npm run lint       # ESLint 검사
npm run typecheck  # TypeScript 검사
npm run test       # Vitest 단위 테스트
npm run test:watch # Vitest 감시 모드
npm run build      # 프로덕션 빌드
npm run start      # 빌드된 앱 실행
```

현재 테스트는 도메인 데이터와 선택자, 날짜 안팎의 일정 변경 연산, 장소 검색·경로 어댑터와 쿼리 키, 매직 링크 이메일 검증, jsdom 기반 편집기 동작을 다룹니다. 실제 인증 이메일 왕복과 포인터 드래그·dnd-kit 키보드 센서는 브라우저 E2E 도입 시 검증할 예정입니다.

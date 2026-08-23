<div align="center">

# TripMate

### 함께 계획하고, 같은 여행을 기대하는 방법

친구들과 한 화면에서 일정을 만들고, 장소·준비물·공동 경비까지 정리하는<br />
**실시간 협업 여행 플래너**

[![Live Demo](https://img.shields.io/badge/Live-Demo-0F766E?style=for-the-badge&logo=vercel&logoColor=white)](https://tripmate-xi-six.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-111111?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Portfolio](https://img.shields.io/badge/Portfolio-Project-F59E0B?style=for-the-badge)](https://github.com/ddoniddoni/tripmate)

[서비스 열기](https://tripmate-xi-six.vercel.app) · [개발 포트폴리오](docs/PORTFOLIO.md) · [기능 살펴보기](#핵심-경험) · [로컬에서 실행하기](#로컬에서-실행하기)

</div>

---

## 여행 계획의 대화가, 실제 일정이 되기까지

여행 준비는 보통 단체 채팅방에서 시작하지만, 맛집 링크와 의견은 금세 흩어집니다.
TripMate는 **장소를 찾고, 일정으로 옮기고, 함께 조정하는 과정**을 하나의 여행판에 담았습니다.

<table>
  <tr>
    <td width="33%" align="center"><strong>📍 발견</strong><br /><sub>가고 싶은 장소를 찾고 후보로 남겨요.</sub></td>
    <td width="33%" align="center"><strong>🗓️ 설계</strong><br /><sub>날짜와 시간에 맞춰 하루의 흐름을 만들어요.</sub></td>
    <td width="33%" align="center"><strong>🤝 완성</strong><br /><sub>친구들과 같은 계획을 보며 함께 결정해요.</sub></td>
  </tr>
</table>

## 핵심 경험

| 여행을 준비하는 순간 | TripMate가 하는 일 |
| --- | --- |
| **“여기 가보고 싶어.”** | Google Places 검색으로 장소를 찾고, 주소·좌표가 포함된 일정 카드로 추가합니다. |
| **“이건 둘째 날이 더 낫겠다.”** | 드래그 앤 드롭으로 같은 날 안에서 순서를 바꾸거나 다른 날짜로 이동합니다. |
| **“동선이 괜찮을까?”** | 타임라인 선택과 지도 마커를 양방향으로 연결하고, 확정된 순서로 이동 경로를 표시합니다. |
| **“같이 정하자.”** | 가입된 계정을 편집자·보기 전용으로 초대하고, 알림에서 수락·거절한 뒤 함께 계획합니다. |
| **“출발 전에 뭐 챙기지?”** | 담당자와 상태를 갖춘 준비물 체크리스트, 공동 경비와 정산 가이드를 한곳에서 관리합니다. |

### 계획을 바꿔도 불안하지 않게

- 일정 추가·수정·복제·삭제와 날짜 간 이동
- 변경 한 번을 한 단계로 되돌리는 Undo / Redo
- 겹치는 일정과 이동 시간에 대한 비차단 안내
- 연결 중·재연결 중·오프라인·읽기 전용 상태를 분명하게 표시
- 데스크톱 3열 편집 화면과 모바일 친화적 화면 전환
- 선택한 테마를 기억하는 라이트 / 다크 모드

### AI로 시작하고, 팀과 완성하기

여행지와 취향을 바탕으로 AI가 하루별 동선 초안을 제안합니다. 초안은 정답이 아니라 출발점입니다. 장소 검색, 시간 조정, 팀원의 의견으로 실제 여행에 맞는 일정으로 다듬을 수 있습니다.

> `OPENAI_API_KEY`가 없는 로컬 개발 환경에서는 외부 호출 없이 명확히 구분된 미리보기 초안을 제공합니다.

## 1분 사용 흐름

```text
이메일·비밀번호 회원가입 / 로그인
        ↓
여행 이름 · 기간 · 목적지로 여행판 생성
        ↓
장소 검색 → 날짜별 일정에 추가 → 드래그로 순서 조정
        ↓
지도와 이동 경로로 동선 확인
        ↓
계정 초대 → 알림에서 수락 → 준비물 · 공동 경비까지 함께 정리
```

## 어떻게 함께 동작하나요?

```mermaid
flowchart LR
  U[여행자] --> W[Next.js App]
  W --> S[Supabase\n인증 · 여행 메타데이터 · 권한]
  W --> L[Liveblocks\n공동 일정 · Presence · Undo/Redo]
  W --> G[Google Maps Platform\n장소 · 지도 · 경로]
  W --> A[OpenAI\n일정 초안 선택 기능]
```

| 영역 | 역할 |
| --- | --- |
| **Supabase** | 이메일·비밀번호 인증, 여행·멤버십·초대 데이터, Row Level Security 기반 권한 관리 |
| **Liveblocks** | 여러 사람이 동시에 다루는 일정·준비물·경비 상태와 접속 상태, 변경 이력 |
| **Google Maps Platform** | 장소 검색·상세 정보, 지도 렌더링, 일정 순서 기반 경로 계산 |
| **OpenAI** | 선택적으로 사용하는 여행 동선 초안 생성 |

## 기술 스택

| 분야 | 사용 기술 |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript |
| UI | CSS, Radix UI, Pretendard |
| Form & Validation | React Hook Form, Zod |
| Drag & Drop | dnd-kit |
| Collaboration | Liveblocks Storage, Presence, History |
| Authentication & Data | Supabase SSR, PostgreSQL, RLS |
| Maps | Google Maps JavaScript API, Places API (New), Routes API |
| Testing | Vitest, React Testing Library, Playwright |
| Deployment | Vercel |

## 로컬에서 실행하기

### 준비물

- Node.js `24.x`
- npm
- Supabase, Liveblocks, Google Maps Platform 계정
- AI 일정 초안을 사용할 경우 OpenAI API 키

```bash
git clone https://github.com/ddoniddoni/tripmate.git
cd tripmate
npm install
cp .env.example .env
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 됩니다.

### 환경 변수

값은 절대 Git에 커밋하지 않습니다. 변수 이름과 설명은 [`.env.example`](.env.example)에 정리되어 있습니다.

| 구분 | 변수 | 설명 |
| --- | --- | --- |
| Public | `NEXT_PUBLIC_APP_URL` | 현재 앱 URL. 로컬에서는 `http://localhost:3000` |
| Public | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| Public | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` **또는** `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저 Supabase 키. 두 키를 함께 설정하지 않습니다. |
| Secret | `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 Supabase 관리자 키 |
| Secret | `LIVEBLOCKS_SECRET_KEY` | 서버에서 협업 권한을 발급하는 키 |
| Secret | `GOOGLE_MAPS_API_KEY` | Places API (New), Routes API용 서버 키 |
| Public | `NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY` | Maps JavaScript API용 브라우저 키 |
| Optional secret | `OPENAI_API_KEY` | Production AI 일정 초안 생성용 키 |

Google 키는 반드시 둘로 분리합니다.

- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY`: 웹사이트 도메인과 **Maps JavaScript API**로 제한
- `GOOGLE_MAPS_API_KEY`: **Places API (New)**, **Routes API**로만 제한하고 서버에만 보관

Google 사용량 한도 변수는 기본값이 준비되어 있습니다. 필요할 때만 `.env.example`의 `GOOGLE_*_LIMIT` 값을 조정하세요. 빈 문자열을 설정하면 안 됩니다.

## 품질 확인

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

| 검증 | 범위 |
| --- | --- |
| Unit / Integration | 일정 도메인 규칙, 권한, 지도·장소 API 어댑터, UI 상호작용 |
| E2E | 비로그인 흐름, 로그인 UI, 모바일 주요 화면 |
| Opt-in authenticated E2E | 전용 테스트 계정으로 이메일 로그인, 여행 생성·삭제 |

인증된 E2E는 실제 Supabase 데이터를 사용하므로 전용 테스트 계정으로만 실행합니다.

```bash
E2E_AUTHENTICATED=1 E2E_TEST_EMAIL=<test-email> E2E_TEST_PASSWORD=<test-password> \
  npx playwright test tests/e2e/authenticated-trip.spec.ts
```

## 배포

권장 릴리스 흐름은 `develop`에서 작업한 뒤 `develop → main` Pull Request로 안정 버전을 승격하고, Vercel Production Branch를 `main`으로 지정하는 방식입니다.

배포 전에 아래를 확인하세요.

- Vercel Production 환경 변수와 `NEXT_PUBLIC_APP_URL`
- Supabase Auth의 Site URL 및 `/auth/confirm` Redirect URL
- Liveblocks 서버 비밀 키
- Google Maps API 활성화, 키 제한, Billing과 예산 알림
- 실제 이메일·비밀번호 회원가입/로그인과 두 계정 협업 흐름

세부 절차는 [배포 체크리스트](docs/DEPLOYMENT_CHECKLIST.md)를 참고하세요.

## 프로젝트 구조

```text
src/
├── app/        # 라우트, 레이아웃, Route Handler
├── features/   # 일정 편집, 지도, 협업, 공유, 경비 등 사용자 기능
├── entities/   # Trip, Itinerary, Place 등 도메인 모델과 규칙
└── shared/     # Supabase 클라이언트, 설정, 공용 UI와 유틸리티
```

의존성은 `app → features → entities → shared` 방향을 지키며, 각 상태는 한 곳에서만 관리합니다. 자세한 설계 원칙은 [Engineering Guide](docs/TRIPMATE_ENGINEERING_GUIDE.md)를 참고하세요.

## 보안과 데이터 원칙

- `NEXT_PUBLIC_` 접두사는 브라우저에 노출되어도 안전한 값에만 사용합니다.
- Liveblocks·Supabase service role·서버 Google·OpenAI 키는 서버 환경 변수로만 보관합니다.
- Supabase 공개 테이블은 RLS를 사용하며, UI 표시 여부와 별개로 서버에서 멤버십·역할 권한을 확인합니다.
- 여행 초대와 개인 여행 정보는 수신자·멤버만 확인할 수 있도록 제한합니다.

---

<div align="center">

**여행 전의 대화를, 출발이 기다려지는 계획으로.**

[TripMate 시작하기](https://tripmate-xi-six.vercel.app) · [GitHub 저장소](https://github.com/ddoniddoni/tripmate)

</div>

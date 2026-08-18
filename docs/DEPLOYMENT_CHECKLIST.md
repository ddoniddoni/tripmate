# TripMate 포트폴리오 배포 체크리스트

> 마지막 갱신: 2026-08-18
>
> 목적: 기능 개발을 종료한 TripMate를 안전하게 Preview로 검증한 뒤,
> 포트폴리오용 Production 서비스로 공개한다.

## 현재 상태

- 기본 원격 브랜치: `develop`
- 로컬 검증 이력: lint, typecheck, unit test(85개 파일·342개 테스트), 기본 E2E, 인증된 E2E 통과
- 아직 필요한 검증: 두 계정 실시간 협업, Preview·Production 스모크 테스트
- 개발 환경에서만 이메일 인증 없이 바로 로그인하며, Production에서는 이메일 매직 링크로 로그인한다.

## 진행 순서

아래 순서대로 진행한다. 새로운 기능은 추가하지 않고, 배포를 막는 버그만 수정한다.

| 단계 | 상태 | 목표 |
| --- | --- | --- |
| 1. 릴리스 후보 확정 | 🟡 진행 중 | 미커밋 기능을 검증하고 Git에 반영 |
| 2. 자동 품질 검증 | 🟡 진행 중 | E2E와 프로덕션 빌드로 핵심 흐름 보호 |
| 3. 외부 서비스 설정 | ⬜ 대기 | Vercel, Supabase, Liveblocks, Google Maps 설정 |
| 4. Preview 배포·실사용 검증 | ⬜ 대기 | 실제 두 계정과 모바일에서 테스트 |
| 5. 포트폴리오 마감 | ⬜ 대기 | 메타데이터, README, 대표 화면 정리 |
| 6. Production 공개 | ⬜ 대기 | 안정 URL 공개 및 배포 후 점검 |

---

## 1. 릴리스 후보 확정

### 해야 할 일

- [ ] 현재 변경 사항의 diff를 검토한다.
- [x] `npm run lint`를 실행한다. (2026-08-18 통과)
- [x] `npm run typecheck`를 실행한다. (2026-08-18 통과)
- [x] `npm test`를 실행한다. (2026-08-18, 85개 파일·342개 테스트 통과)
- [x] `npm run build`를 실행한다. (2026-08-18 통과)
- [x] Node.js 실행 기준을 22.x 이상으로 명확히 고정한다.
- [ ] 변경 사항을 목적에 맞는 Conventional Commit으로 커밋하고 원격에 푸시한다.

### 완료 기준

- 전체 검증이 성공하고, `.env`·키·테스트 산출물이 포함되지 않은 커밋이 원격 `develop`에 존재한다.

### 메모

- Supabase JavaScript 클라이언트는 Node.js 20 지원을 종료했으므로, 배포와 로컬 기준을 Node.js 22.x 이상으로 맞춘다.
- Git 작업(브랜치, 커밋, 푸시)은 별도 명시 요청이 있을 때만 실행한다.
- React Doctor 변경점 진단 결과는 91/100이다. 다음 두 경고는 커밋 전 별도 검토한다.
  - `itinerary-editor-workspace.tsx`: 일정 카드의 boolean props 조합
  - `itinerary-editor-workspace.tsx`: 클릭 가능한 `article` 요소의 키보드 접근성

---

## 2. 자동 품질 검증

### 해야 할 일

- [x] Playwright와 `test:e2e` 스크립트를 추가한다. (2026-08-18)
- [x] 외부 API·DB 쓰기 없이 실행되는 비로그인·로그인 UI·모바일 E2E를 작성한다. (2026-08-18)
- [x] 전용 테스트 계정으로 로그인·여행 생성·삭제를 검증하는 옵트인 E2E를 작성한다. (2026-08-18)
  - 기본 `npm run test:e2e`는 외부 API·DB 쓰기 없이 실행된다.
  - 실제 Supabase 테스트는 전용 계정으로만 실행한다. 생성된 여행은 테스트 마지막에 소유자 권한으로 삭제한다.
  - 실행: `E2E_AUTHENTICATED=1 E2E_TEST_EMAIL=<전용-테스트-이메일> npx playwright test tests/e2e/authenticated-trip.spec.ts`
  - [x] 전용 합성 테스트 계정으로 인증 E2E를 실행한다. (2026-08-18)
  - [x] 이메일 로그인
  - [x] 여행 생성·삭제
  - [ ] 장소 검색 후 일정 추가
  - [ ] 일정 수정·이동·삭제
  - [ ] 지도와 일정 선택 연동
  - [ ] 준비물·공동 경비 입력
  - [ ] viewer 수정 권한 차단
  - [ ] 모바일 주요 화면
- [ ] 단위 테스트, E2E, 프로덕션 빌드를 릴리스 전 필수 검증으로 정한다.

### 완료 기준

- 로컬 및 Preview 환경에서 핵심 여정이 자동 테스트로 재현된다.

---

## 3. 외부 서비스 설정

키 값 자체는 이 문서나 Git에 저장하지 않는다. 각 서비스의 대시보드에 직접 입력한다.

### Vercel

- [ ] GitHub 저장소를 Vercel 프로젝트에 연결한다.
- [ ] Production Branch를 `develop`으로 지정한다.
  - 추후 안정 릴리스용 `main` 브랜치를 다시 운영할 때 이 설정을 변경할 수 있다.
- [ ] Preview와 Production 환경 변수를 분리한다.
- [ ] Preview 배포를 먼저 생성한다.

#### 필요한 환경 변수

| 변수 | 공개 여부 | 용도 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | 공개 가능 | 현재 배포의 정식 URL, 매직 링크·초대 링크 생성 |
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 가능 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 가능 | 브라우저 Supabase 인증 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 비밀 | 서버에서 사용량 제한 및 관리자 작업 수행 |
| `LIVEBLOCKS_SECRET_KEY` | 비밀 | 서버 협업 권한 발급 |
| `OPENAI_API_KEY` | 비밀 | 서버에서 AI 여행 동선 초안 생성 |
| `GOOGLE_MAPS_API_KEY` | 비밀 | 서버 Places·Routes 요청 |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY` | 공개 가능 | 브라우저 지도 표시 |
| `GOOGLE_PLACES_SEARCH_DAILY_LIMIT` | 비밀 | 장소 검색 일일 하드 리밋 |
| `GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT` | 비밀 | 장소 검색 월간 하드 리밋 |
| `GOOGLE_ROUTES_DAILY_LIMIT` | 비밀 | 경로 계산 일일 하드 리밋 |
| `GOOGLE_ROUTES_MONTHLY_LIMIT` | 비밀 | 경로 계산 월간 하드 리밋 |
| `GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT` | 비밀 | 지도 표시 일일 하드 리밋 |
| `GOOGLE_MAPS_JAVASCRIPT_MONTHLY_LIMIT` | 비밀 | 지도 표시 월간 하드 리밋 |

> 로컬 개발에서 `OPENAI_API_KEY`를 비워 두면 외부 호출 없이 “개발용 미리보기” 동선이 표시된다. 초안은 기존 메모를 덮어쓰지 않고 비어 있는 일자의 공유 메모로 가져올 수 있으며, 정확한 장소·운영 정보는 장소 검색으로 확정한다. Preview와 Production에서는 실제 AI 초안을 위해 키가 필요하다.

### Supabase

- [ ] 모든 마이그레이션이 연결된 원격 프로젝트에 적용됐는지 확인한다.
- [ ] Database Security Advisor와 Performance Advisor를 확인한다.
- [ ] 모든 `public` 테이블의 RLS와 정책을 검토한다.
- [ ] Auth Site URL을 Production URL로 설정한다.
- [ ] Redirect URL에 정확한 `https://<production-domain>/auth/confirm`을 등록한다.
- [ ] Preview 로그인까지 검증할 경우 Vercel Preview URL 패턴 `https://*-<team-or-account-slug>.vercel.app/**`도 Redirect URL에 등록한다.
- [ ] 이메일 매직 링크 템플릿이 `{{ .RedirectTo }}`를 사용하도록 확인한다.
- [ ] 외부 사용자 로그인을 공개하려면 Custom SMTP를 설정한다.
- [ ] Supabase 관리자 계정에 MFA를 적용한다.

### Liveblocks

- [ ] Vercel Production에 `LIVEBLOCKS_SECRET_KEY`를 등록한다.
- [ ] editor, viewer, owner 각각의 협업 권한을 실제 계정으로 검증한다.
- [ ] 두 브라우저 컨텍스트에서 동시 수정, 연결 해제, 재접속을 확인한다.

### Google Maps Platform

- [ ] 서버 키는 Places API (New), Routes API만 허용한다.
- [ ] 브라우저 지도 키는 Maps JavaScript API만 허용한다.
- [ ] 브라우저 지도 키에 Production 도메인 HTTP referrer 제한을 설정한다.
- [ ] Preview에서 지도를 시험할 경우 Preview 도메인도 임시로 허용한다.
- [ ] Google Cloud Billing 예산 알림을 설정한다.
- [ ] Google Cloud API quota와 앱 내부 하드 리밋을 함께 검토한다.

### 완료 기준

- Production 환경에서 키 누출 없이 인증, 협업, 장소 검색, 지도, 경로가 모두 동작한다.

---

## 4. Preview 배포·실사용 검증

### 두 계정 시나리오

- [ ] 계정 A가 여행을 생성한다.
- [ ] 계정 A가 계정 B를 editor로 초대한다.
- [ ] 두 계정이 같은 일정을 동시에 편집하고 변경 사항을 확인한다.
- [ ] 계정 B를 viewer로 바꾼 뒤 수정이 차단되는지 확인한다.
- [ ] 계정 A가 준비물과 경비를 변경하고 계정 B에 실시간 반영되는지 확인한다.
- [ ] 장소 검색, 지도 표시, 이동 경로가 정상 동작하는지 확인한다.
- [ ] owner 또는 editor가 AI 동선 초안을 만들고, viewer에게 생성 버튼이 보이지 않는지 확인한다.
- [ ] 로그아웃·재로그인 뒤 초대와 기존 여행 접근이 유지되는지 확인한다.

### 화면·오류 시나리오

- [ ] 데스크톱 Chrome에서 확인한다.
- [ ] 모바일 Chrome 또는 Safari에서 확인한다.
- [ ] 여행 브리핑에서 일정·준비물·정산 요약을 확인하고, 브라우저 인쇄에서 PDF 저장 결과를 점검한다.
- [ ] 빈 여행·빈 일정·검색 결과 없음·네트워크 오류 메시지를 확인한다.
- [ ] Vercel, Supabase, Liveblocks 로그에 오류가 없는지 확인한다.

### 완료 기준

- Preview URL에서 외부 이메일 두 개로 핵심 협업 흐름을 성공적으로 완료한다.

---

## 5. 포트폴리오 마감

- [ ] `metadata.description`을 한국어 제품 소개로 변경한다.
- [ ] OG 이미지와 공유 미리보기를 추가한다.
- [ ] 브라우저 제목, 파비콘, 404·오류 화면을 점검한다.
- [ ] README에 실제 서비스 URL, 대표 스크린샷, 주요 기능을 추가한다.
- [ ] 채용 담당자용 1분 사용 시나리오를 README 또는 프로젝트 소개에 추가한다.
- [ ] 개인정보 처리 안내와 데이터 삭제 문의 방법을 추가한다.
- [ ] 대표 데스크톱·모바일 화면을 캡처한다.

### 완료 기준

- 처음 보는 사람이 링크를 열고, 서비스 목적과 핵심 기술적 강점을 1분 안에 파악할 수 있다.

---

## 6. Production 공개

- [ ] Vercel Production 배포를 실행한다.
- [ ] 실제 Production URL에서 매직 링크 로그인을 재확인한다.
- [ ] 공유·초대 링크가 Production 도메인을 가리키는지 확인한다.
- [ ] Google Maps 사용량과 비용 알림을 확인한다.
- [ ] 배포 후 오류 로그를 확인한다.
- [ ] README와 포트폴리오에 공개 URL을 연결한다.

### 배포 후 유의 사항

- Supabase Free Plan 프로젝트는 장기간 비활성 상태일 때 일시 중지될 수 있다. 포트폴리오를 공유하기 전 프로젝트가 활성 상태인지 확인한다.
- Google Cloud 예산 알림은 알림 기능이며, 단독으로 비용을 차단하지 않는다. API quota와 프로젝트 내부 하드 리밋을 유지한다.
- Production 배포 이후에도 비밀 키는 브라우저 코드, README, GitHub Issue, 채팅에 남기지 않는다.

## 공식 참고 자료

- [Vercel 환경 변수](https://vercel.com/docs/environment-variables)
- [Vercel Git 배포](https://vercel.com/docs/git)
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase Redirect URL](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Google Maps API 키 보안](https://developers.google.com/maps/api-security-best-practices)
- [Google Maps 비용 관리](https://developers.google.com/maps/billing-and-pricing/manage-costs)

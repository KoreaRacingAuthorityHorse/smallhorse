# 통합 구현 Tasks

기준: `MERGE_SOL_ANALYSIS.md`의 최종 Phase 계획. 이 문서는 계획만 담으며 브랜치 전환, 전체 Git merge, commit, push는 수행하지 않는다.

## 고정 계약

- 기준 브랜치 `dev`, 원본 브랜치 `sol-dev`.
- dev의 베팅·구매·정산·지갑 기능과 기존 화면을 보존한다.
- sol-dev에서는 `race-data`와 튜토리얼에 필요한 파일만 선택 이식한다.
- 공공데이터 API 연동, 불필요한 리팩터링, 전체 merge는 제외한다.
- 각 Task 종료 시 변경 파일, `git diff --check`, 관련 TypeScript/ESLint, 기능 검증, 기존 기능 영향을 기록한다. 실행하지 못한 검증은 통과로 기록하지 않는다.

## Phase 1. 통합 준비 및 보호 범위 확정

### T01. 기준 커밋·보호 범위·이식 목록 확정

- **선행 Task:** 없음. `git status --short`로 시작 상태를 확인한다.
- **원본 브랜치 및 이식 대상 파일:** `sol-dev`; 후보 `frontend/src/app/race-data/**`, `frontend/src/styles/race-data.css`, `frontend/src/app/tutorial/**`.
- **수정 대상 파일:** 작업 메모만. 소스 수정 없음.
- **구체적인 구현 지시:** `git rev-parse`, `git merge-base`, `git diff --name-status`, `git merge-tree`를 실행해 최종 트리 diff와 3-way merge 결과를 구분해 기록한다. 보호 대상은 `src/app/betting/**`, 결과 라우트, `src/app/challenge/past`, `src/components/betting`, `src/components/past-race`, `src/lib/past-race`, `src/lib/betting.ts`, `src/data/races.ts`, 관련 테스트로 고정한다.
- **기존 기능 보호 조건:** 보호 대상 삭제·덮어쓰기 금지. 전체 merge, reset, branch switch 금지.
- **완료 조건:** 보호 목록, 이식 목록, 충돌 후보, 기준 SHA가 기록된다.
- **테스트 명령 및 검증 항목:** `git status --short`; `git diff --name-status dev..sol-dev`; `git merge-base dev sol-dev`; `git merge-tree dev sol-dev`.
- **완료:** [ ]
- **완료 메모:**

## Phase 2. 경주 데이터 화면 선택 이식

### T02. race-data 화면·데이터·스타일 이식

- **선행 Task:** T01의 기준 SHA와 이식 목록 기록을 확인한다.
- **원본 브랜치 및 이식 대상 파일:** `sol-dev`의 `frontend/src/app/race-data/{page,layout}.tsx`, `_components/**`, `_lib/data.ts`, `frontend/src/styles/race-data.css`.
- **수정 대상 파일:** dev의 동일 신규 경로, 필요한 경우 `frontend/src/app/globals.css`의 최소 import.
- **구체적인 구현 지시:** 4개 탭과 목업 데이터를 유지해 `/race-data`를 구성한다. `race-data.css`의 `landing-root`, `container`, `--paper`, `--wine`, `--cream`, `--line`, `--ink`, `--serif`, `--sans` 의존성을 확인한다. 기존 `globals.css`는 교체하지 않고 선택자를 `[data-page="race-data"]` 또는 `rd-*`로 격리한다.
- **기존 기능 보호 조건:** 랜딩·대시보드·베팅의 전역 토큰과 레이아웃을 변경하지 않는다. API 연동과 목업 생성 로직 변경 금지.
- **완료 조건:** `/race-data` 직접 접근, 4개 탭, 빈 상태, 모바일 레이아웃이 동작하고 CSS 누수가 없다.
- **테스트 명령 및 검증 항목:** `git diff --check`; `npx tsc --noEmit`; `npm run lint`; `/race-data` 탭·빈 상태·모바일 확인.
- **완료:** [ ]
- **완료 메모:**

### T03. race-data 스타일 충돌 최소 조정

- **선행 Task:** T02의 파일 목록과 렌더링 결과를 확인한다.
- **원본 브랜치 및 이식 대상 파일:** `sol-dev`의 `frontend/src/styles/race-data.css` 및 참조 스타일.
- **수정 대상 파일:** `frontend/src/styles/race-data.css`, 충돌이 확인된 최소 범위의 전역 CSS.
- **구체적인 구현 지시:** `.container`, `.panel`, `.button`, `.header` 등 기존 전역 선택자와 겹치는 부분만 경계를 추가하거나 이름을 조정한다. `landing-root`와 디자인 토큰, race-data의 기존 디자인을 유지한다.
- **기존 기능 보호 조건:** 베팅·랜딩·대시보드 선택자와 토큰을 전면 변경하지 않는다.
- **완료 조건:** race-data의 시각·반응형 동작이 유지되고 기존 세 화면에 회귀가 없다.
- **테스트 명령 및 검증 항목:** `git diff --check`; `npx tsc --noEmit`; `npm run lint`; 랜딩·대시보드·베팅 CSS 회귀 확인.
- **완료:** [ ]
- **완료 메모:**

## Phase 3. AppHeader 메뉴 통합

### T04. AppHeader에 경주 데이터 메뉴 연결

- **선행 Task:** T02 완료 및 `/race-data` 경로 확인.
- **원본 브랜치 및 이식 대상 파일:** 없음. dev의 `frontend/src/components/AppHeader.tsx`, 필요 시 `AppHeader.module.css`.
- **수정 대상 파일:** `frontend/src/components/AppHeader.tsx`, `AppHeader.module.css`.
- **구체적인 구현 지시:** 경주 데이터 메뉴와 4개 탭 진입 링크를 추가하고 active·모바일 상태를 기존 패턴으로 연결한다. 지갑 표시와 기존 메뉴 계약을 유지한다.
- **기존 기능 보호 조건:** `SiteHeader`로 교체하지 않는다. 베팅·구매·정산 링크와 `useWallet` 사용을 변경하지 않는다.
- **완료 조건:** 데스크톱·모바일에서 `/race-data` 진입과 active 표시가 동작한다.
- **테스트 명령 및 검증 항목:** `git diff --check`; `npx tsc --noEmit`; `npm run lint`; 헤더 링크·active·지갑 표시 확인.
- **완료:** [ ]
- **완료 메모:**

## Phase 4. 데이터 조회 기능 보완

### T05. race-data 탭·상태·반응형 검증 및 보완

- **선행 Task:** T03, T04의 완료 체크와 diff를 확인한다.
- **원본 브랜치 및 이식 대상 파일:** T02에서 이식한 `race-data` 컴포넌트와 `_lib/data.ts`.
- **수정 대상 파일:** 결함이 확인된 race-data 컴포넌트만.
- **구체적인 구현 지시:** 경주·기수·조교사·경주마·데이터 소개의 필터, 정렬, 날짜, 상세 패널, 결과·마체중 표시와 빈 상태를 확인하고 최소 수정한다.
- **기존 기능 보호 조건:** 목업 데이터 계약과 기존 베팅 모델을 변경하지 않는다.
- **완료 조건:** 정상·빈·경계 날짜 및 모바일 상태가 동작한다.
- **테스트 명령 및 검증 항목:** `git diff --check`; `npx tsc --noEmit`; `npm run lint`; 4개 탭 기능 확인.
- **완료:** [ ]
- **완료 메모:**

## Phase 5. sol-dev 튜토리얼 교체 통합

### T06. 튜토리얼 의존 관계 조사 및 교체 준비

- **선행 Task:** T01 완료 여부를 기준 목록으로 확인한다.
- **원본 브랜치 및 이식 대상 파일:** `sol-dev`의 `frontend/src/app/tutorial/{page,layout}.tsx`, 참조 컴포넌트·스타일·`SiteHeader` 의존성.
- **수정 대상 파일:** dev의 `frontend/src/app/tutorial/**`는 교체 대상이며 구현 전 의존 관계 메모만 작성한다.
- **구체적인 구현 지시:** import, `styles.css` 포함 전역 CSS, 이미지, 해시 이동, 모바일 메뉴 의존성을 확인한다. `SiteHeader`를 가져오지 않고 `AppHeader`로 바꿀 지점을 목록화한다.
- **기존 기능 보호 조건:** 기존 베팅 컴포넌트와 라우트는 수정 대상에 포함하지 않는다.
- **완료 조건:** 교체 파일, 유지할 스타일, 제거할 SiteHeader 의존성이 명확하다.
- **테스트 명령 및 검증 항목:** `git diff --check`; import·라우트 참조 검색; 실행 가능한 TypeScript/ESLint 결과 기록.
- **완료:** [ ]
- **완료 메모:**

### T07. sol-dev 튜토리얼을 AppHeader 기준으로 교체

- **선행 Task:** T06 의존 관계 목록과 T04 AppHeader 링크를 확인한다.
- **원본 브랜치 및 이식 대상 파일:** `sol-dev`의 튜토리얼 페이지·레이아웃·필요한 튜토리얼 전용 스타일.
- **수정 대상 파일:** `frontend/src/app/tutorial/**`, 필요한 최소 스타일 파일.
- **구체적인 구현 지시:** dev의 기존 튜토리얼을 sol-dev 버전으로 교체하되 콘텐츠, 단계 인터랙션, `/tutorial`, `#bet-types`, 모바일 메뉴를 유지한다. 공통 헤더는 dev의 `AppHeader`를 사용하고 `SiteHeader` 전역 적용은 금지한다. 충돌 선택자만 최소 수정한다.
- **기존 기능 보호 조건:** 베팅·구매·정산·지갑 파일과 동작을 수정하지 않는다. `globals.css`를 무조건 교체하지 않는다.
- **완료 조건:** sol-dev 동작이 유지되고 AppHeader가 표시되며 기존 dev 튜토리얼 구현은 남지 않는다.
- **테스트 명령 및 검증 항목:** `git diff --check`; `npx tsc --noEmit`; `npm run lint`; `/tutorial`, `#bet-types`, 모바일 메뉴 및 기존 베팅 링크 확인.
- **완료:** [x]
- **완료 메모:**

## Phase 6. 최종 검증 및 정리

### T08. 통합 기능·CSS 회귀 검증

- **선행 Task:** T02~T07 완료 체크와 미실행 검증 사유를 확인한다.
- **원본 브랜치 및 이식 대상 파일:** 없음. 통합 작업 전체.
- **수정 대상 파일:** 검증 중 발견된 최소 결함 파일만. 신규 기능 추가 금지.
- **구체적인 구현 지시:** 랜딩, 대시보드, `/race-data`, `/tutorial`, `/races/[id]`, 예정·과거 베팅, 구매·정산·결과를 데스크톱·모바일에서 확인하고 CSS 누수와 헤더 링크를 점검한다.
- **기존 기능 보호 조건:** 회귀 수정은 원인 선택자·컴포넌트의 최소 범위로 제한한다.
- **완료 조건:** 신규 두 라우트와 기존 핵심 흐름이 직접 접근 및 메뉴 경로에서 동작한다.
- **테스트 명령 및 검증 항목:** `git diff --check`; `npx tsc --noEmit`; `npm run lint`; 관련 기능 수동 검증.
- **완료:** [ ]
- **완료 메모:**

### T09. 전체 빌드·테스트 및 작업 기록 확정

- **선행 Task:** T08 완료 및 회귀 결과 기록.
- **원본 브랜치 및 이식 대상 파일:** 없음.
- **수정 대상 파일:** 문서와 작업 메모만.
- **구체적인 구현 지시:** 전체 빌드·테스트를 실행하고 실제 결과를 기록한다. 실패·미실행은 사유와 후속 조치를 명시한다. 변경 파일과 diff를 최종 확인한다.
- **기존 기능 보호 조건:** 브랜치 전환, merge, commit, push를 수행하지 않는다.
- **완료 조건:** 통합 범위, 검증 결과, 잔여 위험, 롤백 대상이 기록된다.
- **테스트 명령 및 검증 항목:** `npm run lint`; `npx tsc --noEmit`; `npm run build`; `node --test tests/*.test.mjs`; `git diff --check`; `git status --short`.
- **완료:** [ ]
- **완료 메모:**

## 세션 초기화 절차

새 세션은 해당 Task의 선행 Task 완료 체크와 완료 메모를 먼저 확인하고, Task에 적힌 파일 경로·고정 계약·보호 조건만 사용한다. 각 Task에 기준 커밋, 원본 브랜치, 이식 파일, 검증 명령을 반복 기재했으므로 이전 대화나 분석 문서 전체를 다시 읽지 않아도 된다.


## Phase 3 보완 전략. AppHeader 공통 헤더 통합

- 목표: 메인, race-data, tutorial, dashboard, betting 화면이 동일한 AppHeader를 사용하도록 통합한다.
- 원칙: 기존 베팅·구매·정산·지갑 링크와 useWallet 동작을 보존한다. SiteHeader와 페이지별 자체 헤더의 메뉴·active·모바일 동작을 AppHeader로 이전한다.
- 단계: 헤더 사용처와 CSS 의존성 조사 → AppHeader 메뉴 계약 확정 → 페이지별 헤더를 AppHeader로 교체 → 중복 헤더/CSS 제거 → 데스크톱·모바일 검증.

### T10. AppHeader 전면 통합

- 대상: rontend/src/app/page.tsx, rontend/src/app/race-data/page.tsx, rontend/src/app/tutorial/**, rontend/src/app/dashboard/page.tsx 및 관련 헤더 CSS.
- 작업: 페이지별 자체 내비게이션과 SiteHeader를 AppHeader로 교체하고 경주 데이터 4개 메뉴, tutorial 링크, active 상태, 모바일 메뉴를 AppHeader에서 제공한다.
- 보호: 베팅·구매·정산·지갑 기능과 useWallet 동작은 변경하지 않는다.
- 검증: git diff --check, TypeScript/ESLint, 메인·race-data·tutorial·dashboard·betting의 데스크톱/모바일 헤더 확인.
- 완료: [x]

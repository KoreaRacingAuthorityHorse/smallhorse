# dev ↔ sol-dev 경주 데이터 화면 통합 분석

## 1. 통합 작업 개요

- 분석 기준: `dev` (`9e98524`, 현재 워크트리의 `HEAD`), 기능 원본: `sol-dev` (`d18852f`, `origin/sol-dev`와 동일), 통합 브랜치 포인터: `integrate/sol-analysis`가 현재 `dev`와 동일한 커밋을 가리킨다.
- 현재 체크아웃 브랜치는 `dev`이다. 분석 중 브랜치 전환, merge/cherry-pick, 원격 갱신을 하지 않았다. 원격 참조의 최신 여부는 `fetch`하지 않았으므로 보장하지 않는다.
- 목표는 `dev`의 베팅·정산·기존 경주 화면을 보존하면서 `sol-dev`의 `/race-data` 조회 영역만 선택적으로 가져오는 것이다.

## 2. 브랜치 및 프로젝트 구조 비교

두 브랜치 모두 `frontend` Next.js App Router 프로젝트이며 `next 16.4.3`, React 19, TypeScript 5, Tailwind 4를 사용한다. `dev`에는 `lucide-react`가 추가되어 있다(`frontend/package.json`).

`dev`의 보호 대상은 `src/app/betting/[kind]/[raceId]`, 결과 라우트, `src/app/challenge/past`, `src/components/betting`, `src/components/past-race`, `src/lib/past-race`, `src/lib/betting.ts`, `src/data/races.ts`, 관련 테스트다. `git diff --name-status dev..sol-dev`는 두 브랜치의 최종 트리 차이를 보여주며 실제 3-way merge 결과와는 다르다. 해당 diff에 보호 대상의 삭제가 표시되므로 전체 merge 후보에서 충돌·삭제 가능성을 점검해야 하며, 이를 근거로 베팅 기능 삭제를 단정하지 않고 선택적 파일 이식을 사용한다.

`sol-dev`의 데이터 영역은 다음처럼 독립되어 있다.

```
frontend/src/app/race-data/page.tsx
frontend/src/app/race-data/layout.tsx
frontend/src/app/race-data/_components/{RaceTab,PeopleTab,HorseTab,DataTab}.tsx
frontend/src/app/race-data/_lib/data.ts
frontend/src/styles/race-data.css
frontend/src/components/{SiteHeader,SiteFooter}.tsx
```

`dev`는 `AppHeader.tsx` + `AppHeader.module.css`를 사용하고, `sol-dev`는 전역 클래스 기반 `SiteHeader.tsx`/`SiteFooter.tsx`와 `landing.css`를 사용한다. 따라서 헤더를 파일 단위로 교체하면 지갑 표시, 기존 메뉴, 베팅 진입점이 손실된다.

## 3. sol-dev 기능 인벤토리

### 경주 조회 (`RaceTab`)

`frontend/src/app/race-data/_components/RaceTab.tsx`는 서울·제주·부산경남 선택, 날짜 이전/다음 및 달력, 1~8경주 선택, 출발시각·조건·거리·등급·부담중량·상금·주로·날씨·함수율, 출전마 표, 마번/마명/기수/조교사/마주/레이팅/마체중, 결과 착순·기록·도착차·단승/연승, 승식별 배당 조합, 구간별 순위를 제공한다. 출전마 행 확장으로 상세 이력과 장비도 표시한다.

### 기수·조교사 조회 (`PeopleTab`)

기수/조교사 전환, 이름 검색, 경마장 필터, 승률 정렬, 출주·1착·2착·3착 통계와 최근 10경기, 행 확장 상세를 제공한다.

### 경주마 조회 (`HorseTab`)

경주마 검색, 경마장 필터, 승률 정렬, 출주·입상 통계, 나이·성별·등급·산지·조교사·마주·혈통·구매가·상금·장비·부상/결장 및 최근 경주(거리·기수·기록·마체중)를 제공한다.

### 데이터 소개 (`DataTab`)

출전표, 결과, 주로 상태, 구간별 순위, 확정 배당률, 기수 변경, 기수·조교사·마주 데이터 목록과 필드/API 안내 문구를 제공한다.

### 실제 구현 수준

`_lib/data.ts`의 `seeded`, `genRace`, `genPeople`, `genHorses`로 모든 데이터가 브라우저/서버 결과가 같은 결정적 목업으로 생성된다. `fetch`, API route, 환경변수, 인증, 외부 endpoint는 없다. `SOURCES`/`FIELDS`의 API 안내도 설명용 UI이며 실제 API 클라이언트가 아니다. `MAX = "20261011"` 등 고정 날짜 범위와 가상 이름을 사용하므로 운영 데이터로 간주하면 안 된다.

## 4. 튜토리얼 존재 여부

튜토리얼은 `sol-dev`에 존재한다. `frontend/src/app/tutorial/page.tsx`, `layout.tsx`에 4단계 사용 안내와 `#bet-types` 해시 선택, 모바일 메뉴가 구현되어 있고 `SiteHeader`의 `이용가이드` 메뉴가 `/tutorial`로 연결된다. 이는 모의베팅 안내 기능이므로 통합 대상에 포함한다. 통합 시 `dev`의 `frontend/src/app/tutorial/**`는 폐기하고 sol-dev 버전을 채택한다. sol-dev 튜토리얼의 콘텐츠와 인터랙션은 유지하되 `SiteHeader`/`SiteFooter` 의존성은 제거하거나 dev의 `AppHeader` 기준으로 수동 변환한다. `SiteHeader`는 전체 애플리케이션에 적용하지 않는다.

## 5. 충돌 위험 및 영향도

1. **기능 삭제 위험(매우 높음)**: 브랜치 최종 트리 diff에서 베팅 라우트·컴포넌트·mock race 데이터·정산 라이브러리의 삭제가 표시된다. 이는 3-way merge의 확정 결과가 아니므로 `git merge-tree`와 실제 충돌을 함께 확인하고, 보호 영역은 선택적 이식으로 보존한다.
2. **헤더 계약 충돌(높음)**: `AppHeader`는 `useWallet`과 CSS Module을 사용하고, `SiteHeader`는 자체 메뉴·로그인 UI와 `landing.css` 전역 클래스를 사용한다. `SiteHeader` 채택 시 지갑/기존 메뉴/active 계약이 깨진다.
3. **전역 CSS 충돌(높음)**: `race-data.css`는 `[data-page="race-data"]` 아래에 중첩 선택자를 두지만 `landing.css`/`styles.css`의 `.container`, `.button`, `.header`, 토큰과 결합한다. `globals.css`의 import 순서가 바뀌면 기존 화면 색상·레이아웃이 변할 수 있다.
4. **데이터 모델 분리(높음)**: sol의 `Entry`/`Race`/`Horse`/`Person`은 `dev`의 `types/racing.ts`, `data/races.ts`, 베팅 어댑터와 다른 계약이며 식별자·날짜·승식 모델도 연결되지 않는다. 직접 공유하면 베팅 알고리즘 회귀 위험이 있다.
5. **라우트/상태 유지(중간)**: `/race-data` 하나에서 `#race/#people/#horse/#data` 해시로 탭을 바꾼다. 해시는 새로고침/직접 URL에는 유지되지만 검색·필터·날짜는 React state라 URL에 보존되지 않는다. 기존 `/races/[id]` 및 `/betting/[kind]/[raceId]`와의 링크도 현재 없다.

## 6. 파일별 통합 처리 방안

| 대상 | 처리 | 근거 |
|---|---|---|
| `src/app/race-data/**` 6개 파일 | **sol-dev 채택(선택 이식)** | 기능이 독립되고 dev에 동일 경로가 없음 |
| `src/styles/race-data.css` | **추가 후 범위 점검** | 데이터 전용 스타일. `globals.css` import는 수동 통합 |
| `src/components/SiteHeader.tsx` | **제외/수동 통합** | `AppHeader`의 wallet·기존 링크 보존 필요 |
| `src/components/SiteFooter.tsx` | **추가 검토** | dev에 동등 footer가 없으면 race-data 레이아웃에서 선택 사용 |
| `src/app/globals.css` | **수동 통합** | `@import "../styles/race-data.css"`만 추가하고 토큰/리셋 유지 |
| `src/components/AppHeader*` | **dev 유지** | 기존 모든 화면의 공통 헤더 계약 |
| `src/app/page.tsx` | **dev 유지 + 메뉴 링크만 수동 추가** | 랜딩/베팅 state 보존 |
| `package.json`/lock | **dev 유지** | sol 기능은 추가 의존성 없음; `lucide-react` 보존 |
| `src/app/tutorial/**` | **sol-dev 채택, dev 버전 폐기** | 사용자가 지정한 기준이며 sol-dev의 4단계 안내·해시 상태를 가져옴 |
| sol-dev의 삭제 대상 파일 | **제외** | dev 기능 보호 원칙 |

권장 신규 구조는 `src/app/race-data` 내부에 조회 코드와 전용 타입/유틸리티를 유지하는 것이다. 장기적으로 API 도입 시 `_lib/data.ts`를 `adapter`/`client` 계층으로 교체하되 베팅 lib와 직접 import하지 않는다.

## 7. CSS·컴포넌트·스크립트 통합 전략

- `dev`의 `globals.css`, 토큰, 폰트, `landing.css`, `styles.css`를 기준으로 유지한다. `race-data.css` import만 추가하고 import 순서는 기존 스타일 뒤의 마지막으로 검토한다.
- 모든 신규 화면은 현재처럼 `<div data-page="race-data" className="landing-root">` 경계를 유지한다. `.rd-*` 규칙은 이 경계 안에 두고 `.header`, `.button` 같은 공통 이름을 새로 만들지 않는다.
- 헤더는 모든 통합 화면에서 dev의 `AppHeader`를 기준으로 사용하고, 필요한 `경주 데이터`·`이용가이드` 링크만 추가한다. sol-dev 튜토리얼은 콘텐츠와 인터랙션만 채택하며 `SiteHeader`/`SiteFooter` 의존성은 `AppHeader` 기준으로 수동 변환하거나 제거한다. `SiteHeader`를 전체 애플리케이션에 적용하지 않는다.
- 해시 탭은 유지하되 탭별 독립 경로(`/race-data`, `/race-data/people`, `/race-data/horses`, `/race-data/about`)는 후속 단계에서 SEO·직접 URL 요구가 있을 때만 도입한다. 1차 이식은 변경 범위를 줄이기 위해 현재 해시 구조를 유지한다.
- 공통 데이터가 필요하면 `dev` 모델 → race-data 표시 모델 매핑 함수를 별도 adapter로 둔다. 목업 생성기를 베팅 데이터로 재사용하지 않는다.

## 8. 라우트 및 내비게이션 설계

권장 진입점은 `/race-data`이다. 글로벌 메뉴는 기존 순서를 유지하면서 `경주 데이터`를 모의베팅과 이용가이드 사이 또는 경주정보 옆에 추가한다. 하위 링크는 `/race-data#race`, `#people`, `#horse`, `#data`로 연결한다.

조회 상세는 1차 범위에서 행 확장으로 유지한다. 베팅으로 이동하는 링크가 필요하면 기존 `/betting/[kind]/[raceId]`를 호출하는 명시적 adapter와 유효한 `dev` raceId 매핑이 먼저 필요하다. 현재 sol 데이터에는 dev raceId가 없으므로 임의 연결하지 않는다. 새로고침 시 해시는 유지되지만 필터/날짜 state는 초기화되는 제한을 문서화하고, 필요 시 query string으로 확장한다.

## 9. 데이터/API 호환성 분석

sol-dev는 전부 결정적 목업이며 API 키·환경변수·인증·갱신 주기가 없다. 식별자는 경주일자 `YYYYMMDD`, meet `1|2|3`, 경주번호 `1..8`, 가상 마번 문자열 조합이다. 마체중, 경주 이력, 구간 순위, 배당률까지 생성되지만 실제 출처나 스키마 검증은 없다. 운영 API를 연결할 때는 응답 검증, 과거/예정 경주 구분, 서울/제주/부산경남 코드 매핑, 빈 데이터/오류 상태, 인증 서버 측 처리를 별도로 설계해야 한다. 민감한 키는 문서나 클라이언트에 넣지 않는다.

## 10. 권장 Git 통합 방식

**B(필요 파일 선택 이식) + C(경주 데이터 영역 분리)**를 권장한다. `git checkout sol-dev -- frontend/src/app/race-data frontend/src/styles/race-data.css`에 해당하는 선택 이식을 기준으로 하되 실제 구현 시 `globals.css` import와 헤더 링크는 수동 통합한다. 전체 merge(A)는 삭제 충돌과 회귀 범위가 너무 크며, 단순 파일 복사만 하면 전역 CSS와 헤더 계약을 놓친다. 각 이식 후 `git diff --check`, 타입/빌드와 기존 회귀 검증을 단계별로 수행한다.

## 11. 재구성된 구현 Phase


### Phase 1. 통합 준비 및 보호 범위 확정

- **목적/선행 조건:** `dev` 기준 커밋과 공통 조상 확인 후 보호 파일 목록을 고정한다.
- **수정 대상:** 없음(계획 단계), 이식 후보 `src/app/race-data/**`, `src/styles/race-data.css`, sol-dev 튜토리얼 파일 목록.
- **작업:** CSS 의존성, AppHeader·SiteHeader 계약, `/race-data`·`/tutorial` 라우트 충돌을 정리한다.
- **완료/검증:** 삭제·덮어쓰기 금지 목록 확정, `git diff --name-status` 및 `git merge-tree` 결과 기록.

### Phase 2. 경주 데이터 화면 이식

- **목적/선행 조건:** Phase 1의 이식 목록과 CSS 격리 방안 확정.
- **수정 대상:** `src/app/race-data/{page,layout}.tsx`, `_components/*`, `_lib/data.ts`, `src/styles/race-data.css`, `globals.css`의 최소 import.
- **작업:** 기존 4개 탭과 해시 인터랙션을 원형 유지하고 `/race-data` 직접 접근을 연결한다.
- **완료/검증:** 렌더링, 목업 데이터 표시, CSS 누수 및 기존 랜딩 스타일 회귀 확인.

### Phase 3. 글로벌 메뉴 및 내비게이션 통합

- **목적/선행 조건:** Phase 2의 `/race-data` 화면 렌더링 완료.
- **수정 대상:** `src/components/AppHeader.tsx`, 필요 시 `AppHeader.module.css`.
- **작업:** `경주 데이터` 메뉴와 4개 탭 링크를 추가하고 지갑·기존 메뉴·모바일 토글을 유지한다.
- **완료/검증:** 데스크톱/모바일 메뉴, 탭 이동, 기존 랜딩·경주·베팅 링크 회귀 확인.

### Phase 4. 데이터 조회 기능 검증 및 보완

- **목적/선행 조건:** 메뉴에서 접근 가능한 데이터 화면 확보.
- **수정 대상:** race-data 컴포넌트 내부의 실제 오동작 부분만.
- **작업:** 경주·기수/조교사·경주마·데이터 소개의 검색, 필터, 정렬, 날짜, 행 확장, 결과, 마체중·이력, 반응형을 검증하고 필요한 최소 수정만 한다.
- **완료/검증:** 빈 결과/경계 날짜/모바일 동작 확인. 목업 생성 로직은 변경하지 않는다.

### Phase 5. sol-dev 튜토리얼 교체 통합

- **목적/선행 조건:** AppHeader 통합 방식 확정.
- **수정 대상:** 기존 `src/app/tutorial/**` 폐기 대상, sol-dev의 `src/app/tutorial/{page,layout}.tsx`, 필요한 튜토리얼 스타일/컴포넌트.
- **작업:** sol-dev 콘텐츠·UI·상태·`#bet-types`를 유지하고 `/tutorial` 경로를 유지한다. `SiteHeader`는 전역 채택하지 않고 AppHeader 기준으로 연결한다.
- 완료/검증: sol-dev 튜토리얼의 콘텐츠와 인터랙션을 유지하면서 공통 헤더는 dev의 `AppHeader`를 사용한다. 기존 전역 CSS와 충돌하는 선택자만 최소 수정하며, `SiteHeader`의 전역 적용은 금지한다. `/tutorial`, `#bet-types`, 모바일 메뉴, 베팅 기능 연동을 확인한다.
### Phase 6. 최종 통합 검증

- **목적/선행 조건:** Phase 2~5 완료.
- **대상:** 전체 앱 및 기존 자동화 테스트.
- **검증:** Next.js build, TypeScript, ESLint, 기존 테스트, CSS 누수, 랜딩/대시보드, 예정·과거 베팅, 구매·정산·결과, 데이터 4탭, sol-dev 튜토리얼, 데스크톱/모바일.
- **완료:** 기존 dev 기능 회귀 없음과 신규 두 라우트(`/race-data`, `/tutorial`)의 직접 접근·새로고침 성공.
## 12. 테스트 및 롤백 전략

- 자동화: dev에 `frontend/tests/*.test.mjs`가 존재하며 베팅, 정산, race adapter, racing data를 검증한다. sol-dev 자체에는 테스트 디렉터리가 없다.
- 정적 검증: `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- 기능 검증: `/race-data` 및 4개 해시 직접 접근, 날짜 이동/달력/경주 선택, 검색·필터·정렬·상세 확장, 탭 전환, 모바일 폭, 데이터 없음/오류 상태.
- 회귀 검증: 랜딩, 로그인/대시보드, `/races/[id]`, 예정·과거 베팅, 승식/조합/슬립, 구매 확정·결과, 튜토리얼.
- CSS 검증: 기존 경로와 race-data 경로를 나란히 비교해 헤더, 버튼, 카드, 폰트, 스크롤, 모바일 메뉴의 누수를 확인한다.
- 롤백: 선택 이식 커밋(또는 작업 단위)을 되돌리고 `AppHeader`, globals import, race-data 디렉터리만 제거하면 된다. 기존 dev 파일은 덮어쓰지 않는다.

## 13. 구현 전 확인이 필요한 사항

1. `origin/sol-dev`와 `origin/dev`를 fetch해 최신 커밋을 확인할지 결정한다(현재 분석은 로컬 참조 기준).
2. `/race-data`의 목업을 당분간 유지할지, 실제 공공 API 연결 범위를 별도 확정할지 결정한다.
3. 경주 데이터에서 베팅으로 이동할지, 이동한다면 sol meet/date/no를 dev `raceId`로 매핑하는 계약을 정의한다.
4. 탭을 해시로 유지할지 탭별 독립 URL로 확장할지 결정한다.
5. AppHeader에 경주 데이터 메뉴를 어느 위치에 둘지와 모바일 표시 문구를 확정한다.
6. sol-dev 튜토리얼의 `SiteHeader` 의존성을 제거하고 dev의 `AppHeader`로 변환한다.
7. 실제 API의 마체중·경주 이력·구간 순위·배당·기수 변경 필드와 인증/갱신 정책을 제공받아 `_lib/data.ts` 대체 설계를 확정한다.

## 14. 통합 전략 보완 및 확정 사항

### Git 이력과 병합 위험

공통 조상은 `6dd0326d4abb8a2b0792a11e687ee4512e6ab9f8`이다(`git merge-base dev sol-dev`). `git diff --name-status dev..sol-dev`는 최종 트리의 차이를 보여주는 명령이며 실제 3-way merge 결과와 동일하지 않다. 실제 병합 후보를 `git merge-tree`로 확인하면 `frontend/src/app/globals.css`, `frontend/src/app/page.tsx`처럼 양쪽에서 변경된 파일이 있어 수동 충돌 가능성이 있다. 따라서 전체 merge가 반드시 동일 파일을 삭제한다고 단정하지 않고, 삭제·변경이 집중된 베팅 영역을 보존하기 위해 선택적 이식 방식을 사용한다. 파일 이식은 `sol-dev`의 신규 `race-data` 경로와 전용 스타일만 대상으로 하고, 기존 dev 파일에는 덮어쓰기·삭제를 허용하지 않는다.

현재 읽기 전용 상태는 `HEAD=dev@9e98524`, `integrate/sol-analysis=9e98524`, `sol-dev=d18852f`, 워크트리에는 분석 문서만 추가된 상태다. 실제 문서 수정과 이후 구현 작업은 모두 `integrate/sol-analysis` 브랜치에서 수행한다. 

### CSS 의존성 및 격리

`race-data.css`는 `[data-page="race-data"]` 경계 안에서 `--paper`, `--wine`, `--cream`, `--line`, `--ink`, `--serif`, `--sans`와 `.container`, `.landing-root`를 전제로 한다. 이 토큰과 공통 레이아웃은 `globals.css`의 변수 및 `landing.css`에서 제공되며, `styles.css`의 `.panel`, `.button`, `.header` 등과 이름이 겹칠 수 있다. `AppHeader.module.css`는 CSS Module이라 클래스 충돌은 제한적이지만 전역 토큰은 공유한다.

최소 변경안은 `globals.css`의 기존 import와 토큰을 유지하고 `race-data.css`를 마지막에 추가하는 것이다. 단순 import만으로 끝내지 않고 다음을 확인한다.

- `data-page="race-data"`와 `.rd-*` 범위 밖의 선택자를 신규로 만들지 않는다.
- `landing-root`, `.container`, 공통 토큰은 유지하되 값 자체를 race-data 전용으로 재정의하지 않는다.
- 튜토리얼은 `styles.css`의 `.tutorial-*`, `.step-nav`, `.tutorial-page` 규칙을 사용하므로 `race-data.css`와 별도 영역으로 유지한다.
- sol-dev 튜토리얼 콘텐츠는 채택하되 dev 튜토리얼 라우트는 폐기한다. 헤더는 `AppHeader` 기준으로 수동 통합하고 `SiteHeader`를 전역 교체하지 않는다.
- import 순서 변경 후 랜딩·대시보드·베팅 경로에서 색상, 버튼, `.panel`, 반응형 규칙의 변화를 확인한다.

대안으로 CSS Module을 사용할 수 있으나 현재 `race-data.css`가 대규모 `.rd-*` 규칙으로 이미 경계화되어 있으므로 이번 통합에서는 파일을 CSS Module로 전환하는 리팩터링을 하지 않는다. 누수 발견 시 해당 선택자에만 `[data-page="race-data"]` 접두사를 보강한다.

### 목업 데이터 유지 정책

`src/app/race-data/_lib/data.ts`의 결정적 시드 생성, 날짜 범위, 가상 경주마·기수·조교사·배당·구간 데이터는 그대로 이식한다. 이번 통합에서는 공공데이터 API, 환경변수, 인증, 갱신 주기를 추가하지 않으며 dev의 베팅 모델과 강제 결합하지 않는다. 경주 데이터 조회와 베팅은 독립 모듈로 유지한다. 화면의 `데모 화면` 문구와 가상 데이터 안내를 유지해 실제 기록으로 오인되지 않게 한다. 후속 API 작업에서는 이 파일을 대체할 adapter/client 계층, 응답 검증, 오류·빈 상태, 인증 서버 경계를 별도 설계하되 이번 단계에서 선행 추상화를 만들지 않는다.


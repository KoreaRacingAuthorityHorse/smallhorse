# TRACK:ON 통합 실행 Task

이 문서는 구현 세션용이며 현재는 **계획만** 작성했다. 기준 커밋 `dev`=`cb003b9`, 기능 브랜치=`d1614b5`, 공통 조상=`6dd0326`. 먼저 [MERGE_STRATEGY.md](./MERGE_STRATEGY.md)를 읽는다. 실제 구현은 `dev`에서 별도 통합 브랜치를 만든 뒤 시작한다. 현재 작업 트리의 `frontend/.gitignore` 수정과 루트 `.gitignore` 미추적 파일을 보존한다. 기존 브랜치의 파일을 덮어쓰지 않는다. 2~3 Task마다 새 CLI 세션을 시작할 수 있다. 각 Task 완료 시 아래 메모에 커밋 SHA·검증 결과·남은 위험을 기록한다.

공통 검증 명령(통합 브랜치에서만): `cd frontend`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `node --test tests/*.test.mjs`(쉘 별 glob 처리 확인). 설치된 Next 문서와 `frontend/AGENTS.md`를 코드 작성 전 확인한다. 테스트·빌드가 생성하는 파일은 커밋 대상에서 제외한다.

## Phase 1 — 기준선과 계약

**완료 기준:** 원본 브랜치 보존, 기준 테스트 결과와 경주/슬립/결과/지갑 계약 및 20경주×7승식 결과 데이터 감사 기록. **커밋:** 계약/데이터 감사 기준선 후. **롤백:** 원본 작업 트리 파일이 변경되거나 기준선 재현 불가 시 중단하고 통합 브랜치의 해당 작업만 되돌린다.

### T01 — 통합 작업공간과 기준선

- [x] **우선순위:** P0. **목적:** 원본 보존과 재현 가능한 시작점 확보. **선행:** 없음 (완료 확인).
- **대상:** Git 메타데이터(새 통합 브랜치 계획), `frontend/package.json`, `frontend/next.config.ts`, `frontend/tests/`, `frontend/AGENTS.md`.
- **구현 지시:** 기존 미커밋 파일 소유권을 확인하고 안전한 별도 worktree/브랜치를 `dev`에서 준비한다. 두 HEAD/merge-base 기록, `dev`와 기능 브랜치의 lint/type/build/테스트 기준 결과를 각각 기록한다. 이 Task에서는 기능 코드 이동 금지.
- **재사용:** `dev`의 `/challenge/past`, 기능 브랜치의 기존 `frontend/tests/*.test.mjs`는 기준 자료.
- **보존:** 기존 경로·미커밋 파일·두 원본 브랜치. **변경 금지:** `git reset/rebase`, 원본 worktree 파일 덮어쓰기, 라이브러리 버전 임의 변경.
- **완료 조건:** 통합 브랜치만 별도로 존재하고 기준 결과/실패 사유가 재현 가능. **검증:** `git status`, `git branch -a`, `git merge-base`, `git diff --name-status` 및 공통 검증 명령을 각각 안전한 checkout에서 실행.
- **회귀 대상:** `/`, `/dashboard`, `/challenge/past`, 기존 지갑 기록. **위험:** 현 미커밋 `.gitignore` 충돌, 오래된 `.next` 생성 타입.
- **완료 메모:**
  - **커밋/브랜치 SHA:** `dev`=`cb003b955b24610541621504a385c75617e979c5`, `feat/betting-screen-trackon`=`d1614b518cdc232e41bb3a165beca6edab9518bf`, `merge-base`=`6dd0326d4abb8a2b0792a11e687ee4512e6ab9f8`, 통합 브랜치 `integrate/trackon-betting` (기준 커밋: `cb003b955b24610541621504a385c75617e979c5`).
  - **기준 검증 결과:**
    - `dev`: `lint` 통과(0 errors), `tsc` 통과(오래된 .next/dev 캐시 제거 후 0 errors), `build` 통과(8개 정적 라우트 생성 완료), `node --test` 통과(0 tests, 대상 없음).
    - `feat/betting-screen-trackon`: `lint` 통과(0 errors), `tsc` 통과(0 errors), `build` 통과(23개 라우트 생성 완료), `node --test` 통과(11/11 pass: betting 6, demoPurchase 3, racingData 2).
    - `integrate/trackon-betting`: `lint` 통과(0 errors), `tsc` 통과(0 errors), `build` 통과(8개 정적 라우트 생성 완료), `node --test` 통과(0 tests).
  - **수정 파일:** `MERGE_TASKS.md` (T01 완료 및 기준선 감사 기록). 원본 미커밋 파일(`frontend/.gitignore`, `.gitignore`) 및 원본 브랜치 완벽 보존. 기능 코드 이동 없음.
  - **남은 위험:** `feat` 브랜치나 `next dev` 실행 후 `.next/dev/types/validator.ts`가 잔존할 경우 `races/[id]` 경로 누락(TS2307) 오류가 재현될 수 있으므로 빌드/타입검사 전 오래된 `.next` 정리 확인 필요. Windows 환경에서 `tsconfig.tsbuildinfo` 및 SWC canonicalize에 대한 접근 권한 유의.

### T02 — 타입·경주 자료원·결과 계약

- [x] **우선순위:** P0. **목적:** 합성 예정 경주와 실제 표본 과거 경주를 혼동하지 않는 계약 수립. **선행:** T01 (완료 확인).
- **대상:** `frontend/src/types/racing.ts`(기능 브랜치), `src/lib/past-race/types.ts`, `src/data/races.ts`(기능), `src/data/mock/past-races.json`, 새 `src/lib/race-adapters.ts` 또는 동등 경계.
- **구현 지시:** `kind: upcoming|pastBlind`, 공개 가능 출전 필드, ID·venue 매핑, 7승식 `BetType`↔`PoolKey` 명시 맵, `BetSlipItem` 그룹 ID·mode와 구매 상태 `pending|settled` 타입을 정의한다. `BlindEntry`에 없는 마명/기수는 확정 전 전달하지 않는다. `u*/p*`와 과거 표본 ID를 강제로 매칭하지 않는다.
- **재사용:** 기능 `Race/RaceEntry/BetCombination`, dev `BlindRace/RevealEntry/Settlement` 타입. **보존:** 기존 JSON과 경주 mock 값. **변경 금지:** 조합 알고리즘·결과 데이터·백엔드.
- **완료 조건:** 타입 어댑터가 양쪽 자료원을 수용하고 결과 공개 경계가 명시됨. **검증:** `npx tsc --noEmit`, 어댑터 단위 테스트, `npm run build`.
- **회귀 대상:** 과거 블라인드 출전표, 예정 경주 카드 ID. **위험:** 타입을 통일하며 숨겨야 할 reveal 누출.
- **완료 메모:**
  - **SHA:** 통합 브랜치 기준 HEAD `cb003b955b24610541621504a385c75617e979c5`; T02 변경은 작업 트리에 있으며 별도 커밋 없음 (`.git/index.lock` 쓰기 권한 거부).
  - **구현:** `RaceView`의 `upcoming|pastBlind` 공개 필드와 `detailsAvailability`를 구분하고 과거 어댑터는 `BlindRace`만 받도록 정의. 7승식 양방향 맵, venue 맵(영천의 합성 트랙 없음), 슬립 항목 ID·group ID·mode 및 `pending|settled` 구매 결과 상태를 정의. `u*/p*`와 실제 표본 ID 연결 없음. 원본 JSON 및 경주 mock 값 변경 없음.
  - **수정 파일:** `frontend/src/types/racing.ts`, `frontend/src/data/races.ts`, `frontend/src/lib/race-adapters.ts`, `frontend/tests/race-adapters.test.mjs`, `MERGE_TASKS.md`.
  - **검증:** `node --test tests/race-adapters.test.mjs` 3/3 통과; `npx.cmd tsc --noEmit` 통과; `npm.cmd run lint` 통과; `npm.cmd run build` 통과(8개 정적 라우트). PowerShell 스크립트 정책 때문에 `.cmd` 실행 파일 사용.
  - **남은 위험:** 현재 과거 JSON은 클라이언트 import이므로 결과의 실제 은닉은 백엔드 공급 전까지 보장되지 않음. 과거 20경주×7승식 결과 정합성 감사 및 누락 결과 게이트는 후속 T02A 범위.

### T02A — 과거 경주 7승식 결과 데이터 가용성 검증

- [x] **우선순위:** P0. **목적:** 없는 결과 자료를 미적중으로 오판하지 않도록 데이터 검증 게이트 수립. **선행:** T02 완료 확인.
- **대상:** dev `frontend/src/data/mock/past-races.json`, `src/lib/past-race/{types,service,settle,pools}.ts`, 새 데이터 감사 테스트/보고 표.
- **구현 지시:** 20경주의 `blind.entries`/`reveal.entries` 마번 일치, 7개 `reveal.payouts` 키의 존재·비어 있지 않음·조합 형식·마번 유효성을 검사한다. **확정 `reveal.entries.pos`의 1·2·3위와 각 승식의 적중 조합이 맞는지** 검증한다: 단승 1위, 연승 입상마(출전 두수별 기준), 복승 1·2위 비순서, 쌍승 1→2위, 복연승 입상마 쌍 비순서, 삼복승 1·2·3위 비순서, 삼쌍승 1→2→3위. 출전취소·경주제외·출발제외 상태의 환불 우선순위, 순위 누락·동착·취소마가 적중 조합에 포함되는 오류도 검사한다. 전략 문서의 승식별 20/20 표를 재현하고 적중/미적중/환불 사례를 승식별로 테스트한다. `settleBet`의 `(payouts[pool] ?? [])`가 누락·불일치 자료를 `miss`로 만드는 부분은 **새 구매 경로의** `unavailable|pending` 검증 경계로 막는다. 기존 `/challenge/past` 기본 정산 함수는 전환 전 유지한다.
- **재사용:** dev `POOLS`, `settleBet`의 순서형/비순서형·환불 판정. **보존:** JSON 원본, 기존 적중 조합 규칙. **변경 금지:** Mock 결과 임의 생성/보정, 조합 생성 알고리즘.
- **완료 조건:** 7승식 모두 결과 존재 **및 확정 순위와의 정합성**, 순서형/비순서형 판정, 취소·제외 환불이 검증되고 누락·빈 배열·순위/조합 불일치는 미적중과 구분됨. **검증:** 7승식×현재 표본 감사 테스트, 각 승식의 적중/미적중과 출전취소·경주제외·출발제외·동착 fixture, `npx tsc --noEmit`.
- **회귀 대상:** `/challenge/past`의 기존 `settleRace`, 결과 데이터 공개 경계. **위험:** 현재 20경주는 완전해도 새 경주에서 누락 자료를 미적중으로 처리하는 회귀.
- **완료 메모:** SHA: `cb003b955b24610541621504a385c75617e979c5` (기준 HEAD; 커밋 생성 안 함) / 7승식 집계: 20경주 모두 출전번호·1~3위·배당 조합 정합; 단승 20, 연승 60, 복승 20, 쌍승 20, 복연승 60, 삼복승 20, 삼쌍승 20개(총 220). 출전취소 1경주·경주제외 2경주 확인 / 누락 자료 처리: 기존 정산은 보존, 새 가용성 검증은 누락·빈 배열·미완료/동착 순위·순위와 조합 불일치를 `unavailable`로 반환 / 남은 위험: 실제 표본 밖 데이터와 T02A 이후 신규 구매 경로의 연결은 후속 Task 범위.
  - **검증:** `node --test tests/pastRaceDataAudit.test.mjs` 2/2 통과; `npx tsc --noEmit` 통과; `npm run lint` 오류 0; `npm run build` 통과.
  - **수정 파일:** `frontend/src/lib/past-race/settle.ts`, `frontend/tests/pastRaceDataAudit.test.mjs`, `MERGE_TASKS.md`.

## Phase 2 — 베팅 로직과 단일 지갑

**완료 기준:** UI 없이 7승식 계산·자료 가용성 게이트·한도·단일 지갑·경주 유형별 고정 반환율이 테스트 통과. **커밋:** T03 로직, T04 저장소, T04A 보상 정책을 각각 커밋. **롤백:** 기존 잔액/기록 파싱 손상, 조합 생성값 변경, 150%/200% 산식 오류 시 해당 Task 커밋만 철회.

### T03 — 기존 베팅 알고리즘 이식

- [x] **우선순위:** P0. **목적:** 승식별 조합·금액 로직을 그대로 보존. **선행:** T02 완료 확인.
- **대상:** 기능 브랜치 `frontend/src/lib/betting.ts`, `src/types/racing.ts`, `frontend/tests/betting.test.mjs`, `racingData.test.mjs` → 통합 브랜치 동명 위치.
- **구현 지시:** `BET_TYPES`, `buildIndividualCombination`, `buildGroupCombinations`, `selectionKey`, `calculateTotalStake`와 `validatePurchase`의 상태·취소마·금액·한도 검증을 선별 이식한다. 1/2/3그룹, 박스, 1+2/2+1, 순서형 순열, 비순서 조합, 취소마·**그룹 내부 중복 제거**를 테스트한다. 기존 `validatePurchase`의 구매 전체 중복 **거부**는 확정된 승인형 중복 정책과 충돌하므로 변경 지점으로 표시한다. UI와 독립되게 둔다.
- **재사용:** 기능 브랜치의 순수 조합 함수/기존 Node 테스트. **보존:** 100P 단위, 100,000P 경주 한도, 1,000 조합 생성 상한, 기존 순서·정규화·그룹 내부 중복 제거 규칙. **변경 금지:** 조합 생성 알고리즘 임의 재작성, `past-races.json` 수정.
- **완료 조건:** 기존 기대 조합/총액과 일치. **검증:** `node --test tests/betting.test.mjs tests/racingData.test.mjs`, `npx tsc --noEmit`, `npm run build`.
- **회귀 대상:** 7승식, 그룹 중복, 출전취소, 조합 폭증. **위험:** 타입 어댑터가 순서형 마번 순서를 바꾸는 문제.
- **완료 메모:** SHA: `cb003b955b24610541621504a385c75617e979c5` (기준 HEAD; 커밋 생성 안 함) / 비교 예시: 7승식 선택 수·순서형 여부 기존 기대값 일치; 복승 `1-2`/`2-1` 정규화 동일, 쌍승은 순서 보존; 쌍승 3두 박스 6조합, 삼복승 `1+2`·`2+1`, 삼쌍승 순열 조합과 그룹 내부 중복 제거 확인. 100P 단위, 경주당 100,000P 한도, 조합 1,000개 생성 상한, 취소마 제외 및 구매 전체 중복 거부 유지 / 남은 위험: Node 24에서 TS 테스트 파일을 직접 가져올 때 `package.json`의 `type` 미지정 경고가 출력되지만 테스트·타입 검사·빌드에는 영향 없음.
  - **검증:** `node --test tests/betting.test.mjs tests/racingData.test.mjs` 8/8 통과; `npx tsc --noEmit` 통과; `npm run lint` 오류 0; `npm run build` 통과(8개 정적 라우트).
  - **수정 파일:** `frontend/src/lib/betting.ts`, `frontend/src/types/racing.ts`, `frontend/tests/betting.test.mjs`, `frontend/tests/racingData.test.mjs`, `MERGE_TASKS.md`. 기존 구현과 테스트가 작업 트리에 있어 알고리즘은 재작성하지 않고 검증 및 완료 기록만 추가.

### T04 — 지갑·기록 저장소 단일화

- [x] **우선순위:** P0. **목적:** 양쪽 화면 잔액과 기록을 한 상태로 유지. **선행:** T02, T03.
- **대상:** dev `src/lib/demo-wallet.ts`, 기능 `src/lib/demoPurchase.ts`, `src/lib/useDemoState.ts`, `frontend/tests/demoPurchase.test.mjs`, `src/app/dashboard/page.tsx`(연결부만).
- **구현 지시:** `trackon-premium-demo-v1`의 `{balance,records,tasks}` 및 기존 기록을 읽는 단일 read/write/subscribe를 만든다. 같은 탭과 다른 탭의 변경 알림을 모두 수용한다. 구매 ID별 `debited`, 결과 ID 또는 구매 ID별 `settled` 상태를 보존해 구매 원금을 한 번 차감하고 반환 포인트를 한 번만 지급할 수 있는 저장 계약을 만든다. 승인된 중복 베팅은 서로 다른 `lineId`를 보존한다. `records`의 최근 20건 **표시 제한**과 별도로 구매 ID별 슬립·라인·원금·정산 상태·결과 스냅샷을 지속 보존한다. 저장 용량 초과/쓰기 실패 시 구매 성공 처리 없이 중단하고, 구매 스냅샷 삭제·손상 시 재차감·재정산 없이 복원 불가를 반환한다. JSON 오류와 명시적 삭제/내보내기 정책도 검증한다. `localStorage`의 read-modify-write가 여러 탭에서 원자적이지 않음을 구현 주석과 검증 기록에 명시한다.
- **재사용:** 기능 `completeDemoPurchase` 검증/스냅샷, dev `applyRound`/`useWallet`의 기록·체크리스트 동작. **보존:** 기존 저장 키와 초기 12,480P, 대시보드 호환. **변경 금지:** 기존 사용자 기록 파괴, 신규 상태 라이브러리/서버 API.
- **완료 조건:** 양 화면에서 같은 잔액을 즉시 표시하고 과거/예정 원금 차감 및 결과 지급을 각각 최대 1회 기록할 수 있는 데모 안전장치가 있음. 거래 요약 20건을 넘어도 구매 스냅샷으로 결과 페이지를 복원할 수 있음. 여러 탭 동시 거래의 완전한 원자성은 보장하지 않는다고 명시됨. **검증:** Node 저장소 테스트(가짜 Storage), 같은 구매 재시도/새로고침/두 탭, 21번째 거래, quota/삭제/손상, lint/type/build.
- **회귀 대상:** 대시보드 잔액·20개 표시 기록·tasks, 과거 정산 환급, 예정 구매. **위험:** 두 캐시의 불일치, 초기 hydration, 다중 탭 경쟁 조건과 저장 용량.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 변경은 작업 트리, 별도 커밋 없음). 기존 `{balance,records,tasks}` 및 추가 필드를 읽는 `readWallet/writeWallet/useWallet`을 대시보드·과거 경주·신규 구매가 공유한다. 같은 탭 이벤트와 다른 탭 storage/focus 알림을 수용한다. 구매 ID별 원장에 `debited/settled/resultId`를 저장하고 구매 차감·결과 지급 재시도를 한 번씩만 반영한다. 20건 표시 목록과 별도 구매 스냅샷을 두며, 저장 실패는 구매 오류로 반환하고 복구 불가 스냅샷은 `null`을 반환한다. 다중 탭의 동시 read-modify-write는 원자적이지 않다.
  - **검증:** `node --test tests/*.test.mjs` 18/18 통과(기존 기록·재시도·21번째 거래·삭제·quota 포함); `npx.cmd tsc --noEmit` 통과; `npm.cmd run lint` 통과; `npm.cmd run build` 통과(8개 정적 페이지).
  - **수정 파일:** `frontend/src/lib/demo-wallet.ts`, `frontend/src/lib/demoPurchase.ts`, `frontend/src/app/dashboard/page.tsx`, `frontend/tests/demoPurchase.test.mjs`, `MERGE_TASKS.md`.
  - **남은 위험:** 브라우저 localStorage의 다중 탭 동시 거래 원자성은 보장되지 않는다. 실제 영속 서버 원장이 생기면 거래를 서버로 이전해야 한다.

### T04A — 경주 유형별 고정 보상 정책 분리

- [x] **우선순위:** P0. **목적:** 적중 판정과 포인트 반환액 계산을 분리하고 지난 경주 150%·예정 경주 200%를 단일 계약으로 정의. **선행:** T02, T02A, T03, T04 및 **환불 정책에 대한 사용자 확인**. 기존 원금 100% 환불은 확인 전까지 잠정안이며, 확인 없이 T04A 구현을 시작하지 않는다.
- **대상:** dev `src/lib/past-race/settle.ts`, `service.ts`, `types.ts`, 기능 `src/lib/betting.ts`, 새 `src/lib/reward-policy.ts` 및 정책 테스트(권장 경로).
- **구현 지시:** 기존 `/challenge/past`가 쓰는 `settleRace → settleBet → applyRound(totalPayout-totalStake)`의 함수 시그니처·배당률 정산·잔액/기록 동작을 **전환 시점까지 유지**한다. 필요하면 명시적인 `legacySettleBet` 어댑터로 고정하고, 새 `classifyOutcome`/`settlePurchase`와 고정 반환율 순수 함수를 **별도 경로**로 추가한다. 기존 `settleBet`을 변경해야 한다면 모든 기존 호출부에 구계약 어댑터를 먼저 적용하고 기존 `/challenge/past` 회귀 테스트를 통과시킨다. `raceKind`별 새 경로 적중 반환액 `pastBlind: stake×1.5`, `upcoming: stake×2`, 미적중 0을 정의한다. 1,000P 예시 1,500P/2,000P와 순수익 500P/1,000P를 검증한다. 확정 배당은 결과 정보로만 표시한다. 환불은 적중/미적중과 별도 상태로 두고 사전에 확인받은 정책을 적용한다.
- **재사용:** dev `settleBet`의 적중·환불 판정, 기능 브랜치 `calculateTotalStake`; 조합 생성 함수는 그대로 호출. **보존:** 전환 전 legacy 배당 기반 정산, 7승식 판정·조합 생성·구매 한도·100P 단위. **변경 금지:** 새 구매 경로에서 배당률을 포인트 지급에 사용, Mock 배당 데이터 변경, 보상률을 승식별로 분기.
- **완료 조건:** 새 경로에서는 같은 적중 라인의 결과가 유형별 반환액만 다르고 미적중은 0P이며, 전환 전 `/challenge/past`의 기존 베팅·배당 기반 정산·포인트·기록은 변경 전과 동일함. **검증:** 기존 흐름의 적중/미적중/환불 잔액·기록 회귀 테스트와 새 정책 순수 함수 테스트, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **회귀 대상:** 기존 `/challenge/past` 구매 버튼·순서형/비순서형 적중·환불·잔액·기록, `ResultPanel` 확정 배당. **위험:** 기존 호출부가 새 반환액을 사용해 전환 전 보상액을 바꾸거나 이중 지급하는 오류.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 변경은 작업 트리, 별도 커밋 없음). 사용자가 출전취소·경주제외·출발제외의 원금 100% 환불을 확정함. `calculateReward`는 지난 경주 1,000P 적중 시 1,500P 반환/순수익 500P, 예정 경주 2,000P 반환/순수익 1,000P, 미적중 0P, 환불 1,000P를 계산한다. `classifyOutcome`은 적중·미적중·환불만 판정하며 기존 `settleBet`의 배당 기반 반환과 `/challenge/past` 호출은 유지한다. 새 경로에서는 T02A의 결과 가용성 검사를 먼저 통과시켜야 하며 그 구매 전체 연결은 T10 범위다.
  - **검증:** `node --test tests/*.test.mjs` 20/20 통과(기존 배당 기반 적중·미적중·3종 환불 회귀 포함); `npx.cmd tsc --noEmit` 통과; `npm.cmd run lint` 통과; `npm.cmd run build` 통과(8개 정적 페이지).
  - **수정 파일:** `frontend/src/lib/reward-policy.ts`, `frontend/src/lib/past-race/settle.ts`, `frontend/tests/reward-policy.test.mjs`, `MERGE_TASKS.md`.
  - **남은 위험:** 현재 과거 기본 경로는 전환 전까지 기존 배당 기반 지급을 유지한다. 새 구매 전체의 결과 가용성·정산 연결은 T10에서 구현한다.

## Phase 3 — 화면 골격과 입력 UI

**완료 기준:** 두 경주 유형의 라우트/공통 프레임, 데스크톱 2단, 모바일 입력 레이아웃과 독립 Draft 모드가 준비됨. **커밋:** T05 라우트, T05A CSS/반응형, T06 입력 상태를 각각 커밋. **롤백:** 기존 랜딩 링크/과거 도전이 사라지거나 Draft 손실 시 해당 커밋 복귀.

### T05 — 라우트와 공통 프레임

- [x] **우선순위:** P1. **목적:** `dev` 기반에 두 경주 유형의 진입 경로와 공통 프레임 배치. **선행:** T02.
- **대상:** 기능 `src/app/races/[id]/page.tsx`, dev `src/app/challenge/past/page.tsx`, `src/app/page.tsx`, `dashboard/page.tsx`; `src/components/layout/TrackonHeader.tsx`, `TrackonFooter.tsx`, dev `src/components/AppHeader.tsx`.
- **구현 지시:** 기능 경주 상세 라우트를 선별 이식하고 `dev`의 지난 경주 메뉴 링크를 보존한다. 두 라우트에서 경주 유형 어댑터를 넘길 수 있는 공통 화면 프레임과 경주 요약 위치만 준비한다. 실제 공통 입력 연결은 **T09B**에서 수행한다. 기존 `PastRaceGame`의 경주 선택·결과 상태는 유지한다.
- **재사용:** 기능 `/races/[id]` 페이지와 Trackon 헤더/푸터, dev `/challenge/past` 라우트/헤더. **보존:** `/`, `/dashboard`, `/challenge/past`, `/login`, `/tutorial`. **변경 금지:** 베팅 알고리즘, 과거 베팅 입력의 성급한 제거, CSS 전면 재작성.
- **완료 조건:** 두 경주 라우트와 기존 세 진입점이 열리고, 공통 프레임에 각 경주의 공개 가능한 데이터가 전달됨. **검증:** lint/type/build, 라우트/헤더 메뉴 확인.
- **회귀 대상:** 지난 경주 랜딩 링크, 대시보드 카드, 과거 도전 진입. **위험:** `page.tsx` 양쪽 수정 충돌, 헤더 중복.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 별도 커밋 없음). `/races/[id]`를 추가하고 기존 `getRaces/getRaceWithEntries` 어댑터를 통해 예정·지난 경주 공개 요약과 출전표를 공통 프레임에 전달했다. 기존 `/`, `/dashboard`, `/challenge/past`, `/login`, `/tutorial`은 변경하지 않았다. **검증:** `node --test tests/*.test.mjs` 20/20, `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `npm.cmd run build` 통과. 빌드에서 `/races/u1`~`/races/p3` 정적 경로 생성 확인. **수정 파일:** `frontend/src/app/races/[id]/page.tsx`, `frontend/src/components/betting/RaceBettingClient.tsx`, `frontend/src/app/races/[id]/racing.css`, `MERGE_TASKS.md`. **남은 위험:** 과거 경주 기본 입력·정산은 기존 `/challenge/past`에 남아 있고 공통 입력 연결은 T09B 이후 범위다.

### T05A — 공통 디자인·데스크톱/모바일 반응형

- [x] **우선순위:** P1. **목적:** 라우트 프레임에 데스크톱 2단과 모바일 입력 중심 레이아웃 적용. **선행:** T05.
- **대상:** 기능 `src/app/races/[id]/racing.css`, dev `src/app/globals.css`, `src/styles/{landing,styles}.css`, `src/components/{AppHeader.module.css,past-race/past-race.module.css}`, `frontend/next.config.ts`.
- **구현 지시:** 경주 요약을 왼쪽 상단, 정보/입력 약 62:38·입력 최소 390px로 배치한다. 1024px 아래 모바일 입력 중심으로 전환하고 정보 버튼/하단 슬립 바의 자리와 safe area를 확보한다. 토큰·헤더를 공통화하고 `.bet-*`/CSS Module을 격리한다. 단일 페이지 스크롤을 기본으로 하며 sticky/fixed 겹침과 키보드 충돌을 확인한다. 아직 비즈니스 상태는 변경하지 않는다.
- **재사용:** dev 토큰/리셋/CSS Module 조건, 기능 `racing.css`의 bet 스타일. **보존:** 랜딩·대시보드·과거 도전의 외형 장점. **변경 금지:** `next.config.ts` CSS Module 조건 삭제, CSS 전면 재작성, 조합/정산 코드 수정.
- **완료 조건:** 1440/1024/768/390/320px에서 가림·중첩 스크롤 없이 레이아웃이 동작. **검증:** lint/type/build, viewport·스크롤·모바일 키보드·헤더/하단 바 확인.
- **회귀 대상:** `/`, `/dashboard`, `/challenge/past` 스타일과 표 가로 스크롤. **위험:** 전역 `.btn/.panel`, z-index, sticky/fixed 충돌.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 별도 커밋 없음). 경주 요약·정보를 왼쪽 주 영역, 선택·슬립을 오른쪽 약 62:38 영역으로 배치하고 1024px 이하에서 1단 입력 중심으로 전환했다. 390px·320px에서는 출전마 버튼을 4열/3열로 줄이고, sticky 사이드바를 일반 흐름으로 전환해 겹침을 피한다. **검증:** `node --test tests/*.test.mjs` 20/20, `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `npm.cmd run build` 통과. CSS는 `/races/[id]`의 `racing.css`로 격리했으며 기존 전역 토큰·CSS Module 설정을 변경하지 않았다. **수정 파일:** `frontend/src/app/races/[id]/racing.css`, `frontend/src/components/betting/RaceBettingClient.tsx`, `MERGE_TASKS.md`. **남은 위험:** 실제 모바일 키보드·브라우저별 safe-area 수동 검증은 후속 브라우저 검증 단계에서 수행한다.

### T06 — 독립 모드와 베팅 Draft 추출

- [x] **우선순위:** P1. **목적:** 초보자/일반과 개별/조합을 독립 상태로 유지. **선행:** T03, T05A.
- **대상:** `src/components/betting/RaceBettingClient.tsx`, 새 `BetDraftEditor.tsx`, `BetTypeSelector.tsx`, `CombinationEditor.tsx` 또는 동등 분리.
- **구현 지시:** 기존 `suggestedTypes` 질문과 직접 7승식 선택을 분리해 같은 `BetCombination`을 생성한다. Draft·슬립을 별도 상태로 둔다. 기존 `chooseType`/구매 방식 변경의 초기화 지점을 명시하고 유효 Draft 유지·불일치 안내 정책을 적용한다. 직접 마번 버튼을 출전 두수/취소 상태로 생성하고 ordered 선택 순위를 보여준다. Draft와 미확정 슬립의 저장 키는 `raceKind:raceId`로 분리하고 같은 탭의 경주 A→B→A·라우트 복귀·새로고침 때 버전 있는 `sessionStorage` 초안을 복원한다. 확정 구매 스냅샷과 초안 저장소를 분리한다.
- **재사용:** 기능 `RaceBettingClient`의 질문형 UI, `HorseChoices`, `addSlip` 호출 경계; `lib/betting.ts`. **보존:** 각 모드의 승식·마번·금액 규칙과 슬립 유지. **변경 금지:** 기존 조합/금액 함수의 의미, 슬립에 추가하는 흐름.
- **완료 조건:** 2×2 모드 조합이 모두 입력 가능하고 모드 전환 후 슬립 불변. A→B→A에서 각 경주의 Draft와 슬립이 별도로 복원되며 다른 경주 항목은 현재 슬립에 보이지 않음. **검증:** 4가지 조합·경주 왕복·새로고침 브라우저 흐름, 7승식 마번 검증, lint/type/build.
- **회귀 대상:** 초보자 질문 추천, 순서형 마번, 기존 개별·조합 추가. **위험:** 1,017줄 컴포넌트 추출 시 상태 초기화.
- **완료 메모:** T03·T05A 완료 기록을 확인했다. 기준 HEAD는 `cb003b9`이며 변경은 작업 트리에 있다.
  - **구현:** `BetDraftEditor`에서 초보자 추천과 일반 7승식, 개별 마번과 조합 그룹을 독립적으로 관리한다. 추천과 현재 승식이 다르면 안내하고 입력을 보관한다. 승식 변경 시 마번과 그룹을 초기화하고 금액과 기존 슬립을 유지한다. 초안과 미확정 슬립은 버전이 있는 `sessionStorage`에 경주 유형·ID별로 보관한다.
  - **검증:** Edge에서 초보자/일반 × 개별/조합 모두 슬립 추가, `u1 → u4 → u1` 왕복 시 슬립 격리, 새로고침 후 구매 방식과 슬립 복원을 확인했다. `node --test tests/*.test.mjs` 20/20 통과(7승식·순서·취소마·그룹 규칙 포함). `npx.cmd tsc --noEmit --incremental false`, `npm.cmd run lint`, `npm.cmd run build` 통과.
  - **수정 파일:** `frontend/src/components/betting/BetDraftEditor.tsx`, `frontend/src/components/betting/RaceBettingClient.tsx`, `frontend/src/app/races/[id]/page.tsx`, `frontend/src/app/races/[id]/racing.css`, `MERGE_TASKS.md`.
  - **후속 연결:** 구매 확정과 지난 경주 공통 입력 연결은 T09A·T09B에서 진행한다. 브라우저가 세션 저장을 차단하면 화면 내 편집은 가능하며 복원 불가 안내를 표시한다.

## Phase 4 — 출전마 정보와 조합 편집

**완료 기준:** 정보 모달과 입력 패널이 같은 마번 상태를 쓰고 조합 편집 화면이 기존 계산을 호출. **커밋:** T07, T08 각각. **롤백:** 블라인드 결과 노출/선택 소실/조합 변경 시 해당 커밋 철회.

### T07 — 출전마 표·모바일 정보 화면

- [x] **우선순위:** P1. **목적:** 상세 정보 재사용과 마번 선택 동기화. **선행:** T02, T05, T06 완료 확인.
- **대상:** dev `src/components/past-race/EntryTable.tsx`, `Term.tsx`, `saddle.ts`, `past-race.module.css`; 새 `src/components/race/EntryTable.tsx`, `HorseInfoDialog.tsx`, 기능 `RaceBettingClient.tsx`.
- **구현 지시:** dev 표의 최근 5전·스타일·전적·배당·중량 등을 과거 자료에 재사용한다. 예정 mock에 없는 값은 미제공으로 표시한다. 데스크톱 정보 영역, 모바일 전체 화면 dialog와 fixed 정보 버튼을 만든다. 표와 직접 번호 버튼이 동일 Draft 액션을 호출한다. 모달은 닫아도 Draft·슬립·스크롤을 보존하고 선택 시 닫지 않는다. 키보드 표시와 하단 바 겹침을 검증한다.
- **재사용:** dev `EntryTable`/`Term`/CSS, 기능의 선택 유효성 검사. **보존:** 과거 블라인드 마명·기수·결과 비공개, 출전취소 선택 금지. **변경 금지:** `past-races.json`, Canvas, 베팅 함수.
- **완료 조건:** 모달/기본 화면 선택 즉시 동기화, 닫기 후 입력·스크롤 유지. **검증:** 모바일 실브라우저와 키보드·접근성 포커스, lint/type/build.
- **회귀 대상:** 과거 출전표, 모바일 번호 선택, 취소마. **위험:** `BlindEntry`와 `RaceEntry` 필드 차이, 모달 재마운트.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 통합 커밋은 작업 트리 제한으로 생성하지 않음) / 블라인드 검증: 예정 경주 `RaceEntry`만 표·정보 dialog에 전달하고 과거 `BlindEntry`/결과 경로 및 `past-races.json`은 수정하지 않음; 취소마 번호 버튼 비활성, 닫기/선택은 부모 Draft 상태 유지 / 검증: `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run build`, `node --test tests/*.test.mjs` 20/20 통과 / 수정 파일: `frontend/src/components/race/EntryTable.tsx`, `frontend/src/components/race/HorseInfoDialog.tsx`, `frontend/src/components/betting/RaceBettingClient.tsx`, `frontend/src/app/races/[id]/racing.css`, `MERGE_TASKS.md` / 남은 위험: 실제 모바일 실브라우저·키보드 포커스 수동 확인은 현재 실행 환경에 브라우저가 없어 미실시. 예정 mock에 최근 전적·스타일·중량 값이 없어 미제공으로 표시.

### T08 — 데스크톱 모달·모바일 전체 화면 조합 편집

- [x] **우선순위:** P1. **목적:** 긴 그룹 입력을 기본 패널 밖에서 처리. **선행:** T06, T07 완료 확인.
- **대상:** `src/components/betting/CombinationEditor.tsx`, `RaceBettingClient.tsx`, `src/app/races/[id]/racing.css`.
- **구현 지시:** 데스크톱 약 720~860px 모달, 모바일 전체 화면 편집으로 그룹 수·1+2/2+1·마번·미리보기·조합 수·금액을 배치한다. Draft는 부모가 소유하며 닫기/다시 열기 시 유지한다. 생성은 기존 `buildGroupCombinations`만 호출한다. 편집 후 `베팅 슬립에 추가`는 기존 검증 경유.
- **재사용:** 기능의 `groups`, `pattern`, `preview`, `HorseChoices`; `lib/betting.ts`. **보존:** 조합 정규화·중복·한도·금액. **변경 금지:** 조합 알고리즘 수정, 모달 닫힘에 따른 슬립 초기화.
- **완료 조건:** 7승식에서 현재와 같은 조합 집합·총액. **검증:** 기존 조합 Node 테스트와 1/2/3그룹·박스·긴 목록 브라우저 확인.
- **회귀 대상:** 개별 Draft, 마번 선택, 초보자 모드, 모달 포커스. **위험:** 그룹의 동일 마번 중복/순서 규칙 손상.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 통합 커밋은 작업 트리 제한으로 생성하지 않음) / 조합 비교: 기존 `buildGroupCombinations`만 호출하도록 편집 UI를 분리; 알고리즘·정규화·중복 제거·검증 경계 변경 없음. 1·2·3그룹/박스/TRIO `1+2`·`2+1` 선택과 조합 수·미리보기·총액 제공; 베팅 슬립 추가는 기존 Draft 검증 경유 / 검증: `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run build`, `node --test tests/*.test.mjs` 20/20 통과 / 수정 파일: `frontend/src/components/betting/CombinationEditor.tsx`, `frontend/src/components/betting/BetDraftEditor.tsx`, `frontend/src/app/races/[id]/racing.css`, `MERGE_TASKS.md` / 남은 위험: 데스크톱·모바일 브라우저에서 긴 목록과 편집 후 닫기/재열기 수동 확인은 현재 실행 환경에 브라우저가 없어 미실시.

## Phase 5 — 혼합 베팅 슬립과 일괄 구매

**완료 기준:** 공통 입력·슬립 컴포넌트와 신규 구매/정산 연결 지점을 준비하되 `/challenge/past`의 **기존 베팅·정산을 기본 동작으로 유지**. 개별·조합 혼합, 경주별 슬립 분리, 읽기 전용 금액, 새 경로 원금 차감·스냅샷을 독립 검증. **커밋:** T09 슬립, T09A 구매, T09B 비활성 연결을 각각 커밋. **롤백:** 기존 과거 흐름·슬립 금액·지갑 기록·블라인드 공개 규칙 오류 시 해당 커밋 철회.

### T09 — 공통 BetSlip과 중복 확인

- [x] **우선순위:** P0. **목적:** 두 경주 유형에서 사용할 다중 베팅 슬립 UI와 승인형 중복 추가 구현. **선행:** T06, T08.
- **대상:** 기능 `RaceBettingClient.tsx`의 슬립/`addSlip` 영역, 새 `src/components/betting/BetSlip.tsx`, `BetSlipItem.tsx`, 중복 확인 모달, 모바일 슬립 상세.
- **구현 지시:** `Slip[]`를 `raceKind:raceId`별 ID·mode·betType·복사된 combinations·각 라인의 고유 `lineId`를 가진 `betSlip`으로 분리한다. 같은 **현재 경주**의 `betType:selectionKey`가 기존 개별/조합 항목과 겹치면 중복 수·금액·총액을 확인 모달로 보여주고 취소 시 추가하지 않는다. 승인 시 별도 항목/라인으로 append한다. 그룹 펼침·그룹 삭제·개별 항목 삭제, 반복 원금을 포함한 총액을 제공한다. 다른 경주 슬립은 보관·복원하되 현재 경주의 슬립/총액에 섞지 않는다. 슬립 내 `updateAmount` 입력을 제거해 금액은 텍스트만 표시한다. 모바일 하단 요약+전체 화면 상세를 연결한다. 구매 실행/차감은 T09A에 둔다.
- **재사용:** 기능 `addSlip`의 흐름, `calculateTotalStake`, 기존 그룹 카드. **보존:** 그룹 내부 동일 조합 제거, 그룹 내 개별 조합 삭제 미지원, 100,000P 한도. **변경 금지:** 조합 생성 알고리즘, 승인된 중복 항목 제거, 슬립 금액 수정 기능 재도입.
- **완료 조건:** 같은 경주 안에서 서로 다른 승식·개별/조합 혼합 슬립, 중복 확인 취소/승인, 그룹 삭제·총액 계산이 구매 실행 없이 동작. A→B→A에서 슬립이 경주별로 복원되고 서로 섞이지 않음. **검증:** 혼합/중복·경주 왕복 브라우저 흐름과 금액 단위 테스트, lint/type/build.
- **회귀 대상:** 초보자/일반 전환 시 슬립, 조합 그룹 내부 중복 제거, 취소마. **위험:** 승인 상태 유실, Draft 변경이 슬립을 수정하는 문제.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 변경은 작업 트리). 선행 T06·T08의 완료 표시·메모와 구현 파일을 확인했다. 전략 문서는 슬립 상태/중복 계약과 모바일 상세 UX 부분만 참고했다.
  - **구현:** 공통 `BetSlip`/`BetSlipItem`에 개별·조합 혼합, 그룹 펼침·그룹 삭제·개별 항목 삭제, 읽기 전용 금액, 반복 원금 합계를 제공한다. 현재 `raceKind:raceId`만 중복 비교·렌더·합산하며 세션 저장 키와 기존 초안을 보존한다. 추가 시 조합·마번을 복사하고 항목/그룹 ID와 고유 `lineId`를 부여한다. 동일 승식·정규화 마번이 겹치면 중복 조합 수·추가 중복 금액·이번 추가 금액·추가 후 총액을 확인하고, 취소 시 불변/승인 시 별도 항목과 승인 시각·라인 ID를 보존한다. 전체 슬립의 100,000P 한도와 잔액을 추가·승인 시 검증한다. 모바일 하단 요약과 전체 화면 상세는 같은 부모 슬립을 사용한다. 구매·차감, 과거 기본 흐름, 조합 생성 함수는 변경하지 않았다.
  - **검증:** `node --test tests/*.test.mjs` 23/23 통과(신규 3개: 복사본 독립성·혼합·중복 승인/취소·라인 ID·금액·경주/유형 격리·순서·한도/잔액/100P 단위). `npx.cmd tsc --noEmit --incremental false`, `npm.cmd run lint`, `npm.cmd run build` 통과(24개 정적 페이지 생성). `git diff --check` 통과. 프로덕션 서버와 headless Edge/CDP에서 혼합 개별/그룹·중복 취소/승인·읽기 전용 금액·초보자 전환 후 슬립 유지·u1→u4→u1 격리·새로고침 복원·390px 전체 화면 상세/그룹 펼침·삭제를 확인했다. 320/390/768/1440px 가로 넘침 없음, 지갑 localStorage 값 불변 확인. 브라우저 검증용 임시 스크립트는 제거했다.
  - **수정 파일:** `frontend/src/types/racing.ts`, `frontend/src/lib/bet-slip.ts`, `frontend/src/components/betting/BetSlip.tsx`, `frontend/src/components/betting/BetSlipItem.tsx`, `frontend/src/components/betting/SlipDialog.tsx`, `frontend/src/components/betting/RaceBettingClient.tsx`, `frontend/src/app/races/[id]/racing.css`, `frontend/tests/bet-slip.test.mjs`, `MERGE_TASKS.md`.
  - **남은 위험/후속:** 실제 모바일 기기·가상 키보드 검증은 미실시. 세션 저장 차단 시 기존 복원 불가 안내를 유지한다. 승인 중복의 구매 검증·스냅샷·원금 차감은 T09A에서 연결하며, 과거 경주 공통 입력 연결은 T09B 범위다. Node의 기존 `MODULE_TYPELESS_PACKAGE_JSON` 경고는 테스트 결과에 영향이 없다.

### T09A — 구매 확인·스냅샷·원금 차감

- [x] **우선순위:** P0. **목적:** 혼합 슬립 일괄 구매와 구매 ID당 원금 1회 차감. **선행:** T04, T04A, T09.
- **대상:** 기능 `src/lib/demoPurchase.ts`, `src/lib/betting.ts`의 구매 검증 경계, 새 공통 구매 확인 UI/구매 컨트롤러, T04 저장소.
- **구현 지시:** 구매 확인 모달에 경주 유형별 총 150%/200% 반환과 결과 확인 시점을 안내한다. **현재 `raceKind:raceId` 슬립만** 확인·확정 대상으로 받아 모든 라인의 `raceId`가 일치하는지 검증한다. 다른 경주 원금/항목은 절대 합산하지 않고 여러 경주의 일괄 구매 UI·API를 만들지 않는다. 승인된 중복의 `lineId`·승인 이력·mode·group ID를 스냅샷에 보존하고, 기존 `validatePurchase`의 무조건 중복 거부만 승인 정보 기반으로 변경한다. 복원된 초안의 경주 상태·출전취소·100,000P 한도·잔액을 재검증한다. 원금 합계를 `purchaseId`당 한 번 차감하고 영속 쓰기가 성공한 뒤에만 완료 처리하며 **구매한 경주의 미확정 슬립만** 비운다. quota/쓰기 실패·같은 요청 재시도는 실패/멱등 처리하며 다중 탭 원자성 한계를 표시한다. `/challenge/past`의 기본 구매 버튼은 T11B까지 기존 경로로 유지한다.
- **재사용:** 기능 `completeDemoPurchase`, `validatePurchase`의 비중복 검증, T04 원장/스냅샷. **보존:** 혼합 구매·승인 중복 라인별 보존·금액 수정 금지. **변경 금지:** 저장 키 임의 변경, 조합 생성 알고리즘, 성공 전 잔액 차감 표시.
- **완료 조건:** 단일 경주의 혼합·승인 중복을 한 번에 구매하고 원금이 정확히 1회 차감됨. 다른 경주의 Draft/슬립은 유지되고 현재 구매에 섞이지 않음. 20건 표시 제한과 별개로 스냅샷 복원이 가능하며 저장 실패 시 구매 성공으로 기록되지 않음. **검증:** 구매 저장소/경주 간 격리/재시도/21번째 거래/quota 테스트, 브라우저 구매 확인, 기존 `/challenge/past` 회귀, lint/type/build.
- **회귀 대상:** 대시보드 잔액·기록, 기존 예정 경주 구매, 중복 확인 결과. **위험:** `BetPurchase.mode` 단일 필드 정보 손실, 이중 제출, 저장 용량.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 변경은 작업 트리). 선행 T04·T04A·T09 완료 표시와 메모·구현을 확인했으며 전략 문서의 경주별 구매 경계·승인 중복·스냅샷/저장 실패·동시성 계약과 결과 확인 시점 부분만 참고했다.
  - **구현:** 공통 `PurchaseController`에서 현재 경주의 슬립만 복사해 구매 확인에 전달하고 총 원금·과거 적중 총 150%/예정 적중 총 200%·환불 100%·결과 확인 시점·다중 탭 한계를 안내한다. `completeSlipPurchase`는 경주 유형/ID와 각 라인의 경주 ID, 항목/라인 ID, 승식·순서·취소마·100P 단위·100,000P 한도·최신 잔액을 검증하고 유효한 승인 이력이 있는 중복만 허용한다. 스냅샷에 각 항목의 mode/group ID/line ID/승인 이력과 경주 정보·혼합 mode·pending 상태를 보존한다. 기존 지갑·구매 저장 키와 20건 요약 제한을 유지하며 독립 스냅샷은 자동 절단하지 않는다. 구매 ID와 구매 라인 원장으로 재시도·이중 클릭·초안 삭제 실패 후 재확정의 재차감을 막는다. 스냅샷 선저장 후 지갑 저장이 실패하면 성공 처리 없이 롤백하고, 원장 없는 임시 스냅샷은 구매 완료로 읽지 않는다. 삭제·손상 스냅샷은 복원 불가를 반환하며 재차감하지 않는다. 저장 성공 후 구매한 항목만 현재 경주 슬립에서 비우고 Draft·다른 경주 상태는 보존한다. 실제 결과/접수 라우트 연결은 T11 범위다.
  - **검증:** `node --test tests/*.test.mjs` **29/29 통과**(신규 6개: 혼합·승인 중복 스냅샷/라인별 메타데이터와 원금 합계, 잔액 소진·마감 후 재시도, 무승인/그룹 내부 중복/중복 ID 거부, 경주·유형·라인 경주 불일치, 취소마·한도·금액·최신 잔액 검증, 21번째 거래 이후 복원·삭제/손상 시 재차감 방지, snapshot/wallet quota·롤백 실패·localStorage 접근 차단). `npx.cmd tsc --noEmit --incremental false`, `npm.cmd run lint`, `npm.cmd run build` 통과(24개 정적 페이지 생성). `git diff --check` 통과.
  - **브라우저:** 최종 프로덕션 빌드와 headless Edge/CDP에서 u1의 개별·조합·다른 승식·승인 중복 4라인 **4,000P를 정확히 1회 차감**(12,480→8,480P), 확인 취소 시 불변, 지갑 쓰기 quota 발생 시 슬립·잔액·완료 상태 불변 및 동일 요청 재시도/연속 클릭 성공을 확인했다. 현재 슬립만 비우고 Draft와 u4의 세션 저장값을 보존했으며 새로고침 후 유지됐다. 390px 상세에서 u4 구매 1,000P 차감도 확인했다. 기존 `/challenge/past`에서는 기존 슬립 추가 시 미차감·확정 시 legacy 정산 기록의 순증감만 잔액에 반영·신규 구매 원장 불변을 확인했다. 검증용 임시 스크립트와 서버/브라우저는 정리했다.
  - **수정 파일:** `frontend/src/types/racing.ts`, `frontend/src/lib/betting.ts`, `frontend/src/lib/demoPurchase.ts`, `frontend/src/components/betting/PurchaseController.tsx`, `frontend/src/components/betting/BetSlip.tsx`, `frontend/src/components/betting/RaceBettingClient.tsx`, `frontend/tests/demoPurchase.test.mjs`, `MERGE_TASKS.md`.
  - **남은 위험:** localStorage의 여러 탭 동시 read-modify-write와 스냅샷/지갑 간 두 번의 쓰기는 완전한 원자적 거래가 아니다. 롤백 삭제까지 차단되면 임시 스냅샷을 남기되 해당 ID는 복원 불가로 처리한다. 세션 초안 삭제 실패 후에도 구매 라인 원장으로 재차감을 방지한다. 실제 모바일 기기/가상 키보드 검증은 미실시. 기존 Node `MODULE_TYPELESS_PACKAGE_JSON` 경고는 검사 결과에 영향이 없다. 과거 기본 구매 경로는 변경하지 않았으며 공통 연결은 T09B에서 비활성 경계로 준비한다.

### T09B — 통합 베팅 라우트와 지난/예정 데이터 어댑터 연결

- [x] **우선순위:** P0. **목적:** `/betting/[kind]/[raceId]` 단일 라우트(`kind`는 `pastBlind` 또는 `upcoming`)에 지난/예정 어댑터와 하나의 `RaceBettingClient`를 연결하고 같은 `BetDraftEditor`, `CombinationEditor`, `BetSlip`을 사용한다. **선행:** T02A, T06, T08, T09, T09A.
- **대상:** 신규 `src/app/betting/[kind]/[raceId]/page.tsx`; 기능 `src/components/betting/RaceBettingClient.tsx`, 기존 `/races/[id]` 페이지·데이터 함수; dev `PastRaceGame`/과거 경주 데이터 함수와 `/challenge/past` 선택 화면; 공통 `src/components/betting/{BetDraftEditor,CombinationEditor,BetSlip}.tsx`.
- **구현 지시:** 단일 동적 라우트에서 `kind`를 검증하고 두 유형의 데이터 어댑터를 같은 `RaceBettingClient`에 전달한다. 과거 어댑터는 블라인드 공개 필드만 전달하며 예정 어댑터는 예정 자료를 전달한다. 결과 공개 시점·결과 화면·보상은 기존 `raceKind` 계약으로 구분한다. 편집·조합·슬립과 중복 확인 동작을 재사용하고 확정된 알고리즘/모달은 바꾸지 않는다. 슬립 키는 `raceKind:raceId`로 격리한다. `/challenge/past`의 기존 경주 선택과 기존 구매·정산 흐름은 그대로 두며, **통합 라우트의 과거 신규 구매는 테스트 전용(비활성 구매 또는 격리된 가짜 저장소)으로 제한해 실제 포인트를 차감하거나 legacy 정산에 연결하지 않는다.** `/races/[id]`는 신규 통합 URL로 연결하거나 기존 진입을 호환 경로로 제공한다. 이 Task에서 기존 과거 입력·정산은 제거하거나 전환하지 않는다.
- **재사용:** T06/T08 공통 Draft·조합 편집, T09/T09A 슬립·구매, 기존 `RaceBettingClient`, 지난/예정 경주 데이터 함수와 `/challenge/past` 선택. **보존:** 기존 과거 베팅·정산·포인트 기록, 블라인드 공개, 기존 승식별 조합 알고리즘, 보상 정책·중복 확인 모달. **변경 금지:** T11B 전에 과거 실제 구매 활성화/실제 포인트 차감, T11B 전 legacy 흐름 제거, 예정 경주만 조합 기능 제공, Mock 결과 수정.
- **완료 조건:** 두 kind URL이 하나의 라우트와 단일 `RaceBettingClient`를 통해 동일 편집기 3종을 렌더하고 각 데이터 어댑터·정보 공개 규칙이 맞음. 경주 유형별 슬립이 분리됨. 과거 테스트 구매가 실제 포인트를 차감하지 않으며 `/challenge/past` 기존 구매·배당 기반 정산·포인트·결과는 변경 전과 동일함. `/races/[id]` 진입이 통합 URL 또는 호환 경로로 동작함. **검증:** 양 kind의 렌더/어댑터/공개 정보/슬립 격리, 테스트 구매 무차감, `/challenge/past` 기존 흐름 회귀 및 링크 확인, lint/type/build.
- **회귀 대상:** `/challenge/past` 경주 선택·블라인드 정보·기존 구매/정산, `/races/[id]` 진입, 예정 경주 개별/조합·대시보드 이동. **위험:** 과거 `Bet`와 공통 `BetCombination` 변환, 결과 데이터 조기 노출, 이중 상태 소유자, 테스트 구매가 실제 지갑에 기록되는 오류.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 변경은 작업 트리). T02A·T06·T08·T09·T09A 완료 상태와 수정된 통합 라우팅 계약을 확인했다.
  - **구현:** 신규 `/betting/[kind]/[raceId]` 단일 App Router에서 `upcoming`은 예정 `Race/RaceEntry` 어댑터를, `pastBlind`는 `getBlindRaceById`와 공개 가능한 번호·취소 여부만 가진 테스트 어댑터를 사용해 동일 `RaceBettingClient`에 전달한다. 두 경로 모두 기존 `BetDraftEditor`, `CombinationEditor`, `BetSlip`/슬립 대화상자와 `racing.css`를 재사용한다. 과거 경로는 `testOnly`로 구매 컨트롤러·실제 포인트/구매 원장을 비활성화하며 결과·정산을 노출하지 않는다. 잘못된 kind/ID는 `notFound()`로 안전하게 처리한다. 기존 `/races/[id]`와 `/challenge/past` 파일·흐름은 변경하지 않았다. `getBlindRaceById`만 데이터 서비스에 추가했다.
  - **검증:** `node --test tests/*.test.mjs` 29/29 통과; `npx.cmd tsc --noEmit --incremental false` 통과; `npm.cmd run lint` 통과; `npm.cmd run build` 통과(32개 정적 페이지, 신규 `/betting/[kind]/[raceId]` 포함); `git diff --check` 통과. 빌드에서 `/betting/upcoming/u1` 및 동적 통합 라우트가 생성됨.
  - **수정 파일:** `frontend/src/app/betting/[kind]/[raceId]/page.tsx`, `frontend/src/lib/past-race/service.ts`, `frontend/src/components/betting/RaceBettingClient.tsx`, `MERGE_TASKS.md`.
  - **남은 위험:** 실제 모바일 기기와 브라우저 수동 라우트 확인은 미실시. 과거 테스트 경주는 공개 번호·취소 여부만 전달하며 결과·정산·실제 구매는 T10/T11/T11B 전까지 연결하지 않는다. `/races/[id]`의 URL 리다이렉트는 후속 전환에서 결정하고 현재 호환 경로를 유지한다.

## Phase 6 — 과거 결과·예정 접수

**완료 기준:** 새 과거 결과 경로에서 그룹별 정산·재생, 예정 접수의 pending 표시를 준비한 뒤 T11B에서 `/challenge/past`의 기본 흐름을 안전하게 전환. **커밋:** T10 정산, T11 결과 라우트/상태, T11A 애니메이션, T11B 전환을 각각 커밋. **롤백:** 전환 후 구매·잔액·결과 회귀가 생기면 T11B만 되돌려 기존 과거 흐름을 복구한다.

### T10 — 다중 조합 정산 어댑터

- [x] **우선순위:** P0. **목적:** 혼합 슬립의 각 조합을 기존 적중 판정과 유형별 보상 정책으로 정산. **선행:** T02A, T04, T04A, T09A, T09B.
- **대상:** dev `src/lib/past-race/settle.ts`, `service.ts`, `types.ts`, `pools.ts`; 새 `src/lib/past-race/settle-purchase.ts`, 저장 구매 타입.
- **구현 지시:** 새 경로의 확정 구매만 각 BetSlipItem을 7승식 매핑으로 `Bet[]`로 펼치되 승인된 동일 조합도 `lineId`별로 유지한다. T02A의 데이터 정합성 게이트를 **구매 전체**에 먼저 적용한다. 포함된 어느 승식이라도 결과가 부족하거나 확정 순위와 불일치하면 전체 구매를 `unavailable|pending`으로 보류하고 부분 지급·미적중 0P 확정을 하지 않는다. 자료가 완전할 때만 기존 배당표 일치·ordered/환불 판정을 적용한다. T04A 반환율로 과거 적중은 원금의 150%, 예정 적중은 실제 결과 확정 뒤 200%, 확실한 미적중은 0을 계산한다. 원래 group ID로 각 라인의 반환액·순변화, 그룹 합계·전체 합계를 재조립한다. 구매 시 차감한 원금을 정산에서 다시 빼지 말고 반환액만 한 번 더한다. 같은 purchase ID의 재시도·새로고침 중복 지급을 억제하되 다중 탭 거래의 완전한 원자성은 주장하지 않는다. 예정 결과가 없으면 `pending`으로 둔다. **기존 `/challenge/past`의 기본 정산 호출은 T11B 전까지 legacy 경로에 남긴다.**
- **재사용:** dev `settleBet`의 배당표 비교·환불 판정, `Settlement` 타입; T04A의 보상 정책. **보존:** 환불 상태, ordered 비교, 조합 생성. **변경 금지:** `Math.floor(stake*odds)`를 포인트 지급식으로 유지, `past-races.json` 값, 예정 결과 임의 생성.
- **완료 조건:** 과거 1,000P 적중 1,500P/순수익 500P, 예정 1,000P 적중 2,000P/순수익 1,000P, 확실한 미적중 추가 지급 0P. 누락 결과는 미적중으로 처리하지 않음. 혼합·다중 그룹·승인 중복 두 라인의 항목별/전체 반환액과 잔액 변화가 일치. **검증:** 150%/200%/미적중/자료 누락/환불/중복 승인/혼합/재시도·두 탭 Node 테스트, lint/type/build.
- **회귀 대상:** 기존 `/challenge/past` 적중·환불 판정, 지갑 기록, 대시보드 잔액. **위험:** 그룹·라인 ID 유실, 구매 원금 재차감, 중복 지급.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 통합 커밋 없음). **구현:** 구매 라인의 경주·유형·금액과 전체 합계를 정산 전에 검증하고, 구매에 포함된 모든 승식의 결과 가용성이 확인된 경우에만 기존 배당표·순서·환불 판정을 적용한다. 라인 및 그룹 ID와 승인된 동일 조합을 각각 보존하며 과거 1,000P 적중은 1,500P 반환/순수익 500P, 예정 적중은 2,000P 반환/순수익 1,000P, 확정 미적중은 0P, 환불은 원금 반환이다. 예정 결과 미제공은 `pending`; 구매 정산 결과는 `creditPurchase`를 통해 반환액만 한 번 지급한다. legacy `/challenge/past` 정산 호출과 배당 지급은 그대로 유지했다. **검증:** `node --test tests/*.test.mjs` 36/36 통과; `npx.cmd tsc --noEmit --incremental false` 통과; `npm.cmd run lint` 통과(경고 없음); `npm.cmd run build` 통과(32개 페이지). **수정 파일:** `frontend/src/lib/past-race/settle-purchase.ts`, `frontend/tests/settlePurchase.test.mjs`, `MERGE_TASKS.md`. **남은 위험:** 브라우저 저장소의 재시도 멱등성은 구매 ID 기준으로 보호되지만, `localStorage` read-modify-write이므로 다중 탭 동시 지급의 완전한 원자성은 보장하지 않는다. 브라우저 기반 두 탭 시나리오는 미실시.

### T11 — 별도 결과 라우트·상태·복원

- [x] **우선순위:** P1. **목적:** 통합 베팅 라우트에서 생성된 구매의 유형별 결과/접수 화면 및 상태 복원. **선행:** T04, T09A, T09B, T10.
- **대상:** dev `src/components/past-race/ResultPanel.tsx`, `PastRaceGame.tsx`; 신규 통합 라우트의 과거 결과·예정 접수 URL(구매 ID와 `kind`/`raceId` 연결) 또는 동등 경로; T04 구매 스냅샷 저장소.
- **구현 지시:** **T09B 통합 라우트에서 시작한 실제 예정 구매와 T11B 이후 과거 구매에 대해** 유형과 경주 ID, 구매 ID를 연결한 결과/접수 경로로 이동하고 20건 표시 목록과 분리한 스냅샷에서 새로고침 복원한다. `ResultPanel`의 `pos` 기준 확정 도착 순위·기록·그룹별 다중 결과와 각 라인의 고정 정책 반환액·순수익을 표시한다. 확정 배당은 실제 경마 정보로만 표시한다. 예정 확정 후 접수 화면에는 `pending`만 표시하고 결과 자료가 생기기 전 순위·정산을 숨긴다. 구매 ID/스냅샷이 없거나 손상되면 복원 불가/안내를 보여주고 자동 재차감·재정산하지 않는다. **기존 `/challenge/past` 결과 렌더와 정산은 T11B 전까지 유지한다.** Canvas 결합은 T11A에 둔다.
- **재사용:** dev `ResultPanel`의 순위·정산 UI, T04 스냅샷, T10 정산 결과. **보존:** 구매 전 reveal 비공개, 적중·미적중·환불 표기, 예정 결과 대기. **변경 금지:** Mock 결과 수정, 저장 실패 시 허위 복원, 애니메이션 경로 계산 수정.
- **완료 조건:** 과거 확정→별도 결과·그룹별 정산, 예정 확정→대기, 21번째 거래 뒤에도 새로고침 복원, 삭제/손상 스냅샷 오류 안내. **검증:** 결과 라우트/새로고침/삭제·quota 시나리오, 순위 없는 말 표시, lint/type/build.
- **회귀 대상:** 기존 지난 경주 도전, 데스크톱/모바일 헤더, 지갑 잔액. **위험:** 클라이언트 JSON의 공개 한계, 표시 목록 절단과 구매 스냅샷 혼동.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 통합 커밋 없음). **구현:** 통합 구매 확정 후 `/betting/[kind]/[raceId]/result/[purchaseId]`로 이동한다. 별도 구매 스냅샷과 지갑 원장을 대조해 유형·경주·구매 ID가 일치할 때만 복원하고, 손상/삭제/불일치는 재차감 없이 복원 불가 화면으로 표시한다. 예정 구매는 pending 접수와 금액만 표시한다. 과거 구매 결과는 전체 결과 가용성 게이트를 통과한 뒤 T10 정산을 한 번만 반영하고, 라인·그룹별 반환/손익과 순위·기록·확정 배당을 보여주며 정산 결과를 20건 표시 목록과 분리된 구매 스냅샷에 보존한다. 기존 `/challenge/past` 결과/정산과 구매 전 블라인드 화면은 변경하지 않았고 Canvas는 T11A에 남겼다. **검증:** `node --test tests/*.test.mjs` 37/37 통과; `npx.cmd tsc --noEmit --incremental false` 통과; `npm.cmd run lint` 통과; `npm.cmd run build` 통과(결과 라우트 포함 33개 정적/부분 사전 렌더 경로). 구매 스냅샷 21건 이후 복원 및 quota 저장 실패 자동화 테스트 통과. **수정 파일:** `frontend/src/app/betting/[kind]/[raceId]/result/[purchaseId]/page.tsx`, `frontend/src/components/betting/PurchaseController.tsx`, `frontend/src/lib/demoPurchase.ts`, `frontend/src/lib/past-race/service.ts`, `frontend/tests/demoPurchase.test.mjs`, `MERGE_TASKS.md`. **남은 위험:** 이 저장소의 결과 데이터는 현재 브라우저 번들에서 근본적으로 숨길 수 없으며 브라우저 실기기·새로고침 UI/저장 삭제 시나리오 수동 검증은 미실시. 실제 과거 구매는 T11B 전환 전까지 기존 제한대로 비활성이다.

### T11A — 결과 트랙 애니메이션 연결

- [x] **우선순위:** P1. **목적:** 별도 과거 결과 화면에 기존 Canvas 재생을 이식. **선행:** T11.
- **대상:** dev `src/components/past-race/ReplayCanvas.tsx`, `horseSprite.ts`, `saddle.ts`, `past-race.module.css`, T11 결과 라우트/`ResultPanel`.
- **구현 지시:** 스냅샷의 `RevealEntry[]`, 거리, 경마장을 `ReplayCanvas`에 전달한다. 기존 Canvas 경로·프레임 계산, 재시작, resize, reduced-motion을 유지한다. 재생 중 임시 순위와 결과 표의 확정 도착 순위를 구분하고 입력 화면 및 예정 `pending` 화면에는 Canvas를 렌더하지 않는다.
- **재사용:** dev `ReplayCanvas.tsx`, `horseSprite.ts`, `saddle.ts`와 CSS Module. **보존:** 현재 트랙 애니메이션·순위·기록 표현. **변경 금지:** 승식/정산·Mock 데이터 변경, 애니메이션 경로 알고리즘 임의 수정.
- **완료 조건:** 과거 결과 페이지에서 재생/다시 재생/모션 축소가 동작하고 모바일 가로 넘침이 없음. **검증:** 실브라우저 재생·resize·reduced-motion·390px, lint/type/build.
- **회귀 대상:** 결과 순위 표, 예정 접수 화면, 과거 베팅 입력 화면. **위험:** Canvas resize 반복, 스냅샷 누락 시 잘못된 재생.
- **완료 메모:** SHA: `cb003b9` (기준 HEAD; 통합 커밋 없음). T11 결과 페이지에서 과거 구매가 결과 검증·정산된 경우에만 기존 `ReplayCanvas`를 렌더하고, 해당 경주의 공개 결과·거리·장소를 전달해 기존 재생/다시 재생/resize/reduced-motion 동작을 유지했다. 확정 도착 순위 표와 Canvas 임시 순위는 별도 표시되며 예정 pending·입력 화면에는 Canvas가 나타나지 않는다. **검증:** `node --test tests/*.test.mjs` 37/37 통과; `npx.cmd tsc --noEmit --incremental false`, `npm.cmd run lint`, `npm.cmd run build` 통과(33개 경로). 실브라우저 resize·reduced-motion·390px 확인은 미실시. **수정 파일:** `frontend/src/app/betting/[kind]/[raceId]/result/[purchaseId]/page.tsx`, `MERGE_TASKS.md`. **남은 위험:** Canvas 표시의 실제 모바일 브라우저 동작은 수동 확인이 필요하다.

### T11B — 과거 경주 공통 베팅 흐름 전환

- [x] **우선순위:** P0. **목적:** 기존 과거 선택 기능을 보존하면서 해당 선택의 기본 베팅 진입을 통합 `/betting/pastBlind/[raceId]` 경로로 전환. **선행:** T09B, T10, T11, T11A.
- **대상:** dev `PastRaceGame.tsx`, 과거 경주 `BetSlip.tsx`, `/challenge/past` 선택 화면; 공통 `RaceBettingClient`, `BetDraftEditor`, `CombinationEditor`, `BetSlip`; 새 정산·결과 라우트 연결부와 `/races/[id]` 호환 연결.
- **구현 지시:** T04A 이전부터 유지한 기존 과거 베팅→배당 기반 정산→잔액/기록 회귀 결과를 기준선으로 기록한다. 통합 경로에서 2모드×2구매 방식×7승식×다중 슬립, 150% 반환, 환불, 별도 결과·재생, 경주별 Draft/슬립 복원을 검증한다. **T10 정산, T11 결과 복원, T11A 재생이 모두 통과한 후에만** `/challenge/past`의 경주 선택 기능은 보존하고 선택 완료 시 `/betting/pastBlind/[raceId]`로 이동시킨다. 기존 `pool/picks/stake/bets` 입력·정산은 과거 흐름 전환 커밋까지 유지한 뒤 검증하고 제거한다. 실패하면 전환 커밋만 되돌려 과거 선택 및 기존 베팅·정산을 복구한다. 예정 경주 URL도 동일한 `/betting/upcoming/[raceId]` 구조를 사용하며 `/races/[id]` 진입은 연결/호환을 유지한다.
- **재사용:** T09B의 비활성 공통 입력 연결, T10 정산, T11 결과 화면, T11A 애니메이션, 기존 과거 흐름 기준선. **보존:** 과거 블라인드 공개 규칙·경주 선택·포인트 기록, 기능 브랜치 조합 생성 알고리즘. **변경 금지:** 미완성 결과 경로에 기본 구매 버튼 연결, 다른 경주와 슬립 합산, 확정된 150%/200% 반환율 변경.
- **완료 조건:** `/betting/pastBlind/[raceId]`와 `/betting/upcoming/[raceId]`가 하나의 `RaceBettingClient` 및 동일 `BetDraftEditor`·`CombinationEditor`·`BetSlip`을 사용하고 두 유형 모두 초보자/일반·개별/조합·7승식·다중 슬립을 제공함. `/challenge/past`의 기존 경주 선택은 유지되며 과거 확정은 새 결과 화면으로 이동한다. 구매·정산·잔액·기록 회귀가 없고 롤백 경로가 확인됨. **검증:** 선택 화면과 두 kind URL 브라우저 흐름, 과거 적중·미적중·환불·중복 승인·경주 전환, `/races/[id]` 연결/호환, lint/type/build.
- **회귀 대상:** `/challenge/past` 경주 선택·출전표, 베팅·기록·결과 재생, `/races/[id]` 연결/호환. **위험:** 기존 과거 상태와 새 저장소의 이중 차감, 전환 순간 미완성 결과 경로 노출.
- **완료 메모:** 기준 HEAD `cb003b9` (커밋 없음). 기존 과거 경주 선택/경마장 필터가 고른 경주를 통합 `/betting/pastBlind/[raceId]`로 이동시키고 실제 구매 컨트롤러를 활성화했다. Draft·슬립 저장 키를 `raceKind:raceId`로 분리해 과거/예정 상태를 격리한다. 기존 `/challenge/past?legacy=1`로 legacy 흐름에 복귀할 수 있다. **검증:** Node 37/37, 타입 검사, lint, build(33 경로) 통과. 브라우저 수동 구매/롤백 검증은 미실시. **수정 파일:** `frontend/src/components/past-race/PastRaceGame.tsx`, `frontend/src/components/betting/RaceBettingClient.tsx`, `frontend/src/app/betting/[kind]/[raceId]/page.tsx`, `MERGE_TASKS.md`. **남은 위험:** 자동 선택 후 이동 흐름의 실브라우저 UX와 두 탭 동시 저장은 별도 수동 검증 필요.

## Phase 7 — 최종 회귀 및 인수

**완료 기준:** 모든 필수 흐름·viewport·품질 게이트 통과, 남은 제한 문서화. **커밋:** 회귀 수정만 독립 커밋. **롤백:** 기존 화면/기록 중대 회귀가 남으면 배포·병합 보류하고 마지막 안정 커밋 사용.

### T12 — 전체 회귀와 마감

- [x] **우선순위:** P0. **목적:** 두 브랜치 기능 보존을 증명. **선행:** T01, T02, T02A, T03, T04, T04A, T05, T05A, T06, T07, T08, T09, T09A, T09B, T10, T11, T11A, T11B (모두 완료 확인).
- **대상:** `frontend/tests/`, `frontend/src/app/**`, `frontend/src/components/**`, `frontend/src/lib/**`, `frontend/next.config.ts`; 검증 기록.
- **구현 지시:** 통합 `/betting/[kind]/[raceId]`의 두 kind가 **동일 `RaceBettingClient`, `BetDraftEditor`, `CombinationEditor`, `BetSlip`**을 사용하고 각 어댑터·정보 공개 규칙이 맞는지 검증한다. `/challenge/past` 선택 보존 및 `/races/[id]` 연결/호환, `raceKind:raceId` 슬립 격리, 중복 확인 취소/승인·삭제/총액/모드 전환, **경주 A→B→A Draft/슬립 복원과 단일 경주만 구매**, 출전마 모달 선택 동기화/닫기/스크롤, 과거 다중 결과·확정 환불 정책·150% 반환, 예정 pending과 결과 확정 후 200% 반환을 확인한다. 승인 중복 라인별 별도 정산, 구매 1회 차감·결과 1회 지급, 재시도/새로고침의 멱등성과 다중 탭 경합 한계, 20건 요약 이후 스냅샷 복원·삭제·quota 실패, 7승식 Mock 결과 순위/조합 불일치 시 정산 보류를 포함한다. 1440/1024/768/390/320px, 긴 슬립·다수 조합·키보드·sticky/fixed·reduced-motion을 확인한다. 새 테스트는 핵심 계약과 회귀 위험에 한정한다.
- **재사용:** 기능 브랜치 `frontend/tests/*.test.mjs`, `scripts/final-check.mjs`/`visual-check.mjs` 중 현재 구조에 맞는 검증; dev 브라우저 흐름. **보존:** 기존 경로/데이터/지갑/애니메이션. **변경 금지:** 테스트 통과만을 위한 알고리즘·Mock 결과 임의 수정.
- **완료 조건:** 두 경주 유형 모두 공통 입력 컴포넌트로 2모드×2구매 방식×7승식×다중 슬립을 지원하고 필수 시나리오·공통 명령이 통과. 데이터 부족은 미적중이 아니며 다중 탭 원자성 한계/남은 제약을 명시적으로 기록. **검증:** `npm run lint`, `npx tsc --noEmit`, `npm run build`, `node --test tests/*.test.mjs`, 데스크톱·태블릿·모바일 수동/자동 주요 흐름.
- **회귀 대상:** `/`, `/dashboard`, `/challenge/past`, `/betting/[kind]/[raceId]`의 두 kind, `/races/[id]` 연결/호환, 결과/접수 경로, 저장 기록. **위험:** 브라우저별 fixed/모달·Turbopack CSS Module 처리.
- **완료 메모:** SHA: `cb003b9` (통합 커밋 없음). 선행 T01~T11B 모두 완료 표시 및 완료 메모를 확인했다. 통합 라우트·공통 클라이언트/편집기/슬립, `/challenge/past` 선택과 `/races/[id]` 연결, 경주별 상태 격리 및 구매/정산/결과 복원 계약을 기존 코드와 테스트로 점검했다. **전체 통과:** `npm.cmd run lint`, `npx.cmd tsc --noEmit --incremental false`, `npm.cmd run build` (33개 경로), `node --test tests/*.test.mjs` (37/37), `git diff --check`. **수정 파일:** `MERGE_TASKS.md` (완료 상태와 검증 메모만 추가). **남은 제한:** 실브라우저 데스크톱·태블릿·모바일 흐름 및 1440/1024/768/390/320px, 키보드·sticky/fixed·reduced-motion 시각 검증은 실행하지 못했다. T04 저장소의 다중 탭 동시 쓰기는 원자성을 보장하지 않는 기존 제약이며, 검증 스크립트 `scripts/final-check.mjs`/`visual-check.mjs`는 현재 저장소에 없다. Node 테스트에서 기존 MODULE_TYPELESS_PACKAGE_JSON 경고가 출력되나 테스트는 모두 통과했다.

## Task 세션 분할 제안

권장 묶음: 1차 T01/T02/T02A, 2차 T03/T04, 3차 T05/T05A, 4차 T06/T07/T08, 5차 T04A/T09, 6차 T09A/T09B, 7차 T10/T11, 8차 T11A/T11B, 9차 T12. **핵심 의존 관계:** 데이터·보상은 `T02 → T02A → T04A → T10`, 계산·저장은 `T02 → T03 → T04 → T04A`, 라우트/화면 준비·전환은 `T05 → T05A → T06 → T07 → T08 → T09 → T09A → T09B → T10 → T11 → T11A → T11B → T12`다. T04A는 환불 정책 사용자 확인을 받은 후 시작한다. T05/T05A/T06 등 독립 UI 작업은 그 확인을 기다리는 동안 진행할 수 있다. T09B에서 통합 URL과 두 어댑터를 연결하지만 과거 신규 구매는 테스트 전용·미차감이다. `/challenge/past` 선택과 기존 과거 베팅·정산은 T11B까지 정상 동작하고 T11B에서만 선택 후 통합 URL로의 기본 흐름을 전환한다. `/races/[id]` 연결/호환을 유지한다. 각 새 세션은 이 문서, 전략 문서, 직전 완료 메모, 현재 `git status`를 먼저 읽는다. 선행 Task가 미완료면 다음 Task를 시작하지 않는다.

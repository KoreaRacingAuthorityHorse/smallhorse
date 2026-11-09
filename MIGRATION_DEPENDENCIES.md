# 베팅 화면 이관 의존성 및 기준선

기준 문서: [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) · 작업 목록: [tasks.md](./tasks.md) 1번  
확인 기준: `dev` (`6dd0326`), 작업 브랜치 `feat/betting-screen-trackon` (`60663b0`)  
원본 경로 기준: `Z:\myproject\HorseRacing\horse-racing-demo-ver1` (아래 원본 파일 경로는 이 디렉터리에 상대적)

## 1. 현재 기준선

| 항목 | 확인 결과 | 연결 지점 |
| --- | --- | --- |
| 랜딩 | `/` 정적 경로, 응답 200 | `frontend/src/app/page.tsx` |
| 로그인 | `/login` 정적 경로, 응답 200. 데모 로그인 시 `sessionStorage["trackon-demo-login"] = "1"` 후 `/dashboard`로 이동 | `frontend/src/app/login/page.tsx` |
| 대시보드 | `/dashboard` 정적 경로, 응답 200. 날짜별 예정 경주와 지난 경주, 경주 정보·연습 조합 모달, 잔액·기록·체크리스트 표시 | `frontend/src/app/dashboard/page.tsx` |
| 정적 검사 | `npm run lint` 통과. 기존 `.next/dev`에 남은 이전 경주 경로의 타입 파일을 `.next/_stale_dev_baseline`으로 옮긴 뒤 `npm run build` 통과. 빌드가 `/`, `/login`, `/dashboard`, `/tutorial`을 생성 | `frontend` |

위의 경로 응답은 서버 렌더링 확인이다. 모달 클릭, 로그인 제출, 브라우저 저장소 복원 같은 사용자 상호작용은 이 단계에서 자동화하지 않았다. 처음 실행한 타입 검사와 빌드는 오래된 `.next/dev/types/validator.ts`가 현재 소스에 없는 `(racing)` 경로를 참조하여 실패했다. 생성 캐시를 격리한 뒤 빌드에 포함된 타입 검사는 통과했다.

## 2. 현재 대시보드 계약

| 항목 | 현재 구현 | 이관 시 필요한 연결 |
| --- | --- | --- |
| 경주 ID | `dashboard/page.tsx`의 로컬 `races` 배열에 `u1`~`u12`, `p1`~`p3` 사용. 각 카드의 `race.id`가 식별자 | 카드에서 `/races/${race.id}/`로 이동시키고, 상세 데이터 조회에 같은 ID를 사용한다. 원본의 `seoul-20261019-03` 등과 ID 체계가 달라 직접 연결되지 않는다. |
| 경주 정보 | `Race` 로컬 타입에 날짜·장소·번호·시각·거리·출전 두수·등급·이미지·`past?` 보관. 출전마 상세·기수·배당·취소마 정보는 없음 | 상세 데이터 모델에 출전마와 상태를 추가한다. `past`만으로 `OPEN/CLOSED/CANCELLED/FINISHED`를 판별할 수 없으므로 별도 상태가 필요하다. |
| 진입점 | 예정 카드의 `상세보기`/`예측하기`, 지난 카드의 `복기 연습하기`가 모두 대시보드 로컬 `activeRace`와 `<dialog>`를 연다 | 해당 동작을 상세 화면 이동으로 정리하고, 기존 간단 예측 모달과 새 구매 흐름의 중복을 없앤다. |
| 저장 키 | `localStorage["trackon-premium-demo-v1"]`에 `{ balance, records, tasks }` JSON 저장. 초기값은 `balance: 12480`, `records: []`, `tasks: [true,true,false,false,false]` | 새 구매 기록이 기존 필드를 보존하며 같은 키를 읽고 써야 한다. 원본 `racelab-demo-v1`과 별도 저장소를 만들면 잔액·기록이 분리된다. |
| 기록 표시 | `RecordItem`은 `{ day, name, kind, pick, result, amount }`. 저장 기록 최대 20건, 화면은 저장 기록과 `sampleRecords`를 합쳐 최대 8건 표시 | 조합·경주 ID·구매 시각 등 새 구매 정보의 표현 방법을 정하고, 기존 기록 표시와 호환시킨다. `sampleRecords`는 고정 예시이므로 실제 저장 기록과 구분한다. |
| 로그인 상태 | 데모 로그인 키는 `sessionStorage`에 있고 대시보드에서 로그아웃할 때 제거 | 경주 상세 화면 진입에 별도 인증 구조를 복사할 필요가 없다. 기존 흐름을 유지한다. |

## 3. 원본 상세 화면에서 출발하는 의존성

| 역할 | 원본 파일 | 사용 관계와 이관 판단 |
| --- | --- | --- |
| 상세 경로 | `app/races/[id]/page.tsx`, `not-found.tsx` | URL의 `id`로 `getRaceById`·`getEntries` 호출, `RaceInfoHeader`·`RaceDetailContent` 구성. 경로 구조와 조회 흐름을 참고한다. 고정된 9개 `generateStaticParams`와 원본 `RouteShell`은 현재 ID·TRACK:ON 레이아웃에 맞게 재작성한다. |
| 경주 정보 | `components/race/RaceInfoHeader.tsx`, `HorseTable.tsx` | 헤더는 날짜·거리·경주 번호, 표는 출전마·기수·배당·취소 여부·선택 상태 표시. `HorseTable`은 `lucide-react`의 `Info` 아이콘에 의존한다. |
| 화면 상태 | `components/race/RaceDetailContent.tsx` | `raceId`, `entries`, `status`, `result`를 받고 승식, 초보자/일반, 개별/조합, 선택·장바구니·금액, 비교·확인·완료 모달을 로컬 state로 관리. `useDemo()`의 `pointBalance`·`addTicket()`과 `useRouter()`에 의존한다. 원본 완료 모달의 `/my-bets` 이동은 대시보드 기록으로 바꾼다. 경주 ID 전환 시 로컬 상태 초기화도 필요하다. |
| 베팅 UI | `components/betting/BetTypeSelector.tsx`, `BetTypeComparisonSelector.tsx`, `PurchaseModeSelector.tsx`, `BetAmountSelector.tsx`, `GroupNumberSelector.tsx`, `CombinationSummary.tsx` | 7승식 설명·비교, 구매 방식, 금액 입력, 조합 그룹 선택·요약. 비교 UI는 `lucide-react`의 `BookOpen`, `X` 사용. |
| 개별 구매 UI | `components/betting/BetSlip.tsx`, `CombinationBuilder.tsx`, `BetCombinationCard.tsx` | 선택을 조합으로 만들고 추가·삭제하며 조합별 금액·총액·잔액을 검사. `CombinationBuilder`·카드는 `lucide-react` 사용. |
| 조합 구매 UI | `components/betting/CombinationPurchaseSlip.tsx` | 승식별 조합 묶음, 추가·삭제·총액·잔액 검사. `lucide-react`의 `Trash2` 사용. |
| 확인·완료 UI | `components/betting/BetConfirmModal.tsx`, `BetSuccessModal.tsx` | 구매 확인, 완료 결과·기록 이동. 확인 모달은 초점 이동·Escape 처리 포함. 현재 대시보드 기록 경로에 맞게 완료 동작을 수정한다. |
| 타입 | `types/race.ts`, `bet.ts`, `purchase.ts` | 경주·상태·출전마, 7승식·선택·조합·구매 기록, 개별/조합 구매 초안의 계약. `bet.ts`와 `race.ts`는 타입 상호 참조. |
| 경주 데이터 | `services/raceService.ts`, `data/mockRaces.ts`, `data/mockHorses.ts` | 원본 ID별 조회 경계와 목 데이터. 현재 대시보드 ID·날짜·두수와 일치하지 않으므로 조회 함수의 형태를 참고하고 데이터를 현재 경주에 맞춘다. |
| 승식·계산 | `lib/betTypes.ts`, `selection.ts`, `combinations.ts`, `betMath.ts` | 7승식 메타, 선택 정규화·키, 개별/그룹 조합 생성, 조합별 금액·총액·잔액 검증. 화면 밖 순수 함수로 분리해 이관한다. |
| 구매 생성 | `services/betService.ts` | 조합 수 제한, 상태·금액 검증, 구매 ID·기록 생성. `getDemoTickets()`는 `data/mockBets.ts`에 의존한다. 목 기록 전체 복사보다 구매 생성·검증만 현재 저장 구조에 맞게 사용한다. |
| 원본 공유 상태 | `context/DemoContext.tsx`, `lib/storage.ts` | `addTicket()`·잔액·기록 복원/저장. 원본 초기 잔액은 **100,000P**, 키는 **`racelab-demo-v1`**, 형태는 `{ version: 1, points, tickets, initialized }`다. 그대로 이관하면 대시보드의 12,480P 및 기록과 충돌하므로 현재 저장 계약에 맞춘 어댑터로 대체한다. |
| 원본 정산 | `lib/settlement.ts`, `refund.ts` | `DemoContext`의 결과 정산·취소마 환급에 연결되어 있다. 이번 범위의 구매·잔액·기록에 필요한 상태 처리는 검토하되, 별도 정산 화면이나 원본 전체 문맥 이관의 근거로 삼지 않는다. |

외부 런타임 의존성은 원본의 `next`, `react`, `react-dom`, `lucide-react`다. 현재 `frontend`에는 앞의 세 패키지만 설치되어 있다. 원본 컴포넌트의 아이콘을 그대로 쓰면 `lucide-react` 추가가 필요하며, 아이콘을 기존 스타일로 대체하면 추가 패키지가 필요 없다. 원본의 Tailwind 클래스는 현재 `globals.css`의 TRACK:ON 토큰·스타일과 조정해야 한다.

## 4. 선별 범위와 구현 순서

1. 현재 대시보드 경주 ID를 기준으로 경주·출전마 조회 데이터와 타입을 만든다. 상태, 취소마, 기수, 배당을 경주별로 제공한다.
2. 승식 메타 → 선택 정규화 → 조합 생성 → 금액/상태 검증 → 구매 기록 생성 순으로 순수 로직을 옮긴다.
3. `/races/[id]/`에서 정보·출전마·7승식·개별/조합 구매·확인/완료 UI를 연결한다. 원본 상세 화면의 로컬 상태는 경주 변경 시 초기화하고 TRACK:ON 토큰으로 스타일을 맞춘다.
4. 구매 저장소를 `trackon-premium-demo-v1`에 연결하고 기존 `balance`·`records`·`tasks`를 보존한다. 대시보드 카드의 경주 ID 이동과 완료 후 기록 확인을 같은 대시보드로 연결한다.

이번 이관에서 제외: 원본 `app/races/page.tsx`의 경주 목록, `app/ranking/page.tsx`, `app/admin/page.tsx`, `app/my-bets/page.tsx`, `components/history/*`, 원본 `RouteShell`·사이드바·헤더·모바일 내비게이션, 원본 `DemoProvider`/`racelab-demo-v1` 저장소의 통째 복사. 기존 TRACK:ON 랜딩·로그인·대시보드·튜토리얼의 경로와 화면 구조는 기준선으로 유지한다.

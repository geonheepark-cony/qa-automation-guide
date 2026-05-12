# Spec 기반 E2E 테스트 자동 생성 (Sub-Agent Orchestrator)

Spec 문서의 `<!-- @e2e auto -->` 태그가 붙은 테스트 케이스를 파싱하여
Playwright E2E 테스트 파일을 자동 생성합니다.

---

## 아키텍처

```
Phase 1: Spec 파싱         → Sub-Agent (spec-parser)
Phase 2: Figma 셀렉터 검증  → Orchestrator (선택적, Figma URL 있을 때만)
Phase 3: 테스트 생성        → Sub-Agent (e2e-test-writer)
Phase 4: 검증 & 자동 수정   → Orchestrator (실행 → 분석 → 수정 루프, 최대 3회)
```

**실행 규칙:**
- 모든 Phase는 순차 실행 (각 Phase가 이전 결과에 의존)
- Sub-Agent는 Task tool로 실행합니다
- 각 Sub-Agent 결과에서 메타데이터 블록(`---PARSED---`, `---GENERATED---`)을 파싱하여 다음 Phase에 전달합니다

---

## 입력

`$ARGUMENTS` = Spec 파일 경로

```
/generate-e2e documents/specs/1p-pr/purchase-request-register/SPEC-sku-search-add.md
```

## 시작 전 검증

1. `$ARGUMENTS`가 비어있으면 사용자에게 Spec 파일 경로를 요청합니다
2. Read tool로 해당 파일이 존재하는지 확인합니다
3. 파일에 `<!-- @e2e auto -->`가 1개 이상 있는지 확인합니다. 없으면 중단합니다

---

## Phase 1: Spec 파싱 (Sub-Agent)

Task tool로 실행합니다. 프롬프트:

```
당신은 E2E Spec Parser입니다.

## 규칙
다음 파일을 읽고 규칙을 적용하세요:
- .claude/agents/spec-parser.md

## 입력
Spec 파일: {$ARGUMENTS}

## 작업
1. Spec 파일을 읽습니다
2. 메타데이터를 추출합니다 (도메인, 페이지 경로, Figma URL)
3. 테스트 데이터 섹션을 추출합니다
4. UI 요소 섹션을 추출합니다
5. `<!-- @e2e auto -->` 마커가 붙은 테스트 케이스만 추출합니다
6. 각 테스트 케이스에서 @tag 액션들을 순서대로 파싱합니다
7. `<!-- @e2e manual -->` 테스트는 건너뛰되 개수와 사유를 기록합니다

## 완료 후 반드시 아래 형식으로 출력:
---PARSED---
{JSON}
---END PARSED---
```

오케스트레이터는 `---PARSED---` 블록을 파싱하여 `parsedSpec`으로 저장합니다.

---

## Phase 2: Figma 셀렉터 검증 (Orchestrator — 선택적)

**`parsedSpec.specMeta.figmaUrls`가 비어 있으면 이 Phase를 건너뜁니다.**

Figma URL이 있으면 사용자에게 확인합니다:

```
Figma URL이 발견되었습니다:
- {url1}
- {url2}

Figma에서 셀렉터를 교차 검증할까요? (y/n)
```

사용자가 `y`를 선택하면:
1. Figma MCP tool(`use_figma`)을 사용하여 Figma 프레임을 읽습니다
2. Spec에 정의된 셀렉터(placeholder, button text 등)가 Figma 디자인의 UI 요소와 일치하는지 확인합니다
3. 불일치 항목이 있으면 사용자에게 보고하고 `parsedSpec`의 셀렉터를 수정할지 확인합니다

---

## Phase 3: 테스트 생성 (Sub-Agent)

Task tool로 실행합니다. 프롬프트:

```
당신은 Playwright E2E Test Writer입니다.

## 규칙
다음 파일을 읽고 규칙을 적용하세요:
- .claude/agents/e2e-test-writer.md

## 참조 파일 (패턴 참고용으로 반드시 읽으세요)
- playwright.config.ts
- e2e/auth.setup.ts
- 기존 e2e/*.spec.ts 파일 중 1개

## Parsed Spec
{JSON.stringify(parsedSpec)}

## 출력 파일명 규칙
Spec 경로에서 파생:
- 부모 디렉토리명 + SPEC- 제거한 파일명
- 예: purchase-request-register/SPEC-sku-search-add.md → e2e/purchase-request-register-sku-search-add.spec.ts

## 완료 후 반드시 아래 형식으로 출력:
---GENERATED---
file: {생성한 파일 경로}
testCount: {생성한 테스트 수}
skippedCount: {건너뛴 @e2e manual 테스트 수}
---END GENERATED---
```

---

## Phase 4: 검증 & 자동 수정 (Orchestrator — 최대 3회 루프)

Phase 3에서 생성된 테스트 파일을 실행하고, 실패가 있으면 분석 후 자동 수정합니다.

### 루프 시작

```
attempt = 1
MAX_ATTEMPTS = 3
```

### Step 4-1: 테스트 실행

Bash tool로 실행합니다:
```bash
npx playwright test {생성된 파일명} 2>&1 | tail -50
```

### Step 4-2: 결과 판단

- **전체 통과** → 루프 종료, 완료 메시지로 이동
- **실패 있음** → Step 4-3으로 진행
- **attempt > MAX_ATTEMPTS** → 루프 종료, 남은 실패를 사용자에게 보고

### Step 4-3: 실패 분석

실패한 테스트의 에러 메시지와 스크린샷(Read tool로 PNG 읽기)을 분석합니다.

**자동 수정 가능한 케이스:**

| 에러 패턴 | 원인 | 수정 방법 |
|-----------|------|-----------|
| `vite-plugin-checker-error-overlay intercepts pointer events` | Vite ESLint 오버레이가 UI를 가림 | `beforeEach`에 오버레이 제거 `page.evaluate` 추가 |
| `getByPlaceholder('X')` 타임아웃 + 스크린샷에 페이지 정상 렌더링 | 커스텀 컴포넌트(MultipleInput 등)로 인해 표준 locator 미작동 | 실제 DOM 구조를 탐색하여 `page.locator()` 셀렉터로 변경 |
| `getByRole('button', { name: 'X' }).click()` 타임아웃 + 드롭다운 열린 상태 | 드롭다운/모달이 버튼을 가림 | 드롭다운 닫기(적용/확인 버튼) 후 클릭하도록 순서 수정 |
| `toBeVisible` 타임아웃 + 스크린샷에 요소 미표시 | timeout 부족 또는 비동기 렌더링 | timeout 값 증가 또는 `waitForResponse` 추가 |
| `strict mode violation` — 셀렉터가 여러 요소 매칭 | 셀렉터가 너무 넓음 | `.first()`, `.nth(N)` 또는 더 구체적인 셀렉터로 변경 |

**자동 수정 불가능한 케이스 (사용자에게 질문):**

| 에러 패턴 | 사용자에게 질문할 내용 |
|-----------|----------------------|
| 로그인 페이지로 리다이렉트 | "테스트 계정 인증이 만료된 것 같습니다. `npm run test:e2e`로 재로그인이 필요한가요?" |
| API 응답 에러 (4xx, 5xx) | "테스트 데이터 SKU `{코드}`가 유효한지 확인해주세요." |
| 스크린샷에서 예상과 완전히 다른 UI | "실제 UI가 Spec과 다릅니다. Spec을 업데이트해야 하나요?" |
| 동일 에러가 2회 연속 수정 실패 | "이 에러를 자동으로 해결하지 못했습니다. 직접 확인해주시겠어요?" + 에러 상세 출력 |

### Step 4-4: 수정 적용

1. 생성된 테스트 파일을 Edit tool로 수정합니다
2. 필요시 실제 컴포넌트 소스를 Read tool로 읽어 DOM 구조를 파악합니다
3. `attempt += 1` 후 Step 4-1로 돌아갑니다

---

## Phase 5: 스크립트 품질 검증 (Orchestrator)

Phase 4에서 테스트가 전체 통과한 후, 생성된 스크립트가 Spec의 의도를 충분히 검증하는지 품질을 확인합니다.

### Step 5-1: Spec Then 절 커버리지 검증

`parsedSpec.testCases`의 각 TC에서 검증 태그(`@visible`, `@text`, `@disabled`, `@not-visible`)의 개수를 센다.
생성된 테스트 파일에서 각 TC 블록 내 `expect` 호출 개수를 센다.

**비교 규칙:**

| 조건 | 판정 | 처리 |
|------|------|------|
| expect 개수 ≥ 검증 태그 개수 | PASS | — |
| expect 개수 < 검증 태그 개수 | WARN | 누락된 검증을 사용자에게 보고 |
| expect 개수 = 0 (TC에 검증 태그가 있는데) | FAIL | 테스트가 아무것도 검증하지 않음 — 자동 수정 시도 |

### Step 5-2: 셀렉터 정확성 검증

각 TC의 `@visible`, `@text` 검증 태그에 명시된 셀렉터가 생성된 코드에 정확히 반영되었는지 대조합니다.

**검증 항목:**

| Spec 태그 | 생성 코드에서 확인할 것 |
|-----------|----------------------|
| `@visible [text="X"]` | `expect(page.getByText('X')).toBeVisible()` 존재 여부 |
| `@text [testid="X"] "Y"` | `expect(page.getByTestId('X')).toContainText('Y')` 존재 여부 |
| `@disabled [role=button, name="X"]` | `expect(page.getByRole('button', { name: 'X' })).toBeDisabled()` 존재 여부 |
| `@timeout N` | 해당 expect에 `{ timeout: N }` 옵션 존재 여부 |

**불일치 발견 시:**
- 누락된 검증은 자동으로 테스트 코드에 추가
- 셀렉터가 변형된 경우 (Phase 4에서 수정된 경우) 변형 사유와 함께 사용자에게 보고

### Step 5-3: 품질 리포트 출력

```
스크립트 품질 검증 결과:

TC별 커버리지:
  TC-XXX-001: Spec 검증 3개 / expect 3개 ✓
  TC-XXX-002: Spec 검증 4개 / expect 4개 ✓
  TC-XXX-003: Spec 검증 2개 / expect 1개 ⚠ (누락: @visible [text="실패"])

셀렉터 변형:
  TC-XXX-003: getByText('전체') → filterBar.locator('[class*="select"]')
    사유: strict mode violation — "전체" 텍스트가 여러 곳에 존재

총점: 6/7 TC 완전 커버 (1건 경고)
```

---

## 완료 메시지

### 전체 통과 시

```
E2E 테스트 생성 & 검증 완료!

생성된 파일: {file}
테스트 케이스: {testCount}개 생성, {skippedCount}개 건너뜀 (@e2e manual)
실행 검증: {passedCount}개 통과 (시도 {attempt}회)
품질 검증: {coveredCount}/{testCount} TC 완전 커버 ({warnCount}건 경고)

실행 방법:
  npx playwright test {filename}
```

### 일부 실패 시

```
E2E 테스트 생성 완료 (일부 실패)

생성된 파일: {file}
테스트 케이스: {testCount}개 생성, {skippedCount}개 건너뜀 (@e2e manual)
실행 검증: {passedCount}개 통과, {failedCount}개 실패 (최대 {MAX_ATTEMPTS}회 시도)
품질 검증: {coveredCount}/{testCount} TC 완전 커버 ({warnCount}건 경고)

실패한 테스트:
  - {TC-ID}: {에러 요약}

실행 방법:
  npx playwright test {filename}
```

# Spec E2E 태그 작성 가이드

스펙 문서에 E2E 태그를 작성하면 Playwright 테스트를 자동 생성할 수 있습니다.

---

## 1. 스펙 문서 구조

E2E 자동 생성을 지원하는 스펙 문서는 다음 섹션을 포함합니다:

```markdown
# SPEC-{도메인}-{기능명}

- **도메인**: {도메인명}
- **페이지**: {URL 경로}
- **피그마**: [프레임명](https://www.figma.com/design/...)

## UI 요소                    ← 셀렉터 정의
## 테스트 데이터               ← 실제 테스트용 데이터
## 테스트 시나리오             ← Given-When-Then + @태그
```

---

## 2. UI 요소 섹션

테스트에서 사용하는 UI 요소와 셀렉터를 정의합니다.

```markdown
## UI 요소

| 요소 | 셀렉터 | 초기 상태 |
|------|--------|-----------|
| 검색 버튼 | `[role=button, name="검색"]` | enabled |
| SKU 입력 필드 | `[placeholder="입력"]` | 빈 값 |
| 결과 모달 | `[text="SKU 추가 결과"]` | — |
| 실패 행 사유 | `[testid="result-row-{id}-reason"]` | — |
```

---

## 3. 셀렉터 문법

| 셀렉터 | Playwright 변환 | 사용 시점 |
|--------|----------------|-----------|
| `[placeholder="X"]` | `page.getByPlaceholder('X')` | 입력 필드 |
| `[role=button, name="X"]` | `page.getByRole('button', { name: 'X' })` | 버튼 (정확한 텍스트) |
| `[role=button, name=/X/]` | `page.getByRole('button', { name: /X/ })` | 버튼 (부분 매칭) |
| `[text="X"]` | `page.getByText('X')` | 텍스트 요소 |
| `[text=/X/]` | `page.getByText(/X/)` | 텍스트 (정규식) |
| `[testid="X"]` | `page.getByTestId('X')` | data-testid 속성 |

### 셀렉터 선택 우선순위

1. `[role=button, name="X"]` — 가장 안정적 (접근성 기반)
2. `[testid="X"]` — DOM 변경에 강함
3. `[placeholder="X"]` — 입력 필드 전용
4. `[text="X"]` — 마지막 수단 (다른 요소와 충돌 가능)

### 주의사항

- `[text="X"]`는 페이지에 같은 텍스트가 여러 곳에 있으면 `strict mode violation` 발생
- 이 경우 `[text="X"]` 대신 `[role=button, name="X"]`이나 `[testid="X"]`를 사용

---

## 4. 테스트 데이터 섹션

E2E 테스트에서 사용하는 실제 데이터를 정의합니다.

```markdown
## 테스트 데이터

| ID | 값 | 상태 | 기대 결과 |
|----|-----|------|-----------|
| `VALID` | S2605110010102 | 정상 매입 | 테이블에 추가 성공 |
| `SUSPENDED` | S2506270000029 | 운영중지 | 실패 모달 표시 |
```

- **ID**: 코드에서 상수로 사용할 이름
- **값**: 실제 테스트에 사용하는 데이터
- **상태/기대 결과**: 이 데이터로 어떤 결과가 나와야 하는지

---

## 5. 테스트 시나리오 작성

### 5.1 마커

각 TC 위에 마커를 달아 자동 생성 대상인지 표시합니다:

```markdown
### TC-SKU-001: SKU 단일 추가 성공
<!-- @e2e auto -->
```

| 마커 | 의미 |
|------|------|
| `<!-- @e2e auto -->` | Playwright 스크립트 자동 생성 대상 |
| `<!-- @e2e manual -->` | 수동 QA 대상 (아래에 사유 필수) |

수동 QA 대상에는 사유를 함께 적습니다:

```markdown
### TC-SKU-008: 선택 제거
<!-- @e2e manual -->
<!-- 사유: AG Grid 체크박스 조작이 E2E로 불안정 -->
```

### 5.2 Given-When-Then + @태그

사람이 읽을 수 있는 Given-When-Then 본문 아래에 기계가 파싱할 @태그를 들여쓰기로 작성합니다:

```markdown
### TC-SKU-001: SKU 단일 추가 성공
<!-- @e2e auto -->

- **Given**: 등록 페이지에서 유효한 SKU를 입력한 상태
  - @navigate `/inbound/purchase-request/register`
  - @fill [placeholder="입력"] "S2605110010102"
  - @press Enter
- **When**: SKU 추가 버튼을 클릭한다
  - @click [role=button, name=/SKU 추가/]
- **Then**: 성공 토스트가 표시된다
  - @visible [text="SKU추가 성공"] @timeout 10000
```

---

## 6. 액션 태그 목록

### 페이지 이동

```markdown
@navigate `/경로`
```

Playwright: `await page.goto('/경로')`

### 입력

```markdown
@fill [placeholder="입력"] "값"
```

Playwright: `await page.getByPlaceholder('입력').fill('값')`

### 키보드

```markdown
@press Enter
```

Playwright: `await locator.press('Enter')` (직전 `@fill`의 locator 재사용)

### 클릭

```markdown
@click [role=button, name="검색"]
```

Playwright: `await page.getByRole('button', { name: '검색' }).click()`

### 요소 표시 확인

```markdown
@visible [text="성공"] @timeout 10000
```

Playwright: `await expect(page.getByText('성공')).toBeVisible({ timeout: 10000 })`

### 텍스트 내용 확인

```markdown
@text [testid="result-reason"] "매입 SKU가 아닙니다."
```

Playwright: `await expect(page.getByTestId('result-reason')).toContainText('매입 SKU가 아닙니다.')`

### 비활성화 확인

```markdown
@disabled [role=button, name="등록"]
```

Playwright: `await expect(page.getByRole('button', { name: '등록' })).toBeDisabled()`

### URL 확인

```markdown
@url /inbound/purchase-request/register
```

Playwright: `await expect(page).toHaveURL(/\/inbound\/purchase-request\/register/)`

### 타임아웃 (수식어)

```markdown
@visible [text="결과"] @timeout 10000
```

- 독립 태그가 아니라 `@visible`, `@text` 뒤에 붙는 수식어
- API 응답 대기가 필요한 검증에 사용
- 기본값은 5000ms, API 호출 포함 시 10000ms 권장

---

## 7. 실전 예시

### 목록 페이지 — 필터 검색

```markdown
### TC-BPR-004: 발주요청번호로 검색한다
<!-- @e2e auto -->

- **Given**: 목록 페이지에 진입한 상태
  - @navigate `/inbound/purchase-request`
  - @visible [text="매입 상품 발주 목록 (뷰티)"] @timeout 10000
- **When**: 발주요청번호 필터에 값을 입력하고 검색한다
  - @click [text="발주요청번호"]
  - @fill [placeholder="입력"] "PR2604290000038"
  - @click [role=button, name="적용"]
  - @click [role=button, name="검색"]
- **Then**: 검색 결과에 해당 번호가 표시된다
  - @visible [text="PR2604290000038"] @timeout 10000
```

### 등록 페이지 — 버튼 비활성화

```markdown
### TC-REG-002: SKU 추가 전 등록 버튼이 비활성화 상태이다
<!-- @e2e auto -->

- **Given**: 등록 페이지가 렌더링된 상태
  - @navigate `/inbound/purchase-request/register`
  - @visible [text="발주 요청 시 주의사항"] @timeout 10000
- **When**: 아무 입력도 하지 않는다
- **Then**: 등록 버튼이 비활성화 상태이다
  - @disabled [role=button, name="등록"]
```

### 수동 QA 대상

```markdown
### TC-SKU-009: 최대 SKU 개수 도달
<!-- @e2e manual -->
<!-- 사유: 1,000개 SKU 입력은 E2E로 비현실적 -->

- **Given**: 테이블에 상품이 1,000개 추가된 상태
- **When**: SKU 추가 영역을 확인한다
- **Then**: 입력 필드와 추가 버튼이 disabled 상태이다
- **And**: "이미 최대 개수로 추가되어 있습니다." 텍스트가 표시된다
```

---

## 8. @e2e manual 사유 기준

다음 경우에 `@e2e manual`을 사용합니다:

| 사유 | 예시 |
|------|------|
| AG Grid 셀 내부 조작 | 셀 편집, 체크박스 선택 |
| 대량 데이터 입력 | 1,000개 SKU |
| 클립보드 검증 | 복사 버튼 |
| 파일 다운로드 검증 | 엑셀 다운로드 |
| 실 데이터 변경 | 발주 등록, 승인/반려 API 호출 |
| 서버 에러 재현 | 500 에러, 네트워크 오류 |
| 미구현 기능 | `preventDefault()`로 차단된 링크 |

---

## 9. 시나리오 통합 규칙

스펙 디렉토리 구조에 따라 테스트 시나리오가 통합됩니다:

| 입력 | 규칙 | 출력 |
|------|------|------|
| 루트 스펙 파일 (`1p-pr/SPEC-*.md`) | 단독 시나리오 1개 | `test-scenarios/purchase-request-list.md` |
| 하위 디렉토리 (`1p-pr/feature-name/`) | **디렉토리 내 모든 스펙 → 1개 통합 시나리오** | `test-scenarios/purchase-request-register.md` |

### 예시

```
documents/specs/1p-pr/
├── SPEC-SCM-PR-purchase-request-list.md          → 단독 시나리오
├── purchase-request-register/                     → 통합 시나리오
│   ├── SPEC-sku-search-add.md                       ├─ 섹션 1: SKU 검색 추가
│   └── SPEC-product-list-table.md                   └─ 섹션 2: 상품 목록 테이블
```

### 통합 시 TC 배치 순서

1. 페이지 진입 / 렌더링 확인
2. 입력 / 조작 (정상 케이스)
3. 결과 확인
4. 에러 / 예외 케이스
5. 수동 QA 대상 (`@e2e manual`)

### 스펙 파일에서 통합을 고려할 때

- **같은 디렉토리**에 있는 스펙은 하나의 사용자 플로우로 묶입니다
- TC ID 접두사를 스펙별로 다르게 유지하세요 (예: `TC-SKU-001`, `TC-PLT-001`)
- 테스트 데이터가 스펙 간에 공유되면 각 스펙에 동일하게 정의하세요

---

## 10. 자동 생성 실행

### QA 테스트 시나리오 문서 생성

```bash
# 단일 스펙
/generate-test-scenario documents/specs/1p-pr/SPEC-SCM-PR-purchase-request-list.md

# 디렉토리 (통합 시나리오)
/generate-test-scenario documents/specs/1p-pr/purchase-request-register/
```

### E2E 스크립트 생성

```bash
/generate-e2e documents/specs/1p-pr/purchase-request-register/SPEC-sku-search-add.md
```

### CI (GitHub Actions)

스펙 파일이 `main` 또는 `project/*` 브랜치에 머지되면:
- **QA 시나리오 문서** 자동 생성 + 커밋 (`test-scenario-generate.yml`)
- **E2E 스크립트** 자동 생성 + 커밋 (`e2e-generate.yml`)

PR에서 코드 변경 시:
- **E2E 테스트 실행** + PR 코멘트 + Slack 알림 (`e2e-run-report.yml`)

### 생성된 파일 테스트

```bash
npm run test:e2e
```

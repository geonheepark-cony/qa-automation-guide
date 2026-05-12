# Spec 기반 테스트 시나리오 문서 자동 생성

Spec 문서의 `@e2e auto` / `@e2e manual` 태그가 붙은 테스트 케이스를 파싱하여
QA 팀이 바로 사용할 수 있는 테스트 시나리오 문서를 자동 생성합니다.

---

## 입력

`$ARGUMENTS` = Spec 파일 경로 또는 **디렉토리 경로**

```bash
# 단일 스펙 파일
/generate-test-scenario documents/specs/1p-pr/SPEC-SCM-PR-purchase-request-list.md

# 디렉토리 (하위 스펙 통합)
/generate-test-scenario documents/specs/1p-pr/purchase-request-register/
```

## 출력

`documents/test-scenarios/{기능명}.md` — QA 실행 가능한 테스트 시나리오 문서

---

## 통합 규칙

스펙 디렉토리 구조에 따라 시나리오를 통합합니다:

```
documents/specs/1p-pr/
├── SPEC-SCM-PR-purchase-request-list.md          → 단독 시나리오 1개
├── purchase-request-register/                     → 하위 스펙 통합
│   ├── SPEC-sku-search-add.md                       ├─ 합쳐서 1개 시나리오
│   └── SPEC-product-list-table.md                   │
├── purchase-request-detail/                       → 하위 스펙 통합
│   └── SPEC.md                                      ├─ 합쳐서 1개 시나리오
```

| 입력 | 규칙 | 출력 파일 |
|------|------|-----------|
| 루트 스펙 파일 (`1p-pr/SPEC-*.md`) | 단독 시나리오 1개 | `test-scenarios/purchase-request-list.md` |
| 하위 디렉토리 (`1p-pr/feature-name/`) | 디렉토리 내 모든 스펙을 **1개 통합 시나리오**로 생성 | `test-scenarios/purchase-request-register.md` |
| 하위 디렉토리 내 단일 파일 | 해당 디렉토리의 통합 시나리오에 포함 | (디렉토리 시나리오에 합산) |

### 통합 시나리오 생성 규칙

1. **디렉토리 내 모든 `SPEC*.md` 파일**을 수집
2. 각 스펙의 TC를 **사용자 플로우 순서**로 배치:
   - 페이지 진입/렌더링 → 입력/조작 → 결과 확인 → 에러 케이스
3. 스펙 간 구분은 **섹션 헤더**로 표시:
   ```markdown
   ## 1. SKU 검색 추가 (SPEC-sku-search-add)
   ### TC-SKU-001: ...
   ### TC-SKU-002: ...

   ## 2. 상품 목록 테이블 (SPEC-product-list-table)
   ### TC-PLT-001: ...
   ```
4. **테스트 데이터는 합산** — 모든 스펙의 테스트 데이터를 하나의 테이블로 통합
5. **중복 TC 제거** — 동일한 Given 조건이 여러 스펙에 있으면 한 번만 표시

---

## 실행 흐름

### Step 0: 입력 판별

- 입력이 **파일**이면 → 단일 스펙 파싱 (Step 1로)
- 입력이 **디렉토리**면 → 디렉토리 내 모든 `SPEC*.md` 수집 후 각각 파싱 → 통합 시나리오 생성

### Step 1: Spec 파싱

각 Spec 파일을 읽고 다음을 추출합니다:
- 메타데이터 (도메인, 페이지 경로, Jira 티켓)
- 테스트 데이터 섹션
- `<!-- @e2e auto -->` 테스트 케이스 → "자동화 대상" 표시
- `<!-- @e2e manual -->` 테스트 케이스 → "수동 QA" 표시
- 태그 없는 TC → 모두 포함

### Step 2: 시나리오 문서 생성

각 TC를 QA 팀이 실행할 수 있는 형태로 변환합니다:

**@태그 → 사람이 읽을 수 있는 절차로 변환:**

| @태그 | 시나리오 절차 |
|-------|-------------|
| `@navigate /path` | `페이지 접속: {baseURL}/path` |
| `@fill [placeholder="X"] "Y"` | `"X" 입력 필드에 "Y" 입력` |
| `@press Enter` | `Enter 키 입력` |
| `@click [role=button, name="X"]` | `"X" 버튼 클릭` |
| `@click [text="X"]` | `"X" 텍스트 클릭` |
| `@visible [text="X"]` | `✅ "X" 텍스트가 화면에 표시되는지 확인` |
| `@text [testid="X"] "Y"` | `✅ 해당 영역에 "Y" 텍스트가 포함되는지 확인` |
| `@disabled [role=button, name="X"]` | `✅ "X" 버튼이 비활성화(회색) 상태인지 확인` |
| `@url /path` | `✅ URL이 /path 로 변경되었는지 확인` |

### Step 3: 문서 작성

다음 형식으로 마크다운 파일을 생성합니다:

```markdown
# 테스트 시나리오: {기능명}

| 항목 | 값 |
|------|-----|
| 도메인 | {도메인} |
| 페이지 | {URL} |
| Jira | {티켓} |
| 작성일 | {오늘 날짜} |
| 자동 생성 | Spec 기반 (`/generate-test-scenario`) |

## 테스트 환경

- URL: https://scmhub.dev.one.musinsa.com
- 계정: (QA 테스트 계정)
- 브라우저: Chrome 최신

## 테스트 데이터

| 데이터 | 값 | 용도 |
|--------|-----|------|
| ... | ... | ... |

---

## TC-001: {제목} 🤖
> 자동화 대상 (`@e2e auto`)

**사전 조건**
- {Given 절 본문}

**절차**
1. {When 절의 @태그 → 사람이 읽을 수 있는 절차}
2. ...

**기대 결과**
- [ ] {Then 절의 @태그 → 체크리스트}
- [ ] ...

---

## TC-002: {제목} 👋
> 수동 QA (`@e2e manual`) — 사유: {사유}

...
```

### Step 4: 파일 저장

`documents/test-scenarios/{기능명}.md`에 저장합니다.

**파일명 규칙:**

| 입력 | 출력 파일명 |
|------|------------|
| `1p-pr/SPEC-SCM-PR-purchase-request-list.md` | `test-scenarios/purchase-request-list.md` |
| `1p-pr/purchase-request-register/` (디렉토리) | `test-scenarios/purchase-request-register.md` |
| `1p-pr/purchase-request-detail/` (디렉토리) | `test-scenarios/purchase-request-detail.md` |

---

## 완료 메시지

### 단일 스펙

```
테스트 시나리오 문서 생성 완료!

생성된 파일: documents/test-scenarios/{파일명}.md
테스트 케이스: {총 TC수}개 (자동화 대상 {auto}개 / 수동 QA {manual}개)
```

### 통합 시나리오 (디렉토리)

```
테스트 시나리오 문서 생성 완료! (통합)

소스 스펙: {N}개 파일
  - SPEC-sku-search-add.md ({n1}개 TC)
  - SPEC-product-list-table.md ({n2}개 TC)

생성된 파일: documents/test-scenarios/{디렉토리명}.md
테스트 케이스: 총 {총 TC수}개 (자동화 대상 {auto}개 / 수동 QA {manual}개)
```

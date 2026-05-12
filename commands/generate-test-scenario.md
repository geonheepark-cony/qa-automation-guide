# Spec 기반 테스트 시나리오 문서 자동 생성

Spec 문서의 `@e2e auto` / `@e2e manual` 태그가 붙은 테스트 케이스를 파싱하여
QA 팀이 바로 사용할 수 있는 테스트 시나리오 문서를 자동 생성합니다.

---

## 입력

`$ARGUMENTS` = Spec 파일 경로

```
/generate-test-scenario documents/specs/1p-pr/purchase-request-register/SPEC-sku-search-add.md
```

## 출력

`documents/test-scenarios/{도메인}-{기능명}.md` — QA 실행 가능한 테스트 시나리오 문서

---

## 실행 흐름

### Step 1: Spec 파싱

Spec 파일을 읽고 다음을 추출합니다:
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

`documents/test-scenarios/{도메인}-{기능명}.md`에 저장합니다.

파일명 규칙:
- `SPEC-sku-search-add.md` → `test-scenarios/purchase-request-register-sku-search-add.md`
- 부모 디렉토리명 + SPEC- 제거한 파일명

---

## 완료 메시지

```
테스트 시나리오 문서 생성 완료!

생성된 파일: documents/test-scenarios/{파일명}.md
테스트 케이스: {총 TC수}개 (자동화 대상 {auto}개 / 수동 QA {manual}개)
```

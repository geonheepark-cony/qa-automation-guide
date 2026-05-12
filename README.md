# QA Automation Guide

Spec 문서에 태그를 작성하면 Playwright E2E 테스트를 자동 생성하는 Claude Code 플러그인입니다.

## 구조

```
qa-automation-guide/
├── guides/
│   └── spec-e2e-tag-guide.md    # 태그 작성 표준 가이드
├── commands/
│   └── generate-e2e.md          # /generate-e2e 오케스트레이터 커맨드
├── agents/
│   ├── spec-parser.md           # Spec 파싱 서브에이전트
│   └── e2e-test-writer.md       # Playwright 코드 생성 서브에이전트
├── workflows/
│   └── e2e-generate.yml         # GitHub Actions CI 워크플로
└── examples/
    └── base.ts                  # Playwright 커스텀 fixture 예시
```

## 설치

프로젝트의 `.claude/` 디렉토리에 파일을 복사합니다:

```bash
# 커맨드 복사
cp commands/generate-e2e.md .claude/commands/

# 에이전트 복사
cp agents/spec-parser.md .claude/agents/
cp agents/e2e-test-writer.md .claude/agents/

# (선택) CI 워크플로 복사
cp workflows/e2e-generate.yml .github/workflows/
```

## 사용법

### 1. 스펙 문서에 태그 작성

[태그 작성 가이드](guides/spec-e2e-tag-guide.md) 참고

```markdown
### TC-001: 로그인 성공
<!-- @e2e auto -->

- **Given**: 로그인 페이지에 진입한 상태
  - @navigate `/login`
- **When**: 아이디와 비밀번호를 입력하고 로그인 버튼을 클릭한다
  - @fill [placeholder="아이디"] "test@example.com"
  - @fill [placeholder="비밀번호"] "password123"
  - @click [role=button, name="로그인"]
- **Then**: 홈 페이지로 이동한다
  - @url /
```

### 2. E2E 테스트 자동 생성

```bash
/generate-e2e path/to/SPEC.md
```

### 3. 테스트 실행

```bash
npm run test:e2e
```

## 파이프라인

```
스펙 문서 작성 (@e2e auto 태그)
    ↓
/generate-e2e 또는 CI 자동 트리거
    ↓
Phase 1: Spec 파싱 (spec-parser 에이전트)
Phase 2: Figma 셀렉터 검증 (선택적)
Phase 3: Playwright 코드 생성 (e2e-test-writer 에이전트)
Phase 4: 실행 & 자동 수정 (최대 3회)
Phase 5: 품질 검증 (Spec Then절 커버리지)
    ↓
e2e/*.spec.ts 생성 완료
```

## 태그 요약

| 태그 | 용도 | 예시 |
|------|------|------|
| `@navigate` | 페이지 이동 | `@navigate /login` |
| `@fill` | 입력 | `@fill [placeholder="이름"] "홍길동"` |
| `@click` | 클릭 | `@click [role=button, name="확인"]` |
| `@press` | 키보드 | `@press Enter` |
| `@visible` | 표시 확인 | `@visible [text="성공"]` |
| `@text` | 텍스트 확인 | `@text [testid="result"] "완료"` |
| `@disabled` | 비활성화 확인 | `@disabled [role=button, name="제출"]` |
| `@url` | URL 확인 | `@url /dashboard` |
| `@timeout` | 대기 시간 | `@visible [text="로딩"] @timeout 10000` |

## 라이선스

MIT

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language
- 모든 응답은 한국어로 작성
- 코드 주석은 한국어 사용
- Commit messages in Korean, using conventional commit format (feat:, fix:, refactor:, docs:, chore:)

## 플러그인 활용
- Playwright, Frontend Design plugin 적극 활용으로 검토 및 디자인 최적화 추구

## Gstack 스킬 & 워크플로우 (필수 참조)
gstack (https://github.com/garrytan/gstack) 스킬을 적극 활용할 것. 아래 스킬들을 개발 단계별로 **자동으로** 사용해야 한다.

### 개발 전 (기획/설계)
- `/office-hours` — 아이디어 브레인스토밍, 설계 문서 작성
- `/design-consultation` — 디자인 시스템 수립, DESIGN.md 생성
- `/plan-ceo-review` — 스코프/전략 리뷰
- `/plan-eng-review` — 아키텍처/데이터 흐름 리뷰
- `/plan-design-review` — UI/UX 설계 리뷰

### 개발 중
- `/browse` or `/gstack` — 헤드리스 브라우저로 실시간 화면 확인
- `/investigate` — 버그 디버깅 (root cause 먼저)
- `/freeze` / `/unfreeze` — 수정 범위 제한
- `/careful` or `/guard` — 파괴적 명령 보호

### 개발 후 (검증/배포)
- `/review` — PR 전 코드 리뷰
- `/qa` — 자동 QA 테스트 + 버그 수정
- `/design-review` — 시각적 디자인 감사 + 수정
- `/cso` — 보안 감사 (OWASP, API 키 노출 등)
- `/ship` — PR 생성 + CHANGELOG 업데이트
- `/land-and-deploy` — 머지 + 배포 + 카나리 확인
- `/canary` — 배포 후 모니터링
- `/document-release` — 배포 후 문서 동기화
- `/retro` — 주간 회고

### Phase 완료 시 자동 실행 규칙
각 Phase 완료 시 아래 순서로 자동 실행:
1. `npm run dev` 실행 → `/browse` 로 화면 확인
2. `/review` 코드 리뷰
3. `/qa` 버그 탐지/수정
4. `/design-review` 시각 품질 검수
5. 문제 없으면 다음 Phase 진행

## 커스텀 에이전트 (.claude/agents/)
프로젝트 전용 에이전트가 `.claude/agents/`에 정의되어 있다. 필요 시 자동 활용할 것.

| 에이전트 | 파일 | 용도 |
|---------|------|------|
| QA 테스터 | `qa-tester.md` | Playwright로 각 탭 순회, 버그 탐지/수정, 반응형 테스트 |
| 디자인 리뷰어 | `design-reviewer.md` | 시각적 디자인 품질 감사, 원전 제어실 테마 준수 확인 |
| 코드 리뷰어 | `code-reviewer.md` | 보안/타입/성능/컨벤션 코드 리뷰 (읽기 전용) |
| TwelveLabs 연동 | `twelvelabs-integrator.md` | MCP로 인덱스 생성, 영상 검색/분석/임베딩 |
| 보안 감사관 | `security-auditor.md` | API 키 노출, OWASP, npm audit, 영상 보안 |

# 프로젝트 구현 목표 
1. 시뮬레이터 평가 고도화
기존 TraveLabes 영상분석 Task 1과 직접 연계됩니다. TwelveLabs의 강점은 자연어 기반 영상 검색인데, "운전원이 ECCS 기동 버튼을 누르는 장면"처럼 구체적 행동을 텍스트로 검색해서 해당 타임스탬프를 자동 추출할 수 있습니다. 추출된 Video Embeddings를 Bayesian 융합 레이어에 피딩하면, 기존 음성·아이트래킹·로그 신호에 더해 영상 의미론적 정보까지 통합되어 8개 핵심역량 정량화 정확도가 올라갑니다.

2. 리더십코칭센터 역량진단
6명 토론 영상에서 개별 발표자 발언 구간을 분리하고, 각 발표자의 의사소통·논리력·경청 등을 자동 스코어링하는 것이 핵심입니다. Video Search로 "반박 발언" "동의 표현" 같은 패턴을 검색하고, Summary로 개인별 피드백 리포트를 자동 생성합니다. Embeddings를 활용하면 동일 인물의 과거-현재 토론 영상 간 역량 성장 추이까지 추적할 수 있습니다.

3. 훈련영상 POV 분석
1인칭 시점(POV) 영상은 운전원이 실제로 보고 조작하는 것을 그대로 담기 때문에, SOP 대비 절차 이탈·오조작을 탐지하기에 최적입니다. 숙련자 POV와 비숙련자 POV를 Embeddings로 유사도 비교하면 정량적 격차 분석이 가능하고, 숙련자 영상의 핵심 조작 장면을 Highlights로 자동 추출해서 교육 교재로 만들 수 있습니다.


# ============================================================
# KHNP Video AI Platform — Claude Code 마스터 프롬프트
# ============================================================
# 
# 사용법: Claude Code 터미널에서 아래 내용을 붙여넣으세요.
# 또는 claude -p "$(cat PROMPT.md)" 로 실행하세요.
#
# 사전 조건:
#   1. setup.sh 실행 완료 (gstack + 의존성 설치)
#   2. TWELVELABS_API_KEY 환경변수 설정됨
#   3. twelvelabs-mcp 서버 연결됨
# ============================================================



## 핵심 요구사항

### 1. 전체 구조
- Next.js 14 App Router + TypeScript + Tailwind CSS
- shadcn/ui 컴포넌트 기반
- 한 페이지(SPA)에서 3개 서비스를 탭으로 전환
- 랜딩 대시보드: 3개 서비스 카드 + 전체 현황 요약

### 2. 서비스별 구현

**[Tab 1] N-HPAI 시뮬레이터 평가**
- 영상 업로드 (드래그앤드롭 + 파일선택, 프로그레스바)
- TwelveLabs index: `khnp-nhpai-simulator`
- 자연어 검색바: "비상냉각 조작", "제어봉 삽입" 등으로 영상 구간 검색
- 검색 결과: 타임스탬프 목록 + 비디오 플레이어 연동
- 챕터링: 훈련 세션 자동 목차 생성
- 평가 리포트: 8대 역량 레이더 차트 (의사소통, 상황인식, 신중한운전, 팀워크, 의사결정, 리더십, 절차준수, 비상대응)

**[Tab 2] 리더십코칭 역량진단**
- 6인 토론 영상 업로드
- TwelveLabs index: `khnp-leadership-coaching`
- 발표자별 발언 구간 자동 분리 (Video Search 활용)
- 역량 자동 스코어링: 의사소통(30%), 논리력(25%), 경청(20%), 리더십(15%), 협업(10%)
- 개인별 피드백 리포트 카드
- 역량 성장 추이 라인 차트 (과거 세션 비교)

**[Tab 3] 훈련영상 POV 분석**
- POV 시점 영상 업로드
- TwelveLabs index: `khnp-pov-training`
- SOP 절차 대비 이탈/오조작 자동 탐지
- 숙련자 vs 비숙련자 영상 유사도 비교 (Embeddings)
- 베스트 프랙티스 하이라이트 자동 추출
- 비교 뷰: 두 영상 나란히 + 동기화 재생

### 3. TwelveLabs API 연동
- 서버 사이드 API 라우트: `/api/twelvelabs/index`, `/api/twelvelabs/search`, `/api/twelvelabs/analyze`, `/api/twelvelabs/embed`
- MCP 도구 확인 먼저: `mcp__twelvelabs-mcp__list_indexes`로 기존 인덱스 확인
- API Key는 반드시 서버 사이드에서만 사용
- 에러 핸들링: API 실패 시 사용자 친화적 토스트 알림

### 4. 디자인 방향
- 원전 제어실(control room) 느낌의 다크 테마 기본
- Pretendard 한국어 폰트 + JetBrains Mono 데이터/코드
- 서비스별 컬러 코딩: 시뮬레이터(Coral), 리더십(Teal), POV(Amber)
- 데이터 시각화: Recharts 기반 레이더/라인/바 차트
- 반응형: 데스크톱 1440px 기준, 모바일 대응

### 5. 개발 순서
Phase 1: 프로젝트 구조 + 레이아웃 + 네비게이션 + 대시보드
Phase 2: TwelveLabs API 연동 레이어 (client, hooks, API routes)
Phase 3: 서비스 1 — N-HPAI 시뮬레이터 평가
Phase 4: 서비스 2 — 리더십코칭 역량진단
Phase 5: 서비스 3 — POV 분석
Phase 6: 통합 테스트 + 보안 검증 + 배포 준비

Phase 1부터 시작해줘. 각 Phase 완료 시 /review로 코드 리뷰하고 다음으로 넘어가자.



## 보조 프롬프트들 (필요할 때 사용)

### TwelveLabs 인덱스 초기 생성
```
TwelveLabs MCP로 3개 인덱스를 생성해줘:
1. khnp-nhpai-simulator (visual, audio 옵션)
2. khnp-leadership-coaching (visual, audio 옵션)  
3. khnp-pov-training (visual, audio 옵션)
먼저 list_indexes로 기존 인덱스 확인하고, 없는 것만 생성해.
```

### 영상 검색 테스트
```
khnp-nhpai-simulator 인덱스에서 "운전원이 버튼을 누르는 장면"을 검색해봐.
결과에서 타임스탬프와 신뢰도를 표로 정리해줘.
```

### 영상 분석 테스트
```
업로드된 영상에 대해 TwelveLabs analyze를 실행해줘.
- 제목, 토픽, 해시태그 자동 생성
- 챕터 분할 (chapters)
- 전체 요약 (summary)
- 핵심 하이라이트 (highlights)
결과를 구조화된 JSON으로 보여줘.
```

### 역량 평가 분석
```
리더십 토론 영상을 분석해서:
1. 발표자 6명의 발언 구간을 분리하고
2. 각 발표자의 의사소통, 논리력, 경청, 리더십, 협업 역량을 1-10 스코어로 평가하고
3. 개인별 피드백 리포트를 생성해줘
TwelveLabs search와 analyze를 조합해서 처리해.
```

### 보안 리뷰
```
/cso 실행해서 보안 감사 진행해줘. 특히:
- TWELVELABS_API_KEY 노출 여부
- 영상 데이터 전송 경로 보안
- 클라이언트-서버 간 API 호출 보안
- 사용자 인증/인가 체계
```
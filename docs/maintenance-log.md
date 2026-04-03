# Maintenance Log

## 2026-04-04 QA 사이클 3 — 실제 운영 고도화

### 1. standards/ 문서 대조 검증

| 파일 | 수정 내용 |
|------|----------|
| `src/lib/constants.ts` | 신뢰형성 1직급 "신뢰 문화 구축" 행동지표가 PDF 원문 대비 축약되어 있었음. "나아가 외부 이해관계자와도 원활한 업무 수행이 가능하도록 장기적 관점에서 신뢰관계를 구축한다."로 원문 복원 |

대조 결과: 8대 역량 정의, 직급별 하위요소 명칭, 행동지표 모두 PDF 원문과 일치 확인 (위 1건 외 불일치 없음).

### 2. 멀티모달 추출 프롬프트 품질 개선

| 파일 | 수정 내용 |
|------|----------|
| `src/app/api/twelvelabs/multimodal-extract/route.ts` | 5채널(gaze/voice/fluency/posture/face) 프롬프트 전면 개선 |

개선 사항:
- `[중요 규칙]` 블록 추가: "반드시 순수 JSON만 출력" 지시를 최상단에 강조 배치
- "null이나 N/A는 사용하지 마세요" 명시 — 관찰 어려운 지표는 합리적 추정값 반환 유도
- 각 채널별 구체적 출력 예시(예: `{"gaze":{"audience_facing_ratio":0.62,...}}`) 포함
- 마크다운/코드블록 금지 지시 추가로 JSON 파싱 실패율 감소 기대

### 3. Solar Pro 2 보고서 품질 개선

| 파일 | 수정 내용 |
|------|----------|
| `src/app/api/solar/report/route.ts` | 시스템 프롬프트 + 사용자 프롬프트 + 로컬 폴백 전면 개선 |

시스템 프롬프트 개선:
- 보고서 구성을 `###` 헤딩 + 마크다운 표 형식으로 구체화
- 각 항목마다 "행동 수치 근거 → 판정 → 개선 방향" 순서 명시
- 격식체 예시(`~입니다, ~하였습니다`) 톤 가이드 추가
- 분량 가이드(400~600자) 추가

사용자 프롬프트 개선:
- "시스템 프롬프트의 보고서 구성을 반드시 따르세요" 재확인 지시
- 작성 요구사항 4개 항목 구체적 명시

로컬 폴백 개선:
- 항목별 등급 판정(상위/중상/중하/미흡) 자동 산출 및 표시
- 마크다운 표로 하위지표 정리
- 채널별 맞춤형 개선 권고 메시지 (gaze/voice/fluency/posture/face)
- N/A 항목 사유 섹션 추가 (관찰 불가 이유 자동 기술)
- 강점 항목에 점수 명시 (예: "시선 행동(7.2점)")

### 4. 전사 데이터 한국어 종결 패턴 개선

| 파일 | 수정 내용 |
|------|----------|
| `src/components/leadership/TranscriptTimeline.tsx` | `sentenceEndRegex` 한국어 종결어미 패턴 대폭 확장 |

추가된 종결어미: `니다`, `세요`, `네요`, `거든요`, `잖아요`, `던데요`, `대요`, `래요`, `겠습니다`
기존 종결 패턴(`다.`, `요.`, `까.`)에 더해 마침표 없이도 문장 종결을 인식하도록 개선.

### 5. Vercel 배포 상태 확인

| 항목 | 결과 |
|------|------|
| 최근 배포 | 14분 전, `● Ready`, Production, 42s |
| 이전 배포 | 모두 `● Ready` 상태 |

### 빌드 결과

- `npx tsc --noEmit`: 오류 0개
- `npx next build`: 성공, 경고 0개

---

## 2026-04-03 QA 점검 및 코드 품질 개선

### 1. 다크 테마 잔여 색상 -> 라이트 테마 전환

| 파일 | 수정 내용 |
|------|----------|
| `src/lib/leadership-rubric-data.ts` | LEVEL_COLORS: `text-teal-300` -> `text-teal-600`, `text-sky-300` -> `text-sky-600`, `text-amber-300` -> `text-amber-600`, `text-red-300` -> `text-red-500`, bgColor도 `/10` -> `50` 라이트 계열로 변경 |
| `src/lib/leadership-rubric-data.ts` | MULTIMODAL_RUBRIC totalInterpretation: `text-teal-400` -> `text-teal-600`, `text-sky-400` -> `text-sky-600`, `text-amber-400` -> `text-amber-600`, `text-red-400` -> `text-red-500` |
| `src/components/leadership/CompetencyAssessment.tsx` | ScoreSelector: `text-teal-300`, `text-amber-300`, `text-red-300` -> `text-teal-700`, `text-amber-700`, `text-red-600` (라이트 테마 적합 색상) |
| `src/components/leadership/LeadershipFeedback.tsx` | ScoreSelector: 동일하게 라이트 테마 색상으로 변경 |

### 2. 사용하지 않는 import / 변수 정리

| 파일 | 수정 내용 |
|------|----------|
| `src/components/leadership/LeadershipFeedback.tsx` | 미사용 import 제거: `Clock`, `Ear`, `MessageSquare`, `Smile`, `Play`, `Pause`, `SearchBar`, `PipelineResult`, `SearchResult` |
| `src/components/leadership/LeadershipFeedback.tsx` | 미사용 변수 정리: `channelLabels`, `togglePlay`, `handleSearch`, `isPending`, `displayScore` |
| `src/components/leadership/LeadershipFeedback.tsx` | `isPlaying` -> destructuring에서 제거 (`[, setIsPlaying]` 패턴) |
| `src/components/leadership/LeadershipFeedback.tsx` | `searchResults`, `searchLoading` destructuring 제거, `search` 보존 (void 처리) |
| `src/components/leadership/LeadershipFeedback.tsx` | 불필요한 eslint-disable directive 제거 (useEffect deps 완전) |
| `src/components/leadership/LeadershipCoaching.tsx` | 미사용 import 제거: `PlayCircle` |
| `src/components/leadership/TranscriptTimeline.tsx` | 미사용 import 제거: `Users` |
| `src/lib/leadership-analysis.ts` | 미사용 변수 제거: `scored` (generateAnalysisReport 내) |
| `src/components/leadership/GroupManager.tsx` | useCallback deps에서 미사용 `isGroupType` 제거 |

### 3. React Hook 의존성 수정

| 파일 | 수정 내용 |
|------|----------|
| `src/components/leadership/LeadershipFeedback.tsx` | `useMemo` (reportData)에 누락된 `selectedCompetencies` 의존성 추가 |

### 4. ESLint 설정 개선

| 파일 | 수정 내용 |
|------|----------|
| `eslint.config.mjs` | `@typescript-eslint/no-unused-vars` 규칙에 `argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"` 추가 (의도적 미사용 매개변수 `_` prefix 허용) |

### 5. 접근성 (a11y) 개선

| 파일 | 수정 내용 |
|------|----------|
| `src/components/leadership/TranscriptTimeline.tsx` | 자동 스크롤 / 간결 보기 토글 버튼에 `aria-label` 추가 |
| `src/components/leadership/TranscriptTimeline.tsx` | 북마크 버튼에 `aria-label` 추가 |
| `src/components/leadership/GroupDashboard.tsx` | 뒤로 가기 버튼에 `aria-label` 추가 |

### 6. 파이프라인 검증 결과

| 검증 항목 | 결과 |
|----------|------|
| `src/lib/twelvelabs.ts` /analyze SSE 파싱 | 정상 -- JSON.parse(line)으로 event_type === "text_generation" 텍스트 조합. 파싱 불가 라인 skip 처리 |
| `src/lib/multimodal-scoring.ts` 채점 임계값 | rubricurl 문서 4 기준과 일치 (15개 하위지표 4단계 임계값, 항목 점수 = 평균 x 3, 총점 >= 3개 항목) |
| `src/lib/leadership-analysis.ts` 루브릭 기준 | standards/ PPTX 기반 ASSESSMENT_BY_KEY 참조, 9점 4단계 매핑 일치 |
| `src/app/api/twelvelabs/multimodal-extract/route.ts` 프롬프트 | rubricurl 문서 3 기반 5채널 추출 프롬프트 (시선/음성/유창성/자세/표정), 임계값 일치 |
| `src/app/api/solar/report/route.ts` 금지 표현 | rubricurl 문서 4 금지 표현 6개 규칙 system prompt에 명시 (인상평/성격추정/외모/내용평가/단일신호 단정/N/A 미기술) |

### 빌드 결과

- `npx tsc --noEmit`: 오류 0개
- `npx next build`: 성공, 경고 0개

---

## 2026-04-03 QA 사이클 2 — 실제 사이트 + 분석 흐름 + 성능 점검

### 1. 실제 사이트 브라우저 점검

| 엔드포인트 | 메서드 | 상태 | 응답 |
|-----------|--------|------|------|
| `http://localhost:3000` | GET | 200 | 정상 |
| `/api/twelvelabs/analyze` | POST (빈 body) | 400 | `"videoId와 type이 필요합니다"` |
| `/api/twelvelabs/multimodal-extract` | POST (빈 body) | 400 | `"videoId가 필요합니다"` |
| `/api/solar/report` | POST (빈 body) | 400 | `"scoringResult가 필요합니다"` |
| `/api/twelvelabs/index` | GET | 200 | 4개 인덱스 정상 반환 |

모든 API 엔드포인트가 적절한 에러 메시지와 HTTP 상태 코드를 반환합니다.

### 2. 에러 핸들링 검증

| API 라우트 | try-catch | 한국어 에러 메시지 | 입력 검증 |
|-----------|-----------|-----------------|----------|
| `/api/twelvelabs/analyze` | O | O | videoId, type 필수 + ALLOWED_TYPES 화이트리스트 |
| `/api/twelvelabs/multimodal-extract` | O | O | videoId 필수 + VALID_CHANNELS 화이트리스트 |
| `/api/solar/report` | O | O | scoringResult 필수, Solar API 실패 시 로컬 폴백 |
| `/api/twelvelabs/upload` | O | O | FILE_TOO_LARGE / MISSING_PARAMS 커스텀 에러, 2GB 제한 |
| `/api/twelvelabs/search` | O | O | indexId+query 필수, 쿼리 500자 제한 |
| `/api/twelvelabs/index` | O | O | GET/POST 모두 처리 |
| `/api/twelvelabs/embed` | O | O | videoId/taskId 필수 |
| `/api/twelvelabs/transcription` | O | O | indexId+videoId 필수 |
| `/api/twelvelabs/upload/status` | O | O | taskId 필수, API 키 미설정 체크 |
| `/api/tl-token` | O | O | same-origin 검증, API 키 미설정 체크 |

### 3. 분석 흐름 검증 (LeadershipFeedback.tsx)

| 검증 항목 | 결과 |
|----------|------|
| waitForIndexing 실패 시 계속 진행 | O — "인덱싱 상태 확인 불가 — 분석을 시도합니다..." 표시 후 진행 |
| analyze('chapter') 실패 시 빈 배열 폴백 | O — `Array.isArray(ch) ? ... : []`, chaptersToUse에서 영상 전체를 하나의 구간으로 대체 |
| evidence 0개일 때 UI | O — "리포트 데이터 없음" + 챕터/하이라이트/요약/전사 카운터 표시 |
| 멀티모달 파이프라인 자동 시작 | O — `analysisPhase >= 6 && !mmStarted`일 때 자동 시작 |
| useEffect cleanup (cancelled 플래그) | O — 컴포넌트 언마운트 시 모든 비동기 작업 안전하게 취소 |

### 4. GroupManager hybrid 모드 검증

| 검증 항목 | 결과 |
|----------|------|
| 개별 6개 + 전체 1개 업로드 흐름 | O — isHybridType 조건으로 전체 와이드샷 + 개별 클로즈업 분리 |
| 업로드 진행률 표시 | O — uploadPercent + uploadStatus로 정확한 진행률 |
| scenarioText 전달 | O — onAnalyzeMember 호출 시 scenarioText 매개변수 전달 |
| 업로드 중 UI 피드백 | O — Loader2 애니메이션 + 퍼센트 표시 + 프로그레스 바 |

### 5. 성능 최적화

| 파일 | 수정 내용 |
|------|----------|
| `src/components/leadership/LeadershipFeedback.tsx` | `competencyKeysToUse`를 `useMemo`로 감싸 매 렌더 시 참조 안정성 확보 |
| `src/components/leadership/LeadershipFeedback.tsx` | `ANALYSIS_STEPS` 상수 배열을 컴포넌트 외부로 이동 (매 렌더 시 재생성 방지) |

### 6. 보안 강화

| 파일 | 수정 내용 |
|------|----------|
| `src/components/leadership/LeadershipFeedback.tsx` | `dangerouslySetInnerHTML` 사용 부분에 XSS 방지 로직 추가 — `<script>`, `<iframe>`, `on*` 이벤트 핸들러 제거 |

### 빌드 결과

- `npx tsc --noEmit`: 오류 0개
- `npx next build`: 성공, 경고 0개

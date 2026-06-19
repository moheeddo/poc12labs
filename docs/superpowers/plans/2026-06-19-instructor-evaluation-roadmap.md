# 교수(강사) 평가의 영상분석 확장 로드맵

> KHNP 인재개발원 — 영상 AI 역량진단 플랫폼
> 작성일: 2026-06-19 · 작성: 교육지원부 ICT파트 / AI교육혁신TF
> 상태: 설계 제안 (Phase 0 — 사실관계·아키텍처 검증 완료)

---

## 0. 한 줄 요약

리더십 역량진단(비전제시·신뢰형성·구성원육성 + 합리적의사결정)에서 검증한 **SSOT 루브릭 + 멀티모달 채점/집계 엔진**을, 검증된 수업관찰 프레임워크(Danielson FfT·CLASS·ICAP·World Bank Teach)에 근거해 **"교수(강사) 평가"** 로 확장한다. 핵심 전략은 **자동화 가능한 행동 레이어**(말속도·명료성·발문·대기시간·판서·동선)와 **인간 검증이 필수인 내용 레이어**(교수법적·교과 내용 지식)를 분리하고, 행동 레이어부터 기존 엔진을 그대로 재사용해 빠르게 가동하는 것이다.

---

## 1. 비전·배경

### 1.1 왜 교수평가를 영상분석으로 하는가

한수원 인재개발원의 **교육훈련 통합 AI-Brain** 구상에서 "사람을 영상으로 평가하는 능력"은 이미 두 갈래로 가동 중이다.

1. **시뮬레이터 운전원 평가** (8대 역량 멀티모달)
2. **리더십 역량진단** (현재 운영 — 비전제시·신뢰형성·구성원육성 + 합리적의사결정)

세 번째 자연스러운 갈래가 **교수(강사) 평가**다. 인재개발원의 일차 산출물은 "교육"이며, 그 품질의 핵심 변수는 강사다. 그러나 현재 강사 평가는 대체로 **수강 후 만족도 설문(reaction-level)** 에 머문다 — 강의가 끝난 뒤의 인상, 표본 편향, 후광효과에 취약하다. 반면 강의는 이미 영상으로 녹화되는 경우가 많고, 강의 행동(말속도·발문·구조전환·판서)은 **관찰 가능한 행동**으로 정의할 수 있다.

즉, 리더십 진단에서 "발표·면담·토의 행동"을 정량화한 것과 **동일한 방법론**을, 교육이라는 우리 본업의 핵심 자산에 적용하는 것이다. 이는 새 시스템을 처음부터 만드는 것이 아니라, **이미 SSOT로 일반화해 둔 엔진에 새 루브릭 데이터를 추가**하는 작업에 가깝다(§4 참조).

### 1.2 기존 강의분석 트랙 재가동

중요: 이 갈래는 백지에서 시작하지 않는다. **강의분석 트랙이 코드로 이미 존재**하며 현재 UI에서만 숨겨져 있다(Vercel 배포 호환성 이유로 숨김 처리, 코드는 유지 — 메모리 기록 `feedback_two_services_only.md`).

| 자산 | 경로 | 현황 |
|---|---|---|
| 강의평가 타입 | `src/lib/lecture-types.ts` | 듀얼 엔진(전달력 50 + 내용 충실도 50) 타입 정의 완비 |
| 강의 채점 로직 | `src/lib/lecture-scoring.ts` | `scoreDelivery`, `scoreContentFidelity`, `computeTotalScore`, `getLectureGrade` |
| 강의 분석 파이프라인 | `src/app/api/lecture/analyze/route.ts` | 7단계 Job 기반(transcription→pptParsing→contentFidelity→multimodal→pedagogy→scoring→reporting) |
| 교수법 지표 추출 | `src/app/api/lecture/pedagogy-extract/route.ts` | 학습자 질문 유도·슬라이드 포인팅·요약/전환 시그널 3지표 추출 |
| PPT 파싱 | `src/app/api/lecture/parse-ppt/route.ts` | 슬라이드·노트 파싱 → 내용 커버리지 매칭 |
| UI 컴포넌트 | `src/components/lecture/*` | `LectureDashboard`/`LectureEvaluation`/`LectureRadar`/`SlideMap`/`PptUploader`/`LectureProgress` |

특히 결정적인 사실: **강의분석 파이프라인은 이미 리더십 멀티모달 엔진을 재사용하고 있다.** `analyze/route.ts`는 `/api/twelvelabs/multimodal-extract`를 호출해 멀티모달 원점수(0~9)를 받은 뒤(line 142~169), `scoreDelivery(multimodalRaw, pedagogyIndicators)`로 전달력 점수(35점)와 교수법 3지표(15점)를 합산한다(line 206~207). 즉 **재가동 = 새로 만들기가 아니라, 임시 3지표 휴리스틱을 SSOT 루브릭으로 승격하고 UI를 다시 노출하는 작업**이다.

> 이 로드맵의 본질: "이미 돌아가던 트랙을, 리더십 진단에서 확립한 SSOT 품질 기준(fail-closed·밴드 채점·N회 집계·금지표현·HITL)에 맞춰 정식화한다."

---

## 2. 검증된 수업평가 프레임워크 조사

> 아래 4개 프레임워크와 4개 통계/교수법 구성개념은 모두 **실재하는 확립된 교육연구 개념**으로 1차/공식 출처로 확인했다. 버전·적용범위에 따라 표기가 갈리는 부분은 ⚠️로 명시한다.

### 2.1 Danielson Framework for Teaching (FfT)
- **저자/주관:** Charlotte Danielson / The Danielson Group. 단행본 *Enhancing Professional Practice*.
- **구조:** 4개 도메인 × 총 **22개 컴포넌트**.
  - ⚠️ 도메인 명칭은 버전 차이가 있다. 널리 인용되는 구판(2nd Ed.): ① Planning and Preparation ② The Classroom Environment ③ Instruction ④ Professional Responsibilities. 현행 공식 사이트(2022 개정): ① Planning and Preparation ② Learning Environments ③ Learning Experiences ④ Principled Teaching. **인용 시 버전을 명기**한다.
- **영상에서 포착 가능한 차원:** Domain "Instruction"의 발문·토론 기법(3b "Using Questioning and Discussion Techniques"), 학생 참여(3c), 의사소통/내용 전달(3a). 교실환경 도메인의 상호 존중·행동 관리도 영상 관찰 대상.
- **출처:** https://danielsongroup.org/the-framework-for-teaching/

### 2.2 CLASS (Classroom Assessment Scoring System)
- **저자/주관:** Robert C. Pianta 외 / 현재 Teachstone 발행.
- **구조:** 3개 도메인 — **Emotional Support · Classroom Organization · Instructional Support** — 각 도메인 하위에 차원(dimensions). (예: Pre-K판은 Positive/Negative Climate, Teacher Sensitivity, Behavior Management, Concept Development, Quality of Feedback, Language Modeling 등 10개)
  - ⚠️ 차원 수·명칭은 연령대 판(Infant~Secondary)마다 다르며, **대학·성인 강의용 표준판은 아니다.** "차용·적용 가능성" 프레이밍으로 인용한다.
- **영상에서 포착 가능한 것:** 교사-학습자 상호작용의 정서적 톤, 교사 민감성, 시간 활용(productivity), 피드백 질, 언어 모델링 — 모두 행동 기반 코딩. (멀티모달 ML로 Climate를 자동 추정한 연구도 존재.)
- **출처:** https://aps2016.apsva.us/wp-content/uploads/2021/04/CLASS-Description.pdf

### 2.3 ICAP Framework
- **저자:** Michelene T. H. Chi & Ruth Wylie (2014), *Educational Psychologist*.
- **구조:** **Interactive > Constructive > Active > Passive** — 학습자의 **인지적 참여(cognitive engagement)** 를 외현 행동으로 분류한 4모드 위계. 참여가 깊을수록 학습 성과가 높다는 가설.
  - ⚠️ ICAP은 본래 **학습자 참여**를 측정하는 프레임워크이지 강사 평가 도구가 아니다. 우리 맥락에서는 "강사가 어떤 참여 모드를 **유발(elicit)** 하는가"로 역할을 정확히 규정해 차용한다(§3 engagement elicitation).
- **출처:** https://doi.org/10.1080/00461520.2014.965823

### 2.4 World Bank Teach (classroom observation tool)
- **주관:** World Bank Group (2019, 오픈소스). "Teach Primary"/"Teach Secondary".
- **구조:** 3개 영역 — **Classroom Culture · Instruction · Socioemotional Skills** → 9개 요소(elements) → 28개 행동(behaviors), 각 행동을 low/medium/high로 평정 후 5점 척도 환산. **15분 관찰 2회** 기준.
  - ⚠️ K-12(초등 중심) 현직 교사 관찰·전문성 개발용. 대학 강사 직접 적용 도구는 아니나, **in-service 관찰 + 형성적 전문성 개발**이라는 사용 목적은 우리와 정확히 일치한다.
- **출처:** https://www.worldbank.org/en/topic/education/brief/teach-helping-countries-track-and-improve-teaching-quality

### 2.5 보강 구성개념 (행동 레이어 근거)
- **Wait time / Think time** (Mary Budd Rowe, 1972 개념화·1986 정식 출판): 질문 후(WT1)·학생 응답 후(WT2) 대기를 **약 3초 이상**으로 늘리면 학생 응답 길이·논리·자발성·정답률이 개선됨. 교사 평소 대기는 0.7~1.5초. → **발문 후 대기시간**을 직접 측정 지표화한다.
- **Bloom's Taxonomy 질문 수준:** 하위차원 사고(LOTS: Remember/Understand/Apply) vs 상위차원 사고(HOTS: Analyze/Evaluate/Create). → 발문을 단순 빈도가 아니라 **인지 수준별로 분류**(STT+의미분석, 내용 레이어).
- **ICC (Intraclass Correlation Coefficient):** 평정자 간 신뢰도/일치도의 **가장 널리 쓰이는 표준 통계.** ⚠️ 단일 통계가 아니라 여러 모델형(consistency vs absolute agreement)이 있어 보고 시 모델형(예: ICC(2,1))을 명시한다. 해석: <0.5 poor / 0.5~0.75 moderate / 0.75~0.9 good / >0.9 excellent.
- **SEM (Standard Error of Measurement):** 관찰 점수 주변 측정오차의 표준편차. 점수 ± 1.96·SEM ≈ 95% 신뢰구간. → AI 점수에 **신뢰구간**을 부여해 측정 불확실성을 정직하게 표현한다.

### 2.6 프레임워크 → 우리 SSOT 구조 매핑

각 프레임워크의 "도메인"은 우리 `MAssessmentItem`(M-항목), "차원/행동"은 `RubricIndicator`(필수/참고지표), "low/medium/high·평정척도"는 `OperatingBand`(상위/중상/중하/미흡)에 1:1로 대응한다.

| 프레임워크 개념 | 우리 SSOT 구조 (`leadership-rubric-data.ts`) |
|---|---|
| 도메인 (FfT Domain / CLASS Domain / Teach Area) | `MAssessmentItem` (M1~M5) |
| 차원·컴포넌트·행동 (FfT component / CLASS dimension / Teach behavior) | `RubricIndicator` |
| 평정 척도 (Teach low/med/high, CLASS 1~7) | `OperatingBand { upper / midHigh / midLow / poor }` → 3/2/1/0 |
| 관찰자 매뉴얼의 "관찰 가능 행동" 정의 | `RubricIndicator.meaning` + 추출 프롬프트 |
| "해석 금지·인상평 금지" 가이드 | `prohibitedExpressions` + `excludedElements` |
| 발문 후 대기시간(Wait time) | 신규 `RubricIndicator` (예: `wait_time_after_question_median_sec`) |
| 학습자 참여 유발(ICAP) | 신규 M-항목 "참여 유발(engagement elicitation)" |
| in-service 형성평가 목적(Teach) | §6 윤리 — summative 금지·코칭 우선 |

핵심: **새 데이터 구조를 발명할 필요가 없다.** 검증된 프레임워크의 차원을 기존 `RubricIndicator` 형태로 옮겨 적으면, 그것이 곧 채점·추출·집계·리포트의 단일 출처(SSOT)가 된다.

---

## 3. 2-레이어 설계: 행동 레이어와 내용 레이어

교수평가의 위험은 "AI가 강의 내용의 옳고 그름을 판정"하는 순간 발생한다. 이를 구조적으로 차단하기 위해 평가를 두 레이어로 명확히 분리한다.

### 3.1 행동 레이어 (Behavioral Layer) — 자동화 가능

영상·음성에서 **신뢰성 있게 관찰 가능한 전달·상호작용 행동**만 다룬다. 리더십 진단의 시선·프로소디·유창성 지표와 동일한 성격이며, 기존 추출/채점 엔진이 그대로 동작한다.

| M-항목(제안) | 필수지표(예시 변수명) | 측정 채널 | 근거 프레임워크 |
|---|---|---|---|
| **강의 명료성·전달** | `articulation_rate_syl_per_sec`, `filled_pauses_per_min`, `f0_dynamic_range_st`, `loudness_dynamic_range_db` | STT+프로소디 | FfT 3a, 리더십 M2/M3 재사용 |
| **구조화·전환 신호** | `structural_transition_markers_per_min`, `summary_signal_count` | STT 의미 | FfT Instruction, 기존 transitionSignal 승격 |
| **참여 유발 (engagement elicitation)** | `question_to_class_per_min`, `wait_time_after_question_median_sec`, `learner_invitation_count` | STT+VAD | ICAP(유발 관점), Wait time(Rowe) |
| **시각자료·판서 활용** | `slide_pointing_events_per_min`, `board_writing_ratio`, `gaze_return_to_audience_ratio` | VLM | FfT 3a, 기존 slidePointing 승격 |
| **동선·근접성(proximity)** | `movement_coverage_ratio`, `static_lectern_ratio`, `learner_proximity_events` | VLM | CLASS Teacher Sensitivity(차용) |
| **(보조) 자세·표정 안정성** | M5 패턴 그대로 — 총점 미반영 | VLM | 리더십 M5 재사용 |

> 설계 원칙(리더십 진단과 동일): 비율 지표는 추출 시 0.0~1.0으로 emit, 빈도/초/ST/dB는 단위 수치. `unit==="%"`이면 채점 엔진이 ×100 정규화(`normalizeValue`). 관찰 불가 신호는 **null**(임의 추정 금지, N/A는 0점이 아님).

특히 **Wait time**은 우리가 더할 수 있는 명백한 학술적 차별점이다. "발문 후 대기시간 중앙값"은 VAD로 직접 측정 가능하고, Rowe의 ~3초 기준을 그대로 `OperatingBand`로 넣을 수 있다 — 만족도 설문으로는 절대 잡히지 않는 행동 신호다.

### 3.2 내용 레이어 (Content Layer) — fail-closed·HITL 필수

교수법적 지식·교과 내용의 적절성은 **AI가 단독 판정하지 않는다.** 다음 규칙을 강제한다.

1. **fail-closed 인용:** 내용 관련 진술은 반드시 (a) 슬라이드/교안의 원본 텍스트 또는 (b) 영상 타임스탬프에 역추적 가능한 근거를 동반한다. 근거가 없으면 출력하지 않는다(dohan 휴리스틱 ①). `lecture-types.ts`의 `ConceptMatch.evidence`·`SlideCoverage.matchedSegments`가 이미 이 역추적 구조를 갖고 있다.
2. **N-judge:** 내용 충실도·발문 인지수준(Bloom) 같은 의미 판단은 **여러 회(N) 판정 후 집계**하고, 분산이 크면 결과를 보류한다(§5, `multimodal-aggregate.ts` 재사용).
3. **HITL(Human-in-the-loop) 의무:** 내용 레이어 점수는 **교수자 본인 또는 동료 교수자 검토를 거쳐야만** 확정된다. AI는 후보·신호 제시자(narrator)이지 판정자가 아니다.
4. **내용 충실도(PPT 첨부 시):** `parse-ppt` → `slide-matcher`(커버리지) → 개념 매칭 → `scoreContentFidelity`(50점). 이는 "강의가 교안을 충실히 다뤘는가"라는 **추적 가능한 사실**만 다루지, "내용이 옳은가"를 판정하지 않는다.

| | 행동 레이어 | 내용 레이어 |
|---|---|---|
| 다루는 것 | 전달·상호작용 행동 | 교안 커버리지·발문 인지수준·교수법 적절성 |
| 자동화 | 가능 (밴드 채점 자동) | 보조만 — 후보 제시 |
| 근거 요건 | 행동 관찰(observation) | fail-closed 인용 필수 |
| 최종 확정 | 자동 산출 + 사후 검토 | **HITL 검토 후에만 확정** |
| 재사용 엔진 | `multimodal-scoring` + `multimodal-extract` | `lecture-scoring`(content fidelity) + N-judge 집계 |

---

## 4. 기존 SSOT 아키텍처/엔진 재사용 방안

이 로드맵의 가장 큰 자산은 **"루브릭 데이터만 추가하면 추출·채점·집계·리포트 전 단계가 동작한다"** 는 사실이다. 리더십 진단의 합리적의사결정(RD) 항목이 그 증거다 — `RATIONAL_DECISION`은 별도 코드 없이 `CompetencyAssessmentData` 한 덩어리만 추가해 운영에 편입됐다(`leadership-rubric-data.ts:1013`, 주석 "SSOT: 본 데이터만으로 추출·채점·리포트 전 단계가 동작").

### 4.1 교수평가 루브릭을 `CompetencyAssessmentData`로 정의

§3.1의 M-항목들을 `CompetencyAssessmentData` 객체로 작성한다(예: `key: "instructorTeaching"`). 필요한 필드는 리더십 4개 역량과 동일: `mItems`(M1~M5), `taskContext`, `evaluationPrinciples`, `excludedElements`, `prohibitedExpressions`, `totalScoringFormula`, `participantModel`. 작성 후 `DEPARTMENT_HEAD_ASSESSMENTS` 배열에 추가하면 `ASSESSMENT_BY_KEY`에 자동 등록된다.

### 4.2 추출 — 코드 0줄로 동작

`src/app/api/twelvelabs/multimodal-extract/route.ts`의 `buildItemPrompt`는 `ASSESSMENT_BY_KEY[competencyKey].mItems`에서 **추출 프롬프트를 자동 생성**한다(line 30~101). 각 지표의 `meaning`·`band`·category 태그([채점 필수지표]/[상시 참고지표]/[조건부 참고지표])를 그대로 프롬프트에 박고, 출력 예시까지 변수명으로 채운다. → **교수평가 루브릭을 등록하면 `?competencyKey=instructorTeaching`로 호출하는 순간 추출이 동작.** `roleContext`(평가 대상자·glossary)도 그대로 쓸 수 있다(강사명·과목 고유명사 STT 보정).

### 4.3 채점 — 코드 0줄로 동작

`src/lib/multimodal-scoring.ts`의 `scoreMultimodalSignals(signals, competencyKey)`는 루브릭 `band` 문자열을 직접 파싱해 채점한다(밴드 인터프리터: `parseTierIntervals`/`detectBandShape`/`scoreByRange`). 필수지표(`required & scoreReflected & band`)만 채점하고, 참고지표는 표시만, M5(`totalReflected:false`)는 총점 제외, 핵심 항목 3개 미만이면 총점 보류 — 이 규칙 전부가 교수평가에 그대로 적용된다. → **새 채점 코드 불필요.**

### 4.4 집계 — 코드 0줄로 동작

`src/lib/multimodal-aggregate.ts`의 `aggregateRuns(results)`는 같은 영상·같은 역량의 N회 결과를 받아 평균/중앙값/최빈값/표준편차/일관성 등급을 산출한다. 교수평가 결과(`MultimodalScoreResult`)도 동일 타입이므로 **그대로 N회 집계** 가능. 일관성 "낮음"이면 `requiresReview:true`로 HITL 신호가 자동으로 켜진다.

### 4.5 리포트·금지표현 강제

리포트 생성은 `prohibitedExpressions`(예: "강의를 잘했다", "열정적이다", "전문성이 높다")와 `excludedElements`(외모·내용 정답 여부 등)를 강제한다. 교수평가용 금지표현 목록만 작성하면 동일한 fail-safe가 적용된다.

### 4.6 강의 트랙 통합 지점

기존 강의 파이프라인(`api/lecture/analyze/route.ts`)은 이미 `multimodal-extract`를 호출하고 `scoreDelivery`로 합산한다. 변경점은 단 두 가지:
- (a) `multimodal-extract` 호출 시 `competencyKey: "instructorTeaching"`를 넘겨 **임시 5채널 휴리스틱 대신 SSOT 루브릭으로 추출**.
- (b) `pedagogy-extract`의 3지표(learnerEngagement·slidePointing·transitionSignal)를 SSOT M-항목으로 흡수(또는 내용 레이어 후보로 격하).

```
[교수평가 루브릭 1개 추가 (leadership-rubric-data.ts)]
        │  (코드 변경 없이 자동 연결)
        ▼
multimodal-extract (프롬프트 자동생성) → scoreMultimodalSignals (밴드 채점)
        │                                         │
        ▼                                         ▼
   N회 반복 ───────────────────────────► aggregateRuns (평균/σ/일관성)
        │                                         │
        ▼                                         ▼
 lecture-scoring (전달력+내용충실도)  ───►  리포트(금지표현 강제) + HITL 게이트
```

---

## 5. 타당성 입증: N회 반복 + SEM 신뢰구간 + ICC 캘리브레이션

리더십 진단 파일럿에서 확인된 문제 — "진단할 때마다 점수가 바뀜(B부장 7.9→7.7)" (`multimodal-aggregate.ts` 주석) — 는 교수평가에도 동일하게 적용된다. AI(VLM) 출력은 비결정적이므로, "있다"가 아니라 "안정적으로 돌아간다"를 숫자로 증명한다(dohan 휴리스틱 ②).

1. **N회 반복 진단:** 같은 강의 영상을 N회(권장 5~10) 채점 → `aggregateRuns`로 항목·총점의 평균/중앙값/최빈값/표준편차 산출. 대표 회차(평균 최근접)를 상세 리포트에 사용.
2. **일관성 등급 + 자동 HITL:** 총점 표준편차로 일관성을 등급화(σ<0.5 높음 / <1.0 보통 / 그 이상 낮음). "낮음"이면 `requiresReview:true` → **전문가 검토 강제**(`multimodal-aggregate.ts:119`).
3. **SEM 신뢰구간:** N회 표본의 표준편차로 SEM을 추정해 "**총점 72점 ± 4점(95% CI)**" 형태로 표기. 단일 숫자가 아니라 불확실성을 동반한 측정으로 정직하게 보고한다.
4. **ICC 캘리브레이션(인간 대비):** 동료 교수자·학생 평가(또는 전문 평정자)와 AI 점수의 **ICC(2,1, absolute agreement)** 를 산출해 일치도를 입증한다. 목표는 최소 moderate(≥0.5), 권장 good(≥0.75). ⚠️ 보고 시 ICC 모델형을 반드시 명시.
   - 머지 게이트(dohan 휴리스틱 ②): ICC·일관성 σ를 미리 정한 임계값으로 검증하기 전에는 "개선했다"고 선언하지 않는다.

---

## 6. 윤리·수용성

교수평가는 **사람의 직업적 정체성**을 다루므로, 안전망을 설계 출발점에 둔다(dohan 휴리스틱 ⑥).

1. **형성평가(formative/coaching) 우선, summative(인사) 금지:** 본 시스템의 산출물은 **강사 개인의 성장·코칭 자료**다. 인사·재계약·강사 등급 등 처분적(summative) 의사결정에 직접 입력하지 않는다. (World Bank Teach의 in-service·전문성 개발 목적과 정렬.)
2. **HITL 의무:** 특히 내용 레이어는 인간 검토 없이 확정되지 않는다. **교육 도메인에서 AI는 어시스턴트/narrator이며 최종 판정은 인간**(dohan 휴리스틱 ③ — 원자력·교육 한정). 이는 개인 프로젝트와 명확히 다른 운영 원칙이다.
3. **교수 자율성·투명성:** 평가 대상 강사에게 (a) 측정 지표 정의, (b) 밴드 기준, (c) 평가 제외 요소(`excludedElements`), (d) 금지표현 목록을 **사전 공개**한다. 강사는 자신의 행동 신호 근거(타임스탬프·observation)를 역추적할 수 있어야 한다.
4. **인상평·내용 판정 금지:** `prohibitedExpressions`로 "강의를 잘했다/열정적이다/전문성이 높다" 같은 인상평을 차단하고, "강의 내용의 정답 여부·이론적 옳음"은 `excludedElements`로 평가 범위에서 제외한다. AI는 **행동을 기술**할 뿐 사람을 판정하지 않는다.
5. **데이터 보호:** 강의 영상은 민감 인사 데이터다. 온프렘·폐쇄망·접근통제·보존기간 정책을 적용한다(dohan 기본값 — 0 egress·암호화).
6. **false positive 1건도 즉시 수정:** 부당하게 낮은 점수·오탐지 1건이라도 강사 신뢰를 무너뜨린다. 민감 영역 안전망 원칙을 적용한다(dohan 휴리스틱 ⑥).

---

## 7. 단계별 로드맵 (Phase 1~4)과 리스크

### Phase 1 — 행동 레이어 SSOT 정식화 (재사용 최대)
- 교수평가 루브릭(`instructorTeaching`)을 `CompetencyAssessmentData`로 작성 → §3.1 행동 M-항목, 밴드, 금지표현.
- `multimodal-extract`/`scoring`/`aggregate`가 코드 변경 없이 동작함을 확인(스모크 테스트).
- 강의 트랙(`api/lecture/analyze`)이 `competencyKey:"instructorTeaching"`로 추출하도록 배선 변경(2지점).
- **산출:** 행동 레이어만으로 강사 1인 강의 영상 → 전달력 점수 + N회 일관성.
- **리스크:** 행동 밴드 임계값의 도메인 타당성(강의는 발표보다 길고 동선이 큼). → 파일럿 영상으로 밴드 캘리브레이션 필요.

### Phase 2 — 참여 유발·Wait time·동선 지표 추가
- `wait_time_after_question_median_sec`(VAD), `slide_pointing`/`board_writing`(VLM), `movement_coverage`(VLM) 지표 구현·검증.
- Marengo 검색 기반 이중 검증 패턴(`enrichVisionGazeWithMarengo`) 차용 — "강사가 칠판을 가리키는 장면" 등 행동 검색으로 VLM 추정값 보강.
- **리스크:** VLM의 판서/포인팅 탐지 신뢰도. → 신뢰도 낮은 신호는 null(N/A) 처리, 조건부지표로 격하.

### Phase 3 — 내용 레이어 (HITL·fail-closed)
- 기존 `parse-ppt`+`slide-matcher`+`scoreContentFidelity` 재가동(교안 커버리지 50점).
- 발문 Bloom 인지수준 분류(STT+의미분석) — **N-judge + HITL 게이트** 적용. fail-closed 인용 강제.
- **리스크:** 내용 의미 판단의 환각. → fail-closed로 근거 없으면 출력 차단, HITL 검토 전 미확정.

### Phase 4 — 타당성 입증·UI 재노출·운영
- 동료/학생 평가와 ICC 캘리브레이션, SEM 신뢰구간 표기.
- `src/components/lecture/*` UI 재노출(현재 숨김) + 강사 사전 공개 페이지(지표 정의·제외 요소·금지표현).
- 형성평가 코칭 리포트 템플릿 확정.
- **리스크:** 수용성·노조/강사 반발. → §6 윤리 가드레일(형성평가 한정·자율성·투명성)을 운영 정책으로 문서화하고 강사 동의 절차 선행.

### 공통 리스크
- **스코프크립**: 한 번에 모든 프레임워크 전 차원을 구현하려는 유혹. → 행동 레이어부터 좁게, "격상 헌법"으로 조기 인프라 금지(dohan 휴리스틱 ⑤).
- **비결정성**: §5의 N회+σ+ICC 게이트를 머지 조건으로 명문화하기 전 "개선" 선언 금지.
- **Vercel 호환성**: 현재 강의 트랙 숨김 사유. 온프렘 본사업 전환 시 해소되나, PoC 단계에서는 배포 제약을 고려해 UI 노출 범위 관리.

---

## 부록 A. 인용한 재사용 가능 자산 (파일 경로)

| 자산 | 경로 | 재사용 방식 |
|---|---|---|
| SSOT 루브릭 구조·타입 | `src/lib/leadership-rubric-data.ts` | `CompetencyAssessmentData`/`MAssessmentItem`/`RubricIndicator`/`OperatingBand`로 교수평가 루브릭 정의. `DEPARTMENT_HEAD_ASSESSMENTS`에 추가 → `ASSESSMENT_BY_KEY` 자동 등록 |
| 밴드 채점 엔진 | `src/lib/multimodal-scoring.ts` | `scoreMultimodalSignals(signals, "instructorTeaching")` — 코드 변경 0 |
| N회 집계 엔진 | `src/lib/multimodal-aggregate.ts` | `aggregateRuns()` — 평균/중앙값/σ/일관성·자동 HITL |
| 추출 프롬프트 자동생성 | `src/app/api/twelvelabs/multimodal-extract/route.ts` | `buildItemPrompt`가 루브릭에서 프롬프트 생성. `roleContext`로 강사명·glossary 보정 |
| 강의 듀얼엔진 채점 | `src/lib/lecture-scoring.ts` | `scoreDelivery`/`scoreContentFidelity`/`computeTotalScore`/`getLectureGrade` |
| 강의 타입 | `src/lib/lecture-types.ts` | `ConceptMatch.evidence`/`SlideCoverage.matchedSegments` = fail-closed 역추적 구조 |
| 강의 파이프라인 | `src/app/api/lecture/analyze/route.ts` | 7단계 Job — 이미 `multimodal-extract` 호출 중. competencyKey만 교체 |
| 교수법 추출 | `src/app/api/lecture/pedagogy-extract/route.ts` | 3지표 → SSOT M-항목으로 승격 |
| PPT 파싱 | `src/app/api/lecture/parse-ppt/route.ts` | 내용 레이어 교안 커버리지 |
| 강의 UI | `src/components/lecture/*` | Phase 4 재노출 |

## 부록 B. 출처
- Danielson FfT: https://danielsongroup.org/the-framework-for-teaching/
- CLASS: https://aps2016.apsva.us/wp-content/uploads/2021/04/CLASS-Description.pdf
- ICAP (Chi & Wylie 2014): https://doi.org/10.1080/00461520.2014.965823
- World Bank Teach: https://www.worldbank.org/en/topic/education/brief/teach-helping-countries-track-and-improve-teaching-quality
- Wait time (Rowe 1986): https://journals.sagepub.com/doi/10.1177/002248718603700110
- Bloom's Taxonomy: https://www.britannica.com/topic/Blooms-taxonomy
- ICC (모델형 주의): https://link.springer.com/article/10.1186/s12874-018-0550-6
- SEM: https://www.britannica.com/science/standard-error-of-measurement

> ⚠️ 사실관계 주의(작성 시 반영): Danielson 도메인 명칭은 버전 차이 / CLASS 차원은 연령대판마다 다름·대학 표준판 아님 / ICAP은 학습자 참여 프레임워크(강사 유발 관점으로 차용) / Teach는 K-12 초등 중심(in-service·형성 목적은 일치) / ICC는 "가장 널리 쓰이는" 표준이며 모델형 명시 필요.

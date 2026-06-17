# 리더십 역량진단 — 파일럿 피드백 + 루브릭 v1.0 반영 (2026-06-17)

출처: `추가 업데이트/영상 진단 피드백 정리260616.hwpx`(리더십코칭센터 이난샘),
`추가 업데이트/한수원_리더십_역량평가_루브릭_v1.0`(비전제시·구성원육성·신뢰형성 해설서·AI 기술 정의서·요약본).

## 결정 사항 (사용자 확인)
1. **화자/STT 보정**: 코치 보정 UI 추가 — 평가대상자(target/Leader) 지정 + 화자 라벨 수동 매핑 + 전사 라벨 수정 → 점수 재계산.
2. **신뢰형성 인원**: 가변 N인 — 세션 메타데이터 기반, 라벨 "다른 참여자"로 일반화.

## 근본 원인 → 조치 (피드백 8건)

| # | 피드백 | 근본 원인 | 조치 |
|---|---|---|---|
| ① | 모든 역량에 비전제시 루브릭만 적용 | `multimodal-scoring.ts`/`multimodal-extract`/리포트 UI가 비전제시 하드코딩, `competencyKey` 미전달 | **루브릭 데이터 구동 역량별 엔진**으로 전환 |
| ② | 표정·머리(M5) 총점 미반영 항목인데 총점 반영 | `scoreMultimodalSignals`가 item5를 `scorableItems`에 포함 | **총점 = M1~M4만**, M5 제외 |
| ③ | 참고지표가 채점됨 | downward_or_slide·emphasis_bursts·purposeful_gesture 채점 | **필수지표(category=required & scoreReflected)만 채점** |
| ④ | 종합평가요약 상단 이동 / 발언요약 제거 | 종합요약 하단, 상단엔 TwelveLabs 발언요약(구성원육성=민차장 발언) | 레이아웃 재배치 |
| ⑤ | 점수바 3색(상/중/하) | 부분 반영(998ea3a) | 전 구간 정합화 (상위 teal·중위 amber·하위 red) |
| ⑥ | PDF/저장 버그 | `window.print()` 인쇄 CSS 부재, 저장 피드백 없음 | 보고서 전용 인쇄 + 저장 확인/다운로드 |
| ⑦ | 화자분리·STT 오류 | TwelveLabs/STT 한계 | N/A 규칙 + **코치 보정 UI** (결정 1) |
| ⑧ | 루브릭 v1.0 | 현재 v0.9 (비전 M1/M3 밴드·버전 불일치) | v1.0 정합화 |

## 루브릭 v1.0 데이터 수정 (vs 현 v0.9)
- **비전 M1**: `audience_facing_ratio` 중하 40~54·미흡 <40 (현 35~54/<35); `off_audience_episodes_per_min` ≤2.0/2.1~4.0/4.1~6.0/>6.0 (현 1.5/3.0/5.0); `downward_or_slide_fixation_ratio` → 상시참고(미채점). 산식 2지표.
- **비전 M3**: `long_silent_pauses_per_min` → 필수지표(채점), 산식 3지표; `structural_pause_candidates` 상시참고.
- **신뢰형성**: "두 참여자"→"다른 참여자" 일반화, 가변 N인. `single_participant_response_skew_flag` 내부참고값.
- **공통**: 각 역량 `prohibitedExpressions`(스펙 §9 금지표현) 추가, 항목간 참고정보(judgmental) 추가, 버전 v0.9→v1.0.

## 구현 단계
- **P0** 타입+루브릭 데이터 v1.0 (`leadership-rubric-data.ts`)
- **P1** 역량별 채점 엔진 (`multimodal-scoring.ts`) — 밴드 문자열 인터프리터, `competencyKey`, M5 총점 제외
- **P2** 역량별 추출 (`multimodal-extract` route + `useMultimodalPipeline`) — competencyKey·roleContext 스레딩
- **P3** 리포트 UI (`LeadershipFeedback.tsx`) — 역량 구동 카드, 요약 재배치, PDF/저장, 코치 보정 UI(`SpeakerRoleMapping.tsx`)
- **P4** Solar 리포트 (`solar/report` route) — competencyKey + 금지표현 + 일반화 폴백
- **P5** 검증 — build/typecheck/vitest + 멀티에이전트 적대적 리뷰

## 채점 규칙 (v1.0 공통)
- 필수지표 → 4점 척도(상위3·중상2·중하1·미흡0). M_score = mean(필수지표 점수) × 3 (0~9).
- 총점 = mean(채점 가능 M1~M4), 채점 가능 항목 ≥3일 때만 산출(아니면 N/A). 100점 환산 = 총점/9×100.
- M5 보조항목: numeric score 미산출, 참고 의견만. 참고지표(상시/조건부/내부/항목간) 미채점.

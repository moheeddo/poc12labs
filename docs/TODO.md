# 향후 개선 TODO

> KHNP Video AI Platform POC — 미래 개선 가능 항목 정리
> 최종 정리: 2026-04-05 (TODO 6개 항목 구현 완료)

---

## 1. 실시간 영상 스트리밍 분석

**현재**: 영상 파일을 업로드한 뒤 TwelveLabs 인덱싱 완료 후 분석
**개선**: WebRTC 또는 HLS 기반 실시간 스트리밍 → TwelveLabs Streaming API 연동
**기대 효과**: 시뮬레이터 훈련 중 즉시 피드백 제공, 실시간 이상 행동 탐지
**난이도**: 높음 (TwelveLabs 실시간 API 지원 여부 확인 필요)

## 2. 데이터베이스 연동 — ✅ 부분 해결

**현재 (2026-04-05 구현 완료)**:
- `pov-analysis-history.ts`: JSON 기반 서버사이드 영속 저장 (최대 200건)
- 분석 완료 시 자동 저장, 절차별 필터, 점수 추이 API
- `AnalysisHistory.tsx`: 이력 목록 + Recharts 추이 차트 UI
- `usePovHistory` 훅: 이력/추이 조회 + 삭제

**남은 개선**:
- JSON → PostgreSQL/Supabase 마이그레이션 (대용량, 동시성)
- 리더십/시뮬레이터 결과도 서버사이드 이관
- 사용자별 접근 제어 (인증 #3 선행 필요)
**난이도**: 중간

## 3. 사용자 인증/권한 체계

**현재**: 인증 없이 누구나 접근 가능 (POC 단계)
**개선**: NextAuth.js 또는 Clerk 기반 인증 + RBAC 권한 체계
**역할 예시**:
- 관리자: 전체 서비스 접근, 사용자 관리, 시스템 설정
- 평가관: 시뮬레이터 평가 + 리더십 진단 실행/조회
- 교육생: 본인 결과만 열람
**난이도**: 중간

## 4. 6인 조 결과 이력 관리

**현재**: `localStorage` 세션 단위 저장, 브라우저 변경/초기화 시 유실
**개선**:
- DB 기반 조별 세션 히스토리 관리
- 동일 조원의 과거-현재 역량 성장 추이 라인 차트
- 조별 비교 분석 대시보드 (동일 역량 기준 기수별 비교)
- CSV/Excel 내보내기 기능
**난이도**: 중간

## 5. 멀티모달 정밀도 향상

**현재**: TwelveLabs `generate` API로 5채널 행동 수치 추출 (프롬프트 기반 추정값)
**개선**:
- **FACS AU 분류기**: 얼굴 표정의 Action Unit 자동 분류 (OpenFace 또는 py-feat)
- **음성 F0 측정기**: Praat/parselmouth 기반 정밀 음높이(F0) 동적 범위 측정
- **시선 추적 정밀화**: MediaPipe FaceMesh 기반 시선 방향 정량화
- **자세 분석**: MediaPipe Pose 기반 개방/폐쇄 자세 자동 분류
- **Bayesian 융합 레이어**: 다중 신호원 가중 결합으로 채점 정확도 향상
**난이도**: 높음

## 6. 모바일 앱 대응

**현재**: 반응형 웹 (데스크톱 1440px 기준, 모바일 기본 대응)
**개선**:
- PWA (Progressive Web App) 변환 → 오프라인 캐싱, 홈 화면 추가
- React Native 또는 Flutter 네이티브 앱 (카메라 직접 촬영 → 업로드)
- 모바일 전용 간소화 UI (평가 결과 열람 특화)
**난이도**: 중간~높음

## 7. 테스트 자동화 — ✅ 부분 해결

**현재 (2026-04-05 구현 완료)**:
- Jest + ts-jest 설정 완료, 38개 단위/통합 테스트 통과
- DTW 7개 + 스코어링 12개 + 쿼리 4개 + 캐시 5개 + 골드스탠다드 6개 + API 4개
- API 통합 테스트: route handler 직접 임포트 방식 (msw 불필요)

**남은 개선**:
- Playwright E2E 자동화 (UI 흐름 테스트)
- CI/CD 파이프라인 (GitHub Actions)
- React Testing Library (컴포넌트 단위 테스트)
**난이도**: 중간

## 8. 성능 최적화 — ✅ 부분 해결

**현재 (2026-04-05 구현 완료)**:
- `pov-analysis-cache.ts`: 동일 영상 재분석 방지 (JSON 캐시, 100건 제한)
- `rateLimitedBatch`: API 429 방지 유틸 (배치 간 200ms 대기)
- 캐시 조회/삭제 API 라우트
- 골드스탠다드 임베딩 캐싱 (반복 API 호출 방지)

**남은 개선**:
- Server Components 활용 극대화 (RSC streaming)
- 영상 청크 업로드 (resumable upload)
- Web Worker 오프로딩
**난이도**: 중간

## 9. 다국어 지원

**현재**: 한국어 전용
**개선**:
- next-intl 또는 i18next 기반 다국어 프레임워크
- 영어, 일본어 등 해외 원전 교육 기관 대응
**난이도**: 낮음~중간

## 10. SOP 절차 데이터베이스 (POV 분석용) — ✅ 부분 해결

**현재 (2026-04-05 구현 완료)**:
- `pov-standards.ts`에 8개 절차(붙임1~8) 구조화 완료 (총 254단계)
- `pov-query-templates.ts`로 한국어 SOP → 영어 TwelveLabs 검색 쿼리 자동 변환
- DTW 알고리즘으로 SOP 순서 vs 실제 수행 순서 자동 비교
- 4유형 이탈 탐지: SWAP(순서 역전), SKIP(누락), INSERT(추가 행동), DELAY(지연)
- 핵심 단계(isCritical) 가중 감점 → S~F 등급 자동 산출

**남은 개선**:
- 절차 DB를 하드코딩에서 관리자 CRUD UI로 전환 (현재는 코드 내 상수)
- 절차 버전 관리 (SOP 개정 이력 추적)
- 새로운 절차 추가 시 쿼리 템플릿 자동 생성 (현재는 장비유형 추론 기반 자동생성이지만, 도메인 전문가 검증 필요)
**난이도**: 중간 (핵심 로직은 완성, 관리 UI 추가 수준)

## 11. POV 분석 고도화 (C 수준 확장) — ✅ 구현 완료

**현재 (2026-04-05 구현 완료)**:
- Pegasus 프롬프트에 품질 평가(0-100) + 한국어 코칭 피드백 요청
- `HandObjectEvent.qualityScore` + `qualityFeedback` 필드 활용
- `calculateQualityAdjustedScore`: 절차 점수에 품질 20% 블렌딩
- HandObjectTimeline UI에 품질 배지(녹/황/적) + 코칭 코멘트 표시

**남은 개선**:
- Pegasus 정확도 검증 (실제 영상으로 품질 점수 타당성 평가)
- 영상 재생 중 실시간 이탈 구간 자동 하이라이트
**난이도**: 중간 (핵심 로직 완성, 정확도 튜닝 수준)

## 12. 골드스탠다드 자동 누적 시스템 — ✅ 구현 완료

**현재 (2026-04-05 구현 완료)**:
- `getBestGoldStandard`: 절차별 최고 점수 기준 자동 선택
- `getOrFetchEmbeddings`: 캐시 우선, 미스 시 API 호출 후 저장
- `suggestGoldStandardCandidate`: A등급(85+) 자동 후보 판정 + 이유 텍스트
- 분석 엔진: goldStandardId 미지정 시 자동 선택
- GoldStandardManager UI: 3종 추천 배지 (최고점/등록가능/이미등록)

**남은 개선**:
- 골드스탠다드 구간 발췌 등록 UI (부분 등록)
**난이도**: 낮음

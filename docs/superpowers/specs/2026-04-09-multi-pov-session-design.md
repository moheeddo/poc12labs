# 멀티 POV 훈련 세션 분석 시스템 설계

## 개요

HPO센터 POV 분석을 단일 영상 → **훈련 세션 단위**로 확장.
동일 훈련 상황을 운전원 A POV + 운전원 B POV + 교관 관찰(옵션) 최대 3종 영상으로 촬영하고,
개별 역량 평가 + 교차 분석(3-Way Communication 등)을 수행한다.

## 핵심 요구사항

- **개별 분석이 핵심** — 운전원별 독립된 평가 리포트 생성
- **세션 종합은 보조** — A vs B 비교 + 세션 평균
- **교관 영상은 옵션** — 맥락 보완용, 평가 대상 아님
- **운전원 식별은 시스템 입력** — 사용자가 이름 직접 입력
- **근거 기반 평가** — 미흡 판정 시 타임스탬프 클릭 → 영상 재생 + 전사문 + AI 판정 근거
- **영상 업로드는 URL 방식 우선** — Vercel 4.5MB 제한으로 대용량 파일 직접 업로드 불가

## 아키텍처: 세션 래퍼

기존 6단계 분석 파이프라인을 그대로 재사용하고, 그 위에 세션 레이어를 추가한다.

```
[TrainingSession]
  ├── VideoSlot: 운전원A (필수)  ──→ 기존 PovAnalysis 파이프라인 ──→ PovEvaluationReport A
  ├── VideoSlot: 운전원B (선택)  ──→ 기존 PovAnalysis 파이프라인 ──→ PovEvaluationReport B
  └── VideoSlot: 교관 (옵션)     ──→ Transcription만 추출
                                          │
                                          ▼
                                  [교차 분석 후처리]
                                  ├── 오디오 동기화 (전사문 매칭)
                                  ├── 3-Way Communication 탐지
                                  └── 세션 종합 리포트 생성
```

### 데이터 모델

```typescript
interface TrainingSession {
  id: string;
  procedureId: string;
  procedureTitle: string;
  createdAt: string;
  operators: OperatorSlot[];       // 1~2명
  instructorSlot?: VideoSlot;      // 옵션
  syncOffset?: SyncResult;         // 동기화 결과
  sessionSummary?: SessionSummary; // 교차 분석 결과
}

interface OperatorSlot {
  role: 'operatorA' | 'operatorB';
  name: string;                    // 사용자 입력
  videoId?: string;                // TwelveLabs video ID
  videoUrl?: string;               // 업로드 URL
  report?: PovEvaluationReport;    // 개별 분석 결과
  transcription?: TranscriptSegment[]; // 전사문
}

interface VideoSlot {
  videoId?: string;
  videoUrl?: string;
  transcription?: TranscriptSegment[];
}

interface TranscriptSegment {
  start: number;   // 초
  end: number;
  text: string;
  speaker?: string; // 화자 (추정)
}

interface SyncResult {
  offsetAtoB: number;     // A 기준 B의 오프셋 (초). B_time = A_time + offset
  offsetAtoInst?: number; // A 기준 교관의 오프셋
  confidence: number;     // 동기화 신뢰도 0-100
  matchedPhrases: { phraseA: string; timeA: number; timeB: number }[];
}

interface SessionSummary {
  averageScore: number;
  gradeDistribution: { operatorName: string; grade: string; score: number }[];
  threeWayComm?: ThreeWayCommResult;
  comparisonHighlights: string[]; // "A는 X에서 우수, B는 Y에서 우수"
}
```

## UI 설계

### 1. 세션 생성 (올인원 폼)

기존 phase "select" 화면에 세션 생성 폼을 통합한다.
절차 선택 → 운전원 이름 입력 → 영상 업로드(파일 또는 URL) → 분석 시작을 한 화면에서 처리.

```
┌─────────────────────────────────────────────┐
│  🎯 새 훈련 세션                              │
│                                              │
│  절차: [냉각수계통 기동 ▾]   세션명: [자동생성]  │
│                                              │
│  ┌─ 운전원 A ──┐  ┌─ 운전원 B ──┐  ┌─ 교관 ──┐ │
│  │ 이름: [   ] │  │ 이름: [   ] │  │ (옵션)  │ │
│  │ 📎 URL/파일 │  │ 📎 URL/파일 │  │ + 추가  │ │
│  └─────────────┘  └─────────────┘  └─────────┘ │
│                                              │
│  [세션 분석 시작]                              │
└─────────────────────────────────────────────┘
```

- 운전원 A는 필수, B는 선택 (비워두면 단일 분석)
- 교관 슬롯은 기본 숨김, "교관 영상 추가" 클릭 시 노출
- URL 업로드 우선, 파일 업로드는 로컬 환경에서만 권장

### 2. 분석 진행 화면

기존 AnalysisProgress 컴포넌트를 확장하여 멀티 영상 진행 상태를 표시.

```
운전원 A (김철수)  ████████░░  82%  [HPO 검증 중]
운전원 B (이영희)  █████░░░░░  55%  [시퀀스 매칭 중]
교차 분석          ░░░░░░░░░░  대기  [개별 분석 완료 후 시작]
```

### 3. 리포트 화면

#### 상단: 세션 정보 + 평균 점수
#### 탭: 운전원A | 운전원B | 세션 종합

- **운전원 탭**: 기존 PovEvaluationReport 그대로 표시 (종합/SOP단계/손-물체/HPO/시간)
  - 새로 추가: **3-Way Comm 서브탭** (영상 2개일 때만)
- **세션 종합**: A vs B 비교 + 세션 평균 + 교차 분석 인사이트
- 영상이 1개뿐이면 탭 없이 기존과 동일하게 표시 (하위 호환)

### 4. 근거 기반 평가 인터랙션

SOP 단계별 평가 목록에서:

- **통과** 단계: 접혀있음 (클릭하면 근거 확인 가능)
- **미흡/부분** 단계: 클릭 시 근거 패널 토글
  - **좌측**: 해당 타임스탬프 구간 영상 자동 재생
  - **우측**: 전사문 타임라인 (클릭 시 영상 해당 시점 이동) + AI 판정 근거
  - **하단**: "운전원B 같은 시점 →" / "교관 시점 →" 크로스 비디오 점프 링크

## 오디오 자동 동기화

### POC 단계: 전사문 텍스트 매칭

1. 각 영상에서 TwelveLabs transcription 추출
2. 동일 발화 패턴을 퍼지 매칭으로 탐색 (Levenshtein distance ≤ 3)
3. 매칭된 발화 쌍의 타임스탬프 차이를 수집
4. 중앙값을 오프셋으로 채택 (아웃라이어 제거)
5. 매칭 3개 이상이면 신뢰도 "높음", 1~2개면 "낮음", 0개면 동기화 불가

### 본사업 확장: 오디오 핑거프린팅 + 시작 신호음

## API 변경

### 새 엔드포인트

```
POST /api/session/create        세션 생성 + 분석 시작
GET  /api/session/status?id=    세션 전체 진행 상태
GET  /api/session/report?id=    세션 리포트 (개별 + 종합)
POST /api/session/sync          전사문 기반 동기화 실행
```

### 기존 엔드포인트 변경 없음

`/api/twelvelabs/upload`, `/api/twelvelabs/pov-analyze` 등 기존 API는 그대로 유지.
세션 API가 내부적으로 기존 API를 호출하는 오케스트레이션 레이어.

## 컴포넌트 구조

### 새로 생성
- `SessionCreateForm` — 올인원 세션 생성 폼
- `SessionProgress` — 멀티 영상 분석 진행 상태
- `SessionReport` — 운전원 탭 + 세션 종합 래퍼
- `EvidencePanel` — 근거 기반 평가 패널 (영상 + 전사문 + AI 판정)
- `TranscriptTimeline` — 전사문 타임라인 (클릭 → 영상 시크)
- `CrossVideoLink` — 크로스 비디오 점프 링크
- `useTrainingSession` — 세션 상태 관리 훅
- `useTranscriptSync` — 전사문 동기화 훅

### 기존 재사용
- `PovAnalysis` — 세션 모드 분기 추가 (phase 확장)
- `AnalysisProgress` — 멀티 슬롯 지원 확장
- `StepsTimeline` — EvidencePanel 연동
- `SyncVideoPlayer` — 3영상 지원으로 확장
- `VideoUploader` — URL 업로드 우선 모드

## 제약사항

- Vercel 서버리스: 파일 업로드 4.5MB 제한 → URL 업로드 사용
- TwelveLabs API: 영상당 분석 시간 수 분 소요 → 병렬 분석으로 최적화
- POC 범위: 동기화는 전사문 매칭만 (오디오 핑거프린팅은 본사업)
- 세션 데이터 저장: /tmp (Vercel) 또는 data/ (로컬), 영속성 없음 (POC)

## 하위 호환

- 운전원 1명만 입력 시 기존 단일 영상 분석과 동일하게 동작
- 기존 PovEvaluationReport 타입 변경 없음
- 기존 분석 이력(analysis-history.json)에 session ID 필드만 추가

# POV 영상분석 API 레퍼런스

> KHNP HPO센터 POV 훈련 평가 시스템 — API 문서
> 총 14개 엔드포인트 · 데모 모드 지원

---

## 목차

1. [헬스체크](#1-헬스체크)
2. [분석 파이프라인](#2-분석-파이프라인)
   - POST /api/twelvelabs/pov-analyze
   - GET /api/twelvelabs/pov-analyze/status
   - GET/DELETE /api/twelvelabs/pov-analyze/cache
3. [골드스탠다드](#3-골드스탠다드)
4. [이력 관리](#4-이력-관리)
   - GET/DELETE /api/twelvelabs/pov-history
   - GET /api/twelvelabs/pov-history/trend
5. [코호트 및 벤치마크](#5-코호트-및-벤치마크)
   - GET /api/twelvelabs/pov-cohort
   - GET /api/twelvelabs/pov-benchmark
6. [의사소통 분석](#6-의사소통-분석)
7. [피드백 뱅크](#7-피드백-뱅크)
8. [교수자 노트](#8-교수자-노트)
9. [포트폴리오](#9-포트폴리오)
10. [평가 일정](#10-평가-일정)

---

## 공통 사항

- 모든 응답은 `Content-Type: application/json` (UTF-8)
- `TWELVELABS_API_KEY` 환경변수 미설정 시 자동 **데모 모드** 전환 — 모조 데이터 반환
- 에러 응답 형식: `{ "error": "에러 메시지" }`
- 날짜/시간은 ISO 8601 형식 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- 데이터 영속 저장소: 서버 로컬 `data/` 폴더 내 JSON 파일

---

## 1. 헬스체크

### `GET /api/health`

**설명:** TwelveLabs API 연결 상태 및 데모 모드 활성화 여부를 반환한다. 클라이언트 초기화 시 호출하여 운영/데모 모드를 판별하는 데 사용한다.

**요청:**
- 파라미터 없음

**응답:**
```json
{
  "twelvelabs": {
    "configured": true,
    "connected": true,
    "indexExists": true,
    "lastChecked": "2026-04-04T09:00:00.000Z"
  },
  "demoMode": false
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `twelvelabs.configured` | boolean | `TWELVELABS_API_KEY` 환경변수 설정 여부 |
| `twelvelabs.connected` | boolean | TwelveLabs API 실제 응답 여부 (5초 타임아웃) |
| `twelvelabs.indexExists` | boolean | POV 인덱스 존재 여부 |
| `twelvelabs.lastChecked` | string | 마지막 헬스체크 시각 (ISO 8601) |
| `demoMode` | boolean | API 키 미설정 또는 연결 실패 시 `true` |

**에러:**
- `500`: 내부 서버 오류 (발생 빈도 낮음)

---

## 2. 분석 파이프라인

### `POST /api/twelvelabs/pov-analyze`

**설명:** POV 영상에 대한 6단계 분석 파이프라인을 비동기로 시작한다. 즉시 `jobId`를 반환하며, 진행 상태는 `/status` 엔드포인트로 폴링한다.

6단계 파이프라인:
1. `stepDetection` — SOP 단계 탐지
2. `handObject` — 손/기기 접촉 탐지
3. `sequenceMatch` — 시퀀스 매칭 (DTW)
4. `hpoVerification` — HPO 기법 적용 검증
5. `embeddingComparison` — 골드스탠다드 임베딩 비교
6. `scoring` — 최종 점수 산출

> **데모 모드:** `TWELVELABS_API_KEY` 미설정 시 즉시 모조 분석 결과를 반환하며 `status: 'complete'` 상태로 응답한다.
> **캐시 히트:** 동일 `videoId + procedureId` 조합이 이미 분석된 경우 파이프라인을 건너뛰고 즉시 완료 상태를 반환한다.

**요청 Body:**
```json
{
  "videoId": "tlvideo_abc123",
  "procedureId": "EOP-E0-1",
  "goldStandardId": "gs-1712345678901"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `videoId` | string | 필수 | TwelveLabs 업로드 영상 ID |
| `procedureId` | string | 필수 | 평가 대상 절차 ID (예: `EOP-E0-1`) |
| `goldStandardId` | string | 선택 | 비교 기준 골드스탠다드 ID |

**응답 (202):**
```json
{
  "jobId": "pov-1712345678901-abc123",
  "status": "analyzing"
}
```

**에러:**
- `400`: `videoId` 또는 `procedureId` 누락
- `500`: 파이프라인 시작 실패

---

### `GET /api/twelvelabs/pov-analyze/status`

**설명:** 진행 중인 분석 작업의 상태 및 진행률을 반환한다. `status === 'complete'` 일 때 `result` 필드에 최종 평가 리포트가 포함된다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `jobId` | string | 필수 | `POST /pov-analyze` 응답의 `jobId` |

예시: `GET /api/twelvelabs/pov-analyze/status?jobId=pov-1712345678901-abc123`

**응답:**
```json
{
  "status": "analyzing",
  "progress": 60,
  "stages": {
    "stepDetection": "done",
    "handObject": "done",
    "sequenceMatch": "done",
    "hpoVerification": "running",
    "embeddingComparison": "pending",
    "scoring": "pending"
  },
  "result": null,
  "error": null
}
```

완료 시 (`status === 'complete'`):
```json
{
  "status": "complete",
  "progress": 100,
  "stages": {
    "stepDetection": "done",
    "handObject": "done",
    "sequenceMatch": "done",
    "hpoVerification": "done",
    "embeddingComparison": "done",
    "scoring": "done"
  },
  "result": {
    "videoId": "tlvideo_abc123",
    "procedureId": "EOP-E0-1",
    "procedureTitle": "붙임1. 반응도 제어 불능",
    "date": "2026-04-04",
    "overallScore": 82,
    "grade": "B+",
    "stepEvaluations": [ "..." ],
    "hpoEvaluations": [ "..." ],
    "deviations": [ "..." ],
    "fundamentalScores": [ "..." ]
  }
}
```

| `status` 값 | 설명 |
|-------------|------|
| `analyzing` | 파이프라인 진행 중 |
| `complete` | 분석 완료, `result` 포함 |
| `error` | 분석 실패, `error` 필드에 메시지 |

| `stages` 단계 상태 | 설명 |
|-------------------|------|
| `pending` | 대기 중 |
| `running` | 현재 실행 중 |
| `done` | 완료 |
| `error` | 해당 단계 실패 |

**에러:**
- `400`: `jobId` 파라미터 누락
- `404`: 해당 `jobId`의 작업 없음 (서버 재시작 후 인메모리 초기화 시 발생 가능)

---

### `GET /api/twelvelabs/pov-analyze/cache`

**설명:** 특정 영상+절차 조합의 분석 결과 캐시를 조회한다. 캐시 히트 여부를 사전 확인하여 불필요한 파이프라인 실행을 방지한다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `videoId` | string | 필수 | 영상 ID |
| `procedureId` | string | 필수 | 절차 ID |

예시: `GET /api/twelvelabs/pov-analyze/cache?videoId=tlvideo_abc123&procedureId=EOP-E0-1`

**응답 (캐시 미스):**
```json
{ "cached": false }
```

**응답 (캐시 히트):**
```json
{
  "cached": true,
  "report": {
    "videoId": "tlvideo_abc123",
    "procedureId": "EOP-E0-1",
    "overallScore": 82,
    "grade": "B+"
  }
}
```

**에러:**
- 파라미터 누락 시 `{ "cached": false }` 반환 (에러 아님)

---

### `DELETE /api/twelvelabs/pov-analyze/cache`

**설명:** 분석 결과 캐시를 삭제한다. `videoId` 지정 시 해당 영상의 캐시만, 미지정 시 전체 캐시를 삭제한다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `videoId` | string | 선택 | 삭제할 영상 ID. 미지정 시 전체 삭제 |

예시 (특정 삭제): `DELETE /api/twelvelabs/pov-analyze/cache?videoId=tlvideo_abc123`
예시 (전체 삭제): `DELETE /api/twelvelabs/pov-analyze/cache`

**응답:**
```json
{ "cleared": 3 }
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `cleared` | number | 삭제된 캐시 항목 수 |

**에러:**
- 없음 (항상 200 반환)

---

## 3. 골드스탠다드

### `GET /api/twelvelabs/gold-standard`

**설명:** 등록된 골드스탠다드(숙련자 기준 영상) 목록을 조회한다. 절차 ID로 필터링 가능하다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `procedureId` | string | 선택 | 필터링할 절차 ID. 미지정 시 전체 반환 |

예시: `GET /api/twelvelabs/gold-standard?procedureId=EOP-E0-1`

**응답:**
```json
[
  {
    "id": "gs-1712345678901",
    "procedureId": "EOP-E0-1",
    "videoId": "tlvideo_gold123",
    "registeredBy": "평가관",
    "registeredAt": "2026-04-01T09:00:00.000Z",
    "averageScore": 92,
    "segmentRange": { "start": 0, "end": 180 },
    "embeddings": []
  }
]
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 골드스탠다드 ID (`gs-{timestamp}`) |
| `procedureId` | string | 대상 절차 ID |
| `videoId` | string | TwelveLabs 영상 ID |
| `registeredBy` | string | 등록자 이름 |
| `registeredAt` | string | 등록 시각 (ISO 8601) |
| `averageScore` | number | 해당 영상의 평균 점수 |
| `segmentRange` | object \| undefined | 기준으로 사용할 영상 구간 (초 단위) |
| `embeddings` | number[][] | 캐시된 임베딩 벡터 배열 (없으면 빈 배열) |

**에러:**
- `500`: 파일 읽기 오류

---

### `POST /api/twelvelabs/gold-standard`

**설명:** 새 골드스탠다드를 등록한다. 85점 이상 우수 리포트 영상을 기준 영상으로 등록하는 데 사용한다.

**요청 Body:**
```json
{
  "procedureId": "EOP-E0-1",
  "videoId": "tlvideo_gold123",
  "registeredBy": "김평가관",
  "averageScore": 92,
  "segmentRange": { "start": 0, "end": 180 }
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `procedureId` | string | 필수 | 절차 ID |
| `videoId` | string | 필수 | TwelveLabs 영상 ID |
| `registeredBy` | string | 선택 | 등록자 이름 (기본값: `"평가관"`) |
| `averageScore` | number | 선택 | 영상의 평균 점수 (기본값: `0`) |
| `segmentRange` | object | 선택 | `{ start: number, end: number }` — 영상 구간 (초) |

**응답 (201):**
```json
{
  "id": "gs-1712345678901",
  "procedureId": "EOP-E0-1",
  "videoId": "tlvideo_gold123",
  "registeredBy": "김평가관",
  "registeredAt": "2026-04-04T09:00:00.000Z",
  "averageScore": 92,
  "segmentRange": { "start": 0, "end": 180 }
}
```

**에러:**
- `400`: `procedureId` 또는 `videoId` 누락
- `500`: 등록 실패

---

### `DELETE /api/twelvelabs/gold-standard`

**설명:** 특정 골드스탠다드를 삭제한다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | 필수 | 삭제할 골드스탠다드 ID |

예시: `DELETE /api/twelvelabs/gold-standard?id=gs-1712345678901`

**응답:**
```json
{ "deleted": true }
```

`deleted: false` 는 해당 ID가 존재하지 않음을 의미한다.

**에러:**
- `400`: `id` 파라미터 누락

---

## 4. 이력 관리

### `GET /api/twelvelabs/pov-history`

**설명:** POV 분석 이력을 조회한다. 전체 목록 또는 단건 조회가 가능하며, 절차 ID로 필터링할 수 있다. 결과는 최신순으로 반환된다 (최대 200건 영속).

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | 선택 | 지정 시 단건 조회 |
| `procedureId` | string | 선택 | 절차 ID 필터 |
| `limit` | number | 선택 | 반환 건수 제한 (기본값: `50`) |

예시 (목록): `GET /api/twelvelabs/pov-history?procedureId=EOP-E0-1&limit=10`
예시 (단건): `GET /api/twelvelabs/pov-history?id=hist-1712345678901`

**응답 (목록):**
```json
[
  {
    "id": "hist-1712345678901",
    "videoId": "tlvideo_abc123",
    "procedureId": "EOP-E0-1",
    "procedureTitle": "붙임1. 반응도 제어 불능",
    "date": "2026-04-04",
    "grade": "B+",
    "overallScore": 82,
    "report": { "..." : "PovEvaluationReport 전체 객체" },
    "createdAt": "2026-04-04T09:00:00.000Z"
  }
]
```

**응답 (단건):** 위 객체 1개를 직접 반환

**에러:**
- `404`: `id` 지정 시 해당 이력 없음

---

### `DELETE /api/twelvelabs/pov-history`

**설명:** 특정 이력 항목을 삭제한다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | 필수 | 삭제할 이력 ID |

예시: `DELETE /api/twelvelabs/pov-history?id=hist-1712345678901`

**응답:**
```json
{ "deleted": true }
```

**에러:**
- `400`: `id` 파라미터 누락

---

### `GET /api/twelvelabs/pov-history/trend`

**설명:** 특정 절차의 점수 추이를 차트용 데이터로 반환한다. 오래된 순서로 정렬되어 있어 시계열 차트에 바로 사용 가능하다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `procedureId` | string | 필수 | 절차 ID |
| `limit` | number | 선택 | 반환할 최대 데이터 포인트 수 (기본값: `10`) |

예시: `GET /api/twelvelabs/pov-history/trend?procedureId=EOP-E0-1&limit=10`

**응답:**
```json
[
  { "date": "2026-03-01", "score": 71, "grade": "C+" },
  { "date": "2026-03-15", "score": 76, "grade": "B" },
  { "date": "2026-04-04", "score": 82, "grade": "B+" }
]
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `date` | string | 평가 날짜 (`YYYY-MM-DD`) |
| `score` | number | 종합 점수 (0-100) |
| `grade` | string | 등급 (`S`, `A`, `B+`, `B`, `C+`, `C`, `D`) |

**에러:**
- `400`: `procedureId` 파라미터 누락

---

## 5. 코호트 및 벤치마크

### `GET /api/twelvelabs/pov-cohort`

**설명:** 전체 훈련생 코호트 수준의 집계 메트릭을 반환한다. 이력 파일의 모든 평가 결과를 분석하여 절차별 성과, 취약 단계, HPO 적용률, 개입 권고 알림 등을 산출한다.

**요청:**
- 파라미터 없음

**응답:**
```json
{
  "totalEvaluations": 42,
  "averageScore": 74,
  "gradeDistribution": { "S": 2, "A": 8, "B+": 12, "B": 10, "C+": 6, "C": 3, "D": 1 },
  "procedureMetrics": [
    {
      "procedureId": "EOP-E0-1",
      "procedureTitle": "붙임1. 반응도 제어 불능",
      "evaluationCount": 15,
      "averageScore": 78,
      "passRate": 73,
      "failureRate": 7,
      "commonDeviations": [
        { "type": "critical", "count": 5, "percentage": 33 }
      ]
    }
  ],
  "weakestSteps": [
    {
      "stepId": "ECCS 기동 밸브 확인...",
      "description": "ECCS 기동 밸브 확인 및 조작",
      "procedureId": "EOP-E0-1",
      "procedureTitle": "붙임1. 반응도 제어 불능",
      "failRate": 67,
      "totalEvaluations": 15,
      "isCritical": true
    }
  ],
  "hpoAdoptionRates": [
    {
      "toolId": "selfCheck",
      "toolName": "STAR 기법",
      "category": "자기진단",
      "adoptionRate": 45,
      "trend": "up"
    }
  ],
  "fundamentalAverages": [
    {
      "id": "control",
      "name": "보수적 판단",
      "avgScore": 72,
      "trend": "stable"
    }
  ],
  "interventionAlerts": [
    {
      "type": "stepFailure",
      "severity": "high",
      "message": "단계 실패율 67% — \"ECCS 기동 밸브 확인...\"",
      "detail": "붙임1. 반응도 제어 불능의 해당 단계에서 15건 중 10건 실패",
      "recommendation": "교육 커리큘럼에 해당 단계 집중 훈련을 추가하고..."
    }
  ]
}
```

| 개입 알림 타입 | 트리거 조건 |
|---------------|-------------|
| `stepFailure` | 단계 실패율 > 40% |
| `lowScore` | 절차 평균 점수 < 60 |
| `hpoGap` | HPO 도구 적용률 < 30% (2건 이상 평가 시) |
| `criticalViolation` | 중요 단계 위반율 > 20% |

**에러:**
- `500`: 코호트 집계 실패

---

### `GET /api/twelvelabs/pov-benchmark`

**설명:** 분기별(또는 월별) 교육과정 효과를 벤치마킹한다. 기간별 평균 점수, 합격률, 핵심 이탈 건수, HPO 적용률을 집계하고 최근 기간 vs 이전 기간 변화량 및 한국어 인사이트를 자동 생성한다.

> 데이터가 단일 분기에 집중된 경우 자동으로 월별 분할을 적용한다.

**요청:**
- 파라미터 없음

**응답:**
```json
{
  "periods": [
    {
      "label": "2026-1Q",
      "startDate": "2026-01-01",
      "endDate": "2026-03-31",
      "evaluationCount": 18,
      "averageScore": 71,
      "gradeDistribution": { "B+": 6, "B": 7, "C+": 5 },
      "passRate": 72,
      "criticalViolationRate": 1.8,
      "hpoAdoptionRate": 43
    },
    {
      "label": "2026-2Q",
      "startDate": "2026-04-01",
      "endDate": "2026-06-30",
      "evaluationCount": 24,
      "averageScore": 76,
      "gradeDistribution": { "A": 3, "B+": 10, "B": 8, "C+": 3 },
      "passRate": 88,
      "criticalViolationRate": 1.2,
      "hpoAdoptionRate": 58
    }
  ],
  "improvement": {
    "scoreChange": 5,
    "passRateChange": 16,
    "criticalReduction": 0.6,
    "hpoImprovement": 15,
    "trend": "improving"
  },
  "insights": [
    "2026-2Q 평균 점수가 2026-1Q 대비 5.0점 상승했습니다 (71점 → 76점).",
    "핵심 단계 이탈 건수가 평균 1.8건에서 1.2건으로 감소했습니다.",
    "HPO 기법 적용률이 15% 향상되었습니다 (43% → 58%).",
    "합격률(B 이상)이 72%에서 88%로 16%p 상승했습니다."
  ],
  "totalEvaluations": 42,
  "dataRange": { "from": "2026-01-05", "to": "2026-04-04" }
}
```

| `improvement.trend` | 조건 |
|--------------------|------|
| `improving` | 점수 변화 ≥ +3점 또는 합격률 변화 ≥ +5%p |
| `declining` | 점수 변화 ≤ -3점 또는 합격률 변화 ≤ -5%p |
| `stable` | 그 외 |

**에러:**
- `500`: 벤치마킹 데이터 생성 실패

---

## 6. 의사소통 분석

### `POST /api/twelvelabs/pov-communication`

**설명:** POV 영상의 음성/의사소통 역량을 TwelveLabs 오디오 모달리티를 활용하여 분석한다. 3-Way Communication, 보고, 확인 등 의사소통 이벤트를 탐지하고 종합 점수를 산출한다.

> **데모 모드:** `TWELVELABS_API_KEY` 미설정 시 모조 분석 결과 반환.

**요청 Body:**
```json
{
  "videoId": "tlvideo_abc123"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `videoId` | string | 필수 | TwelveLabs 업로드 영상 ID |

**응답:**
```json
{
  "events": [
    {
      "timestamp": 12.5,
      "endTime": 18.3,
      "type": "threeWay",
      "speaker": "운전원",
      "content": "ECCS 기동 밸브 개방 지시 복창",
      "quality": 85,
      "feedback": "3-Way Communication을 정확히 수행함"
    },
    {
      "timestamp": 45.0,
      "endTime": 52.1,
      "type": "report",
      "speaker": "운전원",
      "content": "제어실 상황 보고",
      "quality": 70
    }
  ],
  "threeWayCount": 3,
  "reportCount": 2,
  "totalSpeakingTime": 120,
  "communicationScore": 78,
  "feedback": [
    "3-Way Communication을 총 3회 수행하였습니다.",
    "보고 빈도가 적습니다 — 주요 조작 후 즉시 보고하는 습관이 필요합니다."
  ]
}
```

| 이벤트 타입 | 한국어 명칭 |
|------------|------------|
| `threeWay` | 3-Way Communication |
| `report` | 상태 보고 |
| `confirmation` | 확인 절차 |
| `briefing` | 작업 브리핑 |
| `question` | 확인 질문 |
| `instruction` | 지시 전달 |

**에러:**
- `400`: `videoId` 누락
- `500`: 의사소통 분석 실패

---

## 7. 피드백 뱅크

### `GET /api/twelvelabs/pov-feedback-bank`

**설명:** 피드백 템플릿 목록을 조회한다. 파일이 없으면 16개 기본 템플릿으로 자동 초기화된다. 결과는 사용 횟수 내림차순 정렬(인기순)이다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `category` | string | 선택 | `strength`, `improvement`, `critical`, `hpo`, `general` 또는 `all` |

예시: `GET /api/twelvelabs/pov-feedback-bank?category=strength`

**응답:**
```json
[
  {
    "id": "fb-1",
    "category": "strength",
    "subcategory": "절차준수",
    "text": "절차서를 참조하며 정확한 순서로 수행함",
    "competencyKey": "control",
    "hpoToolKey": null,
    "useCount": 12,
    "createdAt": "2026-04-01T09:00:00.000Z",
    "lastUsedAt": "2026-04-04T08:30:00.000Z"
  }
]
```

| `category` | 설명 |
|-----------|------|
| `strength` | 강점 피드백 |
| `improvement` | 개선 필요 사항 |
| `critical` | 핵심 위반 지적 |
| `hpo` | HPO 기법 관련 |
| `general` | 일반 종합 의견 |

**에러:**
- 없음 (항상 200 반환)

---

### `POST /api/twelvelabs/pov-feedback-bank`

**설명:** 피드백 템플릿 사용 횟수를 증가시키거나 새 템플릿을 추가한다. `action: 'use'` 필드로 두 동작을 구분한다.

**요청 Body (사용 횟수 증가):**
```json
{
  "action": "use",
  "id": "fb-1"
}
```

**응답 (사용 횟수 증가):**
업데이트된 `FeedbackTemplate` 객체 반환

---

**요청 Body (신규 템플릿 추가):**
```json
{
  "category": "strength",
  "subcategory": "STAR",
  "text": "조작 전 반드시 멈추고 절차를 확인하는 습관이 매우 우수함",
  "competencyKey": "control",
  "hpoToolKey": "selfCheck"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `category` | string | 필수 | `strength` \| `improvement` \| `critical` \| `hpo` \| `general` |
| `subcategory` | string | 선택 | 세부 분류 레이블 |
| `text` | string | 필수 | 피드백 텍스트 내용 |
| `competencyKey` | string | 선택 | 관련 운전원 기본수칙 키 |
| `hpoToolKey` | string | 선택 | 관련 HPO 도구 키 |

**응답 (신규 추가):** 생성된 `FeedbackTemplate` 객체 반환

**에러:**
- `404`: `action: 'use'` 시 해당 ID 템플릿 없음

---

### `DELETE /api/twelvelabs/pov-feedback-bank`

**설명:** 특정 피드백 템플릿을 삭제한다. 기본 템플릿(`fb-1` ~ `fb-16`)도 삭제 가능하다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | 필수 | 삭제할 템플릿 ID |

예시: `DELETE /api/twelvelabs/pov-feedback-bank?id=fb-1`

**응답:**
```json
{ "deleted": true }
```

**에러:**
- `400`: `id` 파라미터 누락

---

## 8. 교수자 노트

### `GET /api/twelvelabs/pov-instructor-notes`

**설명:** 교수자가 작성한 노트를 조회한다. `type` 파라미터로 특수 조회 모드를 선택할 수 있으며, `reportId`/`stepId`로 세밀하게 필터링할 수 있다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `type` | string | 선택 | `calibration` (캘리브레이션 요약) 또는 `flagged` (판정 어려운 노트) |
| `reportId` | string | 선택 | 특정 리포트의 노트만 조회 |
| `stepId` | string | 선택 | 특정 단계의 노트만 조회 (`reportId`와 함께 사용) |

예시 (특정 리포트): `GET /api/twelvelabs/pov-instructor-notes?reportId=pov-1712345678901`
예시 (캘리브레이션 요약): `GET /api/twelvelabs/pov-instructor-notes?type=calibration`
예시 (플래그된 노트): `GET /api/twelvelabs/pov-instructor-notes?type=flagged`

**응답 (노트 목록):**
```json
[
  {
    "id": "note-1712345678901",
    "reportId": "pov-1712345678901",
    "stepId": "step-3",
    "authorName": "김교수",
    "createdAt": "2026-04-04T09:00:00.000Z",
    "category": "calibration",
    "content": "AI 판정 오류 — 실제로는 절차를 준수했으나 화각 문제로 누락 탐지됨",
    "flagged": true,
    "overrideData": {
      "originalStatus": "fail",
      "newStatus": "pass",
      "reason": "영상 화각 문제로 오탐"
    }
  }
]
```

**응답 (`type=calibration`):**
```json
{
  "totalOverrides": 8,
  "overridesByCategory": {
    "calibration": 5,
    "ambiguousEvidence": 2,
    "workaround": 1
  },
  "mostOverriddenSteps": [
    {
      "stepId": "step-3",
      "count": 3,
      "reasons": ["영상 화각 문제", "조명 불량으로 기기번호 미확인"]
    }
  ],
  "aiAccuracyEstimate": 89
}
```

| 노트 카테고리 | 설명 |
|--------------|------|
| `calibration` | AI 판정 조정 (오버라이드) |
| `workaround` | 대안적 절차 수행 인정 |
| `studentContext` | 훈련생 개인 상황 메모 |
| `ambiguousEvidence` | 판단 불명확 근거 |
| `general` | 일반 메모 |

**에러:**
- 없음 (항상 200 반환)

---

### `POST /api/twelvelabs/pov-instructor-notes`

**설명:** 새 교수자 노트를 추가한다. 최대 500건을 유지하며 초과 시 가장 오래된 노트를 삭제한다.

**요청 Body:**
```json
{
  "reportId": "pov-1712345678901",
  "stepId": "step-3",
  "authorName": "김교수",
  "category": "calibration",
  "content": "AI 판정 오류 — 실제로는 절차를 준수했으나 화각 문제로 누락 탐지됨",
  "flagged": true,
  "overrideData": {
    "originalStatus": "fail",
    "newStatus": "pass",
    "reason": "영상 화각 문제로 오탐"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `reportId` | string | 필수 | 연관 리포트 ID |
| `stepId` | string | 선택 | 해당 절차 단계 ID |
| `authorName` | string | 필수 | 작성자 이름 |
| `category` | string | 필수 | `calibration` \| `workaround` \| `studentContext` \| `ambiguousEvidence` \| `general` |
| `content` | string | 필수 | 노트 내용 |
| `flagged` | boolean | 필수 | 판정 주의 여부 |
| `overrideData` | object | 선택 | AI 판정 오버라이드 정보 (`{ originalStatus, newStatus, reason }`) |

**응답:** 생성된 `InstructorNote` 객체 반환 (id, createdAt 포함)

**에러:**
- `500`: 저장 실패

---

### `DELETE /api/twelvelabs/pov-instructor-notes`

**설명:** 특정 교수자 노트를 삭제한다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | 필수 | 삭제할 노트 ID |

예시: `DELETE /api/twelvelabs/pov-instructor-notes?id=note-1712345678901`

**응답:**
```json
{ "deleted": true }
```

**에러:**
- `400`: `id` 파라미터 누락

---

## 9. 포트폴리오

### `GET /api/twelvelabs/pov-portfolio`

**설명:** 훈련생 목록을 조회하거나, 특정 훈련생의 종합 포트폴리오 요약을 반환한다. `id` 지정 시 해당 훈련생의 모든 평가 이력을 집계하여 역량 프로필, 숙달 수준, 인증 준비 여부 등을 산출한다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | 선택 | 특정 훈련생 ID. 지정 시 포트폴리오 요약 반환 |

예시 (목록): `GET /api/twelvelabs/pov-portfolio`
예시 (요약): `GET /api/twelvelabs/pov-portfolio?id=trainee-1712345678901`

**응답 (훈련생 목록):**
```json
[
  {
    "id": "trainee-1712345678901",
    "name": "김운전원",
    "department": "운전1팀",
    "startDate": "2026-03-01",
    "createdAt": "2026-03-01T09:00:00.000Z"
  }
]
```

**응답 (포트폴리오 요약, `id` 지정 시):**
```json
{
  "trainee": {
    "id": "trainee-1712345678901",
    "name": "김운전원",
    "department": "운전1팀",
    "startDate": "2026-03-01",
    "createdAt": "2026-03-01T09:00:00.000Z"
  },
  "totalEvaluations": 12,
  "proceduresCompleted": ["EOP-E0-1", "EOP-E0-2"],
  "proceduresInProgress": ["EOP-E1-1"],
  "proceduresNotStarted": ["EOP-E2-1", "EOP-E3-1"],
  "overallMasteryLevel": 2,
  "latestScores": [
    {
      "procedureId": "EOP-E0-1",
      "procedureTitle": "붙임1. 반응도 제어 불능",
      "score": 88,
      "grade": "A",
      "date": "2026-04-04"
    }
  ],
  "competencyProfile": [
    {
      "id": "control",
      "name": "보수적 판단",
      "avgScore": 84,
      "level": 2,
      "trend": "up"
    }
  ],
  "strengths": ["절차 준수", "STAR 기법 적용"],
  "areasForGrowth": ["3-Way Communication", "이중확인"],
  "certificationReady": false,
  "nextRecommendation": "EOP-E1-1 절차 집중 훈련 권장"
}
```

| `overallMasteryLevel` | 설명 |
|----------------------|------|
| `0` | 미훈련 |
| `1` | 기초 수준 (C 이하) |
| `2` | 중급 수준 (B~B+) |
| `3` | 숙달 (A~S) |

**에러:**
- `404`: `id` 지정 시 해당 훈련생 없음

---

### `POST /api/twelvelabs/pov-portfolio`

**설명:** 새 훈련생을 등록한다.

**요청 Body:**
```json
{
  "name": "김운전원",
  "department": "운전1팀"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | 필수 | 훈련생 이름 (공백만인 경우 오류) |
| `department` | string | 선택 | 소속 부서 |

**응답 (201):**
```json
{
  "id": "trainee-1712345678901",
  "name": "김운전원",
  "department": "운전1팀",
  "startDate": "2026-04-04",
  "createdAt": "2026-04-04T09:00:00.000Z"
}
```

**에러:**
- `400`: `name` 누락 또는 빈 문자열

---

### `DELETE /api/twelvelabs/pov-portfolio`

**설명:** 훈련생을 삭제한다. 관련 분석 이력은 유지된다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | 필수 | 삭제할 훈련생 ID |

예시: `DELETE /api/twelvelabs/pov-portfolio?id=trainee-1712345678901`

**응답:**
```json
{ "deleted": true }
```

**에러:**
- `400`: `id` 파라미터 누락

---

## 10. 평가 일정

### `GET /api/twelvelabs/pov-schedule`

**설명:** 평가 일정 목록 또는 이번 주 요약을 반환한다. 오늘 날짜 이전이고 `scheduled` 상태인 일정은 자동으로 `overdue`로 처리된다. 결과는 예정일 오름차순 정렬이다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `type` | string | 선택 | `week` 지정 시 이번 주 요약 반환 |
| `traineeName` | string | 선택 | 훈련생 이름 필터 |
| `procedureId` | string | 선택 | 절차 ID 필터 |
| `status` | string | 선택 | `scheduled` \| `completed` \| `cancelled` \| `overdue` |
| `fromDate` | string | 선택 | 시작 날짜 필터 (`YYYY-MM-DD`) |
| `toDate` | string | 선택 | 종료 날짜 필터 (`YYYY-MM-DD`) |

예시 (전체): `GET /api/twelvelabs/pov-schedule`
예시 (필터): `GET /api/twelvelabs/pov-schedule?status=scheduled&fromDate=2026-04-01`
예시 (주간 요약): `GET /api/twelvelabs/pov-schedule?type=week`

**응답 (목록):**
```json
[
  {
    "id": "sched-1712345678901",
    "traineeName": "김운전원",
    "procedureId": "EOP-E0-1",
    "procedureTitle": "붙임1. 반응도 제어 불능",
    "scheduledDate": "2026-04-10",
    "scheduledTime": "09:00",
    "type": "initial",
    "status": "scheduled",
    "notes": "첫 번째 평가",
    "previousReportId": null,
    "createdAt": "2026-04-04T09:00:00.000Z"
  }
]
```

**응답 (`type=week`):**
```json
{
  "today": [ ],
  "thisWeek": [
    {
      "id": "sched-1712345678901",
      "traineeName": "김운전원",
      "scheduledDate": "2026-04-08",
      "type": "initial",
      "status": "scheduled"
    }
  ],
  "overdue": [
    {
      "id": "sched-1712000000000",
      "traineeName": "이운전원",
      "scheduledDate": "2026-03-28",
      "type": "retest",
      "status": "overdue"
    }
  ]
}
```

| `type` 값 | 설명 |
|-----------|------|
| `initial` | 초기 평가 |
| `retest` | 재평가 |
| `certification` | 인증 평가 |

| `status` 값 | 설명 |
|------------|------|
| `scheduled` | 예정됨 |
| `completed` | 완료 |
| `cancelled` | 취소됨 |
| `overdue` | 지연됨 (자동 전환) |

**에러:**
- 없음 (항상 200 반환)

---

### `POST /api/twelvelabs/pov-schedule`

**설명:** 새 평가 일정을 등록하거나 기존 일정의 상태를 변경한다. `action: 'updateStatus'` 필드로 두 동작을 구분한다.

**요청 Body (신규 일정 등록):**
```json
{
  "traineeName": "김운전원",
  "procedureId": "EOP-E0-1",
  "procedureTitle": "붙임1. 반응도 제어 불능",
  "scheduledDate": "2026-04-10",
  "scheduledTime": "09:00",
  "type": "initial",
  "notes": "첫 번째 평가",
  "previousReportId": null
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `traineeName` | string | 필수 | 훈련생 이름 |
| `procedureId` | string | 필수 | 절차 ID |
| `procedureTitle` | string | 필수 | 절차 제목 |
| `scheduledDate` | string | 필수 | 예정 날짜 (`YYYY-MM-DD`) |
| `scheduledTime` | string | 선택 | 예정 시각 (`HH:MM`) |
| `type` | string | 필수 | `initial` \| `retest` \| `certification` |
| `notes` | string | 선택 | 메모 |
| `previousReportId` | string | 선택 | 재평가 시 이전 리포트 ID |

**응답 (신규 등록):** 생성된 `ScheduleEntry` 객체 반환 (초기 `status: 'scheduled'`)

---

**요청 Body (상태 변경):**
```json
{
  "action": "updateStatus",
  "id": "sched-1712345678901",
  "status": "completed"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `action` | string | 필수 | `"updateStatus"` 고정값 |
| `id` | string | 필수 | 변경할 일정 ID |
| `status` | string | 필수 | `scheduled` \| `completed` \| `cancelled` \| `overdue` |

**응답 (상태 변경):**
```json
{ "updated": true }
```

**에러:**
- `400`: 신규 등록 시 필수 필드 누락 (`traineeName`, `procedureId`, `procedureTitle`, `scheduledDate`, `type`)
- `400`: 상태 변경 시 `id` 또는 `status` 누락
- `500`: 요청 처리 실패

---

### `DELETE /api/twelvelabs/pov-schedule`

**설명:** 특정 평가 일정을 삭제한다.

**요청 Query Params:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | 필수 | 삭제할 일정 ID |

예시: `DELETE /api/twelvelabs/pov-schedule?id=sched-1712345678901`

**응답:**
```json
{ "deleted": true }
```

**에러:**
- `400`: `id` 파라미터 누락

---

## 부록: 데이터 저장 구조

모든 영속 데이터는 서버 로컬 `data/` 폴더에 JSON 파일로 저장된다.

| 파일 | 용도 | 최대 보관 |
|------|------|----------|
| `data/analysis-cache.json` | 분석 결과 캐시 | 100건 |
| `data/analysis-history.json` | 분석 이력 | 200건 |
| `data/gold-standards.json` | 골드스탠다드 목록 | 제한 없음 |
| `data/feedback-bank.json` | 피드백 템플릿 | 제한 없음 |
| `data/instructor-notes.json` | 교수자 노트 | 500건 |
| `data/trainee-portfolios.json` | 훈련생 프로필 | 제한 없음 |
| `data/evaluation-schedule.json` | 평가 일정 | 제한 없음 |

> **주의:** 분석 작업(`jobStore`)은 서버 인메모리에만 저장되므로 서버 재시작 시 초기화된다. 완료된 분석 결과는 캐시 및 이력 파일에 영속 저장된다.

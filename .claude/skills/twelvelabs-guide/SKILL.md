---
name: twelvelabs-guide
description: TwelveLabs API 워크플로우 가이드. 인덱스 생성, 영상 업로드, 검색, 분석, 임베딩 등 API 사용법을 단계별로 안내합니다. TwelveLabs 처음 사용하는 개발자를 위한 레퍼런스.
---

# TwelveLabs API 워크플로우 가이드

사용자가 `/twelvelabs-guide`를 호출하면 아래 단계를 안내합니다.
$ARGUMENTS가 있으면 해당 단계/주제에 집중합니다.

## 안내 원칙
- 각 API 호출의 파라미터, 응답 구조, 일반적인 에러를 상세히 설명
- MCP 도구(mcp__twelvelabs-mcp__*)와 REST API 양쪽 사용법을 비교 설명
- 이 프로젝트의 3개 인덱스(khnp-nhpai-simulator, khnp-leadership-coaching, khnp-pov-training)에 맞춘 예시 제공

## 워크플로우 단계

### 1단계: 인덱스 관리
- `list-indexes`로 기존 인덱스 확인
- `create-index`로 새 인덱스 생성 (visual, audio 옵션 설명)
- 인덱스별 용도와 설정 차이 안내

### 2단계: 영상 업로드 및 인덱싱
- `start-video-indexing-task`로 영상 업로드
- `get-video-indexing-tasks`로 인덱싱 진행 상태 확인
- 인덱싱 완료까지의 대기 시간, 파일 크기 제한 안내

### 3단계: 영상 검색 (Search)
- `search`로 자연어 기반 영상 내 구간 검색
- 검색 쿼리 작성 팁 (구체적 행동 기술 vs 추상적 표현)
- 검색 결과의 confidence score 해석

### 4단계: 영상 분석 (Analyze)
- `analyse-video`로 요약, 챕터, 하이라이트 생성
- 분석 프롬프트 작성 요령
- 결과를 프론트엔드 UI에 맵핑하는 방법

### 5단계: 임베딩 (Embeddings)
- `start-video-embeddings-task`로 벡터 임베딩 생성
- `retrieve-video-embeddings`로 임베딩 조회
- 영상 간 유사도 비교 활용법 (숙련자 vs 비숙련자 POV 비교)

### 6단계: Next.js API 라우트 연동
- `/api/twelvelabs/*` 서버사이드 라우트 구조
- API Key 보안 (서버사이드에서만 사용)
- 클라이언트 → API 라우트 → TwelveLabs 흐름 설명

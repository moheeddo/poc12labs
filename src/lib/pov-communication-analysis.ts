// =============================================
// HPO-21: 음성/의사소통 분석 엔진
// TwelveLabs의 audio 모달리티를 활용하여
// 3-Way Communication, 보고, 확인 장면을 탐지하고
// 의사소통 역량을 정밀 평가한다
// =============================================

import { searchVideos, generateWithPrompt } from './twelvelabs';

// ── 공개 타입 ──

export interface CommunicationEvent {
  timestamp: number;
  endTime: number;
  type: 'threeWay' | 'report' | 'confirmation' | 'briefing' | 'question' | 'instruction';
  speaker: string;        // "운전원" | "동료" | "제어실" | "미확인"
  content: string;        // 발화 내용 요약
  quality: number;        // 0-100 (의사소통 품질 점수)
  feedback?: string;      // 코칭 피드백
}

export interface CommunicationAnalysis {
  events: CommunicationEvent[];
  threeWayCount: number;          // 3-Way Communication 횟수
  reportCount: number;             // 보고 횟수
  totalSpeakingTime: number;       // 총 발화 시간 (초)
  communicationScore: number;      // 종합 의사소통 점수 (0-100)
  feedback: string[];              // 종합 피드백 문구 목록
}

// ── 의사소통 이벤트 타입 라벨 ──

export const COMM_EVENT_LABELS: Record<CommunicationEvent['type'], string> = {
  threeWay: '3-Way Communication',
  report: '상태 보고',
  confirmation: '확인 절차',
  briefing: '작업 브리핑',
  question: '확인 질문',
  instruction: '지시 전달',
};

// ── TwelveLabs 검색 → 이벤트 파싱 ──

async function searchCommunicationEvents(
  indexId: string,
  queries: string[],
  type: CommunicationEvent['type'],
  speaker: string,
  content: string,
): Promise<CommunicationEvent[]> {
  const events: CommunicationEvent[] = [];

  for (const query of queries) {
    try {
      const result = await searchVideos(indexId, query);
      const matches = result?.data || [];

      for (const match of matches.slice(0, 5)) {
        // TwelveLabs 신뢰도는 문자열 'high' | 'medium' | 'low' 또는 0-1 숫자
        const confidenceRaw = match.confidence as unknown;
        let confidenceNum: number;
        if (typeof confidenceRaw === 'string') {
          confidenceNum = confidenceRaw === 'high' ? 0.85 : confidenceRaw === 'medium' ? 0.6 : 0.35;
        } else {
          confidenceNum = Number(confidenceRaw) || 0;
        }

        if (confidenceNum >= 0.4) {
          events.push({
            timestamp: match.start || 0,
            endTime: match.end || 0,
            type,
            speaker,
            content,
            quality: Math.round(confidenceNum * 100),
          });
        }
      }
    } catch {
      // 개별 쿼리 실패는 무시하고 계속 진행
    }
  }

  return events;
}

// ── 메인 분석 함수 ──

/**
 * TwelveLabs를 활용한 음성/의사소통 분석
 * @param videoId TwelveLabs에 인덱싱된 영상 ID
 * @param indexId TwelveLabs 인덱스 ID
 */
export async function analyzeCommunication(
  videoId: string,
  indexId: string
): Promise<CommunicationAnalysis> {
  const rawEvents: CommunicationEvent[] = [];

  // ── 1. 3-Way Communication 장면 검색 ──
  const threeWayEvents = await searchCommunicationEvents(
    indexId,
    [
      'operator repeating instruction back for confirmation',
      'person verbally confirming a command or instruction',
      'two people exchanging verbal confirmation of an action',
    ],
    'threeWay',
    '운전원',
    '3-Way Communication 수행',
  );
  rawEvents.push(...threeWayEvents);

  // ── 2. 보고 장면 검색 ──
  const reportEvents = await searchCommunicationEvents(
    indexId,
    [
      'person speaking into radio or phone reporting status',
      'operator verbally reporting to supervisor or control room',
    ],
    'report',
    '운전원',
    '상태 보고',
  );
  rawEvents.push(...reportEvents);

  // ── 3. 확인 절차 장면 검색 ──
  const confirmEvents = await searchCommunicationEvents(
    indexId,
    [
      'operator checking valve or equipment and verbally confirming state',
      'worker pointing at equipment while speaking',
    ],
    'confirmation',
    '운전원',
    '설비 상태 확인',
  );
  rawEvents.push(...confirmEvents);

  // ── 4. Pegasus로 전체 의사소통 품질 종합 평가 ──

  let communicationScore = 50;
  let feedback: string[] = [];

  try {
    const prompt = `Analyze the communication quality in this nuclear plant operator training video.
Evaluate:
1. Are there instances of 3-Way Communication (repeat-back confirmation)?
2. Does the operator clearly report actions and status?
3. Is the operator's voice clear and confident?
4. Are there any communication gaps or missed confirmations?

Respond in JSON only (no markdown):
{
  "score": 0-100,
  "threeWayInstances": number,
  "reportInstances": number,
  "voiceClarity": 0-100,
  "feedback": ["Korean feedback 1", "Korean feedback 2"]
}`;

    const response = await generateWithPrompt(videoId, prompt);
    const jsonMatch = response.data.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]) as {
        score?: number;
        feedback?: string[];
      };
      communicationScore = data.score ?? 50;
      feedback = data.feedback ?? [];
    }
  } catch {
    // Pegasus 실패 시 기본값 유지
  }

  // ── 5. 중복 이벤트 제거 (3초 내 동일 타입 중복 제거) ──

  const uniqueEvents = rawEvents.filter((e, i, arr) =>
    !arr.some((other, j) => j < i && other.type === e.type && Math.abs(other.timestamp - e.timestamp) < 3)
  );

  const threeWayCount = uniqueEvents.filter((e) => e.type === 'threeWay').length;
  const reportCount = uniqueEvents.filter((e) => e.type === 'report').length;
  const totalSpeaking = uniqueEvents.reduce((sum, e) => sum + Math.max(0, e.endTime - e.timestamp), 0);

  // ── 6. 기본 피드백 자동 생성 (Pegasus 결과 없을 때) ──

  if (feedback.length === 0) {
    if (threeWayCount >= 3) {
      feedback.push('3-Way Communication을 적극적으로 활용하고 있습니다.');
    } else if (threeWayCount >= 1) {
      feedback.push('3-Way Communication이 일부 확인되었으나 빈도를 높일 필요가 있습니다.');
    } else {
      feedback.push('3-Way Communication 적용이 확인되지 않았습니다. 명령 복창 훈련을 권장합니다.');
    }

    if (reportCount >= 2) {
      feedback.push('절차 중 상태 보고가 적절히 이루어지고 있습니다.');
    } else {
      feedback.push('절차 수행 중 제어실 보고 빈도를 높여야 합니다.');
    }

    if (communicationScore >= 80) {
      feedback.push('전반적인 의사소통 품질이 우수합니다.');
    } else if (communicationScore >= 60) {
      feedback.push('의사소통 품질이 양호하나 발화 명확성 개선이 필요합니다.');
    } else {
      feedback.push('의사소통 역량 향상을 위한 집중 훈련을 권장합니다.');
    }
  }

  return {
    events: uniqueEvents.sort((a, b) => a.timestamp - b.timestamp),
    threeWayCount,
    reportCount,
    totalSpeakingTime: Math.round(totalSpeaking),
    communicationScore,
    feedback,
  };
}

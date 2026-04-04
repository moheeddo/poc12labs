// ISO 10667 동의 관리 — 참가자 동의 항목 정의, 기록 생성, 필수 동의 확인
import type { ConsentItem, ConsentRecord } from "./types";

// 현재 동의서 버전 (개정 시 버전업)
const CONSENT_VERSION = "1.0.0";

// 필수 동의 유형 목록
const REQUIRED_CONSENT_TYPES = new Set<ConsentRecord["consentType"]>([
  "video_recording",
  "ai_analysis",
  "data_retention",
]);

/**
 * 전체 동의 항목 목록 반환 (UI 렌더링용)
 * ISO 10667 §6 참가자 권리 보장을 위해 설명 포함
 */
export function getConsentItems(): ConsentItem[] {
  return [
    {
      type: "video_recording",
      label: "영상 녹화 동의",
      description:
        "평가 세션 중 수행되는 모든 활동이 영상으로 녹화됩니다. 녹화된 영상은 역량 평가 분석에만 활용됩니다.",
      required: true,
    },
    {
      type: "ai_analysis",
      label: "AI 분석 활용 동의",
      description:
        "녹화된 영상 및 관련 데이터를 TwelveLabs AI 모델로 분석합니다. AI 분석 결과는 인간 평가자의 검토를 거쳐 최종 점수에 반영됩니다.",
      required: true,
    },
    {
      type: "data_retention",
      label: "데이터 보존 동의",
      description:
        "평가 데이터(영상, 점수, 피드백)는 최대 3년간 보존됩니다. 보존 기간 만료 후 자동 삭제되며, 본인 요청 시 즉시 삭제 가능합니다.",
      required: true,
    },
    {
      type: "report_sharing",
      label: "리포트 공유 동의 (선택)",
      description:
        "생성된 역량 평가 리포트를 HR 부서 및 직속 상급자와 공유합니다. 동의하지 않을 경우 본인만 열람 가능합니다.",
      required: false,
    },
  ];
}

/**
 * 동의 기록 생성 — DB 저장 전 기본 객체 반환
 * 실제 저장은 호출부(API route)에서 assessment-store의 addConsent() 사용
 */
export function createConsentRecord(
  participantId: string,
  sessionId: string,
  consentType: ConsentRecord["consentType"],
  agreed: boolean,
): ConsentRecord {
  return {
    id: crypto.randomUUID(),
    participantId,
    sessionId,
    consentType,
    agreed,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
}

/**
 * 필수 동의 전체 완료 여부 확인
 * @param records 참가자의 현재 동의 기록 배열
 * @returns { allRequired: boolean; missing: string[] }
 */
export function checkAllRequiredConsents(records: ConsentRecord[]): {
  allRequired: boolean;
  missing: ConsentRecord["consentType"][];
} {
  // agreed=true인 동의 유형만 수집
  const agreedTypes = new Set(
    records.filter((r) => r.agreed).map((r) => r.consentType),
  );

  // 필수 항목 중 미동의 항목 추출
  const missing = Array.from(REQUIRED_CONSENT_TYPES).filter(
    (type) => !agreedTypes.has(type),
  ) as ConsentRecord["consentType"][];

  return {
    allRequired: missing.length === 0,
    missing,
  };
}

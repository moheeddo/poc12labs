// POST /api/compliance/consent
// 참가자 동의 기록 생성 — ISO 10667 §6 참가자 권리 보장
import { NextResponse } from "next/server";
import { createConsentRecord } from "@/lib/compliance";
import type { ConsentRecord } from "@/lib/compliance";

const VALID_CONSENT_TYPES: ConsentRecord["consentType"][] = [
  "video_recording",
  "ai_analysis",
  "data_retention",
  "report_sharing",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { participantId, sessionId, consentType, agreed } = body as {
      participantId: string;
      sessionId: string;
      consentType: ConsentRecord["consentType"];
      agreed: boolean;
    };

    // 필수 필드 검증
    if (!participantId || typeof participantId !== "string") {
      return NextResponse.json(
        { error: "participantId가 필요합니다." },
        { status: 400 },
      );
    }
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId가 필요합니다." },
        { status: 400 },
      );
    }
    if (!VALID_CONSENT_TYPES.includes(consentType)) {
      return NextResponse.json(
        {
          error: `consentType이 유효하지 않습니다. 허용 값: ${VALID_CONSENT_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (typeof agreed !== "boolean") {
      return NextResponse.json(
        { error: "agreed 필드는 boolean이어야 합니다." },
        { status: 400 },
      );
    }

    // 동의 기록 생성 (서버 사이드 — Dexie는 클라이언트 전용이므로 기록 객체만 반환)
    // 실제 DB 저장은 클라이언트에서 assessment-store.addConsent()로 처리
    const record = createConsentRecord(
      participantId,
      sessionId,
      consentType,
      agreed,
    );

    // 필수 항목 거부 시 경고 포함
    const requiredTypes = new Set(["video_recording", "ai_analysis", "data_retention"]);
    const warning =
      !agreed && requiredTypes.has(consentType)
        ? `'${consentType}'은 필수 동의 항목입니다. 동의하지 않으면 평가 세션에 참여할 수 없습니다.`
        : undefined;

    return NextResponse.json({
      record,
      ...(warning ? { warning } : {}),
    });
  } catch (error) {
    console.error("[compliance/consent] 오류:", error);
    return NextResponse.json(
      { error: "동의 기록 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

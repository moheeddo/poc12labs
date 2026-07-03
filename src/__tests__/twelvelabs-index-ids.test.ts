import { describe, it, expect } from "vitest";
import { TWELVELABS_INDEXES } from "@/lib/constants";

// =============================================
// 회귀 테스트 — TwelveLabs 인덱스 ID 드리프트 방지
//
// 배경(2026-07-03): 프로덕션 poc12labs.vercel.app에서 영상 업로드/분석이 매번
// "resource_not_exists(404)"로 실패하고 느렸다. 근본 원인 = constants.ts / 라우트
// 폴백에 박힌 하드코딩 UUID가 실 계정에 존재하지 않는 인덱스를 가리킴.
// (사용자는 대용량 영상을 서버로 전부 올린 뒤에야 같은 404를 봄 → "느리고 똑같은 오류")
//
// 이 테스트는 그 죽은 UUID가 코드로 다시 기어들어오면 실패한다.
// =============================================

// 계정에 실재하지 않았던 죽은 인덱스 ID (재발 감시 대상)
const DEAD_INDEX_IDS = [
  "69ccf4b781e81bcd08ca5487", // leadership (구)
  "69ccf4b881e81bcd08ca5488", // pov (구)
];

describe("TwelveLabs 인덱스 ID 무결성", () => {
  it("어떤 인덱스도 실재하지 않는 죽은 UUID를 가리키지 않는다", () => {
    for (const [key, id] of Object.entries(TWELVELABS_INDEXES)) {
      expect(
        DEAD_INDEX_IDS,
        `TWELVELABS_INDEXES.${key} 가 죽은 인덱스 ID(${id})를 가리킴 — resource_not_exists 재발`,
      ).not.toContain(id);
    }
  });

  it("리더십 인덱스는 실재 인덱스 또는 env 재정의 값을 사용한다", () => {
    // env 미설정 시 기본값은 실 계정 인덱스여야 한다.
    const expected =
      process.env.NEXT_PUBLIC_TWELVELABS_LEADERSHIP_INDEX_ID ||
      "693fd1cfecc91a3546633cde";
    expect(TWELVELABS_INDEXES.leadership).toBe(expected);
  });

  it("인덱스 ID는 24자리 hex(ObjectId) 형식이어야 한다", () => {
    // placeholder-* 같은 비-ID 문자열이 API로 나가면 400/404를 유발한다.
    const objectIdRe = /^[0-9a-f]{24}$/;
    for (const [key, id] of Object.entries(TWELVELABS_INDEXES)) {
      expect(
        objectIdRe.test(id),
        `TWELVELABS_INDEXES.${key}(${id})가 24자리 hex ObjectId가 아님`,
      ).toBe(true);
    }
  });
});

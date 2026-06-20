import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 업로드 전용 임시 토큰 발급
// 브라우저가 TwelveLabs API에 직접 업로드할 때 사용
// 보안: same-origin 검증 + 캐시 방지 + 짧은 노출
export async function GET(request: NextRequest) {
  // same-origin 검증 — fail-closed + 정확한 host 매칭.
  // 이전 `origin && host && !origin.includes(host)`는 (1) Origin 헤더 부재(curl·서버사이드 fetch)시
  // 검사를 건너뛰는 fail-open, (2) 부분문자열 매칭(host=app.io ⊂ app.io.attacker.com)으로 우회됐다.
  // → 시크릿 반환 라우트이므로 Origin/Referer가 없거나 host가 정확히 일치하지 않으면 거부한다.
  const host = request.headers.get("host");
  const candidate = request.headers.get("origin") || request.headers.get("referer");
  let sameOrigin = false;
  if (host && candidate) {
    try { sameOrigin = new URL(candidate).host === host; } catch { sameOrigin = false; }
  }
  if (!sameOrigin) {
    return NextResponse.json({ error: "접근 거부 (same-origin 아님)" }, { status: 403 });
  }

  const apiKey = process.env.TWELVELABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });
  }

  return NextResponse.json(
    { token: apiKey },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}

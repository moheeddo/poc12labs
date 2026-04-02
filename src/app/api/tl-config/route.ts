import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TwelveLabs 업로드에 필요한 API 키 반환
// CDN rewrite 프록시(/api/tl-upload)에서 사용
// 보안: same-origin + Referer 검증 + 캐시 방지
export async function GET(request: NextRequest) {
  // 1. Origin 검증 — 같은 출처에서만 접근 허용
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ error: "접근 거부" }, { status: 403 });
  }

  // 2. Referer 검증 — 브라우저 요청만 허용 (curl 등 외부 도구 차단)
  const referer = request.headers.get("referer");
  if (!referer || (host && !referer.includes(host))) {
    return NextResponse.json({ error: "접근 거부" }, { status: 403 });
  }

  // 3. Sec-Fetch-Site 검증 — same-origin 요청만 허용
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return NextResponse.json({ error: "접근 거부" }, { status: 403 });
  }

  const apiKey = process.env.TWELVELABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });
  }

  // 캐시 방지 헤더
  return NextResponse.json(
    { apiKey },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    }
  );
}

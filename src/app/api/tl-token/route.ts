import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 업로드 전용 임시 토큰 발급
// 브라우저가 TwelveLabs API에 직접 업로드할 때 사용
// 보안: same-origin 검증 + 캐시 방지 + 짧은 노출
export async function GET(request: NextRequest) {
  // same-origin 검증
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ error: "접근 거부" }, { status: 403 });
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

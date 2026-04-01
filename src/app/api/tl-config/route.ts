import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TwelveLabs 업로드에 필요한 API 키를 반환
// 클라이언트가 CDN rewrite 프록시(/api/tl-upload)에 직접 헤더로 포함
export async function GET(request: NextRequest) {
  // 같은 출처에서만 접근 허용
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ error: "접근 거부" }, { status: 403 });
  }

  const apiKey = process.env.TWELVELABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });
  }

  return NextResponse.json({ apiKey });
}

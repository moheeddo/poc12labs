import { NextResponse } from "next/server";

// Vercel 서버리스 함수는 body 크기 제한(4.5MB)이 있어
// 영상 파일 프록시 대신, 클라이언트 직접 업로드를 위한 설정을 반환합니다.
// 클라이언트는 이 정보를 사용하여 TwelveLabs API로 직접 업로드합니다.

export async function GET() {
  const apiKey = process.env.TWELVELABS_API_KEY;
  const apiUrl = process.env.TWELVELABS_API_URL || "https://api.twelvelabs.io/v1.3";

  if (!apiKey) {
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다" }, { status: 500 });
  }

  return NextResponse.json({
    uploadUrl: `${apiUrl}/tasks`,
    apiKey,
  });
}

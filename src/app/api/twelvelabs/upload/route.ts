import { NextRequest, NextResponse } from "next/server";

// 서버 프록시 방식: 클라이언트 → 자체 API → TwelveLabs
// - CORS 문제 회피 (브라우저 → 외부 API 직접 요청 불가)
// - API 키 서버 사이드 보호 (클라이언트 노출 방지)
// - Vercel 서버리스 body 제한: ~4.5MB (Hobby 플랜)

const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB

export async function POST(request: NextRequest) {
  const apiKey = process.env.TWELVELABS_API_KEY;
  const apiUrl = process.env.TWELVELABS_API_URL || "https://api.twelvelabs.io/v1.3";

  if (!apiKey) {
    return NextResponse.json(
      { error: "API 키가 설정되지 않았습니다" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("video_file") as File | null;
    const indexId = formData.get("index_id") as string | null;

    if (!file || !indexId) {
      return NextResponse.json(
        { error: "영상 파일과 인덱스 ID가 필요합니다" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `파일 크기(${(file.size / 1024 / 1024).toFixed(1)}MB)가 제한(4.5MB)을 초과합니다. 더 짧은 영상을 사용해주세요.`,
        },
        { status: 413 }
      );
    }

    // TwelveLabs API로 프록시 업로드
    const tlForm = new FormData();
    tlForm.append("index_id", indexId);
    tlForm.append("video_file", file);

    const res = await fetch(`${apiUrl}/tasks`, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: tlForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = "업로드 실패";
      try {
        errMsg = JSON.parse(errText).message || errMsg;
      } catch {
        errMsg = errText || errMsg;
      }
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "업로드 중 오류 발생";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

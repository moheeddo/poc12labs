import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 보안 헤더 미들웨어
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // XSS 보호
  response.headers.set("X-Content-Type-Options", "nosniff");
  // 클릭재킹 방지
  response.headers.set("X-Frame-Options", "DENY");
  // Referrer 정보 제한
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // HTTPS 강제 (프로덕션)
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  // 권한 정책
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  // CSP — 인라인 스크립트/스타일 허용 (Next.js 필요), 외부 폰트 CDN 허용
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
      "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // API 라우트에 대한 추가 보안
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // API 라우트는 같은 출처에서만 접근 가능
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: "접근 거부" }, { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    // 정적 파일, _next, 업로드 API 제외 (업로드 스트리밍 body size 제한 방지)
    "/((?!_next/static|_next/image|favicon.ico|api/twelvelabs/upload).*)",
  ],
};

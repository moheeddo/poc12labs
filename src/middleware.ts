import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// CSP 정책 — 프로덕션/개발 분기
function buildCsp(): string {
  const directives = [
    "default-src 'self'",
    // 프로덕션: unsafe-eval 제거, 개발: HMR 위해 허용
    IS_PRODUCTION
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
    "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
    "img-src 'self' blob:",
    "media-src 'self' blob:",
    "connect-src 'self' https://api.twelvelabs.io https://*.amazonaws.com",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}

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
  if (IS_PRODUCTION) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  // 권한 정책
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  // CSP
  response.headers.set("Content-Security-Policy", buildCsp());

  // API 라우트에 대한 추가 보안
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    // 정확한 호스트명 비교 (origin.includes 우회 공격 방지)
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: "접근 거부" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "접근 거부" }, { status: 403 });
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // 정적 파일, _next, 업로드 API 제외
    "/((?!_next/static|_next/image|favicon.ico|api/twelvelabs/upload).*)",
  ],
};

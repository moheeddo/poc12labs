"use client";

// =============================================
// 전역 에러 바운더리 — Next.js App Router
// root layout·하이드레이션·청크 로드 실패 등 <main> 내부 ErrorBoundary "바깥"에서
// 발생한 uncaught 예외를 포착한다. 이게 없으면 Next 기본 영문 폴백
// ("Application error: a client-side exception has occurred")이 그대로 노출된다.
// (global-error는 자체적으로 <html>/<body>를 렌더해야 한다)
// =============================================

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 콘솔에 실제 원인 노출 (프로덕션에선 digest만 화면에 보이므로 디버깅용)
    console.error("[global-error]", error);
  }, [error]);

  // 배포 후 재방문자가 사라진 구 청크를 요청하면 ChunkLoadError가 난다.
  // 이 경우 reset()으로는 안 되고 전체 새로고침이 근본 해결(새 청크 fetch).
  const isChunkError =
    error?.name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed|dynamically imported module|Failed to fetch/i.test(
      error?.message || "",
    );

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f8f6",
          fontFamily:
            "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          color: "#0f172a",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "40px 28px",
            boxShadow: "0 10px 30px -12px rgba(15,23,42,0.12)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 20px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ecfdf5",
              color: "#047857",
              fontSize: "28px",
            }}
            aria-hidden
          >
            ⚠
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 10px" }}>
            일시적인 오류가 발생했습니다
          </h1>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.7,
              color: "#475569",
              margin: "0 0 24px",
            }}
          >
            {isChunkError
              ? "새 버전이 배포되어 화면을 다시 불러와야 합니다. 아래 버튼을 눌러 새로고침해 주세요."
              : "화면을 불러오는 중 문제가 발생했습니다. 다시 시도하거나 페이지를 새로고침해 주세요."}
          </p>
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                if (isChunkError) window.location.reload();
                else reset();
              }}
              style={{
                background: "#047857",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "12px 22px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#ffffff",
                color: "#334155",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "12px 22px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              새로고침
            </button>
          </div>
          {error?.digest && (
            <p
              style={{
                marginTop: "20px",
                fontSize: "11px",
                color: "#94a3b8",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              오류 ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}

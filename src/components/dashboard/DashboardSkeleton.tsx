import Skeleton from "@/components/shared/Skeleton";

/**
 * 대시보드 전용 로딩 스켈레톤
 *
 * Dashboard.tsx와 동일한 그리드 레이아웃을 유지하면서
 * 콘텐츠 영역을 shimmer 애니메이션으로 대체
 */
export default function DashboardSkeleton() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 md:py-8 animate-fade-in-up">
      {/* 헤더 영역 */}
      <div className="mb-8">
        <Skeleton variant="text" width="280px" height="28px" className="mb-2" />
        <Skeleton variant="text" width="360px" height="16px" />
        <div className="mt-3 h-px bg-gradient-to-r from-coral-500/60 via-teal-500/60 to-amber-500/60 animate-gradient-pulse" />
      </div>

      {/* 상태 카드 4개 — 스태거 등장 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-fade-in-up bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-lg p-4"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Skeleton variant="circular" width="16px" height="16px" />
              <Skeleton variant="text" width="60px" height="12px" />
            </div>
            <div className="flex items-baseline gap-1">
              <Skeleton variant="text" width="48px" height="28px" />
              <Skeleton variant="text" width="20px" height="12px" />
            </div>
          </div>
        ))}
      </div>

      {/* 서비스 카드 3개 — 시차 입장 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-fade-in-up bg-white border border-slate-200 rounded-xl p-6"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: "backwards" }}
          >
            {/* 아이콘 + 제목 */}
            <div className="flex items-center gap-2 mb-3">
              <Skeleton variant="circular" width="24px" height="24px" />
              <Skeleton variant="text" width="120px" height="20px" />
            </div>

            {/* 설명 텍스트 */}
            <div className="mb-4 space-y-1.5">
              <Skeleton variant="text" width="100%" height="14px" />
              <Skeleton variant="text" width="80%" height="14px" />
            </div>

            {/* 통계 하단 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Skeleton variant="circular" width="6px" height="6px" />
                <Skeleton variant="text" width="56px" height="12px" />
              </div>
              <Skeleton variant="text" width="14px" height="14px" className="ml-auto rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

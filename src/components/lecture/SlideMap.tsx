"use client";

// src/components/lecture/SlideMap.tsx
// 슬라이드별 커버리지 시각화

import type { SlideCoverage } from "@/lib/lecture-types";

interface SlideMapProps {
  coverages: SlideCoverage[];
}

// 커버리지 퍼센트에 따른 색상과 라벨
function getCoverageStyle(percent: number) {
  if (percent >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600", label: "충분" };
  if (percent >= 50) return { bar: "bg-amber-500", text: "text-amber-600", label: "부분" };
  if (percent >= 20) return { bar: "bg-orange-500", text: "text-orange-600", label: "부족" };
  return { bar: "bg-red-500", text: "text-red-500", label: "미전달" };
}

export default function SlideMap({ coverages }: SlideMapProps) {
  if (!coverages || coverages.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        슬라이드 커버리지 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {coverages.map((slide) => {
        const style = getCoverageStyle(slide.coveragePercent);
        // 제목이 길면 자르기
        const title = slide.slideTitle.length > 20
          ? slide.slideTitle.slice(0, 20) + "..."
          : slide.slideTitle;

        return (
          <div key={slide.slideIndex} className="group">
            <div className="flex items-center gap-2 mb-1">
              {/* 슬라이드 번호 */}
              <span className="text-xs font-mono text-slate-400 w-6 text-right shrink-0">
                {slide.slideIndex + 1}
              </span>
              {/* 슬라이드 제목 */}
              <span className="text-sm text-slate-600 flex-1 truncate" title={slide.slideTitle}>
                {title || `슬라이드 ${slide.slideIndex + 1}`}
              </span>
              {/* 퍼센트 */}
              <span className={`text-xs font-mono tabular-nums ${style.text}`}>
                {Math.round(slide.coveragePercent)}%
              </span>
              {/* 커버리지 라벨 */}
              <span className={`text-xs px-1.5 py-0.5 rounded ${style.text} bg-slate-50`}>
                {style.label}
              </span>
            </div>
            {/* 프로그레스 바 */}
            <div className="ml-8 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
                style={{ width: `${Math.min(slide.coveragePercent, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

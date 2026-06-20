import { cn } from "@/lib/utils";

interface BrandLockupProps {
  className?: string;
  /** Header처럼 group hover가 있는 클릭 영역 안에 둘 때 true — KHNP가 hover 시 emerald로 */
  interactive?: boolean;
}

/**
 * KHNP HRDI 브랜드 워드마크 (designmaster 'C' — 아이콘 제거, 타이포 중심)
 * 원자궤도·글로우·mint 슬롭을 제거하고 브랜드색(Navy #002855 · Emerald #006341)과
 * 의도적 tracking만으로 권위·정밀을 표현. 좌: KHNP 볼드 / 얇은 emerald 룰 / 우: 기관·제품 라인.
 */
export default function BrandLockup({ className = "", interactive = false }: BrandLockupProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "text-[21px] font-extrabold tracking-[-0.03em] text-khnp-navy leading-none",
          interactive && "transition-colors duration-300 group-hover:text-emerald-600"
        )}
      >
        KHNP
      </span>
      <span className="w-px h-6 bg-emerald-600/45 shrink-0" aria-hidden="true" />
      <span className="leading-tight">
        <span className="block text-[13px] font-bold tracking-[-0.01em] text-emerald-600">인재개발원 HRDI</span>
        <span className="block text-[10px] font-mono tracking-[0.1em] text-slate-500 mt-px">
          리더십 역량진단 · VIDEO AI
        </span>
      </span>
    </div>
  );
}

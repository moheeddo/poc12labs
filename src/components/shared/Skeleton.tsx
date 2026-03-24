import { cn } from "@/lib/utils";

type SkeletonVariant = "text" | "circular" | "rectangular" | "card";

interface SkeletonProps {
  /** 스켈레톤 형태 */
  variant?: SkeletonVariant;
  /** 너비 (CSS 값, e.g. "100%", "200px") */
  width?: string;
  /** 높이 (CSS 값, e.g. "20px", "3rem") */
  height?: string;
  /** 추가 클래스 */
  className?: string;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: "rounded-md h-4 w-full",
  circular: "rounded-full w-10 h-10",
  rectangular: "rounded-lg w-full h-24",
  card: "rounded-xl w-full h-40",
};

/**
 * 범용 스켈레톤 컴포넌트
 *
 * globals.css에 정의된 `.animate-shimmer` 활용
 * - surface-800 → surface-700 → surface-600 그라데이션 시머
 */
export default function Skeleton({
  variant = "text",
  width,
  height,
  className,
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="로딩 중"
      className={cn(
        "animate-shimmer bg-surface-700",
        variantStyles[variant],
        className,
      )}
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
    />
  );
}

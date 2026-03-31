import { useId } from "react";

interface KhnpLogoProps {
  className?: string;
  size?: number;
}

/**
 * KHNP HRDI 프리미엄 로고마크 — "Quantum Lens"
 * 원자 궤도(nuclear energy) + AI 렌즈(video analysis)를 결합한 심볼
 * 세 개의 궤도 경로가 중심 코어를 감싸는 구조
 */
export default function KhnpLogo({ className = "", size = 36 }: KhnpLogoProps) {
  const reactId = useId();
  const id = `khnp-${size}-${reactId.replace(/:/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="KHNP HRDI 로고"
    >
      <defs>
        {/* 코어 방사형 그라데이션 */}
        <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#00A040" />
          <stop offset="100%" stopColor="#065f46" />
        </radialGradient>

        {/* 코어 글로우 */}
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>

        {/* 궤도 그라데이션 — 3개 각각 다른 불투명도 */}
        <linearGradient id={`${id}-orbit1`} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#00A040" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id={`${id}-orbit2`} x1="48" y1="0" x2="0" y2="48">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#00A040" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={`${id}-orbit3`} x1="24" y1="0" x2="24" y2="48">
          <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#00A040" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* 외곽 글로우 배경 */}
      <circle cx="24" cy="24" r="20" fill={`url(#${id}-glow)`} />

      {/* 궤도 1 — 수평 타원 (가장 진함) */}
      <ellipse
        cx="24" cy="24" rx="20" ry="9"
        stroke={`url(#${id}-orbit1)`}
        strokeWidth="1.2"
        fill="none"
      />

      {/* 궤도 2 — 60도 회전 타원 */}
      <ellipse
        cx="24" cy="24" rx="20" ry="9"
        stroke={`url(#${id}-orbit2)`}
        strokeWidth="1.2"
        fill="none"
        transform="rotate(60 24 24)"
      />

      {/* 궤도 3 — -60도 회전 타원 */}
      <ellipse
        cx="24" cy="24" rx="20" ry="9"
        stroke={`url(#${id}-orbit3)`}
        strokeWidth="1.2"
        fill="none"
        transform="rotate(-60 24 24)"
      />

      {/* 중심 코어 */}
      <circle cx="24" cy="24" r="5" fill={`url(#${id}-core)`} />

      {/* 코어 하이라이트 (빛 반사) */}
      <circle cx="22.5" cy="22.5" r="2" fill="white" opacity="0.3" />

      {/* 궤도 위 전자 (3개 — 각 궤도에 하나씩) */}
      <circle cx="44" cy="24" r="2" fill="#34d399" opacity="0.9" />
      <circle cx="14" cy="6.7" r="1.6" fill="#6ee7b7" opacity="0.7" />
      <circle cx="14" cy="41.3" r="1.3" fill="#a7f3d0" opacity="0.5" />
    </svg>
  );
}

import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// 초 단위 시간을 MM:SS 포맷으로 변환
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// 파일 크기를 읽기 쉬운 포맷으로 변환
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// 점수에 따른 등급 반환
export function getGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "A+", color: "text-emerald-400" };
  if (score >= 80) return { grade: "A", color: "text-green-400" };
  if (score >= 70) return { grade: "B+", color: "text-teal-400" };
  if (score >= 60) return { grade: "B", color: "text-blue-400" };
  if (score >= 50) return { grade: "C", color: "text-amber-400" };
  return { grade: "D", color: "text-red-400" };
}

// 등급에 따른 한 줄 설명 반환
export function getGradeDescription(grade: string): string {
  switch (grade) {
    case "A+": return "탁월한 수준";
    case "A":  return "우수한 수준";
    case "B+": return "양호한 수준";
    case "B":  return "보통 수준";
    case "C":  return "개선 필요";
    case "D":  return "미흡";
    default:   return "";
  }
}

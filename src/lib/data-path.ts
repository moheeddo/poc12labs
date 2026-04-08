import path from "path";
import { existsSync, mkdirSync } from "fs";

/**
 * 데이터 파일 경로 — Vercel 서버리스 환경에서는 /tmp 사용
 * 로컬 개발 시에는 프로젝트 data/ 폴더 사용
 */
export function getDataPath(filename: string): string {
  const isVercel = !!process.env.VERCEL;
  const dir = isVercel ? "/tmp" : path.join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

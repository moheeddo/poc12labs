import path from "path";
import { existsSync, mkdirSync } from "fs";

/**
 * 데이터 파일 경로 — Vercel 서버리스 환경에서는 /tmp 사용
 * 로컬 개발 시에는 프로젝트 data/ 폴더 사용
 */
export function getDataPath(filename: string): string {
  const isVercel = !!process.env.VERCEL;
  // KHNP_DATA_DIR 오버라이드 — 테스트가 워커별 임시 디렉터리로 격리해 실 data/ 오염·
  // 파일 공유 경쟁(flaky)을 차단하는 용도. 프로덕션에서는 미설정이라 기존 동작 유지.
  const dir = process.env.KHNP_DATA_DIR
    ? process.env.KHNP_DATA_DIR
    : isVercel
      ? "/tmp"
      : path.join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

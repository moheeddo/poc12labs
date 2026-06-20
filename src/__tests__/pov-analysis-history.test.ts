import { describe, it, expect, beforeEach } from "vitest";
import { writeFileSync, rmSync, existsSync } from "fs";
import { getDataPath } from "@/lib/data-path";
import { getHistory, getScoreTrend } from "@/lib/pov-analysis-history";

// setup.ts가 KHNP_DATA_DIR을 워커별 임시 경로로 설정하므로 이 경로는 lib 내부 DATA_PATH와 동일.
const HISTORY_PATH = getDataPath("analysis-history.json");

// iter29 회귀: readHistory()가 JSON.parse를 try 없이 호출 → 빈/손상 파일에서 미처리 500.
// 이제 try/catch + 배열검증으로 []를 반환해야 한다.
describe("pov-analysis-history — 손상 JSON 견고성 (iter29)", () => {
  beforeEach(() => {
    if (existsSync(HISTORY_PATH)) rmSync(HISTORY_PATH);
  });

  it("빈 파일이면 [] 반환(미처리 500 방지)", () => {
    writeFileSync(HISTORY_PATH, "", "utf-8");
    expect(getHistory()).toEqual([]);
    expect(getScoreTrend("proc-1")).toEqual([]);
  });

  it("잘린/손상 JSON이면 [] 반환", () => {
    writeFileSync(HISTORY_PATH, '[{"id":"x", "procedureId', "utf-8");
    expect(getHistory()).toEqual([]);
  });

  it("배열이 아닌 JSON이면 [] 반환", () => {
    writeFileSync(HISTORY_PATH, '{"not":"array"}', "utf-8");
    expect(getHistory()).toEqual([]);
  });

  it("파일이 아예 없으면 [] 반환", () => {
    expect(getHistory()).toEqual([]);
  });
});

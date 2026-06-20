import "fake-indexeddb/auto";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";

// 테스트 데이터 격리 — 각 vitest 워커(파일)가 고유 임시 디렉터리를 쓰게 해
// 실제 data/ 폴더 오염과 파일 공유 경쟁(병렬 테스트 flaky, 예: gold-standards.json)을 원천 차단.
// setupFiles는 테스트 모듈 import보다 먼저 평가되므로 모듈 레벨 `getDataPath()` 호출도 이 경로를 잡는다.
process.env.KHNP_DATA_DIR = mkdtempSync(path.join(tmpdir(), "khnp-test-data-"));

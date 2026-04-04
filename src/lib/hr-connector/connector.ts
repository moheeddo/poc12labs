import type { Employee, HRConnectorConfig, HRImportResult } from "./types";
import { calculateTenureYears } from "./masking";

const DEFAULT_MAPPING: Record<string, string> = {
  employeeId: "사원번호",
  name: "성명",
  department: "부서",
  jobLevel: "직급",
  gender: "성별",
  hireDate: "입사일",
};

export function parseCSV(
  csvText: string,
  config?: Partial<HRConnectorConfig>
): HRImportResult {
  const mapping = { ...DEFAULT_MAPPING, ...config?.fieldMapping };
  const lines = csvText.trim().split("\n");

  if (lines.length < 2) {
    return {
      success: false,
      imported: 0,
      errors: ["데이터 없음"],
      employees: [],
    };
  }

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/"/g, ""));
  const employees: Employee[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]
      .split(",")
      .map((v) => v.trim().replace(/"/g, ""));

    if (values.length < 3) {
      errors.push(`${i + 1}행: 필드 부족`);
      continue;
    }

    const getField = (key: string): string => {
      const header = mapping[key];
      const idx = headers.indexOf(header);
      return idx >= 0 ? values[idx] : "";
    };

    const employeeId = getField("employeeId");
    const name = getField("name");

    if (!employeeId || !name) {
      errors.push(`${i + 1}행: 사원번호 또는 성명 누락`);
      continue;
    }

    const hireDate = getField("hireDate");
    const jobLevelRaw = getField("jobLevel");
    const jobLevel = parseInt(jobLevelRaw) || inferJobLevel(jobLevelRaw);

    employees.push({
      employeeId,
      name,
      department: getField("department") || "미분류",
      jobLevel,
      gender: getField("gender") || undefined,
      hireDate: hireDate || undefined,
      tenureYears: hireDate ? calculateTenureYears(hireDate) : undefined,
    });
  }

  return {
    success: errors.length === 0,
    imported: employees.length,
    errors,
    employees,
  };
}

function inferJobLevel(raw: string): number {
  const map: Record<string, number> = {
    임원: 1,
    부장: 2,
    차장: 3,
    과장: 3,
    대리: 4,
    사원: 4,
    "1직급": 1,
    "2직급": 2,
    "3직급": 3,
    "4직급": 4,
  };
  return map[raw] || 3;
}

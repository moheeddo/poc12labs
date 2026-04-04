export interface Employee {
  employeeId: string;
  name: string;
  department: string;
  jobLevel: number;
  gender?: string;
  ageGroup?: "20s" | "30s" | "40s" | "50s+";
  tenureYears?: number;
  hireDate?: string;
}

export interface HRConnectorConfig {
  mode: "csv" | "api" | "ldap";
  fieldMapping: Record<string, string>;
}

export interface HRImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  employees: Employee[];
}

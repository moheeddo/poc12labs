export function maskName(name: string): string {
  if (name.length <= 1) return "*";
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

export function maskEmployeeId(id: string): string {
  if (id.length <= 4) return "****";
  return id.slice(0, 2) + "*".repeat(id.length - 4) + id.slice(-2);
}

export function calculateAgeGroup(
  birthYear: number
): "20s" | "30s" | "40s" | "50s+" {
  const age = new Date().getFullYear() - birthYear;
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  return "50s+";
}

export function calculateTenureYears(hireDate: string): number {
  const hire = new Date(hireDate);
  const now = new Date();
  return Math.floor(
    (now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
}

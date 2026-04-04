"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Users, AlertCircle, CheckCircle } from "lucide-react";
import { parseCSV, maskName } from "@/lib/hr-connector";
import type { Employee } from "@/lib/hr-connector";

interface HRConnectorPanelProps {
  onImport: (employees: Employee[]) => void;
}

export default function HRConnectorPanel({ onImport }: HRConnectorPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
    employees: Employee[];
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setParseError(null);
      setResult(null);

      // CSV 파일 형식 검사
      if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
        setParseError("CSV 파일(.csv)만 업로드할 수 있습니다.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) {
          setParseError("파일을 읽을 수 없습니다.");
          return;
        }

        const parsed = parseCSV(text);
        setResult({
          imported: parsed.imported,
          errors: parsed.errors,
          employees: parsed.employees,
        });

        if (parsed.success && parsed.employees.length > 0) {
          onImport(parsed.employees);
        }
      };
      reader.onerror = () => setParseError("파일 읽기 중 오류가 발생했습니다.");
      reader.readAsText(file, "utf-8");
    },
    [onImport]
  );

  // 드래그 이벤트 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // input 초기화 (같은 파일 재업로드 허용)
    e.target.value = "";
  };

  const hasErrors = result && result.errors.length > 0;
  const hasSuccess = result && result.imported > 0;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 space-y-5">
      {/* 헤더 */}
      <div>
        <h3 className="text-base font-semibold text-white">인사 DB 연동</h3>
        <p className="mt-1 text-xs text-white/50">
          CSV 파일로 참가자 명단을 불러옵니다. 필수 컬럼: 사원번호, 성명, 부서, 직급
        </p>
      </div>

      {/* 드래그앤드롭 업로드 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
          isDragging
            ? "border-teal-500 bg-teal-500/10"
            : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
        }`}
      >
        <Upload
          className={`h-8 w-8 transition-colors ${
            isDragging ? "text-teal-400" : "text-white/30"
          }`}
        />
        <div className="text-center">
          <p className="text-sm font-medium text-white/70">
            CSV 파일을 드래그하거나{" "}
            <span className="text-teal-400 underline underline-offset-2">클릭하여 선택</span>
          </p>
          <p className="mt-1 text-xs text-white/35">UTF-8 인코딩 CSV만 지원</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* 파싱 오류 메시지 */}
      {parseError && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{parseError}</p>
        </div>
      )}

      {/* 파싱 결과 요약 */}
      {result && (
        <div className="space-y-3">
          {/* 성공/오류 요약 배지 */}
          <div className="flex items-center gap-3 flex-wrap">
            {hasSuccess && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 px-3 py-1 text-xs font-medium text-teal-300">
                <CheckCircle className="h-3.5 w-3.5" />
                {result.imported}명 불러오기 완료
              </span>
            )}
            {hasErrors && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-300">
                <AlertCircle className="h-3.5 w-3.5" />
                {result.errors.length}건 오류
              </span>
            )}
          </div>

          {/* 오류 목록 */}
          {hasErrors && (
            <ul className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 space-y-1">
              {result.errors.slice(0, 5).map((err, i) => (
                <li key={i} className="text-xs text-amber-300/80">
                  • {err}
                </li>
              ))}
              {result.errors.length > 5 && (
                <li className="text-xs text-amber-300/50">
                  ... 외 {result.errors.length - 5}건
                </li>
              )}
            </ul>
          )}

          {/* 직원 미리보기 테이블 */}
          {hasSuccess && (
            <div className="overflow-hidden rounded-md border border-white/[0.07]">
              <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-3 py-2">
                <Users className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-xs font-medium text-white/70">
                  참가자 미리보기 (최대 5명)
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                    <th className="px-3 py-2 text-left font-medium text-white/40">이름</th>
                    <th className="px-3 py-2 text-left font-medium text-white/40">부서</th>
                    <th className="px-3 py-2 text-left font-medium text-white/40">직급</th>
                    <th className="px-3 py-2 text-left font-medium text-white/40">근속</th>
                  </tr>
                </thead>
                <tbody>
                  {result.employees.slice(0, 5).map((emp) => (
                    <tr
                      key={emp.employeeId}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-white/70">
                        {maskName(emp.name)}
                      </td>
                      <td className="px-3 py-2 text-white/60">{emp.department}</td>
                      <td className="px-3 py-2 text-white/60">{emp.jobLevel}직급</td>
                      <td className="px-3 py-2 text-white/50">
                        {emp.tenureYears != null ? `${emp.tenureYears}년` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.employees.length > 5 && (
                <p className="border-t border-white/[0.07] px-3 py-2 text-center text-xs text-white/30">
                  외 {result.employees.length - 5}명
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

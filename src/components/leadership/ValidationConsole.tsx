"use client";

import { Shield, AlertTriangle, FileText } from "lucide-react";
import type { ReliabilityReport, NormTable, SampleAdequacy } from "@/lib/validation";

interface ValidationConsoleProps {
  report: ReliabilityReport | null;
  norms: NormTable | null;
  loading?: boolean;
}

// 신뢰도 값에 따른 색상 결정 (>=0.8 emerald, >=0.6 amber, <0.6 red)
function getReliabilityColor(value: number): {
  text: string;
  stroke: string;
  bg: string;
} {
  if (value >= 0.8)
    return { text: "text-emerald-700", stroke: "stroke-emerald-600", bg: "bg-emerald-600" };
  if (value >= 0.6)
    return { text: "text-amber-700", stroke: "stroke-amber-600", bg: "bg-amber-600" };
  return { text: "text-red-600", stroke: "stroke-red-600", bg: "bg-red-600" };
}

// SVG 원형 진행 게이지
function CircularGauge({
  value,
  label,
  sublabel,
}: {
  value: number;
  label: string;
  sublabel?: string;
}) {
  const clampedValue = Math.max(0, Math.min(1, value));
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clampedValue);
  const colors = getReliabilityColor(value);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
          {/* 배경 트랙 */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-200"
          />
          {/* 진행 호 */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={colors.stroke}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        {/* 중앙 값 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold leading-none ${colors.text}`}>
            {value.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// 표본 적합성 배지
function AdequacyBadge({ adequacy }: { adequacy: SampleAdequacy }) {
  const config: Record<SampleAdequacy, { label: string; className: string }> = {
    insufficient: {
      label: "불충분 (Insufficient)",
      className: "border-red-300 bg-red-50 text-red-700",
    },
    exploratory: {
      label: "탐색적 (Exploratory)",
      className: "border-amber-300 bg-amber-50 text-amber-700",
    },
    adequate: {
      label: "적합 (Adequate)",
      className: "border-blue-300 bg-blue-50 text-blue-700",
    },
    robust: {
      label: "견고 (Robust)",
      className: "border-emerald-300 bg-emerald-50 text-emerald-700",
    },
  };
  const { label, className } = config[adequacy];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

// 표본 크기 진행 막대
function SampleProgressBar({ current, target = 30 }: { current: number; target?: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const barColor =
    pct >= 100
      ? "bg-emerald-600"
      : pct >= 67
      ? "bg-blue-600"
      : pct >= 33
      ? "bg-amber-600"
      : "bg-red-600";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-600">
        <span>표본 크기</span>
        <span>
          {current} / {target}명
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{pct}% 달성</p>
    </div>
  );
}

// 항목 분석 테이블 행
function ItemAnalysisRow({
  competencyKey,
  itemTotalCorrelation,
  alphaIfDeleted,
  cronbachAlpha,
}: {
  competencyKey: string;
  itemTotalCorrelation: number;
  alphaIfDeleted: number;
  cronbachAlpha: number;
}) {
  const corrColor =
    itemTotalCorrelation >= 0.4
      ? "text-emerald-700"
      : itemTotalCorrelation >= 0.3
      ? "text-amber-700"
      : "text-red-600";
  // alpha if deleted가 현재 alpha보다 크면 삭제 권장
  const alphaDelta = alphaIfDeleted - cronbachAlpha;
  const alphaColor =
    alphaDelta > 0.02 ? "text-red-600" : alphaDelta > 0 ? "text-amber-700" : "text-emerald-700";

  return (
    <tr className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
      <td className="py-2.5 px-3 text-sm text-slate-700 font-mono">{competencyKey}</td>
      <td className={`py-2.5 px-3 text-sm text-right font-mono ${corrColor}`}>
        {itemTotalCorrelation.toFixed(3)}
      </td>
      <td className={`py-2.5 px-3 text-sm text-right font-mono ${alphaColor}`}>
        {alphaIfDeleted.toFixed(3)}
        {alphaDelta > 0.02 && (
          <span className="ml-1 text-[10px] text-red-600 align-middle">▲ 삭제권장</span>
        )}
      </td>
    </tr>
  );
}

export default function ValidationConsole({
  report,
  norms,
  loading = false,
}: ValidationConsoleProps) {
  // 로딩 상태
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm p-6 space-y-4 animate-pulse">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="flex gap-8 justify-center">
          <div className="h-24 w-24 rounded-full bg-slate-200" />
          <div className="h-24 w-24 rounded-full bg-slate-200" />
        </div>
        <div className="h-32 rounded bg-slate-200" />
      </div>
    );
  }

  // 데이터 없음 상태
  if (!report) {
    return (
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm p-8 flex flex-col items-center gap-3 text-center">
        <FileText className="h-10 w-10 text-slate-500" />
        <p className="text-sm text-slate-500">
          심리측정 검증 데이터가 없습니다.
          <br />
          충분한 세션이 쌓이면 자동으로 분석됩니다.
        </p>
      </div>
    );
  }

  const iccColors = getReliabilityColor(report.icc.value);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-emerald-700" />
        <h3 className="text-base font-semibold text-slate-900">심리측정 타당화 콘솔</h3>
      </div>

      {/* ① 신뢰도 게이지 */}
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm p-6">
        <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-slate-500">
          신뢰도 지표
        </h4>
        <div className="flex flex-wrap justify-center gap-10">
          {/* Cronbach α */}
          <CircularGauge
            value={report.cronbachAlpha}
            label="Cronbach α"
            sublabel="내적 일관성"
          />

          {/* ICC — fail-closed: 짝지어진 인간 평가 3쌍 미만이면 미산출(센티넬 0)을 실측 0/저신뢰로 단정하지 않음 */}
          <div className="flex flex-col items-center gap-2">
            {report.icc.computed ? (
              <>
                <CircularGauge
                  value={report.icc.value}
                  label={report.icc.type}
                  sublabel="평가자 간 신뢰도"
                />
                {/* CI 범위 표시 */}
                <div
                  className={`text-xs font-mono px-2 py-0.5 rounded border border-slate-200 bg-slate-50 ${iccColors.text}`}
                >
                  <span className={iccColors.text}>
                    95% CI [{report.icc.ci95[0].toFixed(2)}, {report.icc.ci95[1].toFixed(2)}]
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-[120px] w-[120px] flex-col items-center justify-center gap-1 rounded-full border border-dashed border-slate-300 bg-slate-50 text-center px-3">
                <span className="text-[11px] font-semibold text-slate-600">{report.icc.type}</span>
                <span className="text-sm font-bold text-slate-500">미산출</span>
                <span className="text-[10px] leading-tight text-slate-500">
                  짝지어진 인간 평가 3건 이상 필요
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ② 적합성 배지 + 표본 크기 */}
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            표본 적합성
          </h4>
          <AdequacyBadge adequacy={report.adequacy} />
        </div>
        <SampleProgressBar current={report.sampleSize} />
      </div>

      {/* ③ 항목 분석 테이블 */}
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            항목 분석 (Item Analysis)
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100">
                <th className="py-2.5 px-3 text-xs font-semibold text-slate-600">역량 키</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">
                  항목-전체 상관
                </th>
                <th className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">
                  α if Deleted
                </th>
              </tr>
            </thead>
            <tbody>
              {report.itemAnalysis.map((item) => (
                <ItemAnalysisRow
                  key={item.competencyKey}
                  {...item}
                  cronbachAlpha={report.cronbachAlpha}
                />
              ))}
            </tbody>
          </table>
        </div>
        {report.itemAnalysis.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">항목 분석 데이터가 없습니다.</p>
        )}
      </div>

      {/* ④ 권고사항 */}
      {report.recommendations.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <h4 className="text-xs font-semibold uppercase tracking-widest text-amber-700">
              권고사항
            </h4>
          </div>
          <ul className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ⑤ 노름 테이블 */}
      {norms && (
        <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              노름 테이블 — {norms.groupBy} 기준
            </h4>
            <span className="text-xs text-slate-500">
              마지막 갱신: {new Date(norms.lastUpdated).toLocaleDateString("ko-KR")}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="py-2.5 px-3 font-semibold text-slate-600">그룹</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-600 text-right">N</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-600 text-center">P10</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-600 text-center">P25</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-600 text-center">P50</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-600 text-center">P75</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-600 text-center">P90</th>
                </tr>
              </thead>
              <tbody>
                {norms.groups.map((group) => {
                  // percentiles의 첫 번째 역량 키를 대표값으로 사용
                  const keys = Object.keys(group.percentiles);
                  return keys.map((key, ki) => {
                    const p = group.percentiles[key];
                    return (
                      <tr
                        key={`${group.groupName}-${key}`}
                        className="border-t border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        {ki === 0 && (
                          <td
                            rowSpan={keys.length}
                            className="py-2 px-3 text-slate-700 font-medium align-top border-r border-slate-200"
                          >
                            {group.groupName}
                          </td>
                        )}
                        {ki === 0 && (
                          <td
                            rowSpan={keys.length}
                            className="py-2 px-3 text-slate-600 text-right align-top border-r border-slate-200 font-mono"
                          >
                            {group.n}
                          </td>
                        )}
                        <td className="py-2 px-3 text-slate-500 font-mono text-center">
                          {p.p10.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-mono text-center">
                          {p.p25.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-emerald-700 font-mono text-center font-semibold">
                          {p.p50.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-mono text-center">
                          {p.p75.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-center">
                          {p.p90.toFixed(1)}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

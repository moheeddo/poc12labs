"use client";

import { useState } from "react";
import {
  ChevronDown,
  Layers,
  ScanEye,
  SlidersHorizontal,
  Calculator,
  Award,
  FileText,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LEADERSHIP_COMPETENCY_DEFS } from "@/lib/constants";
import {
  ASSESSMENT_BY_KEY,
  TOTAL_INTERPRETATION,
  QUALITY_NA_RULES,
} from "@/lib/leadership-rubric-data";

// =============================================
// 평가 기준 안내 — 루브릭 5층 구조를 초보자용으로 도식화
//  ① 개요: 역량 → 측정(M1~M5) → 밴드 → 점수 → 종합·등급 파이프라인
//  ② 역량별 상세: 펼치면 평가기준 + (상세 보유 역량은) M항목·운영밴드 트리
//
//  데이터 정직성(dohan 1원칙): 없는 정의를 지어내지 않는다.
//   - 멀티모달 상세(mItems): ASSESSMENT_BY_KEY에 있는 역량(비전제시·신뢰형성·구성원육성)만
//   - 평가기준(rubric): LEADERSHIP_COMPETENCY_DEFS에 있는 역량만
//   - 합리적의사결정은 서면(In-basket) 평가라 영상 멀티모달 대상에서 제외(명시)
// =============================================

// 운영밴드 4단계 — SUB_INDICATOR_SCALE(3/2/1/0)과 동일
const BAND_STEPS = [
  { key: "upper", label: "상위", score: "3점", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "midHigh", label: "중상", score: "2점", tone: "bg-emerald-50/60 text-emerald-700 border-emerald-200/60" },
  { key: "midLow", label: "중하", score: "1점", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "poor", label: "미흡", score: "0점", tone: "bg-red-50 text-red-600 border-red-200" },
] as const;

// 개요 5단계 파이프라인 (산식 근거: leadership-rubric-data.ts 헤더 주석)
const PIPELINE = [
  {
    icon: Layers,
    title: "역량 선택",
    sub: "8개 리더십 역량 중 평가 대상 선택",
    detail: "비전제시 · 신뢰형성 · 구성원육성 등. 역량마다 고유한 과업(발표·면담·토의) 맥락이 있습니다.",
  },
  {
    icon: ScanEye,
    title: "다채널 측정 (M1~M5)",
    sub: "영상에서 시선·음성·자세·언어 신호를 추출",
    detail: "각 역량을 5개 항목(M1~M5)으로 측정합니다. M1~M4는 총점에 반영, M5는 보조(총점 미반영)입니다.",
  },
  {
    icon: SlidersHorizontal,
    title: "지표 → 운영밴드",
    sub: "필수지표를 4단계 밴드로 변환",
    detail: "각 측정값을 상위(3)·중상(2)·중하(1)·미흡(0)의 운영밴드로 환산합니다. 인용·근거 없는 값은 채점하지 않고 보류(N/A)합니다.",
  },
  {
    icon: Calculator,
    title: "역량 점수 산출",
    sub: "필수지표 평균 × 3 (최대 9점)",
    detail: "M_score = mean(필수지표 변환점수) × 3. 데이터 품질이 낮으면 0점이 아니라 N/A로 Drop합니다.",
  },
  {
    icon: Award,
    title: "종합 · 등급",
    sub: "채점 가능한 M1~M4 평균 → 9점 척도",
    detail: "채점 가능 항목이 3개 이상일 때만 종합 점수를 산출하고, 9점 척도 등급으로 해석합니다.",
  },
] as const;

export default function RubricGuide() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-bold text-khnp-navy">평가 기준 — 한눈에 보기</h2>
        <p className="text-sm text-slate-600 mt-1">
          이 진단이 <strong>어떤 단계로 점수를 산출</strong>하는지, 각 역량을 <strong>무엇으로 평가</strong>하는지
          보여줍니다. 아래 흐름도는 전체 원리, 그 아래 카드는 역량별 상세 기준입니다.
        </p>
      </div>

      {/* ───────── ① 개요: 5단계 파이프라인 ───────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-600 text-white text-[11px] font-bold">1</span>
          평가는 이렇게 이뤄집니다 (5단계)
        </h3>

        <ol className="space-y-0">
          {PIPELINE.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                      <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                    </span>
                    {i < PIPELINE.length - 1 && <span className="w-px flex-1 min-h-[18px] bg-slate-200 my-1" aria-hidden="true" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-emerald-700">{`STEP ${i + 1}`}</span>
                      <span className="text-sm font-bold text-slate-800">{step.title}</span>
                    </div>
                    <p className="text-[13px] text-slate-700 mt-0.5">{step.sub}</p>
                    <p className="text-[12px] text-slate-500 leading-relaxed mt-1">{step.detail}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* 운영밴드 4단계 칩 */}
        <div className="mt-1 pt-4 border-t border-slate-100">
          <p className="text-[12px] font-medium text-slate-600 mb-2">운영밴드 4단계 (지표 → 점수 변환)</p>
          <div className="flex flex-wrap gap-2">
            {BAND_STEPS.map((b) => (
              <span key={b.key} className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-md border", b.tone)}>
                {b.label} <span className="font-mono opacity-80">{b.score}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 종합 등급 9점 척도 */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[12px] font-medium text-slate-600 mb-2">종합 등급 (9점 척도)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TOTAL_INTERPRETATION.map((g) => (
              <div key={g.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[13px] font-bold text-slate-800">{g.label}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{g.range}점</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── 내용 평가(별도 레이어) 안내 ───────── */}
      <section className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4">
        <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
          <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
          내용(content) 평가는 별도 레이어입니다
        </h3>
        <p className="text-[12px] text-emerald-900/80 leading-relaxed mt-1.5">
          위 행동(전달) 점수와 별개로, “전략이 타당한가·논리가 적절한가” 같은 <strong>내용의 질</strong>은
          <strong> 전사(대본) 인용 근거로만</strong> 채점합니다. 인용 근거가 없으면 점수를 보류(fail-closed)하고,
          결과는 항상 <strong>전문가 확정</strong>을 거치며 <strong>행동 점수와 합산하지 않습니다</strong>.
        </p>
      </section>

      {/* ───────── ② 역량별 상세 (펼침) ───────── */}
      <section>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-600 text-white text-[11px] font-bold">2</span>
          역량별 상세 기준 <span className="text-[12px] font-normal text-slate-500">(카드를 눌러 펼치기)</span>
        </h3>

        <div className="space-y-2">
          {LEADERSHIP_COMPETENCY_DEFS.map((def) => {
            const detail = ASSESSMENT_BY_KEY[def.key];
            const hasMultimodal = !!detail && detail.mItems.length > 0;
            const hasRubric = Array.isArray(def.rubric) && def.rubric.length > 0;
            const isWritten = def.key === "rationalDecision"; // 서면(In-basket) 평가
            const open = openKey === def.key;

            return (
              <div key={def.key} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  onClick={() => setOpenKey(open ? null : def.key)}
                  aria-expanded={open}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">{def.label}</span>
                      {hasMultimodal ? (
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">멀티모달 상세</span>
                      ) : isWritten ? (
                        <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">서면(In-basket) 평가</span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">정의 기준</span>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-500 leading-relaxed mt-1 line-clamp-2">{def.definition}</p>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4">
                    {/* 역량 정의 전문 */}
                    <p className="text-[13px] text-slate-700 leading-relaxed">{def.definition}</p>

                    {isWritten && (
                      <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-[12px] text-slate-600 leading-relaxed">
                          이 역량은 <strong>서면 과제(In-basket)</strong> 기반이라 영상 멀티모달 측정(M1~M5) 대상에서 제외됩니다.
                          아래 평가기준으로 채점합니다.
                        </p>
                      </div>
                    )}

                    {/* 멀티모달 상세 보유 역량: M항목 → 필수지표 → 밴드 */}
                    {hasMultimodal && (
                      <div className="space-y-2.5">
                        <p className="text-[12px] font-medium text-slate-600">측정 항목 (M1~M5)</p>
                        {detail.mItems.map((m) => {
                          const required = m.indicators.filter((ind) => ind.category === "required" && ind.band);
                          return (
                            <div key={m.code} className="rounded-lg border border-slate-200/70 bg-slate-50/40 p-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-mono font-bold text-emerald-700">{m.code}</span>
                                <span className="text-[13px] font-semibold text-slate-800">{m.customerLabel}</span>
                                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", m.totalReflected ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-500 bg-white border-slate-200")}>
                                  {m.totalReflected ? "총점 반영" : "보조(미반영)"}
                                </span>
                              </div>
                              <p className="text-[12px] text-slate-500 leading-relaxed mt-1">{m.definition}</p>

                              {/* 필수지표 + 운영밴드 */}
                              {required.length > 0 && (
                                <div className="mt-2.5 space-y-2">
                                  {required.map((ind) => (
                                    <div key={ind.id} className="rounded-md bg-white border border-slate-200/70 p-2.5">
                                      <p className="text-[12px] font-medium text-slate-700">
                                        {ind.customerLabel}
                                        {ind.unit && <span className="text-[11px] font-mono text-slate-400 ml-1.5">({ind.unit})</span>}
                                      </p>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
                                        {BAND_STEPS.map((b) => (
                                          <div key={b.key} className={cn("rounded px-2 py-1 border text-center", b.tone)}>
                                            <div className="text-[10px] font-bold">{b.label} · {b.score}</div>
                                            <div className="text-[10px] font-mono mt-0.5 opacity-90 break-keep">{ind.band?.[b.key]}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {detail.totalScoringFormula && (
                          <p className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">{detail.totalScoringFormula}</p>
                        )}
                      </div>
                    )}

                    {/* 평가기준(rubric) — 멀티모달 상세가 없고 rubric만 있는 경우 */}
                    {!hasMultimodal && hasRubric && (
                      <div className="space-y-1.5">
                        <p className="text-[12px] font-medium text-slate-600">평가 기준</p>
                        {def.rubric!.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-200/70 bg-slate-50/40 px-3 py-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-slate-800">{r.criteria}</p>
                              <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">{r.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 정의만 있는 역량 — 정직한 안내 */}
                    {!hasMultimodal && !hasRubric && (
                      <div className="flex items-start gap-2 rounded-lg bg-amber-50/50 border border-amber-200/50 px-3 py-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-[12px] text-amber-800 leading-relaxed">
                          이 역량의 <strong>세부 측정 기준(M1~M5·운영밴드)은 준비 중</strong>입니다. 현재는 위 역량 정의를 기준으로
                          평가하며, 세부 루브릭이 확정되면 이 화면에 함께 표시됩니다.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────── 데이터 품질 규칙(N/A) ───────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-500" aria-hidden="true" />
          데이터 품질 규칙 — 근거 없으면 채점하지 않습니다
        </h3>
        <p className="text-[12px] text-slate-500 leading-relaxed mb-3">
          추적·음성·전사 품질이 낮으면 그 항목은 <strong>0점이 아니라 N/A(보류)</strong>로 처리합니다.
          억지 점수를 만들지 않는 것이 이 진단의 원칙입니다.
        </p>
        <ul className="space-y-1.5">
          {QUALITY_NA_RULES.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600 leading-relaxed">
              <span className="text-slate-300 mt-0.5 shrink-0">·</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

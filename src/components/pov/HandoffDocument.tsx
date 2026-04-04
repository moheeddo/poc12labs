'use client';

import { useState } from 'react';
import { Printer, X, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { PovEvaluationReport } from '@/lib/types';
import type { Procedure } from '@/lib/pov-standards';
import type { StructuredFeedbackItem } from './DebriefingGuide';
import { cn } from '@/lib/utils';

interface Props {
  report: PovEvaluationReport;
  procedure: Procedure;
  instructorName?: string;
  traineeName?: string;
  feedbacks?: StructuredFeedbackItem[];
  overrides?: Record<string, { originalStatus: string; newStatus: string; reason: string }>;
  onClose: () => void;
}

// ── HPO 도구 레이블 ──────────────────────────────────────

const HPO_TOOL_LABELS: { key: string; label: string }[] = [
  { key: 'situationAwareness',    label: '상황인식' },
  { key: 'selfCheck',             label: '자기진단(STAR)' },
  { key: 'communication',         label: '효과적 의사소통' },
  { key: 'procedureCompliance',   label: '절차서 준수' },
  { key: 'preJobBriefing',        label: '작업전회의' },
  { key: 'verificationTechnique', label: '확인기법(동시/독립)' },
  { key: 'peerCheck',             label: '동료점검' },
  { key: 'labeling',              label: '인식표 및 운전방벽' },
  { key: 'stepMarkup',            label: '수행단계 표시' },
  { key: 'turnover',              label: '인수인계' },
  { key: 'postJobReview',         label: '작업후 평가' },
];

// ── 4대 영역 레이블 ──────────────────────────────────────

const DOMAIN_LABELS = [
  { key: 'procedureComplianceScore', label: '절차 이행' },
  { key: 'hpoOverallScore',          label: 'HPO 기법 적용' },
];

// ── 점수 바 ──────────────────────────────────────────────

function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-xs text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-mono text-gray-700 shrink-0">{score}점</span>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────

export default function HandoffDocument({
  report,
  procedure,
  instructorName = '',
  traineeName = '',
  feedbacks = [],
  overrides = {},
  onClose,
}: Props) {
  const [instructorInput, setInstructorInput] = useState(instructorName);
  const [traineeInput, setTraineeInput] = useState(traineeName);
  const [followUpPlan, setFollowUpPlan] = useState('');
  const [reevalDate, setReevalDate] = useState('');
  const [overallOpinion, setOverallOpinion] = useState('');

  // 통계 계산
  const effectiveEvals = report.stepEvaluations.map((e) => ({
    ...e,
    status: (overrides[e.stepId]?.newStatus ?? e.status) as typeof e.status,
  }));
  const passCount    = effectiveEvals.filter((e) => e.status === 'pass').length;
  const partialCount = effectiveEvals.filter((e) => e.status === 'partial').length;
  const failCount    = effectiveEvals.filter((e) => e.status === 'fail').length;
  const skipCount    = effectiveEvals.filter((e) => e.status === 'skipped').length;
  const totalCount   = effectiveEvals.length;

  // 핵심 이탈 (fail 중 critical deviation에 해당하는 항목)
  const criticalSteps = effectiveEvals.filter((e) => {
    if (e.status !== 'fail') return false;
    // sequenceAlignment 이탈 중 critical severity와 stepId 매칭
    if (!report.sequenceAlignment) return false;
    return report.sequenceAlignment.deviations.some(
      (d) => d.stepIds.includes(e.stepId) && d.severity === 'critical'
    );
  });

  // SBI 강점/개선 분리
  const strengths    = feedbacks.filter((f) => f.category === 'strength');
  const improvements = feedbacks.filter((f) => f.category === 'improvement');
  const criticals    = feedbacks.filter((f) => f.category === 'critical');

  // 보고서 강점/개선은 SBI 우선, 없으면 report 필드
  const displayStrengths = strengths.length > 0
    ? strengths.map((f) => f.behavior || f.situation)
    : report.strengths;
  const displayImprovements = improvements.length > 0
    ? improvements.map((f) => f.actionItem || f.behavior)
    : report.improvements;

  // 등급 색상
  const gradeColor = (() => {
    const s = report.overallScore;
    if (s >= 95) return '#10b981';
    if (s >= 85) return '#3b82f6';
    if (s >= 70) return '#14b8a6';
    if (s >= 55) return '#f59e0b';
    if (s >= 40) return '#f97316';
    return '#ef4444';
  })();

  return (
    <>
      {/* 인쇄 전용 CSS */}
      <style jsx global>{`
        @media print {
          body > * { visibility: hidden; }
          .handoff-document,
          .handoff-document * { visibility: visible; }
          .handoff-document {
            position: fixed;
            left: 0; top: 0;
            width: 100%;
            background: white;
            color: black;
            padding: 15mm 20mm;
            font-size: 11pt;
            z-index: 9999;
          }
          .no-print { display: none !important; }
          @page {
            size: A4 portrait;
            margin: 15mm 20mm;
          }
        }
      `}</style>

      {/* 모달 오버레이 */}
      <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8 no-print">
        <div className="relative w-full max-w-3xl mx-4">
          {/* 상단 액션 바 (인쇄 시 숨김) */}
          <div className="no-print flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-400" />
              훈련 기록서 미리보기
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/25 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> 인쇄
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200 transition-colors"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── 실제 문서 본문 ── */}
          <div className="handoff-document bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-8 space-y-6">

              {/* ①  헤더 */}
              <div className="text-center border-b-2 border-gray-900 pb-4">
                <p className="text-xs text-gray-500 mb-1">한국수력원자력(주) HPO센터</p>
                <h1 className="text-xl font-bold text-gray-900">운전행위 훈련 평가 기록서</h1>
                <p className="text-xs text-gray-500 mt-1">Human Performance Optimization Center — Training Evaluation Record</p>
              </div>

              {/* ②  기본 정보 */}
              <section>
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-300 pb-1 mb-3">1. 기본 정보</h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  {/* 인쇄 시에는 입력값 표시, 편집은 모달에서만 */}
                  <InfoRow label="훈련생명" value={
                    <input
                      type="text"
                      value={traineeInput}
                      onChange={(e) => setTraineeInput(e.target.value)}
                      className="no-print border-b border-dashed border-gray-300 px-1 bg-transparent focus:outline-none text-gray-900 w-full"
                      placeholder="홍길동"
                    />
                  } printValue={traineeInput || '___________'} />
                  <InfoRow label="평가일" value={<span>{report.date}</span>} printValue={report.date} />
                  <InfoRow label="절차명" value={<span className="font-medium">{report.procedureTitle}</span>} printValue={report.procedureTitle} />
                  <InfoRow label="계통" value={<span>{procedure.system}</span>} printValue={procedure.system} />
                  <InfoRow label="과정명" value={<span>{procedure.courseName}</span>} printValue={procedure.courseName} />
                  <InfoRow label="평가관명" value={
                    <input
                      type="text"
                      value={instructorInput}
                      onChange={(e) => setInstructorInput(e.target.value)}
                      className="no-print border-b border-dashed border-gray-300 px-1 bg-transparent focus:outline-none text-gray-900 w-full"
                      placeholder="평가관"
                    />
                  } printValue={instructorInput || '___________'} />
                </div>
              </section>

              {/* ③  성과 요약 */}
              <section>
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-300 pb-1 mb-3">2. 성과 요약</h2>
                <div className="flex items-start gap-6">
                  {/* 등급/점수 원형 */}
                  <div className="shrink-0 w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center"
                    style={{ borderColor: gradeColor }}>
                    <span className="text-2xl font-black" style={{ color: gradeColor }}>{report.grade}</span>
                    <span className="text-xs text-gray-500 font-mono">{report.overallScore}점</span>
                  </div>
                  {/* 점수 바 */}
                  <div className="flex-1 space-y-1.5">
                    <ScoreBar score={report.procedureComplianceScore} label="절차 이행" color="bg-blue-500" />
                    <ScoreBar score={report.hpoOverallScore} label="HPO 기법" color="bg-purple-500" />
                    {report.fundamentalScores.map((f) => (
                      <ScoreBar key={f.key} score={f.score} label={f.label} color="bg-teal-500" />
                    ))}
                  </div>
                </div>
              </section>

              {/* ④  절차 이행 결과 요약 */}
              <section>
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-300 pb-1 mb-3">3. 절차 이행 결과</h2>
                <div className="flex gap-4 text-center">
                  <StatusCell icon={<CheckCircle2 className="w-4 h-4 text-teal-500" />} label="적합" count={passCount} total={totalCount} color="text-teal-600" />
                  <StatusCell icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} label="부분적합" count={partialCount} total={totalCount} color="text-amber-600" />
                  <StatusCell icon={<XCircle className="w-4 h-4 text-red-500" />} label="부적합" count={failCount} total={totalCount} color="text-red-600" />
                  <StatusCell icon={<span className="w-4 h-4 text-gray-400 text-base leading-none">—</span>} label="미수행" count={skipCount} total={totalCount} color="text-gray-500" />
                  <div className="border-l border-gray-200 pl-4">
                    <p className="text-xs text-gray-500">오버라이드</p>
                    <p className="text-lg font-bold text-violet-600">{Object.keys(overrides).length}</p>
                    <p className="text-xs text-gray-400">수동 조정</p>
                  </div>
                </div>
              </section>

              {/* ⑤  강화점 */}
              <section>
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-300 pb-1 mb-2">4. 강화점 (잘한 점)</h2>
                {displayStrengths.length > 0 ? (
                  <ul className="space-y-1">
                    {displayStrengths.slice(0, 5).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-teal-500 font-bold shrink-0 mt-0.5">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">강화점 피드백이 없습니다</p>
                )}
              </section>

              {/* ⑥  개선점 */}
              <section>
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-300 pb-1 mb-2">5. 개선점 및 구체적 행동</h2>
                {displayImprovements.length > 0 ? (
                  <ul className="space-y-1">
                    {displayImprovements.slice(0, 5).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-amber-500 font-bold shrink-0 mt-0.5">△</span>
                        {s}
                        {improvements[i]?.actionItem && (
                          <span className="text-teal-600 text-xs ml-1">→ {improvements[i].actionItem}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">개선점 피드백이 없습니다</p>
                )}
              </section>

              {/* ⑦  핵심 이탈 (빨간) */}
              {(criticalSteps.length > 0 || criticals.length > 0) && (
                <section>
                  <h2 className="text-sm font-bold text-red-600 border-b border-red-300 pb-1 mb-2">
                    6. 핵심 이탈 (Critical Deviations)
                  </h2>
                  <div className="space-y-1.5">
                    {criticalSteps.map((e) => (
                      <div key={e.stepId} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded">
                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono text-xs text-red-600 mr-1">{e.stepId}</span>
                          <span className="text-sm text-gray-700">{e.description}</span>
                          {e.note && <p className="text-xs text-red-500 mt-0.5">{e.note}</p>}
                        </div>
                      </div>
                    ))}
                    {criticals.map((fb, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded">
                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono text-xs text-red-600 mr-1">{fb.stepId}</span>
                          <span className="text-sm text-gray-700">{fb.behavior}</span>
                          {fb.impact && <p className="text-xs text-red-500 mt-0.5">영향: {fb.impact}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ⑧  HPO 기법 적용 현황 */}
              <section>
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-300 pb-1 mb-2">7. HPO 기법 적용 현황</h2>
                <div className="grid grid-cols-3 gap-1">
                  {HPO_TOOL_LABELS.map(({ key, label }) => {
                    const ev = report.hpoEvaluations.find((h) => h.toolKey === key);
                    const applied = ev?.applied ?? false;
                    return (
                      <div key={key} className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs border',
                        applied
                          ? 'bg-teal-50 border-teal-200 text-teal-700'
                          : 'bg-gray-50 border-gray-200 text-gray-400',
                      )}>
                        <span className={cn('font-bold', applied ? 'text-teal-500' : 'text-gray-300')}>
                          {applied ? '●' : '○'}
                        </span>
                        {label}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ⑨  후속 조치 */}
              <section>
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-300 pb-1 mb-2">8. 후속 조치</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-0.5">추가 훈련 계획</label>
                    <textarea
                      value={followUpPlan}
                      onChange={(e) => setFollowUpPlan(e.target.value)}
                      className="no-print w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400 resize-none min-h-[56px]"
                      placeholder="추가 훈련 내용 또는 재교육 계획을 입력하세요..."
                    />
                    <p className="print-only text-sm text-gray-700 border-b border-dashed border-gray-300 min-h-[40px] py-1 hidden print:block">
                      {followUpPlan}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-0.5">재평가 일정</label>
                    <input
                      type="text"
                      value={reevalDate}
                      onChange={(e) => setReevalDate(e.target.value)}
                      className="no-print w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                      placeholder="예) 2026-05-15 / 미정"
                    />
                    <p className="print-only hidden print:block text-sm text-gray-700 border-b border-dashed border-gray-300 py-1">
                      {reevalDate || '_______________'}
                    </p>
                  </div>
                </div>
              </section>

              {/* ⑩  종합 의견 */}
              <section>
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-300 pb-1 mb-2">9. 종합 의견 (평가관 자유 기술)</h2>
                <textarea
                  value={overallOpinion}
                  onChange={(e) => setOverallOpinion(e.target.value)}
                  className="no-print w-full border border-gray-200 rounded px-2 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 resize-none min-h-[80px]"
                  placeholder="훈련 전반에 대한 종합적인 의견을 자유롭게 기술하세요..."
                />
                <div className="hidden print:block min-h-[80px] border border-dashed border-gray-300 rounded px-2 py-2 text-sm text-gray-700">
                  {overallOpinion}
                </div>
              </section>

              {/* ⑪  서명란 */}
              <section>
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-300 pb-1 mb-4">10. 확인 서명</h2>
                <div className="grid grid-cols-2 gap-8">
                  <SignatureBlock role="평가관" name={instructorInput} />
                  <SignatureBlock role="훈련생" name={traineeInput} />
                </div>
              </section>

              {/* 문서 번호/버전 */}
              <div className="pt-2 border-t border-gray-200 flex justify-between text-xs text-gray-400">
                <span>KHNP-HPO-EVAL-{report.id.slice(0, 8).toUpperCase()}</span>
                <span>평가일: {report.date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 보조 컴포넌트들 ──────────────────────────────────────

function InfoRow({
  label,
  value,
  printValue,
}: {
  label: string;
  value: React.ReactNode;
  printValue: string;
}) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
      <span className="flex-1 text-sm no-print">{value}</span>
      <span className="flex-1 text-sm hidden print:inline">{printValue}</span>
    </div>
  );
}

function StatusCell({
  icon,
  label,
  count,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  return (
    <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={cn('text-xl font-bold', color)}>{count}</p>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xs text-gray-400 font-mono">{total > 0 ? Math.round((count / total) * 100) : 0}%</p>
    </div>
  );
}

function SignatureBlock({ role, name }: { role: string; name: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 mb-1">{role}</p>
      <p className="text-sm font-medium text-gray-700 mb-4 min-h-[20px]">{name || '_______________'}</p>
      <div className="border-b-2 border-gray-400 mb-1" />
      <p className="text-xs text-gray-400">(서명 또는 날인)</p>
    </div>
  );
}

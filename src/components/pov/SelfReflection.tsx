'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, Brain, CheckSquare, Square, Send, SkipForward } from 'lucide-react';
import { OPERATOR_FUNDAMENTALS, HPO_TOOLS } from '@/lib/pov-standards';
import type { Procedure } from '@/lib/pov-standards';
import { cn } from '@/lib/utils';

export interface SelfReflectionData {
  overallConfidence: number;          // 1-5 (전혀 자신 없음 ~ 매우 자신 있음)
  estimatedGrade: string;             // S/A/B/C/D/F
  fundamentalSelfScores: Record<string, number>; // 역량별 자기평가 1-10
  difficultSteps: string[];           // 어렵다고 느낀 단계
  hpoToolsApplied: string[];          // 내가 적용했다고 생각하는 HPO 도구
  openReflection: string;             // 자유 서술
  completedAt: string;
}

interface Props {
  procedure: Procedure;
  onComplete: (reflection: SelfReflectionData) => void;
  onSkip: () => void;
}

// 자신감 이모지 옵션
const CONFIDENCE_OPTIONS = [
  { value: 1, emoji: '😰', label: '전혀 자신 없음' },
  { value: 2, emoji: '😟', label: '약간 불안' },
  { value: 3, emoji: '😐', label: '보통' },
  { value: 4, emoji: '😊', label: '자신 있음' },
  { value: 5, emoji: '😎', label: '매우 자신 있음' },
];

// 예상 등급 옵션
const GRADE_OPTIONS = ['S', 'A', 'B', 'C', 'D', 'F'];

// 등급 색상
const gradeColors: Record<string, string> = {
  S: 'bg-purple-500/20 border-purple-400 text-purple-300',
  A: 'bg-teal-500/20 border-teal-400 text-teal-300',
  B: 'bg-blue-500/20 border-blue-400 text-blue-300',
  C: 'bg-amber-500/20 border-amber-400 text-amber-300',
  D: 'bg-orange-500/20 border-orange-400 text-orange-300',
  F: 'bg-red-500/20 border-red-400 text-red-300',
};

// 스텝 인디케이터 컴포넌트
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i + 1 === current
                ? 'bg-amber-500 text-white'
                : i + 1 < current
                ? 'bg-amber-500/30 text-amber-300'
                : 'bg-zinc-700 text-zinc-500'
            )}
          >
            {i + 1}
          </div>
          {i < total - 1 && (
            <div className={cn('w-8 h-0.5', i + 1 < current ? 'bg-amber-500/40' : 'bg-zinc-700')} />
          )}
        </div>
      ))}
      <span className="text-xs text-zinc-500 ml-2">{current} / {total}</span>
    </div>
  );
}

export default function SelfReflection({ procedure, onComplete, onSkip }: Props) {
  const [step, setStep] = useState(1);

  // Step 1 상태
  const [confidence, setConfidence] = useState<number>(0);
  const [estimatedGrade, setEstimatedGrade] = useState<string>('');

  // Step 2 상태: OPERATOR_FUNDAMENTALS 5개 역량별 1-10 슬라이더
  const [fundamentalScores, setFundamentalScores] = useState<Record<string, number>>(
    () => Object.fromEntries(OPERATOR_FUNDAMENTALS.map((f) => [f.key, 5]))
  );
  const [difficultStepsText, setDifficultStepsText] = useState('');
  const [hpoToolsApplied, setHpoToolsApplied] = useState<Set<string>>(new Set());

  // Step 3 상태
  const [openReflection, setOpenReflection] = useState('');

  // 슬라이더 값 변경
  const handleFundamentalScore = (key: string, value: number) => {
    setFundamentalScores((prev) => ({ ...prev, [key]: value }));
  };

  // HPO 도구 체크 토글
  const toggleHpoTool = (key: string) => {
    setHpoToolsApplied((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 어려웠던 단계를 쉼표로 분리
  const parseDifficultSteps = (text: string): string[] =>
    text
      .split(/[,，、\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

  // 최종 제출
  const handleSubmit = () => {
    const data: SelfReflectionData = {
      overallConfidence: confidence,
      estimatedGrade,
      fundamentalSelfScores: { ...fundamentalScores },
      difficultSteps: parseDifficultSteps(difficultStepsText),
      hpoToolsApplied: Array.from(hpoToolsApplied),
      openReflection,
      completedAt: new Date().toISOString(),
    };
    onComplete(data);
  };

  // Step 1 유효성
  const step1Valid = confidence > 0 && estimatedGrade !== '';

  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="bg-zinc-800/80 border border-amber-500/20 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold text-white">셀프 리플렉션</h3>
          <span className="text-xs text-zinc-500 ml-auto">{procedure.title}</span>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">
          AI 평가 결과를 보기 전에, 먼저 본인의 수행을 스스로 평가해 주세요.
          자기평가와 AI 결과를 비교하여 맹점(blind spot)을 발견하는 데 도움이 됩니다.
        </p>
      </div>

      {/* 위저드 카드 */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
        <StepIndicator current={step} total={3} />

        {/* ─── Step 1: 전체 자신감 ─── */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in-up">
            <div>
              <h4 className="text-base font-semibold text-white mb-1">
                이번 절차 수행에 대한 전반적 자신감은?
              </h4>
              <p className="text-xs text-zinc-500 mb-4">솔직하게 평가할수록 더 유용한 피드백을 받을 수 있습니다.</p>
              <div className="flex gap-3 flex-wrap">
                {CONFIDENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setConfidence(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all min-w-[90px]',
                      confidence === opt.value
                        ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                    )}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-xs text-center leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-base font-semibold text-white mb-1">본인의 예상 등급은?</h4>
              <p className="text-xs text-zinc-500 mb-4">S: 최우수 / A: 우수 / B: 양호 / C: 보통 / D: 미흡 / F: 불합격</p>
              <div className="flex gap-2 flex-wrap">
                {GRADE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setEstimatedGrade(g)}
                    className={cn(
                      'w-12 h-12 rounded-xl border text-lg font-bold transition-all',
                      estimatedGrade === g
                        ? gradeColors[g]
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: 역량별 자기평가 ─── */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in-up">
            <div>
              <h4 className="text-base font-semibold text-white mb-1">역량별 자기평가</h4>
              <p className="text-xs text-zinc-500 mb-4">각 역량에 대한 이번 수행을 1(매우 부족)~10(매우 우수)으로 평가해 주세요.</p>

              <div className="space-y-4">
                {OPERATOR_FUNDAMENTALS.map((f) => (
                  <div key={f.key} className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: f.color }}
                        >
                          {f.label}
                        </span>
                        <p className="text-xs text-zinc-500 mt-0.5 leading-snug max-w-sm">{f.definition.slice(0, 60)}...</p>
                      </div>
                      <span
                        className="text-xl font-bold font-mono ml-4 min-w-[2ch] text-right"
                        style={{ color: f.color }}
                      >
                        {fundamentalScores[f.key]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={fundamentalScores[f.key]}
                      onChange={(e) => handleFundamentalScore(f.key, Number(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 rounded-full cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-zinc-600 mt-0.5">
                      <span>1 매우 부족</span>
                      <span>10 매우 우수</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 어려웠던 단계 */}
            <div>
              <label className="block text-sm font-semibold text-white mb-1">
                어려웠던 단계 (선택)
              </label>
              <p className="text-xs text-zinc-500 mb-2">스텝 번호나 내용을 쉼표로 구분하여 입력 (예: 1.2.3, 1.4.1)</p>
              <input
                type="text"
                value={difficultStepsText}
                onChange={(e) => setDifficultStepsText(e.target.value)}
                placeholder="예: 1.2.5 LCV-101 확인, 1.3.1 SOL-V101 상태"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* HPO 도구 체크리스트 */}
            <div>
              <label className="block text-sm font-semibold text-white mb-1">
                적용했다고 생각하는 HPO 도구 (복수 선택 가능)
              </label>
              <p className="text-xs text-zinc-500 mb-3">이번 수행에서 실제로 적용한 기법을 체크해 주세요.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {HPO_TOOLS.map((tool) => {
                  const checked = hpoToolsApplied.has(tool.key);
                  return (
                    <button
                      key={tool.key}
                      onClick={() => toggleHpoTool(tool.key)}
                      className={cn(
                        'flex items-start gap-2 p-3 rounded-lg border text-left transition-all',
                        checked
                          ? 'border-teal-500/40 bg-teal-500/10 text-teal-300'
                          : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                      )}
                    >
                      {checked
                        ? <CheckSquare className="w-4 h-4 shrink-0 mt-0.5 text-teal-400" />
                        : <Square className="w-4 h-4 shrink-0 mt-0.5 text-zinc-600" />
                      }
                      <div>
                        <div className="text-xs font-semibold">{tool.label}</div>
                        <div className="text-xs text-zinc-500 mt-0.5 leading-tight">{tool.definition.slice(0, 40)}...</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 3: 자유 서술 ─── */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <h4 className="text-base font-semibold text-white mb-1">자유 서술 (선택)</h4>
              <p className="text-xs text-zinc-500 mb-3">
                이번 수행에서 잘한 점과 아쉬운 점을 자유롭게 적어주세요.
                AI 결과와 함께 교수자에게 제공됩니다.
              </p>
              <textarea
                value={openReflection}
                onChange={(e) => setOpenReflection(e.target.value)}
                placeholder="예: 압축공기계통 확인은 자신 있었지만, LCV-101 제어실 확인 단계에서 절차서를 빠뜨린 것 같습니다. 자기진단 기법은 중간부터 의식적으로 적용하려고 노력했습니다..."
                rows={6}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-amber-500/50 leading-relaxed"
              />
              <div className="text-right text-xs text-zinc-600 mt-1">{openReflection.length}자</div>
            </div>

            {/* 요약 미리보기 */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-zinc-400 mb-2">입력 요약</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-zinc-500">자신감</span>
                <span className="text-amber-300 font-semibold">
                  {CONFIDENCE_OPTIONS.find((c) => c.value === confidence)?.emoji}{' '}
                  {CONFIDENCE_OPTIONS.find((c) => c.value === confidence)?.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-zinc-500">예상 등급</span>
                <span className={cn('font-bold px-2 py-0.5 rounded border text-xs', gradeColors[estimatedGrade] || 'text-zinc-400')}>
                  {estimatedGrade || '-'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-zinc-500">HPO 도구 체크</span>
                <span className="text-teal-300">{hpoToolsApplied.size}개</span>
              </div>
            </div>
          </div>
        )}

        {/* 네비게이션 버튼 */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-zinc-800">
          {/* 왼쪽: 이전 / 건너뛰기 */}
          <div className="flex gap-2">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> 이전
              </button>
            ) : (
              <button
                onClick={onSkip}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
              >
                <SkipForward className="w-4 h-4" /> 건너뛰기
              </button>
            )}
          </div>

          {/* 오른쪽: 다음 / 제출 */}
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !step1Valid}
              className={cn(
                'flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                step === 1 && !step1Valid
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : 'bg-amber-500 text-white hover:bg-amber-400'
              )}
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-500 transition-all"
            >
              <Send className="w-4 h-4" /> 제출하고 결과 보기
            </button>
          )}
        </div>

        {/* Step 3에서 건너뛰기 버튼 추가 */}
        {step === 3 && (
          <div className="mt-3 text-center">
            <button
              onClick={onSkip}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline"
            >
              서술 없이 결과 바로 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

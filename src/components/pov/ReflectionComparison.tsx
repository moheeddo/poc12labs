'use client';

import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus, Brain, Target, Wrench } from 'lucide-react';
import { OPERATOR_FUNDAMENTALS } from '@/lib/pov-standards';
import type { PovEvaluationReport } from '@/lib/types';
import type { SelfReflectionData } from './SelfReflection';
import { cn } from '@/lib/utils';

interface Props {
  reflection: SelfReflectionData;
  report: PovEvaluationReport;
}

// AI 점수 100점 → 10점 스케일 변환
function toTenScale(score: number) {
  return Math.round(score / 10);
}

// 메타인지 수준 계산 (자기평가 vs AI 오차 기반)
function calcMetacognition(selfScores: Record<string, number>, aiScores: Record<string, number>): {
  level: '뛰어남' | '양호' | '보통' | '개선 필요';
  avgError: number;
  color: string;
  bg: string;
} {
  const keys = Object.keys(selfScores);
  if (keys.length === 0) return { level: '보통', avgError: 0, color: 'text-amber-300', bg: 'bg-amber-500/15' };

  const errors = keys.map((k) => {
    const self = selfScores[k];                     // 1-10
    const ai = toTenScale(aiScores[k] ?? 50);       // 1-10
    return Math.abs(self - ai) / 10;                // 0-1 비율
  });
  const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const pct = avgError * 100;

  if (pct < 10) return { level: '뛰어남', avgError: pct, color: 'text-teal-300', bg: 'bg-teal-500/15' };
  if (pct < 20) return { level: '양호', avgError: pct, color: 'text-blue-300', bg: 'bg-blue-500/15' };
  if (pct < 30) return { level: '보통', avgError: pct, color: 'text-amber-300', bg: 'bg-amber-500/15' };
  return { level: '개선 필요', avgError: pct, color: 'text-red-300', bg: 'bg-red-500/15' };
}

// 등급 수치화 (비교용)
const gradeToNum: Record<string, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };

// 메타인지 패턴 기반 자동 코칭 문구
function getCoachingMessage(
  metacog: ReturnType<typeof calcMetacognition>,
  gradeMatch: boolean,
  overEstimateCount: number,
  underEstimateCount: number
): string {
  if (metacog.level === '뛰어남') {
    return '자기 수행에 대한 인식이 매우 정확합니다. 이 수준의 메타인지는 자기주도 학습의 토대가 됩니다. 지금의 자기관찰 습관을 유지하세요.';
  }
  if (metacog.level === '양호') {
    if (overEstimateCount > underEstimateCount) {
      return '전반적으로 양호하나 일부 역량을 과대평가하는 경향이 있습니다. 더 엄격한 자기 기준을 세우고, 평가 후 차이가 큰 역량을 집중 복기하세요.';
    }
    return '전반적으로 양호하나 본인의 강점을 다소 과소평가하는 경향이 있습니다. 잘 수행한 부분에 대해서도 자신감을 가지세요.';
  }
  if (metacog.level === '보통') {
    if (!gradeMatch) {
      return `예상 등급(${gradeToNum})과 실제 등급 간 차이가 있습니다. 등급 기준(절차 준수 50%·HPO 30%·기본수칙 20%)을 다시 숙지하고, 각 평가 항목에서 AI가 어떤 근거로 판단했는지 확인하세요.`;
    }
    return '자기평가와 AI 평가 간 오차가 보통 수준입니다. 각 역량별 평가 포인트를 다시 확인하고, 특히 오차가 큰 역량을 중점적으로 개선하세요.';
  }
  // 개선 필요
  return '자기 수행에 대한 인식과 AI 평가 간 오차가 큽니다. 이는 자신의 강점·약점에 대한 인식을 개선할 기회입니다. 교수자와 함께 각 역량의 평가 기준을 검토하고, 다음 수행에서 자기관찰을 강화하세요.';
}

export default function ReflectionComparison({ reflection, report }: Props) {
  // AI 역량 점수 맵 (key → 0-100)
  const aiScoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    report.fundamentalScores.forEach((f) => { map[f.key] = f.score; });
    return map;
  }, [report.fundamentalScores]);

  // HPO 도구 AI 감지 결과 맵 (toolKey → applied)
  const aiHpoMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    report.hpoEvaluations.forEach((h) => { map[h.toolKey] = h.applied; });
    return map;
  }, [report.hpoEvaluations]);

  // 메타인지 계산
  const metacog = useMemo(
    () => calcMetacognition(reflection.fundamentalSelfScores, aiScoreMap),
    [reflection.fundamentalSelfScores, aiScoreMap]
  );

  // 등급 일치 여부
  const gradeMatch = reflection.estimatedGrade === report.grade;

  // 역량별 방향 분류
  const fundamentalComparison = OPERATOR_FUNDAMENTALS.map((f) => {
    const selfScore = reflection.fundamentalSelfScores[f.key] ?? 5;   // 1-10
    const aiScore10 = toTenScale(aiScoreMap[f.key] ?? 50);             // 1-10
    const diff = selfScore - aiScore10;                                 // + → 과대평가, - → 과소평가
    const absDiff = Math.abs(diff);
    const pctDiff = absDiff / 10;

    let direction: 'over' | 'under' | 'match';
    if (pctDiff <= 0.1) direction = 'match';
    else if (diff > 0) direction = 'over';
    else direction = 'under';

    return { f, selfScore, aiScore10, diff, direction };
  });

  const overEstimateCount = fundamentalComparison.filter((c) => c.direction === 'over').length;
  const underEstimateCount = fundamentalComparison.filter((c) => c.direction === 'under').length;

  // HPO 일치 통계
  const hpoStats = useMemo(() => {
    const selfApplied = new Set(reflection.hpoToolsApplied);
    let bothApplied = 0, onlySelf = 0, onlyAi = 0, neitherApplied = 0;
    Object.entries(aiHpoMap).forEach(([key, aiApplied]) => {
      const selfA = selfApplied.has(key);
      if (selfA && aiApplied) bothApplied++;
      else if (selfA && !aiApplied) onlySelf++;
      else if (!selfA && aiApplied) onlyAi++;
      else neitherApplied++;
    });
    return { bothApplied, onlySelf, onlyAi, neitherApplied };
  }, [reflection.hpoToolsApplied, aiHpoMap]);

  const coachingMsg = getCoachingMessage(metacog, gradeMatch, overEstimateCount, underEstimateCount);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* 섹션 제목 */}
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-amber-500" />
        <h4 className="text-base font-bold text-white">셀프 리플렉션 비교 분석</h4>
        <span className="text-xs text-zinc-500">자기평가 vs AI 평가</span>
      </div>

      {/* ① 등급 비교 */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-zinc-300">등급 비교</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-zinc-500 mb-1">내 예상 등급</p>
            <span className="text-3xl font-bold text-amber-300 font-mono">{reflection.estimatedGrade}</span>
          </div>
          <div className="text-2xl text-zinc-600">vs</div>
          <div className="text-center">
            <p className="text-xs text-zinc-500 mb-1">AI 평가 등급</p>
            <span className={cn('text-3xl font-bold font-mono', gradeMatch ? 'text-teal-300' : 'text-red-300')}>
              {report.grade}
            </span>
          </div>
          <div className="ml-auto">
            {gradeMatch ? (
              <div className="flex items-center gap-1.5 text-teal-300 bg-teal-500/15 border border-teal-500/30 rounded-lg px-3 py-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4" /> 일치
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-1.5 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {(gradeToNum[reflection.estimatedGrade] ?? 3) > (gradeToNum[report.grade] ?? 3)
                  ? '과대평가'
                  : '과소평가'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ② 역량별 자기평가 vs AI 평가 바 차트 */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-zinc-300">역량별 비교 (1-10 스케일)</span>
        </div>
        <div className="space-y-3">
          {fundamentalComparison.map(({ f, selfScore, aiScore10, direction }) => {
            const dirConfig = {
              over: { icon: <TrendingUp className="w-3 h-3" />, label: '과대평가', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
              under: { icon: <TrendingDown className="w-3 h-3" />, label: '과소평가', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
              match: { icon: <CheckCircle2 className="w-3 h-3" />, label: '정확한 인식', color: 'text-teal-400', bg: 'bg-teal-500/20 border-teal-500/30' },
            }[direction];

            return (
              <div key={f.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: f.color }}>{f.label}</span>
                  <div className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border', dirConfig.bg, dirConfig.color)}>
                    {dirConfig.icon}
                    <span>{dirConfig.label}</span>
                  </div>
                </div>
                {/* 이중 바 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600 w-12 text-right shrink-0">나 {selfScore}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500/70 transition-all duration-700"
                        style={{ width: `${selfScore * 10}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600 w-12 text-right shrink-0">AI {aiScore10}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-500/70 transition-all duration-700"
                        style={{ width: `${aiScore10 * 10}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* 범례 */}
        <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-amber-500/70 inline-block" /> 자기평가</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-teal-500/70 inline-block" /> AI 평가</span>
        </div>
      </div>

      {/* ③ HPO 인식 갭 */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-zinc-300">HPO 도구 인식 갭</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="text-center p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
            <CheckCircle2 className="w-4 h-4 text-teal-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-teal-300 font-mono">{hpoStats.bothApplied}</div>
            <div className="text-xs text-zinc-500">일치 (둘 다 적용)</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <TrendingUp className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-orange-300 font-mono">{hpoStats.onlySelf}</div>
            <div className="text-xs text-zinc-500">나만 체크</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <TrendingDown className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-blue-300 font-mono">{hpoStats.onlyAi}</div>
            <div className="text-xs text-zinc-500">AI만 감지</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-zinc-700/50 border border-zinc-600">
            <Minus className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-zinc-400 font-mono">{hpoStats.neitherApplied}</div>
            <div className="text-xs text-zinc-500">둘 다 미적용</div>
          </div>
        </div>

        {/* 도구별 세부 */}
        <div className="space-y-1.5">
          {report.hpoEvaluations.map((h) => {
            const selfApplied = reflection.hpoToolsApplied.includes(h.toolKey);
            const aiApplied = h.applied;
            const match = selfApplied === aiApplied;
            return (
              <div
                key={h.toolKey}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-xs',
                  match ? 'bg-zinc-800/40' : 'bg-amber-500/5 border border-amber-500/15'
                )}
              >
                <span className="text-zinc-300">{h.label}</span>
                <div className="flex items-center gap-3">
                  <span className={cn('px-2 py-0.5 rounded text-xs', selfApplied ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-700 text-zinc-500')}>
                    나: {selfApplied ? '적용' : '미적용'}
                  </span>
                  <span className={cn('px-2 py-0.5 rounded text-xs', aiApplied ? 'bg-teal-500/20 text-teal-300' : 'bg-zinc-700 text-zinc-500')}>
                    AI: {aiApplied ? '감지' : '미감지'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ④ 메타인지 점수 */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-zinc-300">메타인지 수준</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={cn('px-4 py-3 rounded-xl border text-center min-w-[100px]', metacog.bg, 'border-zinc-600')}>
            <div className={cn('text-xl font-bold', metacog.color)}>{metacog.level}</div>
            <div className="text-xs text-zinc-500 mt-0.5">평균 오차 {metacog.avgError.toFixed(1)}%</div>
          </div>
          <div className="text-xs text-zinc-400 leading-relaxed">
            <p className="mb-1">
              <strong className="text-zinc-300">메타인지</strong>란 자신의 수행에 대한 인식 능력입니다.
            </p>
            <p>오차 &lt;10% 뛰어남 · 10-20% 양호 · 20-30% 보통 · 30%+ 개선 필요</p>
          </div>
        </div>
      </div>

      {/* ⑤ 교수자 코칭 문구 */}
      <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300 mb-1">코칭 가이드</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{coachingMsg}</p>
          </div>
        </div>
      </div>

      {/* ⑥ 자유 서술 (입력한 경우만) */}
      {reflection.openReflection && (
        <div className="bg-zinc-800/40 border border-zinc-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-zinc-400 mb-2">훈련생 자유 서술</p>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{reflection.openReflection}</p>
        </div>
      )}
    </div>
  );
}

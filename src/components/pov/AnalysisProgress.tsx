'use client';
import type { AnalysisJob } from '@/lib/types';

interface Props {
  progress: number;
  stages: AnalysisJob['stages'] | null;
  status: string;
  error?: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  stepDetection: 'SOP 단계 검출',
  handObject: '손-물체 분석',
  sequenceMatch: '시퀀스 매칭',
  hpoVerification: 'HPO 도구 검증',
  embeddingComparison: '숙련도 비교',
  scoring: '종합 스코어링',
};

const STATUS_ICON: Record<string, string> = { pending: '○', running: '◉', done: '✓', error: '✗' };
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-zinc-500', running: 'text-amber-400 animate-pulse',
  done: 'text-emerald-400', error: 'text-red-400',
};

export default function AnalysisProgress({ progress, stages, status, error }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" className="text-zinc-800" strokeWidth="8" />
          <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor"
            className="text-amber-500 transition-all duration-500" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${progress * 3.52} 352`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-zinc-100">{progress}%</span>
        </div>
      </div>
      <p className="text-zinc-400 text-sm">
        {status === 'error' ? 'AI 분석 중 오류 발생' : 'AI 분석 진행 중...'}
      </p>
      {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">{error}</p>}
      {stages && (
        <div className="w-full max-w-md space-y-2">
          {Object.entries(stages).map(([key, stageStatus]) => (
            <div key={key} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-zinc-900/50">
              <span className={`text-lg font-mono ${STATUS_COLOR[stageStatus]}`}>{STATUS_ICON[stageStatus]}</span>
              <span className={`text-sm ${stageStatus === 'running' ? 'text-zinc-100' : 'text-zinc-400'}`}>
                {STAGE_LABELS[key] || key}
              </span>
              {stageStatus === 'done' && <span className="ml-auto text-xs text-emerald-500">완료</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

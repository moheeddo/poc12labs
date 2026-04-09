"use client";

import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import type { TrainingSession } from '@/lib/session-types';
import { cn } from '@/lib/utils';

interface Props {
  session: TrainingSession;
}

export default function SessionProgress({ session }: Props) {
  const statusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'analyzing': return <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const isSyncing = session.status === 'syncing';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 animate-fade-in-up">
      <h3 className="text-lg font-bold text-slate-800 mb-4">세션 분석 진행 중</h3>
      <div className="space-y-4">
        {session.operators.map(op => (
          <div key={op.role} className="flex items-center gap-4">
            {statusIcon(op.status)}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">
                  {op.name || op.role} <span className="text-slate-400">({op.role === 'operatorA' ? '운전원 A' : '운전원 B'})</span>
                </span>
                <span className="text-xs font-mono text-slate-500">{op.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className={cn("h-2 rounded-full transition-all duration-500",
                    op.status === 'complete' ? 'bg-emerald-500' : op.status === 'error' ? 'bg-red-500' :
                    op.role === 'operatorA' ? 'bg-teal-500' : 'bg-amber-500')}
                  style={{ width: `${op.progress}%` }} />
              </div>
              {op.error && <p className="text-xs text-red-500 mt-1">{op.error}</p>}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
          {isSyncing ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> :
           session.syncResult ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
           <Clock className="w-5 h-5 text-slate-300" />}
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-700">교차 분석 (동기화 + 종합)</span>
            <span className="text-xs text-slate-400 ml-2">
              {isSyncing ? '동기화 중...' : session.syncResult ? '완료' : '개별 분석 완료 후 시작'}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 text-center">
          영상 길이와 네트워크 상태에 따라 3~10분 소요될 수 있습니다
        </p>
      </div>
    </div>
  );
}

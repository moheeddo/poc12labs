'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

/**
 * API 연결 상태 표시 배지
 * /api/health 를 호출해 TwelveLabs 연결 여부를 확인하고
 * 연결됨 / 데모 모드 상태를 시각적으로 표시
 */
export default function ApiStatusBadge() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'demo'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => setStatus(data.demoMode ? 'demo' : 'connected'))
      .catch(() => setStatus('demo'));
  }, []);

  if (status === 'checking') return (
    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
      <Loader2 className="w-3 h-3 animate-spin" /> 연결 확인 중
    </span>
  );

  if (status === 'demo') return (
    <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
      <WifiOff className="w-3 h-3" /> 데모 모드
    </span>
  );

  return (
    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
      <Wifi className="w-3 h-3" /> API 연결됨
    </span>
  );
}

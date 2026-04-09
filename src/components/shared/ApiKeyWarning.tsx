"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ApiKeyWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch('/api/twelvelabs/index')
      .then(res => { if (!res.ok) setShow(true); })
      .catch(() => setShow(true));
  }, []);

  if (!show) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-4 animate-fade-in-up">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-800">TwelveLabs API 연결 안됨</p>
        <p className="text-sm text-amber-600 mt-1">
          API 키가 설정되지 않았거나 서버에 연결할 수 없습니다.
          데모 모드로 동작하며, 실제 영상 분석은 제한됩니다.
        </p>
      </div>
      <button onClick={() => setShow(false)} className="text-amber-400 hover:text-amber-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import {
  getConsentItems,
  createConsentRecord,
  checkAllRequiredConsents,
} from "@/lib/compliance";
import type { ConsentRecord } from "@/lib/compliance";

interface ConsentFormProps {
  participantId: string;
  sessionId: string;
  onComplete: (consents: ConsentRecord[]) => void;
}

export default function ConsentForm({
  participantId,
  sessionId,
  onComplete,
}: ConsentFormProps) {
  const items = getConsentItems();
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((item) => [item.type, false]))
  );
  const [submitted, setSubmitted] = useState(false);

  // 현재 동의 상태 기반으로 ConsentRecord 배열 생성 (검증 전 임시)
  const buildRecords = (): ConsentRecord[] =>
    items.map((item) =>
      createConsentRecord(participantId, sessionId, item.type, checked[item.type] ?? false)
    );

  const { allRequired } = checkAllRequiredConsents(buildRecords());

  const handleToggle = (type: string) => {
    setChecked((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const records = buildRecords();
    const { allRequired: valid } = checkAllRequiredConsents(records);
    if (!valid) return;
    onComplete(records);
  };

  return (
    <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm p-6 space-y-5">
      {/* 헤더 */}
      <div>
        <h3 className="text-base font-semibold text-slate-900">참가자 동의 확인</h3>
        <p className="mt-1 text-xs text-slate-500">
          ISO 10667 기준에 따라 평가 시작 전 아래 항목에 동의해 주세요.
        </p>
      </div>

      {/* 동의 항목 목록 */}
      <ul className="space-y-3">
        {items.map((item) => {
          const isChecked = checked[item.type] ?? false;
          return (
            <li key={item.type}>
              <button
                type="button"
                onClick={() => handleToggle(item.type)}
                className="w-full text-left flex items-start gap-3 rounded-md border border-slate-200/60 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors"
              >
                {/* 체크박스 아이콘 */}
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    isChecked
                      ? "border-emerald-600 bg-emerald-600"
                      : "border-slate-300 bg-transparent"
                  }`}
                >
                  {isChecked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                </span>

                {/* 텍스트 영역 */}
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800">{item.label}</span>
                    {item.required && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-300">
                        필수
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* 필수 동의 미완료 경고 */}
      {submitted && !allRequired && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-700">
            필수 동의 항목을 모두 선택해야 다음 단계로 진행할 수 있습니다.
          </p>
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allRequired}
        className={`w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${
          allRequired
            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
            : "bg-slate-100 text-slate-400 cursor-not-allowed"
        }`}
      >
        동의 완료 · 다음 단계로
      </button>
    </div>
  );
}

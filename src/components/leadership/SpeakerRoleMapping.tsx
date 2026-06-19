"use client";

import { useState } from "react";
import { Users, UserCheck, RefreshCw, X, Plus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleContext } from "@/app/api/twelvelabs/multimodal-extract/route";
import type { LeadershipCompetencyKey } from "@/lib/types";

// =============================================
// 코치 보정 UI — 화자분리·역할매핑 보정 (피드백 ⑦)
// 평가 대상자(target/Leader) 지정 + 화자 라벨 매핑 → 재분석
// 스펙: 화자분리·역할매핑이 평가의 전제. 실패 시 코치가 직접 보정.
// =============================================

interface SpeakerRoleMappingProps {
  competencyKey: LeadershipCompetencyKey | string;
  value: RoleContext;
  onApply: (rc: RoleContext) => void;
  disabled?: boolean;
}

// 역량별 라벨링 가이드
const GUIDE: Record<string, { targetLabel: string; otherLabel: string; roleHint: string; needsRole: boolean; needsOthers: boolean }> = {
  visionPresentation: {
    targetLabel: "발표자(평가 대상자)", otherLabel: "", roleHint: "", needsRole: false, needsOthers: false,
  },
  memberDevelopment: {
    targetLabel: "Leader(평가 대상자)", otherLabel: "Member(맥락 참여자)", roleHint: "", needsRole: false, needsOthers: true,
  },
  trustBuilding: {
    targetLabel: "평가 대상자(target)", otherLabel: "다른 참여자(context)", roleHint: "예: 효율성 / 안전성 / 비용",
    needsRole: true, needsOthers: true,
  },
};

export default function SpeakerRoleMapping({ competencyKey, value, onApply, disabled }: SpeakerRoleMappingProps) {
  const guide = GUIDE[competencyKey] || GUIDE.trustBuilding;
  const [targetName, setTargetName] = useState(value.targetName || "");
  const [targetRole, setTargetRole] = useState(value.targetRole || "");
  const [others, setOthers] = useState<string[]>(value.otherParticipants || []);
  const [newOther, setNewOther] = useState("");
  const [glossary, setGlossary] = useState<string[]>(value.glossary || []);
  const [newTerm, setNewTerm] = useState("");
  const [open, setOpen] = useState(false);

  const addOther = () => {
    const t = newOther.trim();
    if (t && !others.includes(t)) { setOthers([...others, t]); setNewOther(""); }
  };
  const removeOther = (name: string) => setOthers(others.filter((o) => o !== name));
  const addTerm = () => {
    const t = newTerm.trim();
    if (t && !glossary.includes(t)) { setGlossary([...glossary, t]); setNewTerm(""); }
  };
  const removeTerm = (t: string) => setGlossary(glossary.filter((g) => g !== t));

  const dirty = targetName !== (value.targetName || "")
    || targetRole !== (value.targetRole || "")
    || JSON.stringify(others) !== JSON.stringify(value.otherParticipants || [])
    || JSON.stringify(glossary) !== JSON.stringify(value.glossary || []);

  const apply = () => {
    onApply({
      targetName: targetName.trim() || undefined,
      targetRole: targetRole.trim() || undefined,
      otherParticipants: others.length > 0 ? others : undefined,
      glossary: glossary.length > 0 ? glossary : undefined,
    });
    setOpen(false);
  };

  const summary = value.targetName
    ? `평가 대상자: ${value.targetName}${value.targetRole ? ` (${value.targetRole})` : ""}${value.otherParticipants?.length ? ` · 맥락 ${value.otherParticipants.length}인` : ""}`
    : "평가 대상자·화자 미지정 — 코치 보정 권장";

  return (
    <div className="bg-white/60 border border-[#006341]/20 rounded-xl overflow-hidden">
      {/* 헤더 (접기/펼치기) */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#006341]/[0.05] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#006341]/12 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-[#006341]" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-slate-800">화자·역할 보정 (코치)</p>
            <p className={cn("text-xs truncate", value.targetName ? "text-slate-500" : "text-amber-600")}>{summary}</p>
          </div>
        </div>
        <span className="text-xs text-[#006341] shrink-0 ml-2">{open ? "접기" : "보정"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#006341]/12">
          {/* 안내 */}
          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 bg-slate-50/60 rounded-lg px-2.5 py-2">
            <Info className="w-3.5 h-3.5 text-[#006341]/60 shrink-0 mt-0.5" />
            <p>화자분리·STT 인식 오류가 있을 수 있습니다. 평가 대상자와 화자 라벨을 지정하면 해당 1인 기준으로 다시 분석합니다. (스펙: 화자분리·역할매핑은 평가의 전제)</p>
          </div>

          {/* 평가 대상자 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
              {guide.targetLabel}
            </label>
            <input
              type="text"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="예: B부장 / 홍길동 / 발표자"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600/40 focus:ring-1 focus:ring-emerald-600/15"
            />
          </div>

          {/* 부여 역할 (신뢰형성) */}
          {guide.needsRole && (
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">부여 역할 (선택)</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder={guide.roleHint}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600/40 focus:ring-1 focus:ring-emerald-600/15"
              />
            </div>
          )}

          {/* 다른 참여자 라벨 */}
          {guide.needsOthers && (
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">{guide.otherLabel}</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {others.map((o) => (
                  <span key={o} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-md px-2 py-1">
                    {o}
                    <button onClick={() => removeOther(o)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newOther}
                  onChange={(e) => setNewOther(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOther())}
                  placeholder="참여자 라벨 추가 (예: A부장)"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600/40 focus:ring-1 focus:ring-emerald-600/15"
                />
                <button onClick={addOther} className="px-2.5 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 도메인 용어 사전 (STT 오인식 보정 — "엄사방", "주무차장" 등) */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              도메인 용어 사전 <span className="text-slate-400 font-normal">(음성인식 오인식 보정 — 인명·직책·부서)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {glossary.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 rounded-md px-2 py-1">
                  {t}
                  <button onClick={() => removeTerm(t)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTerm())}
                placeholder="정확한 용어 추가 (예: 엄사방, 주무차장)"
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600/40 focus:ring-1 focus:ring-emerald-600/15"
              />
              <button onClick={addTerm} className="px-2.5 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">※ 근본 해결은 온프렘 한국어 STT — 현재는 인식 보정 단계입니다.</p>
          </div>

          {/* 재분석 버튼 — 화자분리(targetName) 또는 용어사전(glossary) 변경이면 활성 */}
          <button
            onClick={apply}
            disabled={disabled || !dirty || (!targetName.trim() && glossary.length === 0)}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              disabled || !dirty || (!targetName.trim() && glossary.length === 0)
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-[#006341] text-white hover:bg-[#00543a]",
            )}
          >
            <RefreshCw className={cn("w-4 h-4", disabled && "animate-spin")} />
            {disabled ? "분석 중..." : "이 설정으로 재분석"}
          </button>
        </div>
      )}
    </div>
  );
}

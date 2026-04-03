"use client";

import { useState, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  ChevronRight,
  Upload,
  CheckCircle2,
  Circle,
  Play,
  Video,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import VideoUploader from "@/components/shared/VideoUploader";
import { useVideoUpload } from "@/hooks/useTwelveLabs";
import { TWELVELABS_INDEXES } from "@/lib/constants";
import {
  COMPETENCY_ORDER,
  createEmptySession,
} from "@/lib/group-types";
import type { GroupSession, GroupMember } from "@/lib/group-types";
import { saveSession } from "@/lib/group-store";
import { cn } from "@/lib/utils";

interface GroupManagerProps {
  session: GroupSession;
  onUpdate: (session: GroupSession) => void;
  onBack: () => void;
  onViewDashboard: () => void;
  onAnalyzeMember: (memberId: string, memberName: string, videoId: string, videoUrl?: string, competencyKey?: string) => void;
}

export default function GroupManager({
  session,
  onUpdate,
  onBack,
  onViewDashboard,
  onAnalyzeMember,
}: GroupManagerProps) {
  const { progress: uploadProgress, upload } = useVideoUpload();
  const [uploadingFor, setUploadingFor] = useState<string | null>(null); // memberId or "shared"

  const currentComp = COMPETENCY_ORDER[session.currentStep];
  const currentState = session.competencies[session.currentStep];
  const isGroupType = currentComp?.type === "group";

  // 완료된 역량 수
  const completedSteps = session.competencies.filter((c) => {
    if (c.type === "group") return !!c.sharedVideoId;
    return session.members.every((m) => !!c.memberVideos[m.id]);
  }).length;

  // 현재 역량에서 업로드된 영상 수
  const uploadedCount = isGroupType
    ? (currentState?.sharedVideoId ? 1 : 0)
    : session.members.filter((m) => currentState?.memberVideos[m.id]).length;

  // 영상 업로드 핸들러
  const handleUpload = useCallback(async (file: File, memberId: string) => {
    setUploadingFor(memberId);
    try {
      const videoId = await upload(TWELVELABS_INDEXES.leadership, file);
      const blobUrl = URL.createObjectURL(file);

      const updated = { ...session };
      const comp = updated.competencies[session.currentStep];

      if (isGroupType) {
        comp.sharedVideoId = videoId;
        comp.sharedFileName = file.name;
        comp.sharedBlobUrl = blobUrl;
      } else {
        comp.memberVideos[memberId] = {
          videoId,
          fileName: file.name,
          blobUrl,
        };
      }

      saveSession(updated);
      onUpdate(updated);
    } catch {
      // useVideoUpload 내부 처리
    } finally {
      setUploadingFor(null);
    }
  }, [session, upload, isGroupType, onUpdate]);

  // 다음 역량으로 진행
  const goNextStep = useCallback(() => {
    if (session.currentStep < 3) {
      const updated = { ...session, currentStep: session.currentStep + 1 };
      saveSession(updated);
      onUpdate(updated);
    }
  }, [session, onUpdate]);

  // 이전 역량으로
  const goPrevStep = useCallback(() => {
    if (session.currentStep > 0) {
      const updated = { ...session, currentStep: session.currentStep - 1 };
      saveSession(updated);
      onUpdate(updated);
    }
  }, [session, onUpdate]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-6 animate-slide-in-right">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-500 hover:text-teal-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-teal-600">{session.name}</h2>
            <p className="text-sm text-slate-500">{session.members.length}명 · {completedSteps}/4 역량 완료</p>
          </div>
        </div>
        <button
          onClick={onViewDashboard}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-teal-50 text-teal-600 border border-teal-500/20 hover:bg-teal-100 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          비교 대시보드
        </button>
      </div>

      {/* 수업 진행 스텝 인디케이터 */}
      <div className="bg-white border border-slate-200/40 rounded-xl p-4">
        <div className="flex items-center gap-2">
          {COMPETENCY_ORDER.map((comp, i) => {
            const isDone = i < session.currentStep || (i === session.currentStep && uploadedCount >= (isGroupType ? 1 : 6));
            const isCurrent = i === session.currentStep;
            return (
              <div key={comp.key} className="flex items-center flex-1">
                <button
                  onClick={() => {
                    const updated = { ...session, currentStep: i };
                    saveSession(updated);
                    onUpdate(updated);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg w-full transition-all text-left",
                    isCurrent ? "bg-white shadow-md border-2" : isDone ? "bg-slate-50" : "bg-slate-50/50",
                  )}
                  style={{ borderColor: isCurrent ? comp.color : "transparent" }}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" style={{ color: comp.color }} />
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: comp.color }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: comp.color }} />
                      </div>
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-xs font-semibold truncate", isCurrent ? "text-slate-800" : "text-slate-500")}>
                      {comp.label}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{comp.activityType}</p>
                  </div>
                </button>
                {i < 3 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0 mx-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 현재 역량 — 영상 업로드 영역 */}
      <div className="bg-white border border-slate-200/40 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${currentComp.color}15` }}>
            <Users className="w-5 h-5" style={{ color: currentComp.color }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: currentComp.color }}>
              {currentComp.label} — {currentComp.activityType}
            </h3>
            <p className="text-sm text-slate-500">
              {isGroupType
                ? "집단 토론 영상 1개를 업로드해주세요 (6명 공용)"
                : `${session.members.length}명 각자의 발표 영상을 업로드해주세요`}
            </p>
          </div>
        </div>

        {/* 집단 토론: 공용 영상 1개 업로드 */}
        {isGroupType && (
          <div className="space-y-3">
            {currentState?.sharedVideoId ? (
              <div className="flex items-center gap-3 p-3 bg-teal-50/50 border border-teal-200/30 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{currentState.sharedFileName}</p>
                  <p className="text-xs text-teal-600">집단 토론 영상 업로드 완료</p>
                </div>
                <button
                  onClick={() => {
                    // 6명 각각에 대해 분석 가능하게
                    onAnalyzeMember("shared", "집단 토론", currentState.sharedVideoId!, currentState.sharedBlobUrl, currentComp.key);
                  }}
                  className="text-xs text-teal-600 hover:text-teal-500 px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-50 transition-colors"
                >
                  <Play className="w-3 h-3 inline mr-1" />분석
                </button>
              </div>
            ) : (
              <VideoUploader
                onUpload={(file) => handleUpload(file, "shared")}
                progress={uploadingFor === "shared" ? uploadProgress : null}
                accentColor="teal"
              />
            )}
          </div>
        )}

        {/* 개별 발표: 6명 각자 업로드 */}
        {!isGroupType && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {session.members.map((member) => {
              const videoInfo = currentState?.memberVideos[member.id];
              const hasVideo = !!videoInfo;
              const isUploading = uploadingFor === member.id;
              const score = currentState?.memberScores[member.id];

              return (
                <div
                  key={member.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all",
                    hasVideo ? "bg-white border-teal-200/50" : "bg-slate-50/50 border-slate-200/40 border-dashed"
                  )}
                >
                  {/* 멤버 정보 */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      hasVideo ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {member.order}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{member.name}</p>
                      <p className="text-[10px] text-slate-400">{member.position}</p>
                    </div>
                    {score?.analyzed && (
                      <span className="ml-auto text-xs font-mono font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                        {score.overallScore.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {hasVideo ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 truncate">{videoInfo.fileName}</p>
                      <button
                        onClick={() => onAnalyzeMember(member.id, member.name, videoInfo.videoId, videoInfo.blobUrl, currentComp.key)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200/50 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        {score?.analyzed ? "결과 보기" : "분석 시작"}
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5 text-slate-400" />
                        )}
                        <p className="text-xs text-slate-400">
                          {isUploading ? "업로드 중..." : "영상 업로드"}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file, member.id);
                        }}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 진행 버튼 */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/30">
          <button
            onClick={goPrevStep}
            disabled={session.currentStep === 0}
            className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30 transition-colors"
          >
            ← 이전 역량
          </button>
          <div className="text-sm text-slate-400">
            {uploadedCount}/{isGroupType ? 1 : session.members.length}명 업로드
          </div>
          <button
            onClick={goNextStep}
            disabled={session.currentStep >= 3}
            className="text-sm font-medium text-teal-600 hover:text-teal-500 disabled:opacity-30 transition-colors"
          >
            다음 역량 →
          </button>
        </div>
      </div>

      {/* 참가자 목록 요약 */}
      <div className="bg-white border border-slate-200/40 rounded-xl p-4">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">참가자 ({session.members.length}명)</p>
        <div className="flex flex-wrap gap-2">
          {session.members.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg">
              <span className="text-xs font-mono text-slate-400">{m.order}</span>
              <span className="text-sm font-medium text-slate-700">{m.name}</span>
              <span className="text-[10px] text-slate-400">{m.position}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 조 생성 폼 (별도 export) ───

interface GroupCreateFormProps {
  onSubmit: (session: GroupSession) => void;
  onCancel: () => void;
}

export function GroupCreateForm({ onSubmit, onCancel }: GroupCreateFormProps) {
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<{ name: string; position: string }[]>(
    Array.from({ length: 6 }, () => ({ name: "", position: "부장" }))
  );

  const canSubmit = groupName.trim() && members.every((m) => m.name.trim());

  return (
    <div className="max-w-[700px] mx-auto px-4 md:px-6 py-8 space-y-6 animate-fade-in-up">
      <h2 className="text-xl font-bold text-teal-600">새 조 만들기</h2>
      <p className="text-sm text-slate-500">디브리핑용 6인 조를 생성합니다. 수업 순서대로 역량별 영상을 등록하고 비교 분석합니다.</p>

      {/* 조 이름 */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1.5">조 이름</label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="예: 2026년 1기 A조"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 transition-all"
        />
      </div>

      {/* 6명 참가자 */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">참가자 (6명)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-mono text-slate-400 w-5 text-center shrink-0">{i + 1}</span>
              <input
                type="text"
                value={m.name}
                onChange={(e) => {
                  const next = [...members];
                  next[i] = { ...next[i], name: e.target.value };
                  setMembers(next);
                }}
                placeholder={`참가자 ${i + 1} 이름`}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500/30 transition-all"
              />
              <select
                value={m.position}
                onChange={(e) => {
                  const next = [...members];
                  next[i] = { ...next[i], position: e.target.value };
                  setMembers(next);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none focus:border-teal-500/30 transition-all"
              >
                <option value="부장">부장</option>
                <option value="차장">차장</option>
                <option value="과장">과장</option>
                <option value="대리">대리</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* 수업 순서 안내 */}
      <div className="bg-slate-50 border border-slate-200/40 rounded-xl p-4">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">수업 진행 순서</p>
        <div className="flex items-center gap-2 text-sm">
          {COMPETENCY_ORDER.map((c, i) => (
            <div key={c.key} className="flex items-center gap-1.5">
              <span className="font-medium" style={{ color: c.color }}>{c.label}</span>
              <span className="text-[10px] text-slate-400">({c.activityType})</span>
              {i < 3 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </div>
          ))}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (canSubmit) {
              const session = createEmptySession(groupName, members);
              onSubmit(session);
            }
          }}
          disabled={!canSubmit}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-all",
            canSubmit
              ? "bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          <Plus className="w-4 h-4" />
          조 생성 및 수업 시작
        </button>
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          취소
        </button>
      </div>
    </div>
  );
}

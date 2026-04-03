"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Users,
  Plus,
  ChevronRight,
  Upload,
  CheckCircle2,
  Circle,
  Play,
  ArrowLeft,
  BarChart3,
  Loader2,
  FileText,
  Video,
} from "lucide-react";
import { useVideoUpload } from "@/hooks/useTwelveLabs";
import { TWELVELABS_INDEXES } from "@/lib/constants";
import {
  COMPETENCY_ORDER,
  createEmptySession,
} from "@/lib/group-types";
import type { GroupSession } from "@/lib/group-types";
import { saveSession } from "@/lib/group-store";
import { cn } from "@/lib/utils";

interface GroupManagerProps {
  session: GroupSession;
  onUpdate: (session: GroupSession) => void;
  onBack: () => void;
  onViewDashboard: () => void;
  onAnalyzeMember: (memberId: string, memberName: string, videoId: string, videoUrl?: string, competencyKey?: string, scenarioText?: string) => void;
}

export default function GroupManager({
  session,
  onUpdate,
  onBack,
  onViewDashboard,
  onAnalyzeMember,
}: GroupManagerProps) {
  const { progress: uploadProgress, upload } = useVideoUpload();
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [scenarioText, setScenarioText] = useState("");

  // 업로드 중 페이지 이탈 경고
  useEffect(() => {
    if (!uploadingFor) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 표준: returnValue 설정으로 브라우저 확인 대화상자 트리거
      e.returnValue = "영상 업로드가 진행 중입니다. 페이지를 나가시겠습니까?";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploadingFor]);

  const currentComp = COMPETENCY_ORDER[session.currentStep];
  const currentState = session.competencies[session.currentStep];
  const isGroupType = currentComp?.type === "group";
  const isHybridType = currentComp?.type === "hybrid";
  const isIndividualType = currentComp?.type === "individual";

  const completedSteps = session.competencies.filter((c) => {
    if (c.type === "group") return !!c.sharedVideoId;
    if (c.type === "hybrid") return !!c.sharedVideoId && session.members.every((m) => !!c.memberVideos[m.id]);
    return session.members.every((m) => !!c.memberVideos[m.id]);
  }).length;

  const individualCount = session.members.filter((m) => currentState?.memberVideos[m.id]).length;
  const hasGroupVideo = !!currentState?.sharedVideoId;
  const uploadedCount = isGroupType
    ? (hasGroupVideo ? 1 : 0)
    : isHybridType
      ? individualCount + (hasGroupVideo ? 1 : 0)
      : individualCount;
  const totalExpected = isGroupType ? 1 : isHybridType ? session.members.length + 1 : session.members.length;

  const handleUpload = useCallback(async (file: File, memberId: string) => {
    setUploadingFor(memberId);
    try {
      const videoId = await upload(TWELVELABS_INDEXES.leadership, file);
      const blobUrl = URL.createObjectURL(file);
      const updated = { ...session };
      const comp = updated.competencies[session.currentStep];
      if (memberId === "shared") {
        comp.sharedVideoId = videoId;
        comp.sharedFileName = file.name;
        comp.sharedBlobUrl = blobUrl;
      } else {
        comp.memberVideos[memberId] = { videoId, fileName: file.name, blobUrl };
      }
      saveSession(updated);
      onUpdate(updated);
    } catch { /* */ } finally {
      setUploadingFor(null);
    }
  }, [session, upload, onUpdate]);

  const goStep = useCallback((step: number) => {
    const updated = { ...session, currentStep: Math.max(0, Math.min(3, step)) };
    saveSession(updated);
    onUpdate(updated);
  }, [session, onUpdate]);

  // 업로드 진행률 (0~100)
  const uploadPercent = uploadProgress?.progress || 0;
  const uploadStatus = uploadProgress?.status;

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

      {/* 수업 진행 스텝 */}
      <div className="bg-white border border-slate-200/40 rounded-xl p-4">
        <div className="flex items-center gap-2">
          {COMPETENCY_ORDER.map((comp, i) => {
            const isDone = i < session.currentStep;
            const isCurrent = i === session.currentStep;
            return (
              <div key={comp.key} className="flex items-center flex-1">
                <button
                  onClick={() => goStep(i)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg w-full transition-all text-left",
                    isCurrent ? "bg-white shadow-md border-2" : isDone ? "bg-slate-50" : "bg-slate-50/50",
                  )}
                  style={{ borderColor: isCurrent ? comp.color : "transparent" }}
                >
                  <div className="shrink-0">
                    {isDone ? <CheckCircle2 className="w-5 h-5" style={{ color: comp.color }} /> :
                     isCurrent ? <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: comp.color }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: comp.color }} /></div> :
                     <Circle className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-xs font-semibold truncate", isCurrent ? "text-slate-800" : "text-slate-500")}>{comp.label}</p>
                    <p className="text-[10px] text-slate-400 truncate">{comp.activityType}</p>
                  </div>
                </button>
                {i < 3 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0 mx-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 상황사례 입력 (선택) */}
      <div className="bg-white border border-slate-200/40 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-medium text-slate-700">상황사례 (선택)</span>
          <span className="text-[10px] text-slate-400">— 입력하면 더 정확한 평가가 가능합니다</span>
        </div>
        <textarea
          value={scenarioText}
          onChange={(e) => setScenarioText(e.target.value)}
          placeholder={`${currentComp.label} 평가 상황을 입력하세요...\n예: 신재생에너지 전략 수립 TFT 발표`}
          className="w-full bg-slate-50/60 border border-slate-200/40 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500/30 transition-all resize-none leading-relaxed"
          rows={2}
        />
      </div>

      {/* 현재 역량 — 영상 업로드 */}
      <div className="bg-white border border-slate-200/40 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${currentComp.color}15` }}>
            <Users className="w-5 h-5" style={{ color: currentComp.color }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: currentComp.color }}>
              {currentComp.label} — {currentComp.activityType}
            </h3>
            <p className="text-sm text-slate-500">{currentComp.description}</p>
          </div>
        </div>

        {/* 전체 업로드 진행 바 (업로드 중일 때) */}
        {uploadingFor && (
          <div className="mb-4 bg-teal-50/50 border border-teal-200/30 rounded-xl p-3 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
              <span className="text-sm text-teal-700 font-medium">
                {uploadStatus === "indexing" ? "AI 인덱싱 중..." : "영상 업로드 중..."}
              </span>
              <span className="text-sm font-mono text-teal-600 ml-auto">{Math.round(uploadPercent)}%</span>
            </div>
            <div className="h-2 bg-teal-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* ═══ hybrid: 신뢰형성 (개별 클로즈업 6개 + 전체 와이드 1개) ═══ */}
        {isHybridType && (
          <div className="space-y-5">
            {/* 전체 와이드샷 */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Video className="w-4 h-4 text-amber-500" />
                전체 와이드샷 (경청 태도 분석용)
              </p>
              {currentState?.sharedVideoId ? (
                <div className="flex items-center gap-3 p-3 bg-amber-50/50 border border-amber-200/30 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{currentState.sharedFileName}</p>
                    <p className="text-xs text-amber-600">전체 영상 업로드 완료</p>
                  </div>
                  <button
                    onClick={() => onAnalyzeMember("shared", "전체 토론", currentState.sharedVideoId!, currentState.sharedBlobUrl, currentComp.key, scenarioText)}
                    className="text-xs text-amber-600 hover:text-amber-500 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors"
                  >
                    <Play className="w-3 h-3 inline mr-1" />경청 분석
                  </button>
                </div>
              ) : (
                <label className={cn(
                  "block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all",
                  uploadingFor === "shared" ? "border-amber-300 bg-amber-50/30" : "border-amber-200/60 hover:border-amber-300 hover:bg-amber-50/20"
                )}>
                  {uploadingFor === "shared" ? (
                    <Loader2 className="w-6 h-6 mx-auto text-amber-500 animate-spin mb-1" />
                  ) : (
                    <Upload className="w-6 h-6 mx-auto text-amber-400 mb-1" />
                  )}
                  <p className="text-sm text-slate-600">전체 와이드샷 영상 업로드</p>
                  <p className="text-xs text-slate-400 mt-0.5">6명이 모두 보이는 전체 촬영 영상</p>
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "shared"); }} />
                </label>
              )}
            </div>

            {/* 개별 클로즈업 6명 */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: currentComp.color }} />
                개별 클로즈업 (발언 분석용) — {individualCount}/{session.members.length}명
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {session.members.map((member) => {
                  const videoInfo = currentState?.memberVideos[member.id];
                  const hasVideo = !!videoInfo;
                  const isUploading = uploadingFor === member.id;
                  const score = currentState?.memberScores[member.id];

                  return (
                    <div key={member.id} className={cn("rounded-xl border p-4 transition-all", hasVideo ? "bg-white border-amber-200/50" : "bg-slate-50/50 border-slate-200/40")}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold", hasVideo ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>{member.order}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">{member.name}</p>
                          <p className="text-xs text-slate-400">{member.position}</p>
                        </div>
                        {score?.analyzed && <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{score.overallScore.toFixed(1)}/9</span>}
                        {hasVideo && !score?.analyzed && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                      </div>
                      {hasVideo ? (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500 truncate">{videoInfo.fileName}</p>
                          <button onClick={() => onAnalyzeMember(member.id, member.name, videoInfo.videoId, videoInfo.blobUrl, currentComp.key, scenarioText)} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/50 transition-colors">
                            <Play className="w-3.5 h-3.5" />{score?.analyzed ? "결과 보기" : "발언 분석"}
                          </button>
                        </div>
                      ) : (
                        <label className={cn("block cursor-pointer rounded-lg border-2 border-dashed transition-all", isUploading ? "border-amber-300 bg-amber-50/30" : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/20")}>
                          <div className="flex flex-col items-center gap-2 py-5 text-center">
                            {isUploading ? (
                              <>
                                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                                <p className="text-xs text-amber-600 font-medium">{uploadStatus === "indexing" ? "인덱싱 중..." : `업로드 ${Math.round(uploadPercent)}%`}</p>
                                <div className="w-24 h-1.5 bg-amber-100 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${uploadPercent}%` }} /></div>
                              </>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-slate-400" />
                                <p className="text-xs text-slate-500">클로즈업 영상</p>
                              </>
                            )}
                          </div>
                          <input type="file" accept="video/*" className="hidden" disabled={isUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, member.id); }} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ group: 공용 1개 (현재 사용 안 함, 하위 호환) ═══ */}
        {isGroupType && (
          <div>
            {currentState?.sharedVideoId ? (
              <div className="flex items-center gap-3 p-3 bg-teal-50/50 border border-teal-200/30 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{currentState.sharedFileName}</p>
                  <p className="text-xs text-teal-600">업로드 완료</p>
                </div>
                <button
                  onClick={() => onAnalyzeMember("shared", "집단 토론", currentState.sharedVideoId!, currentState.sharedBlobUrl, currentComp.key, scenarioText)}
                  className="text-xs text-teal-600 hover:text-teal-500 px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-50 transition-colors"
                >
                  <Play className="w-3 h-3 inline mr-1" />분석
                </button>
              </div>
            ) : (
              <label className={cn(
                "block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
                uploadingFor === "shared" ? "border-teal-300 bg-teal-50/30" : "border-slate-200 hover:border-teal-300 hover:bg-teal-50/20"
              )}>
                {uploadingFor === "shared" ? (
                  <Loader2 className="w-8 h-8 mx-auto text-teal-500 animate-spin mb-2" />
                ) : (
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                )}
                <p className="text-sm text-slate-600">집단 토론 영상 업로드</p>
                <p className="text-xs text-slate-400 mt-1">MP4, AVI, MOV</p>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "shared"); }} />
              </label>
            )}
          </div>
        )}

        {/* ═══ individual: 개별 발표 — 2열 그리드 ═══ */}
        {isIndividualType && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    hasVideo ? "bg-white border-teal-200/50" : "bg-slate-50/50 border-slate-200/40"
                  )}
                >
                  {/* 멤버 정보 */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold",
                      hasVideo ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {member.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{member.name}</p>
                      <p className="text-xs text-slate-400">{member.position}</p>
                    </div>
                    {score?.analyzed && (
                      <span className="text-xs font-mono font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                        {score.overallScore.toFixed(1)}/9
                      </span>
                    )}
                    {hasVideo && !score?.analyzed && (
                      <CheckCircle2 className="w-4 h-4 text-teal-500" />
                    )}
                  </div>

                  {hasVideo ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 truncate">{videoInfo.fileName}</p>
                      <button
                        onClick={() => onAnalyzeMember(member.id, member.name, videoInfo.videoId, videoInfo.blobUrl, currentComp.key, scenarioText)}
                        className="w-full flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200/50 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {score?.analyzed ? "결과 보기" : "분석 시작"}
                      </button>
                    </div>
                  ) : (
                    <label className={cn(
                      "block cursor-pointer rounded-lg border-2 border-dashed transition-all",
                      isUploading ? "border-teal-300 bg-teal-50/30" : "border-slate-200 hover:border-teal-300 hover:bg-teal-50/20"
                    )}>
                      <div className="flex flex-col items-center gap-2 py-5 text-center">
                        {isUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                            <p className="text-xs text-teal-600 font-medium">
                              {uploadStatus === "indexing" ? "인덱싱 중..." : `업로드 ${Math.round(uploadPercent)}%`}
                            </p>
                            <div className="w-24 h-1.5 bg-teal-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${uploadPercent}%` }} />
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-slate-400" />
                            <p className="text-xs text-slate-500">영상 업로드</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, member.id); }}
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
          <button onClick={() => goStep(session.currentStep - 1)} disabled={session.currentStep === 0} className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30 transition-colors">← 이전 역량</button>
          <div className="text-sm text-slate-400">{uploadedCount}/{totalExpected}건 업로드</div>
          <button onClick={() => goStep(session.currentStep + 1)} disabled={session.currentStep >= 3} className="text-sm font-medium text-teal-600 hover:text-teal-500 disabled:opacity-30 transition-colors">다음 역량 →</button>
        </div>
      </div>
    </div>
  );
}

// ─── 조 생성 폼 ───

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
      <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 돌아가기
      </button>

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

      {/* 6명 참가자 — 1열 레이아웃 (겹침 방지) */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">참가자 (6명)</label>
        <div className="space-y-2">
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-50/50 rounded-lg p-2">
              <span className="text-sm font-mono font-bold text-slate-400 w-6 text-center shrink-0">{i + 1}</span>
              <input
                type="text"
                value={m.name}
                onChange={(e) => {
                  const next = [...members];
                  next[i] = { ...next[i], name: e.target.value };
                  setMembers(next);
                }}
                placeholder={`참가자 ${i + 1} 이름`}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500/30 transition-all"
              />
              <select
                value={m.position}
                onChange={(e) => {
                  const next = [...members];
                  next[i] = { ...next[i], position: e.target.value };
                  setMembers(next);
                }}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-500/30 transition-all w-20"
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
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {COMPETENCY_ORDER.map((c, i) => (
            <div key={c.key} className="flex items-center gap-1">
              <span className="font-medium" style={{ color: c.color }}>{c.label}</span>
              <span className="text-[10px] text-slate-400">({c.activityType})</span>
              {i < 3 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </div>
          ))}
        </div>
      </div>

      {/* 버튼 */}
      <button
        onClick={() => { if (canSubmit) onSubmit(createEmptySession(groupName, members)); }}
        disabled={!canSubmit}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold transition-all",
          canSubmit
            ? "bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20"
            : "bg-slate-100 text-slate-400 cursor-not-allowed"
        )}
      >
        <Plus className="w-4 h-4" />
        조 생성 및 수업 시작
      </button>
    </div>
  );
}

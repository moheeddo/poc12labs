"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Users,
  Plus,
  ChevronRight,
  ChevronDown,
  Upload,
  CheckCircle2,
  Circle,
  Play,
  ArrowLeft,
  BarChart3,
  Loader2,
  FileText,
  Video,
  Lightbulb,
  MessageSquarePlus,
  MessageSquareText,
  X,
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
import type { LeadershipCompetencyKey } from "@/lib/types";

// 역량별 평가자 관찰 포인트 (1-3직급 4개 역량 + 4직급 호환)
const OBSERVATION_TIPS: Record<LeadershipCompetencyKey, string[]> = {
  visionPresentation: [
    "PEST 분석 활용도",
    "전략-과제 정합성",
    "도전성",
    "발표 전달력에 주목하세요",
  ],
  trustBuilding: [
    "갈등 분석력",
    "대안 도출",
    "적극 참여",
    "존중·협력",
    "설득 합의에 주목하세요",
  ],
  memberDevelopment: [
    "문제 인식",
    "개선 계획 구체성",
    "발전적 피드백",
    "심리적 안전감",
    "공동 대안에 주목하세요",
  ],
  rationalDecision: [
    "문제 분석",
    "논리적 근거",
    "의견 수렴",
    "리스크 관리",
    "실행 계획에 주목하세요",
  ],
  // 4직급 역량 키 (현재 미사용이지만 타입 호환 필요)
  visionPractice: [],
  communication: [],
  selfDevelopment: [],
  problemSolving: [],
};

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
  const [tipOpen, setTipOpen] = useState(false);

  // ── 메모 기능 상태 ──
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  // 메모 편집 시작
  const startEditNote = useCallback((memberId: string) => {
    setEditingNoteFor(memberId);
    setNoteText(session.memberNotes?.[memberId] || "");
    // 다음 렌더 후 textarea 포커스
    setTimeout(() => noteInputRef.current?.focus(), 50);
  }, [session.memberNotes]);

  // 메모 저장
  const saveNote = useCallback((memberId: string) => {
    const trimmed = noteText.trim();
    const updated = { ...session, memberNotes: { ...(session.memberNotes || {}), [memberId]: trimmed } };
    // 빈 메모면 삭제
    if (!trimmed) {
      delete updated.memberNotes[memberId];
    }
    saveSession(updated);
    onUpdate(updated);
    setEditingNoteFor(null);
    setNoteText("");
  }, [session, noteText, onUpdate]);

  // 메모 삭제
  const deleteNote = useCallback((memberId: string) => {
    const updated = { ...session, memberNotes: { ...(session.memberNotes || {}) } };
    delete updated.memberNotes[memberId];
    saveSession(updated);
    onUpdate(updated);
    setEditingNoteFor(null);
    setNoteText("");
  }, [session, onUpdate]);

  // 스텝 바 미니 요약 팝오버 상태
  const [previewStep, setPreviewStep] = useState<number | null>(null);

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

  // 현재 역량 분석 완료 인원수 (진행률 바용)
  const analyzedCount = session.members.filter(
    (m) => currentState?.memberScores[m.id]?.analyzed
  ).length;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-500 hover:text-teal-600 transition-colors" aria-label="뒤로 가기">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-teal-600">{session.name}</h2>
            <p className="text-sm text-slate-500">{session.members.length}명 · {completedSteps}/4 역량 완료</p>
          </div>
        </div>
        <button
          onClick={onViewDashboard}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-teal-50 text-teal-600 border border-teal-500/20 hover:bg-teal-100 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <BarChart3 className="w-4 h-4" />
          비교 대시보드
        </button>
      </div>

      {/* 수업 진행 스텝 */}
      <div className="bg-white border border-slate-200/40 rounded-xl p-4 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-[480px]">
          {COMPETENCY_ORDER.map((comp, i) => {
            const isDone = i < session.currentStep;
            const isCurrent = i === session.currentStep;
            const stepState = session.competencies[i];
            const stepAnalyzed = session.members.filter(
              (m) => stepState?.memberScores[m.id]?.analyzed
            ).length;
            const hasAnalysis = stepAnalyzed > 0;
            return (
              <div key={comp.key} className="flex items-center flex-1 relative">
                <button
                  onClick={() => {
                    // 분석 완료된 이전 역량이면 팝오버 토글
                    if (hasAnalysis && !isCurrent) {
                      setPreviewStep(previewStep === i ? null : i);
                    } else {
                      setPreviewStep(null);
                    }
                    goStep(i);
                  }}
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
                    <p className="text-[10px] text-slate-400 truncate">
                      {comp.activityType}
                      {stepAnalyzed > 0 && (
                        <span className="ml-1 text-teal-600 font-medium">
                          · {stepAnalyzed}/{session.members.length}명
                        </span>
                      )}
                    </p>
                  </div>
                </button>
                {/* ── 미니 요약 팝오버: 해당 역량의 6명 점수 ── */}
                {previewStep === i && hasAnalysis && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-2 animate-fade-in-up">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[200px]">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold" style={{ color: comp.color }}>{comp.label} 결과</p>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewStep(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {session.members.map((m) => {
                          const sc = stepState?.memberScores[m.id];
                          return (
                            <div key={m.id} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 w-12 truncate">{m.name}</span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: sc?.analyzed ? `${((sc.overallScore || 0) / 9) * 100}%` : "0%",
                                    backgroundColor: (sc?.overallScore || 0) >= 7 ? "#14b8a6" : (sc?.overallScore || 0) >= 5 ? "#f59e0b" : (sc?.overallScore || 0) > 0 ? "#ef4444" : "#e2e8f0",
                                  }}
                                />
                              </div>
                              <span className={cn(
                                "text-[10px] font-mono font-bold w-7 text-right",
                                sc?.analyzed ? "text-slate-700" : "text-slate-300"
                              )}>
                                {sc?.analyzed ? (sc.overallScore || 0).toFixed(1) : "-"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
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

        {/* 분석 진행률 바 */}
        {individualCount > 0 && (
          <div className="mb-4 bg-slate-50/60 border border-slate-200/30 rounded-xl p-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-600 font-medium">분석 진행률</span>
              <span className="text-slate-500 font-mono text-xs">
                {analyzedCount}/{session.members.length}명 분석 완료
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${session.members.length > 0 ? (analyzedCount / session.members.length) * 100 : 0}%`,
                  backgroundColor: currentComp.color,
                }}
              />
            </div>
          </div>
        )}

        {/* 평가자를 위한 관찰 포인트 팁 (접이식) */}
        {OBSERVATION_TIPS[currentComp.key as LeadershipCompetencyKey]?.length > 0 && (
          <div className="mb-1">
            <button
              onClick={() => setTipOpen((prev) => !prev)}
              className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-500 transition-colors py-1"
            >
              <Lightbulb className="w-4 h-4" />
              <span className="font-medium">평가자를 위한 관찰 포인트</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", tipOpen && "rotate-180")} />
            </button>
            {tipOpen && (
              <div className="mt-2 bg-amber-50/60 border border-amber-200/40 rounded-lg px-4 py-3 animate-fade-in-up">
                <p className="text-sm text-amber-800 leading-relaxed">
                  {OBSERVATION_TIPS[currentComp.key as LeadershipCompetencyKey].join(", ")}
                </p>
              </div>
            )}
          </div>
        )}

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
                  const memberNote = session.memberNotes?.[member.id];
                  const isEditingNote = editingNoteFor === member.id;

                  return (
                    <div key={member.id} className={cn("rounded-xl border p-4 transition-all", hasVideo ? "bg-white border-amber-200/50" : "bg-slate-50/50 border-slate-200/40")}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold", hasVideo ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>{member.order}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">{member.name}</p>
                          <p className="text-xs text-slate-400">{member.position}</p>
                        </div>
                        {/* 메모 아이콘 */}
                        <button
                          onClick={() => isEditingNote ? saveNote(member.id) : startEditNote(member.id)}
                          className={cn(
                            "p-1.5 rounded-lg transition-all shrink-0",
                            memberNote
                              ? "text-violet-500 hover:bg-violet-50 hover:text-violet-600"
                              : "text-slate-300 hover:bg-slate-50 hover:text-slate-500"
                          )}
                          title={memberNote ? "메모 편집" : "메모 추가"}
                        >
                          {memberNote ? <MessageSquareText className="w-4 h-4" /> : <MessageSquarePlus className="w-4 h-4" />}
                        </button>
                        {score?.analyzed ? (
                          <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">{score.overallScore.toFixed(1)}/9</span>
                        ) : hasVideo ? (
                          <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/50">미분석</span>
                        ) : null}
                      </div>
                      {/* 메모 편집 / 표시 영역 */}
                      {isEditingNote && (
                        <div className="mb-3 animate-fade-in-up">
                          <textarea
                            ref={noteInputRef}
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="디브리핑 메모를 입력하세요..."
                            className="w-full bg-violet-50/50 border border-violet-200/50 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-violet-400 transition-all resize-none leading-relaxed"
                            rows={2}
                            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote(member.id); if (e.key === "Escape") { setEditingNoteFor(null); setNoteText(""); } }}
                          />
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-[10px] text-slate-400">Ctrl+Enter 저장 / Esc 취소</p>
                            <div className="flex items-center gap-1">
                              {memberNote && (
                                <button onClick={() => deleteNote(member.id)} className="text-[10px] text-red-400 hover:text-red-500 px-2 py-1 rounded transition-colors">
                                  삭제
                                </button>
                              )}
                              <button onClick={() => { setEditingNoteFor(null); setNoteText(""); }} className="text-[10px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded transition-colors">
                                취소
                              </button>
                              <button onClick={() => saveNote(member.id)} className="text-[10px] font-medium text-violet-600 hover:text-violet-500 bg-violet-50 px-2.5 py-1 rounded-md border border-violet-200/50 transition-colors">
                                저장
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {!isEditingNote && memberNote && (
                        <div
                          onClick={() => startEditNote(member.id)}
                          className="mb-3 bg-violet-50/40 border border-violet-200/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-violet-50/60 transition-colors"
                        >
                          <p className="text-xs text-violet-700 leading-relaxed whitespace-pre-wrap">{memberNote}</p>
                        </div>
                      )}
                      {hasVideo ? (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500 truncate">{videoInfo.fileName}</p>
                          <button onClick={() => onAnalyzeMember(member.id, member.name, videoInfo.videoId, videoInfo.blobUrl, currentComp.key, scenarioText)} className={cn("w-full flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg border transition-colors", score?.analyzed ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200/50" : "bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200/50")}>
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
              const memberNote = session.memberNotes?.[member.id];
              const isEditingNote = editingNoteFor === member.id;

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
                    {/* 메모 아이콘 */}
                    <button
                      onClick={() => isEditingNote ? saveNote(member.id) : startEditNote(member.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-all shrink-0",
                        memberNote
                          ? "text-violet-500 hover:bg-violet-50 hover:text-violet-600"
                          : "text-slate-300 hover:bg-slate-50 hover:text-slate-500"
                      )}
                      title={memberNote ? "메모 편집" : "메모 추가"}
                    >
                      {memberNote ? <MessageSquareText className="w-4 h-4" /> : <MessageSquarePlus className="w-4 h-4" />}
                    </button>
                    {score?.analyzed ? (
                      <span className="text-xs font-mono font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/50">
                        {score.overallScore.toFixed(1)}/9
                      </span>
                    ) : hasVideo ? (
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                        미분석
                      </span>
                    ) : null}
                  </div>

                  {/* 메모 편집 / 표시 영역 */}
                  {isEditingNote && (
                    <div className="mb-3 animate-fade-in-up">
                      <textarea
                        ref={noteInputRef}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="디브리핑 메모를 입력하세요..."
                        className="w-full bg-violet-50/50 border border-violet-200/50 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-violet-400 transition-all resize-none leading-relaxed"
                        rows={2}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote(member.id); if (e.key === "Escape") { setEditingNoteFor(null); setNoteText(""); } }}
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-slate-400">Ctrl+Enter 저장 / Esc 취소</p>
                        <div className="flex items-center gap-1">
                          {memberNote && (
                            <button onClick={() => deleteNote(member.id)} className="text-[10px] text-red-400 hover:text-red-500 px-2 py-1 rounded transition-colors">
                              삭제
                            </button>
                          )}
                          <button onClick={() => { setEditingNoteFor(null); setNoteText(""); }} className="text-[10px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded transition-colors">
                            취소
                          </button>
                          <button onClick={() => saveNote(member.id)} className="text-[10px] font-medium text-violet-600 hover:text-violet-500 bg-violet-50 px-2.5 py-1 rounded-md border border-violet-200/50 transition-colors">
                            저장
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {!isEditingNote && memberNote && (
                    <div
                      onClick={() => startEditNote(member.id)}
                      className="mb-3 bg-violet-50/40 border border-violet-200/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-violet-50/60 transition-colors"
                    >
                      <p className="text-xs text-violet-700 leading-relaxed whitespace-pre-wrap">{memberNote}</p>
                    </div>
                  )}

                  {hasVideo ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 truncate">{videoInfo.fileName}</p>
                      <button
                        onClick={() => onAnalyzeMember(member.id, member.name, videoInfo.videoId, videoInfo.blobUrl, currentComp.key, scenarioText)}
                        className={cn(
                          "w-full flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg border transition-colors",
                          score?.analyzed
                            ? "bg-teal-50 text-teal-600 hover:bg-teal-100 border-teal-200/50"
                            : "bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200/50"
                        )}
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

        {/* 전체 일괄 분석 안내 버튼 — 영상 올린 미분석 멤버가 2명 이상일 때 표시 */}
        {(() => {
          const unanalyzedWithVideo = session.members.filter((m) => {
            const hasVideo = !!currentState?.memberVideos[m.id];
            const isAnalyzed = currentState?.memberScores[m.id]?.analyzed;
            return hasVideo && !isAnalyzed;
          });
          if (unanalyzedWithVideo.length < 2) return null;
          return (
            <div className="mt-4 bg-teal-50/60 border border-teal-200/40 rounded-xl p-4 animate-fade-in-up">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Play className="w-4 h-4 text-teal-600" />
                  <div>
                    <p className="text-sm font-semibold text-teal-700">전체 분석 시작 ({unanalyzedWithVideo.length}명)</p>
                    <p className="text-xs text-teal-600/70 mt-0.5">각 멤버 카드의 &ldquo;분석 시작&rdquo; 버튼을 순서대로 클릭하세요</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // 첫 번째 미분석 멤버의 분석 시작
                    const first = unanalyzedWithVideo[0];
                    const videoInfo = currentState?.memberVideos[first.id];
                    if (videoInfo) {
                      onAnalyzeMember(first.id, first.name, videoInfo.videoId, videoInfo.blobUrl, currentComp.key, scenarioText);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-500 transition-colors shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  첫 번째 분석
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {unanalyzedWithVideo.map((m, i) => (
                  <span key={m.id} className="text-xs bg-white text-teal-700 px-2 py-0.5 rounded-md border border-teal-200/50">
                    {i + 1}. {m.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 진행 버튼 */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/30">
          <button onClick={() => goStep(session.currentStep - 1)} disabled={session.currentStep === 0} className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30 transition-colors">&larr; 이전 역량</button>
          <div className="text-sm text-slate-400">{uploadedCount}/{totalExpected}건 업로드</div>
          <button onClick={() => goStep(session.currentStep + 1)} disabled={session.currentStep >= 3} className="text-sm font-medium text-teal-600 hover:text-teal-500 disabled:opacity-30 transition-colors">다음 역량 &rarr;</button>
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
  // 기본 조 이름: 날짜 기반 자동 생성
  const today = new Date();
  const defaultName = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 조`;
  const [groupName, setGroupName] = useState(defaultName);
  const [members, setMembers] = useState<{ name: string; position: string }[]>(
    Array.from({ length: 6 }, () => ({ name: "", position: "부장" }))
  );
  const [showBatchInput, setShowBatchInput] = useState(false);
  const [batchText, setBatchText] = useState("");

  // 이름이 입력된 참가자만 필터 (최소 2명)
  const filledMembers = members.filter((m) => m.name.trim());
  const canSubmit = groupName.trim() && filledMembers.length >= 2;

  // 일괄 입력: 줄바꿈/쉼표로 구분된 이름 목록
  const applyBatch = () => {
    const names = batchText
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 6);
    if (names.length === 0) return;
    const next = Array.from({ length: 6 }, (_, i) => ({
      name: names[i] || "",
      position: "부장",
    }));
    setMembers(next);
    setShowBatchInput(false);
    setBatchText("");
  };

  return (
    <div className="max-w-[700px] mx-auto px-4 md:px-6 py-8 space-y-6 animate-fade-in-up">
      <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 돌아가기
      </button>

      <h2 className="text-xl font-bold text-teal-600">새 조 만들기</h2>
      <p className="text-sm text-slate-500">수업 순서대로 역량별 영상을 등록하고 비교 분석합니다. (2~6명)</p>

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

      {/* 참가자 입력 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">참가자 ({filledMembers.length}/6명)</label>
          <button
            onClick={() => setShowBatchInput(!showBatchInput)}
            className="text-xs text-teal-600 hover:text-teal-500 transition-colors"
          >
            {showBatchInput ? "개별 입력" : "일괄 입력 (붙여넣기)"}
          </button>
        </div>

        {showBatchInput ? (
          <div className="space-y-2">
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={"이름을 줄바꿈 또는 쉼표로 구분하여 입력\n예:\n홍길동\n김영희\n박철수"}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500/30 transition-all resize-none"
              rows={5}
            />
            <button
              onClick={applyBatch}
              disabled={!batchText.trim()}
              className={cn(
                "text-sm font-medium px-4 py-2 rounded-lg transition-all",
                batchText.trim()
                  ? "bg-teal-50 text-teal-600 hover:bg-teal-100"
                  : "bg-slate-50 text-slate-400 cursor-not-allowed"
              )}
            >
              적용
            </button>
          </div>
        ) : (
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
                  placeholder={i < 2 ? `참가자 ${i + 1} 이름 (필수)` : `참가자 ${i + 1} (선택)`}
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
        )}
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
        onClick={() => { if (canSubmit) onSubmit(createEmptySession(groupName, filledMembers)); }}
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

"use client";

// src/components/lecture/LectureEvaluation.tsx
// 교수자 강의평가 메인 컴포넌트
// Phase 상태 머신: upload → analyzing → result

import { useState, useCallback, useEffect } from "react";
import { Play, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { TWELVELABS_INDEXES } from "@/lib/constants";
import { useVideoUpload } from "@/hooks/useTwelveLabs";
import { useLectureAnalysis } from "@/hooks/useLectureAnalysis";
import VideoUploader from "@/components/shared/VideoUploader";
import PptUploader from "./PptUploader";
import LectureProgress from "./LectureProgress";
import LectureDashboard from "./LectureDashboard";

type Phase = "upload" | "analyzing" | "result";

export default function LectureEvaluation() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState("");
  const [courseName, setCourseName] = useState("");

  // 영상 업로드 훅
  const videoUpload = useVideoUpload();

  // 분석 훅
  const lecture = useLectureAnalysis();

  // 영상 업로드 핸들러
  const handleVideoUpload = useCallback(async (file: File) => {
    try {
      const id = await videoUpload.upload(TWELVELABS_INDEXES.lecture, file);
      setVideoId(id);
    } catch {
      // 에러는 videoUpload.progress에서 표시
    }
  }, [videoUpload]);

  // URL 업로드 핸들러
  const handleUrlUpload = useCallback(async (url: string) => {
    try {
      const id = await videoUpload.uploadByUrl(TWELVELABS_INDEXES.lecture, url);
      setVideoId(id);
    } catch {
      // 에러는 videoUpload.progress에서 표시
    }
  }, [videoUpload]);

  // PPT 업로드 핸들러
  const handlePptUpload = useCallback(async (file: File) => {
    return await lecture.uploadPpt(file);
  }, [lecture]);

  // 분석 시작
  const handleStartAnalysis = useCallback(async () => {
    if (!videoId || !instructorName.trim() || !courseName.trim()) return;
    setPhase("analyzing");
    await lecture.startAnalysis(videoId, instructorName.trim(), courseName.trim());
  }, [videoId, instructorName, courseName, lecture]);

  // 분석 완료 시 result 페이즈로 전환 (useEffect로 안전하게)
  useEffect(() => {
    if (lecture.status === "complete" && phase === "analyzing") {
      setPhase("result");
    }
  }, [lecture.status, phase]);

  // 다시 시도
  const handleReset = useCallback(() => {
    setPhase("upload");
    setVideoId(null);
    setInstructorName("");
    setCourseName("");
    videoUpload.reset();
    lecture.reset();
  }, [videoUpload, lecture]);

  // 영상 업로드 완료 여부
  const isVideoReady = videoId !== null || videoUpload.progress?.status === "complete";
  const effectiveVideoId = videoId || videoUpload.progress?.videoId || null;

  // 시작 버튼 활성화 조건
  const canStart = effectiveVideoId && instructorName.trim() && courseName.trim();

  // PPT 로딩 상태
  const isPptLoading = lecture.status === "uploading";

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 animate-slide-in-right">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-coral-600 tracking-tight">교수자 강의평가</h2>
        <p className="text-lg text-slate-500 mt-1.5">
          강의 영상과 강의안을 AI로 분석하여 전달력과 내용 충실도를 정량 평가
        </p>
      </div>

      {/* 에러 표시 */}
      {lecture.error && phase !== "result" && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">오류가 발생했습니다</p>
            <p className="text-sm text-red-600 mt-1">{lecture.error}</p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            다시 시도
          </button>
        </div>
      )}

      {/* Phase 1: 업로드 */}
      {phase === "upload" && !lecture.error && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 영상 + PPT 업로드 (2열) */}
          <div className="lg:col-span-2 space-y-4">
            {/* 영상 업로드 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-medium text-slate-700 mb-3">강의 영상 업로드</p>
              <VideoUploader
                onUpload={handleVideoUpload}
                onUrlUpload={handleUrlUpload}
                progress={videoUpload.progress}
                accentColor="coral"
              />
            </div>

            {/* PPT 업로드 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-medium text-slate-700 mb-3">강의안 (선택)</p>
              <PptUploader
                pptData={lecture.pptData}
                onUpload={handlePptUpload}
                loading={isPptLoading}
              />
            </div>
          </div>

          {/* 오른쪽: 강의 정보 + 시작 버튼 */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <p className="text-sm font-medium text-slate-700">강의 정보</p>

              {/* 교수자명 */}
              <div>
                <label htmlFor="instructorName" className="block text-xs text-slate-500 mb-1">
                  교수자명
                </label>
                <input
                  id="instructorName"
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-coral-400 focus:border-coral-400"
                />
              </div>

              {/* 과목명 */}
              <div>
                <label htmlFor="courseName" className="block text-xs text-slate-500 mb-1">
                  과목명
                </label>
                <input
                  id="courseName"
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="원자력 안전 개론"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-coral-400 focus:border-coral-400"
                />
              </div>

              {/* 분석 시작 버튼 */}
              <button
                onClick={handleStartAnalysis}
                disabled={!canStart}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white transition-all duration-150",
                  "active:scale-[0.98]",
                  canStart
                    ? "bg-coral-600 hover:bg-coral-500 shadow-lg shadow-coral-500/20"
                    : "bg-slate-300 cursor-not-allowed",
                )}
              >
                <Play className="w-4 h-4" />
                AI 강의평가 시작
              </button>
            </div>

            {/* PPT 상태 안내 */}
            <div className="px-4 py-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 leading-relaxed">
                {lecture.pptData
                  ? "PPT가 첨부되었습니다. 전달력(50점) + 내용 충실도(50점) = 100점 기준으로 평가합니다."
                  : "PPT 미첨부 시 전달력만으로 평가합니다 (100점 환산)."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: 분석 진행 */}
      {phase === "analyzing" && !lecture.error && (
        <div className="mt-12 py-8">
          <LectureProgress
            progress={lecture.progress}
            stages={lecture.stages}
          />
        </div>
      )}

      {/* Phase 3: 결과 */}
      {phase === "result" && lecture.result && (
        <div className="mt-8">
          <LectureDashboard result={lecture.result} />

          {/* 새 분석 버튼 */}
          <div className="mt-6 text-center">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-coral-600 hover:bg-coral-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              새 강의 평가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

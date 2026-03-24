"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { FileText, Clock, Target, SearchX } from "lucide-react";
import VideoUploader from "@/components/shared/VideoUploader";
import SearchBar from "@/components/shared/SearchBar";
import VideoPlayer from "@/components/shared/VideoPlayer";
import CompetencyRadar from "./CompetencyRadar";
import { useVideoSearch } from "@/hooks/useTwelveLabs";
import { COMPETENCY_LABELS } from "@/lib/constants";
import type { CompetencyScore, CompetencyKey, UploadProgress } from "@/lib/types";
import { formatTime, getGrade, getGradeDescription } from "@/lib/utils";

// 역량 바 등급별 색상
const scoreBarColorMap: Record<string, string> = {
  high: "bg-teal-500",
  mid: "bg-amber-500",
  low: "bg-red-500",
};
function getBarColor(score: number) {
  if (score >= 80) return scoreBarColorMap.high;
  if (score >= 60) return scoreBarColorMap.mid;
  return scoreBarColorMap.low;
}

// 종합 등급 뱃지 배경
const gradeBgMap: Record<string, string> = {
  "text-teal-400": "bg-teal-500/10",
  "text-amber-400": "bg-amber-500/10",
  "text-red-400": "bg-red-500/10",
};

// 데모용 기본 역량 점수
const DEFAULT_SCORES: CompetencyScore[] = (Object.entries(COMPETENCY_LABELS) as [CompetencyKey, string][]).map(
  ([key, label]) => ({
    key,
    label,
    score: Math.floor(Math.random() * 30) + 60,
  })
);

export default function SimulatorEval() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [scores] = useState<CompetencyScore[]>(DEFAULT_SCORES);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const { results, loading, hasSearched, search } = useVideoSearch();
  const overallScore = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
  const { grade, color } = getGrade(overallScore);

  // 종합 점수 카운트업 애니메이션 (0 → overallScore, ~800ms)
  const [displayScore, setDisplayScore] = useState(0);
  const animFrameRef = useRef<number>(0);
  useEffect(() => {
    const duration = 800; // ms
    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out 곡선
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * overallScore));
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [overallScore]);

  const handleUpload = useCallback(async (file: File) => {
    setUploadProgress({ fileName: file.name, progress: 0, status: "uploading" });
    // 시뮬레이션 — 실제 구현 시 TwelveLabs 업로드 API 호출
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 200));
      setUploadProgress({ fileName: file.name, progress: i, status: "uploading" });
    }
    setUploadProgress({ fileName: file.name, progress: 100, status: "complete" });
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      // indexId는 실제 인덱스 ID로 교체 필요
      search("placeholder-index-id", query);
    },
    [search]
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6 animate-slide-in-right">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-coral-400">N-HPAI 시뮬레이터 평가</h2>
        <p className="text-sm text-slate-400 mt-1">
          원전 운전 시뮬레이터 훈련 영상 분석 및 8대 핵심역량 정량 평가
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 업로드 + 검색 + 결과 */}
        <div className="lg:col-span-2 space-y-4">
          <VideoUploader onUpload={handleUpload} progress={uploadProgress} accentColor="coral" />

          <SearchBar
            placeholder="비상냉각 조작, 제어봉 삽입 등 장면 검색..."
            onSearch={handleSearch}
            loading={loading}
            accentColor="coral"
            suggestions={["비상냉각 조작", "제어봉 삽입", "ECCS 기동", "원자로 트립"]}
          />

          <VideoPlayer />

          {/* 검색 결과 */}
          {results.length > 0 && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 animate-fade-in-up">
              <h4 className="text-sm font-medium text-slate-300 mb-3">
                검색 결과 ({results.length}건)
              </h4>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-700 hover:pl-5 hover:border-l-2 hover:border-l-coral-500 cursor-pointer transition-all duration-200"
                  >
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="font-mono text-xs text-coral-400">
                      {formatTime(r.start)} — {formatTime(r.end)}
                    </span>
                    <span className="text-sm text-slate-300 flex-1 truncate">{r.videoTitle}</span>
                    <span className="text-xs font-mono text-slate-500">
                      {(r.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 검색 결과 없음 */}
          {hasSearched && !loading && results.length === 0 && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-8 text-center animate-fade-in-up">
              <SearchX className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-sm text-slate-400 mb-1">검색 결과가 없습니다</p>
              <p className="text-xs text-slate-600">
                다른 키워드로 검색하거나, 영상을 먼저 업로드해 주세요
              </p>
              <p className="text-xs text-slate-600 mt-3">
                추천: &lsquo;비상냉각&rsquo;, &lsquo;ECCS 기동&rsquo;, &lsquo;제어봉 삽입&rsquo;
              </p>
            </div>
          )}
        </div>

        {/* 우측: 평가 리포트 */}
        <div className="space-y-4">
          {/* 종합 점수 */}
          <div className="bg-surface-800 border border-coral-500/30 rounded-xl p-4 text-center hover:border-coral-500/50 transition-colors duration-200">
            <p className="text-xs text-slate-500 mb-1">종합 평가</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold font-mono text-white tabular-nums">{displayScore}</span>
              <span className="text-sm text-slate-500">/ 100</span>
            </div>
            <span className={`text-lg font-bold px-3 py-0.5 rounded-md ${color} ${gradeBgMap[color]}`}>{grade}</span>
            <p className="text-xs text-slate-500 mt-1">{getGradeDescription(grade)}</p>
          </div>

          {/* 레이더 차트 */}
          <CompetencyRadar scores={scores} />

          {/* 역량별 상세 */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" /> 역량별 상세
            </h4>
            <div className="space-y-2">
              {scores.map((s) => (
                <div key={s.key} className="flex items-center gap-3 group py-1 -mx-2 px-2 rounded hover:bg-surface-700/50 transition-colors duration-150" aria-label={`${s.label} ${s.score}점`}>
                  <span className="text-xs text-slate-400 w-16 shrink-0 group-hover:text-slate-300 transition-colors duration-200">{s.label}</span>
                  <div className="flex-1 bg-surface-700 rounded-full h-1.5 group-hover:h-2 transition-all duration-200">
                    <div
                      className={`h-full rounded-full ${getBarColor(s.score)} transition-all duration-500`}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-300 w-8 text-right group-hover:text-white transition-colors duration-200">{s.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 챕터링 (타임라인 UI) */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 자동 챕터링
            </h4>
            <div className="relative ml-1" role="listbox" aria-label="자동 챕터링 목록">
              {/* 세로 연결선 */}
              <div className="absolute left-3 top-3 bottom-3 w-px bg-surface-600" />
              <div className="space-y-1">
                {["초기 상태 확인", "비상 절차 진입", "냉각 계통 기동", "정상화 조치"].map((chapter, i) => {
                  const isSelected = selectedChapter === i;
                  return (
                    <div
                      key={chapter}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedChapter(i); } }}
                      onClick={() => setSelectedChapter(i)}
                      className={`relative flex items-center gap-3 text-xs py-2 px-2 pl-9 rounded-lg cursor-pointer transition-all duration-200 group ${
                        isSelected
                          ? "bg-coral-500/10"
                          : "hover:bg-surface-700/50"
                      }`}
                    >
                      {/* 숫자 뱃지 (연결선 위) */}
                      <span
                        className={`absolute left-0 z-10 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-mono font-semibold border transition-all duration-200 ${
                          isSelected
                            ? "bg-coral-500 border-coral-500 text-white"
                            : "bg-surface-800 border-surface-600 text-slate-500 group-hover:border-coral-500 group-hover:text-coral-400"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {/* hover 시 세로선 coral 강조 */}
                      <span
                        className={`absolute left-3 top-0 bottom-0 w-px transition-colors duration-200 ${
                          isSelected
                            ? "bg-coral-500"
                            : "bg-transparent group-hover:bg-coral-500"
                        }`}
                      />
                      <span
                        className={`transition-colors duration-200 ${
                          isSelected
                            ? "text-coral-400 font-medium"
                            : "text-slate-400 group-hover:text-slate-300"
                        }`}
                      >
                        {chapter}
                      </span>
                      <span
                        className={`ml-auto font-mono transition-colors duration-200 ${
                          isSelected
                            ? "text-coral-400/70"
                            : "text-slate-600 group-hover:text-slate-500"
                        }`}
                      >
                        --:--
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-3">영상 업로드 시 타임스탬프가 자동 생성됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}

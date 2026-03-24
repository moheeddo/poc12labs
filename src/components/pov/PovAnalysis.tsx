"use client";

import { useState, useCallback, useRef } from "react";
import { Shield, GitCompare, Star, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import VideoUploader from "@/components/shared/VideoUploader";
import SearchBar from "@/components/shared/SearchBar";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { useVideoSearch } from "@/hooks/useTwelveLabs";
import { SEVERITY_LABELS } from "@/lib/constants";
import type { SopDeviation, UploadProgress } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";

// 데모: SOP 이탈 데이터
const DEMO_DEVIATIONS: SopDeviation[] = [
  { step: "Step 3.2", expected: "밸브 A 확인 후 B 개방", actual: "B 밸브 먼저 개방", timestamp: 125, severity: "high" },
  { step: "Step 4.1", expected: "압력 확인 후 조작", actual: "압력 미확인 상태 조작", timestamp: 240, severity: "critical" },
  { step: "Step 5.3", expected: "2인 확인 절차 수행", actual: "단독 확인 후 진행", timestamp: 380, severity: "medium" },
  { step: "Step 7.1", expected: "로그 기록 후 다음 단계", actual: "로그 미기록", timestamp: 520, severity: "low" },
];

// 데모: 유사도 비교 데이터
const COMPARISON_DATA = [
  { step: "초기 점검", expert: 95, novice: 72 },
  { step: "밸브 조작", expert: 98, novice: 55 },
  { step: "압력 확인", expert: 92, novice: 68 },
  { step: "계기 판독", expert: 88, novice: 78 },
  { step: "비상 절차", expert: 96, novice: 45 },
  { step: "로그 기록", expert: 90, novice: 82 },
];

export default function PovAnalysis() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [activeView, setActiveView] = useState<"deviations" | "compare" | "highlights">("deviations");
  const { loading, search } = useVideoSearch();
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabKeys = ["deviations", "compare", "highlights"] as const;

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = tabKeys.indexOf(activeView);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabKeys.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabKeys.length) % tabKeys.length;
    else return;
    e.preventDefault();
    setActiveView(tabKeys[next]);
    const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  }, [activeView]);

  const handleUpload = useCallback(async (file: File) => {
    setUploadProgress({ fileName: file.name, progress: 0, status: "uploading" });
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 200));
      setUploadProgress({ fileName: file.name, progress: i, status: "uploading" });
    }
    setUploadProgress({ fileName: file.name, progress: 100, status: "complete" });
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      search("placeholder-index-id", query);
    },
    [search]
  );

  const overallSimilarity = 67;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6 animate-fade-in-up">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-amber-400">훈련영상 POV 분석</h2>
        <p className="text-sm text-slate-400 mt-1">
          1인칭 시점 영상 기반 SOP 절차 이탈 탐지 및 숙련도 비교 분석
        </p>
      </div>

      {/* 업로드 + 검색 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VideoUploader onUpload={handleUpload} progress={uploadProgress} accentColor="amber" />
        <SearchBar
          placeholder="밸브 조작, 계기 판독, 비상 절차 등..."
          onSearch={handleSearch}
          loading={loading}
          accentColor="amber"
          suggestions={["밸브 조작 순서", "계기판 확인", "비상 절차 수행", "안전 점검"]}
        />
      </div>

      {/* 비교 뷰: 두 영상 나란히 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-amber-400 mb-2 font-medium">숙련자 POV</p>
          <VideoPlayer />
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-2 font-medium">비숙련자 POV</p>
          <VideoPlayer />
        </div>
      </div>

      {/* 서브탭 */}
      <div ref={tabListRef} className="flex gap-1 border-b border-surface-700" role="tablist" aria-label="POV 분석 보기" onKeyDown={handleTabKeyDown}>
        {[
          { key: "deviations" as const, icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "SOP 이탈 탐지" },
          { key: "compare" as const, icon: <GitCompare className="w-3.5 h-3.5" />, label: "숙련도 비교" },
          { key: "highlights" as const, icon: <Star className="w-3.5 h-3.5" />, label: "베스트 프랙티스" },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeView === tab.key}
            aria-controls={`pov-panel-${tab.key}`}
            tabIndex={activeView === tab.key ? 0 : -1}
            onClick={() => setActiveView(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200",
              activeView === tab.key
                ? "text-amber-400 border-amber-400"
                : "text-slate-500 border-transparent hover:text-slate-300"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* SOP 이탈 탐지 */}
      {activeView === "deviations" && (
        <div id="pov-panel-deviations" role="tabpanel" className="bg-surface-800 border border-surface-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4" /> SOP 절차 이탈 사항 ({DEMO_DEVIATIONS.length}건)
            </h4>
          </div>
          <div className="space-y-2">
            {DEMO_DEVIATIONS.map((d, i) => {
              const sev = SEVERITY_LABELS[d.severity];
              return (
                <button
                  key={i}
                  aria-label={`${d.step} — ${sev.label} 등급 이탈: ${d.actual}`}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-lg bg-surface-900 border border-surface-700 hover:border-amber-500/20 hover:bg-surface-800 transition-all duration-200"
                >
                  <div className="mt-0.5">
                    <AlertTriangle className={`w-4 h-4 ${sev.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-amber-400">{d.step}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${sev.color} bg-surface-700`}>
                        {sev.label}
                      </span>
                      <span className="text-[10px] font-mono text-amber-500/60 ml-auto hover:text-amber-400 transition-colors">
                        ▶ {formatTime(d.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      <span className="text-slate-500">예상:</span> {d.expected}
                    </p>
                    <p className="text-xs text-red-400/80">
                      <span className="text-slate-500">실제:</span> {d.actual}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 숙련도 비교 */}
      {activeView === "compare" && (
        <div id="pov-panel-compare" role="tabpanel" className="space-y-4">
          <div className="bg-surface-800 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">전체 유사도</p>
            <span className="text-3xl font-bold font-mono text-amber-400">{overallSimilarity}%</span>
          </div>
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4" role="img" aria-label="절차별 숙련도 비교 막대 그래프">
            <h4 className="text-sm font-medium text-slate-300 mb-4">절차별 숙련도 비교</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={COMPARISON_DATA} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#243044" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis dataKey="step" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={80} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{
                    backgroundColor: "#111820",
                    border: "1px solid #243044",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="expert" name="숙련자" radius={[0, 4, 4, 0]}>
                  {COMPARISON_DATA.map((_, i) => (
                    <Cell key={i} fill="#14b8a6" />
                  ))}
                </Bar>
                <Bar dataKey="novice" name="비숙련자" radius={[0, 4, 4, 0]}>
                  {COMPARISON_DATA.map((_, i) => (
                    <Cell key={i} fill="#f59e0b" fillOpacity={0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 베스트 프랙티스 */}
      {activeView === "highlights" && (
        <div id="pov-panel-highlights" role="tabpanel" className="bg-surface-800 border border-surface-700 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
          <Star className="w-10 h-10 text-amber-500/40 mb-3" />
          <h4 className="text-sm font-medium text-slate-300 mb-1">
            베스트 프랙티스 하이라이트
          </h4>
          <p className="text-xs text-slate-500 max-w-sm">
            숙련자 영상에서 핵심 조작 장면을 자동 추출합니다.
          </p>
          <p className="text-xs text-slate-600 mt-1">
            영상을 업로드하면 자동으로 생성됩니다
          </p>
        </div>
      )}
    </div>
  );
}

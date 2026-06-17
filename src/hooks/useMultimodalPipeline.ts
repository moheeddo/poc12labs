"use client";

import { useState, useCallback } from "react";
import { scoreMultimodalSignals } from "@/lib/multimodal-scoring";
import type { ExtractedSignals, ChannelSignals, MultimodalScoreResult } from "@/lib/multimodal-scoring";
import { ASSESSMENT_BY_KEY } from "@/lib/leadership-rubric-data";
import type { RoleContext } from "@/app/api/twelvelabs/multimodal-extract/route";
import type { LeadershipCompetencyKey } from "@/lib/types";

// =============================================
// 멀티모달 분석 파이프라인 훅 (역량별) v1.0
// m-항목별 행동 신호 추출 → 역량 루브릭 채점 → Solar Pro 2 보고서
// 피드백 ①: competencyKey를 추출·채점·보고서 전 단계에 전달
// =============================================

export type PipelinePhase =
  | "idle"
  | "extracting"  // m-항목별 추출 중
  | "scoring"     // 채점 엔진 처리 중
  | "reporting"   // Solar Pro 2 보고서 생성 중
  | "done"
  | "error";

export interface PipelineProgress {
  phase: PipelinePhase;
  currentChannel: string;
  completedChannels: string[];
  totalChannels: number;
  percent: number;
}

export interface PipelineResult {
  signals: ExtractedSignals;
  scoring: MultimodalScoreResult;
  report: string;
  reportModel: string;
}

export function useMultimodalPipeline() {
  const [progress, setProgress] = useState<PipelineProgress>({
    phase: "idle",
    currentChannel: "",
    completedChannels: [],
    totalChannels: 5,
    percent: 0,
  });
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runPipeline = useCallback(async (
    videoId: string,
    competencyKey: LeadershipCompetencyKey | string,
    scenarioText?: string,
    roleContext?: RoleContext,
  ) => {
    setError(null);
    setResult(null);

    const competency = ASSESSMENT_BY_KEY[competencyKey];
    if (!competency) {
      setError(`유효하지 않은 역량: ${competencyKey}`);
      setProgress((p) => ({ ...p, phase: "error" }));
      return;
    }

    // 채널 = m-항목 코드 (m1~m5)
    const channels = competency.mItems.map((m) => m.code.toLowerCase());

    try {
      // ═══ Phase 1: 항목별 병렬 추출 ═══
      setProgress({ phase: "extracting", currentChannel: "전체 항목", completedChannels: [], totalChannels: channels.length, percent: 5 });

      const extractResults = await Promise.allSettled(
        channels.map(async (ch) => {
          const res = await fetch("/api/twelvelabs/multimodal-extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId, channel: ch, competencyKey, roleContext }),
          });
          if (!res.ok) throw new Error(`${ch} 추출 실패: ${res.status}`);
          const data = await res.json();
          return { channel: ch, data: data.data };
        }),
      );

      const signals: ExtractedSignals = {};
      const completed: string[] = [];
      extractResults.forEach((r, i) => {
        const ch = channels[i];
        if (r.status === "fulfilled" && r.value.data) {
          const channelData = r.value.data as Record<string, unknown>;
          if (channelData.parseError) return; // 파싱 실패는 N/A 처리 (signals에 미포함)
          signals[ch] = channelData as unknown as ChannelSignals;
          completed.push(ch);
        }
      });

      setProgress({ phase: "extracting", currentChannel: "추출 완료", completedChannels: completed, totalChannels: channels.length, percent: 60 });

      // ═══ Phase 2: 역량별 채점 ═══
      setProgress((p) => ({ ...p, phase: "scoring", percent: 75 }));
      const scoring = scoreMultimodalSignals(signals, competencyKey);

      // ═══ Phase 3: Solar Pro 2 보고서 ═══
      setProgress((p) => ({ ...p, phase: "reporting", percent: 85 }));
      let report = "";
      let reportModel = "local-template";
      try {
        const reportRes = await fetch("/api/solar/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scoringResult: scoring, competencyKey, competencyLabel: competency.label, scenarioText }),
        });
        if (reportRes.ok) {
          const reportData = await reportRes.json();
          report = reportData.report || "";
          reportModel = reportData.model || "local-template";
        }
      } catch {
        // Solar 실패 시 채점 결과만으로 진행
      }

      setResult({ signals, scoring, report, reportModel });
      setProgress({ phase: "done", currentChannel: "", completedChannels: completed, totalChannels: channels.length, percent: 100 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "파이프라인 실패";
      setError(msg);
      setProgress((p) => ({ ...p, phase: "error", percent: 0 }));
    }
  }, []);

  return { progress, result, error, runPipeline };
}

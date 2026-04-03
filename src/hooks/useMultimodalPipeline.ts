"use client";

import { useState, useCallback } from "react";
import { scoreMultimodalSignals } from "@/lib/multimodal-scoring";
import type { ExtractedSignals, MultimodalScoreResult } from "@/lib/multimodal-scoring";

// =============================================
// 멀티모달 분석 파이프라인 훅
// 5채널 행동 신호 추출 → 채점 → Solar Pro 2 보고서
// =============================================

export type PipelinePhase =
  | "idle"
  | "extracting"  // TwelveLabs로 5채널 추출 중
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

const CHANNELS = ["gaze", "voice", "fluency", "posture", "face"];
const CHANNEL_LABELS: Record<string, string> = {
  gaze: "시선 분석",
  voice: "음성 분석",
  fluency: "유창성 분석",
  posture: "자세·제스처 분석",
  face: "표정·머리 분석",
};

export function useMultimodalPipeline() {
  const [progress, setProgress] = useState<PipelineProgress>({
    phase: "idle",
    currentChannel: "",
    completedChannels: [],
    totalChannels: CHANNELS.length,
    percent: 0,
  });
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runPipeline = useCallback(async (
    videoId: string,
    competencyLabel?: string,
    scenarioText?: string,
  ) => {
    setError(null);
    setResult(null);

    try {
      // ═══ Phase 1: 5채널 병렬 추출 ═══
      setProgress({
        phase: "extracting",
        currentChannel: "전체 채널",
        completedChannels: [],
        totalChannels: CHANNELS.length,
        percent: 5,
      });

      // 병렬로 5채널 동시 추출
      const extractResults = await Promise.allSettled(
        CHANNELS.map(async (ch) => {
          const res = await fetch("/api/twelvelabs/multimodal-extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId, channel: ch }),
          });
          if (!res.ok) throw new Error(`${ch} 추출 실패: ${res.status}`);
          const data = await res.json();
          return { channel: ch, data: data.data };
        })
      );

      // 결과 조합
      const signals: ExtractedSignals = {};
      const completed: string[] = [];

      extractResults.forEach((r, i) => {
        const ch = CHANNELS[i];
        if (r.status === "fulfilled" && r.value.data) {
          const channelData = r.value.data;
          // 채널별 데이터 매핑
          if (ch === "gaze" && channelData.gaze) signals.gaze = channelData.gaze;
          else if (ch === "voice" && channelData.voice) signals.voice = channelData.voice;
          else if (ch === "fluency" && channelData.fluency) signals.fluency = channelData.fluency;
          else if (ch === "posture" && channelData.posture_gesture) signals.posture_gesture = channelData.posture_gesture;
          else if (ch === "face" && channelData.face_head) signals.face_head = channelData.face_head;
          completed.push(ch);
        }
      });

      setProgress({
        phase: "extracting",
        currentChannel: "추출 완료",
        completedChannels: completed,
        totalChannels: CHANNELS.length,
        percent: 60,
      });

      // ═══ Phase 2: 채점 ═══
      setProgress((p) => ({ ...p, phase: "scoring", percent: 70 }));

      const scoring = scoreMultimodalSignals(signals);

      setProgress((p) => ({ ...p, phase: "scoring", percent: 80 }));

      // ═══ Phase 3: Solar Pro 2 보고서 생성 ═══
      setProgress((p) => ({ ...p, phase: "reporting", percent: 85 }));

      let report = "";
      let reportModel = "local-template";

      try {
        const reportRes = await fetch("/api/solar/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scoringResult: scoring,
            competencyLabel,
            scenarioText,
          }),
        });

        if (reportRes.ok) {
          const reportData = await reportRes.json();
          report = reportData.report || "";
          reportModel = reportData.model || "local-template";
        }
      } catch {
        // Solar API 실패 시 채점 결과만으로 진행
      }

      // ═══ 완료 ═══
      const pipelineResult: PipelineResult = {
        signals,
        scoring,
        report,
        reportModel,
      };

      setResult(pipelineResult);
      setProgress({
        phase: "done",
        currentChannel: "",
        completedChannels: completed,
        totalChannels: CHANNELS.length,
        percent: 100,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "파이프라인 실패";
      setError(msg);
      setProgress((p) => ({ ...p, phase: "error", percent: 0 }));
    }
  }, []);

  return {
    progress,
    result,
    error,
    runPipeline,
    channelLabels: CHANNEL_LABELS,
  };
}

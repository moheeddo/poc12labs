"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { scoreMultimodalSignals } from "@/lib/multimodal-scoring";
import type { ExtractedSignals, ChannelSignals, MultimodalScoreResult } from "@/lib/multimodal-scoring";
import { aggregateRuns } from "@/lib/multimodal-aggregate";
import type { AggregatedScore } from "@/lib/multimodal-aggregate";
import { ASSESSMENT_BY_KEY } from "@/lib/leadership-rubric-data";
import type { CompetencyAssessmentData } from "@/lib/leadership-rubric-data";
import type { RoleContext } from "@/app/api/twelvelabs/multimodal-extract/route";
import type { LeadershipCompetencyKey } from "@/lib/types";

// =============================================
// 멀티모달 분석 파이프라인 훅 (역량별 + N차 반복 진단) v1.1
// m-항목별 행동 신호 추출 → 역량 루브릭 채점 → Solar Pro 2 보고서
// 피드백 ①: competencyKey를 추출·채점·보고서 전 단계에 전달
// 보고서(26.6.18): runConsistency로 N회 진단 후 평균/최빈값/표준편차 집계 (객관성 확보)
// =============================================

export type PipelinePhase = "idle" | "extracting" | "scoring" | "reporting" | "done" | "error";

export interface PipelineProgress {
  phase: PipelinePhase;
  currentChannel: string;
  completedChannels: string[];
  totalChannels: number;
  percent: number;
  currentRun?: number;   // N차 반복 시 현재 회차
  totalRuns?: number;    // N차 반복 시 총 회차
}

export interface PipelineResult {
  signals: ExtractedSignals;
  scoring: MultimodalScoreResult;   // 단일 회차(또는 대표 회차) 상세
  report: string;
  reportModel: string;
  aggregate?: AggregatedScore;      // N차 반복 시 집계 (단일 회차면 undefined)
  runCount: number;
}

export function useMultimodalPipeline() {
  const [progress, setProgressRaw] = useState<PipelineProgress>({
    phase: "idle", currentChannel: "", completedChannels: [], totalChannels: 5, percent: 0,
  });
  const [result, setResultRaw] = useState<PipelineResult | null>(null);
  const [error, setErrorRaw] = useState<string | null>(null);

  // 언마운트(뒤로가기·멤버 전환 시 remount) 후 stale commit 차단 — 파이프라인은 수 분간 await한다.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const setProgress: typeof setProgressRaw = (v) => { if (mountedRef.current) setProgressRaw(v); };
  const setResult: typeof setResultRaw = (v) => { if (mountedRef.current) setResultRaw(v); };
  const setError: typeof setErrorRaw = (v) => { if (mountedRef.current) setErrorRaw(v); };

  // ── 단일 회차: 추출 → 채점 (보고서 제외) ──
  const runOnce = useCallback(async (
    videoId: string,
    competency: CompetencyAssessmentData,
    competencyKey: string,
    roleContext: RoleContext | undefined,
    onChannelProgress?: (completed: string[]) => void,
  ): Promise<{ signals: ExtractedSignals; scoring: MultimodalScoreResult }> => {
    const channels = competency.mItems.map((m) => m.code.toLowerCase());

    // 항목별 추출 — 완료되는 대로 진행 표시 갱신 (로딩 UX 정확도 개선)
    const completed: string[] = [];
    const signals: ExtractedSignals = {};
    await Promise.all(channels.map(async (ch) => {
      try {
        const res = await fetch("/api/twelvelabs/multimodal-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId, channel: ch, competencyKey, roleContext }),
        });
        if (!res.ok) throw new Error(`${ch} 추출 실패: ${res.status}`);
        const data = await res.json();
        const channelData = data.data as Record<string, unknown> | undefined;
        if (channelData && !channelData.parseError) {
          signals[ch] = channelData as unknown as ChannelSignals;
        }
      } catch {
        /* 개별 채널 실패는 N/A 처리 (signals에 미포함) */
      } finally {
        completed.push(ch);
        onChannelProgress?.([...completed]);
      }
    }));

    const scoring = scoreMultimodalSignals(signals, competencyKey);
    return { signals, scoring };
  }, []);

  // ── Solar 보고서 생성 ──
  const buildReport = useCallback(async (
    scoring: MultimodalScoreResult,
    competency: CompetencyAssessmentData,
    competencyKey: string,
    scenarioText?: string,
  ): Promise<{ report: string; reportModel: string }> => {
    try {
      const res = await fetch("/api/solar/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoringResult: scoring, competencyKey, competencyLabel: competency.label, scenarioText }),
      });
      if (res.ok) {
        const d = await res.json();
        return { report: d.report || "", reportModel: d.model || "local-template" };
      }
    } catch { /* 실패 시 채점 결과만 */ }
    return { report: "", reportModel: "local-template" };
  }, []);

  // ── 단일 진단 ──
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
    const totalChannels = competency.mItems.length;
    try {
      setProgress({ phase: "extracting", currentChannel: "전체 항목", completedChannels: [], totalChannels, percent: 5 });
      const { signals, scoring } = await runOnce(videoId, competency, competencyKey, roleContext,
        (completed) => setProgress((p) => ({ ...p, completedChannels: completed, percent: 5 + Math.round((completed.length / totalChannels) * 55) })));

      setProgress((p) => ({ ...p, phase: "scoring", percent: 75 }));
      setProgress((p) => ({ ...p, phase: "reporting", percent: 85 }));
      const { report, reportModel } = await buildReport(scoring, competency, competencyKey, scenarioText);

      setResult({ signals, scoring, report, reportModel, runCount: 1 });
      setProgress({ phase: "done", currentChannel: "", completedChannels: competency.mItems.map((m) => m.code.toLowerCase()), totalChannels, percent: 100 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "파이프라인 실패");
      setProgress((p) => ({ ...p, phase: "error", percent: 0 }));
    }
  }, [runOnce, buildReport]);

  // ── N차 반복 진단 (객관성 확보 — 평균/최빈값/표준편차) ──
  const runConsistency = useCallback(async (
    videoId: string,
    competencyKey: LeadershipCompetencyKey | string,
    runs: number,
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
    const totalChannels = competency.mItems.length;
    const n = Math.max(2, Math.min(7, runs));
    try {
      const scorings: MultimodalScoreResult[] = [];
      const signalsPerRun: ExtractedSignals[] = [];
      for (let i = 0; i < n; i++) {
        setProgress({
          phase: "extracting", currentChannel: `${i + 1}회차`, completedChannels: [], totalChannels,
          currentRun: i + 1, totalRuns: n, percent: Math.round((i / n) * 80) + 3,
        });
        const { signals, scoring } = await runOnce(videoId, competency, competencyKey, roleContext,
          (completed) => setProgress((p) => ({ ...p, completedChannels: completed, percent: Math.round((i / n) * 80) + 3 + Math.round((completed.length / totalChannels) * (80 / n)) })));
        scorings.push(scoring);
        signalsPerRun.push(signals);
      }

      setProgress((p) => ({ ...p, phase: "scoring", percent: 85, currentRun: n, totalRuns: n }));
      const aggregate = aggregateRuns(scorings);
      const repIdx = aggregate.representativeIndex;

      setProgress((p) => ({ ...p, phase: "reporting", percent: 90 }));
      const { report, reportModel } = await buildReport(scorings[repIdx], competency, competencyKey, scenarioText);

      setResult({
        signals: signalsPerRun[repIdx],
        scoring: scorings[repIdx],
        report, reportModel,
        aggregate,
        runCount: n,
      });
      setProgress({ phase: "done", currentChannel: "", completedChannels: competency.mItems.map((m) => m.code.toLowerCase()), totalChannels, percent: 100, currentRun: n, totalRuns: n });
    } catch (e) {
      setError(e instanceof Error ? e.message : "반복 진단 실패");
      setProgress((p) => ({ ...p, phase: "error", percent: 0 }));
    }
  }, [runOnce, buildReport]);

  return { progress, result, error, runPipeline, runConsistency };
}

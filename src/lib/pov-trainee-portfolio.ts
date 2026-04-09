// =============================================
// HPO-14: 훈련생 포트폴리오 — 개인별 모든 평가를 통합한 종합 프로필
// TraineeProfile CRUD + PortfolioSummary 자동 생성
// =============================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import type { PovEvaluationReport, FundamentalScore } from './types';
import { HPO_PROCEDURES } from './pov-standards';
import { scoreToLevel } from './pov-competency-progression';
import { getDataPath } from './data-path';

const PORTFOLIO_PATH = getDataPath('trainee-portfolios.json');
const HISTORY_PATH = getDataPath('analysis-history.json');

// ── 훈련생 프로필 ──────────────────────────

export interface TraineeProfile {
  id: string;
  name: string;
  department?: string;
  startDate: string;
  createdAt: string;
}

// ── 포트폴리오 요약 ────────────────────────

export interface PortfolioSummary {
  trainee: TraineeProfile;
  totalEvaluations: number;
  proceduresCompleted: string[];    // B+ 이상 취득한 절차 ID
  proceduresInProgress: string[];   // 시도했지만 B+ 미달인 절차 ID
  proceduresNotStarted: string[];   // 미시작 절차 ID
  overallMasteryLevel: number;      // 0-3 평균 숙달 수준
  latestScores: {
    procedureId: string;
    procedureTitle: string;
    score: number;
    grade: string;
    date: string;
  }[];
  competencyProfile: {
    id: string;
    name: string;
    avgScore: number;
    level: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  strengths: string[];
  areasForGrowth: string[];
  certificationReady: boolean;      // 8개 절차 모두 B+ 이상
  nextRecommendation: string;
}

// ── 훈련생 CRUD ───────────────────────────

function readPortfolios(): TraineeProfile[] {
  if (!existsSync(PORTFOLIO_PATH)) return [];
  try {
    return JSON.parse(readFileSync(PORTFOLIO_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writePortfolios(data: TraineeProfile[]): void {
  const dir = path.dirname(PORTFOLIO_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(PORTFOLIO_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/** 훈련생 목록 조회 */
export function listTrainees(): TraineeProfile[] {
  return readPortfolios();
}

/** 훈련생 추가 */
export function addTrainee(name: string, department?: string): TraineeProfile {
  const profiles = readPortfolios();
  const trainee: TraineeProfile = {
    id: `trainee-${Date.now()}`,
    name,
    department,
    startDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };
  profiles.push(trainee);
  writePortfolios(profiles);
  return trainee;
}

/** 훈련생 삭제 */
export function deleteTrainee(id: string): boolean {
  const profiles = readPortfolios();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx === -1) return false;
  profiles.splice(idx, 1);
  writePortfolios(profiles);
  return true;
}

// ── 이력 조회 (기존 format 재사용) ───────────

interface HistoryEntry {
  id: string;
  videoId: string;
  procedureId: string;
  procedureTitle: string;
  date: string;
  grade: string;
  overallScore: number;
  report: PovEvaluationReport;
  createdAt: string;
}

function readHistory(): HistoryEntry[] {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

// ── 역량 ID → 한국어 이름 매핑 ────────────

function getCompName(id: string): string {
  const map: Record<string, string> = {
    monitor: '감시',
    control: '제어',
    conservativeBias: '보수적 판단',
    teamwork: '팀워크',
    knowledge: '지식',
  };
  return map[id] || id;
}

// ── 포트폴리오 요약 생성 ─────────────────────

/**
 * 훈련생의 포트폴리오 요약 자동 생성.
 * POC 단계에서는 전체 이력을 기반으로 계산 (traineeId 매칭 미구현).
 * 실제 운영 시 traineeId로 필터링 예정.
 */
export function generatePortfolioSummary(trainee: TraineeProfile): PortfolioSummary {
  const allHistory = readHistory();
  // TODO: 실제 운영 시 traineeId 매칭으로 필터링
  const history = allHistory;

  // 8개 절차 전체 ID
  const allProcedureIds = HPO_PROCEDURES.map(p => p.id);

  // 절차별 최고 점수 항목 추출
  const bestByProcedure: Record<string, HistoryEntry> = {};
  history.forEach(h => {
    const existing = bestByProcedure[h.procedureId];
    if (!existing || h.overallScore > existing.overallScore) {
      bestByProcedure[h.procedureId] = h;
    }
  });

  // 완료 = 70점 이상 (B 등급)
  const completed = Object.entries(bestByProcedure)
    .filter(([, h]) => h.overallScore >= 70)
    .map(([id]) => id);
  const attempted = Object.keys(bestByProcedure);
  const inProgress = attempted.filter(id => !completed.includes(id));
  const notStarted = allProcedureIds.filter(id => !attempted.includes(id));

  // 역량 프로필: fundamentalScores 집계 (key 기반)
  const compAgg: Record<string, { total: number; count: number; scores: number[] }> = {};
  history.forEach(h => {
    (h.report.fundamentalScores || []).forEach((f: FundamentalScore) => {
      // key 필드 우선, 없으면 id 필드 사용 (타입 호환성)
      const compId = (f as FundamentalScore & { id?: string }).id ?? f.key;
      if (!compAgg[compId]) compAgg[compId] = { total: 0, count: 0, scores: [] };
      compAgg[compId].total += f.score;
      compAgg[compId].count++;
      compAgg[compId].scores.push(f.score);
    });
  });

  // 역량별 평균 + 추세 계산
  const competencyProfile = Object.entries(compAgg).map(([id, data]) => {
    const avg = Math.round(data.total / data.count);
    const half = Math.floor(data.scores.length / 2);
    const firstHalf = data.scores.slice(0, Math.max(half, 1));
    const secondHalf = data.scores.slice(half);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trend: 'up' | 'down' | 'stable' =
      secondAvg > firstAvg + 5 ? 'up' :
      secondAvg < firstAvg - 5 ? 'down' :
      'stable';

    return {
      id,
      name: getCompName(id),
      avgScore: avg,
      level: scoreToLevel(avg),
      trend,
    };
  });

  // 전체 숙달 수준 (0-3 평균)
  const overallMastery = competencyProfile.length > 0
    ? Math.round(competencyProfile.reduce((s, c) => s + c.level, 0) / competencyProfile.length)
    : 0;

  // 최신 점수 목록 (절차별 최고 점수)
  const latestScores = Object.values(bestByProcedure).map(h => ({
    procedureId: h.procedureId,
    procedureTitle: h.procedureTitle,
    score: h.overallScore,
    grade: h.grade,
    date: h.date,
  }));

  // 강점 자동 도출
  const strengths: string[] = [];
  const growth: string[] = [];

  const sortedByStrength = [...competencyProfile].sort((a, b) => b.avgScore - a.avgScore);
  if (sortedByStrength.length > 0) {
    strengths.push(`${sortedByStrength[0].name} 역량 우수 (평균 ${sortedByStrength[0].avgScore}점)`);
    if (sortedByStrength.length > 1) {
      strengths.push(`${sortedByStrength[1].name} 역량 양호`);
    }
  }
  if (completed.length > 0) {
    strengths.push(`${completed.length}개 절차 숙달 완료`);
  }

  // 성장 영역 자동 도출
  const sortedByWeakness = [...competencyProfile].sort((a, b) => a.avgScore - b.avgScore);
  if (sortedByWeakness.length > 0 && sortedByWeakness[0].avgScore < 70) {
    growth.push(`${sortedByWeakness[0].name} 역량 강화 필요 (현재 ${sortedByWeakness[0].avgScore}점)`);
  }
  if (inProgress.length > 0) {
    growth.push(`${inProgress.length}개 절차 재도전 필요`);
  }
  if (notStarted.length > 0) {
    growth.push(`${notStarted.length}개 절차 미시작`);
  }

  // 인증 준비 여부: 8개 절차 모두 완료
  const certReady = completed.length === allProcedureIds.length;

  // 다음 권장 행동
  let nextRec = '';
  if (certReady) {
    nextRec = '전체 절차 숙달 완료 — 인증 발급 가능';
  } else if (inProgress.length > 0) {
    const procTitle = HPO_PROCEDURES.find(p => p.id === inProgress[0])?.title || inProgress[0];
    nextRec = `${procTitle} 재도전 권장`;
  } else if (notStarted.length > 0) {
    const procTitle = HPO_PROCEDURES.find(p => p.id === notStarted[0])?.title || notStarted[0];
    nextRec = `${procTitle} 시작 권장`;
  } else {
    nextRec = '평가 이력이 없습니다';
  }

  return {
    trainee,
    totalEvaluations: history.length,
    proceduresCompleted: completed,
    proceduresInProgress: inProgress,
    proceduresNotStarted: notStarted,
    overallMasteryLevel: overallMastery,
    latestScores,
    competencyProfile,
    strengths,
    areasForGrowth: growth,
    certificationReady: certReady,
    nextRecommendation: nextRec,
  };
}

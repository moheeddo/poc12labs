import {
  calculateOverallScore,
  calculateProcedureScore,
  calculateHpoScore,
  getGrade,
  calculateQualityAdjustedScore,
} from '@/lib/pov-scoring';
import type { DetectedStep, HpoToolResult } from '@/lib/types';

describe('calculateProcedureScore', () => {
  it('모든 단계 pass면 100점', () => {
    const steps: DetectedStep[] = [
      { stepId: '1.1', status: 'pass', confidence: 0.9, timestamp: 10, endTime: 20, searchScore: 0.9 },
      { stepId: '1.2', status: 'pass', confidence: 0.8, timestamp: 25, endTime: 35, searchScore: 0.8 },
    ];
    expect(calculateProcedureScore(steps, 2, 0)).toBe(100);
  });

  it('절반 pass면 약 50점', () => {
    const steps: DetectedStep[] = [
      { stepId: '1.1', status: 'pass', confidence: 0.9, timestamp: 10, endTime: 20, searchScore: 0.9 },
      { stepId: '1.2', status: 'fail', confidence: 0.1, timestamp: 0, endTime: 0, searchScore: 0.1 },
    ];
    expect(calculateProcedureScore(steps, 2, 0)).toBe(50);
  });

  it('partial은 0.5 가중치', () => {
    const steps: DetectedStep[] = [
      { stepId: '1.1', status: 'pass', confidence: 0.9, timestamp: 10, endTime: 20, searchScore: 0.9 },
      { stepId: '1.2', status: 'partial', confidence: 0.5, timestamp: 25, endTime: 30, searchScore: 0.5 },
    ];
    expect(calculateProcedureScore(steps, 2, 0)).toBe(75);
  });

  it('핵심단계 이탈 1건당 -5점', () => {
    const steps: DetectedStep[] = [
      { stepId: '1.1', status: 'pass', confidence: 0.9, timestamp: 10, endTime: 20, searchScore: 0.9 },
      { stepId: '1.2', status: 'pass', confidence: 0.8, timestamp: 25, endTime: 35, searchScore: 0.8 },
    ];
    expect(calculateProcedureScore(steps, 2, 2)).toBe(90);
  });
});

describe('calculateHpoScore', () => {
  it('기본4종 모두 적용 + 조건부 일부 적용', () => {
    const results: HpoToolResult[] = [
      { toolId: 'situationAwareness', toolName: '상황인식', category: 'fundamental', detected: true, detectionCount: 2, timestamps: [10, 30], confidence: 0.8 },
      { toolId: 'selfCheck', toolName: 'STAR', category: 'fundamental', detected: true, detectionCount: 1, timestamps: [20], confidence: 0.7 },
      { toolId: 'communication', toolName: '의사소통', category: 'fundamental', detected: true, detectionCount: 3, timestamps: [5, 15, 25], confidence: 0.9 },
      { toolId: 'procedureCompliance', toolName: '절차준수', category: 'fundamental', detected: true, detectionCount: 1, timestamps: [40], confidence: 0.75 },
      { toolId: 'peerCheck', toolName: '동료점검', category: 'conditional', detected: true, detectionCount: 1, timestamps: [50], confidence: 0.6 },
      { toolId: 'preJobBriefing', toolName: '작업전회의', category: 'conditional', detected: false, detectionCount: 0, timestamps: [], confidence: 0 },
    ];
    const score = calculateHpoScore(results);
    expect(score).toBe(85);
  });

  it('기본4종 미적용 시 낮은 점수', () => {
    const results: HpoToolResult[] = [
      { toolId: 'situationAwareness', toolName: '상황인식', category: 'fundamental', detected: false, detectionCount: 0, timestamps: [], confidence: 0 },
      { toolId: 'selfCheck', toolName: 'STAR', category: 'fundamental', detected: false, detectionCount: 0, timestamps: [], confidence: 0 },
    ];
    const score = calculateHpoScore(results);
    expect(score).toBe(0);
  });
});

describe('calculateOverallScore', () => {
  it('골드스탠다드 없으면 가중치 재분배 (0.44/0.33/0.23)', () => {
    const score = calculateOverallScore(80, 70, 60, undefined);
    expect(score).toBe(72);
  });

  it('골드스탠다드 있으면 4분할 가중치 (0.40/0.30/0.20/0.10)', () => {
    const score = calculateOverallScore(80, 70, 60, 90);
    expect(score).toBe(74);
  });
});

describe('getGrade', () => {
  it('등급 경계값 테스트', () => {
    expect(getGrade(95)).toBe('S');
    expect(getGrade(94)).toBe('A');
    expect(getGrade(85)).toBe('A');
    expect(getGrade(84)).toBe('B');
    expect(getGrade(70)).toBe('B');
    expect(getGrade(55)).toBe('C');
    expect(getGrade(40)).toBe('D');
    expect(getGrade(39)).toBe('F');
    expect(getGrade(0)).toBe('F');
  });
});

describe('calculateQualityAdjustedScore', () => {
  it('품질 데이터 없으면 원점수 반환', () => {
    expect(calculateQualityAdjustedScore(80, [])).toBe(80);
    expect(calculateQualityAdjustedScore(80, [{ other: 1 } as unknown as { qualityScore?: number }])).toBe(80);
  });

  it('품질 100이면 점수 상승', () => {
    const events = [{ qualityScore: 100 }, { qualityScore: 100 }];
    // 80 * 0.8 + 100 * 0.2 = 64 + 20 = 84
    expect(calculateQualityAdjustedScore(80, events, 0.2)).toBe(84);
  });

  it('품질 낮으면 점수 하락', () => {
    const events = [{ qualityScore: 40 }, { qualityScore: 40 }];
    // 80 * 0.8 + 40 * 0.2 = 64 + 8 = 72
    expect(calculateQualityAdjustedScore(80, events, 0.2)).toBe(72);
  });
});

'use client';

// ══════════════════════════════════════════════════════════
// PrintableReport — A4 최적화 상세 기술 리포트
// HandoffDocument와 다름: 이것은 상세 기술 리포트 (2-3페이지)
// ══════════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import type { PovEvaluationReport } from '@/lib/types';
import type { Procedure } from '@/lib/pov-standards';

interface Props {
  report: PovEvaluationReport;
  procedure: Procedure;
  onClose: () => void;
}

// ── 상태 레이블 ──────────────────────────────────────────

function statusLabel(status: string): string {
  switch (status) {
    case 'pass':    return 'Pass';
    case 'fail':    return 'Fail';
    case 'partial': return 'Partial';
    case 'skipped': return 'Skip';
    default:        return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'pass':    return '#16a34a'; // green
    case 'fail':    return '#dc2626'; // red
    case 'partial': return '#d97706'; // amber
    case 'skipped': return '#6b7280'; // gray
    default:        return '#6b7280';
  }
}

function severityLabel(sev: string): string {
  switch (sev) {
    case 'critical': return '심각';
    case 'high':     return '중';
    case 'medium':   return '보통';
    case 'low':      return '경미';
    default:         return sev;
  }
}

// ── 정적 SVG 레이더 차트 (인쇄용 — Recharts 대신) ──────────

interface RadarPoint {
  name: string;
  value: number; // 0-100
}

function renderRadarSVG(scores: RadarPoint[]): React.JSX.Element {
  const cx = 110;
  const cy = 110;
  const r = 80;
  const n = scores.length;

  // 다각형 꼭짓점 계산
  function calcPoint(i: number, ratio: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    };
  }

  // 격자선 (20, 40, 60, 80, 100)
  const gridRatios = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPolygons = gridRatios.map((ratio) => {
    const pts = scores.map((_, i) => {
      const p = calcPoint(i, ratio);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    });
    return pts.join(' ');
  });

  // 축선 (중심 → 꼭짓점)
  const axisLines = scores.map((_, i) => {
    const outerPt = calcPoint(i, 1.0);
    return { x2: outerPt.x, y2: outerPt.y };
  });

  // 점수 다각형
  const scorePoints = scores.map((s, i) => {
    const p = calcPoint(i, s.value / 100);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  });

  // 레이블 위치 (격자 바깥)
  const labelPoints = scores.map((s, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const labelR = r + 22;
    return {
      x: cx + labelR * Math.cos(angle),
      y: cy + labelR * Math.sin(angle),
      name: s.name,
      value: s.value,
    };
  });

  return (
    <svg width={220} height={220} viewBox="0 0 220 220" style={{ display: 'block', margin: '0 auto' }}>
      {/* 격자 */}
      {gridPolygons.map((pts, gi) => (
        <polygon
          key={gi}
          points={pts}
          fill="none"
          stroke="#d1d5db"
          strokeWidth={gi === 4 ? 1.5 : 0.8}
        />
      ))}
      {/* 축선 */}
      {axisLines.map((l, i) => (
        <line
          key={i}
          x1={cx} y1={cy}
          x2={l.x2.toFixed(1)} y2={l.y2.toFixed(1)}
          stroke="#d1d5db" strokeWidth={0.8}
        />
      ))}
      {/* 점수 다각형 */}
      <polygon
        points={scorePoints.join(' ')}
        fill="rgba(245, 158, 11, 0.25)"
        stroke="#f59e0b"
        strokeWidth={2}
      />
      {/* 점수 점 */}
      {scores.map((s, i) => {
        const p = calcPoint(i, s.value / 100);
        return (
          <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={3} fill="#f59e0b" />
        );
      })}
      {/* 레이블 */}
      {labelPoints.map((lp, i) => (
        <g key={i}>
          <text
            x={lp.x.toFixed(1)} y={(lp.y - 4).toFixed(1)}
            textAnchor="middle" fontSize={9} fill="#374151" fontWeight="600"
          >
            {lp.name}
          </text>
          <text
            x={lp.x.toFixed(1)} y={(lp.y + 7).toFixed(1)}
            textAnchor="middle" fontSize={9} fill="#f59e0b"
          >
            {lp.value}점
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── 점수 바 (인쇄용) ────────────────────────────────────

function PrintScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#374151', marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700 }}>{score}점</span>
      </div>
      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────

export default function PrintableReport({ report, procedure, onClose }: Props) {
  // 인쇄 시 no-print 요소 숨기기
  useEffect(() => {
    return () => undefined;
  }, []);

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const fundAvg = Math.round(
    report.fundamentalScores.reduce((s, f) => s + f.score, 0) / (report.fundamentalScores.length || 1)
  );

  // 핵심 이탈 (severity critical 또는 high)
  const criticalDeviations = report.deviations.filter(
    (d) => d.severity === 'critical' || d.severity === 'high'
  );

  // 절차 전체 단계 목록 (섹션 flatten)
  const allSteps = procedure.sections.flatMap((s) => s.steps);

  // 레이더 데이터
  const radarData = report.fundamentalScores.map((f) => ({
    name: f.label.replace(/\s*\(.*\)/, '').replace(/\s*-\s*.*/, ''),
    value: f.score,
  }));

  // 등급 색상
  function gradeColor(grade: string): string {
    switch (grade) {
      case 'S':  return '#059669';
      case 'A':  return '#0284c7';
      case 'B':  return '#2563eb';
      case 'B+': return '#16a34a';
      case 'C':  return '#d97706';
      default:   return '#dc2626';
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8">
      {/* 컨트롤 바 — 화면 전용, 인쇄 시 숨김 */}
      <div
        className="no-print fixed top-4 right-4 flex items-center gap-2 z-50"
      >
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors shadow-lg"
        >
          <Printer className="w-4 h-4" /> 인쇄
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ══════ 인쇄 문서 본문 ══════ */}
      <div
        className="printable-report"
        style={{
          width: '210mm',
          minHeight: '297mm',
          background: '#fff',
          color: '#1a1a1a',
          fontFamily: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
          fontSize: 10,
          padding: '15mm 20mm',
          boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
          lineHeight: 1.5,
        }}
      >
        {/* ════ 페이지 1: 요약 ════ */}

        {/* 헤더 */}
        <div style={{ borderBottom: '2px solid #1a1a1a', paddingBottom: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>
                HPO센터 POV 영상분석 상세 리포트
              </h1>
              <p style={{ fontSize: 10, color: '#6b7280', margin: '3px 0 0 0' }}>
                {procedure.courseName} | 표준지침-3035-01 기반 평가
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: 9, color: '#6b7280' }}>
              <div>출력일: {today}</div>
              <div>영상 ID: {report.videoId.slice(0, 16)}...</div>
              <div>평가일: {report.date}</div>
            </div>
          </div>
        </div>

        {/* 절차명 */}
        <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 14 }}>
          <span style={{ fontSize: 9, color: '#6b7280', marginRight: 8 }}>평가 절차</span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>{report.procedureTitle}</span>
          <span style={{ fontSize: 9, color: '#6b7280', marginLeft: 12 }}>
            {procedure.system}계통 | {procedure.operation} | 총 {procedure.totalSteps}단계
          </span>
        </div>

        {/* 종합 점수 + 4대 영역 점수 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
          {/* 종합 등급 원형 배지 */}
          <div style={{ textAlign: 'center', minWidth: 90 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: gradeColor(report.grade),
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{report.grade}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: gradeColor(report.grade), marginTop: 4 }}>
              {report.overallScore}점
            </div>
            <div style={{ fontSize: 8, color: '#6b7280' }}>종합 점수</div>
          </div>

          {/* 4대 영역 점수 바 */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 8, color: '#374151' }}>영역별 점수</div>
            <PrintScoreBar label="절차 준수" score={report.procedureComplianceScore} color="#3b82f6" />
            <PrintScoreBar label="HPO 기법 적용" score={report.hpoOverallScore} color="#0d9488" />
            <PrintScoreBar label="기본수칙 역량" score={fundAvg} color="#f59e0b" />
            {report.embeddingComparison && (
              <PrintScoreBar
                label="숙련자 유사도"
                score={Math.round(report.embeddingComparison.averageSimilarity * 100)}
                color="#8b5cf6"
              />
            )}
          </div>
        </div>

        {/* 5대 기본수칙 레이더 차트 + 강점/개선점 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
          {/* 레이더 SVG */}
          <div style={{ minWidth: 230, border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 4px 4px 4px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', marginBottom: 4, color: '#374151' }}>
              5대 운전원 기본수칙 역량
            </div>
            {renderRadarSVG(radarData)}
          </div>

          {/* 강점 / 개선점 */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 4, borderBottom: '1px solid #d1fae5', paddingBottom: 3 }}>
                강점 ({report.strengths.length}개)
              </div>
              <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9, color: '#374151', lineHeight: 1.6 }}>
                {report.strengths.slice(0, 5).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4, borderBottom: '1px solid #fee2e2', paddingBottom: 3 }}>
                개선점 ({report.improvements.length}개)
              </div>
              <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9, color: '#374151', lineHeight: 1.6 }}>
                {report.improvements.slice(0, 5).map((imp, i) => (
                  <li key={i}>{imp}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 종합 요약 */}
        <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px', fontSize: 9, color: '#374151', lineHeight: 1.7 }}>
          <span style={{ fontWeight: 700, color: '#1a1a1a', marginRight: 6 }}>종합 의견</span>
          {report.summary}
        </div>

        {/* ════ 페이지 2: 절차 이행 상세 ════ */}
        <div className="page-break" style={{ pageBreakBefore: 'always', paddingTop: 2 }} />

        <div style={{ borderBottom: '1.5px solid #374151', paddingBottom: 6, marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>절차 이행 상세</h2>
          <p style={{ fontSize: 9, color: '#6b7280', margin: '2px 0 0 0' }}>
            {report.procedureTitle} — 전체 {report.stepEvaluations.length}개 단계 평가 결과
          </p>
        </div>

        {/* 전체 단계 표 */}
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 14, fontSize: 8.5 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left', width: '8%' }}>단계</th>
              <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left', width: '44%' }}>설명</th>
              <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', width: '10%' }}>상태</th>
              <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', width: '10%' }}>신뢰도</th>
              <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left', width: '28%' }}>코멘트</th>
            </tr>
          </thead>
          <tbody>
            {report.stepEvaluations.map((se, idx) => {
              const origStep = allSteps.find((s) => s.id === se.stepId);
              const bg = se.status === 'fail' ? '#fff5f5' : se.status === 'partial' ? '#fffbeb' : '#fff';
              return (
                <tr key={idx} style={{ background: bg }}>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {se.stepId}
                    {origStep?.isCritical && (
                      <span style={{ color: '#dc2626', marginLeft: 2, fontFamily: 'sans-serif' }}>★</span>
                    )}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontSize: 8 }}>
                    {se.description}
                    {origStep?.equipment && (
                      <span style={{ color: '#6b7280', marginLeft: 4 }}>[{origStep.equipment}]</span>
                    )}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center' }}>
                    <span style={{ color: statusColor(se.status), fontWeight: 700, fontSize: 8 }}>
                      {statusLabel(se.status)}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontFamily: 'monospace' }}>
                    {se.confidence}%
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontSize: 8, color: '#6b7280' }}>
                    {se.note || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 핵심 이탈 상세 */}
        {criticalDeviations.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 6, borderBottom: '1px solid #fee2e2', paddingBottom: 3 }}>
              핵심 이탈 상세 ({criticalDeviations.length}건)
            </div>
            {criticalDeviations.map((dev, i) => (
              <div key={i} style={{ border: '1px solid #fecaca', borderRadius: 4, padding: '6px 8px', marginBottom: 6, background: '#fff5f5' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#dc2626' }}>
                    {dev.step}
                  </span>
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                    background: dev.severity === 'critical' ? '#dc2626' : '#d97706',
                    color: '#fff',
                  }}>
                    {severityLabel(dev.severity)}
                  </span>
                  <span style={{ fontSize: 8, color: '#6b7280', marginLeft: 'auto' }}>
                    {Math.floor(dev.timestamp / 60)}분 {dev.timestamp % 60}초
                  </span>
                </div>
                <div style={{ fontSize: 8.5, color: '#374151' }}>
                  <span style={{ color: '#6b7280' }}>기대:</span> {dev.expected}
                </div>
                <div style={{ fontSize: 8.5, color: '#dc2626' }}>
                  <span style={{ color: '#6b7280' }}>실제:</span> {dev.actual}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HPO 도구 적용 현황 표 */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#0d9488', marginBottom: 6, borderBottom: '1px solid #ccfbf1', paddingBottom: 3 }}>
            HPO 기법 적용 현황
          </div>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 8.5 }}>
            <thead>
              <tr style={{ background: '#f0fdfa' }}>
                <th style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'left', width: '28%' }}>HPO 기법</th>
                <th style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', width: '12%' }}>적용</th>
                <th style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', width: '12%' }}>점수</th>
                <th style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'left', width: '48%' }}>근거</th>
              </tr>
            </thead>
            <tbody>
              {report.hpoEvaluations.map((hpo, i) => (
                <tr key={i} style={{ background: hpo.applied ? '#fff' : '#fff5f5' }}>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontWeight: 600 }}>{hpo.label}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center' }}>
                    <span style={{ color: hpo.applied ? '#059669' : '#dc2626', fontWeight: 700 }}>
                      {hpo.applied ? '●' : '○'}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontFamily: 'monospace' }}>
                    {hpo.score}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', color: '#6b7280', fontSize: 8 }}>
                    {hpo.evidence || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ════ 페이지 3 (optional): 손-물체 + 비교 + 학습목표 ════ */}
        {(report.handObjectEvents && report.handObjectEvents.length > 0) || report.embeddingComparison ? (
          <>
            <div className="page-break" style={{ pageBreakBefore: 'always', paddingTop: 2 }} />
            <div style={{ borderBottom: '1.5px solid #374151', paddingBottom: 6, marginBottom: 12 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>손-물체 분석 및 숙련자 비교</h2>
            </div>

            {/* 손-물체 이벤트 요약 표 */}
            {report.handObjectEvents && report.handObjectEvents.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, color: '#374151' }}>
                  손-물체 이벤트 ({report.handObjectEvents.length}건)
                </div>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 8 }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 5px', textAlign: 'left' }}>단계</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 5px', textAlign: 'left' }}>파지 물체</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 5px', textAlign: 'left' }}>대상 설비</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 5px', textAlign: 'center' }}>SOP 일치</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 5px', textAlign: 'center' }}>신뢰도</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 5px', textAlign: 'left' }}>타임스탬프</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.handObjectEvents.slice(0, 20).map((ev, i) => (
                      <tr key={i} style={{ background: ev.matchesSOP ? '#fff' : '#fff5f5' }}>
                        <td style={{ border: '1px solid #d1d5db', padding: '2px 5px', fontFamily: 'monospace', fontSize: 7.5 }}>{ev.stepId}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '2px 5px' }}>{ev.heldObject}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '2px 5px' }}>{ev.targetEquipment}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '2px 5px', textAlign: 'center' }}>
                          <span style={{ color: ev.matchesSOP ? '#059669' : '#dc2626', fontWeight: 700 }}>
                            {ev.matchesSOP ? 'Y' : 'N'}
                          </span>
                        </td>
                        <td style={{ border: '1px solid #d1d5db', padding: '2px 5px', textAlign: 'center', fontFamily: 'monospace' }}>
                          {ev.confidence}%
                        </td>
                        <td style={{ border: '1px solid #d1d5db', padding: '2px 5px', fontFamily: 'monospace', fontSize: 7.5 }}>
                          {Math.floor(ev.timestamp / 60)}:{String(ev.timestamp % 60).padStart(2, '0')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.handObjectEvents.length > 20 && (
                  <p style={{ fontSize: 8, color: '#6b7280', marginTop: 3 }}>
                    * 상위 20건 표시 (전체 {report.handObjectEvents.length}건)
                  </p>
                )}
              </div>
            )}

            {/* 숙련자 유사도 비교 (수치 표 — 인쇄에서 히트맵 대신) */}
            {report.embeddingComparison && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, color: '#374151' }}>
                  숙련자 유사도 비교
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                  <div style={{ textAlign: 'center', padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6' }}>
                      {Math.round(report.embeddingComparison.averageSimilarity * 100)}%
                    </div>
                    <div style={{ fontSize: 8, color: '#6b7280' }}>전체 유사도</div>
                  </div>
                  {report.embeddingComparison.segmentPairs && report.embeddingComparison.segmentPairs.length > 0 && (
                    <div style={{ fontSize: 8, color: '#374151', flex: 1 }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                          <tr style={{ background: '#f3f4f6' }}>
                            <th style={{ border: '1px solid #d1d5db', padding: '3px 5px', textAlign: 'left' }}>훈련생 구간</th>
                            <th style={{ border: '1px solid #d1d5db', padding: '3px 5px', textAlign: 'left' }}>숙련자 구간</th>
                            <th style={{ border: '1px solid #d1d5db', padding: '3px 5px', textAlign: 'center' }}>유사도</th>
                            <th style={{ border: '1px solid #d1d5db', padding: '3px 5px', textAlign: 'left' }}>평가</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.embeddingComparison.segmentPairs.slice(0, 15).map((seg, i) => (
                            <tr key={i}>
                              <td style={{ border: '1px solid #d1d5db', padding: '2px 5px', fontFamily: 'monospace' }}>
                                {Math.floor(seg.traineeStart / 60)}:{String(seg.traineeStart % 60).padStart(2, '0')}–
                                {Math.floor(seg.traineeEnd / 60)}:{String(seg.traineeEnd % 60).padStart(2, '0')}
                              </td>
                              <td style={{ border: '1px solid #d1d5db', padding: '2px 5px', fontFamily: 'monospace' }}>
                                {Math.floor(seg.expertStart / 60)}:{String(seg.expertStart % 60).padStart(2, '0')}–
                                {Math.floor(seg.expertEnd / 60)}:{String(seg.expertEnd % 60).padStart(2, '0')}
                              </td>
                              <td style={{ border: '1px solid #d1d5db', padding: '2px 5px', textAlign: 'center', fontFamily: 'monospace' }}>
                                {Math.round(seg.similarity * 100)}%
                              </td>
                              <td style={{ border: '1px solid #d1d5db', padding: '2px 5px', color: seg.similarity >= 0.7 ? '#059669' : seg.similarity >= 0.5 ? '#d97706' : '#dc2626' }}>
                                {seg.similarity >= 0.7 ? '우수' : seg.similarity >= 0.5 ? '보통' : '미흡'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* 문서 꼬리말 */}
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 16, paddingTop: 8, fontSize: 8, color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
          <span>HPO센터 POV 영상분석 상세 리포트 — AI 자동생성 (참고용)</span>
          <span>© KHNP HPO 훈련영상 분석 플랫폼</span>
        </div>
      </div>

      {/* 인쇄 전용 CSS — style 태그는 head에 주입 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          .printable-report, .printable-report * { visibility: visible !important; }
          .printable-report {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            background: white !important;
            color: #1a1a1a !important;
            font-size: 10pt !important;
            padding: 15mm 20mm !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
          .page-break { page-break-before: always !important; }
          table { border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #ddd !important; padding: 3px 6px !important; font-size: 8pt !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}} />
    </div>
  );
}

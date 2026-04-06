"use client";

// src/components/lecture/LectureDashboard.tsx
// 강의평가 결과 대시보드 — 점수 카드 + 레이더 + 슬라이드맵 + 리포트

import { Award, Mic, BookOpen, User, GraduationCap, Calendar, FileText } from "lucide-react";
import { getLectureGrade } from "@/lib/lecture-scoring";
import type { LectureEvaluationResult } from "@/lib/lecture-types";
import LectureRadar from "./LectureRadar";
import SlideMap from "./SlideMap";

interface LectureDashboardProps {
  result: LectureEvaluationResult;
}

export default function LectureDashboard({ result }: LectureDashboardProps) {
  const { grade, color } = getLectureGrade(result.totalScore);
  const deliveryGrade = getLectureGrade((result.delivery.score / 50) * 100);
  const contentGrade = result.contentFidelity
    ? getLectureGrade((result.contentFidelity.score / 50) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* 점수 카드 3열 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 종합 점수 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center hover:shadow-lg hover:shadow-slate-200/60 transition-all">
          <Award className="w-6 h-6 text-coral-500 mx-auto mb-2" />
          <p className="text-xs text-slate-400 mb-1">종합 점수</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-slate-900">
            {result.totalScore.toFixed(1)}
          </p>
          <p className={`text-sm font-medium mt-1 ${color}`}>{grade}</p>
        </div>

        {/* 전달력 점수 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center hover:shadow-lg hover:shadow-slate-200/60 transition-all">
          <Mic className="w-6 h-6 text-coral-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400 mb-1">전달력</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-slate-900">
            {result.delivery.score.toFixed(1)}
            <span className="text-base text-slate-400 font-normal">/50</span>
          </p>
          <p className={`text-sm font-medium mt-1 ${deliveryGrade.color}`}>{deliveryGrade.grade}</p>
        </div>

        {/* 내용 충실도 점수 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center hover:shadow-lg hover:shadow-slate-200/60 transition-all">
          <BookOpen className="w-6 h-6 text-coral-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400 mb-1">내용 충실도</p>
          {result.contentFidelity ? (
            <>
              <p className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                {result.contentFidelity.score.toFixed(1)}
                <span className="text-base text-slate-400 font-normal">/50</span>
              </p>
              <p className={`text-sm font-medium mt-1 ${contentGrade?.color}`}>{contentGrade?.grade}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-300">-</p>
              <p className="text-xs text-slate-400 mt-1">PPT 미첨부</p>
            </>
          )}
        </div>
      </div>

      {/* 강의 정보 바 */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-500">
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          {result.instructorName}
        </span>
        <span className="flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5" />
          {result.courseName}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {result.date}
        </span>
      </div>

      {/* 레이더 + 슬라이드맵 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 레이더 차트 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-coral-500" />
            전달력 레이더
          </p>
          <LectureRadar delivery={result.delivery} />
        </div>

        {/* 슬라이드맵 (내용 충실도 있을 때만) */}
        {result.contentFidelity && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-coral-500" />
              슬라이드별 커버리지
            </p>
            <SlideMap coverages={result.contentFidelity.slideCoverages} />
          </div>
        )}
      </div>

      {/* Solar 리포트 */}
      {result.report && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-coral-500" />
            AI 종합 리포트
          </p>
          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {result.report}
          </div>
        </div>
      )}
    </div>
  );
}

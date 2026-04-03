"use client";

import { useState, useCallback, lazy, Suspense } from "react";
import type { ServiceTab } from "@/lib/types";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Dashboard from "@/components/dashboard/Dashboard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import KeyboardHelp from "@/components/shared/KeyboardHelp";
import { ToastContainer } from "@/components/shared/Toast";
import { useToast } from "@/hooks/useToast";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import Skeleton from "@/components/shared/Skeleton";

// 탭 컴포넌트 코드 스플리팅 — 초기 번들 크기 감소
const SimulatorEval = lazy(() => import("@/components/simulator/SimulatorEval"));
const LeadershipCoaching = lazy(() => import("@/components/leadership/LeadershipCoaching"));
const PovAnalysis = lazy(() => import("@/components/pov/PovAnalysis"));

export default function Home() {
  const [activeTab, setActiveTab] = useState<ServiceTab | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const { toasts, removeToast } = useToast();

  const toggleHelp = useCallback(() => setHelpOpen((prev) => !prev), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  useKeyboardShortcuts({
    onTabChange: setActiveTab,
    onToggleHelp: toggleHelp,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <a href="#main-content" className="skip-to-content">본문으로 건너뛰기</a>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main id="main-content" aria-live="polite">
        <ErrorBoundary fallbackTitle="서비스 로드 중 오류가 발생했습니다">
          {activeTab === null && <Dashboard onNavigate={setActiveTab} />}
          <Suspense key={activeTab} fallback={
            <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 space-y-4">
              <Skeleton variant="text" width="200px" height="28px" />
              <Skeleton variant="rectangular" height="200px" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton variant="card" />
                <Skeleton variant="card" />
              </div>
            </div>
          }>
            {activeTab === "simulator" && <SimulatorEval />}
            {activeTab === "leadership" && <LeadershipCoaching />}
            {activeTab === "pov" && <PovAnalysis />}
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer onNavigate={setActiveTab} />
      <KeyboardHelp isOpen={helpOpen} onClose={closeHelp} />
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

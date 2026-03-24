"use client";

import { useState, useCallback } from "react";
import type { ServiceTab } from "@/lib/types";
import Header from "@/components/layout/Header";
import Dashboard from "@/components/dashboard/Dashboard";
import SimulatorEval from "@/components/simulator/SimulatorEval";
import LeadershipCoaching from "@/components/leadership/LeadershipCoaching";
import PovAnalysis from "@/components/pov/PovAnalysis";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import KeyboardHelp from "@/components/shared/KeyboardHelp";
import { ToastContainer } from "@/components/shared/Toast";
import { useToast } from "@/hooks/useToast";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

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
    <div className="min-h-screen bg-surface-900">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main aria-live="polite">
        <ErrorBoundary fallbackTitle="서비스 로드 중 오류가 발생했습니다">
          {activeTab === null && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === "simulator" && <SimulatorEval />}
          {activeTab === "leadership" && <LeadershipCoaching />}
          {activeTab === "pov" && <PovAnalysis />}
        </ErrorBoundary>
      </main>
      <KeyboardHelp isOpen={helpOpen} onClose={closeHelp} />
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

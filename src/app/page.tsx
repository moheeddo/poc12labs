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

export default function Home() {
  const [activeTab, setActiveTab] = useState<ServiceTab | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

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
        {activeTab === null && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === "simulator" && <SimulatorEval />}
        {activeTab === "leadership" && <LeadershipCoaching />}
        {activeTab === "pov" && <PovAnalysis />}
      </main>
      <KeyboardHelp isOpen={helpOpen} onClose={closeHelp} />
    </div>
  );
}

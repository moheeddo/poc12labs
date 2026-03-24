"use client";

import { useState } from "react";
import type { ServiceTab } from "@/lib/types";
import Header from "@/components/layout/Header";
import Dashboard from "@/components/dashboard/Dashboard";
import SimulatorEval from "@/components/simulator/SimulatorEval";
import LeadershipCoaching from "@/components/leadership/LeadershipCoaching";
import PovAnalysis from "@/components/pov/PovAnalysis";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ServiceTab | null>(null);

  return (
    <div className="min-h-screen bg-surface-900">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main>
        {activeTab === null && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === "simulator" && <SimulatorEval />}
        {activeTab === "leadership" && <LeadershipCoaching />}
        {activeTab === "pov" && <PovAnalysis />}
      </main>
    </div>
  );
}

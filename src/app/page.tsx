"use client";

import React from 'react';
import { useStadium } from '@/context/StadiumContext';
import { StadiumMap } from '@/components/StadiumMap';
import { CrowdDashboard } from '@/components/CrowdDashboard';
import { WayfindingConcierge } from '@/components/WayfindingConcierge';
import dynamic from 'next/dynamic';

const IncidentSummarizer = dynamic(
  () => import('@/components/IncidentSummarizer').then(mod => mod.IncidentSummarizer),
  {
    ssr: false,
    loading: () => (
      <div className="panel-glass rounded-xl p-5 h-[400px] animate-pulse flex flex-col items-center justify-center text-xs text-foreground/45 font-scoreboard tracking-widest border border-card-border/50">
        LOADING DISPATCH & BRIEFING CONTROL ROOM...
      </div>
    )
  }
);

const RoadmapPanel = dynamic(
  () => import('@/components/RoadmapPanel').then(mod => mod.RoadmapPanel),
  {
    ssr: false,
    loading: () => (
      <div className="panel-glass rounded-xl p-5 h-32 animate-pulse flex flex-col items-center justify-center text-xs text-foreground/45 font-scoreboard tracking-widest border border-card-border/50">
        LOADING INTEGRATION ROADMAP PANEL...
      </div>
    )
  }
);

import { Activity, ShieldCheck, Trophy, Users } from 'lucide-react';

export default function Home() {
  const { overallOccupancy, incidents } = useStadium();
  const activeIncidents = incidents.filter(i => i.status === 'Active');

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground font-sans relative select-none">
      
      {/* SCOREBOARD BROADCAST HEADER */}
      <header className="bg-stadium-green-dark border-b border-card-border p-3 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-30">
        
        {/* Left Side: Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="bg-accent-gold text-stadium-green-dark font-scoreboard font-black text-xl px-3 py-1 rounded skew-x-[-8deg] tracking-wider leading-none shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-accent-gold/45">
            PITCH
          </div>
          <div>
            <h1 className="font-scoreboard text-sm md:text-base tracking-widest text-foreground font-bold leading-tight">
              STADIUM INTELLIGENCE COPILOT
            </h1>
            <div className="text-[10px] text-accent-gold font-scoreboard tracking-widest flex items-center gap-1.5">
              <Trophy className="w-3 h-3 text-accent-gold" />
              <span>FIFA WORLD CUP 2026 — VENUE OPERATIONS CONTROL</span>
            </div>
          </div>
        </div>

        {/* Center: Live Telemetry Scoreboard */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4 bg-[#051410] border border-stadium-green/60 rounded px-4 py-2 font-scoreboard text-xs md:text-sm shadow-inner">
          <div className="flex items-center space-x-2 border-r border-stadium-green/50 pr-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-foreground/60 text-[10px] md:text-xs">SYSTEM STATUS:</span>
            <span className="text-emerald-400 font-bold text-[10px] md:text-xs">ONLINE</span>
          </div>
          
          <div className="flex items-center space-x-2 border-r border-stadium-green/50 pr-4">
            <Users className="w-3.5 h-3.5 text-accent-gold" />
            <span className="text-foreground/60 text-[10px] md:text-xs">LIVE LOAD:</span>
            <span className="text-foreground font-bold font-mono text-[10px] md:text-xs">{overallOccupancy}%</span>
          </div>

          <div className="flex items-center space-x-2">
            <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="text-foreground/60 text-[10px] md:text-xs">DISPATCHES:</span>
            <span className={`font-bold font-mono text-[10px] md:text-xs ${activeIncidents.length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {activeIncidents.length} ACTIVE
            </span>
          </div>
        </div>

        {/* Right Side: Venue Location */}
        <div className="hidden lg:flex flex-col items-end text-right font-scoreboard">
          <span className="text-xs text-foreground font-bold tracking-wider">PITCH ARENA</span>
          <span className="text-[10px] text-accent-gold tracking-widest uppercase">METROPOLITAN SECTOR</span>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-3 md:p-6 flex flex-col gap-6 max-w-7xl w-full mx-auto">
        
        {/* ROW 1: Map, Concierge Chat, & Operations Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Live Map Density Visualizer (7 cols on large screens) */}
          <div className="lg:col-span-7 h-fit">
            <StadiumMap />
          </div>

          {/* RIGHT: Multilingual AI Concierge Chat (5 cols on large screens) */}
          <div className="lg:col-span-5 h-fit">
            <WayfindingConcierge />
          </div>

        </div>

        {/* ROW 2: Live Crowd Intelligence & Summarizer briefs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Live Crowd Load Gauges & Gemini Recommendations (7 cols) */}
          <div className="lg:col-span-7 h-fit">
            <div className="bg-card-bg/50 border border-card-border/50 rounded-xl p-0.5">
              <CrowdDashboard />
            </div>
          </div>

          {/* RIGHT: Incident summaries and radio feeds (5 cols) */}
          <div className="lg:col-span-5 h-fit">
            <IncidentSummarizer />
          </div>

        </div>

        {/* ROW 3: Tier 2 Integration Roadmap */}
        <div className="mt-2 h-fit">
          <RoadmapPanel />
        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-card-border/30 bg-[#051410] p-4 text-center text-xs text-foreground/50 font-scoreboard tracking-widest mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PITCH — STADIUM COPILOT | PROMPT WAR HACKATHON DELIVERABLE</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-gold" />
            <span>SECURE GEMINI ENTERPRISE NODE ACTIVE</span>
          </span>
        </div>
      </footer>

    </div>
  );
}

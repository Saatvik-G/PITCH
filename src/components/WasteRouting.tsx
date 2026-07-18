"use client";

import React, { useState } from 'react';
import { useStadium, WasteBin } from '../context/StadiumContext';
import { Trash2, Recycle, Leaf, Flame, Loader2, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

export const WasteRouting: React.FC = () => {
  const {
    wasteBins,
    halftimeRushActive,
    wasteRecommendations,
    wasteRecommendationsLoading,
    simulateHalftimeRush
  } = useStadium();

  const [lastClickedTime, setLastClickedTime] = useState<number>(0);
  const [localLoading, setLocalLoading] = useState<boolean>(false);

  // Debounced/Throttled trigger handler to prevent rapid double-clicks
  const handleHalftimeClick = async () => {
    const now = Date.now();
    if (now - lastClickedTime < 3000 || localLoading || wasteRecommendationsLoading) {
      // Throttle double clicks within 3 seconds
      return;
    }
    setLastClickedTime(now);
    setLocalLoading(true);
    try {
      await simulateHalftimeRush();
    } catch (e) {
      console.error('Error simulating halftime rush:', e);
    } finally {
      setLocalLoading(false);
    }
  };

  const getBinIcon = (type: WasteBin['type']) => {
    switch (type) {
      case 'recycling': return <Recycle className="w-4 h-4 text-emerald-400" />;
      case 'compost': return <Leaf className="w-4 h-4 text-emerald-500" />;
      case 'general': return <Trash2 className="w-4 h-4 text-foreground/70" />;
    }
  };

  const getFillColor = (percent: number) => {
    if (percent < 60) return 'bg-emerald-500'; // Green
    if (percent < 80) return 'bg-amber-500';   // Yellow
    return 'bg-red-500';                      // Red
  };

  const getFillTextColor = (percent: number) => {
    if (percent < 60) return 'text-emerald-400';
    if (percent < 80) return 'text-amber-400';
    return 'text-red-400 animate-pulse';
  };

  // Group recommendations by priority order
  const getPriorityWeight = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 0;
    }
  };

  const sortedRecommendations = [...wasteRecommendations].sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));

  return (
    <div className="panel-glass rounded-xl p-5 flex flex-col relative scanlines overflow-hidden min-h-[380px]">
      
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-card-border pb-3.5 mb-4 gap-3">
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-500/10 p-1.5 rounded border border-emerald-500/25">
            <Flame className="text-emerald-400 w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-scoreboard text-base tracking-wider text-foreground">AI SUSTAINABILITY & WASTE ROUTING</h2>
            <div className="text-[9px] text-foreground/70 tracking-wider">
              REAL-TIME IOT BIN SENSOR LEVEL TELEMETRY & OPTIMAL CLEANUP ROUTING
            </div>
          </div>
        </div>

        {/* Halftime rush trigger button */}
        <button
          onClick={handleHalftimeClick}
          disabled={localLoading || wasteRecommendationsLoading}
          className={`px-4 py-1.5 rounded font-scoreboard text-[10px] tracking-wider font-bold transition-all flex items-center space-x-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-gold focus:border-accent-gold border ${
            halftimeRushActive
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-accent-gold hover:bg-accent-gold-hover text-stadium-green-dark border-accent-gold glow-gold'
          }`}
          aria-pressed={halftimeRushActive}
        >
          {localLoading || wasteRecommendationsLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              <span>COGNITIVE LAYER DISPATCHING...</span>
            </>
          ) : (
            <>
              <Flame className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{halftimeRushActive ? "HALFTIME RUSH ACTIVE" : "SIMULATE HALFTIME RUSH"}</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        
        {/* LEFT COLUMN: IoT Bins Telemetry Feed (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-scoreboard tracking-widest text-accent-gold font-bold">
              IOT WEIGH-SENSORED BINS REAL-TIME DATA
            </span>
            {halftimeRushActive && (
              <span className="text-[9px] text-amber-400 font-scoreboard tracking-wider animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>CONCESSION PEAK WASTE RUSH</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[260px] pr-1 scrollbar">
            {wasteBins.map((bin) => (
              <div 
                key={bin.id}
                className={`bg-stadium-green-dark/40 border rounded-lg p-3 flex flex-col justify-between transition-all hover:bg-stadium-green-dark/70 ${
                  bin.isHighLitterZone ? 'border-card-border/70 shadow-[0_0_8px_rgba(212,175,55,0.05)]' : 'border-card-border/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5">
                      {getBinIcon(bin.type)}
                      <span className="font-scoreboard text-[9.5px] font-semibold text-foreground tracking-wide truncate max-w-[80px]">{bin.zoneName}</span>
                    </div>
                    <span className={`text-[10px] font-bold font-scoreboard ${getFillTextColor(bin.fillLevelPercent)}`}>
                      {bin.fillLevelPercent}%
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-[7.5px] font-bold uppercase px-1 rounded bg-card-bg text-foreground/70 border border-card-border/30">
                      {bin.type}
                    </span>
                    {bin.isHighLitterZone && (
                      <span className="text-[7.5px] font-bold uppercase px-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        High Litter
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {/* Gauge Bar */}
                  <div className="w-full bg-stadium-green-dark/75 rounded-full h-1.5 overflow-hidden border border-stadium-green/10 mb-1.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${getFillColor(bin.fillLevelPercent)}`} 
                      style={{ width: `${bin.fillLevelPercent}%` }}
                    />
                  </div>

                  <span className="text-[7.5px] text-foreground/60 block font-mono">
                    LAST CLEAR: {new Date(bin.lastEmptiedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Waste Routing recommendations (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <span className="text-[10px] font-scoreboard tracking-widest text-accent-gold font-bold mb-2">
            AI WASTE ROUTING DIRECTOR
          </span>

          <div 
            className="flex-1 bg-stadium-green-dark/50 border border-card-border rounded-lg p-4 flex flex-col justify-center min-h-[220px]"
            aria-live="polite"
            aria-relevant="all"
          >
            {wasteRecommendationsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <Loader2 className="w-8 h-8 text-accent-gold animate-spin mb-3" aria-hidden="true" />
                <p className="text-xs text-foreground/75 font-scoreboard tracking-wider">GEMINI OPTIMIZING CLEANUP PATTERNS & COLLECTION ROUTES...</p>
                <p className="text-[9px] text-accent-gold/60 italic mt-1 font-scoreboard">Syncing recycling logs & concession crowd rates...</p>
              </div>
            ) : sortedRecommendations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-foreground/70">
                <Sparkles className="w-10 h-10 text-accent-gold/40 mb-2" aria-hidden="true" />
                <p className="text-xs font-scoreboard">NO ACTIVE ROUTING ALERTS</p>
                <p className="text-[10px] text-foreground/70 max-w-[200px] mx-auto mt-1 leading-normal font-sans">
                  Click &quot;Simulate Halftime Rush&quot; above to calculate real-time cleanup collection routing priorities.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[240px] pr-1 scrollbar">
                {sortedRecommendations.map((rec) => {
                  const bin = wasteBins.find(b => b.id === rec.binId);
                  return (
                    <div 
                      key={rec.binId}
                      className={`border bg-stadium-green-dark/45 rounded-lg p-2.5 text-xs transition-all hover:bg-stadium-green-dark/70 ${
                        rec.priority === 'CRITICAL'
                          ? 'border-red-500/25 bg-red-950/10'
                          : rec.priority === 'HIGH'
                          ? 'border-amber-500/25 bg-amber-950/10'
                          : 'border-card-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1 py-0.2 rounded text-[7.5px] font-bold font-scoreboard ${
                            rec.priority === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/35'
                              : rec.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35'
                          }`}>
                            {rec.priority}
                          </span>
                          <span className="font-bold text-foreground font-scoreboard tracking-wide">
                            {bin ? bin.zoneName : rec.binId} ({bin?.type})
                          </span>
                        </div>
                        <span className="text-[8px] font-mono text-foreground/60">
                          +{rec.estFillRateHour}%/hr
                        </span>
                      </div>

                      <div className="bg-stadium-green-dark/85 border border-accent-gold/10 p-1.5 rounded text-[10px] text-accent-gold font-mono leading-tight flex items-start space-x-1 mt-1.5">
                        <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-accent-gold" aria-hidden="true" />
                        <span>{rec.action}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

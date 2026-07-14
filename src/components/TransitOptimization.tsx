"use client";

import React, { useState } from 'react';
import { useStadium, TransitMode } from '../context/StadiumContext';
import { Bus, Car, Smartphone, Train, Megaphone, Loader2, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';

export const TransitOptimization: React.FC = () => {
  const {
    transitModes,
    finalWhistleTriggered,
    transitRecommendations,
    transitRecommendationsLoading,
    simulateFinalWhistle
  } = useStadium();

  const [lastClickedTime, setLastClickedTime] = useState<number>(0);
  const [localLoading, setLocalLoading] = useState<boolean>(false);

  // Debounced/Throttled trigger handler to prevent rapid double-clicks
  const handleWhistleClick = async () => {
    const now = Date.now();
    if (now - lastClickedTime < 3000 || localLoading || transitRecommendationsLoading) {
      // Throttle double clicks within 3 seconds
      return;
    }
    setLastClickedTime(now);
    setLocalLoading(true);
    try {
      await simulateFinalWhistle();
    } catch (e) {
      console.error('Error simulating final whistle:', e);
    } finally {
      setLocalLoading(false);
    }
  };

  const getTransitIcon = (type: TransitMode['type']) => {
    switch (type) {
      case 'metro': return <Train className="w-4 h-4 text-accent-gold" />;
      case 'shuttle': return <Bus className="w-4 h-4 text-accent-gold" />;
      case 'parking': return <Car className="w-4 h-4 text-accent-gold" />;
      case 'rideshare': return <Smartphone className="w-4 h-4 text-accent-gold" />;
    }
  };

  const getCongestionColor = (percent: number) => {
    if (percent < 60) return 'bg-emerald-500'; // Green
    if (percent < 85) return 'bg-amber-500';   // Yellow
    return 'bg-red-500';                      // Red
  };

  const getCongestionTextColor = (percent: number) => {
    if (percent < 60) return 'text-emerald-400';
    if (percent < 85) return 'text-amber-400';
    return 'text-red-400 animate-pulse';
  };

  // Sort recommendations by rank if they exist, otherwise use default
  const sortedRecommendations = [...transitRecommendations].sort((a, b) => a.rank - b.rank);

  return (
    <div className="panel-glass rounded-xl p-5 flex flex-col relative scanlines overflow-hidden min-h-[380px]">
      
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-card-border pb-3.5 mb-4 gap-3">
        <div className="flex items-center space-x-2">
          <div className="bg-accent-gold/10 p-1.5 rounded border border-accent-gold/25">
            <Megaphone className="text-accent-gold w-5 h-5 animate-pulse-gold" />
          </div>
          <div>
            <h2 className="font-scoreboard text-base tracking-wider text-foreground">AI TRANSPORTATION & EGRESS OPTIMIZATION</h2>
            <div className="text-[9px] text-foreground/70 tracking-wider">
              REAL-TIME EGRESS FLOW FORECASTS & MUNICIPAL TRANSIT TIMETABLES
            </div>
          </div>
        </div>

        {/* Egress simulator trigger button */}
        <button
          onClick={handleWhistleClick}
          disabled={localLoading || transitRecommendationsLoading}
          className={`px-4 py-1.5 rounded font-scoreboard text-[10px] tracking-wider font-bold transition-all flex items-center space-x-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-gold focus:border-accent-gold border ${
            finalWhistleTriggered
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : 'bg-accent-gold hover:bg-accent-gold-hover text-stadium-green-dark border-accent-gold glow-gold'
          }`}
          aria-pressed={finalWhistleTriggered}
        >
          {localLoading || transitRecommendationsLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              <span>COGNITIVE LAYER THINKING...</span>
            </>
          ) : (
            <>
              <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{finalWhistleTriggered ? "FINAL WHISTLE ACTIVE" : "SIMULATE FINAL WHISTLE"}</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        
        {/* LEFT COLUMN: Live Transit Congestion Gauges (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-scoreboard tracking-widest text-accent-gold font-bold">
              LIVE CONGESTION FEED (EXTERNAL SYSTEM SENSORS)
            </span>
            {finalWhistleTriggered && (
              <span className="text-[9px] text-red-400 font-scoreboard tracking-wider animate-pulse flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                <span>PEAK EGRESS WAVE</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {transitModes.map((mode) => (
              <div 
                key={mode.id}
                className="bg-stadium-green-dark/40 border border-card-border rounded-lg p-3 flex flex-col justify-between transition-all hover:bg-stadium-green-dark/70"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      {getTransitIcon(mode.type)}
                      <span className="font-scoreboard text-xs font-semibold text-foreground tracking-wide">{mode.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold font-scoreboard uppercase ${getCongestionTextColor(mode.congestionPercent)}`}>
                      {mode.congestionPercent}%
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-foreground/80 font-sans leading-tight mb-2.5">{mode.description}</p>
                </div>

                <div>
                  {/* Gauge Bar */}
                  <div className="w-full bg-stadium-green-dark/75 rounded-full h-1.5 overflow-hidden border border-stadium-green/10 mb-2">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${getCongestionColor(mode.congestionPercent)}`} 
                      style={{ width: `${mode.congestionPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[9px] font-scoreboard text-foreground/70">
                    <span>GATE: <strong className="text-foreground">{mode.associatedGate}</strong></span>
                    <span>WAIT TIME: <strong className="text-foreground font-mono">{mode.avgWaitTimeMin}m</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Egress Routing recommendations (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <span className="text-[10px] font-scoreboard tracking-widest text-accent-gold font-bold mb-2">
            AI EGRESS ROUTING DIRECTOR
          </span>

          <div 
            className="flex-1 bg-stadium-green-dark/50 border border-card-border rounded-lg p-4 flex flex-col justify-center min-h-[220px]"
            aria-live="polite"
            aria-relevant="all"
          >
            {transitRecommendationsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <Loader2 className="w-8 h-8 text-accent-gold animate-spin mb-3" aria-hidden="true" />
                <p className="text-xs text-foreground/75 font-scoreboard tracking-wider">GEMINI COMPUTING EGRESS SCHEDULING & ROUTING FLOWS...</p>
                <p className="text-[9px] text-accent-gold/60 italic mt-1 font-scoreboard">Syncing parking gridlocks & train arrival matrices...</p>
              </div>
            ) : sortedRecommendations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-foreground/70">
                <Sparkles className="w-10 h-10 text-accent-gold/40 mb-2" aria-hidden="true" />
                <p className="text-xs font-scoreboard">NO ACTIVE TRANSIT RECOMMENDATIONS</p>
                <p className="text-[10px] text-foreground/70 max-w-[200px] mx-auto mt-1 leading-normal font-sans">
                  Click &quot;Simulate Final Whistle&quot; above to calculate real-time transit rankings.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[240px] pr-1 scrollbar">
                {sortedRecommendations.map((rec) => {
                  const mode = transitModes.find(m => m.id === rec.modeId);
                  return (
                    <div 
                      key={rec.modeId}
                      className="border border-card-border bg-stadium-green-dark/45 rounded-lg p-2.5 text-xs transition-all hover:bg-stadium-green-dark/70"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-4.5 h-4.5 bg-accent-gold text-stadium-green-dark text-[9px] font-bold rounded-full flex items-center justify-center font-scoreboard">
                            #{rec.rank}
                          </span>
                          <span className="font-bold text-foreground font-scoreboard tracking-wide">
                            {mode ? mode.name : rec.modeId}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10.5px] text-foreground leading-normal mb-1.5 font-sans">
                        {rec.reasoning}
                      </p>

                      {rec.alternateRouteSuggestion && (
                        <div className="bg-stadium-green-dark/85 border border-accent-gold/10 p-1.5 rounded text-[10px] text-accent-gold font-mono leading-tight flex items-start space-x-1">
                          <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-accent-gold" aria-hidden="true" />
                          <span>{rec.alternateRouteSuggestion}</span>
                        </div>
                      )}
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

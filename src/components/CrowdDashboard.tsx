"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useStadium } from '../context/StadiumContext';
import { AlertOctagon, CheckCircle2, Loader2, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';

interface IncidentTemplate {
  label: string;
  text: string;
  category: string;
  gateId?: string;
  sectionId?: string;
}

export const CrowdDashboard: React.FC = () => {
  const {
    gates,
    incidents,
    recommendations,
    recommendationsLoading,
    injectIncident,
    resolveIncident,
    fetchRecommendations,
    sections
  } = useStadium();

  const [customIncidentText, setCustomIncidentText] = useState('');
  const [incidentCategory, setIncidentCategory] = useState('Crowd Flow');
  const [selectedGate, setSelectedGate] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [injecting, setInjecting] = useState(false);

  // Quick incident templates for judges to demo instantly
  const templates = useMemo(() => [
    {
      label: "Medical (Sec 125)",
      text: "Medical Emergency: Fan experiencing severe heat exhaustion in Section 125. Medic dispatch required.",
      category: "Medical",
      sectionId: "Sec 121-130"
    },
    {
      label: "Crowd Jam (Gate B)",
      text: "Crowd Flow Alert: Turnstile 3 ticket scanner offline. 200+ fans queued outside. Divert arriving flow.",
      category: "Crowd Flow",
      gateId: "Gate B"
    },
    {
      label: "Water Leak (Sec 204)",
      text: "Facilities Alert: Major water pipe leak in Section 204 concourse. Slip hazard, power cut required in zone.",
      category: "Maintenance",
      sectionId: "Sec 201-215"
    }
  ], []);

  const handleInjectTemplate = useCallback(async (tmpl: IncidentTemplate) => {
    setInjecting(true);
    await injectIncident(tmpl.text, tmpl.category, tmpl.gateId, tmpl.sectionId);
    setInjecting(false);
  }, [injectIncident]);

  const handleSubmitCustom = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIncidentText.trim()) return;

    setInjecting(true);
    await injectIncident(
      customIncidentText,
      incidentCategory,
      selectedGate || undefined,
      selectedSection || undefined
    );
    setCustomIncidentText('');
    setSelectedGate('');
    setSelectedSection('');
    setInjecting(false);
  }, [customIncidentText, incidentCategory, selectedGate, selectedSection, injectIncident]);

  // Helper for progress bar color
  const getProgressColor = (percent: number) => {
    if (percent < 60) return 'bg-[#10B981]';
    if (percent < 85) return 'bg-[#F59E0B]';
    return 'bg-[#EF4444] animate-pulse';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
      {/* LEFT COLUMN: Gate Occupancy Gauges & Incident Injection (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        
        {/* Gate Loads */}
        <div className="panel-glass rounded-xl p-5 flex flex-col">
          <h3 className="font-scoreboard text-base tracking-wider text-foreground border-b border-card-border pb-3 mb-4 flex items-center justify-between">
            <span>LIVE GATE OCCUPANCY</span>
            <span className="text-[10px] text-accent-gold animate-pulse">STREAMING DATA</span>
          </h3>
          <div className="space-y-3.5">
            {gates.map((gate) => (
              <div key={gate.id} className="text-xs">
                <div className="flex justify-between items-center mb-1 font-sans">
                  <span className="font-semibold text-foreground">{gate.name}</span>
                  <span className="text-foreground/80 font-mono font-bold">{gate.occupancyPercent}%</span>
                </div>
                <div className="w-full bg-stadium-green-dark/60 rounded-full h-2.5 border border-stadium-green/20 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(gate.occupancyPercent)}`}
                    style={{ width: `${gate.occupancyPercent}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-foreground/50 mt-0.5 block italic leading-tight">
                  Transit: {gate.transitConnections.join(" | ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Incident Injector */}
        <div className="panel-glass rounded-xl p-5 flex flex-col">
          <h3 className="font-scoreboard text-base tracking-wider text-foreground border-b border-card-border pb-3 mb-3 flex items-center space-x-2">
            <ShieldAlert className="text-accent-gold w-4 h-4" />
            <span>INJECT SYSTEM INCIDENT (DEMO TRIGGER)</span>
          </h3>
          <p className="text-[10.5px] text-foreground/75 leading-relaxed mb-3">
            Click a preset template to inject a live incident. Gemini will immediately regenerate operations recommendations factoring in the new hazard.
          </p>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {templates.map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => handleInjectTemplate(tmpl)}
                disabled={injecting}
                className="bg-stadium-green-dark hover:bg-stadium-green-light border border-card-border hover:border-accent-gold/40 text-[10px] text-foreground font-semibold py-1.5 px-2 rounded transition-all text-left flex flex-col justify-between h-[52px] cursor-pointer disabled:opacity-50"
              >
                <span className="font-scoreboard text-accent-gold leading-tight">{tmpl.label}</span>
                <span className="text-[8px] text-foreground/60 leading-none truncate w-full">{tmpl.text}</span>
              </button>
            ))}
          </div>

          <div className="relative flex items-center justify-between border-t border-card-border/40 my-1 py-1">
            <span className="text-[10px] font-scoreboard text-foreground/40 bg-card-bg px-2 absolute left-1/2 -translate-x-1/2">OR CUSTOM INCIDENT</span>
          </div>

          {/* Custom Incident Form */}
          <form onSubmit={handleSubmitCustom} className="space-y-3 mt-3">
            <textarea
              value={customIncidentText}
              onChange={(e) => setCustomIncidentText(e.target.value)}
              placeholder="Describe incident (e.g. 'Turnstile 4 power failure Gate E'...)"
              rows={2}
              className="w-full bg-stadium-green-dark/60 border border-card-border rounded px-3 py-1.5 text-xs text-foreground placeholder-foreground/45 focus:outline-none focus:border-accent-gold"
              required
              disabled={injecting}
            />

            <div className="grid grid-cols-3 gap-2">
              {/* Category */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-foreground/65 mb-1 font-scoreboard">Category</label>
                <select
                  value={incidentCategory}
                  onChange={(e) => setIncidentCategory(e.target.value)}
                  className="w-full bg-stadium-green-dark border border-card-border rounded p-1 text-[11px] text-foreground focus:outline-none focus:border-accent-gold"
                  disabled={injecting}
                >
                  <option value="Crowd Flow">Crowd Flow</option>
                  <option value="Medical">Medical</option>
                  <option value="Security">Security</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              {/* Gate Link */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-foreground/65 mb-1 font-scoreboard">Link Gate</label>
                <select
                  value={selectedGate}
                  onChange={(e) => {
                    setSelectedGate(e.target.value);
                    if (e.target.value) setSelectedSection('');
                  }}
                  className="w-full bg-stadium-green-dark border border-card-border rounded p-1 text-[11px] text-foreground focus:outline-none focus:border-accent-gold"
                  disabled={injecting}
                >
                  <option value="">None</option>
                  {gates.map(g => (
                    <option key={g.id} value={g.id}>{g.id}</option>
                  ))}
                </select>
              </div>

              {/* Section Link */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-foreground/65 mb-1 font-scoreboard">Link Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    if (e.target.value) setSelectedGate('');
                  }}
                  className="w-full bg-stadium-green-dark border border-card-border rounded p-1 text-[11px] text-foreground focus:outline-none focus:border-accent-gold"
                  disabled={injecting}
                >
                  <option value="">None</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.id.split(' (')[0]}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={injecting || !customIncidentText.trim()}
              className="w-full bg-accent-gold hover:bg-accent-gold-hover disabled:opacity-40 disabled:hover:bg-accent-gold text-stadium-green-dark font-scoreboard text-xs py-2 rounded font-bold cursor-pointer flex items-center justify-center space-x-1"
            >
              {injecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>INJECTING & ANALYZING...</span>
                </>
              ) : (
                <span>INJECT CUSTOM INCIDENT</span>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* RIGHT COLUMN: AI Operations Control Room Panel (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        
        {/* Gemini Ops Recommendations */}
        <div className="panel-glass rounded-xl p-5 flex flex-col flex-1 relative overflow-hidden scanlines">
          {/* PA Glowing background flare */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/5 rounded-full filter blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between border-b border-card-border pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="text-accent-gold w-4 h-4 animate-pulse-gold" />
              <h3 className="font-scoreboard text-base tracking-wider text-foreground">AI OPS CONTROL ROOM RECOMMENDATIONS</h3>
            </div>
            <button
              onClick={() => fetchRecommendations(gates, sections, incidents)}
              disabled={recommendationsLoading}
              className="p-1 rounded bg-stadium-green-dark/50 hover:bg-stadium-green-light border border-card-border text-foreground hover:text-accent-gold transition-all cursor-pointer disabled:opacity-40"
              title="Manual Refresh recommendations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recommendationsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {recommendationsLoading && recommendations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="w-8 h-8 text-accent-gold animate-spin mb-3" />
              <p className="text-xs text-foreground/60 font-scoreboard tracking-wider">AI AGENT COGNITIVE LAYER ANALYZING REAL-TIME METRICS...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[380px] scrollbar pr-1">
              {recommendationsLoading && (
                <div className="bg-stadium-green-light/10 border border-accent-gold/25 p-2 rounded text-center text-[10px] text-accent-gold font-scoreboard tracking-widest animate-pulse flex items-center justify-center space-x-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>REFRESHING RE-RANKED COMMAND FLOWS...</span>
                </div>
              )}
              
              {recommendations.length === 0 ? (
                <div className="text-center py-12 text-xs text-foreground/45">
                  No active recommendations. Real-time systems balanced.
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div 
                    key={rec.id} 
                    className={`border rounded-lg p-3 text-xs flex flex-col relative transition-all ${
                      rec.priority === 'HIGH' 
                        ? 'border-red-500/30 bg-red-950/15 hover:border-red-500/50' 
                        : rec.priority === 'MEDIUM' 
                        ? 'border-amber-500/25 bg-amber-950/10 hover:border-amber-500/40' 
                        : 'border-stadium-green/45 bg-stadium-green-dark/30 hover:border-stadium-green-light'
                    }`}
                  >
                    {/* Badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded font-scoreboard ${
                        rec.priority === 'HIGH' 
                          ? 'bg-red-500/25 text-red-400 border border-red-500/40' 
                          : rec.priority === 'MEDIUM' 
                          ? 'bg-amber-500/25 text-amber-400 border border-amber-500/40' 
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {rec.priority} PRIORITY
                      </span>
                      <span className="text-[9px] text-foreground/40 font-mono">{rec.id}</span>
                    </div>

                    <div className="font-semibold text-foreground text-xs leading-tight mb-1">
                      {rec.alert}
                    </div>
                    
                    <div className="bg-stadium-green-dark/70 border border-card-border/60 rounded p-2 text-foreground/90 my-1 font-mono text-[11px] leading-tight">
                      <span className="text-accent-gold font-bold font-scoreboard text-[9.5px] block mb-0.5">COMMAND ACTION:</span>
                      {rec.action}
                    </div>

                    <div className="text-[10px] text-foreground/60 leading-tight mt-1">
                      <strong className="text-foreground/80 font-scoreboard text-[9px] mr-1">EXPECTED IMPACT:</strong> 
                      {rec.impact}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Active Incidents List (Triage & Resolve) */}
        <div className="panel-glass rounded-xl p-5 flex flex-col max-h-[220px]">
          <h3 className="font-scoreboard text-base tracking-wider text-foreground border-b border-card-border pb-2.5 mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertOctagon className="text-red-500 w-4.5 h-4.5" />
              <span>ACTIVE OPERATION ALERTS ({incidents.filter(i => i.status === 'Active').length})</span>
            </div>
          </h3>
          <div className="overflow-y-auto space-y-2 flex-1 scrollbar pr-1">
            {incidents.filter(inc => inc.status === 'Active').length === 0 ? (
              <div className="text-center py-6 text-xs text-foreground/45 italic">
                No active stadium incidents reported. Status Green.
              </div>
            ) : (
              incidents.filter(inc => inc.status === 'Active').map((inc) => (
                <div key={inc.id} className="bg-stadium-green-dark/45 border border-red-500/20 rounded p-2.5 flex items-center justify-between text-xs transition-all hover:bg-stadium-green-dark/75">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-2 mb-0.5">
                      <span className="bg-red-500/10 text-red-400 font-bold border border-red-500/20 px-1 py-0.2 rounded text-[9px] font-scoreboard">
                        {inc.category}
                      </span>
                      <span className="text-[9px] text-foreground/40 font-mono">
                        {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-foreground/90 leading-tight font-sans text-[11px]">{inc.text}</p>
                  </div>
                  <button
                    onClick={() => resolveIncident(inc.id)}
                    className="flex items-center space-x-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-stadium-green-dark border border-emerald-500/30 rounded px-2.5 py-1 transition-all cursor-pointer font-scoreboard text-[10px] font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>RESOLVE</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

"use client";

import React, { useState } from 'react';
import { useStadium } from '../context/StadiumContext';
import { ClipboardList, Loader2, Radio, Send, Sparkles } from 'lucide-react';

interface BriefingSection {
  id: string;
  summary: string;
  action?: string;
  status?: string;
}

interface CompiledBriefing {
  topPriorities: BriefingSection[];
  resolved: BriefingSection[];
  watchList: BriefingSection[];
}

export const IncidentSummarizer: React.FC = () => {
  const { reports, addRawReport } = useStadium();
  const [briefingLanguage, setBriefingLanguage] = useState<'en' | 'es' | 'fr'>('en');
  const [briefing, setBriefing] = useState<CompiledBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [customReport, setCustomReport] = useState('');
  const [addingReport, setAddingReport] = useState(false);

  // Generate briefing via LLM API call
  const generateBriefing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports: reports.map(r => `[${r.timestamp}] ${r.source}: ${r.text}`),
          language: briefingLanguage
        })
      });

      if (response.ok) {
        const data = await response.json();
        setBriefing(data);
      } else {
        console.error('Failed to generate briefing');
      }
    } catch (e) {
      console.error('Error generating briefing:', e);
    } finally {
      setLoading(false);
    }
  };

  // Submit custom raw report manually (simulates radio input)
  const handleAddRawReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customReport.trim()) return;

    setAddingReport(true);
    addRawReport("Radio Operator", customReport, "General");
    setCustomReport('');
    setAddingReport(false);
  };

  return (
    <div className="panel-glass rounded-xl p-5 flex flex-col h-[520px] relative scanlines">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-card-border pb-3 mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <div className="bg-red-500/10 p-1.5 rounded border border-red-500/20">
            <Radio className="text-red-400 w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-scoreboard text-base tracking-wider text-foreground">AI BRIEFING & INCIDENT TRIAGE</h2>
            <div className="text-[9px] text-foreground/70 tracking-wider">
              RAW RADIO INPUTS TO STRUCTURED VOLUNTEER BRIEFINGS
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Translation selection for briefing */}
          <div className="bg-stadium-green-dark/45 border border-card-border rounded flex overflow-hidden" role="group" aria-label="Select briefing language">
            {(['en', 'es', 'fr'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setBriefingLanguage(lang)}
                className={`px-2 py-0.5 text-[9px] font-bold uppercase transition-all focus:outline-none focus:ring-1 focus:ring-accent-gold ${
                  briefingLanguage === lang
                    ? 'bg-accent-gold text-stadium-green-dark'
                    : 'text-foreground/75 hover:bg-stadium-green-light/40'
                }`}
                aria-label={`Set briefing compilation language to ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : 'French'}`}
                aria-current={briefingLanguage === lang ? 'true' : undefined}
              >
                {lang}
              </button>
            ))}
          </div>

          <button
            onClick={generateBriefing}
            disabled={loading}
            className="bg-accent-gold hover:bg-accent-gold-hover disabled:opacity-40 text-stadium-green-dark font-scoreboard text-[10px] font-bold py-1.5 px-3 rounded flex items-center space-x-1.5 transition-all cursor-pointer glow-gold focus:outline-none focus:ring-1 focus:ring-accent-gold focus:border-accent-gold"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>COMPILING...</span>
              </>
            ) : (
              <>
                <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
                <span>GENERATE BRIEFING</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
        {/* LEFT COLUMN: Raw Radio Logs */}
        <div className="flex flex-col h-full overflow-hidden border-r border-card-border/30 pr-2">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-scoreboard tracking-widest text-accent-gold font-bold">
              RAW LOGS FEED (RADIO/SMS)
            </span>
            <span className="text-[9px] text-foreground/70 font-mono">
              TOTAL {reports.length} SIGNALS
            </span>
          </div>

          {/* Raw Feed Logs Scroll */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 scrollbar pr-1">
            {reports.map((rep) => (
              <div 
                key={rep.id} 
                className="bg-stadium-green-dark/40 border border-card-border/40 rounded p-2 text-[11px] leading-snug transition-all hover:bg-stadium-green-dark/70"
              >
                <div className="flex justify-between items-center mb-1 text-[9.5px]">
                  <span className="text-accent-gold font-semibold font-scoreboard">{rep.source}</span>
                  <span className="text-foreground/70 font-mono">
                    {new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-foreground/80 font-sans">{rep.text}</p>
              </div>
            ))}
          </div>

          {/* Quick simulator: submit raw radio call */}
          <form onSubmit={handleAddRawReport} className="border-t border-card-border/50 pt-2 flex items-center space-x-2">
            <input
              type="text"
              value={customReport}
              onChange={(e) => setCustomReport(e.target.value)}
              placeholder="Simulate volunteer radio report..."
              className="flex-1 bg-stadium-green-dark/60 border border-card-border rounded px-2.5 py-1.5 text-[11px] text-foreground placeholder-foreground/45 focus:outline-none focus:ring-1 focus:ring-accent-gold focus:border-accent-gold"
              disabled={addingReport || loading}
              aria-label="Simulate volunteer radio report text"
            />
            <button
              type="submit"
              disabled={addingReport || loading || !customReport.trim()}
              className="bg-stadium-green-light hover:bg-stadium-green text-foreground p-1.5 rounded transition-all cursor-pointer border border-stadium-green/40 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              title="Add radio message"
              aria-label="Simulate adding raw radio report"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Structured AI Briefing Display */}
        <div className="flex flex-col h-full overflow-hidden pl-1 justify-center" aria-live="polite" lang={briefingLanguage}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
              <Loader2 className="w-8 h-8 text-accent-gold animate-spin mb-3" aria-hidden="true" />
              <p className="text-xs text-foreground/60 font-scoreboard tracking-wider">GEMINI SUMMARIZING RAW FEED...</p>
              <p className="text-[10px] text-accent-gold/50 italic mt-1">Sorting alerts and writing translation...</p>
            </div>
          ) : briefing ? (
            <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar pr-1">
              <div className="bg-accent-gold/10 border border-accent-gold/20 p-2 rounded flex items-center justify-between">
                <span className="text-[10px] font-scoreboard font-bold text-accent-gold flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-accent-gold animate-pulse-gold" />
                  <span>COMPILED SHIFT BRIEFING</span>
                </span>
                <span className="text-[9px] bg-accent-gold text-stadium-green-dark px-1.5 py-0.2 rounded font-bold uppercase font-scoreboard">
                  {briefingLanguage}
                </span>
              </div>

              {/* TOP PRIORITIES */}
              <div>
                <h4 className="text-[9.5px] font-scoreboard text-red-400 font-bold border-b border-red-500/20 pb-1 mb-1.5 tracking-wider">
                  ⚠️ TOP PRIORITIES / ACTIVE CONCERNS
                </h4>
                <div className="space-y-1.5">
                  {briefing.topPriorities.length === 0 ? (
                    <div className="text-[10.5px] text-foreground/70 italic pl-1">No active critical priorities.</div>
                  ) : (
                    briefing.topPriorities.map((item, idx) => (
                      <div key={idx} className="bg-red-950/10 border border-red-500/10 rounded p-2 text-[11px] leading-snug">
                        <strong className="text-foreground/90 block mb-0.5 font-sans font-semibold">
                          [{item.id}] {item.summary}
                        </strong>
                        {item.action && (
                          <div className="text-[10px] text-red-300 font-mono mt-0.5">
                            <span className="font-semibold uppercase text-[9px] mr-1">ACTION:</span>
                            {item.action}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* WATCH LIST */}
              <div>
                <h4 className="text-[9.5px] font-scoreboard text-amber-400 font-bold border-b border-amber-500/20 pb-1 mb-1.5 tracking-wider">
                  ⏱️ WATCH-LIST / DEVELOPING ISSUES
                </h4>
                <div className="space-y-1.5">
                  {briefing.watchList.length === 0 ? (
                    <div className="text-[10.5px] text-foreground/70 italic pl-1">No items currently on watch-list.</div>
                  ) : (
                    briefing.watchList.map((item, idx) => (
                      <div key={idx} className="bg-amber-950/10 border border-amber-500/10 rounded p-2 text-[11px] leading-snug">
                        <strong className="text-foreground/90 block mb-0.5 font-sans font-semibold">
                          [{item.id}] {item.summary}
                        </strong>
                        {item.status && (
                          <div className="text-[10px] text-amber-300 font-mono mt-0.5">
                            <span className="font-semibold uppercase text-[9px] mr-1">STATUS:</span>
                            {item.status}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RESOLVED */}
              <div>
                <h4 className="text-[9.5px] font-scoreboard text-emerald-400 font-bold border-b border-emerald-500/20 pb-1 mb-1.5 tracking-wider">
                  ✓ RESOLVED / UNDER CONTROL
                </h4>
                <div className="space-y-1.5">
                  {briefing.resolved.length === 0 ? (
                    <div className="text-[10.5px] text-foreground/70 italic pl-1">No incidents resolved this shift yet.</div>
                  ) : (
                    briefing.resolved.map((item, idx) => (
                      <div key={idx} className="bg-emerald-950/10 border border-emerald-500/10 rounded p-2 text-[11px] leading-snug">
                        <strong className="text-foreground/80 block mb-0.5 font-sans font-semibold line-through">
                          [{item.id}] {item.summary}
                        </strong>
                        {item.status && (
                          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                            <span className="font-semibold uppercase text-[9px] mr-1 font-scoreboard">RESOLVED:</span>
                            {item.status}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-stadium-green-dark/15 border border-stadium-green/10 rounded-lg p-5">
              <ClipboardList className="w-12 h-12 text-stadium-green/60 mb-2.5" />
              <h4 className="font-scoreboard text-foreground/80 tracking-wider text-xs mb-1">NO BRIEFING GENERATED</h4>
              <p className="text-[10.5px] text-foreground/70 max-w-[200px] leading-relaxed">
                Click &quot;Generate Briefing&quot; above to translate raw signal data into a formatted volunteer briefing sheet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

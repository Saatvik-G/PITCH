"use client";

import React from 'react';
import { Leaf, Navigation } from 'lucide-react';

export const RoadmapPanel: React.FC = () => {
  return (
    <div className="panel-glass rounded-xl p-5 flex flex-col h-full">
      <h3 className="font-scoreboard text-base tracking-wider text-foreground border-b border-card-border pb-3 mb-4 flex items-center space-x-2">
        <Navigation className="text-accent-gold w-4 h-4" />
        <span>PITCH PHASE 2 INTEGRATION ROADMAP</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Drone Egress Guidance */}
        <div className="bg-stadium-green-dark/40 border border-card-border/60 rounded-lg p-4 relative overflow-hidden transition-all hover:border-accent-gold/30 animate-fade-in">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Navigation className="w-12 h-12 text-accent-gold" />
          </div>
          
          <div className="flex items-center space-x-2 mb-2">
            <span className="w-1.5 h-1.5 bg-accent-gold rounded-full animate-pulse"></span>
            <h4 className="font-scoreboard text-xs font-bold text-accent-gold tracking-wider">
              Predictive Drone Egress Guidance (Phase 2)
            </h4>
          </div>
          
          <p className="text-xs text-foreground/85 leading-relaxed font-sans">
            Deploying a networked fleet of autonomous LED wayfinding drones to Gates A-F immediately following the final whistle. Drones will hover above congested exit pathways and coordinate dynamic directional arrows and audio broadcasts, visually shifting crowds toward municipal transit bays recommended by PITCH&apos;s real-time occupancy engine.
          </p>
        </div>

        {/* Sustainability & Waste Routing */}
        <div className="bg-stadium-green-dark/40 border border-card-border/60 rounded-lg p-4 relative overflow-hidden transition-all hover:border-accent-gold/30">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Leaf className="w-12 h-12 text-emerald-400" />
          </div>
          
          <div className="flex items-center space-x-2 mb-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <h4 className="font-scoreboard text-xs font-bold text-emerald-400 tracking-wider">
              Sustainability & Waste Routing (Phase 2)
            </h4>
          </div>
          
          <p className="text-xs text-foreground/85 leading-relaxed font-sans">
            Connecting stadium IoT weight-sensored garbage receptacles with volunteer cleaning routes to dynamically map cleanup priorities during match downtime. The AI routing engine will evaluate live bin capacity, historical high-litter concession zones, and volunteer positions to output optimal cleanup paths on volunteer handheld devices. This maximizes recycling compliance, reduces waste overflow, and accelerates stadium cleaning loops between matches.
          </p>
        </div>
      </div>
    </div>
  );
};

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useStadium, GateState, SectionState } from '../context/StadiumContext';
import { AlertTriangle, Compass } from 'lucide-react';

// Polar coordinate math for drawing circular stadium rings
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}

// Optimized, memoized Section Arc Component
interface SectionPathProps {
  spec: {
    id: string;
    startAngle: number;
    endAngle: number;
    radius: number;
    width: number;
  };
  occupancyPercent: number;
  isSelected: boolean;
  onClick: () => void;
}

const StadiumSectionPath = React.memo(({ spec, occupancyPercent, isSelected, onClick }: SectionPathProps) => {
  const getDensityColor = (percent: number) => {
    if (percent < 60) return '#10B981'; // Green (Low)
    if (percent < 85) return '#F59E0B'; // Yellow (Medium)
    return '#EF4444'; // Red (High)
  };

  const densityColor = getDensityColor(occupancyPercent);

  return (
    <path
      d={describeArc(250, 250, spec.radius, spec.startAngle, spec.endAngle)}
      fill="none"
      stroke={densityColor}
      strokeWidth={spec.width}
      className={`cursor-pointer transition-all duration-300 ${
        isSelected ? 'stroke-[28px] opacity-100 filter drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]' : 'opacity-85 hover:opacity-100 hover:stroke-[25px]'
      }`}
      onClick={onClick}
    />
  );
});
StadiumSectionPath.displayName = 'StadiumSectionPath';

// Optimized, memoized Gate Node Component
interface GateGroupProps {
  gate: GateState;
  coords: { x: number; y: number };
  isSelected: boolean;
  activeInc: boolean;
  occupancyPercent: number;
  onClick: () => void;
}

const StadiumGateGroup = React.memo(({ gate, coords, isSelected, activeInc, occupancyPercent, onClick }: GateGroupProps) => {
  const getDensityColor = (percent: number) => {
    if (percent < 60) return '#10B981';
    if (percent < 85) return '#F59E0B';
    return '#EF4444';
  };

  const densityColor = getDensityColor(occupancyPercent);

  return (
    <g 
      className="cursor-pointer"
      onClick={onClick}
    >
      {/* Gate Connection Line */}
      <line x1="250" y1="250" x2={coords.x} y2={coords.y} className="stroke-card-border/30" strokeDasharray="3,3" />

      {/* Gate Badge Circle */}
      <circle 
        cx={coords.x} 
        cy={coords.y} 
        r={isSelected ? 16 : 14} 
        className={`fill-card-bg stroke-2 transition-all duration-300 ${
          activeInc ? 'stroke-red-500 animate-pulse' : isSelected ? 'stroke-accent-gold' : 'stroke-card-border'
        }`}
      />
      
      {/* Inner status/occupancy dot */}
      <circle cx={coords.x} cy={coords.y} r="5" fill={densityColor} />
      
      {/* Label text */}
      <text 
        x={coords.x} 
        y={coords.y - 18} 
        textAnchor="middle" 
        fill="#F5F7F2" 
        fontSize="9" 
        fontWeight="bold"
        className="font-scoreboard tracking-wider fill-foreground/90 bg-card-bg"
      >
        {gate.id.split(' ')[1]}
      </text>

      {/* Live Incident Warning Icon overlay */}
      {activeInc && (
        <g transform={`translate(${coords.x + 8}, ${coords.y - 8}) scale(0.65)`}>
          <circle cx="0" cy="0" r="10" fill="#EF4444" />
          <text x="0" y="3" textAnchor="middle" fill="#FFF" fontSize="12" fontWeight="bold">!</text>
        </g>
      )}
    </g>
  );
});
StadiumGateGroup.displayName = 'StadiumGateGroup';

export const StadiumMap: React.FC = () => {
  const { gates, sections, incidents } = useStadium();
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'gate' | 'section'; data: any } | null>(null);

  // Section arc definitions (angles mapped to layout orientation)
  const sectionSpecs = useMemo(() => [
    { id: "Sec 101-110", startAngle: 315, endAngle: 405, radius: 105, width: 22 }, // North Lower
    { id: "Sec 111-120", startAngle: 45, endAngle: 135, radius: 105, width: 22 },  // East Lower
    { id: "Sec 121-130", startAngle: 135, endAngle: 225, radius: 105, width: 22 }, // South Lower
    { id: "Sec 131-140", startAngle: 225, endAngle: 315, radius: 105, width: 22 }, // West Lower
    
    { id: "Sec 201-215", startAngle: 315, endAngle: 405, radius: 135, width: 22 }, // North Mid
    { id: "Sec 216-230", startAngle: 45, endAngle: 225, radius: 135, width: 22 },  // East/South Mid
    { id: "Sec 231-245", startAngle: 225, endAngle: 315, radius: 135, width: 22 }, // West Mid
    
    { id: "Sec 301-320", startAngle: 300, endAngle: 420, radius: 165, width: 22 }, // North Upper
    { id: "Sec 321-340", startAngle: 120, endAngle: 300, radius: 165, width: 22 }  // South Upper
  ], []);

  // Map gates to SVG coordinates
  const gateCoords = useMemo((): Record<string, { x: number; y: number }> => ({
    "Gate A": { x: 250, y: 35 },
    "Gate B": { x: 415, y: 130 },
    "Gate C": { x: 415, y: 370 },
    "Gate D": { x: 250, y: 465 },
    "Gate E": { x: 85, y: 370 },
    "Gate F": { x: 85, y: 130 }
  }), []);

  // Helper to determine if an incident is active at this gate or section
  const hasIncident = useCallback((id: string, isGate = false) => {
    return incidents.some(inc => 
      inc.status === 'Active' && 
      (isGate ? inc.gateId === id : inc.sectionId === id)
    );
  }, [incidents]);

  return (
    <div className="panel-glass rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-card-border pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Compass className="text-accent-gold w-5 h-5 animate-pulse" />
          <h2 className="font-scoreboard text-lg tracking-wider text-foreground">Live Crowd Density & Map</h2>
        </div>
        <div className="flex space-x-3 text-xs">
          <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981] mr-1.5 inline-block"></span>&lt;60%</span>
          <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] mr-1.5 inline-block"></span>60-85%</span>
          <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] mr-1.5 inline-block"></span>&gt;85%</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[300px] flex items-center justify-center bg-stadium-green-dark/30 rounded-lg border border-stadium-green/20 p-2 overflow-hidden">
        {/* Scanline Overlay */}
        <div className="absolute inset-0 scanlines pointer-events-none opacity-30"></div>
        
        <svg viewBox="0 0 500 500" className="w-full max-w-[420px] h-auto drop-shadow-[0_0_20px_rgba(11,61,46,0.3)]">
          {/* Pitch Outer Grass Ring */}
          <ellipse cx="250" cy="250" rx="90" ry="60" className="fill-stadium-green-dark/40 stroke-stadium-green/30" strokeWidth="2" />
          
          {/* Soccer Pitch Center */}
          <rect x="185" y="210" width="130" height="80" className="fill-stadium-green/20 stroke-stadium-green/40" strokeWidth="1.5" />
          {/* Pitch Markings */}
          <line x1="250" y1="210" x2="250" y2="290" className="stroke-stadium-green/40" strokeWidth="1.5" />
          <circle cx="250" cy="250" r="18" fill="none" className="stroke-stadium-green/40" strokeWidth="1.5" />
          <rect x="185" y="230" width="15" height="40" fill="none" className="stroke-stadium-green/40" strokeWidth="1.5" />
          <rect x="300" y="230" width="15" height="40" fill="none" className="stroke-stadium-green/40" strokeWidth="1.5" />

          {/* Section Arcs */}
          {sectionSpecs.map((spec) => {
            const sectionData = sections.find(s => s.id === spec.id);
            if (!sectionData) return null;
            
            const isSelected = selectedEntity?.type === 'section' && selectedEntity.data.id === spec.id;

            return (
              <StadiumSectionPath
                key={spec.id}
                spec={spec}
                occupancyPercent={sectionData.occupancyPercent}
                isSelected={isSelected}
                onClick={() => setSelectedEntity({ type: 'section', data: sectionData })}
              />
            );
          })}

          {/* Render Active Incident Beacons on Seating Rings */}
          {sections.map((sec) => {
            if (!hasIncident(sec.id)) return null;
            // Place beacon in the center angle of the section
            const spec = sectionSpecs.find(s => s.id === sec.id);
            if (!spec) return null;
            const centerAngle = (spec.startAngle + spec.endAngle) / 2;
            const pos = polarToCartesian(250, 250, spec.radius, centerAngle);
            
            return (
              <g key={`inc-sec-${sec.id}`} className="animate-pulse">
                <circle cx={pos.x} cy={pos.y} r="10" fill="#EF4444" opacity="0.4" />
                <circle cx={pos.x} cy={pos.y} r="5" fill="#EF4444" />
                <path d={`M ${pos.x} ${pos.y - 3} L ${pos.x - 3} ${pos.y + 3} L ${pos.x + 3} ${pos.y + 3} Z`} fill="#FFF" transform={`scale(0.8) translate(${pos.x * 0.25}, ${pos.y * 0.25})`} />
              </g>
            );
          })}

          {/* Gates */}
          {gates.map((gate) => {
            const coords = gateCoords[gate.id];
            if (!coords) return null;
            
            const isSelected = selectedEntity?.type === 'gate' && selectedEntity.data.id === gate.id;
            const activeInc = hasIncident(gate.id, true);

            return (
              <StadiumGateGroup
                key={gate.id}
                gate={gate}
                coords={coords}
                isSelected={isSelected}
                activeInc={activeInc}
                occupancyPercent={gate.occupancyPercent}
                onClick={() => setSelectedEntity({ type: 'gate', data: gate })}
              />
            );
          })}
        </svg>

        {/* Floating details overlay on entity click */}
        {selectedEntity && (
          <div className="absolute bottom-3 left-3 right-3 bg-card-bg/95 border border-card-border rounded-lg p-3 text-xs backdrop-blur-md animate-fade-in">
            <div className="flex justify-between items-start mb-1.5">
              <h4 className="font-semibold text-accent-gold text-sm font-scoreboard">
                {selectedEntity.data.name}
              </h4>
              <button 
                onClick={() => setSelectedEntity(null)}
                className="text-foreground/60 hover:text-foreground text-sm font-bold px-1"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-foreground/80">
              <div>
                <span className="block text-foreground/50 text-[10px] uppercase tracking-wide">Live Load</span>
                <span className="font-semibold text-foreground text-sm">
                  {selectedEntity.data.occupancyPercent}% Occupancy
                </span>
                <span className="block mt-1 text-foreground/50 text-[10px] uppercase tracking-wide">Access Route</span>
                <span className="block leading-tight text-[11px] text-foreground/90">
                  {selectedEntity.data.accessibility.split(';')[0]}
                </span>
              </div>
              <div>
                {selectedEntity.type === 'section' ? (
                  <>
                    <span className="block text-foreground/50 text-[10px] uppercase tracking-wide">Restrooms</span>
                    <span className="block leading-tight text-[11px] mb-1">
                      {selectedEntity.data.amenities.restrooms.split(' (')[0]}
                    </span>
                    <span className="block text-foreground/50 text-[10px] uppercase tracking-wide">Concessions</span>
                    <span className="block leading-tight text-[11px]">
                      {selectedEntity.data.amenities.concessions.split(' (')[0]}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block text-foreground/50 text-[10px] uppercase tracking-wide">Transit Connections</span>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {selectedEntity.data.transitConnections.map((t: string, i: number) => (
                        <span key={i} className="bg-stadium-green/40 px-1.5 py-0.5 rounded text-[10px] inline-block w-fit text-accent-gold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {hasIncident(selectedEntity.data.id, selectedEntity.type === 'gate') && (
              <div className="mt-2 bg-red-950/50 border border-red-800/40 rounded p-1.5 flex items-center space-x-1.5 text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold text-[10px] animate-pulse">ACTIVE INCIDENT DISPATCHED IN ZONE</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

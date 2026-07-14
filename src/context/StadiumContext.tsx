"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import venueRaw from '../data/venue.json';
import initialReports from '../data/reports.json';

export interface GateState {
  id: string;
  name: string;
  status: string;
  transitConnections: string[];
  accessibility: string;
  occupancyPercent: number;
  coordinates: { x: number; y: number };
  direction: string;
}

export interface SectionState {
  id: string;
  name: string;
  level: string;
  occupancyPercent: number;
  capacity: number;
  nearestGate: string;
  accessibility: string;
  amenities: {
    restrooms: string;
    concessions: string;
  };
}

export interface Incident {
  id: string;
  timestamp: string;
  text: string;
  category: string;
  status: 'Active' | 'Resolved';
  gateId?: string;
  sectionId?: string;
}

export interface Report {
  id: string;
  timestamp: string;
  source: string;
  text: string;
  status: string;
  category: string;
}

export interface Recommendation {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  alert: string;
  action: string;
  impact: string;
}

interface StadiumContextType {
  gates: GateState[];
  sections: SectionState[];
  incidents: Incident[];
  reports: Report[];
  recommendations: Recommendation[];
  recommendationsLoading: boolean;
  overallOccupancy: number;
  injectIncident: (text: string, category: string, gateId?: string, sectionId?: string) => Promise<void>;
  resolveIncident: (id: string) => Promise<void>;
  fetchRecommendations: (currentGates: GateState[], currentSections: SectionState[], currentIncidents: Incident[]) => Promise<void>;
  addRawReport: (source: string, text: string, category: string) => void;
}

const StadiumContext = createContext<StadiumContextType | undefined>(undefined);

export const StadiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from json structures
  const [gates, setGates] = useState<GateState[]>(() => 
    venueRaw.gates.map(g => ({ ...g, occupancyPercent: g.baseOccupancyPercent }))
  );
  
  const [sections, setSections] = useState<SectionState[]>(() => 
    venueRaw.sections.map(s => ({ ...s, occupancyPercent: s.baseOccupancyPercent }))
  );

  const [incidents, setIncidents] = useState<Incident[]>(() => [
    {
      id: "INC-101",
      timestamp: new Date(Date.now() - 900000).toISOString(), // 15 mins ago
      text: "Gate B turnstile scanner frozen. Backup queue starting to form.",
      category: "Crowd Flow",
      status: "Active",
      gateId: "Gate B"
    },
    {
      id: "INC-102",
      timestamp: new Date(Date.now() - 300000).toISOString(), // 5 mins ago
      text: "Medical team responding to chest pain in Section 224 Row K.",
      category: "Medical",
      status: "Active",
      sectionId: "Sec 216-230"
    }
  ]);

  const [reports, setReports] = useState<Report[]>(initialReports);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState<boolean>(false);
  const [overallOccupancy, setOverallOccupancy] = useState<number>(72); // starts at 72%

  // Function to fetch recommendations from Gemini API
  const fetchRecommendations = useCallback(async (
    currentGates: GateState[],
    currentSections: SectionState[],
    currentIncidents: Incident[]
  ) => {
    setRecommendationsLoading(true);
    try {
      const activeIncidents = currentIncidents.filter(inc => inc.status === 'Active');
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gates: currentGates.map(g => ({ id: g.id, name: g.name, occupancy: g.occupancyPercent })),
          sections: currentSections.map(s => ({ id: s.id, name: s.name, occupancy: s.occupancyPercent })),
          incidents: activeIncidents
        })
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      } else {
        console.error('Failed to generate recommendations');
      }
    } catch (e) {
      console.error('Error fetching recommendations:', e);
    } finally {
      setRecommendationsLoading(false);
    }
  }, []);

  // Add a raw report manually or programmatically
  const addRawReport = useCallback((source: string, text: string, category: string) => {
    const newReport: Report = {
      id: `REP-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      source,
      text,
      status: "Active",
      category
    };
    setReports(prev => [newReport, ...prev]);
    return newReport;
  }, []);

  // Inject incident
  const injectIncident = useCallback(async (text: string, category: string, gateId?: string, sectionId?: string) => {
    const id = `INC-${Math.floor(103 + Math.random() * 897)}`;
    const timestamp = new Date().toISOString();
    const newIncident: Incident = {
      id,
      timestamp,
      text,
      category,
      status: 'Active',
      gateId,
      sectionId
    };

    const updatedIncidents = [newIncident, ...incidents];
    setIncidents(updatedIncidents);

    // Add to raw reports so the briefing summarizer picks it up
    const source = gateId ? `${gateId} Entry` : sectionId ? `Sec ${sectionId}` : "Ops Center";
    addRawReport(source, text, category);

    // Trigger immediate recommendation refresh with the new state
    await fetchRecommendations(gates, sections, updatedIncidents);
  }, [incidents, gates, sections, addRawReport, fetchRecommendations]);

  // Resolve incident
  const resolveIncident = useCallback(async (id: string) => {
    const updatedIncidents = incidents.map(inc => 
      inc.id === id ? { ...inc, status: 'Resolved' as const } : inc
    );
    setIncidents(updatedIncidents);

    // Add resolution to raw reports
    const target = incidents.find(inc => inc.id === id);
    if (target) {
      addRawReport("Ops Control", `RESOLVED: ${target.text}`, target.category);
    }

    // Trigger recommendation refresh
    await fetchRecommendations(gates, sections, updatedIncidents);
  }, [incidents, gates, sections, addRawReport, fetchRecommendations]);

  // Run ticking simulation for gates and sections
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate gate occupancy randomly (+/- 1% to 3%)
      setGates(prevGates => 
        prevGates.map(gate => {
          const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
          const newOccupancy = Math.max(10, Math.min(98, gate.occupancyPercent + delta));
          return { ...gate, occupancyPercent: newOccupancy };
        })
      );

      // Fluctuate section occupancy randomly
      setSections(prevSections =>
        prevSections.map(section => {
          const delta = Math.floor(Math.random() * 3) - 1; // -1 to +1
          const newOccupancy = Math.max(20, Math.min(100, section.occupancyPercent + delta));
          return { ...section, occupancyPercent: newOccupancy };
        })
      );

      // Fluctuate overall stadium occupancy slightly
      setOverallOccupancy(prev => {
        const delta = (Math.random() * 0.4) - 0.15; // slightly upwards trend
        return Math.max(50, Math.min(99, parseFloat((prev + delta).toFixed(2))));
      });

    }, 8000); // ticks every 8 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch initial recommendations on load
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecommendations(gates, sections, incidents);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue = useMemo(() => ({
    gates,
    sections,
    incidents,
    reports,
    recommendations,
    recommendationsLoading,
    overallOccupancy,
    injectIncident,
    resolveIncident,
    fetchRecommendations,
    addRawReport
  }), [
    gates,
    sections,
    incidents,
    reports,
    recommendations,
    recommendationsLoading,
    overallOccupancy,
    injectIncident,
    resolveIncident,
    fetchRecommendations,
    addRawReport
  ]);

  return (
    <StadiumContext.Provider value={contextValue}>
      {children}
    </StadiumContext.Provider>
  );
};

export const useStadium = () => {
  const context = useContext(StadiumContext);
  if (context === undefined) {
    throw new Error('useStadium must be used within a StadiumProvider');
  }
  return context;
};

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CrowdDashboard } from '../../components/CrowdDashboard';
import { useStadium } from '../../context/StadiumContext';

// Mock the context hook
jest.mock('../../context/StadiumContext', () => ({
  useStadium: jest.fn()
}));

describe('CrowdDashboard Component', () => {
  const mockInjectIncident = jest.fn();
  const mockResolveIncident = jest.fn();
  const mockFetchRecommendations = jest.fn();

  const mockGates = [
    { id: "Gate A", name: "North Gate (Gate A)", status: "Active", transitConnections: ["Metro 1"], accessibility: "Ramp", occupancyPercent: 45, coordinates: { x: 50, y: 50 }, direction: "N" },
    { id: "Gate B", name: "Northeast Gate (Gate B)", status: "Active", transitConnections: ["Shuttle"], accessibility: "Level", occupancyPercent: 90, coordinates: { x: 80, y: 80 }, direction: "NE" }
  ];

  const mockSections = [
    { id: "Sec 101-110", name: "Sections 101-110", level: "100 Level", occupancyPercent: 70, capacity: 5500, nearestGate: "Gate A", accessibility: "Level", amenities: { restrooms: "North Restrooms", concessions: "North Food" } }
  ];

  const mockIncidents = [
    { id: "INC-101", timestamp: new Date().toISOString(), text: "Scanner frozen at Gate B.", category: "Crowd Flow", status: "Active" as const, gateId: "Gate B" }
  ];

  const mockRecommendations = [
    { id: "REC-001", priority: "HIGH" as const, alert: "Gate B at 90% load.", action: "Divert shuttle arrivals to Gate A.", impact: "Reduces Gate B queue by 5m." }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    (useStadium as jest.Mock).mockReturnValue({
      gates: mockGates,
      sections: mockSections,
      incidents: mockIncidents,
      recommendations: mockRecommendations,
      recommendationsLoading: false,
      injectIncident: mockInjectIncident,
      resolveIncident: mockResolveIncident,
      fetchRecommendations: mockFetchRecommendations
    });
  });

  test('should render live gate load gauges and current percentages', () => {
    render(<CrowdDashboard />);
    expect(screen.getByText(/LIVE GATE OCCUPANCY/i)).toBeInTheDocument();
    expect(screen.getByText(/North Gate \(Gate A\)/i)).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText(/Northeast Gate \(Gate B\)/i)).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  test('should render active operation alerts and enable resolution', () => {
    render(<CrowdDashboard />);
    expect(screen.getByText(/ACTIVE OPERATION ALERTS/i)).toBeInTheDocument();
    expect(screen.getByText("Scanner frozen at Gate B.")).toBeInTheDocument();
    
    const resolveButton = screen.getByRole('button', { name: /RESOLVE/i });
    fireEvent.click(resolveButton);
    expect(mockResolveIncident).toHaveBeenCalledWith("INC-101");
  });

  test('should render AI operations recommendations', () => {
    render(<CrowdDashboard />);
    expect(screen.getByText(/AI OPS CONTROL ROOM RECOMMENDATIONS/i)).toBeInTheDocument();
    expect(screen.getByText("Gate B at 90% load.")).toBeInTheDocument();
    expect(screen.getByText(/Divert shuttle arrivals to Gate A/i)).toBeInTheDocument();
  });

  test('should trigger instant incident injection templates', () => {
    render(<CrowdDashboard />);
    
    const medicalTemplateButton = screen.getByRole('button', { name: /Medical \(Sec 125\)/i });
    fireEvent.click(medicalTemplateButton);
    
    expect(mockInjectIncident).toHaveBeenCalledWith(
      expect.stringContaining("severe heat exhaustion in Section 125"),
      "Medical",
      undefined,
      "Sec 121-130"
    );
  });

  test('should submit a custom incident form', () => {
    render(<CrowdDashboard />);
    
    const textarea = screen.getByPlaceholderText(/Describe incident/i);
    const submitButton = screen.getByRole('button', { name: /INJECT CUSTOM INCIDENT/i });

    fireEvent.change(textarea, { target: { value: "Turnstile 1 mechanical jam Gate A" } });
    fireEvent.click(submitButton);

    expect(mockInjectIncident).toHaveBeenCalledWith(
      "Turnstile 1 mechanical jam Gate A",
      "Crowd Flow",
      undefined,
      undefined
    );
  });

  test('should show loading state indicator when recommendations are fetching', () => {
    (useStadium as jest.Mock).mockReturnValue({
      gates: mockGates,
      sections: mockSections,
      incidents: mockIncidents,
      recommendations: [],
      recommendationsLoading: true,
      injectIncident: mockInjectIncident,
      resolveIncident: mockResolveIncident,
      fetchRecommendations: mockFetchRecommendations
    });

    render(<CrowdDashboard />);
    expect(screen.getByText(/AI AGENT COGNITIVE LAYER ANALYZING REAL-TIME METRICS/i)).toBeInTheDocument();
  });

  test('should show empty fallback state when there are no recommendations', () => {
    (useStadium as jest.Mock).mockReturnValue({
      gates: mockGates,
      sections: mockSections,
      incidents: mockIncidents,
      recommendations: [],
      recommendationsLoading: false,
      injectIncident: mockInjectIncident,
      resolveIncident: mockResolveIncident,
      fetchRecommendations: mockFetchRecommendations
    });

    render(<CrowdDashboard />);
    expect(screen.getByText(/No active recommendations. Real-time systems balanced./i)).toBeInTheDocument();
  });

  test('should throttle rapid double-clicks on template incident triggers', async () => {
    render(<CrowdDashboard />);
    
    const medicalTemplateButton = screen.getByRole('button', { name: /Medical \(Sec 125\)/i });
    await act(async () => {
      fireEvent.click(medicalTemplateButton);
      fireEvent.click(medicalTemplateButton);
    });

    expect(mockInjectIncident).toHaveBeenCalledTimes(1);
  });

  test('should throttle rapid double-clicks on custom incident triggers', async () => {
    render(<CrowdDashboard />);
    
    const textarea = screen.getByPlaceholderText(/Describe incident/i);
    const submitButton = screen.getByRole('button', { name: /INJECT CUSTOM INCIDENT/i });

    fireEvent.change(textarea, { target: { value: "Water leak in section 105" } });
    await act(async () => {
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
    });

    expect(mockInjectIncident).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IncidentSummarizer } from '../../components/IncidentSummarizer';
import { useStadium } from '../../context/StadiumContext';

// Mock the context hook
jest.mock('../../context/StadiumContext', () => ({
  useStadium: jest.fn()
}));

describe('IncidentSummarizer Component', () => {
  const mockAddRawReport = jest.fn();

  const mockReports = [
    { id: "REP-001", timestamp: new Date().toISOString(), source: "Gate B Entry", text: "Liquids spill. Janitorial dispatched.", status: "Active", category: "Maintenance" }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useStadium as jest.Mock).mockReturnValue({
      reports: mockReports,
      addRawReport: mockAddRawReport
    });
  });

  test('should render raw operations logs feed', () => {
    render(<IncidentSummarizer />);
    expect(screen.getByText(/AI BRIEFING & INCIDENT TRIAGE/i)).toBeInTheDocument();
    expect(screen.getByText(/RAW LOGS FEED/i)).toBeInTheDocument();
    expect(screen.getByText("Liquids spill. Janitorial dispatched.")).toBeInTheDocument();
  });

  test('should add custom simulated radio report', () => {
    render(<IncidentSummarizer />);
    
    const input = screen.getByPlaceholderText(/Simulate volunteer radio report/i);
    const submitButton = screen.getByTitle(/Add radio message/i);

    fireEvent.change(input, { target: { value: "Water leak Section 105" } });
    fireEvent.click(submitButton);

    expect(mockAddRawReport).toHaveBeenCalledWith(
      "Radio Operator",
      "Water leak Section 105",
      "General"
    );
  });

  test('should fetch and render compiled volunteer briefing on success', async () => {
    const mockBriefing = {
      topPriorities: [
        { id: "REP-001", summary: "Spill near Section 112 concourse", action: "Monitor spill zone cleanup" }
      ],
      resolved: [
        { id: "REP-002", summary: "Gate B Turnstile scanner rebooted", status: "Resolved" }
      ],
      watchList: [
        { id: "REP-003", summary: "Water running low Section 218", status: "Stock truck incoming" }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBriefing
    });

    render(<IncidentSummarizer />);
    
    // Initial state: Show empty fallback
    expect(screen.getByText(/NO BRIEFING GENERATED/i)).toBeInTheDocument();

    const generateButton = screen.getByRole('button', { name: /GENERATE BRIEFING/i });
    fireEvent.click(generateButton);

    expect(screen.getByText(/COMPILING.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("COMPILED SHIFT BRIEFING")).toBeInTheDocument();
      expect(screen.getByText(/Spill near Section 112 concourse/i)).toBeInTheDocument();
      expect(screen.getByText(/Gate B Turnstile scanner rebooted/i)).toBeInTheDocument();
      expect(screen.getByText(/Water running low Section 218/i)).toBeInTheDocument();
    });
  });

  test('should display a warning fallback when briefing compilation fails', async () => {
    // Simulating API returning the error warning structure
    const mockErrorBriefing = {
      topPriorities: [
        { id: "WARN-999", summary: "Failed to compile briefing automatically.", action: "Review raw logs manually." }
      ],
      resolved: [],
      watchList: []
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, // The route returns 200 with the warning object
      json: async () => mockErrorBriefing
    });

    render(<IncidentSummarizer />);
    
    const generateButton = screen.getByRole('button', { name: /GENERATE BRIEFING/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to compile briefing automatically/i)).toBeInTheDocument();
      expect(screen.getByText(/Review raw logs manually/i)).toBeInTheDocument();
    });
  });

  test('should throttle rapid double-clicks on compile briefing button', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ topPriorities: [], resolved: [], watchList: [] })
    });

    render(<IncidentSummarizer />);
    
    const generateButton = screen.getByRole('button', { name: /GENERATE BRIEFING/i });
    
    // Click twice rapidly
    fireEvent.click(generateButton);
    fireEvent.click(generateButton);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

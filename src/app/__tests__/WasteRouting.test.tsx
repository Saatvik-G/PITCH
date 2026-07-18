import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WasteRouting } from '../../components/WasteRouting';
import { useStadium, WasteBin, WasteRouteItem } from '../../context/StadiumContext';

// Mock the context hook
jest.mock('../../context/StadiumContext', () => ({
  useStadium: jest.fn()
}));

describe('WasteRouting Component', () => {
  const mockSimulateHalftimeRush = jest.fn();

  const mockWasteBins: WasteBin[] = [
    {
      id: 'bin-001',
      zoneName: 'Concession Plaza A',
      fillLevelPercent: 35,
      type: 'recycling',
      isHighLitterZone: true,
      lastEmptiedTime: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'bin-006',
      zoneName: 'Gate E Outer Perimeter',
      fillLevelPercent: 15,
      type: 'general',
      isHighLitterZone: false,
      lastEmptiedTime: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  const mockRecommendations: WasteRouteItem[] = [
    {
      binId: 'bin-001',
      priority: 'HIGH',
      action: 'Empty recycling bin-001 at Concession Plaza A immediately.',
      estFillRateHour: 45
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    (useStadium as jest.Mock).mockReturnValue({
      wasteBins: mockWasteBins,
      halftimeRushActive: false,
      wasteRecommendations: [],
      wasteRecommendationsLoading: false,
      simulateHalftimeRush: mockSimulateHalftimeRush
    });
  });

  test('should render waste bins data and default empty recommendation state', () => {
    render(<WasteRouting />);

    expect(screen.getByText(/AI SUSTAINABILITY & WASTE ROUTING/i)).toBeInTheDocument();
    expect(screen.getByText(/IOT WEIGH-SENSORED BINS/i)).toBeInTheDocument();
    
    // Check bin details rendering
    expect(screen.getByText('Concession Plaza A')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('Gate E Outer Perimeter')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();

    // Check default empty routing panel
    expect(screen.getByText(/NO ACTIVE ROUTING ALERTS/i)).toBeInTheDocument();
  });

  test('should call simulateHalftimeRush when trigger button is clicked', () => {
    render(<WasteRouting />);

    const triggerButton = screen.getByRole('button', { name: /SIMULATE HALFTIME RUSH/i });
    fireEvent.click(triggerButton);

    expect(mockSimulateHalftimeRush).toHaveBeenCalledTimes(1);
  });

  test('should throttle rapid double-clicks on the halftime rush button', () => {
    render(<WasteRouting />);

    const triggerButton = screen.getByRole('button', { name: /SIMULATE HALFTIME RUSH/i });
    
    // Fire double click rapidly
    fireEvent.click(triggerButton);
    fireEvent.click(triggerButton);

    expect(mockSimulateHalftimeRush).toHaveBeenCalledTimes(1);
  });

  test('should display loading skeleton when recommendations are loading', () => {
    (useStadium as jest.Mock).mockReturnValue({
      wasteBins: mockWasteBins,
      halftimeRushActive: true,
      wasteRecommendations: [],
      wasteRecommendationsLoading: true,
      simulateHalftimeRush: mockSimulateHalftimeRush
    });

    render(<WasteRouting />);
    expect(screen.getByText(/GEMINI OPTIMIZING CLEANUP PATTERNS/i)).toBeInTheDocument();
  });

  test('should render ranked waste recommendations correctly', () => {
    (useStadium as jest.Mock).mockReturnValue({
      wasteBins: mockWasteBins,
      halftimeRushActive: true,
      wasteRecommendations: mockRecommendations,
      wasteRecommendationsLoading: false,
      simulateHalftimeRush: mockSimulateHalftimeRush
    });

    render(<WasteRouting />);

    // Check that recommendations are listed
    expect(screen.getAllByText('Concession Plaza A')[0]).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('Empty recycling bin-001 at Concession Plaza A immediately.')).toBeInTheDocument();
    expect(screen.getByText('+45%/hr')).toBeInTheDocument();
  });

  test('should display fallback empty state when waste recommendations API fails or returns empty list', () => {
    (useStadium as jest.Mock).mockReturnValue({
      wasteBins: mockWasteBins,
      halftimeRushActive: true,
      wasteRecommendations: [],
      wasteRecommendationsLoading: false,
      simulateHalftimeRush: mockSimulateHalftimeRush
    });

    render(<WasteRouting />);
    expect(screen.getByText(/NO ACTIVE ROUTING ALERTS/i)).toBeInTheDocument();
  });
});

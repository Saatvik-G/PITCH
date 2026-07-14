import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransitOptimization } from '../../components/TransitOptimization';
import { useStadium, TransitMode, TransitRecommendation } from '../../context/StadiumContext';

// Mock the context hook
jest.mock('../../context/StadiumContext', () => ({
  useStadium: jest.fn()
}));

describe('TransitOptimization Component', () => {
  const mockSimulateFinalWhistle = jest.fn();

  const mockTransitModes: TransitMode[] = [
    {
      id: 'transit-metro',
      name: 'Metro (Line 1 - North)',
      type: 'metro',
      congestionPercent: 42,
      avgWaitTimeMin: 4,
      status: 'Normal',
      capacity: 1200,
      description: 'High-frequency rail transit serving the northern metropolitan area.',
      associatedGate: 'Gate A'
    },
    {
      id: 'transit-shuttle',
      name: 'East Concourse Shuttle Bus',
      type: 'shuttle',
      congestionPercent: 55,
      avgWaitTimeMin: 12,
      status: 'Normal',
      capacity: 350,
      description: 'Circular shuttle bus linking East parking reservoirs.',
      associatedGate: 'Gate B'
    }
  ];

  const mockRecommendations: TransitRecommendation[] = [
    {
      modeId: 'transit-metro',
      rank: 1,
      reasoning: 'Metro is running stable rail routing.',
      alternateRouteSuggestion: 'Egress Gate A.'
    },
    {
      modeId: 'transit-shuttle',
      rank: 2,
      reasoning: 'Shuttle bus loading time is acceptable.',
      alternateRouteSuggestion: 'Egress Gate B.'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    (useStadium as jest.Mock).mockReturnValue({
      transitModes: mockTransitModes,
      finalWhistleTriggered: false,
      transitRecommendations: [],
      transitRecommendationsLoading: false,
      simulateFinalWhistle: mockSimulateFinalWhistle
    });
  });

  test('should render transit options congestion feed and default empty recommendation state', () => {
    render(<TransitOptimization />);

    expect(screen.getByText(/AI TRANSPORTATION & EGRESS OPTIMIZATION/i)).toBeInTheDocument();
    expect(screen.getByText(/LIVE CONGESTION FEED/i)).toBeInTheDocument();
    
    // Check mode rendering
    expect(screen.getByText('Metro (Line 1 - North)')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('East Concourse Shuttle Bus')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();

    // Check empty recommendations panel
    expect(screen.getByText(/NO ACTIVE TRANSIT RECOMMENDATIONS/i)).toBeInTheDocument();
  });

  test('should call simulateFinalWhistle when trigger button is clicked', () => {
    render(<TransitOptimization />);

    const triggerButton = screen.getByRole('button', { name: /SIMULATE FINAL WHISTLE/i });
    fireEvent.click(triggerButton);

    expect(mockSimulateFinalWhistle).toHaveBeenCalledTimes(1);
  });

  test('should display loading skeleton when AI recommendations are loading', () => {
    (useStadium as jest.Mock).mockReturnValue({
      transitModes: mockTransitModes,
      finalWhistleTriggered: true,
      transitRecommendations: [],
      transitRecommendationsLoading: true,
      simulateFinalWhistle: mockSimulateFinalWhistle
    });

    render(<TransitOptimization />);
    expect(screen.getByText(/GEMINI COMPUTING EGRESS SCHEDULING/i)).toBeInTheDocument();
  });

  test('should render ranked transit recommendations correctly', () => {
    (useStadium as jest.Mock).mockReturnValue({
      transitModes: mockTransitModes,
      finalWhistleTriggered: true,
      transitRecommendations: mockRecommendations,
      transitRecommendationsLoading: false,
      simulateFinalWhistle: mockSimulateFinalWhistle
    });

    render(<TransitOptimization />);

    // Check that recommendations are listed
    expect(screen.getAllByText('Metro (Line 1 - North)')[0]).toBeInTheDocument();
    expect(screen.getByText('Metro is running stable rail routing.')).toBeInTheDocument();
    expect(screen.getByText('Egress Gate A.')).toBeInTheDocument();

    expect(screen.getAllByText('East Concourse Shuttle Bus')[0]).toBeInTheDocument();
    expect(screen.getByText('Shuttle bus loading time is acceptable.')).toBeInTheDocument();
    expect(screen.getByText('Egress Gate B.')).toBeInTheDocument();
  });
});

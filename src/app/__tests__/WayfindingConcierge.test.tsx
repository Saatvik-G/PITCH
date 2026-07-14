import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WayfindingConcierge } from '../../components/WayfindingConcierge';

describe('WayfindingConcierge Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render welcome message and initial layout', () => {
    render(<WayfindingConcierge />);
    expect(screen.getByText(/AI WAYFINDING & CONCIERGE/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready to assist with wayfinding/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask PITCH/i)).toBeInTheDocument();
  });

  test('should switch languages and update suggestion chips', () => {
    render(<WayfindingConcierge />);
    
    // Switch to Spanish
    const esButton = screen.getByText(/^es$/i);
    fireEvent.click(esButton);
    expect(screen.getByPlaceholderText(/Pregunte a PITCH/i)).toBeInTheDocument();
    expect(screen.getByText(/Buscar Sección 125/i)).toBeInTheDocument();
    
    // Switch to French
    const frButton = screen.getByText(/^fr$/i);
    fireEvent.click(frButton);
    expect(screen.getByPlaceholderText(/Demandez à PITCH/i)).toBeInTheDocument();
    expect(screen.getByText(/Trouver Section 125/i)).toBeInTheDocument();
  });

  test('should toggle accessibility mode state', () => {
    render(<WayfindingConcierge />);
    const accButton = screen.getByRole('button', { name: /ACC MODE/i });
    
    // Initial state: not active
    expect(accButton).not.toHaveClass('bg-accent-gold');
    
    // Toggle ON
    fireEvent.click(accButton);
    expect(accButton).toHaveClass('bg-accent-gold');
    
    // Toggle OFF
    fireEvent.click(accButton);
    expect(accButton).not.toHaveClass('bg-accent-gold');
  });

  test('should send a message and render the AI response on success', async () => {
    // Mock successful fetch response
    const mockResponse = {
      answer: "Head straight towards Gate B, Section 112 is on your left.",
      isAccessibleFormatting: false
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<WayfindingConcierge />);
    
    const input = screen.getByPlaceholderText(/Ask PITCH/i);
    const sendButton = screen.getByRole('button', { name: /send/i }); // Send button is styled with an icon, let's find it

    fireEvent.change(input, { target: { value: "Where is Section 112?" } });
    fireEvent.click(sendButton);

    // Verify loading indicator is displayed
    expect(screen.getByText(/PA broadcast transmission loading/i)).toBeInTheDocument();

    // Verify AI response renders
    await waitFor(() => {
      expect(screen.getByText("Head straight towards Gate B, Section 112 is on your left.")).toBeInTheDocument();
    });
  });

  test('should show a graceful fallback message when the API returns a 500 error', async () => {
    // Mock failed fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Gemini model is currently overloaded" })
    });

    render(<WayfindingConcierge />);
    
    const input = screen.getByPlaceholderText(/Ask PITCH/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: "Where is Gate B?" } });
    fireEvent.click(sendButton);

    // Verify UI handles error gracefully
    await waitFor(() => {
      expect(screen.getByText(/SYSTEM ERROR: Gemini model is currently overloaded/i)).toBeInTheDocument();
    });
  });

  test('should show a offline fallback message when fetch throws a network error', async () => {
    // Mock network throw
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network connection lost"));

    render(<WayfindingConcierge />);
    
    const input = screen.getByPlaceholderText(/Ask PITCH/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: "Fast egress route?" } });
    fireEvent.click(sendButton);

    // Verify offline handling
    await waitFor(() => {
      expect(screen.getByText(/SYSTEM OFFLINE: Connection error/i)).toBeInTheDocument();
    });
  });
});

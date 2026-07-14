import '@testing-library/jest-dom';

// Mock window.matchMedia which is often missing in JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock global fetch for API endpoints
global.fetch = jest.fn();

// Mock HTMLElement.prototype.scrollIntoView which is missing in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

import "@testing-library/jest-dom";

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.console.warn = jest.fn();
global.console.error = jest.fn();

global.window.__TAURI_IPC__ = jest.fn();  // Mock __TAURI_IPC__

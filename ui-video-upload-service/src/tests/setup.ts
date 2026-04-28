import '@testing-library/jest-dom';
import { vi, afterAll } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock FileReader
const originalFileReader = globalThis.FileReader;

Object.defineProperty(globalThis, 'FileReader', {
  value: class MockFileReader {
    onload: EventListener | null = null;
    onerror: EventListener | null = null;
    result: string | ArrayBuffer | null = null;
    error: DOMException | null = null;
    readyState: number = 0;

    readAsDataURL() {
      this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      if (this.onload) {
        this.onload({} as Event);
      }
    }

    readAsText() {
      this.result = '';
      if (this.onload) {
        this.onload({} as Event);
      }
    }

    readAsArrayBuffer() {
      this.result = new ArrayBuffer(0);
      if (this.onload) {
        this.onload({} as Event);
      }
    }

    readAsBinaryString() {
      this.result = '';
      if (this.onload) {
        this.onload({} as Event);
      }
    }

    abort() {}
  },
  writable: true,
  configurable: true,
});

// Restore after tests
afterAll(() => {
  Object.defineProperty(globalThis, 'FileReader', {
    value: originalFileReader,
    writable: true,
    configurable: true,
  });
});

import '@testing-library/jest-dom/vitest'
Object.defineProperty(globalThis, "speechSynthesis", {
  value: {
    getVoices: () => [],
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    onvoiceschanged: null,
  },
  writable: true,
});
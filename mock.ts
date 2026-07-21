(globalThis as any).window = {};
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };

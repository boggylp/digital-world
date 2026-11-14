import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { globals: true, include: ['tests/**/*.test.ts'], testTimeout: 1000, hookTimeout: 1000 }
});

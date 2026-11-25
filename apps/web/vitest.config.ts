import { defineConfig } from "vitest/config";

// Plain-node unit tests for Worker modules. Binding-level integration tests will use
// @cloudflare/vitest-pool-workers once D1/DO code lands (Phase 2).
export default defineConfig({
  test: { include: ["workers/**/*.test.ts", "app/**/*.test.ts", "e2e/**/*.test.ts"] },
});

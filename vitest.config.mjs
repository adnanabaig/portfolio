// Unit tests: `npm test`. Plain node environment (the engine, parser, and
// generators are DOM-free; the engine harness stubs the few browser globals
// it needs), so there is no jsdom.
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      // lib/pixel/spriteStore.ts pulls the sheet in with a server-only
      // `require("./spriteData")`, which Next compiles but vite-node cannot
      // (it is a .ts file, and the import is circular). Tests import the sheet
      // the ESM way instead; nothing else changes.
      name: "sprite-store-require",
      transform(code, id) {
        if (!id.replace(/\\/g, "/").endsWith("lib/pixel/spriteStore.ts")) return null;
        return code.replace('require("./spriteData")', 'void import("./spriteData")');
      },
    },
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
  },
});

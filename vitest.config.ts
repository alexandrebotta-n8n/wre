import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "app/**/*.ts"],
      exclude: ["**/*.d.ts", "lib/generated/**", "lib/prisma.ts"],
      // Threshold mínimo para lib/domain (engine de cálculo — core do app).
      // Falha o `npm run test:cov` se cair abaixo. Outras pastas (UI, services
      // Prisma) ainda não cobertas — coverage segue informativo lá.
      thresholds: {
        "lib/domain/**/*.ts": {
          lines: 70,
          branches: 60,
          functions: 70,
          statements: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

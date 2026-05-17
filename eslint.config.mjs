import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",      // relatórios HTML do vitest --coverage
    "next-env.d.ts",
    "prisma/migrations/**",
    "lib/generated/**",
    ".claude/**",
  ]),
  // Regra custom: prisma.<model>.findMany() sem `take` é proibido.
  // Sem upper bound um findMany pode trazer 100k+ linhas e estourar memória.
  // Para exceções legítimas (agregações totais), use:
  // // eslint-disable-next-line no-restricted-syntax
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.property.name='findMany'] > ObjectExpression:first-child:not(:has(Property[key.name='take']))",
          message:
            "findMany sem `take` pode causar OOM. Adicione `take: N` ou justifique com // eslint-disable-next-line no-restricted-syntax.",
        },
        {
          selector:
            "CallExpression[callee.property.name='findMany'][arguments.length=0]",
          message:
            "findMany() sem argumentos retorna a tabela inteira. Use `findMany({ take: N })`.",
        },
      ],
    },
  },
]);

export default eslintConfig;

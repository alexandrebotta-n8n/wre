import { config } from "dotenv";
import { vi } from "vitest";

// Carrega .env.test se existir; cai pra .env caso contrário.
config({ path: ".env.test" });
config({ path: ".env", override: false });

// Mock @/auth para testes unit/api — evita Prisma connect e OAuth.
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

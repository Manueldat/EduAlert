import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const PROJECT = path.resolve(ROOT, "..");
dotenv.config({ path: path.join(PROJECT, ".env"), quiet: true });
export function config() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error("Chạy npm run setup trước (JWT_SECRET >=32 ký tự).");
  return {
    jwt: process.env.JWT_SECRET,
    mlKey: process.env.ML_API_KEY,
    mlUrl: process.env.ML_URL || "http://127.0.0.1:8000",
    timeout: Number(process.env.ML_TIMEOUT_MS || 8000),
    origins: (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(
      ",",
    ),
    secure: process.env.COOKIE_SECURE === "true",
  };
}

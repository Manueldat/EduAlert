import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { root, schema, prisma } from "./db.mjs";
const dbFile = path.join(
  root,
  "backend/prisma",
  `test-${crypto.randomUUID()}.db`,
);
const env = {
  ...process.env,
  DATABASE_URL: `file:${dbFile.replaceAll("\\", "/")}`,
  NODE_ENV: "test",
  EDUALERT_NO_START: "1",
  DEMO_PASSWORD: "EduAlert!2026",
  JWT_SECRET: crypto.randomBytes(32).toString("hex"),
};
const original = process.env.DB_PROVIDER || "sqlite";
let code = 1;
try {
  fs.closeSync(fs.openSync(dbFile, "w"));
  const file = schema("sqlite", "test");
  prisma(["generate", "--schema", file], env);
  prisma(["db", "push", "--schema", file], env);
  const r = spawnSync(
    process.execPath,
    [
      "--test",
      "backend/test/academic.test.mjs",
      "backend/test/integration.test.mjs",
    ],
    { cwd: root, env, stdio: "inherit" },
  );
  code = r.status ?? 1;
} finally {
  for (const suffix of ["", "-journal", "-wal", "-shm"])
    fs.rmSync(dbFile + suffix, { force: true });
  prisma(["generate", "--schema", schema(original)]);
}
process.exitCode = code;

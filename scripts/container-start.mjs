import { spawnSync, spawn } from "node:child_process";
const r = spawnSync(process.execPath, ["scripts/db.mjs", "prepare"], {
  stdio: "inherit",
});
if (r.status !== 0) process.exit(r.status || 1);
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();
if ((await db.user.count()) === 0) {
  const { seed } = await import("../backend/src/seed.mjs");
  await seed(db, { evaluate: true });
}
await db.$disconnect();
const child = spawn(process.execPath, ["backend/src/server.mjs"], {
  stdio: "inherit",
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code || 0));

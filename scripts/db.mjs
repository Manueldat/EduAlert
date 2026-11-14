import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
dotenv.config({ path: path.join(root, ".env"), quiet: true });
export function schema(provider = "sqlite", name = "active") {
  if (!["sqlite", "sqlserver"].includes(provider))
    throw new Error("DB_PROVIDER phải là sqlite hoặc sqlserver");
  let core = fs.readFileSync(
    path.join(root, "backend/prisma/models.prisma"),
    "utf8",
  );
  if (provider === "sqlserver")
    core = core.replace(/^(\s+\w+\s+String\??)(.*)$/gm, (line, type, rest) =>
      rest.includes("LARGE_TEXT")
        ? `${type}${rest.replace("// LARGE_TEXT", "@db.NVarChar(Max)")}`
        : `${type} @db.NVarChar(191)${rest}`,
    );
  else core = core.replaceAll("// LARGE_TEXT", "");
  const dest = path.join(root, `backend/prisma/${name}.prisma`);
  fs.writeFileSync(
    dest,
    `generator client {\n provider = "prisma-client-js"\n}\ndatasource db {\n provider = "${provider}"\n url = env("DATABASE_URL")\n}\n${core}`,
  );
  return dest;
}
export function prisma(args, env = process.env) {
  const r = spawnSync(
    process.execPath,
    [path.join(root, "node_modules/prisma/build/index.js"), ...args],
    { cwd: root, env, stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error(`Prisma thất bại: ${args.join(" ")}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = schema(process.env.DB_PROVIDER || "sqlite");
  if (process.argv[2] === "validate") prisma(["validate", "--schema", file]);
  else {
    if ((process.env.DB_PROVIDER || "sqlite") === "sqlite") {
      const name = (process.env.DATABASE_URL || "file:./dev.db").replace(
        /^file:/,
        "",
      );
      const dbPath = path.resolve(path.dirname(file), name);
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      if (!fs.existsSync(dbPath)) fs.closeSync(fs.openSync(dbPath, "w"));
    }
    prisma(["generate", "--schema", file]);
    prisma(["db", "push", "--schema", file]);
  }
}

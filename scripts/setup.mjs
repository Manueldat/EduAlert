import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] || "sqlite";
if (!["sqlite", "sqlserver"].includes(mode))
  throw new Error("Dùng: npm run setup -- sqlite hoặc sqlserver");
const dest = path.join(root, ".env");
if (fs.existsSync(dest)) {
  console.log(
    ".env đã có; không ghi đè. Sửa DB_PROVIDER và DATABASE_URL nếu đổi database.",
  );
  process.exit(0);
}
const secret = () => crypto.randomBytes(32).toString("hex");
const sa = "EduDemo_" + crypto.randomBytes(12).toString("hex") + "!";
fs.writeFileSync(
  dest,
  `DB_PROVIDER=${mode}\nDATABASE_URL="${mode === "sqlite" ? "file:./dev.db" : `sqlserver://localhost:1433;database=edualert;user=sa;password=${sa};encrypt=true;trustServerCertificate=true`}"
JWT_SECRET=${secret()}
ML_API_KEY=${secret()}
ML_URL=http://127.0.0.1:8000
ML_TIMEOUT_MS=8000
PORT=3000
HOST=127.0.0.1
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000
COOKIE_SECURE=false
MSSQL_SA_PASSWORD=${sa}
DEMO_PASSWORD=EduAlert!2026
`,
);
console.log("Đã tạo .env với khóa ngẫu nhiên. Không commit .env.");

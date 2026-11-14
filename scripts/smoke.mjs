// Uses a fresh synthetic student; keeps the audit trail. Never run on real student data.
import "../backend/src/config.mjs";
import assert from "node:assert/strict";
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
let cookie = "";
async function call(p, method = "GET", data) {
  const r = await fetch(base + "/api" + p, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: method === "GET" ? undefined : JSON.stringify(data || {}),
  });
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  const j = await r.json();
  assert(r.ok, `${r.status} ${JSON.stringify(j)}`);
  return j;
}
await call("/auth/login", "POST", {
  email: "admin@edualert.local",
  password: process.env.DEMO_PASSWORD || "EduAlert!2026",
});
const catalog = await call("/catalog");
const student = await call("/students", "POST", {
  code: `TEST${Date.now()}`,
  name: "Sinh viên kiểm thử tự động",
  classId: catalog.classes[0].id,
  entryOrdinal: 1,
  status: "ACTIVE",
  admissionScore: null,
});
const result = await call(`/students/${student.id}/semester`, "PUT", {
  termId: catalog.terms[0].id,
  finalized: true,
  grades: catalog.courses
    .slice(0, 6)
    .map((c) => ({ courseId: c.id, score: 1.0 })),
});
assert.equal(result.mlStatus, "OK");
assert.equal(result.payload.ml.dataType, "SYNTHETIC");
assert(result.probability > 0 && result.probability < 1);
const direct = await fetch(
  (process.env.ML_URL || "http://127.0.0.1:8000") + "/predict",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ML-Key": process.env.ML_API_KEY,
    },
    body: JSON.stringify({ features: result.payload.academic.features }),
  },
);
assert(direct.ok);
assert(
  Math.abs((await direct.json()).probability - result.probability) < 1e-12,
);
const second = await call(`/students/${student.id}/assess`, "POST", {});
assert.equal(second.id, result.id);
const detail = await call(`/students/${student.id}`);
assert(detail.alerts.length === 1);
await call(`/alerts/${detail.alerts[0].id}/notes`, "POST", {
  body: "Smoke test: đã xác minh tích hợp Node, DB, FastAPI và mô hình.",
  workflow: "IN_PROGRESS",
});
const after = await call(`/students/${student.id}`);
assert(after.alerts[0].notes.length === 1);
await call("/auth/logout", "POST");
console.log(
  JSON.stringify(
    {
      result: "PASS",
      studentCode: student.code,
      modelVersion: result.modelVersion,
      probability: result.probability,
      tests: [
        "real ML API parity",
        "persistent prediction",
        "deduplication",
        "advising note",
        "logout",
      ],
    },
    null,
    2,
  ),
);

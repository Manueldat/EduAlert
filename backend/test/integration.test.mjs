import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { io as client } from "socket.io-client";
import { PrismaClient } from "@prisma/client";
import { seed } from "../src/seed.mjs";
import { config } from "../src/config.mjs";
import { startServer } from "../src/server.mjs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
test("API + Prisma: permissions, validation, persistent alerts, realtime, ML fallback", async (t) => {
  const db = new PrismaClient();
  await seed(db);
  let unavailable = false;
  const predict = async () =>
    unavailable
      ? { status: "UNAVAILABLE", probability: null, message: "test outage" }
      : {
          status: "OK",
          level: "YELLOW",
          probability: 0.4,
          modelVersion: "test-v1",
          policyVersion: "demo-v1",
          featureSchema: "academic-v1",
          explanation: [],
        };
  const run = startServer(db, config(), { port: 0, predict });
  await new Promise((r) =>
    run.server.listening ? r() : run.server.once("listening", r),
  );
  const base = `http://127.0.0.1:${run.server.address().port}`,
    admin = request.agent(base),
    a = request.agent(base),
    b = request.agent(base);
  let sa, sb;
  try {
    const login = async (agent, email) => {
      const r = await agent
        .post("/api/auth/login")
        .send({ email, password: "EduAlert!2026" });
      assert.equal(r.status, 200, r.text);
      return r.headers["set-cookie"][0].split(";")[0];
    };
    await login(admin, "admin@edualert.local");
    const cookieA = await login(a, "cvht.a@edualert.local"),
      cookieB = await login(b, "cvht.b@edualert.local");
    await t.test(
      "API requires login; class and admin scope enforced",
      async () => {
        assert.equal((await request(base).get("/api/students")).status, 401);
        assert.equal((await a.get("/api/students/s17")).status, 404);
        assert.equal((await b.get("/api/students/s1")).status, 404);
        assert.equal((await a.post("/api/admin/users").send({})).status, 403);
        assert.equal(
          (
            await admin
              .post("/api/assess-all")
              .set("Origin", "https://untrusted.invalid")
              .send({})
          ).status,
          403,
        );
      },
    );
    await t.test(
      "Reject duplicate courses and finalized missing marks",
      async () => {
        for (const grades of [
          [
            { courseId: "c1", score: 2 },
            { courseId: "c1", score: 3 },
          ],
          [{ courseId: "c1", score: null }],
        ]) {
          const r = await admin
            .put("/api/students/s1/semester")
            .send({ termId: "term-2", finalized: true, grades });
          assert.equal(r.status, 400, r.text);
        }
      },
    );
    await t.test(
      "Idempotent assessment and advisor note persist independently",
      async () => {
        const first = await a.post("/api/students/s1/assess").send({});
        assert.equal(first.status, 200, first.text);
        const second = await a.post("/api/students/s1/assess").send({});
        assert.equal(first.body.id, second.body.id);
        const alerts = (await a.get("/api/alerts")).body;
        assert.equal(alerts.length, 1);
        assert.equal((await a.get("/api/alerts?q=DEMO001")).body.length, 1);
        assert.equal(
          (await a.get("/api/alerts?q=does-not-exist")).body.length,
          0,
        );
        assert.equal((await b.get("/api/alerts?q=DEMO001")).body.length, 0);
        assert.equal(
          (
            await b
              .post(`/api/alerts/${alerts[0].id}/notes`)
              .send({ body: "not allowed", workflow: "RESOLVED" })
          ).status,
          404,
        );
        assert.equal(
          (
            await a.post(`/api/alerts/${alerts[0].id}/notes`).send({
              body: "Đã tư vấn, hẹn theo dõi ở kỳ tiếp theo.",
              workflow: "RESOLVED",
            })
          ).status,
          201,
        );
        const detail = (await a.get("/api/students/s1")).body;
        assert.equal(detail.alerts[0].workflow, "RESOLVED");
        assert.equal(detail.alerts[0].active, true);
        assert.equal(detail.alerts[0].notes.length, 1);
      },
    );
    await t.test(
      "Socket authenticates, isolates classes and expires on logout",
      async () => {
        sa = client(base, {
          extraHeaders: { Cookie: cookieA },
          transports: ["websocket"],
          reconnection: false,
        });
        sb = client(base, {
          extraHeaders: { Cookie: cookieB },
          transports: ["websocket"],
          reconnection: false,
        });
        await Promise.all(
          [sa, sb].map(
            (s) =>
              new Promise((resolve, reject) => {
                const timer = setTimeout(
                  () => reject(Error("socket timeout")),
                  4000,
                );
                s.on("connect", () => {
                  clearTimeout(timer);
                  resolve();
                });
                s.on("connect_error", reject);
              }),
          ),
        );
        let eventsA = 0,
          eventsB = 0;
        sa.on("academic:update", () => eventsA++);
        sb.on("academic:update", () => eventsB++);
        await a.post("/api/students/s1/assess").send({});
        await wait(120);
        assert.equal(eventsA, 1);
        assert.equal(eventsB, 0);
        await a.post("/api/auth/logout").send({});
        await wait(100);
        assert.equal(sa.connected, false);
        assert.equal(
          (await request(base).get("/api/auth/me").set("Cookie", cookieA))
            .status,
          401,
        );
      },
    );
    await t.test(
      "ML outage creates no fake zero and rule-based evaluation survives",
      async () => {
        unavailable = true;
        const r = await admin.post("/api/students/s4/assess").send({});
        assert.equal(r.status, 200, r.text);
        assert.equal(r.body.probability, null);
        assert.equal(r.body.mlStatus, "UNAVAILABLE");
        assert.notEqual(r.body.priority, "GREEN");
      },
    );
    await t.test(
      "Recovery after an outage becomes current without duplicate alerts",
      async () => {
        unavailable = false;
        const before = await admin.post("/api/students/s1/assess").send({});
        assert.equal(before.body.mlStatus, "OK");
        unavailable = true;
        await admin.post("/api/students/s1/assess").send({});
        unavailable = false;
        const recovered = await admin.post("/api/students/s1/assess").send({});
        assert.equal(recovered.status, 200, recovered.text);
        assert.notEqual(recovered.body.id, before.body.id);
        const detail = (await admin.get("/api/students/s1")).body;
        assert.equal(detail.assessment.id, recovered.body.id);
        assert.equal(detail.assessment.mlStatus, "OK");
        assert.equal(detail.alerts.length, 1);
        assert.equal(detail.alerts[0].notes.length, 1);
        const repeat = await admin.post("/api/students/s1/assess").send({});
        assert.equal(repeat.body.id, recovered.body.id);
      },
    );
    await t.test(
      "Saving grades increments revision, writes audit and reevaluates",
      async () => {
        const r = await admin.put("/api/students/s4/semester").send({
          termId: "term-2",
          finalized: true,
          grades: [{ courseId: "c7", score: 1 }],
        });
        assert.equal(r.status, 200, r.text);
        assert.equal(r.body.revision, 2);
        const d = (await admin.get("/api/students/s4")).body;
        assert.equal(d.student.revision, 2);
        assert.equal(d.assessment.stale, false);
        assert(
          (await db.audit.count({ where: { action: "SAVE_SEMESTER" } })) > 0,
        );
      },
    );
  } finally {
    sa?.close();
    sb?.close();
    await new Promise((r) => run.io.close(r));
    await db.$disconnect();
  }
});

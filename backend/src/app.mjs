import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { PROJECT } from "./config.mjs";
import { calculate, policy } from "./academic.mjs";
import { studentInclude, assessmentService, mlClient } from "./assessment.mjs";
export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
});
export async function authenticate(db, token, cfg) {
  try {
    const claim = jwt.verify(token, cfg.jwt, { algorithms: ["HS256"] });
    const session = await db.session.findUnique({
      where: { id: claim.jti },
      include: { user: true },
    });
    if (
      !session ||
      session.expiresAt < new Date() ||
      session.userId !== claim.sub
    )
      return null;
    return { user: session.user, session };
  } catch {
    return null;
  }
}
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const str = z.string().trim().min(1).max(120);
const semesterSchema = z.object({
  termId: str,
  finalized: z.boolean(),
  paused: z.boolean().default(false),
  officialWarning: z.boolean().default(false),
  grades: z
    .array(
      z.object({ courseId: str, score: z.number().min(0).max(4).nullable() }),
    )
    .max(20),
});
export function createApp(
  db,
  cfg,
  { predict = mlClient(cfg), notify = () => {}, disconnect = () => {} } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'"],
          "connect-src": ["'self'", "ws:", "wss:"],
          "img-src": ["'self'", "data:"],
          "style-src": ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use("/api", (req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      !cfg.origins.includes(req.headers.origin)
    )
      return res.status(403).json({ error: "Nguồn yêu cầu không được phép" });
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !req.is("application/json")
    )
      return res.status(415).json({ error: "Yêu cầu application/json" });
    next();
  });
  app.get("/api/health", async (req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ok", policyVersion: policy.version });
  });
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    skip: () => process.env.NODE_ENV === "test",
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) =>
      res
        .status(429)
        .json({ error: "Quá nhiều lần đăng nhập. Hãy thử lại sau." }),
  });
  app.post("/api/auth/login", limiter, async (req, res) => {
    const { email, password } = z
      .object({
        email: z.string().email().max(191),
        password: z.string().min(1).max(200),
      })
      .parse(req.body);
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      fail(401, "Email hoặc mật khẩu không đúng");
    const expiresAt = new Date(Date.now() + 8 * 3600 * 1000),
      id = crypto.randomUUID();
    await db.session.create({ data: { id, userId: user.id, expiresAt } });
    const token = jwt.sign({ sub: user.id, jti: id }, cfg.jwt, {
      algorithm: "HS256",
      expiresIn: "8h",
    });
    res.cookie("edualert", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: cfg.secure,
      maxAge: 8 * 3600 * 1000,
      path: "/",
    });
    res.json(publicUser(user));
  });
  app.use("/api", async (req, res, next) => {
    const a = await authenticate(db, req.cookies.edualert, cfg);
    if (!a) return res.status(401).json({ error: "Vui lòng đăng nhập" });
    req.user = a.user;
    req.session = a.session;
    next();
  });
  app.get("/api/auth/me", (req, res) => res.json(publicUser(req.user)));
  app.post("/api/auth/logout", async (req, res) => {
    await db.session.delete({ where: { id: req.session.id } });
    disconnect(req.session.id);
    res.clearCookie("edualert", { path: "/" });
    res.json({ ok: true });
  });
  const admin = (req, res, next) => {
    if (req.user.role !== "ADMIN")
      return res
        .status(403)
        .json({ error: "Chỉ quản trị viên được thực hiện" });
    next();
  };
  const scope = (user) =>
    user.role === "ADMIN" ? {} : { advisingClass: { advisorId: user.id } };
  const studentAccess = async (req) => {
    const s = await db.student.findFirst({
      where: { id: req.params.id, ...scope(req.user) },
      include: studentInclude,
    });
    if (!s) fail(404, "Không tìm thấy sinh viên trong phạm vi phụ trách");
    return s;
  };
  const evaluate = assessmentService(db, predict, notify);
  app.get("/api/catalog", async (req, res) => {
    const [classes, programs, terms, courses, advisors] = await Promise.all([
      db.advisingClass.findMany({
        where: req.user.role === "ADMIN" ? {} : { advisorId: req.user.id },
        include: {
          program: true,
          advisor: { select: { id: true, name: true } },
        },
      }),
      db.program.findMany(),
      db.term.findMany({ orderBy: { ordinal: "asc" } }),
      db.course.findMany({ orderBy: { code: "asc" } }),
      req.user.role === "ADMIN"
        ? db.user.findMany({
            where: { role: "ADVISOR" },
            select: { id: true, name: true, email: true },
          })
        : [],
    ]);
    res.json({ classes, programs, terms, courses, advisors, policy });
  });
  function summary(s) {
    const a = s.assessments[0];
    const fresh = a && a.revision === s.revision;
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      classId: s.classId,
      className: s.advisingClass.name,
      status: s.status,
      priority: fresh ? a.priority : "UNKNOWN",
      stale: !fresh,
      probability: fresh ? a.probability : null,
      mlStatus: fresh ? a.mlStatus : "PENDING",
      updatedAt: a?.createdAt,
      gpa: fresh ? JSON.parse(a.payload).academic.latest?.gpa : null,
      gpa: fresh ? JSON.parse(a.payload).academic.latest?.gpa : null,
cpa: fresh ? JSON.parse(a.payload).academic.latest?.cpa : null,
    };
  }
  const list = async (user) =>
    (
      await db.student.findMany({
        where: scope(user),
        include: {
          advisingClass: true,
          assessments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { code: "asc" },
      })
    ).map(summary);
  app.get("/api/dashboard", async (req, res) => {
    const students = await list(req.user),
      counts = { GREEN: 0, YELLOW: 0, RED: 0, UNKNOWN: 0 };
    students.forEach((s) => counts[s.priority]++);
    const bins = [
      { name: "< 1.0", count: 0 },
      { name: "1.0–1.99", count: 0 },
      { name: "2.0–2.99", count: 0 },
      { name: "3.0–4.0", count: 0 },
    ];
    students
      .filter((s) => s.gpa != null)
      .forEach((s) => bins[Math.min(3, Math.floor(s.gpa))].count++);
    res.json({
      total: students.length,
      counts,
      bins,
      students: students
        .filter((s) => ["RED", "YELLOW"].includes(s.priority))
        .sort(
          (a, b) =>
            (a.priority === "RED" ? 0 : 1) - (b.priority === "RED" ? 0 : 1),
        )
        .slice(0, 8),
    });
  });
  app.get("/api/students", async (req, res) => {
    let students = await list(req.user);
    const q = String(req.query.q || "").toLowerCase();
    students = students.filter(
      (s) =>
        (!q || `${s.code} ${s.name}`.toLowerCase().includes(q)) &&
        (!req.query.classId || s.classId === req.query.classId) &&
        (!req.query.priority || s.priority === req.query.priority),
    );
    const page = Math.max(1, Number(req.query.page) || 1),
      pageSize = 10;
    res.json({
      items: students.slice((page - 1) * pageSize, page * pageSize),
      total: students.length,
      page,
      pageSize,
    });
  });
  app.get("/api/students/:id", async (req, res) => {
    const student = await studentAccess(req);
    const [courses, history, alerts] = await Promise.all([
      db.course.findMany(),
      db.assessment.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      db.alert.findMany({
        where: { studentId: student.id },
        include: {
          notes: {
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { termOrdinal: "desc" },
      }),
    ]);
    res.json({
      student,
      academic: calculate(student, courses),
      assessment: history[0]
        ? {
            ...history[0],
            payload: JSON.parse(history[0].payload),
            stale: history[0].revision !== student.revision,
          }
        : null,
      history: history.map(({ payload, ...a }) => a),
      alerts,
    });
  });
  const studentBody = z.object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{3,30}$/),
    name: str,
    classId: str,
    status: z
      .enum(["ACTIVE", "PAUSED", "GRADUATED", "WITHDRAWN"])
      .default("ACTIVE"),
    entryOrdinal: z.number().int().min(1).max(100),
    admissionScore: z.number().min(0).max(30).nullable().default(null),
  });
  const validClass = async (data) => {
    if (!(await db.advisingClass.findUnique({ where: { id: data.classId } })))
      fail(400, "Lớp không tồn tại");
  };
  app.post("/api/students", admin, async (req, res) => {
    const d = studentBody.parse(req.body);
    await validClass(d);
    const s = await db.student.create({ data: d });
    res.status(201).json(s);
  });
  app.put("/api/students/:id", admin, async (req, res) => {
    const s = await studentAccess(req),
      d = studentBody.parse(req.body);
    await validClass(d);
    if (s.semesters.some((x) => x.term.ordinal < d.entryOrdinal))
      fail(400, "Kỳ nhập học phải trước hoặc bằng các kỳ đã có");
    await db.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: s.id },
        data: { ...d, revision: { increment: 1 } },
      });
      await tx.audit.create({
        data: {
          actorId: req.user.id,
          action: "UPDATE_STUDENT",
          subjectId: s.id,
          details: JSON.stringify({
            before: {
              code: s.code,
              name: s.name,
              classId: s.classId,
              status: s.status,
            },
            after: d,
          }),
        },
      });
    });
    res.json(await evaluate(s.id, req.user.id));
  });
  app.put("/api/students/:id/semester", admin, async (req, res) => {
    const s = await studentAccess(req),
      d = semesterSchema.parse(req.body);
    const term = await db.term.findUnique({ where: { id: d.termId } });
    if (!term || term.ordinal < s.entryOrdinal)
      fail(400, "Học kỳ không hợp lệ");
    if (new Set(d.grades.map((g) => g.courseId)).size !== d.grades.length)
      fail(400, "Môn bị trùng trong cùng học kỳ");
    if (d.paused && (d.grades.length || d.officialWarning))
      fail(400, "Kỳ bảo lưu không có điểm hoặc cảnh cáo");
    if (
      d.finalized &&
      !d.paused &&
      (!d.grades.length || d.grades.some((g) => g.score === null))
    )
      fail(400, "Chốt học kỳ cần đủ điểm");
    const courses = await db.course.findMany({
      where: { id: { in: d.grades.map((g) => g.courseId) } },
    });
    if (courses.length !== d.grades.length) fail(400, "Môn học không tồn tại");
    if (courses.reduce((n, c) => n + c.credits, 0) > policy.maxCreditsPerTerm)
      fail(400, "Vượt 40 tín chỉ/kỳ theo giới hạn demo");
    await db.$transaction(async (tx) => {
      const old = await tx.semester.findUnique({
        where: { studentId_termId: { studentId: s.id, termId: d.termId } },
        include: { grades: true },
      });
      const sem = await tx.semester.upsert({
        where: { studentId_termId: { studentId: s.id, termId: d.termId } },
        create: {
          studentId: s.id,
          termId: d.termId,
          finalized: d.finalized,
          paused: d.paused,
          officialWarning: d.officialWarning,
        },
        update: {
          finalized: d.finalized,
          paused: d.paused,
          officialWarning: d.officialWarning,
        },
      });
      await tx.grade.deleteMany({ where: { semesterId: sem.id } });
      for (const g of d.grades)
        await tx.grade.create({ data: { ...g, semesterId: sem.id } });
      await tx.student.update({
        where: { id: s.id },
        data: { revision: { increment: 1 } },
      });
      await tx.audit.create({
        data: {
          actorId: req.user.id,
          action: "SAVE_SEMESTER",
          subjectId: s.id,
          details: JSON.stringify({ before: old, after: d }),
        },
      });
    });
    res.json(await evaluate(s.id, req.user.id));
  });
  app.post("/api/students/:id/assess", async (req, res) => {
    await studentAccess(req);
    res.json(await evaluate(req.params.id, req.user.id));
  });
  app.post("/api/assess-all", admin, async (req, res) => {
    const students = await db.student.findMany({ select: { id: true } });
    const results = [];
    for (const s of students) {
      try {
        const a = await evaluate(s.id, req.user.id);
        results.push({ id: s.id, status: a.mlStatus });
      } catch (e) {
        results.push({ id: s.id, error: e.message });
      }
    }
    res.json({ results });
  });
  app.get("/api/alerts", async (req, res) => {
    const where = { student: scope(req.user) };
    if (["NEW", "IN_PROGRESS", "RESOLVED"].includes(req.query.workflow))
      where.workflow = req.query.workflow;
    if (["RED", "YELLOW"].includes(req.query.severity))
      where.severity = req.query.severity;
    const alerts = await db.alert.findMany({
      where,
      include: {
        student: { include: { advisingClass: true } },
        notes: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    const q = String(req.query.q || "")
      .trim()
      .toLocaleLowerCase("vi");
    res.json(
      alerts.filter(
        (a) =>
          !q ||
          `${a.student.code} ${a.student.name} ${a.student.advisingClass.name}`
            .toLocaleLowerCase("vi")
            .includes(q),
      ),
    );
  });
  app.post("/api/alerts/:alertId/notes", async (req, res) => {
    const alert = await db.alert.findFirst({
      where: { id: req.params.alertId, student: scope(req.user) },
    });
    if (!alert) fail(404, "Không tìm thấy cảnh báo");
    const d = z
      .object({
        body: z.string().trim().min(3).max(2000),
        workflow: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]),
      })
      .parse(req.body);
    const note = await db.$transaction(async (tx) => {
      const n = await tx.note.create({
        data: { ...d, alertId: alert.id, authorId: req.user.id },
      });
      await tx.alert.update({
        where: { id: alert.id },
        data: { workflow: d.workflow },
      });
      return n;
    });
    res.status(201).json(note);
  });
  app.post("/api/admin/users", admin, async (req, res) => {
    const d = z
      .object({
        name: str,
        email: z.string().email().max(191),
        password: z.string().min(10).max(100),
      })
      .parse(req.body);
    const u = await db.user.create({
      data: {
        name: d.name,
        email: d.email.toLowerCase(),
        passwordHash: await bcrypt.hash(d.password, 12),
        role: "ADVISOR",
      },
    });
    res.status(201).json(publicUser(u));
  });
  app.post("/api/admin/classes", admin, async (req, res) => {
    const d = z
      .object({ name: str, programId: str, advisorId: str })
      .parse(req.body);
    if (
      !(await db.user.findFirst({
        where: { id: d.advisorId, role: "ADVISOR" },
      })) ||
      !(await db.program.findUnique({ where: { id: d.programId } }))
    )
      fail(400, "CVHT hoặc chương trình không hợp lệ");
    res.status(201).json(await db.advisingClass.create({ data: d }));
  });
  app.patch("/api/admin/classes/:id", admin, async (req, res) => {
    const { advisorId } = z.object({ advisorId: str }).parse(req.body);
    if (
      !(await db.user.findFirst({ where: { id: advisorId, role: "ADVISOR" } }))
    )
      fail(400, "CVHT không hợp lệ");
    res.json(
      await db.advisingClass.update({
        where: { id: req.params.id },
        data: { advisorId },
      }),
    );
  });
  app.post("/api/admin/terms", admin, async (req, res) =>
    res.status(201).json(
      await db.term.create({
        data: z
          .object({ name: str, ordinal: z.number().int().min(1).max(100) })
          .parse(req.body),
      }),
    ),
  );
  app.post("/api/admin/programs", admin, async (req, res) =>
    res.status(201).json(
      await db.program.create({
        data: z
          .object({
            name: str,
            totalCredits: z.number().int().min(1).max(300),
            creditsPerTerm: z.number().int().min(1).max(40),
          })
          .parse(req.body),
      }),
    ),
  );
  app.post("/api/admin/courses", admin, async (req, res) => {
    const d = z
      .object({
        code: str,
        name: str,
        credits: z.number().int().min(1).max(15),
        prerequisiteId: str.nullable().default(null),
      })
      .parse(req.body);
    if (
      d.prerequisiteId &&
      !(await db.course.findUnique({ where: { id: d.prerequisiteId } }))
    )
      fail(400, "Môn tiên quyết không tồn tại");
    res.status(201).json(await db.course.create({ data: d }));
  });
  app.get("/api/model", async (req, res) => {
    try {
      const r = await fetch(`${cfg.mlUrl}/model-info`, {
        headers: { "X-ML-Key": cfg.mlKey },
        signal: AbortSignal.timeout(3000),
      });
      if (!r.ok) throw Error();
      res.json(await r.json());
    } catch {
      res.status(503).json({
        error: "ML chưa sẵn sàng; hãy train mô hình và chạy FastAPI.",
      });
    }
  });
  app.get("/api/admin/audit", admin, async (req, res) =>
    res.json(
      await db.audit.findMany({ take: 100, orderBy: { createdAt: "desc" } }),
    ),
  );
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API không tồn tại" }),
  );
  const dist = path.join(PROJECT, "frontend/dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*splat}", (req, res) =>
      res.sendFile(path.join(dist, "index.html")),
    );
  }
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError)
      return res.status(400).json({
        error: err.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    if (err.code === "P2002")
      return res
        .status(409)
        .json({ error: "Dữ liệu đã tồn tại (mã, email hoặc học kỳ trùng)" });
    if (err.code === "P2025")
      return res.status(404).json({ error: "Không tìm thấy dữ liệu" });
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ error: "JSON không hợp lệ" });
    if (!err.status) console.error(err);
    res.status(err.status || 500).json({
      error: err.status ? err.message : "Lỗi hệ thống. Xem log backend.",
    });
  });
  return { app, evaluate };
}

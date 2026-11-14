import "./config.mjs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { config } from "./config.mjs";
import { assessmentService, mlClient } from "./assessment.mjs";
export async function seed(db, { evaluate = false } = {}) {
  if (await db.user.count())
    throw new Error("Database không rỗng; seed không ghi đè dữ liệu đã có.");
  const hash = await bcrypt.hash(
    process.env.DEMO_PASSWORD || "EduAlert!2026",
    12,
  );
  for (const u of [
    {
      id: "admin",
      email: "admin@edualert.local",
      name: "Quản trị viên",
      role: "ADMIN",
    },
    {
      id: "advisor-a",
      email: "cvht.a@edualert.local",
      name: "Cố vấn A",
      role: "ADVISOR",
    },
    {
      id: "advisor-b",
      email: "cvht.b@edualert.local",
      name: "Cố vấn B",
      role: "ADVISOR",
    },
  ])
    await db.user.create({ data: { ...u, passwordHash: hash } });
  await db.program.create({
    data: {
      id: "cntt",
      name: "Công nghệ thông tin",
      totalCredits: 120,
      creditsPerTerm: 18,
    },
  });
  for (const [id, name, advisorId] of [
    ["class-a", "CNTT 24A", "advisor-a"],
    ["class-b", "CNTT 24B", "advisor-b"],
  ])
    await db.advisingClass.create({
      data: { id, name, advisorId, programId: "cntt" },
    });
  for (let i = 1; i <= 6; i++)
    await db.term.create({
      data: { id: `term-${i}`, name: `Học kỳ ${i}`, ordinal: i },
    });
  const names = [
    "Lập trình cơ bản",
    "Toán rời rạc",
    "Cơ sở dữ liệu",
    "Cấu trúc dữ liệu",
    "Lập trình hướng đối tượng",
    "Tiếng Anh 1",
    "Phát triển Web",
    "Hệ quản trị CSDL",
    "Mạng máy tính",
    "Xác suất thống kê",
    "Phân tích hệ thống",
    "Tiếng Anh 2",
    "Công nghệ lập trình hiện đại",
    "Trí tuệ nhân tạo",
    "Kiểm thử phần mềm",
    "Công nghệ phần mềm",
    "Điện toán đám mây",
    "Đồ án cơ sở",
  ];
  for (let i = 0; i < 18; i++)
    await db.course.create({
      data: {
        id: `c${i + 1}`,
        code: `IT${String(i + 1).padStart(3, "0")}`,
        name: names[i],
        credits: 3,
        prerequisiteId: i >= 6 ? `c${i - 5}` : null,
      },
    });
  const surnames = [
    "Nguyễn Hoàng An",
  "Trần Thanh Bình",
  "Lê Ngọc Chi",
  "Phạm Tiến Dũng",
  "Hoàng Thu Hà",
  "Huỳnh Quang Huy",
  "Phan Quốc Khánh",
  "Vũ Ngọc Lan",
  "Đặng Thùy Linh",
  "Bùi Nhật Minh",
  "Đỗ Thành Nam",
  "Hồ Bảo Ngọc",
  "Ngô Hữu Phúc",
  "Dương Mai Phương",
  "Lý Minh Quân",
  "Trịnh Như Quỳnh",
  "Nguyễn Thanh Sơn",
  "Trần Phương Thảo",
  "Lê Thu Trang",
  "Phạm Đức Trí",
  "Hoàng Anh Tú",
  "Huỳnh Thảo Uyên",
  "Phan Khánh Vân",
  "Vũ Hải Yến",
  ];
  for (let i = 0; i < studentNames.length; i++) {
  const student = await db.student.create({
    data: {
      id: `s${i + 1}`,
      code: `DEMO${String(i + 1).padStart(3, "0")}`,
      name: studentNames[i],
      classId: i < 16 ? "class-a" : "class-b",
      entryOrdinal: 1,
      admissionScore: 18 + (i % 10),
    },
  });
    for (let t = 1; t <= 2; t++) {
      const sem = await db.semester.create({
        data: {
          studentId: student.id,
          termId: `term-${t}`,
          finalized: true,
          officialWarning: i % 7 === 0 && t === 1,
        },
      });
      for (let j = 0; j < 6; j++) {
        const base =
          i % 5 === 0
            ? t === 1
              ? 2.3
              : 0.7
            : i % 5 === 1
              ? t === 1
                ? 3.1
                : 2
              : i % 5 === 2
                ? 1.8
                : 3.0;
        const score = Math.max(
          0,
          Math.min(4, Math.round((base + (((i + j) % 3) - 1) * 0.5) * 2) / 2),
        );
        const courseId =
          t === 2 && j === 0 && i % 5 === 0 ? "c1" : `c${(t - 1) * 6 + j + 1}`;
        await db.grade.create({
          data: { semesterId: sem.id, courseId, score },
        });
      }
    }
  }
  if (evaluate) {
    const run = assessmentService(db, mlClient(config()));
    for (const s of await db.student.findMany()) await run(s.id, "admin");
  }
  return { students: 24, classes: 2, users: 3 };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = new PrismaClient();
  try {
    console.log(await seed(db, { evaluate: true }));
    console.log("Đã nạp dữ liệu giả lập. Tài khoản xem README.");
  } finally {
    await db.$disconnect();
  }
}

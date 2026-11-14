import "./config.mjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Tên giả lập dành cho dữ liệu demo.
const studentNames = [
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

async function main() {
  const results = await db.$transaction(
    studentNames.map((name, index) => {
      const code = `DEMO${String(index + 1).padStart(3, "0")}`;

      return db.student.updateMany({
        where: {
          id: `s${index + 1}`,
          code,
          // Chỉ đổi các tên mẫu cũ; giữ tên đã sửa thủ công.
          name: { startsWith: "Sinh viên " },
        },
        data: { name },
      });
    }),
  );

  const total = results.reduce((sum, result) => sum + result.count, 0);

  console.log(`Đã cập nhật họ tên cho ${total} sinh viên.`);

  const students = await db.student.findMany({
    where: {
      code: {
        in: studentNames.map(
          (_, index) => `DEMO${String(index + 1).padStart(3, "0")}`,
        ),
      },
    },
    select: { code: true, name: true },
    orderBy: { code: "asc" },
  });

  console.table(students);
}

try {
  await main();
} catch (error) {
  console.error("Không cập nhật được tên:", error.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}

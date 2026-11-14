import "./config.mjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const [users, programs] = await db.$transaction([
    db.user.updateMany({
      where: {
        role: "ADMIN",
        name: "Quản trị viên Demo",
      },
      data: {
        name: "Quản trị hệ thống",
      },
    }),

    db.program.updateMany({
      where: {
        name: "Công nghệ thông tin — chương trình demo",
      },
      data: {
        name: "Công nghệ thông tin",
      },
    }),
  ]);

  console.log(`Đã đổi tên ${users.count} tài khoản quản trị.`);
  console.log(`Đã đổi tên ${programs.count} chương trình đào tạo.`);
}

try {
  await main();
} catch (error) {
  console.error("Không thể cập nhật tên:", error.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
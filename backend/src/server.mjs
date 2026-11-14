import "./config.mjs";
import http from "node:http";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";
import { parse } from "cookie";
import { config } from "./config.mjs";
import { createApp, authenticate } from "./app.mjs";
export function startServer(
  db,
  cfg,
  {
    port = Number(process.env.PORT || 3000),
    host = process.env.HOST || "127.0.0.1",
    predict,
  } = {},
) {
  let io;
  const notify = async (classId, event) => {
    const cls = await db.advisingClass.findUnique({ where: { id: classId } });
    if (!cls) return;
    io.to(`user:${cls.advisorId}`).to("admins").emit("academic:update", event);
  };
  const { app, evaluate } = createApp(db, cfg, {
    predict,
    notify: (...args) => {
      notify(...args).catch(console.error);
    },
    disconnect: (id) => io.in(`session:${id}`).disconnectSockets(true),
  });
  const server = http.createServer(app);
  io = new Server(server, {
    cors: { origin: cfg.origins, credentials: true },
    allowRequest: (req, cb) =>
      cb(null, !req.headers.origin || cfg.origins.includes(req.headers.origin)),
  });
  io.use(async (socket, next) => {
    const a = await authenticate(
      db,
      parse(socket.request.headers.cookie || "").edualert,
      cfg,
    );
    if (!a) return next(new Error("UNAUTHORIZED"));
    socket.data.auth = a;
    next();
  });
  io.on("connection", (socket) => {
    const { user, session } = socket.data.auth;
    socket.join(`user:${user.id}`);
    socket.join(`session:${session.id}`);
    if (user.role === "ADMIN") socket.join("admins");
    const timer = setTimeout(
      () => socket.disconnect(true),
      Math.max(1, session.expiresAt.getTime() - Date.now()),
    );
    timer.unref();
    socket.on("disconnect", () => clearTimeout(timer));
  });
  server.listen(port, host, () =>
    console.log(`EduAlert API: http://${host}:${server.address().port}`),
  );
  return { app, server, io, evaluate };
}
if (process.env.EDUALERT_NO_START !== "1") {
  const db = new PrismaClient();
  const { server, io } = startServer(db, config());
  const stop = () => {
    io.close();
    server.close(async () => {
      await db.$disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

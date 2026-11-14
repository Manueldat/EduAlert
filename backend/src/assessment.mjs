import crypto from "node:crypto";
import { calculate, rules, priority, policy } from "./academic.mjs";
export const studentInclude = {
  advisingClass: { include: { program: true } },
  semesters: { include: { term: true, grades: { include: { course: true } } } },
};
export function mlClient(cfg) {
  return async (features) => {
    try {
      const r = await fetch(`${cfg.mlUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ML-Key": cfg.mlKey },
        body: JSON.stringify({ features }),
        signal: AbortSignal.timeout(cfg.timeout),
      });
      if (!r.ok) throw new Error(`ML ${r.status}`);
      const result = await r.json();
      if (
        result.policyVersion !== policy.version ||
        result.featureSchema !== "academic-v1" ||
        !Number.isFinite(result.probability) ||
        result.probability < 0 ||
        result.probability > 1 ||
        !["GREEN", "YELLOW", "RED"].includes(result.level)
      )
        throw new Error("ML contract mismatch");
      return { ...result, status: "OK" };
    } catch {
      return {
        status: "UNAVAILABLE",
        message: "Dịch vụ ML chưa sẵn sàng. Kết quả quy tắc vẫn được giữ.",
        probability: null,
      };
    }
  };
}
export function assessmentService(db, predict, notify = () => {}) {
  const locks = new Map();
  const evaluate = async (studentId, actorId) => {
    // Serialise per student in this single-process teaching deployment.
    const old = locks.get(studentId) || Promise.resolve();
    const promise = old
      .catch(() => {})
      .then(async () => {
        const student = await db.student.findUnique({
          where: { id: studentId },
          include: studentInclude,
        });
        if (!student)
          throw Object.assign(new Error("Không tìm thấy sinh viên"), {
            status: 404,
          });
        const courses = await db.course.findMany();
        const academic = calculate(student, courses),
          rule = rules(academic);
        const ml = academic.valid
          ? await predict(academic.features)
          : {
              status: "INSUFFICIENT",
              message: academic.reason,
              probability: null,
            };
        const level = priority(rule.level, ml);
        const fingerprint = crypto
          .createHash("sha256")
          .update(
            JSON.stringify([
              studentId,
              student.revision,
              policy.version,
              ml.status,
              ml.modelVersion || null,
            ]),
          )
          .digest("hex");
        const payload = {
          academic,
          rule,
          ml,
          priority: level,
          policyVersion: policy.version,
        };
        const result = await db.$transaction(
          async (tx) => {
            const current = await tx.student.findUnique({
              where: { id: studentId },
            });
            if (current.revision !== student.revision)
              throw Object.assign(
                new Error("Dữ liệu vừa thay đổi. Hãy đánh giá lại."),
                { status: 409 },
              );
            // Coalesce consecutive equal assessments only. A recovery after an outage
            // must become the newest snapshot even if this model ran earlier.
            const latest = await tx.assessment.findFirst({
              where: { studentId },
              orderBy: { createdAt: "desc" },
            });
            if (latest?.fingerprint === fingerprint) return latest;
            const assessment = await tx.assessment.create({
              data: {
                studentId,
                fingerprint,
                revision: student.revision,
                termOrdinal: academic.latest?.ordinal,
                createdAt: new Date(
                  Math.max(Date.now(), (latest?.createdAt.getTime() || 0) + 1),
                ),
                targetOrdinal: academic.valid
                  ? academic.latest.ordinal + 1
                  : null,
                priority: level,
                mlStatus: ml.status,
                modelVersion: ml.modelVersion || null,
                probability: ml.probability ?? null,
                payload: JSON.stringify(payload),
              },
            });
            if (academic.valid) {
              const where = {
                studentId_termOrdinal: {
                  studentId,
                  termOrdinal: academic.latest.ordinal,
                },
              };
              const alert = await tx.alert.findUnique({ where });
              if (["RED", "YELLOW"].includes(level)) {
                if (alert)
                  await tx.alert.update({
                    where,
                    data: { active: true, severity: level },
                  });
                else
                  await tx.alert.create({
                    data: {
                      studentId,
                      termOrdinal: academic.latest.ordinal,
                      severity: level,
                    },
                  });
              } else if (alert && level === "GREEN")
                await tx.alert.update({ where, data: { active: false } });
            }
            await tx.audit.create({
              data: {
                actorId,
                action: "ASSESS",
                subjectId: studentId,
                details: JSON.stringify({
                  revision: student.revision,
                  level,
                  mlStatus: ml.status,
                }),
              },
            });
            return assessment;
          },
          { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 },
        );
        notify(student.classId, {
          studentId,
          priority: level,
          assessmentId: result.id,
        });
        return { ...result, payload: JSON.parse(result.payload) };
      });
    locks.set(studentId, promise);
    try {
      return await promise;
    } finally {
      if (locks.get(studentId) === promise) locks.delete(studentId);
    }
  };
  return evaluate;
}

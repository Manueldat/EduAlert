import fs from "node:fs";
export const policy = JSON.parse(
  fs.readFileSync(
    new URL("../../shared/demo-policy.json", import.meta.url),
    "utf8",
  ),
);
const rounded = (n) => Math.round(n * 10000) / 10000;
export function calculate(student, courses = []) {
  const terms = [...student.semesters].sort(
    (a, b) => a.term.ordinal - b.term.ordinal,
  );
  const best = new Map(),
    attempts = new Map();
  const history = [];
  let missing = false,
    prev = null,
    paused = 0,
    warnings = 0;
  for (const sem of terms) {
    if (sem.paused) {
      paused++;
      history.push({
        term: sem.term.name,
        ordinal: sem.term.ordinal,
        paused: true,
      });
      continue;
    }
    if (
      !sem.finalized ||
      !sem.grades.length ||
      sem.grades.some((g) => g.score === null)
    ) {
      missing = true;
      history.push({
        term: sem.term.name,
        ordinal: sem.term.ordinal,
        incomplete: true,
      });
      continue;
    }
    let registered = 0,
      failed = 0,
      points = 0;
    for (const g of sem.grades) {
      const c = g.course;
      registered += c.credits;
      points += g.score * c.credits;
      if (g.score < policy.passGrade) {
        failed += c.credits;
        attempts.set(c.id, (attempts.get(c.id) || 0) + 1);
      }
      if (!best.has(c.id) || best.get(c.id).score < g.score)
        best.set(c.id, { ...c, score: g.score });
    }
    const b = [...best.values()],
      gpa = points / registered;
    const credits = b.reduce((s, c) => s + c.credits, 0),
      earned = b
        .filter((c) => c.score >= policy.passGrade)
        .reduce((s, c) => s + c.credits, 0);
    const debt = b.filter((c) => c.score < policy.passGrade);
    const program = student.advisingClass.program;
    const completedTerms = Math.max(
      1,
      sem.term.ordinal - student.entryOrdinal + 1 - paused,
    );
    const expected = Math.min(
      program.totalCredits,
      completedTerms * program.creditsPerTerm,
    );
    const previousIsAdjacent = prev && sem.term.ordinal === prev.ordinal + 1;
    const row = {
      term: sem.term.name,
      ordinal: sem.term.ordinal,
      gpa: rounded(gpa),
      cpa: rounded(b.reduce((s, c) => s + c.score * c.credits, 0) / credits),
      registered,
      failed,
      earned,
      expected,
      debtCredits: debt.reduce((s, c) => s + c.credits, 0),
      gpaDrop: previousIsAdjacent ? rounded(prev.gpa - gpa) : null,
      progress: rounded(earned / expected),
      officialWarnings: warnings + (sem.officialWarning ? 1 : 0),
    };
    history.push(row);
    prev = row;
    if (sem.officialWarning) warnings++;
  }
  // A missing term between entry and the latest term is not silently treated as zero.
  if (terms.length) {
    for (let n = student.entryOrdinal; n <= terms.at(-1).term.ordinal; n++)
      if (!terms.some((s) => s.term.ordinal === n)) missing = true;
  }
  const debts = [...best.values()]
    .filter((c) => c.score < policy.passGrade)
    .map((c) => ({
      ...c,
      failures: attempts.get(c.id) || 0,
      blocks: courses
        .filter((x) => x.prerequisiteId === c.id)
        .map((x) => x.name),
    }));
  const last = history.at(-1);
  const valid =
    student.status === "ACTIVE" &&
    !missing &&
    !!last &&
    !last.paused &&
    !last.incomplete;
  const features = valid
    ? {
        gpa: last.gpa,
        cpa: last.cpa,
        gpa_drop: last.gpaDrop,
        failed_ratio: last.failed / last.registered,
        debt_credits: last.debtCredits,
        progress_ratio: last.progress,
        prereq_failures: Math.max(
          0,
          ...debts.filter((x) => x.blocks.length).map((x) => x.failures),
        ),
        warning_count: last.officialWarnings,
      }
    : null;
  return {
    history,
    latest: last || null,
    debts,
    features,
    valid,
    reason: valid
      ? null
      : student.status !== "ACTIVE"
        ? "Sinh viên không ở trạng thái đang học"
        : !last
          ? "Chưa có học kỳ"
          : "Chưa đủ học kỳ đã chốt, đang bảo lưu hoặc thiếu điểm",
    policy,
  };
}
export function rules(academic) {
  if (!academic.valid)
    return {
      level: "UNKNOWN",
      reasons: [],
      recommendations: ["Hoàn thiện dữ liệu trước khi đánh giá."],
      labelEvent: null,
    };
  const f = academic.features,
    reasons = [];
  const add = (code, level, text) => reasons.push({ code, level, text });
  if (f.gpa < policy.warningGpa)
    add(
      "GPA",
      "RED",
      `GPA ${f.gpa.toFixed(2)} dưới ${policy.warningGpa} (ngưỡng demo)`,
    );
  if (f.cpa < policy.warningCpa)
    add(
      "CPA",
      "RED",
      `CPA ${f.cpa.toFixed(2)} dưới ${policy.warningCpa} (ngưỡng demo)`,
    );
  if (f.failed_ratio > policy.warningFailedRatio)
    add("FAILED", "RED", "Tín chỉ không đạt vượt 50% tín chỉ đăng ký");
  if (f.debt_credits > policy.warningDebtCredits)
    add("DEBT", "RED", `Tín chỉ còn nợ vượt ${policy.warningDebtCredits}`);
  const labelEvent = reasons.length > 0;
  if (f.gpa_drop !== null && f.gpa_drop >= policy.watchGpaDrop)
    add(
      "DROP",
      "YELLOW",
      `GPA giảm ${f.gpa_drop.toFixed(2)} so với kỳ liền trước`,
    );
  if (f.cpa < policy.watchCpa && !reasons.some((r) => r.code === "CPA"))
    add("CPA_WATCH", "YELLOW", "CPA dưới ngưỡng theo dõi demo 2.0");
  if (f.progress_ratio < policy.watchProgressRatio)
    add("PROGRESS", "YELLOW", "Tiến độ tín chỉ dưới 70% mốc dự kiến");
  if (f.prereq_failures >= policy.watchPrerequisiteFailures)
    add("PREREQ", "YELLOW", "Môn tiên quyết chưa đạt qua ít nhất hai lần học");
  if (f.warning_count > 0)
    add("HISTORY", "YELLOW", "Có lịch sử cảnh cáo chính thức đã được nhập");
  const recommendations = [];
  if (academic.debts.length)
    recommendations.push(
      "Trao đổi kế hoạch học lại: " +
        academic.debts
          .map(
            (c) =>
              `${c.code}${c.blocks.length ? " (chặn " + c.blocks.join(", ") + ")" : ""}`,
          )
          .join("; "),
    );
  if (f.gpa_drop >= policy.watchGpaDrop)
    recommendations.push(
      "Trao đổi nguyên nhân điểm giảm; cân nhắc khối lượng đăng ký cùng sinh viên.",
    );
  if (f.progress_ratio < policy.watchProgressRatio)
    recommendations.push(
      "Đối chiếu lại tiến độ chương trình và lập kế hoạch trả nợ theo từng kỳ.",
    );
  if (!recommendations.length)
    recommendations.push("Tiếp tục theo dõi ở lần cập nhật học kỳ kế tiếp.");
  return {
    level: reasons.some((r) => r.level === "RED")
      ? "RED"
      : reasons.length
        ? "YELLOW"
        : "GREEN",
    reasons,
    recommendations,
    labelEvent,
  };
}
export function priority(ruleLevel, ml) {
  const levels = [ruleLevel, ...(ml.status === "OK" ? [ml.level] : [])];
  if (levels.includes("RED")) return "RED";
  if (levels.includes("YELLOW")) return "YELLOW";
  return ruleLevel === "GREEN" && ml.status === "OK" ? "GREEN" : "UNKNOWN";
}

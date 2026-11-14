import test from "node:test";
import assert from "node:assert/strict";
import { calculate, rules, priority } from "../src/academic.mjs";
const c = { id: "c1", name: "Môn A", code: "A", credits: 3 };
const term = (ordinal, score, extra = {}) => ({
  term: { ordinal, name: `HK${ordinal}` },
  finalized: true,
  paused: false,
  officialWarning: false,
  grades: [{ course: c, score }],
  ...extra,
});
const student = (semesters) => ({
  status: "ACTIVE",
  entryOrdinal: 1,
  advisingClass: { program: { totalCredits: 120, creditsPerTerm: 3 } },
  semesters,
});
test("Học lại: tín chỉ đạt một lần, CPA lấy điểm cao nhất", () => {
  const a = calculate(student([term(1, 0), term(2, 3), term(3, 2)]));
  assert.equal(a.latest.earned, 3);
  assert.equal(a.latest.cpa, 3);
  assert.equal(a.debts.length, 0);
});
test("GPA có trọng số tín chỉ", () => {
  const s = term(1, 4);
  s.grades.push({ score: 1, course: { id: "c2", credits: 6 } });
  const a = calculate(student([s]));
  assert.equal(a.latest.gpa, 2);
});
test("Cuối HK1 có thể đánh giá, chưa thể tính mức giảm GPA", () => {
  const a = calculate(student([term(1, 3)]));
  assert.equal(a.valid, true);
  assert.equal(a.features.gpa_drop, null);
});
test("Thiếu kỳ, chưa chốt, thiếu điểm không được xếp Xanh", () => {
  for (const semesters of [
    [term(2, 3)],
    [term(1, null)],
    [term(1, 3, { finalized: false })],
  ]) {
    const a = calculate(student(semesters));
    assert.equal(a.valid, false);
    assert.equal(rules(a).level, "UNKNOWN");
  }
  assert.equal(priority("GREEN", { status: "UNAVAILABLE" }), "UNKNOWN");
});
test("Sát ngưỡng GPA giảm >=0.5 và tỷ lệ không đạt >0.5", () => {
  const a = calculate(student([term(1, 3), term(2, 2.5)]));
  assert(rules(a).reasons.some((x) => x.code === "DROP"));
  a.features.failed_ratio = 0.5;
  assert(!rules(a).reasons.some((x) => x.code === "FAILED"));
  a.features.failed_ratio = 0.51;
  assert(rules(a).reasons.some((x) => x.code === "FAILED"));
});
test("Bảo lưu không coi là GPA 0 và không so sánh qua kỳ ngắt", () => {
  const a = calculate(
    student([
      term(1, 3),
      term(2, null, { paused: true, grades: [] }),
      term(3, 2),
    ]),
  );
  assert.equal(a.valid, true);
  assert.equal(a.latest.expected, 6);
  assert.equal(a.features.gpa_drop, null);
});
test("Môn tiên quyết rớt hai lần tạo giải thích và gợi ý trả nợ", () => {
  const a = calculate(student([term(1, 0), term(2, 0)]), [
    { id: "c2", name: "Môn B", prerequisiteId: "c1" },
  ]);
  assert.equal(a.features.prereq_failures, 2);
  assert(rules(a).recommendations[0].includes("Môn B"));
});

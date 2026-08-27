import { test } from "node:test";
import assert from "node:assert/strict";
import { generateQuestion, generateStage, ZONE_SPECS } from "../js/questions.js";

test("คำตอบของบวกถูกต้องเสมอ", () => {
  for (let i = 0; i < 200; i++) {
    const q = generateQuestion({ ops: ["add"], min: 0, max: 20, allowNegative: false, wholeDivision: true });
    assert.equal(q.op, "add");
    assert.equal(q.operands[0] + q.operands[1], q.answer);
  }
});

test("การลบไม่ให้ผลติดลบเมื่อ allowNegative=false", () => {
  for (let i = 0; i < 200; i++) {
    const q = generateQuestion({ ops: ["sub"], min: 0, max: 20, allowNegative: false, wholeDivision: true });
    assert.equal(q.operands[0] - q.operands[1], q.answer);
    assert.ok(q.answer >= 0, `answer should be >= 0 but got ${q.answer}`);
  }
});

test("การหารลงตัวเสมอเมื่อ wholeDivision=true (ไม่มีเศษ, ไม่หารด้วย 0)", () => {
  for (let i = 0; i < 200; i++) {
    const q = generateQuestion({ ops: ["div"], min: 1, max: 12, allowNegative: false, wholeDivision: true });
    assert.notEqual(q.operands[1], 0);
    assert.equal(q.operands[0] / q.operands[1], q.answer);
    assert.equal(q.operands[0] % q.operands[1], 0);
  }
});

test("คูณคำตอบถูกต้องและตัวเลขอยู่ในช่วง", () => {
  for (let i = 0; i < 200; i++) {
    const q = generateQuestion({ ops: ["mul"], min: 2, max: 12, allowNegative: false, wholeDivision: true });
    assert.equal(q.operands[0] * q.operands[1], q.answer);
    assert.ok(q.operands[0] >= 2 && q.operands[0] <= 12);
    assert.ok(q.operands[1] >= 2 && q.operands[1] <= 12);
  }
});

test("generateStage คืนจำนวนข้อตามที่ขอ และแต่ละข้อมี text", () => {
  const stage = generateStage(ZONE_SPECS[1], 8);
  assert.equal(stage.length, 8);
  for (const q of stage) {
    assert.equal(typeof q.text, "string");
    assert.ok(q.text.length > 0);
    assert.equal(typeof q.answer, "number");
  }
});

test("ZONE_SPECS มีครบ 4 โซน และ ops ตรงตามสเปก", () => {
  assert.deepEqual(Object.keys(ZONE_SPECS).sort(), ["1", "2", "3", "4"]);
  assert.ok(ZONE_SPECS[1].ops.every((o) => ["add", "sub"].includes(o)));
  assert.ok(ZONE_SPECS[3].ops.every((o) => ["mul", "div"].includes(o)));
  assert.ok(ZONE_SPECS[4].ops.length === 4);
});

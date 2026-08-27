import { test } from "node:test";
import assert from "node:assert/strict";
import { stageKey, isStageUnlocked, ZONES } from "../js/world.js";

test("มี 4 โซน", () => assert.equal(ZONES.length, 4));

test("stageKey สร้างคีย์ถูกแบบ z-s", () => {
  assert.equal(stageKey(1, 2), "1-2");
  assert.equal(stageKey(4, 1), "4-1");
});

test("ด่านแรกสุดปลดล็อกเสมอ", () => {
  assert.equal(isStageUnlocked(1, 1, []), true);
});

test("ด่าน 2 ปลดเมื่อเคลียร์ด่าน 1", () => {
  assert.equal(isStageUnlocked(1, 2, []), false);
  assert.equal(isStageUnlocked(1, 2, ["1-1"]), true);
});

test("โซน 2 ด่าน 1 ปลดเมื่อเคลียร์ด่านสุดท้ายของโซน 1", () => {
  const clearedZone1 = ["1-1", "1-2", "1-3", "1-4"];
  assert.equal(isStageUnlocked(2, 1, ["1-1"]), false);
  assert.equal(isStageUnlocked(2, 1, clearedZone1), true);
});

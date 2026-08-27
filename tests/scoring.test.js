import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreAnswer, computeStageResult, BASE_POINTS, STREAK_BONUS } from "../js/scoring.js";

test("ตอบผิดได้ 0 คะแนน", () => {
  assert.equal(scoreAnswer({ correct: false, zoneMultiplier: 3, streak: 4 }), 0);
});

test("ตอบถูกได้คะแนนฐานคูณตัวคูณโซน", () => {
  assert.equal(scoreAnswer({ correct: true, zoneMultiplier: 1, streak: 0 }), BASE_POINTS);
  assert.equal(scoreAnswer({ correct: true, zoneMultiplier: 4, streak: 0 }), BASE_POINTS * 4);
});

test("โบนัส streak เพิ่มเมื่อครบ 5 ข้อถูกติดกัน", () => {
  // streak นับก่อนบวกข้อนี้; ครบ 5 (streak=4 -> ข้อที่ 5) ได้โบนัส
  const withBonus = scoreAnswer({ correct: true, zoneMultiplier: 1, streak: 4 });
  assert.equal(withBonus, BASE_POINTS + STREAK_BONUS);
});

test("computeStageResult รวมคะแนน/เหรียญ/นับถูก/streak สูงสุด", () => {
  // 6 ข้อ: ถูก 5 ข้อแรกติดกัน (ข้อที่ 5 ได้โบนัส) แล้วผิด 1
  const answers = [true, true, true, true, true, false];
  const r = computeStageResult(answers, 2);
  assert.equal(r.correctCount, 5);
  assert.equal(r.maxStreak, 5);
  // คะแนน: 5 ข้อถูก × (10×2) = 100, + โบนัส 5 (ครบ 5 ข้อที่ตำแหน่ง streak=4) = 105
  assert.equal(r.score, 5 * (BASE_POINTS * 2) + STREAK_BONUS);
  // เหรียญ = จำนวนข้อถูก
  assert.equal(r.coins, 5);
});

test("computeStageResult กับตอบผิดหมดได้ 0", () => {
  const r = computeStageResult([false, false, false], 4);
  assert.equal(r.score, 0);
  assert.equal(r.coins, 0);
  assert.equal(r.correctCount, 0);
  assert.equal(r.maxStreak, 0);
});

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// จำลอง localStorage ก่อน import โมดูล
class MemStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
globalThis.localStorage = new MemStorage();

const S = await import("../js/storage.js");

beforeEach(() => globalThis.localStorage.clear());

test("session บันทึก/อ่าน/ล้างได้", () => {
  assert.equal(S.loadSession(), null);
  S.saveSession({ studentId: "a1", token: "t", displayName: "เด็ก", grade: 3 });
  assert.deepEqual(S.loadSession(), { studentId: "a1", token: "t", displayName: "เด็ก", grade: 3 });
  S.clearSession();
  assert.equal(S.loadSession(), null);
});

test("progress บันทึก/อ่านได้", () => {
  S.saveProgress({ totalScore: 100, coins: 10, stagesCleared: ["1-1"] });
  assert.deepEqual(S.loadProgress(), { totalScore: 100, coins: 10, stagesCleared: ["1-1"] });
});

test("queue enqueue/dequeueAll/clear ทำงานตามลำดับ", () => {
  assert.deepEqual(S.dequeueAll(), []);
  S.enqueue({ a: 1 });
  S.enqueue({ a: 2 });
  assert.deepEqual(S.dequeueAll(), [{ a: 1 }, { a: 2 }]);
  S.clearQueue();
  assert.deepEqual(S.dequeueAll(), []);
});

test("setQueue เขียนคิวทั้งหมดทับของเดิมได้", () => {
  S.setQueue([{ a: 1 }, { a: 2 }]);
  assert.deepEqual(S.dequeueAll(), [{ a: 1 }, { a: 2 }]);
  S.setQueue([]);
  assert.deepEqual(S.dequeueAll(), []);
});

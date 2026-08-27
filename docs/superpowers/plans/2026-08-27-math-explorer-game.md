# Math Explorer (นักผจญภัยคณิต) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างเกมฝึกเลข บวก/ลบ/คูณ/หาร แนวผจญภัยสำรวจแผนที่ สำหรับ ป.3–ป.6 ที่เล่นได้จริง มีบัญชีนักเรียน เก็บคะแนน จัดอันดับ และ deploy บน GitHub Pages โดยเก็บข้อมูลใน Google Sheets ผ่าน Google Apps Script

**Architecture:** หน้าเว็บ static (Vanilla HTML/CSS/JS แบบ ES modules, ไม่มี build step) โฮสต์บน GitHub Pages เรียก Google Apps Script Web App เป็น API ที่อ่าน/เขียน Google Sheet. Logic ล้วน (สร้างโจทย์/คิดคะแนน) แยกเป็นโมดูลทดสอบด้วย `node:test`. UI ใช้ Optimistic update + localStorage cache + คิวส่งซ้ำ เพื่อให้ลื่นไหลแม้ GAS ช้า

**Tech Stack:** HTML5, CSS3, JavaScript (ES modules), Node.js built-in test runner (`node:test`), Google Apps Script, Google Sheets, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-08-27-math-explorer-game-design.md`

**ขอบเขตแผนนี้:** ครอบคลุม Milestone M1–M4 + M6 ของสเปก (เกมเล่นได้ + บัญชี + แผนที่โซน + อันดับ + deploy). Milestone M5 (ฐานผจญภัย/แต่งตัวละคร) เป็นแผนแยกในอนาคต

## Global Constraints

- **ไม่มี build step** — โค้ดฝั่ง client รันในเบราว์เซอร์ได้ตรงๆ; ใช้ ES modules (`<script type="module">`) เท่านั้น ห้ามใช้ bundler/transpiler
- **ไม่มี runtime dependency ฝั่ง client** — ห้ามเพิ่มไลบรารีภายนอก (no npm packages shipped to browser)
- **การทดสอบใช้ `node:test` + `node:assert` ในตัวของ Node เท่านั้น** — ห้ามลง jest/mocha/vitest
- **โมดูล logic ล้วน** (`questions.js`, `scoring.js`) ห้าม import DOM หรือ network — เพื่อให้ทดสอบใน Node ได้
- **ค่าคงที่ตั้งค่าที่เดียว** — URL ของ GAS และค่าคอนฟิกทั้งหมดอยู่ใน `config.js`
- **PIN เก็บเป็น SHA-256(PIN + salt) เท่านั้น** — ห้ามเก็บ PIN ดิบทั้งใน Sheet และ localStorage
- **เขียน Sheet ต้องครอบด้วย `LockService`** และคืนผลรูปแบบ `{ok:boolean, data?, error?}` เสมอ
- ระดับชั้นที่รองรับ: grade ∈ {3,4,5,6}; PIN = ตัวเลข 4 หลักพอดี

---

## File Structure

```
index.html            หน้าเดียว (SPA อย่างง่าย) มีคอนเทนเนอร์ทุกหน้าจอ
config.js             GAS_URL + ค่าคงที่ (export ค่า)
css/styles.css        สไตล์ responsive ทั้งหมด
js/
  questions.js        สร้างโจทย์ตามความยาก (pure) — export generateQuestion, generateStage, ZONE_SPECS
  scoring.js          คิดคะแนน (pure) — export scoreAnswer, computeStageResult, constants
  storage.js          localStorage: session, progress cache, offline queue
  api.js              เรียก GAS (fetch + retry + error mapping)
  auth.js             ฟอร์ม register/login + จัดการ session
  world.js            ข้อมูลโซน/ด่าน + ตรรกะปลดล็อก + วาดแผนที่
  game.js             loop เล่นด่าน (ผูก questions+scoring กับ DOM)
  leaderboard.js      ดึง+แสดงกระดานอันดับ
  app.js              ตัวคุมหลัก: สลับหน้าจอ, bootstrap
tests/
  questions.test.js   เทสต์ questions.js (node:test)
  scoring.test.js     เทสต์ scoring.js (node:test)
gas/
  Code.gs             โค้ด Google Apps Script (วางใน editor)
  SETUP.md            คู่มือสร้าง Sheet + deploy GAS สำหรับครู
docs/
  DEPLOY.md           คู่มือ deploy ขึ้น GitHub Pages
```

**หลักการแยกส่วน:** `questions.js`/`scoring.js` เป็น pure logic (ทดสอบได้). `storage.js`/`api.js` เป็นชั้น I/O. `world.js`/`game.js`/`auth.js`/`leaderboard.js` เป็นชั้น UI ต่อหน้าจอ. `app.js` ต่อทุกอย่างเข้าด้วยกัน. ไฟล์ที่เปลี่ยนด้วยกันอยู่ด้วยกัน

---

## Task 1: โครงโปรเจกต์ + หน้าเว็บเปล่า

**Files:**
- Create: `index.html`
- Create: `config.js`
- Create: `css/styles.css`
- Create: `.gitignore`

**Interfaces:**
- Consumes: (ไม่มี)
- Produces: `config.js` ที่ `export const CONFIG = {...}` มี field `GAS_URL` (string), `LEADERBOARD_TOP` (number), `PIN_SALT` (string). `index.html` มี `<div>` ที่ `id` ดังนี้: `screen-auth`, `screen-world`, `screen-game`, `screen-leaderboard`, และ container `#app`

- [ ] **Step 1: สร้าง `.gitignore`**

```
.DS_Store
node_modules/
*.log
```

- [ ] **Step 2: สร้าง `config.js`**

```js
// ตั้งค่าทั้งหมดที่เดียว — แก้ GAS_URL หลัง deploy GAS แล้ว (Task 6)
export const CONFIG = {
  GAS_URL: "",              // ใส่ URL ของ GAS Web App ที่นี่หลัง deploy
  LEADERBOARD_TOP: 20,      // จำนวนอันดับที่แสดง
  PIN_SALT: "math-explorer-v1", // salt สำหรับ hash PIN (ค่าคงที่ทั้งระบบ)
  STAGES_PER_ZONE: 4,       // จำนวนด่านต่อโซน
  QUESTIONS_PER_STAGE: 8,   // จำนวนโจทย์ต่อด่าน
};
```

- [ ] **Step 3: สร้าง `index.html`**

```html
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>นักผจญภัยคณิต</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <div id="app">
    <section id="screen-auth" class="screen"></section>
    <section id="screen-world" class="screen hidden"></section>
    <section id="screen-game" class="screen hidden"></section>
    <section id="screen-leaderboard" class="screen hidden"></section>
  </div>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: สร้าง `css/styles.css` (โครงเริ่มต้น responsive)**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, "Sarabun", sans-serif;
  background: #eaf6ff;
  color: #123;
  min-height: 100vh;
}
#app { max-width: 900px; margin: 0 auto; padding: 16px; }
.screen { display: block; }
.hidden { display: none !important; }
button {
  font-size: 1.1rem; padding: 12px 20px; border: none; border-radius: 12px;
  background: #2e9bff; color: #fff; cursor: pointer; min-height: 48px;
}
button:active { transform: scale(0.98); }
input {
  font-size: 1.1rem; padding: 12px; border: 2px solid #bcd; border-radius: 10px;
  width: 100%; min-height: 48px;
}
@media (max-width: 480px) { #app { padding: 10px; } }
```

- [ ] **Step 5: สร้าง `js/app.js` ชั่วคราว (ยืนยันว่าหน้าโหลดได้)**

```js
// ตัวคุมหลัก — จะเติมเนื้อใน Task ถัดๆ ไป
console.log("Math Explorer booted");
```

- [ ] **Step 6: เปิดดูในเบราว์เซอร์เพื่อยืนยัน**

Run: เปิด `index.html` ด้วยเบราว์เซอร์ (หรือ `python3 -m http.server` แล้วเข้า localhost)
Expected: หน้าเปล่าพื้นหลังฟ้า, console แสดง "Math Explorer booted" ไม่มี error

- [ ] **Step 7: Commit**

```bash
git add index.html config.js css/styles.css js/app.js .gitignore
git commit -m "feat: scaffold static site shell"
```

---

## Task 2: เครื่องสร้างโจทย์ (`questions.js`)

**Files:**
- Create: `js/questions.js`
- Test: `tests/questions.test.js`

**Interfaces:**
- Consumes: (ไม่มี — pure logic)
- Produces:
  - `generateQuestion(spec) -> { text, operands, op, answer }` โดย `op ∈ {"add","sub","mul","div"}`, `answer` เป็น number ที่ถูกต้องเสมอ
  - `generateStage(spec, count) -> Question[]` ยาว `count`
  - `ZONE_SPECS -> { [zoneId:number]: Spec }` โดย zoneId ∈ {1,2,3,4}
  - Spec shape: `{ ops: string[], min: number, max: number, allowNegative: boolean, wholeDivision: boolean }`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลวก่อน**

สร้าง `tests/questions.test.js`:

```js
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
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้มเหลว**

Run: `node --test tests/questions.test.js`
Expected: FAIL (import ไม่เจอ / ฟังก์ชันยังไม่มี)

- [ ] **Step 3: เขียน `js/questions.js` ให้ผ่านเทสต์**

```js
// สร้างโจทย์เลขแบบสุ่ม (pure logic — ห้าม import DOM/network)

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SYMBOL = { add: "+", sub: "−", mul: "×", div: "÷" };

export function generateQuestion(spec) {
  const op = spec.ops[randInt(0, spec.ops.length - 1)];
  let a, b, answer;

  if (op === "add") {
    a = randInt(spec.min, spec.max);
    b = randInt(spec.min, spec.max);
    answer = a + b;
  } else if (op === "sub") {
    a = randInt(spec.min, spec.max);
    b = randInt(spec.min, spec.max);
    if (!spec.allowNegative && b > a) [a, b] = [b, a]; // สลับให้ไม่ติดลบ
    answer = a - b;
  } else if (op === "mul") {
    a = randInt(spec.min, spec.max);
    b = randInt(spec.min, spec.max);
    answer = a * b;
  } else if (op === "div") {
    // สร้างจากผลคูณก่อน เพื่อรับประกันหารลงตัว
    b = randInt(Math.max(1, spec.min), spec.max); // ตัวหารไม่เป็น 0
    answer = randInt(spec.min, spec.max);
    a = b * answer;
  } else {
    throw new Error("unknown op: " + op);
  }

  return { text: `${a} ${SYMBOL[op]} ${b}`, operands: [a, b], op, answer };
}

export function generateStage(spec, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(generateQuestion(spec));
  return out;
}

export const ZONE_SPECS = {
  1: { ops: ["add", "sub"], min: 0, max: 20, allowNegative: false, wholeDivision: true },
  2: { ops: ["add", "sub", "mul"], min: 2, max: 12, allowNegative: false, wholeDivision: true },
  3: { ops: ["mul", "div"], min: 2, max: 12, allowNegative: false, wholeDivision: true },
  4: { ops: ["add", "sub", "mul", "div"], min: 2, max: 20, allowNegative: false, wholeDivision: true },
};
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `node --test tests/questions.test.js`
Expected: PASS ทุกเคส

- [ ] **Step 5: Commit**

```bash
git add js/questions.js tests/questions.test.js
git commit -m "feat: add procedural question generator with tests"
```

---

## Task 3: ตรรกะคะแนน (`scoring.js`)

**Files:**
- Create: `js/scoring.js`
- Test: `tests/scoring.test.js`

**Interfaces:**
- Consumes: (ไม่มี — pure logic)
- Produces:
  - `BASE_POINTS = 10` (number)
  - `STREAK_BONUS = 5` (number, โบนัสทุกครบ 5 ข้อถูกติดกัน)
  - `scoreAnswer({ correct, zoneMultiplier, streak }) -> number` (คะแนนของข้อเดียว; 0 ถ้าตอบผิด)
  - `computeStageResult(answers, zoneMultiplier) -> { score, coins, correctCount, maxStreak }` โดย `answers` = `boolean[]` (true=ถูก)

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลวก่อน**

สร้าง `tests/scoring.test.js`:

```js
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
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้มเหลว**

Run: `node --test tests/scoring.test.js`
Expected: FAIL (module ยังไม่มี)

- [ ] **Step 3: เขียน `js/scoring.js`**

```js
// ตรรกะคะแนน (pure logic)
export const BASE_POINTS = 10;
export const STREAK_BONUS = 5;

// streak = จำนวนข้อถูกติดกัน "ก่อน" ข้อนี้ (0-indexed) ; ครบ 5 ให้โบนัส
export function scoreAnswer({ correct, zoneMultiplier, streak }) {
  if (!correct) return 0;
  let pts = BASE_POINTS * zoneMultiplier;
  if ((streak + 1) % 5 === 0) pts += STREAK_BONUS;
  return pts;
}

export function computeStageResult(answers, zoneMultiplier) {
  let score = 0, coins = 0, correctCount = 0, streak = 0, maxStreak = 0;
  for (const correct of answers) {
    score += scoreAnswer({ correct, zoneMultiplier, streak });
    if (correct) {
      coins += 1;
      correctCount += 1;
      streak += 1;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 0;
    }
  }
  return { score, coins, correctCount, maxStreak };
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `node --test tests/scoring.test.js`
Expected: PASS ทุกเคส

- [ ] **Step 5: รันเทสต์ทั้งหมดรวมกัน**

Run: `node --test`
Expected: PASS ทั้ง questions.test.js และ scoring.test.js

- [ ] **Step 6: Commit**

```bash
git add js/scoring.js tests/scoring.test.js
git commit -m "feat: add scoring logic with tests"
```

---

## Task 4: เล่นด่านเดียวจบใน 1 หน้า (`game.js`) — M1 เล่นได้

**Files:**
- Create: `js/game.js`
- Modify: `js/app.js`
- Modify: `css/styles.css` (เพิ่มสไตล์หน้าเล่น)

**Interfaces:**
- Consumes: `generateStage`, `ZONE_SPECS` จาก `questions.js`; `computeStageResult` จาก `scoring.js`; `CONFIG` จาก `config.js`
- Produces:
  - `startStage({ zoneId, stageId, onComplete })` — เริ่มเล่นด่าน, render ลง `#screen-game`, เมื่อจบเรียก `onComplete(result)` โดย result = `{ zoneId, stageId, score, coins, correctCount, maxStreak, total }` (total = จำนวนข้อ)

- [ ] **Step 1: เขียน `js/game.js`**

```js
import { generateStage, ZONE_SPECS } from "./questions.js";
import { computeStageResult } from "./scoring.js";
import { CONFIG } from "../config.js";

const ZONE_MULT = { 1: 1, 2: 2, 3: 3, 4: 4 };

export function startStage({ zoneId, stageId, onComplete }) {
  const el = document.getElementById("screen-game");
  const spec = ZONE_SPECS[zoneId];
  const questions = generateStage(spec, CONFIG.QUESTIONS_PER_STAGE);
  const answers = [];
  let idx = 0;

  function renderQuestion() {
    const q = questions[idx];
    el.innerHTML = `
      <div class="game-hud">ด่าน ${zoneId}-${stageId} · ข้อ ${idx + 1}/${questions.length}</div>
      <div class="question">${q.text} = ?</div>
      <input id="answer-input" type="number" inputmode="numeric" autocomplete="off" />
      <button id="submit-answer">ตอบ</button>
      <div id="feedback" class="feedback"></div>
    `;
    const input = document.getElementById("answer-input");
    input.focus();
    const submit = () => checkAnswer(q, Number(input.value));
    document.getElementById("submit-answer").onclick = submit;
    input.onkeydown = (e) => { if (e.key === "Enter") submit(); };
  }

  function checkAnswer(q, given) {
    const correct = given === q.answer;
    answers.push(correct);
    const fb = document.getElementById("feedback");
    fb.textContent = correct ? "✅ ถูกต้อง!" : `❌ คำตอบคือ ${q.answer}`;
    fb.className = "feedback " + (correct ? "ok" : "no");
    document.getElementById("submit-answer").disabled = true;
    setTimeout(() => {
      idx++;
      if (idx < questions.length) renderQuestion();
      else finish();
    }, 900);
  }

  function finish() {
    const r = computeStageResult(answers, ZONE_MULT[zoneId]);
    el.innerHTML = `
      <div class="stage-result">
        <h2>จบด่าน!</h2>
        <p>ตอบถูก ${r.correctCount}/${questions.length} ข้อ</p>
        <p>ได้ ${r.score} คะแนน · ${r.coins} เหรียญ</p>
        <button id="stage-done">กลับแผนที่</button>
      </div>`;
    document.getElementById("stage-done").onclick = () =>
      onComplete({ zoneId, stageId, ...r, total: questions.length });
  }

  renderQuestion();
}
```

- [ ] **Step 2: เพิ่มสไตล์หน้าเล่นใน `css/styles.css`**

```css
.game-hud { font-size: 0.95rem; color: #567; margin-bottom: 12px; }
.question { font-size: 2.4rem; font-weight: 700; text-align: center; margin: 24px 0; }
.feedback { min-height: 32px; font-size: 1.2rem; text-align: center; margin-top: 12px; }
.feedback.ok { color: #1a9f4b; }
.feedback.no { color: #d23; }
.stage-result { text-align: center; }
.stage-result h2 { margin-bottom: 12px; }
.stage-result p { font-size: 1.2rem; margin: 8px 0; }
```

- [ ] **Step 3: แก้ `js/app.js` ให้ทดลองเล่น 1 ด่าน (ชั่วคราว)**

```js
import { startStage } from "./game.js";

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// ทดลอง: เข้ามาเล่นโซน 1 ด่าน 1 ทันที (จะแทนที่ด้วย flow จริงใน Task ถัดไป)
showScreen("screen-game");
startStage({
  zoneId: 1,
  stageId: 1,
  onComplete: (result) => {
    console.log("stage complete", result);
    alert(`ได้ ${result.score} คะแนน!`);
  },
});
```

- [ ] **Step 4: ทดสอบด้วยตาในเบราว์เซอร์**

Run: `python3 -m http.server 8000` แล้วเปิด `http://localhost:8000`
Expected: เห็นโจทย์บวก/ลบ, พิมพ์คำตอบกด Enter ได้ feedback, ครบ 8 ข้อเห็นสรุปคะแนน, กด "กลับแผนที่" ขึ้น alert คะแนน — ไม่มี error ใน console

- [ ] **Step 5: Commit**

```bash
git add js/game.js js/app.js css/styles.css
git commit -m "feat: playable single stage (M1)"
```

---

## Task 5: ชั้นเก็บข้อมูลในเครื่อง (`storage.js`)

**Files:**
- Create: `js/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Consumes: (ไม่มี — ใช้ในเบราว์เซอร์ผ่าน `globalThis.localStorage`)
- Produces:
  - `saveSession(session)` / `loadSession() -> session|null` / `clearSession()` — session = `{ studentId, token, displayName, grade }`
  - `saveProgress(progress)` / `loadProgress() -> progress|null` — progress = `{ totalScore, coins, stagesCleared: string[] }` (stageKey = `"z-s"` เช่น `"1-2"`)
  - `enqueue(item)` / `dequeueAll() -> item[]` / `clearQueue()` — คิวส่งซ้ำ (array ใน localStorage)

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลวก่อน**

สร้าง `tests/storage.test.js` (จำลอง localStorage ใน Node):

```js
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
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้มเหลว**

Run: `node --test tests/storage.test.js`
Expected: FAIL (module ยังไม่มี)

- [ ] **Step 3: เขียน `js/storage.js`**

```js
// ชั้นเก็บข้อมูลในเครื่อง (localStorage) — session, progress, offline queue
const K_SESSION = "me.session";
const K_PROGRESS = "me.progress";
const K_QUEUE = "me.queue";

function readJSON(key) {
  const raw = localStorage.getItem(key);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export function saveSession(s) { writeJSON(K_SESSION, s); }
export function loadSession() { return readJSON(K_SESSION); }
export function clearSession() { localStorage.removeItem(K_SESSION); }

export function saveProgress(p) { writeJSON(K_PROGRESS, p); }
export function loadProgress() { return readJSON(K_PROGRESS); }

export function enqueue(item) {
  const q = readJSON(K_QUEUE) || [];
  q.push(item);
  writeJSON(K_QUEUE, q);
}
export function dequeueAll() { return readJSON(K_QUEUE) || []; }
export function clearQueue() { localStorage.removeItem(K_QUEUE); }
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `node --test tests/storage.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/storage.js tests/storage.test.js
git commit -m "feat: add localStorage layer (session/progress/queue)"
```

---

## Task 6: Backend Google Apps Script + Sheet (`gas/Code.gs`, `gas/SETUP.md`)

**Files:**
- Create: `gas/Code.gs`
- Create: `gas/SETUP.md`

**Interfaces:**
- Consumes: (ไม่มี)
- Produces: GAS Web App ที่รับ `POST` (body เป็น JSON, `Content-Type: text/plain` เพื่อเลี่ยง CORS preflight) มี `action ∈ {register, login, submitProgress, getLeaderboard, getProfile}` และคืน JSON `{ok, data?, error?}`. Sheet มีแท็บ `Players` (คอลัมน์: studentId, displayName, grade, pinHash, totalScore, coins, progressJSON, baseJSON, createdAt, updatedAt) และ `Log`

> หมายเหตุ: ขั้นตอนนี้ทดสอบด้วยมือใน GAS editor + curl (ไม่มี unit test อัตโนมัติเพราะรันบนแพลตฟอร์ม Google). ทำตามลำดับให้ครบ

- [ ] **Step 1: เขียน `gas/Code.gs`**

```javascript
// Google Apps Script — API สำหรับเกมนักผจญภัยคณิต
// ผูกกับ Google Sheet: แท็บ "Players" และ "Log"

var SHEET_PLAYERS = "Players";
var SHEET_LOG = "Log";
var MAX_SCORE_PER_SUBMIT = 2000; // เพดานกันโกงเบาๆ ต่อการส่ง 1 ครั้ง
var LEADERBOARD_CACHE_SEC = 45;

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var action = req.action;
    var handlers = {
      register: register, login: login, submitProgress: submitProgress,
      getLeaderboard: getLeaderboard, getProfile: getProfile,
    };
    if (!handlers[action]) return out({ ok: false, error: "unknown_action" });
    return out(handlers[action](req));
  } catch (err) {
    return out({ ok: false, error: "server_error: " + err });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function hashPin(pin) {
  var salt = "math-explorer-v1"; // ต้องตรงกับ CONFIG.PIN_SALT ฝั่ง client
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin + salt);
  return raw.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}

function findRowById(sh, studentId) {
  var tf = sh.getRange("A2:A").createTextFinder(studentId).matchEntireCell(true).findNext();
  return tf ? tf.getRow() : -1;
}

function findRowByName(sh, name) {
  var tf = sh.getRange("B2:B").createTextFinder(name).matchEntireCell(true).findNext();
  return tf ? tf.getRow() : -1;
}

function makeToken() { return Utilities.getUuid().replace(/-/g, "").slice(0, 16); }
function makeId() { return "s" + Utilities.getUuid().replace(/-/g, "").slice(0, 10); }

function register(req) {
  var name = String(req.name || "").trim();
  var grade = Number(req.grade);
  var pin = String(req.pin || "");
  if (!name) return { ok: false, error: "name_required" };
  if ([3, 4, 5, 6].indexOf(grade) < 0) return { ok: false, error: "bad_grade" };
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "bad_pin" };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet(SHEET_PLAYERS);
    if (findRowByName(sh, name) > 0) return { ok: false, error: "name_taken" };
    var id = makeId();
    var token = makeToken();
    var now = new Date();
    sh.appendRow([id, name, grade, hashPin(pin), 0, 0, "{}", "{}", now, now]);
    logEvent(id, "register", name);
    return { ok: true, data: { studentId: id, token: token, displayName: name, grade: grade,
      totalScore: 0, coins: 0, progress: {} } };
  } finally { lock.releaseLock(); }
}

function login(req) {
  var name = String(req.name || "").trim();
  var pin = String(req.pin || "");
  var sh = sheet(SHEET_PLAYERS);
  var row = findRowByName(sh, name);
  if (row < 0) return { ok: false, error: "not_found" };
  var vals = sh.getRange(row, 1, 1, 10).getValues()[0];
  if (vals[3] !== hashPin(pin)) return { ok: false, error: "wrong_pin" };
  return { ok: true, data: {
    studentId: vals[0], token: makeToken(), displayName: vals[1], grade: vals[2],
    totalScore: vals[4], coins: vals[5], progress: JSON.parse(vals[6] || "{}") } };
}

function submitProgress(req) {
  var id = String(req.studentId || "");
  var addScore = Number(req.addScore) || 0;
  var addCoins = Number(req.addCoins) || 0;
  var stageKey = String(req.stageKey || "");
  if (addScore < 0 || addScore > MAX_SCORE_PER_SUBMIT) return { ok: false, error: "score_out_of_range" };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet(SHEET_PLAYERS);
    var row = findRowById(sh, id);
    if (row < 0) return { ok: false, error: "not_found" };
    var vals = sh.getRange(row, 1, 1, 10).getValues()[0];
    var progress = JSON.parse(vals[6] || "{}");
    if (!progress.stagesCleared) progress.stagesCleared = [];
    if (stageKey && progress.stagesCleared.indexOf(stageKey) < 0) progress.stagesCleared.push(stageKey);
    var newScore = Number(vals[4]) + addScore;
    var newCoins = Number(vals[5]) + addCoins;
    sh.getRange(row, 5, 1, 2).setValues([[newScore, newCoins]]); // totalScore, coins
    sh.getRange(row, 7).setValue(JSON.stringify(progress));       // progressJSON
    sh.getRange(row, 10).setValue(new Date());                    // updatedAt
    logEvent(id, "submit", "score+" + addScore + " " + stageKey);
    return { ok: true, data: { totalScore: newScore, coins: newCoins, progress: progress } };
  } finally { lock.releaseLock(); }
}

function getLeaderboard(req) {
  var top = Math.min(Number(req.top) || 20, 100);
  var cache = CacheService.getScriptCache();
  var hit = cache.get("lb_" + top);
  if (hit) return { ok: true, data: JSON.parse(hit) };
  var sh = sheet(SHEET_PLAYERS);
  var last = sh.getLastRow();
  var rows = last < 2 ? [] : sh.getRange(2, 1, last - 1, 6).getValues();
  var list = rows.map(function (r) { return { name: r[1], grade: r[2], totalScore: Number(r[4]) }; })
    .sort(function (a, b) { return b.totalScore - a.totalScore; })
    .slice(0, top);
  cache.put("lb_" + top, JSON.stringify(list), LEADERBOARD_CACHE_SEC);
  return { ok: true, data: list };
}

function getProfile(req) {
  var sh = sheet(SHEET_PLAYERS);
  var row = findRowById(sh, String(req.studentId || ""));
  if (row < 0) return { ok: false, error: "not_found" };
  var v = sh.getRange(row, 1, 1, 10).getValues()[0];
  return { ok: true, data: { studentId: v[0], displayName: v[1], grade: v[2],
    totalScore: v[4], coins: v[5], progress: JSON.parse(v[6] || "{}") } };
}

function logEvent(id, action, detail) {
  var sh = sheet(SHEET_LOG);
  if (sh) sh.appendRow([new Date(), id, action, detail]);
}
```

- [ ] **Step 2: เขียน `gas/SETUP.md` (คู่มือครูตั้ง Sheet + deploy)**

เขียนไฟล์ที่อธิบายขั้นตอน (ภาษาไทย) ดังนี้ครบถ้วน:

```markdown
# วิธีตั้งค่า Google Sheet + Apps Script

## 1. สร้าง Google Sheet
1. ไปที่ https://sheets.google.com สร้างสเปรดชีตใหม่ ตั้งชื่อ "MathExplorer-Data"
2. สร้างแท็บชื่อ `Players` แถวแรก (หัวคอลัมน์ A1:J1) ใส่:
   `studentId | displayName | grade | pinHash | totalScore | coins | progressJSON | baseJSON | createdAt | updatedAt`
3. สร้างแท็บชื่อ `Log` แถวแรก (A1:D1) ใส่: `timestamp | studentId | action | detail`

## 2. ใส่โค้ด Apps Script
1. ในสเปรดชีต เมนู Extensions > Apps Script
2. ลบโค้ดเดิม วางเนื้อหาไฟล์ `gas/Code.gs` ทั้งหมด แล้วบันทึก
3. ⚠️ ตรวจว่า salt ในฟังก์ชัน `hashPin` (`"math-explorer-v1"`) ตรงกับ `PIN_SALT` ใน `config.js`

## 3. Deploy เป็น Web App
1. กด Deploy > New deployment > เลือกชนิด "Web app"
2. Execute as: **Me** ; Who has access: **Anyone**
3. กด Deploy อนุญาตสิทธิ์ แล้วคัดลอก **Web app URL**
4. นำ URL ไปใส่ `GAS_URL` ในไฟล์ `config.js`

## 4. ทดสอบ
รันจากเทอร์มินัล (แทน URL ด้วยของจริง):
` + "```" + `bash
curl -L -X POST "<GAS_URL>" -H "Content-Type: text/plain" \
  -d '{"action":"register","name":"ทดสอบ","grade":3,"pin":"1234"}'
` + "```" + `
ควรได้ JSON `{"ok":true,...}`
```

(หมายเหตุสำหรับผู้เขียนแผน: เขียน SETUP.md เป็น Markdown ปกติ ไม่ต้องมี escape แบบข้างบน — ข้างบนหลบ backtick ซ้อนเฉยๆ)

- [ ] **Step 3: ทำตาม SETUP.md จริง แล้วทดสอบด้วย curl**

Run: คำสั่ง curl ใน SETUP.md (หลัง deploy)
Expected: `{"ok":true,"data":{...}}` ; ลอง register ชื่อซ้ำได้ `{"ok":false,"error":"name_taken"}` ; login PIN ผิดได้ `wrong_pin`

- [ ] **Step 4: นำ Web App URL ใส่ `config.js`**

แก้ `GAS_URL` ใน `config.js` เป็น URL จริง

- [ ] **Step 5: Commit**

```bash
git add gas/Code.gs gas/SETUP.md config.js
git commit -m "feat: add Apps Script backend and setup guide"
```

---

## Task 7: ชั้นเรียก API (`api.js`)

**Files:**
- Create: `js/api.js`

**Interfaces:**
- Consumes: `CONFIG.GAS_URL` จาก `config.js`
- Produces: async ฟังก์ชันที่คืน `{ok, data?, error?}` เสมอ:
  - `apiCall(action, payload) -> Promise<{ok,data?,error?}>` (มี retry 2 ครั้งแบบ backoff เมื่อ network error)
  - `register({name,grade,pin})`, `login({name,pin})`, `submitProgress({studentId,addScore,addCoins,stageKey})`, `getLeaderboard(top)`, `getProfile(studentId)` — เป็น wrapper ของ `apiCall`

- [ ] **Step 1: เขียน `js/api.js`**

```js
import { CONFIG } from "../config.js";

// ใช้ text/plain เพื่อเลี่ยง CORS preflight ที่ GAS ไม่รองรับ
async function apiCall(action, payload = {}) {
  const body = JSON.stringify({ action, ...payload });
  let lastErr = "network_error";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(CONFIG.GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
        redirect: "follow",
      });
      const json = await res.json();
      return json; // {ok, data?, error?}
    } catch (err) {
      lastErr = String(err);
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1))); // backoff
    }
  }
  return { ok: false, error: lastErr };
}

export { apiCall };
export const register = (p) => apiCall("register", p);
export const login = (p) => apiCall("login", p);
export const submitProgress = (p) => apiCall("submitProgress", p);
export const getLeaderboard = (top = CONFIG.LEADERBOARD_TOP) => apiCall("getLeaderboard", { top });
export const getProfile = (studentId) => apiCall("getProfile", { studentId });
```

- [ ] **Step 2: ทดสอบด้วยตาในเบราว์เซอร์ console**

Run: เปิดเว็บผ่าน `python3 -m http.server`, ใน console พิมพ์:
`import("./js/api.js").then(m => m.getLeaderboard(5)).then(console.log)`
Expected: ได้ `{ok:true, data:[...]}` (มีข้อมูล register ทดสอบจาก Task 6). ถ้า `GAS_URL` ยังว่างจะได้ error — ตั้งค่าก่อน

- [ ] **Step 3: Commit**

```bash
git add js/api.js
git commit -m "feat: add GAS API client with retry"
```

---

## Task 8: หน้าเข้าสู่ระบบ/ลงทะเบียน (`auth.js`)

**Files:**
- Create: `js/auth.js`
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: `register`, `login` จาก `api.js`; `saveSession`, `saveProgress` จาก `storage.js`
- Produces:
  - `renderAuth({ onAuthed })` — วาดฟอร์มลง `#screen-auth`; เมื่อสำเร็จ บันทึก session+progress ลง localStorage แล้วเรียก `onAuthed(session)` โดย session = `{ studentId, token, displayName, grade }`

- [ ] **Step 1: เขียน `js/auth.js`**

```js
import { register, login } from "./api.js";
import { saveSession, saveProgress } from "./storage.js";

export function renderAuth({ onAuthed }) {
  const el = document.getElementById("screen-auth");
  el.innerHTML = `
    <h1>นักผจญภัยคณิต 🧭</h1>
    <div class="auth-tabs">
      <button id="tab-login" class="tab active">เข้าสู่ระบบ</button>
      <button id="tab-register" class="tab">สมัครใหม่</button>
    </div>
    <div class="auth-form">
      <label>ชื่อเล่น</label>
      <input id="au-name" maxlength="20" />
      <div id="grade-wrap" class="hidden">
        <label>ระดับชั้น</label>
        <select id="au-grade">
          <option value="3">ป.3</option><option value="4">ป.4</option>
          <option value="5">ป.5</option><option value="6">ป.6</option>
        </select>
      </div>
      <label>รหัส PIN 4 หลัก</label>
      <input id="au-pin" type="password" inputmode="numeric" maxlength="4" />
      <button id="au-submit">เข้าเล่น</button>
      <div id="au-msg" class="auth-msg"></div>
    </div>`;

  let mode = "login";
  const gradeWrap = el.querySelector("#grade-wrap");
  const msg = el.querySelector("#au-msg");

  el.querySelector("#tab-login").onclick = () => setMode("login");
  el.querySelector("#tab-register").onclick = () => setMode("register");
  function setMode(m) {
    mode = m;
    el.querySelector("#tab-login").classList.toggle("active", m === "login");
    el.querySelector("#tab-register").classList.toggle("active", m === "register");
    gradeWrap.classList.toggle("hidden", m !== "register");
    msg.textContent = "";
  }

  el.querySelector("#au-submit").onclick = async () => {
    const name = el.querySelector("#au-name").value.trim();
    const pin = el.querySelector("#au-pin").value;
    if (!name) return show("ใส่ชื่อก่อนนะ");
    if (!/^\d{4}$/.test(pin)) return show("PIN ต้องเป็นตัวเลข 4 หลัก");
    show("กำลังเข้าระบบ...");
    let res;
    if (mode === "register") {
      const grade = Number(el.querySelector("#au-grade").value);
      res = await register({ name, grade, pin });
    } else {
      res = await login({ name, pin });
    }
    if (!res.ok) return show(errorText(res.error));
    const d = res.data;
    const session = { studentId: d.studentId, token: d.token, displayName: d.displayName, grade: d.grade };
    saveSession(session);
    saveProgress({ totalScore: d.totalScore || 0, coins: d.coins || 0,
      stagesCleared: (d.progress && d.progress.stagesCleared) || [] });
    onAuthed(session);
  };

  function show(t) { msg.textContent = t; }
}

function errorText(code) {
  const map = {
    name_taken: "ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่นนะ",
    not_found: "ไม่พบชื่อนี้ สมัครใหม่ก่อนนะ",
    wrong_pin: "PIN ไม่ถูกต้อง",
    bad_pin: "PIN ต้องเป็นตัวเลข 4 หลัก",
    bad_grade: "เลือกระดับชั้นก่อนนะ",
  };
  return map[code] || "เน็ตมีปัญหา เดี๋ยวลองใหม่นะ";
}
```

- [ ] **Step 2: เพิ่มสไตล์ auth ใน `css/styles.css`**

```css
h1 { text-align: center; margin: 16px 0 20px; font-size: 1.8rem; }
.auth-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { flex: 1; background: #cfe6ff; color: #036; }
.tab.active { background: #2e9bff; color: #fff; }
.auth-form label { display: block; margin: 12px 0 6px; font-weight: 600; }
.auth-form select { width: 100%; min-height: 48px; font-size: 1.1rem; border-radius: 10px; border: 2px solid #bcd; }
#au-submit { width: 100%; margin-top: 20px; }
.auth-msg { text-align: center; margin-top: 12px; min-height: 24px; color: #d23; }
```

- [ ] **Step 3: แก้ `js/app.js` ให้เริ่มที่หน้า auth**

```js
import { renderAuth } from "./auth.js";

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

showScreen("screen-auth");
renderAuth({
  onAuthed: (session) => {
    console.log("authed", session);
    alert("ยินดีต้อนรับ " + session.displayName);
  },
});
```

- [ ] **Step 4: ทดสอบด้วยตา**

Run: เปิดเว็บ, สมัครนักเรียนใหม่ (ชื่อ+ชั้น+PIN), ควรเห็น alert ต้อนรับ; ออกแล้ว login ด้วย PIN เดิมได้; PIN ผิดขึ้นข้อความ; ตรวจใน Google Sheet ว่ามีแถวใหม่และ pinHash ไม่ใช่ PIN ดิบ
Expected: ทำงานครบ ไม่มี PIN ดิบใน Sheet

- [ ] **Step 5: Commit**

```bash
git add js/auth.js js/app.js css/styles.css
git commit -m "feat: add register/login screen (M2)"
```

---

## Task 9: แผนที่โลก + โซน + ตรรกะปลดล็อก (`world.js`)

**Files:**
- Create: `js/world.js`
- Test: `tests/world.test.js`
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: `CONFIG` จาก `config.js`
- Produces:
  - `ZONES` — array 4 โซน แต่ละอัน `{ id, name, emoji, mult }`
  - `stageKey(zoneId, stageId) -> string` เช่น `stageKey(1,2) === "1-2"`
  - `isStageUnlocked(zoneId, stageId, stagesCleared) -> boolean` — ด่าน 1 ของโซน 1 ปลดล็อกเสมอ; ด่านถัดไปปลดเมื่อด่านก่อนหน้าใน "ลำดับเชิงเส้น" ถูกเคลียร์ (โซนถัดไปเปิดเมื่อเคลียร์ด่านสุดท้ายของโซนก่อน)
  - `renderWorld({ progress, onPlayStage, onOpenLeaderboard })` — วาดแผนที่ลง `#screen-world`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลวก่อน**

สร้าง `tests/world.test.js`:

```js
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
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้มเหลว**

Run: `node --test tests/world.test.js`
Expected: FAIL

- [ ] **Step 3: เขียน `js/world.js`**

```js
import { CONFIG } from "../config.js";

export const ZONES = [
  { id: 1, name: "ป่าเริ่มต้น", emoji: "🌳", mult: 1 },
  { id: 2, name: "ทะเลทราย", emoji: "🏜️", mult: 2 },
  { id: 3, name: "มหาสมุทร", emoji: "🌊", mult: 3 },
  { id: 4, name: "ยอดเขาอวกาศ", emoji: "🏔️", mult: 4 },
];

const N = CONFIG.STAGES_PER_ZONE;

export function stageKey(zoneId, stageId) { return `${zoneId}-${stageId}`; }

// ลำดับเชิงเส้นทั่วทั้งเกม: (z1s1..z1sN, z2s1..z2sN, ...)
// ด่านหนึ่งปลดล็อกเมื่อ "ด่านก่อนหน้าในลำดับ" ถูกเคลียร์
export function isStageUnlocked(zoneId, stageId, stagesCleared) {
  if (zoneId === 1 && stageId === 1) return true;
  let prevZone = zoneId, prevStage = stageId - 1;
  if (prevStage < 1) { prevZone = zoneId - 1; prevStage = N; }
  return stagesCleared.includes(stageKey(prevZone, prevStage));
}

export function renderWorld({ progress, onPlayStage, onOpenLeaderboard }) {
  const el = document.getElementById("screen-world");
  const cleared = progress.stagesCleared || [];
  const zonesHtml = ZONES.map((z) => {
    const stages = [];
    for (let s = 1; s <= N; s++) {
      const key = stageKey(z.id, s);
      const done = cleared.includes(key);
      const unlocked = isStageUnlocked(z.id, s, cleared);
      const cls = done ? "stage done" : unlocked ? "stage open" : "stage locked";
      const label = done ? "⭐" : unlocked ? s : "🔒";
      stages.push(`<button class="${cls}" data-zone="${z.id}" data-stage="${s}" ${unlocked ? "" : "disabled"}>${label}</button>`);
    }
    return `<div class="zone"><div class="zone-title">${z.emoji} ${z.name}</div><div class="stages">${stages.join("")}</div></div>`;
  }).join("");

  el.innerHTML = `
    <div class="world-top">
      <div class="score-badge">คะแนน ${progress.totalScore || 0} · เหรียญ ${progress.coins || 0}</div>
      <button id="open-lb">🏆 อันดับ</button>
    </div>
    <h2>เลือกด่านผจญภัย</h2>
    ${zonesHtml}`;

  el.querySelectorAll(".stage.open, .stage.done").forEach((b) => {
    b.onclick = () => onPlayStage(Number(b.dataset.zone), Number(b.dataset.stage));
  });
  el.querySelector("#open-lb").onclick = onOpenLeaderboard;
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `node --test tests/world.test.js`
Expected: PASS

- [ ] **Step 5: เพิ่มสไตล์แผนที่ใน `css/styles.css`**

```css
.world-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px; }
.score-badge { background: #fff4c2; padding: 8px 12px; border-radius: 10px; font-weight: 600; }
.zone { margin: 16px 0; }
.zone-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; }
.stages { display: flex; gap: 10px; flex-wrap: wrap; }
.stage { width: 60px; height: 60px; min-height: 60px; border-radius: 14px; font-size: 1.2rem; padding: 0; }
.stage.done { background: #ffd23f; color: #7a5a00; }
.stage.open { background: #2e9bff; }
.stage.locked { background: #ccd5dd; color: #889; cursor: not-allowed; }
```

- [ ] **Step 6: Commit**

```bash
git add js/world.js tests/world.test.js css/styles.css
git commit -m "feat: add world map with zones and unlock logic (M3)"
```

---

## Task 10: ต่อทุกอย่างเข้าด้วยกัน + Optimistic sync (`app.js`)

**Files:**
- Modify: `js/app.js`
- Modify: `js/game.js` (ให้กันเล่นด่านที่ล็อก — ป้องกันเรียกผิด)

**Interfaces:**
- Consumes: `renderAuth`; `renderWorld`, `stageKey`; `startStage`; `submitProgress` (api); `loadSession`, `loadProgress`, `saveProgress`, `enqueue`, `dequeueAll`, `clearQueue`
- Produces: flow สมบูรณ์ auth → world → game → กลับ world (คะแนนอัปเดตทันทีแบบ optimistic แล้ว sync ขึ้น GAS เบื้องหลัง + คิวส่งซ้ำถ้าพลาด)

- [ ] **Step 1: เขียน `js/app.js` ฉบับสมบูรณ์**

```js
import { renderAuth } from "./auth.js";
import { renderWorld, stageKey } from "./world.js";
import { startStage } from "./game.js";
import { renderLeaderboard } from "./leaderboard.js";
import * as api from "./api.js";
import * as store from "./storage.js";

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

let session = null;
let progress = { totalScore: 0, coins: 0, stagesCleared: [] };

async function flushQueue() {
  const items = store.dequeueAll();
  if (!items.length) return;
  store.clearQueue();
  for (const it of items) {
    const res = await api.submitProgress(it);
    if (!res.ok) store.enqueue(it); // ยังส่งไม่ได้ เก็บกลับเข้าคิว
  }
}

function goWorld() {
  showScreen("screen-world");
  renderWorld({
    progress,
    onPlayStage: playStage,
    onOpenLeaderboard: openLeaderboard,
  });
}

function playStage(zoneId, stageId) {
  showScreen("screen-game");
  startStage({
    zoneId, stageId,
    onComplete: async (result) => {
      // optimistic: อัปเดตในเครื่องทันที
      const key = stageKey(zoneId, stageId);
      progress.totalScore += result.score;
      progress.coins += result.coins;
      if (!progress.stagesCleared.includes(key) && result.correctCount > 0) {
        progress.stagesCleared.push(key);
      }
      store.saveProgress(progress);
      goWorld();
      // sync เบื้องหลัง
      const payload = { studentId: session.studentId, addScore: result.score,
        addCoins: result.coins, stageKey: key };
      const res = await api.submitProgress(payload);
      if (!res.ok) store.enqueue(payload);
    },
  });
}

function openLeaderboard() {
  showScreen("screen-leaderboard");
  renderLeaderboard({ me: session.displayName, onBack: goWorld });
}

function start() {
  session = store.loadSession();
  const savedProgress = store.loadProgress();
  if (session && savedProgress) {
    progress = savedProgress;
    flushQueue();
    goWorld();
  } else {
    showScreen("screen-auth");
    renderAuth({
      onAuthed: (s) => {
        session = s;
        progress = store.loadProgress() || progress;
        goWorld();
      },
    });
  }
}

start();
```

- [ ] **Step 2: กันเล่นด่านล็อกใน `game.js`**

เพิ่มบรรทัดยามต้นฟังก์ชัน `startStage` (หลังบรรทัด `const el = ...`):

```js
  if (!ZONE_SPECS[zoneId]) { console.warn("bad zone", zoneId); return; }
```

- [ ] **Step 3: ทดสอบ flow เต็มด้วยตา**

Run: เปิดเว็บ → สมัคร/เข้าระบบ → เห็นแผนที่ → เล่นด่าน 1-1 จบ → กลับแผนที่เห็นคะแนนเพิ่มและด่าน 1-1 เป็น ⭐ และ 1-2 ปลดล็อก → รีเฟรชหน้า (ยังอยู่ที่แผนที่ ไม่ต้อง login ใหม่) → เปิด Google Sheet เห็น totalScore เพิ่ม
Expected: ครบทุกอย่าง; ปิดเน็ต (DevTools offline) เล่นด่านได้ คะแนนขึ้นในเครื่อง เปิดเน็ตแล้วรีเฟรช คิวส่งขึ้น Sheet

- [ ] **Step 4: Commit**

```bash
git add js/app.js js/game.js
git commit -m "feat: wire full flow with optimistic sync and offline queue"
```

---

## Task 11: กระดานอันดับ (`leaderboard.js`)

**Files:**
- Create: `js/leaderboard.js`
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: `getLeaderboard` จาก `api.js`
- Produces:
  - `renderLeaderboard({ me, onBack })` — วาดลง `#screen-leaderboard`; ดึงอันดับจาก GAS (มีสถานะ "กำลังโหลด"), ไฮไลต์แถวที่ชื่อตรงกับ `me`, ปุ่มกลับเรียก `onBack`

- [ ] **Step 1: เขียน `js/leaderboard.js`**

```js
import { getLeaderboard } from "./api.js";

export async function renderLeaderboard({ me, onBack }) {
  const el = document.getElementById("screen-leaderboard");
  el.innerHTML = `
    <div class="lb-top"><button id="lb-back">← กลับ</button><h2>🏆 อันดับคะแนนรวม</h2></div>
    <div id="lb-list" class="lb-list">กำลังโหลด...</div>`;
  el.querySelector("#lb-back").onclick = onBack;

  const res = await getLeaderboard();
  const list = el.querySelector("#lb-list");
  if (!res.ok) { list.textContent = "โหลดอันดับไม่ได้ ลองใหม่นะ"; return; }
  if (!res.data.length) { list.textContent = "ยังไม่มีคะแนน มาเป็นคนแรกกัน!"; return; }

  list.innerHTML = res.data.map((r, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
    const mine = r.name === me ? " mine" : "";
    return `<div class="lb-row${mine}"><span class="lb-rank">${medal}</span>
      <span class="lb-name">${escapeHtml(r.name)} <small>ป.${r.grade}</small></span>
      <span class="lb-score">${r.totalScore}</span></div>`;
  }).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
```

- [ ] **Step 2: เพิ่มสไตล์อันดับใน `css/styles.css`**

```css
.lb-top { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.lb-list { display: flex; flex-direction: column; gap: 6px; }
.lb-row { display: flex; align-items: center; gap: 12px; background: #fff; padding: 12px; border-radius: 10px; }
.lb-row.mine { background: #d7f0ff; border: 2px solid #2e9bff; }
.lb-rank { width: 40px; font-size: 1.2rem; text-align: center; }
.lb-name { flex: 1; font-weight: 600; }
.lb-name small { color: #789; font-weight: 400; }
.lb-score { font-weight: 700; color: #036; }
```

- [ ] **Step 3: ทดสอบด้วยตา**

Run: เข้าเกม → เล่นเก็บคะแนน → กด "🏆 อันดับ" → เห็นรายชื่อเรียงตามคะแนน แถวตัวเองไฮไลต์ → กดกลับได้
Expected: อันดับแสดงถูกต้อง, ชื่อเราถูกไฮไลต์

- [ ] **Step 4: Commit**

```bash
git add js/leaderboard.js css/styles.css
git commit -m "feat: add leaderboard screen (M4)"
```

---

## Task 12: Deploy ขึ้น GitHub Pages + คู่มือ (`docs/DEPLOY.md`)

**Files:**
- Create: `docs/DEPLOY.md`
- Create: `README.md`

**Interfaces:**
- Consumes: (ทั้งโปรเจกต์)
- Produces: เว็บใช้งานได้จริงบน GitHub Pages + คู่มือ deploy

- [ ] **Step 1: เขียน `README.md`**

เขียนสรุปโปรเจกต์ (ภาษาไทย): ชื่อเกม, วิธีเล่น, โครงสร้าง, ลิงก์ไป `gas/SETUP.md` และ `docs/DEPLOY.md`, วิธีรันเทสต์ (`node --test`), และวิธีรัน local (`python3 -m http.server`)

- [ ] **Step 2: เขียน `docs/DEPLOY.md`**

```markdown
# วิธี Deploy ขึ้น GitHub Pages

## ก่อน deploy
1. ตั้งค่า Google Apps Script ตาม `gas/SETUP.md` ให้เสร็จ และใส่ `GAS_URL` ใน `config.js` แล้ว
2. commit ทุกอย่างขึ้น branch หลัก

## เปิด GitHub Pages
1. push โปรเจกต์ขึ้น GitHub repository
2. ไปที่ repo > Settings > Pages
3. Source: เลือก "Deploy from a branch"
4. Branch: เลือก `main` (หรือ branch ที่ใช้) โฟลเดอร์ `/ (root)` แล้ว Save
5. รอสักครู่ จะได้ URL เช่น `https://<user>.github.io/<repo>/`

## ตรวจหลัง deploy
- เปิด URL, สมัคร/เข้าเล่น, เล่นด่าน, เปิดอันดับ — ต้องทำงานครบ
- เปิดบนมือถือจริงด้วย (responsive)

## หมายเหตุ
- ถ้าเรียก GAS ไม่ได้ ให้ตรวจว่า deploy GAS เป็น "Anyone" และ `GAS_URL` ถูกต้อง
```

- [ ] **Step 3: รันเทสต์ทั้งหมดครั้งสุดท้ายก่อน deploy**

Run: `node --test`
Expected: PASS ทุกไฟล์ (questions, scoring, storage, world)

- [ ] **Step 4: Commit + push + เปิด Pages**

```bash
git add README.md docs/DEPLOY.md
git commit -m "docs: add README and deploy guide"
```
จากนั้นทำตาม `docs/DEPLOY.md` เพื่อ push และเปิด GitHub Pages

- [ ] **Step 5: ทดสอบ URL จริงบน GitHub Pages**

Run: เปิด URL ของ GitHub Pages บนคอมและมือถือ
Expected: สมัคร/เข้าเล่น/เล่นด่าน/ดูอันดับ ทำงานครบทั้งสองอุปกรณ์

---

## Self-Review Notes

- **Spec coverage:** M1=Task4 · M2=Task6,7,8 · M3=Task9 · M4=Task11 · M6=Task12 · การสร้างโจทย์=Task2 · คะแนน=Task3 · ระบบลื่นไหล(ข้อ5 ของสเปก: optimistic/queue/TextFinder/cache/lock/batch)=Task5,6,10 · ความปลอดภัย(PIN hash/lock/กันโกง)=Task6 · การทดสอบ=Task2,3,5,9. M5 (ฐาน/แต่งตัวละคร) = แผนแยกในอนาคตตามที่ระบุขอบเขต
- **Type consistency:** `stageKey` รูป `"z-s"` ใช้ตรงกันใน world/app/game; payload `submitProgress` = `{studentId, addScore, addCoins, stageKey}` ตรงกันระหว่าง api.js/app.js/Code.gs; ผลลัพธ์ `{ok, data?, error?}` ทั่วทั้งระบบ; session shape `{studentId, token, displayName, grade}` ตรงกันใน auth/app/storage
- **Placeholder scan:** โค้ดครบทุก step ไม่มี TODO/TBD; `GAS_URL` เว้นว่างโดยตั้งใจ (เติมหลัง deploy GAS ที่ Task 6 Step 4)

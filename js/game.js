import { generateStage, ZONE_SPECS } from "./questions.js";
import { computeStageResult } from "./scoring.js";
import { CONFIG } from "../config.js";

const ZONE_MULT = { 1: 1, 2: 2, 3: 3, 4: 4 };

export function startStage({ zoneId, stageId, onComplete }) {
  const el = document.getElementById("screen-game");
  if (!ZONE_SPECS[zoneId]) { console.warn("bad zone", zoneId); return; }
  const spec = ZONE_SPECS[zoneId];
  const questions = generateStage(spec, CONFIG.QUESTIONS_PER_STAGE);
  const answers = [];
  let idx = 0;

  function renderQuestion() {
    const q = questions[idx];
    let answered = false;  // Guard: prevent duplicate answers for this question

    el.innerHTML = `
      <div class="game-hud">ด่าน ${zoneId}-${stageId} · ข้อ ${idx + 1}/${questions.length}</div>
      <div class="question">${q.text} = ?</div>
      <input id="answer-input" type="number" inputmode="numeric" autocomplete="off" />
      <button id="submit-answer">ตอบ</button>
      <div id="feedback" class="feedback"></div>
    `;
    const input = document.getElementById("answer-input");
    input.focus();

    function checkAnswer(given) {
      if (answered) return;  // Guard: already answered this question, ignore re-entry
      answered = true;

      // Treat empty input as incorrect answer (NaN never equals q.answer)
      if (input.value.trim() === "") {
        given = NaN;
      }

      const correct = given === q.answer;
      answers.push(correct);
      const fb = document.getElementById("feedback");
      fb.textContent = correct ? "✅ ถูกต้อง!" : `❌ คำตอบคือ ${q.answer}`;
      fb.className = "feedback " + (correct ? "ok" : "no");
      document.getElementById("submit-answer").disabled = true;
      input.disabled = true;
      input.onkeydown = null;  // Neutralize input to prevent further submissions

      setTimeout(() => {
        idx++;
        if (idx < questions.length) renderQuestion();
        else finish();
      }, 900);
    }

    const submit = () => checkAnswer(Number(input.value));
    document.getElementById("submit-answer").onclick = submit;
    input.onkeydown = (e) => { if (e.key === "Enter") submit(); };
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

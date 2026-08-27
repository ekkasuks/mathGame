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

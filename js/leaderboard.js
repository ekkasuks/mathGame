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

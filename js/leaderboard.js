// STUB: จะถูกแทนที่ทั้งไฟล์ใน Task 11 ด้วยการดึงอันดับจริงจาก GAS
export async function renderLeaderboard({ me, onBack }) {
  const el = document.getElementById("screen-leaderboard");
  el.innerHTML = `
    <h2>🏆 อันดับ (กำลังพัฒนา)</h2>
    <button id="lb-back">← กลับ</button>
  `;
  document.getElementById("lb-back").onclick = onBack;
}

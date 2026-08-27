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

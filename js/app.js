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

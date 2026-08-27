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

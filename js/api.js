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

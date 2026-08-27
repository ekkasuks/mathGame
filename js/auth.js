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

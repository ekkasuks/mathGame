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

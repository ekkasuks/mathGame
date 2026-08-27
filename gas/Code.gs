// Google Apps Script — API สำหรับเกมนักผจญภัยคณิต
// ผูกกับ Google Sheet: แท็บ "Players" และ "Log"

var SHEET_PLAYERS = "Players";
var SHEET_LOG = "Log";
var MAX_SCORE_PER_SUBMIT = 2000; // เพดานกันโกงเบาๆ ต่อการส่ง 1 ครั้ง
var LEADERBOARD_CACHE_SEC = 45;

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var action = req.action;
    var handlers = {
      register: register, login: login, submitProgress: submitProgress,
      getLeaderboard: getLeaderboard, getProfile: getProfile,
    };
    if (!handlers[action]) return out({ ok: false, error: "unknown_action" });
    return out(handlers[action](req));
  } catch (err) {
    return out({ ok: false, error: "server_error: " + err });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function hashPin(pin) {
  var salt = "math-explorer-v1"; // ต้องตรงกับ CONFIG.PIN_SALT ฝั่ง client
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin + salt);
  return raw.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}

function findRowById(sh, studentId) {
  var tf = sh.getRange("A2:A").createTextFinder(studentId).matchEntireCell(true).findNext();
  return tf ? tf.getRow() : -1;
}

function findRowByName(sh, name) {
  var tf = sh.getRange("B2:B").createTextFinder(name).matchEntireCell(true).findNext();
  return tf ? tf.getRow() : -1;
}

function makeToken() { return Utilities.getUuid().replace(/-/g, "").slice(0, 16); }
function makeId() { return "s" + Utilities.getUuid().replace(/-/g, "").slice(0, 10); }

function register(req) {
  var name = String(req.name || "").trim();
  var grade = Number(req.grade);
  var pin = String(req.pin || "");
  if (!name) return { ok: false, error: "name_required" };
  if ([3, 4, 5, 6].indexOf(grade) < 0) return { ok: false, error: "bad_grade" };
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "bad_pin" };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet(SHEET_PLAYERS);
    if (findRowByName(sh, name) > 0) return { ok: false, error: "name_taken" };
    var id = makeId();
    var token = makeToken();
    var now = new Date();
    sh.appendRow([id, name, grade, hashPin(pin), 0, 0, "{}", "{}", now, now]);
    logEvent(id, "register", name);
    return { ok: true, data: { studentId: id, token: token, displayName: name, grade: grade,
      totalScore: 0, coins: 0, progress: {} } };
  } finally { lock.releaseLock(); }
}

function login(req) {
  var name = String(req.name || "").trim();
  var pin = String(req.pin || "");
  var sh = sheet(SHEET_PLAYERS);
  var row = findRowByName(sh, name);
  if (row < 0) return { ok: false, error: "not_found" };
  var vals = sh.getRange(row, 1, 1, 10).getValues()[0];
  if (vals[3] !== hashPin(pin)) return { ok: false, error: "wrong_pin" };
  return { ok: true, data: {
    studentId: vals[0], token: makeToken(), displayName: vals[1], grade: vals[2],
    totalScore: vals[4], coins: vals[5], progress: JSON.parse(vals[6] || "{}") } };
}

function submitProgress(req) {
  var id = String(req.studentId || "");
  var addScore = Number(req.addScore) || 0;
  var addCoins = Number(req.addCoins) || 0;
  var stageKey = String(req.stageKey || "");
  if (addScore < 0 || addScore > MAX_SCORE_PER_SUBMIT) return { ok: false, error: "score_out_of_range" };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet(SHEET_PLAYERS);
    var row = findRowById(sh, id);
    if (row < 0) return { ok: false, error: "not_found" };
    var vals = sh.getRange(row, 1, 1, 10).getValues()[0];
    var progress = JSON.parse(vals[6] || "{}");
    if (!progress.stagesCleared) progress.stagesCleared = [];
    if (stageKey && progress.stagesCleared.indexOf(stageKey) < 0) progress.stagesCleared.push(stageKey);
    var newScore = Number(vals[4]) + addScore;
    var newCoins = Number(vals[5]) + addCoins;
    sh.getRange(row, 5, 1, 2).setValues([[newScore, newCoins]]); // totalScore, coins
    sh.getRange(row, 7).setValue(JSON.stringify(progress));       // progressJSON
    sh.getRange(row, 10).setValue(new Date());                    // updatedAt
    logEvent(id, "submit", "score+" + addScore + " " + stageKey);
    return { ok: true, data: { totalScore: newScore, coins: newCoins, progress: progress } };
  } finally { lock.releaseLock(); }
}

function getLeaderboard(req) {
  var top = Math.min(Number(req.top) || 20, 100);
  var cache = CacheService.getScriptCache();
  var hit = cache.get("lb_" + top);
  if (hit) return { ok: true, data: JSON.parse(hit) };
  var sh = sheet(SHEET_PLAYERS);
  var last = sh.getLastRow();
  var rows = last < 2 ? [] : sh.getRange(2, 1, last - 1, 6).getValues();
  var list = rows.map(function (r) { return { name: r[1], grade: r[2], totalScore: Number(r[4]) }; })
    .sort(function (a, b) { return b.totalScore - a.totalScore; })
    .slice(0, top);
  cache.put("lb_" + top, JSON.stringify(list), LEADERBOARD_CACHE_SEC);
  return { ok: true, data: list };
}

function getProfile(req) {
  var sh = sheet(SHEET_PLAYERS);
  var row = findRowById(sh, String(req.studentId || ""));
  if (row < 0) return { ok: false, error: "not_found" };
  var v = sh.getRange(row, 1, 1, 10).getValues()[0];
  return { ok: true, data: { studentId: v[0], displayName: v[1], grade: v[2],
    totalScore: v[4], coins: v[5], progress: JSON.parse(v[6] || "{}") } };
}

function logEvent(id, action, detail) {
  var sh = sheet(SHEET_LOG);
  if (sh) sh.appendRow([new Date(), id, action, detail]);
}

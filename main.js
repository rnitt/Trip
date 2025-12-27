/* ================= 設定 ================= */
/* ===============================
   基本設定
=============================== */

/* 管理者（なければ空でOK） */
const ADMIN_USERS = [];

/* ===============================
   ユーティリティ
=============================== */

function $(id) {
  return document.getElementById(id);
}

function normalizeUserName(name) {
  return (name || "").trim().toLowerCase();
}

function isAdmin(name) {
  return ADMIN_USERS.includes(normalizeUserName(name));
}

/* ===============================
   JSONP 通信
=============================== */

function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_cb_" + Date.now();

    window[callbackName] = (data) => {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    const script = document.createElement("script");
    script.src = `${url}?callback=${callbackName}`;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/* ===============================
   ロード処理（ロック解除後のみ）
=============================== */

async function loadData() {
  if (!isUnlocked) return;

  try {
    const res = await jsonpRequest(API_URL);
    allRecords = res?.data || [];
    optimisticRecords = [];

    updateUserCandidates();
    renderCalendar();
    renderWeekView();
    updateMemberStatus();
    renderMatchDaysFromCalendar();
  } catch (e) {
    console.error("読み込み失敗", e);
  }
}

/* ===============================
   パスワード処理
=============================== */

function checkPassword() {
  const input = $("password-input")?.value ?? "";

  if (input === APP_PASSWORD) {
    isUnlocked = true;

    $("password-screen")?.classList.add("hidden");
    $("app")?.classList.remove("hidden");

    loadData();
  } else {
    if ($("password-error")) {
      $("password-error").textContent = "パスワードが違います";
    }
  }
}

/* ===============================
   初期化
=============================== */

document.addEventListener("DOMContentLoaded", () => {
  // 初期は必ずロック
  $("app")?.classList.add("hidden");
  $("password-screen")?.classList.remove("hidden");

  $("password-btn")?.addEventListener("click", checkPassword);
  $("password-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkPassword();
  });

  // UIイベント（ロック後に使われる）
  $("prevMonth")?.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  $("nextMonth")?.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  $("prevWeek")?.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 7);
    renderWeekView();
  });

  $("nextWeek")?.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 7);
    renderWeekView();
  });

  $("username")?.addEventListener("input", (e) => {
    selectedUser = e.target.value;
    updateMemberStatus();
  });
});

/* ===============================
   描画系（最低限の安全実装）
=============================== */

function renderCalendar() {
  if (!isUnlocked) return;
  if (!$("calendar")) return;

  // あなたの既存カレンダー描画ロジックをここに
}

function renderWeekView() {
  if (!isUnlocked) return;
  if (!$("week-items")) return;

  // 週表示ロジック
}

function renderMatchDaysFromCalendar() {
  if (!isUnlocked) return;
  if (!$("match-days")) return;

  // マッチ日表示
}

function updateUserCandidates() {
  if (!$("user-list")) return;

  const users = [...new Set(allRecords.map((r) => r.name).filter(Boolean))];
  $("user-list").innerHTML = "";

  users.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    $("user-list").appendChild(option);
  });
}

function updateMemberStatus() {
  if (!$("member-status")) return;

  if (!selectedUser) {
    $("member-status").textContent = "";
    return;
  }

  $("member-status").textContent = isAdmin(selectedUser)
    ? "管理者"
    : "一般メンバー";
}

const API_URL =
  "https://script.google.com/macros/s/AKfycbzo9CduystKPuC8M35s_6C45ha9-0JIDZpeVHNOH9FG3F5bVTFbNMfNEEz8wFFvZlEDEg/exec";

const REQUIRED_MEMBER_COUNT = 5;

const APP_PASSWORD = "まずはありがとう";

/* ================= 正規化・共通 ================= */

function normalizeUserName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isAdmin(name) {
  return ADMIN_USERS.includes(normalizeUserName(name));
}

function sameUser(a, b) {
  return normalizeUserName(a) === normalizeUserName(b);
}

function getUserName() {
  return document.getElementById("username")?.value.trim() || "";
}

function normalizeDate(v) {
  if (!v) return null;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const d = new Date(v);
  if (isNaN(d)) return null;

  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ================= JSONP ================= */

function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);

    window[cb] = (data) => {
      delete window[cb];
      script.remove();
      resolve(data);
    };

    const script = document.createElement("script");
    script.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;

    script.onerror = () => {
      delete window[cb];
      script.remove();
      reject(new Error("jsonp failed"));
    };

    document.body.appendChild(script);
  });
}
async function sendWithRetry(url) {
  try {
    await jsonpRequest(url);
    return true;
  } catch (e) {
    console.warn("通信失敗（ロールバックします）", e);
    return false;
  }
}
function rollbackOne(user, date) {
  // 楽観データから削除
  optimisticRecords = optimisticRecords.filter(
    (r) =>
      !(
        normalizeUserName(r.user) === normalizeUserName(user) &&
        normalizeDate(r.date) === date
      )
  );

  renderCalendar();
  renderWeekView();
  updateMemberStatus();
  renderMatchDaysFromCalendar();
}

/* ================= 状態 ================= */

let allRecords = [];
let optimisticRecords = []; // ← 即時反映用
let monthOffset = 0;
let weekBaseDate = new Date();

/* ================= 表示用レコード ================= */

function getVisibleRecords() {
  return [...allRecords, ...optimisticRecords];
}

/* ================= ユーザー候補 ================= */

function updateUserCandidates() {
  const list = document.getElementById("user-list");
  if (!list) return;

  list.innerHTML = "";

  const users = [
    ...new Set(
      getVisibleRecords()
        .map((r) => normalizeUserName(r.user))
        .filter(Boolean)
    ),
  ];

  users.sort((a, b) => a.localeCompare(b, "ja"));

  for (const name of users) {
    const opt = document.createElement("option");
    opt.value = name;
    list.appendChild(opt);
  }
}

function getUserColor(username) {
  if (!username) return "#4f7cff";

  const found = getVisibleRecords().find(
    (r) => sameUser(r.user, username) && r.color
  );
  return found?.color || "#4f7cff";
}

/* ================= 人数表示 ================= */

function updateMemberStatus() {
  const box = document.getElementById("member-status");
  if (!box) return;

  const uniqueUsers = new Set(
    getVisibleRecords()
      .map((r) => normalizeUserName(r.user))
      .filter(Boolean)
  );

  const me = getUserName();
  const admin = isAdmin(me);

  let text = `現在 ${uniqueUsers.size} / ${REQUIRED_MEMBER_COUNT} 人が登録済み`;

  if (admin) text += "（管理者）";

  if (!admin && uniqueUsers.size >= REQUIRED_MEMBER_COUNT) {
    text += "｜※新規登録はできません（閲覧のみ）";
  }

  box.textContent = text;
}

/* ================= データ取得 ================= */

async function loadData() {
  const res = await jsonpRequest(API_URL);
  allRecords = res.data || [];

  optimisticRecords = [];

  updateUserCandidates();
  renderCalendar();
  renderWeekView();
  updateMemberStatus();

  renderMatchDaysFromCalendar();
}

/* ================= 月表示 ================= */

function getMonthRangeText(dateObj) {
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);

  const fmt = (d) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  return `${fmt(start)} 〜 ${fmt(end)}`;
}

function applyDayStatus(cell, dateStr) {
  const me = getUserName();

  const dayRecords = getVisibleRecords().filter(
    (r) => normalizeDate(r.date) === dateStr
  );

  const isMine = dayRecords.some((r) => sameUser(r.user, me));
  const count = dayRecords.length;

  cell.classList.toggle("selected-by-me", isMine);
  cell.classList.toggle("all-ok", count >= REQUIRED_MEMBER_COUNT);
}

function renderCalendar() {
  const root = document.getElementById("calendar");
  if (!root) return;

  root.innerHTML = "";

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);

  for (let i = 0; i < 3; i++) {
    const d = new Date(base);
    d.setMonth(base.getMonth() + i);
    root.appendChild(renderMonth(d));
  }
}

function renderMonth(dateObj) {
  const box = document.createElement("div");
  box.className = "month-block";

  const title = document.createElement("div");
  title.className = "month-title";

  const name = document.createElement("div");
  name.className = "month-name";
  name.textContent = `${dateObj.getFullYear()}年 ${dateObj.getMonth() + 1}月`;

  const range = document.createElement("div");
  range.className = "month-range";
  range.textContent = getMonthRangeText(dateObj);

  title.append(name, range);
  box.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "month-grid";

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const last = new Date(year, month + 1, 0).getDate();

  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = (firstDay + 6) % 7;

  for (let i = 0; i < startOffset; i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= last; d++) {
    const cell = document.createElement("div");
    cell.className = "day";

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;

    const label = document.createElement("div");
    label.textContent = d;
    cell.appendChild(label);

    applyDayStatus(cell, dateStr);

    cell.onclick = () => onDateClick(dateStr);

    grid.appendChild(cell);
  }

  box.appendChild(grid);
  return box;
}

/* ================= クリック処理（楽観的UI） ================= */

async function onDateClick(dateStr) {
  const username = getUserName();
  if (!username) {
    alert("ユーザー名を入力してください");
    return;
  }

  const normalizedName = normalizeUserName(username);

  const visible = getVisibleRecords();

  const dayRecords = visible.filter((r) => normalizeDate(r.date) === dateStr);

  const myRecord = dayRecords.find((r) => sameUser(r.user, username));

  const uniqueUsers = new Set(
    visible.map((r) => normalizeUserName(r.user)).filter(Boolean)
  );

  const isExistingUser = uniqueUsers.has(normalizedName);

  // 5人制限（管理者除外）
  if (!isAdmin(username)) {
    if (!isExistingUser && uniqueUsers.size >= REQUIRED_MEMBER_COUNT) {
      alert("現在このカレンダーは定員に達しています。\n閲覧のみ可能です。");
      return;
    }
  }

  /* ===== 楽観的更新 ===== */

  if (myRecord) {
    // 削除
    optimisticRecords = optimisticRecords.filter(
      (r) =>
        !(
          normalizeUserName(r.user) === normalizedName &&
          normalizeDate(r.date) === dateStr
        )
    );
  } else {
    // 追加
    optimisticRecords.push({
      user: username,
      date: dateStr,
      color: getUserColor(username),
    });
  }

  renderCalendar();
  renderWeekView();
  updateMemberStatus();

  /* ===== 通信 ===== */ renderMatchDaysFromCalendar();

  let params;

  if (myRecord) {
    params = new URLSearchParams({
      action: "delete",
      user: username,
      date: dateStr,
    });
  } else {
    let color = getUserColor(username);

    if (!color || color === "#4f7cff") {
      const select = document.getElementById("colorSelect");
      color =
        select?.value === "custom"
          ? document.getElementById("customColor")?.value
          : select?.value || "#4f7cff";
    }

    params = new URLSearchParams({
      action: "add",
      user: username,
      date: dateStr,
      color,
    });
  }

  const ok = await sendWithRetry(`${API_URL}?${params.toString()}`);

  if (!ok) {
    // 失敗した場合のみ、その1件を取り消す
    rollbackOne(username, dateStr);
    alert("通信に失敗したため、この操作は取り消されました。");
  } else {
    // 成功時はあとで正規データと同期（任意）
    setTimeout(loadData, 300);
  }
}

/* ================= 週表示 ================= */

function updateWeekTitle() {
  const title = document.getElementById("week-title");
  if (!title) return;

  const base = new Date(weekBaseDate);
  const offset = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - offset);

  const start = new Date(base);
  const end = new Date(base);
  end.setDate(start.getDate() + 6);

  const fmt = (d) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  title.textContent = `${fmt(start)} 〜 ${fmt(end)} の予定`;
}

function renderWeekView() {
  const box = document.querySelector(".week-items");
  if (!box) return;

  box.innerHTML = "";

  const base = new Date(weekBaseDate);
  const offset = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - offset);

  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);

    const dateStr = toDateString(d);

    const records = getVisibleRecords().filter(
      (r) => normalizeDate(r.date) === dateStr
    );

    const row = document.createElement("div");
    row.className = "week-row";

    const dateLabel = document.createElement("span");
    dateLabel.textContent = `${dateStr}：`;
    row.appendChild(dateLabel);

    records.forEach((r, index) => {
      const span = document.createElement("span");
      span.textContent = r.user;

      if (r.color) {
        span.style.borderLeft = `4px solid ${r.color}`;
        span.style.paddingLeft = "6px";
      }

      if (index < records.length - 1) {
        span.textContent += ", ";
      }

      row.appendChild(span);
    });

    box.appendChild(row);
  }

  updateWeekTitle();
}
function renderMatchDaysFromCalendar() {
  const box = document.getElementById("match-days");
  if (!box) return;

  box.innerHTML = "";

  const records = getVisibleRecords();

  // 全ユーザー一覧（正規化済み）
  const allUsers = new Set(
    records.map((r) => normalizeUserName(r.user)).filter(Boolean)
  );

  if (allUsers.size === 0) {
    box.textContent = "まだ参加者がいません。";
    return;
  }

  // date -> Set(users)
  const map = new Map();

  for (const r of records) {
    const date = normalizeDate(r.date);
    if (!date) continue;

    if (!map.has(date)) map.set(date, new Set());
    map.get(date).add(normalizeUserName(r.user));
  }

  const matchedDates = [];

  for (const [date, usersOfDay] of map.entries()) {
    // 全員がその日に含まれているか？
    let allMatched = true;

    for (const u of allUsers) {
      if (!usersOfDay.has(u)) {
        allMatched = false;
        break;
      }
    }

    if (allMatched) matchedDates.push(date);
  }

  matchedDates.sort();

  if (matchedDates.length === 0) {
    box.textContent = "まだ全員の予定が一致している日はありません。";
    return;
  }

  for (const date of matchedDates) {
    const item = document.createElement("div");
    item.textContent = date.replaceAll("-", "/");

    box.appendChild(item);
  }
}
function checkPassword() {
  const input = document.getElementById("password-input").value;

  if (input === APP_PASSWORD) {
    isUnlocked = true;
    document.getElementById("password-screen").style.display = "none";
    document.getElementById("app").style.display = "block";
  } else {
    document.getElementById("password-error").textContent =
      "パスワードが違います";
  }
}

/* ================= 起動 ================= */

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  document.getElementById("username")?.addEventListener("input", () => {
    renderCalendar();
    renderWeekView();
    updateMemberStatus();
    renderMatchDaysFromCalendar();
  });

  document.getElementById("prevWeek")?.addEventListener("click", () => {
    weekBaseDate.setDate(weekBaseDate.getDate() - 7);
    renderWeekView();
    renderMatchDaysFromCalendar();
  });

  document.getElementById("nextWeek")?.addEventListener("click", () => {
    weekBaseDate.setDate(weekBaseDate.getDate() + 7);
    renderWeekView();
    renderMatchDaysFromCalendar();
  });

  document.getElementById("prevMonth")?.addEventListener("click", () => {
    monthOffset--;
    renderCalendar();
    renderMatchDaysFromCalendar();
  });

  document.getElementById("nextMonth")?.addEventListener("click", () => {
    monthOffset++;
    renderCalendar();
    renderMatchDaysFromCalendar();
  });
});
document
  .getElementById("password-btn")
  ?.addEventListener("click", checkPassword);
document.addEventListener("DOMContentLoaded", () => {
  if (!isUnlocked) {
    document.getElementById("app").style.display = "none";
    document.getElementById("password-screen").style.display = "block";
    return;
  }
});

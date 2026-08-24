const DB_FILES = {
  profile: "./db/profile.json",
  body: "./db/body.json",
  food: "./db/food.json",
  fitness: "./db/fitness.json",
  coach: "./db/coach.json",
};

const LOCAL_KEY = "bodyfit.local.v1";
const TOKEN_KEY = "bodyfit.github.token";

function nowIso(tz = "Asia/Hong_Kong") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}+08:00`;
}

export function hkDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function hkTime(d = new Date()) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLocal(local) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
}

async function fetchJson(url) {
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`讀取失敗 ${url}`);
  return res.json();
}

function mergeRecords(remote = [], local = []) {
  const map = new Map();
  for (const row of remote) map.set(row.id, row);
  for (const row of local) map.set(row.id, row);
  return [...map.values()].sort((a, b) =>
    String(b.measuredAt || b.eatenAt || b.trainedAt || b.createdAt).localeCompare(
      String(a.measuredAt || a.eatenAt || a.trainedAt || a.createdAt),
    ),
  );
}

export async function loadDB() {
  const [profile, body, food, fitness, coach] = await Promise.all(
    Object.values(DB_FILES).map((u) => fetchJson(u)),
  );
  const local = loadLocal();
  return {
    profile,
    body: { ...body, records: mergeRecords(body.records, local.body) },
    food: { ...food, records: mergeRecords(food.records, local.food) },
    fitness: { ...fitness, records: mergeRecords(fitness.records, local.fitness) },
    coach: { ...coach, messages: mergeRecords(coach.messages, local.coach) },
    local,
  };
}

export function queueRecord(kind, record) {
  const local = loadLocal();
  const key = kind === "coach" ? "coach" : kind;
  local[key] = [...(local[key] || []).filter((x) => x.id !== record.id), record];
  saveLocal(local);
  return local;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

export async function commitJson({ owner, repo, branch, path, json, token, message }) {
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
  const existing = await fetch(`${api}?ref=${branch}`, { headers });
  const sha = existing.ok ? (await existing.json()).sha : undefined;
  const body = {
    message: message || `data: 更新 ${path}`,
    content: utf8ToBase64(JSON.stringify(json, null, 2) + "\n"),
    branch,
  };
  if (sha) body.sha = sha;
  const res = await fetch(api, { method: "PUT", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub 寫入失敗：${res.status} ${err}`);
  }
  return res.json();
}

export function latest(records) {
  return records?.[0] || null;
}

export function onDate(records, date, field) {
  return (records || []).filter((r) => (r.date || String(r[field] || "").slice(0, 10)) === date);
}

export function sum(records, key) {
  return records.reduce((n, r) => n + (Number(r[key]) || 0), 0);
}

export function daysUntil(deadline, tz = "Asia/Hong_Kong") {
  const today = hkDate();
  const a = new Date(`${today}T00:00:00+08:00`);
  const b = new Date(`${deadline}T00:00:00+08:00`);
  return Math.round((b - a) / 86400000);
}

export function weekdayHK(d = new Date()) {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    weekday: "short",
  }).format(d);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd] ?? 0;
}

export function currentMealSlot(t = hkTime()) {
  const [h, m] = t.split(":").map(Number);
  const mins = h * 60 + m;
  if (mins < 11 * 60) return "breakfast";
  if (mins < 16 * 60) return "lunch";
  if (mins < 21 * 60) return "dinner";
  return "snack";
}

export function mealLabel(id) {
  return { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "小食" }[id] || id;
}

export function statusTone(status) {
  if (!status) return "info";
  if (status === "標準") return "ok";
  if (status === "不足" || status === "偏低" || status === "過低") return "low";
  return "high";
}

export function uid(prefix) {
  return `${prefix}-${hkDate().replaceAll("-", "")}-${Math.random().toString(36).slice(2, 7)}`;
}

export { nowIso, loadLocal, saveLocal };

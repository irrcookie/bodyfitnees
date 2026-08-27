/** 飲食頁：時間帶同每日合計（純函式，方便測試）。 */

export const FOOD_TIME_BANDS = [
  { id: "breakfast", label: "早餐", startMin: 5 * 60, endMin: 11 * 60, hint: "05:00–11:00", flex: 60 },
  { id: "lunch", label: "午餐", startMin: 11 * 60, endMin: 16 * 60 + 30, hint: "11:00–16:30", flex: 55 },
  { id: "dinner", label: "晚餐", startMin: 16 * 60 + 30, endMin: 21 * 60, hint: "16:30–21:00", flex: 45 },
  { id: "latenight", label: "宵夜", startMin: 21 * 60, endMin: 24 * 60, hint: "21:00–24:00", flex: 30 },
];

export const FOOD_METRICS = {
  kcal: {
    id: "kcal",
    key: "totalKcal",
    title: "每日熱量",
    unit: "kcal",
    targetKey: "kcalTarget",
    color: "#3d9eff",
  },
  protein: {
    id: "protein",
    key: "totalProteinG",
    title: "每日蛋白質",
    unit: "g",
    targetKey: "proteinG",
    color: "#3dffb0",
  },
  fat: {
    id: "fat",
    key: "totalFatG",
    title: "每日脂肪",
    unit: "g",
    targetKey: "fatG",
    color: "#ff8a3d",
  },
  chol: {
    id: "chol",
    key: "totalCholesterolMg",
    title: "每日膽固醇",
    unit: "mg",
    targetKey: "cholesterolMg",
    color: "#ff5d73",
  },
};

export function minutesFromEatenAt(iso) {
  const hm = String(iso || "").slice(11, 16);
  const [h, m] = hm.split(":").map(Number);
  if (!Number.isFinite(h)) return 12 * 60;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

export function formatHkHm(iso) {
  const hm = String(iso || "").slice(11, 16);
  return /^\d{2}:\d{2}$/.test(hm) ? hm : "—";
}

/** HKT 分鐘 → 時間帶。05:00–11:00 含 11:00 當早餐；00:00–05:00 歸宵夜（單日欄放最底）。 */
export function bandIdForMinutes(mins) {
  const n = Number(mins);
  if (!Number.isFinite(n)) return "lunch";
  if (n >= 5 * 60 && n <= 11 * 60) return "breakfast";
  if (n > 11 * 60 && n < 16 * 60 + 30) return "lunch";
  if (n >= 16 * 60 + 30 && n < 21 * 60) return "dinner";
  return "latenight";
}

export function recordsByTimeBand(records) {
  const groups = { breakfast: [], lunch: [], dinner: [], latenight: [] };
  const sorted = [...(records || [])].sort((a, b) => String(a.eatenAt || "").localeCompare(String(b.eatenAt || "")));
  for (const rec of sorted) {
    const id = bandIdForMinutes(minutesFromEatenAt(rec.eatenAt));
    groups[id].push(rec);
  }
  return groups;
}

export function dailyFoodTotals(records) {
  const map = new Map();
  for (const rec of records || []) {
    const date = rec.date || String(rec.eatenAt || "").slice(0, 10);
    if (!date) continue;
    const row = map.get(date) || {
      date,
      totalKcal: 0,
      totalProteinG: 0,
      totalFatG: 0,
      totalCholesterolMg: 0,
    };
    row.totalKcal += Number(rec.totalKcal) || 0;
    row.totalProteinG += Number(rec.totalProteinG) || 0;
    row.totalFatG += Number(rec.totalFatG) || 0;
    row.totalCholesterolMg += Number(rec.totalCholesterolMg) || 0;
    map.set(date, row);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** 由最早紀錄去到 endDate，中間冇入餐嘅日子當 0，趨勢線先有足夠日子。 */
export function dailyFoodSeries(records, { endDate, minDays = 7, maxDays = 21 } = {}) {
  const totals = dailyFoodTotals(records);
  const byDate = new Map(totals.map((row) => [row.date, row]));
  const last = endDate || totals.at(-1)?.date;
  if (!last) return [];
  const first = totals[0]?.date || last;
  const lastMs = Date.parse(`${last}T00:00:00+08:00`);
  const firstMs = Date.parse(`${first}T00:00:00+08:00`);
  if (!Number.isFinite(lastMs)) return [];
  const spanDays = Number.isFinite(firstMs) ? Math.floor((lastMs - firstMs) / 86400000) + 1 : 1;
  const days = Math.max(minDays, Math.min(maxDays, spanDays));
  const empty = (date) => ({
    date,
    totalKcal: 0,
    totalProteinG: 0,
    totalFatG: 0,
    totalCholesterolMg: 0,
  });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const ms = lastMs - i * 86400000;
    const date = new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
    out.push(byDate.get(date) || empty(date));
  }
  return out;
}

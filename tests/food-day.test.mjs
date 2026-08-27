import test from "node:test";
import assert from "node:assert/strict";
import {
  bandIdForMinutes,
  dailyFoodSeries,
  dailyFoodTotals,
  formatHkHm,
  minutesFromEatenAt,
  recordsByTimeBand,
} from "../assets/js/food-day.js";
import { readJson } from "../scripts/validate-db.mjs";

test("時間帶：早餐含 11:00，宵夜包過夜", () => {
  assert.equal(bandIdForMinutes(5 * 60), "breakfast");
  assert.equal(bandIdForMinutes(11 * 60), "breakfast");
  assert.equal(bandIdForMinutes(11 * 60 + 1), "lunch");
  assert.equal(bandIdForMinutes(16 * 60 + 29), "lunch");
  assert.equal(bandIdForMinutes(16 * 60 + 30), "dinner");
  assert.equal(bandIdForMinutes(20 * 60 + 50), "dinner");
  assert.equal(bandIdForMinutes(21 * 60), "latenight");
  assert.equal(bandIdForMinutes(23 * 60 + 5), "latenight");
  assert.equal(bandIdForMinutes(2 * 60), "latenight");
});

test("eatenAt 轉分鐘同時間", () => {
  assert.equal(minutesFromEatenAt("2026-08-27T11:00:00+08:00"), 11 * 60);
  assert.equal(formatHkHm("2026-08-27T20:50:00+08:00"), "20:50");
});

test("今日紀錄按時間帶分，唔按 meal type", () => {
  const groups = recordsByTimeBand([
    { eatenAt: "2026-08-26T23:05:00+08:00", meal: "snack", id: "a" },
    { eatenAt: "2026-08-27T11:00:00+08:00", meal: "breakfast", id: "b" },
    { eatenAt: "2026-08-27T13:34:00+08:00", meal: "lunch", id: "c" },
  ]);
  assert.equal(groups.breakfast[0].id, "b");
  assert.equal(groups.lunch[0].id, "c");
  assert.equal(groups.latenight[0].id, "a");
  assert.equal(groups.dinner.length, 0);
});

test("每日合計按 date group", () => {
  const rows = dailyFoodTotals([
    { date: "2026-08-26", totalKcal: 100, totalProteinG: 10, totalFatG: 2, totalCholesterolMg: 5 },
    { date: "2026-08-26", totalKcal: 50, totalProteinG: 5, totalFatG: 1, totalCholesterolMg: 3 },
    { date: "2026-08-27", totalKcal: 200, totalProteinG: 20, totalFatG: 4, totalCholesterolMg: 8 },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].date, "2026-08-26");
  assert.equal(rows[0].totalKcal, 150);
  assert.equal(rows[1].totalProteinG, 20);
});

test("種子 food.json 有足夠日子畫趨勢", () => {
  const food = readJson("db/food.json");
  const series = dailyFoodSeries(food.records, { endDate: "2026-08-27" });
  assert.ok(series.length >= 7);
  assert.equal(series.at(-1).date, "2026-08-27");
  const logged = series.filter((r) => r.totalKcal > 0);
  assert.ok(logged.length >= 3);
  const day26 = series.find((r) => r.date === "2026-08-26");
  assert.ok(day26.totalKcal > 2000);
});

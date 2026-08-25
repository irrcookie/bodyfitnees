#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function validateAll() {
  const profile = readJson("db/profile.json");
  const body = readJson("db/body.json");
  const food = readJson("db/food.json");
  const fitness = readJson("db/fitness.json");
  const coach = readJson("db/coach.json");

  assert(profile.heightCm === 170, "身高應為 170cm");
  assert(profile.age === 28, "年齡應為 28");
  assert(profile.goal?.deadline === "2026-11-01", "目標限期應為 2026-11-01");
  assert(profile.goal?.targetWeightKg === 72, "目標體重應為 72kg");
  assert(profile.nutrition?.kcalTarget === 2200, "卡路里參考應為 2200");
  assert(profile.nutrition?.proteinG === 160, "蛋白質參考應為 160g");
  assert(profile.nutrition?.fatG === 70, "脂肪參考應為 70g");
  assert(profile.nutrition?.cholesterolMg === 300, "膽固醇參考應為 300mg");
  const times = (profile.nutrition?.meals || []).map((m) => m.remindAt);
  assert(times.includes("09:30") && times.includes("13:30") && times.includes("20:00"), "飲食提醒要 09:30 / 13:30 / 20:00");

  assert(body.version >= 1 && Array.isArray(body.records) && body.records.length >= 1, "body.json 要有至少一條紀錄");
  for (const row of body.records) {
    assert(row.id && row.measuredAt && typeof row.weightKg === "number" && row.source, `身體紀錄缺欄 ${row.id || "?"}`);
  }

  const meals = new Set(["breakfast", "lunch", "dinner", "snack"]);
  assert(Array.isArray(food.records), "food.json 要有 records");
  for (const row of food.records) {
    assert(row.id && row.eatenAt && meals.has(row.meal) && row.source, `飲食紀錄缺欄 ${row.id || "?"}`);
  }

  const types = new Set(["strength", "cardio", "sports", "mobility", "other"]);
  assert(Array.isArray(fitness.records), "fitness.json 要有 records");
  for (const row of fitness.records) {
    assert(row.id && row.trainedAt && row.title && types.has(row.type) && row.source, `訓練紀錄缺欄 ${row.id || "?"}`);
  }

  assert(Array.isArray(coach.messages), "coach.json 要有 messages");
  for (const row of coach.messages) {
    assert(row.id && row.body && row.role, `教練訊息缺欄 ${row.id || "?"}`);
  }

  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const needle of ["viewport-fit=cover", "apple-mobile-web-app-capable", "black-translucent", "apple-touch-icon", "zh-HK"]) {
    assert(html.includes(needle), `index.html 缺少 ${needle}`);
  }
  const css = fs.readFileSync(path.join(root, "assets/css/app.css"), "utf8");
  assert(css.includes("safe-area-inset-top"), "CSS 要處理 safe-area-inset-top");
  assert(css.includes("safe-area-inset-bottom"), "CSS 要處理 safe-area-inset-bottom");
  assert(css.includes("#3d9eff"), "要有 tech blue");
  return true;
}

if (path.basename(process.argv[1] || "") === "validate-db.mjs") {
  validateAll();
  console.log("DB 同 PWA 檢查通過");
}

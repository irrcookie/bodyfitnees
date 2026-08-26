import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateAll, readJson } from "../scripts/validate-db.mjs";

test("三個 schema 檔存在", () => {
  for (const f of ["db/schema/body.schema.json", "db/schema/food.schema.json", "db/schema/fitness.schema.json"]) {
    assert.equal(fs.existsSync(f), true, f);
  }
});

test("DB 同 PWA 契約", () => {
  assert.equal(validateAll(), true);
});

test("冇 dummy 餐", () => {
  const food = readJson("db/food.json");
  assert.equal(food.records.some((r) => String(r.id).includes("demo")), false);
});

test("小米種子數據", () => {
  const body = readJson("db/body.json");
  const row = body.records.find((r) => r.id === "body-20260823-2136");
  assert.ok(row);
  assert.equal(row.weightKg, 72.7);
  assert.equal(row.bodyFatPercent, 22.7);
  assert.equal(row.muscleMassKg, 53.3);
  assert.equal(row.bodyType, "肥胖");
  const latest = body.records[0];
  assert.equal(latest.id, "body-20260826-0904");
  assert.equal(latest.weightKg, 70.7);
  assert.equal(latest.bodyFatPercent, 21.9);
});

test("營養參考分開", () => {
  const p = readJson("db/profile.json");
  assert.equal(p.heightCm, 170);
  assert.equal(p.goal.deadline, "2026-11-01");
  assert.equal(p.nutrition.kcalTarget, 2200);
  assert.equal(p.nutrition.proteinG, 160);
  assert.equal(p.nutrition.fatG, 70);
  assert.equal(p.nutrition.cholesterolMg, 300);
});

test("iPhone Web App meta", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /black-translucent/);
  assert.match(html, /lang="zh-HK"/);
  const nav = html.slice(html.indexOf("tabbar"));
  assert.ok(nav.indexOf("飲食") < nav.indexOf("身體"), "飲食要放開頭");
  assert.ok(nav.indexOf("身體") < nav.indexOf("訓練"), "身體喺訓練前面");
  assert.equal(html.includes("教練"), false);
  assert.equal(html.includes("總覽"), false);
  const js = fs.readFileSync("assets/js/app.js", "utf8");
  const kcalJs = fs.readFileSync("assets/js/kcal-burn.js", "utf8");
  assert.equal(js.includes("加入主畫面"), false);
  assert.match(kcalJs, /卡路里攝取量/);
  assert.match(js, /蛋白質攝取量/);
  assert.match(js, /脂肪攝取量/);
  assert.match(js, /膽固醇攝取量/);
  assert.equal(js.includes("快速輸入"), false);
  assert.equal(js.includes("存訓練"), false);
  assert.match(js, /肌群力量/);
  assert.match(fs.readFileSync("assets/js/meal-tone.js", "utf8"), /meal-card-good/);
  assert.match(fs.readFileSync("assets/css/app.css", "utf8"), /meal-card-warn/);
});

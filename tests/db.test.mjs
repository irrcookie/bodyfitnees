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

test("小米種子數據", () => {
  const body = readJson("db/body.json");
  const row = body.records[0];
  assert.equal(row.weightKg, 72.7);
  assert.equal(row.bodyFatPercent, 22.7);
  assert.equal(row.muscleMassKg, 53.3);
  assert.equal(row.bodyType, "肥胖");
});

test("個人目標", () => {
  const p = readJson("db/profile.json");
  assert.equal(p.heightCm, 170);
  assert.equal(p.goal.deadline, "2026-11-01");
  assert.equal(p.goal.targetWeightKg, 72);
  assert.equal(p.goal.targetBodyFatPercent, 15);
});

test("iPhone Web App meta", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /black-translucent/);
  assert.match(html, /lang="zh-HK"/);
});

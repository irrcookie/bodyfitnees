import test from "node:test";
import assert from "node:assert/strict";
import { mealHealth } from "../assets/js/meal-tone.js";
import { readJson } from "../scripts/validate-db.mjs";

const nutrition = readJson("db/profile.json").nutrition;

test("高蛋白餐綠色", () => {
  const h = mealHealth(
    { meal: "breakfast", totalKcal: 380, totalProteinG: 74, totalFatG: 4, totalCholesterolMg: 72 },
    nutrition,
  );
  assert.equal(h.tone, "good");
  assert.equal(h.className, "meal-card-good");
});

test("均衡餐無色", () => {
  const h = mealHealth(
    { meal: "lunch", totalKcal: 550, totalProteinG: 37, totalFatG: 12, totalCholesterolMg: 70 },
    nutrition,
  );
  assert.equal(h.tone, "ok");
  assert.equal(h.className, "");
});

test("高脂膽固醇餐黃色", () => {
  const h = mealHealth(
    { meal: "dinner", totalKcal: 980, totalProteinG: 44, totalFatG: 46, totalCholesterolMg: 180 },
    nutrition,
  );
  assert.equal(h.tone, "warn");
  assert.equal(h.className, "meal-card-warn");
});

test("種子餐對應三色", () => {
  const food = readJson("db/food.json");
  const tones = food.records.map((r) => mealHealth(r, nutrition).tone);
  assert.deepEqual(tones.sort(), ["good", "ok", "warn"].sort());
});

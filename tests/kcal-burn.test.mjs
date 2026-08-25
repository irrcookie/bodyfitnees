import test from "node:test";
import assert from "node:assert/strict";
import { sessionKcal, totalTrainKcal, kcalIntakeCard, BURN_COLOR, EATEN_COLOR } from "../assets/js/kcal-burn.js";

test("有 kcalBurned 用紀錄", () => {
  assert.equal(sessionKcal({ kcalBurned: 320, durationMin: 40 }, 72.7), 320);
});

test("冇消耗就用時長估算", () => {
  const kcal = sessionKcal({ type: "strength", durationMin: 60 }, 72.7);
  assert.equal(kcal, Math.round(6 * 72.7));
});

test("今日訓練加總", () => {
  assert.equal(
    totalTrainKcal(
      [
        { kcalBurned: 200 },
        { type: "strength", durationMin: 30, weightKg: 72.7 },
      ],
      72.7,
    ),
    200 + Math.round(6 * 72.7 * 0.5),
  );
});

test("飲食卡冇訓練時只顯示進食", () => {
  const html = kcalIntakeCard({ eaten: 1070, burned: 0, target: 2200 });
  assert.match(html, /卡路里攝取量/);
  assert.match(html, /1,070/);
  assert.equal(html.includes("訓練 −"), false);
  assert.equal(html.includes("kcal-burn-label"), false);
});

test("飲食卡有訓練時紫色扣減", () => {
  const html = kcalIntakeCard({ eaten: 1070, burned: 350, target: 2200 });
  assert.match(html, /訓練 −350/);
  assert.match(html, /淨攝取 720/);
  assert.match(html, new RegExp(BURN_COLOR));
  assert.match(html, new RegExp(EATEN_COLOR));
  assert.match(html, /has-burn/);
  assert.match(html, /進食/);
  assert.match(html, /訓練消耗/);
});

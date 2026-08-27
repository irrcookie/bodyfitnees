import test from "node:test";
import assert from "node:assert/strict";
import { baselineTrend, sparkline } from "../assets/js/charts.js";

test("baselineTrend 空數據", () => {
  assert.match(baselineTrend([], 2200), /暫時未有趨勢/);
});

test("baselineTrend 有目標線同高過／低過分色", () => {
  const html = baselineTrend([1800, 2500, 2100], 2200, 320, 168, {
    unit: "kcal",
    labels: ["2026-08-25", "2026-08-26", "2026-08-27"],
  });
  assert.match(html, /目標 2200 kcal/);
  assert.match(html, /trend-baseline/);
  assert.match(html, /trend-above/);
  assert.match(html, /trend-below/);
  assert.match(html, /clip-path/);
  assert.match(html, /08-25/);
  assert.match(html, /#ff8a3d/);
  assert.match(html, /#3d9eff/);
});

test("sparkline 仍然可用", () => {
  const html = sparkline([22.7, 21.9], 15);
  assert.match(html, /目標 15/);
});

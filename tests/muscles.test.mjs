import test from "node:test";
import assert from "node:assert/strict";
import { inferMuscles, exerciseLoad, muscleStats } from "../assets/js/muscles.js";

test("動作名稱推斷肌群", () => {
  assert.deepEqual(inferMuscles("器械臥推"), ["chest"]);
  assert.ok(inferMuscles("深蹲").includes("quads"));
  assert.ok(inferMuscles("坐姿划船").includes("back"));
});

test("kg × 組 × 次數計訓練量", () => {
  const load = exerciseLoad({ name: "腿舉", sets: 4, reps: 10, weightKg: 80 });
  assert.equal(load.volume, 3200);
  assert.ok(load.e1rm > 80);
});

test("肌群趨勢按日期累積", () => {
  const stats = muscleStats([
    {
      date: "2026-08-18",
      trainedAt: "2026-08-18T20:00:00+08:00",
      exercises: [{ name: "臥推", sets: 4, reps: 8, weightKg: 60, muscleGroups: ["chest"] }],
    },
    {
      date: "2026-08-22",
      trainedAt: "2026-08-22T20:00:00+08:00",
      exercises: [{ name: "臥推", sets: 4, reps: 8, weightKg: 65, muscleGroups: ["chest"] }],
    },
  ]);
  assert.equal(stats.byId.chest.sessions, 2);
  assert.equal(stats.byId.chest.series.length, 2);
  assert.ok(stats.byId.chest.series[1].e1rm > stats.byId.chest.series[0].e1rm);
  assert.equal(stats.byId.quads.volume, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("QA UI 腳本通過", () => {
  const r = spawnSync(process.execPath, ["scripts/qa-ui.mjs"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /通過/);
});

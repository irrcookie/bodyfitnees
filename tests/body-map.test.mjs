import test from "node:test";
import assert from "node:assert/strict";
import { GROUP_TO_APP, renderBodyMap } from "../assets/js/body-map.js";
import { MALE_FRONT } from "../assets/js/vendor/male-front.js";
import { MALE_BACK } from "../assets/js/vendor/male-back.js";

test("MuscleMap 路徑都有對應肌群", () => {
  for (const diagram of [MALE_FRONT, MALE_BACK]) {
    assert.match(diagram.viewBox, /1024 1536/);
    assert.ok(diagram.outline.length >= 1);
    assert.ok(diagram.muscles.length > 10);
    for (const m of diagram.muscles) {
      assert.ok(GROUP_TO_APP[m.group], `未對應 ${m.group}`);
      assert.ok(m.d?.length > 20, `${m.group} 路徑太短`);
    }
  }
});

test("正面圖可以撳胸同股四", () => {
  const html = renderBodyMap({ byId: { chest: { heat: 1 }, quads: { heat: 0.4 } } }, { view: "front", selected: "chest" });
  assert.match(html, /viewBox="0 0 1024 1536"/);
  assert.match(html, /data-muscle="chest"/);
  assert.match(html, /data-muscle="quads"/);
  assert.match(html, /class="body-muscle is-on"/);
});

test("背面圖有背同臀", () => {
  const html = renderBodyMap({}, { view: "back", selected: "back" });
  assert.match(html, /data-muscle="back"/);
  assert.match(html, /data-muscle="glutes"/);
  assert.match(html, /data-muscle="hamstrings"/);
});

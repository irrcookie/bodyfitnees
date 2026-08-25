/**
 * Interactive body map — MuscleMap male diagrams (MIT).
 * Source: https://github.com/Jsplice/MuscleMap
 */
import { MALE_FRONT } from "./vendor/male-front.js";
import { MALE_BACK } from "./vendor/male-back.js";

export const GROUP_TO_APP = {
  CHEST: "chest",
  SHOULDERS_FRONT: "shoulders",
  SHOULDERS_SIDE: "shoulders",
  SHOULDERS_REAR: "shoulders",
  BICEPS: "biceps",
  TRICEPS: "triceps",
  FOREARMS: "forearms",
  LATS: "back",
  BACK_LOWER: "back",
  TRAPEZIUS: "back",
  RHOMBOIDS: "back",
  CORE: "core",
  OBLIQUES: "core",
  QUADS: "quads",
  ADDUCTORS: "quads",
  ABDUCTORS: "quads",
  GLUTES: "glutes",
  HAMSTRINGS: "hamstrings",
  CALVES: "calves",
};

export function muscleFill(t) {
  const x = Math.max(0, Math.min(1, t || 0));
  const r = Math.round(52 + (61 - 52) * x);
  const g = Math.round(72 + (158 - 72) * x);
  const b = Math.round(108 + (255 - 108) * x);
  const a = 0.58 + 0.38 * x;
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

export function renderBodyMap(stats, { view = "front", selected = "chest" } = {}) {
  const diagram = view === "back" ? MALE_BACK : MALE_FRONT;
  const heatOf = (id) => stats?.byId?.[id]?.heat || 0;
  const sil = diagram.outline
    .map((o) => `<path class="body-sil" d="${o.d}" pointer-events="none"/>`)
    .join("");
  const muscles = diagram.muscles
    .map((m) => {
      const id = GROUP_TO_APP[m.group];
      if (!id) return "";
      const on = selected === id;
      return `<path class="body-muscle${on ? " is-on" : ""}" data-muscle="${id}" fill="${muscleFill(heatOf(id))}" d="${m.d}"/>`;
    })
    .join("");
  return `<svg class="body-svg" viewBox="${diagram.viewBox}" role="img" aria-label="身體肌群圖">${sil}${muscles}</svg>`;
}

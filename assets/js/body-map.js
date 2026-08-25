import { MUSCLES, heatColor, labelFor } from "./muscles.js";

function part(id, d, extra = "") {
  return `<path data-muscle="${id}" class="body-part" d="${d}" ${extra}/>`;
}

function oval(id, cx, cy, rx, ry) {
  return `<ellipse data-muscle="${id}" class="body-part" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
}

function frontFigure() {
  return `
    <ellipse class="body-sil" cx="80" cy="26" rx="15" ry="17"/>
    ${part("shoulders", "M36 58 C48 42 112 42 124 58 L114 80 C80 68 46 80 36 58Z")}
    ${part("chest", "M50 72 C80 60 110 72 110 72 L106 112 C80 124 54 112 50 72Z")}
    ${oval("biceps", 36, 98, 13, 24)}
    ${oval("biceps", 124, 98, 13, 24)}
    ${oval("forearms", 28, 140, 10, 24)}
    ${oval("forearms", 132, 140, 10, 24)}
    ${part("core", "M58 114 L102 114 L98 176 L62 176Z")}
    ${oval("quads", 64, 218, 17, 44)}
    ${oval("quads", 96, 218, 17, 44)}
    ${oval("calves", 64, 282, 12, 34)}
    ${oval("calves", 96, 282, 12, 34)}
  `;
}

function backFigure() {
  return `
    <ellipse class="body-sil" cx="80" cy="26" rx="15" ry="17"/>
    ${part("shoulders", "M36 58 C48 42 112 42 124 58 L114 80 C80 68 46 80 36 58Z")}
    ${part("back", "M48 74 C80 58 112 74 112 74 L108 150 C80 168 52 150 48 74Z")}
    ${oval("triceps", 34, 100, 12, 26)}
    ${oval("triceps", 126, 100, 12, 26)}
    ${part("glutes", "M54 154 C80 146 106 154 106 154 L104 188 C80 198 56 188 54 154Z")}
    ${oval("hamstrings", 64, 228, 16, 40)}
    ${oval("hamstrings", 96, 228, 16, 40)}
    ${oval("calves", 64, 282, 12, 34)}
    ${oval("calves", 96, 282, 12, 34)}
  `;
}

export function renderBodyMap(stats, { view = "front", selected = "chest" } = {}) {
  const inner = view === "back" ? backFigure() : frontFigure();
  const fills = MUSCLES.map((m) => {
    const heat = stats.byId[m.id]?.heat || 0;
    const on = selected === m.id ? "1" : "0.35";
    return `.body-svg [data-muscle="${m.id}"]{fill:${heatColor(heat)};stroke:rgba(126,200,255,${on});}`;
  }).join("");
  return `
    <style>${fills}
      .body-svg [data-muscle="${selected}"]{stroke-width:2.4;filter:drop-shadow(0 0 6px rgba(61,158,255,.8))}
    </style>
    <svg class="body-svg" viewBox="0 0 160 330" role="img" aria-label="肌群人體圖">
      ${inner}
    </svg>
  `;
}

export { labelFor };

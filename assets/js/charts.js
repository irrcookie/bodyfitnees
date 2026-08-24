export function svgWrap(inner, w = 320, h = 140, extra = "") {
  return `<svg class="trend" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" ${extra}>${inner}</svg>`;
}

export function sparkline(values, target, w = 320, h = 140) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length < 1) return svgWrap(`<text x="16" y="72" fill="#8b90a3" font-size="12">暫時未有趨勢</text>`, w, h);
  const min = Math.min(...nums, target ?? nums[0]) * 0.98;
  const max = Math.max(...nums, target ?? nums[0]) * 1.02;
  const span = max - min || 1;
  const step = nums.length === 1 ? 0 : (w - 28) / (nums.length - 1);
  const pts = nums.map((v, i) => {
    const x = 14 + i * step;
    const y = 18 + ((max - v) / span) * (h - 40);
    return [x, y];
  });
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts.at(-1);
  let targetLine = "";
  if (Number.isFinite(target)) {
    const y = 18 + ((max - target) / span) * (h - 40);
    targetLine = `<line x1="10" x2="${w - 10}" y1="${y}" y2="${y}" stroke="#3d9eff" stroke-dasharray="4 4" stroke-width="1.2" opacity="0.85"/>
      <text x="${w - 12}" y="${y - 6}" text-anchor="end" fill="#7ec8ff" font-size="10">目標 ${target}</text>`;
  }
  return svgWrap(
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3d9eff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#3d9eff" stop-opacity="0"/>
    </linearGradient></defs>
    ${targetLine}
    <path d="${d} L${last[0]},${h - 8} L${pts[0][0]},${h - 8} Z" fill="url(#g)"/>
    <path d="${d}" fill="none" stroke="#3d9eff" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="4.5" fill="#7ec8ff" stroke="#0b0b0f" stroke-width="2"/>`,
    w,
    h,
  );
}

export function ring(percent, label, sub) {
  const p = Math.max(0, Math.min(100, percent || 0));
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - p / 100);
  return `<svg class="ring-wrap" viewBox="0 0 92 92">
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="#1a1a24" stroke-width="8"/>
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="#3d9eff" stroke-width="8"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${dash.toFixed(1)}"
      transform="rotate(-90 46 46)"/>
    <text x="46" y="44" text-anchor="middle" fill="#7ec8ff" font-size="16" font-weight="700">${Math.round(p)}%</text>
    <text x="46" y="60" text-anchor="middle" fill="#8b90a3" font-size="9">${label}</text>
  </svg><div><div class="fine">${sub || ""}</div></div>`;
}

export function composition(parts) {
  const total = parts.reduce((n, p) => n + p.value, 0) || 1;
  const colors = ["#3d9eff", "#ff8a3d", "#7ec8ff", "#3dffb0"];
  const segs = parts
    .map((p, i) => `<i style="width:${(p.value / total) * 100}%;background:${colors[i % colors.length]}"></i>`)
    .join("");
  const legend = parts
    .map(
      (p, i) =>
        `<span><i class="dot" style="background:${colors[i % colors.length]}"></i>${p.label} ${p.value}${p.unit || "kg"}</span>`,
    )
    .join("");
  return `<div class="bar">${segs}</div><div class="legend">${legend}</div>`;
}

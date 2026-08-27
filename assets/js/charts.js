export function svgWrap(inner, w = 320, h = 140, extra = "") {
  return `<svg class="trend" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" ${extra}>${inner}</svg>`;
}

let trendSeq = 0;

/** 每日合計 vs 目標線；高過／低過目標用兩色 area + 點。 */
export function baselineTrend(values, target, w = 320, h = 168, opts = {}) {
  const nums = (values || []).map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
  const unit = opts.unit || "";
  const labels = opts.labels || [];
  const aboveColor = opts.aboveColor || "#ff8a3d";
  const belowColor = opts.belowColor || "#3d9eff";
  const targetColor = opts.targetColor || "#7ec8ff";
  if (nums.length < 1) {
    return svgWrap(`<text x="16" y="84" fill="#8b90a3" font-size="12">暫時未有趨勢</text>`, w, h);
  }
  const padL = 10;
  const padR = 10;
  const padT = 26;
  const padB = 28;
  const lo = Math.min(...nums, Number.isFinite(target) ? target : nums[0]);
  const hi = Math.max(...nums, Number.isFinite(target) ? target : nums[0]);
  const min = lo * (lo >= 0 ? 0.92 : 1.08);
  const max = hi * (hi >= 0 ? 1.08 : 0.92) || 1;
  const span = max - min || 1;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const step = nums.length === 1 ? 0 : innerW / (nums.length - 1);
  const pts = nums.map((v, i) => {
    const x = padL + (nums.length === 1 ? innerW / 2 : i * step);
    const y = padT + ((max - v) / span) * innerH;
    return { x, y, v };
  });
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const tgt = Number.isFinite(target) ? target : null;
  const targetY =
    tgt == null ? padT + innerH / 2 : padT + ((max - tgt) / span) * innerH;
  const uid = `bt${++trendSeq}`;
  const area =
    tgt == null
      ? `${d} L${pts.at(-1).x.toFixed(1)},${(padT + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT + innerH).toFixed(1)} Z`
      : `${d} L${pts.at(-1).x.toFixed(1)},${targetY.toFixed(1)} L${pts[0].x.toFixed(1)},${targetY.toFixed(1)} Z`;
  const targetLine =
    tgt == null
      ? ""
      : `<line class="trend-baseline" x1="${padL}" x2="${w - padR}" y1="${targetY.toFixed(1)}" y2="${targetY.toFixed(1)}" stroke="${targetColor}" stroke-dasharray="4 4" stroke-width="1.3" opacity="0.9"/>
      <text x="${w - padR}" y="${Math.max(12, targetY - 7).toFixed(1)}" text-anchor="end" fill="${targetColor}" font-size="10">目標 ${tgt}${unit ? ` ${unit}` : ""}</text>`;
  const aboveClipH = Math.max(0, Math.min(h, targetY));
  const belowClipY = Math.max(0, Math.min(h, targetY));
  const dots = pts
    .map((p) => {
      const over = tgt != null && p.v > tgt;
      const under = tgt != null && p.v < tgt;
      const fill = over ? aboveColor : under ? belowColor : targetColor;
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.2" fill="${fill}" stroke="#0b0b0f" stroke-width="1.6"/>`;
    })
    .join("");
  const labelIdx =
    labels.length <= 4
      ? labels.map((_, i) => i)
      : [0, Math.round((labels.length - 1) / 2), labels.length - 1];
  const dateLabels = [...new Set(labelIdx)]
    .filter((i) => labels[i] && pts[i])
    .map((i) => {
      const lab = String(labels[i]).slice(5);
      return `<text x="${pts[i].x.toFixed(1)}" y="${h - 8}" text-anchor="middle" fill="#8b90a3" font-size="10">${lab}</text>`;
    })
    .join("");
  return svgWrap(
    `<defs>
      <clipPath id="${uid}-above"><rect x="0" y="0" width="${w}" height="${aboveClipH.toFixed(1)}"/></clipPath>
      <clipPath id="${uid}-below"><rect x="0" y="${belowClipY.toFixed(1)}" width="${w}" height="${Math.max(0, h - belowClipY).toFixed(1)}"/></clipPath>
      <linearGradient id="${uid}-ag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${aboveColor}" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="${aboveColor}" stop-opacity="0.05"/>
      </linearGradient>
      <linearGradient id="${uid}-bg" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="${belowColor}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${belowColor}" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    ${targetLine}
    <path class="trend-above" d="${area}" fill="url(#${uid}-ag)" clip-path="url(#${uid}-above)"/>
    <path class="trend-below" d="${area}" fill="url(#${uid}-bg)" clip-path="url(#${uid}-below)"/>
    <path d="${d}" fill="none" stroke="${aboveColor}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${uid}-above)"/>
    <path d="${d}" fill="none" stroke="${belowColor}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${uid}-below)"/>
    ${dots}
    ${dateLabels}`,
    w,
    h,
  );
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

export function ring(percent, label, color = "#3d9eff") {
  const p = Math.max(0, Math.min(100, percent || 0));
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - p / 100);
  return `<svg class="ring-wrap" viewBox="0 0 92 92">
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="#1a1a24" stroke-width="8"/>
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="${color}" stroke-width="8"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${dash.toFixed(1)}"
      transform="rotate(-90 46 46)"/>
    <text x="46" y="48" text-anchor="middle" fill="${color}" font-size="16" font-weight="700">${Math.round(p)}%</text>
    <text x="46" y="64" text-anchor="middle" fill="#8b90a3" font-size="9">${label}</text>
  </svg>`;
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

/** Training burn vs food intake — used on the 飲食 calorie card. */

export const EATEN_COLOR = "#3d9eff";
export const BURN_COLOR = "#a78bfa";

export function sessionKcal(rec = {}, weightKg = 72.7) {
  const stored = Number(rec.kcalBurned);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const min = Number(rec.durationMin) || 0;
  if (!min) return 0;
  const met = rec.type === "cardio" ? 7.5 : rec.type === "sports" ? 7 : rec.type === "mobility" ? 3.5 : 6;
  const kg = Number(weightKg) || 72.7;
  return Math.round(met * kg * (min / 60));
}

export function totalTrainKcal(records = [], weightKg = 72.7) {
  return (records || []).reduce((n, r) => n + sessionKcal(r, weightKg), 0);
}

export function kcalRing(eatenPct, burnPct) {
  const eaten = Math.max(0, Math.min(140, eatenPct || 0));
  const burn = Math.max(0, Math.min(eaten, burnPct || 0));
  const net = Math.max(0, eaten - burn);
  const r = 36;
  const c = 2 * Math.PI * r;
  const eatenDash = c * (1 - Math.min(100, eaten) / 100);
  const burnLen = c * (Math.min(100, burn) / 100);
  const netFrac = Math.min(100, net) / 100;
  const burnCircle =
    burn > 0.4
      ? `<circle cx="46" cy="46" r="${r}" fill="none" stroke="${BURN_COLOR}" stroke-width="8"
      stroke-linecap="butt" stroke-dasharray="${burnLen.toFixed(1)} ${(c - burnLen).toFixed(1)}"
      stroke-dashoffset="${(-c * netFrac).toFixed(1)}" transform="rotate(-90 46 46)"/>`
      : "";
  const label = burn > 0.4 ? "淨" : "kcal";
  const shown = burn > 0.4 ? net : eaten;
  return `<svg class="ring-wrap" viewBox="0 0 92 92" aria-hidden="true">
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="#1a1a24" stroke-width="8"/>
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="${EATEN_COLOR}" stroke-width="8"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${eatenDash.toFixed(1)}"
      transform="rotate(-90 46 46)"/>
    ${burnCircle}
    <text x="46" y="48" text-anchor="middle" fill="${burn > 0.4 ? BURN_COLOR : EATEN_COLOR}" font-size="16" font-weight="700">${Math.round(Math.min(100, shown))}%</text>
    <text x="46" y="64" text-anchor="middle" fill="#8b90a3" font-size="9">${label}</text>
  </svg>`;
}

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("zh-HK", { maximumFractionDigits: 0 });
}

export function kcalIntakeCard({ eaten = 0, burned = 0, target = 2200, selected = false } = {}) {
  const eat = Math.max(0, Number(eaten) || 0);
  const burn = Math.max(0, Number(burned) || 0);
  const capBurn = Math.min(burn, eat);
  const net = Math.max(0, eat - capBurn);
  const eatPct = target ? Math.min(140, (eat / target) * 100) : 0;
  const burnPct = target ? Math.min(eatPct, (capBurn / target) * 100) : 0;
  const netPct = Math.max(0, eatPct - burnPct);
  const over = target ? eat > target : false;
  const hasBurn = capBurn > 0;
  const burnSeg = hasBurn
    ? `<i class="kcal-burn" style="width:${burnPct}%;background:${BURN_COLOR}"></i>`
    : "";
  const extra = hasBurn
    ? `<div class="kcal-split">
        <span class="kcal-eaten-label">已食 ${fmt(eat)}</span>
        <span class="kcal-burn-label">訓練 −${fmt(capBurn)}</span>
      </div>
      <div class="fine">淨攝取 ${fmt(net)} / ${fmt(target)} kcal</div>
      <div class="kcal-legend">
        <span><i class="dot" style="background:${EATEN_COLOR}"></i>進食</span>
        <span><i class="dot" style="background:${BURN_COLOR}"></i>訓練消耗</span>
      </div>`
    : `<div class="fine">已攝取 / 每日參考</div>`;
  return `<article class="card intake-card kcal-card metric-tap ${over ? "over" : ""} ${hasBurn ? "has-burn" : ""} ${selected ? "is-selected" : ""}" data-metric="kcal" role="button" tabindex="0" aria-pressed="${selected ? "true" : "false"}">
    <div class="section-title" style="margin-top:0">卡路里攝取量<span>參考 ${fmt(target)} kcal${over ? " · 超標" : ""}</span></div>
    <div class="stat-row">
      ${kcalRing(eatPct, burnPct)}
      <div>
        <div class="value">${fmt(hasBurn ? net : eat)}<small> kcal</small></div>
        ${extra}
      </div>
    </div>
    <div class="bar kcal-bar" style="margin-top:10px">
      <i class="kcal-eaten" style="width:${netPct}%;background:${over && !hasBurn ? "var(--orange)" : EATEN_COLOR}"></i>
      ${burnSeg}
    </div>
  </article>`;
}

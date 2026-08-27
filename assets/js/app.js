import {
  loadDB,
  getToken,
  setToken,
  latest,
  onDate,
  sum,
  daysUntil,
  weekdayHK,
  mealLabel,
  statusTone,
  hkDate,
  hkTime,
} from "./store.js";
import { sparkline, baselineTrend, ring, composition } from "./charts.js";
import { mealHealth } from "./meal-tone.js";
import { muscleStats } from "./muscles.js";
import { renderBodyMap } from "./body-map.js";
import { kcalIntakeCard, totalTrainKcal, sessionKcal } from "./kcal-burn.js";
import {
  FOOD_METRICS,
  FOOD_TIME_BANDS,
  dailyFoodSeries,
  formatHkHm,
  recordsByTimeBand,
} from "./food-day.js";

const $ = (id) => document.getElementById(id);
const routes = ["food", "body", "train"];
let db = null;
let route = "food";
let bodyView = "front";
let selectedMuscle = "chest";
let foodTrendMetric = "kcal";

function standalone() {
  return window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function greet() {
  const h = Number(hkTime().slice(0, 2));
  if (h < 5) return "深夜好";
  if (h < 12) return "早晨";
  if (h < 18) return "午安";
  return "晚上好";
}

function fmt(n, d = 1) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("zh-HK", { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

function delta(n, unit = "") {
  if (n == null) return "";
  const sign = n > 0 ? "+" : "";
  const cls = n > 0 ? "up" : n < 0 ? "down" : "";
  return `<span class="delta ${cls}">${sign}${fmt(n, 1)}${unit}</span>`;
}

function badge(status) {
  if (!status) return "";
  const tone = statusTone(status);
  const cls = tone === "ok" ? "badge-ok" : tone === "low" ? "badge-low" : tone === "info" ? "badge-info" : "badge-high";
  return `<span class="badge ${cls}">${status}</span>`;
}

function goalProgress(profile, body) {
  const g = profile.goal;
  const days = daysUntil(g.deadline);
  const fat = body?.bodyFatPercent;
  const startFat = 22.7;
  const span = startFat - g.targetBodyFatPercent;
  const done = fat == null ? 0 : Math.max(0, Math.min(100, ((startFat - fat) / span) * 100));
  return { days, done, fat };
}

function todayFood() {
  return onDate(db.food.records, hkDate(), "eatenAt");
}

function todayTrain() {
  return onDate(db.fitness.records, hkDate(), "trainedAt");
}

function mealLogged(slot) {
  return todayFood().some((r) => r.meal === slot);
}

function intakeCard(title, current, target, unit, color, { metric = "", selected = false } = {}) {
  const pct = target ? Math.min(100, (current / target) * 100) : 0;
  const over = target ? current > target : false;
  const attrs = metric
    ? `data-metric="${metric}" role="button" tabindex="0" aria-pressed="${selected ? "true" : "false"}"`
    : "";
  return `<article class="card intake-card ${over ? "over" : ""} ${metric ? "metric-tap" : ""} ${selected ? "is-selected" : ""}" ${attrs}>
    <div class="section-title" style="margin-top:0">${title}<span>參考 ${fmt(target, 0)} ${unit}${over ? " · 超標" : ""}${selected ? " · 趨勢" : ""}</span></div>
    <div class="stat-row">
      ${ring(pct, unit, color)}
      <div>
        <div class="value">${fmt(current, 0)}<small> ${unit}</small></div>
        <div class="fine">已攝取 / 每日參考</div>
      </div>
    </div>
    <div class="bar" style="margin-top:10px"><i style="width:${pct}%;background:${over ? "var(--orange)" : color}"></i></div>
  </article>`;
}

function metricCard(label, value, unit, extra, status) {
  return `<div class="metric"><div class="k">${label}</div><div class="v">${fmt(value, unit === "%" || unit === "" ? 1 : 1)}${unit ? `<span style="font-size:14px;color:var(--muted)"> ${unit}</span>` : ""}</div><div>${badge(status)} ${extra || ""}</div></div>`;
}

function renderBody() {
  const b = latest(db.body.records);
  if (!b) return `<div class="empty">未有身體紀錄。將小米截圖傳到 Cursor 對話，我會 OCR 入 GitHub。</div>`;
  const g = db.profile.goal;
  const typeCells = [
    ["運動員型", b.bodyType === "運動員型"],
    ["肌肉型", b.bodyType === "肌肉型"],
    ["健康型", b.bodyType === "健康型"],
    ["苗條肌肉型", b.bodyType === "苗條肌肉型"],
    ["肥胖", b.bodyType === "肥胖"],
    ["隱形肥胖", b.bodyType === "隱形肥胖"],
    ["偏瘦型", b.bodyType === "偏瘦型"],
    ["消瘦型", b.bodyType === "消瘦型"],
    ["苗條型", b.bodyType === "苗條型"],
  ];
  return `
    <article class="hero">
      <div class="label">人體成分 · 小米</div>
      <div class="value">${fmt(b.weightKg, 1)}<small>kg</small></div>
      <div>${badge(b.weightStatus)} 得分 ${b.bodyScore} · ${b.bodyType || ""}</div>
    </article>
    <div class="grid-2">
      ${metricCard("BMI", b.bmi, "", delta(b.bmiDelta), b.bmiStatus)}
      ${metricCard("體脂率", b.bodyFatPercent, "%", delta(b.bodyFatDelta, "%"), b.bodyFatStatus)}
      ${metricCard("肌肉量", b.muscleMassKg, "kg", delta(b.muscleMassDelta, "kg"), b.muscleMassStatus)}
      ${metricCard("去脂體重", b.fatFreeMassKg, "kg", delta(b.fatFreeMassDelta, "kg"), "")}
    </div>
    <article class="card">
      <div class="section-title" style="margin-top:0">成分組成</div>
      ${composition([
        { label: "水分", value: b.bodyWaterKg },
        { label: "脂肪", value: b.fatMassKg },
        { label: "蛋白質", value: b.proteinMassKg },
        { label: "骨鹽", value: b.boneSaltKg },
      ])}
    </article>
    <div class="grid-2">
      ${metricCard("肌肉率", b.muscleRatePercent, "%", delta(b.muscleRateDelta, "%"), b.muscleRateStatus)}
      ${metricCard("身體水分", b.bodyWaterPercent, "%", delta(b.bodyWaterDelta, "%"), b.bodyWaterStatus)}
      ${metricCard("蛋白質比率", b.proteinRatePercent, "%", delta(b.proteinRateDelta, "%"), b.proteinRateStatus)}
      ${metricCard("骨鹽率", b.boneSaltRatePercent, "%", delta(b.boneSaltRateDelta, "%"), b.boneSaltRateStatus)}
      ${metricCard("骨骼肌量", b.skeletalMuscleKg, "kg", delta(b.skeletalMuscleDelta, "kg"), b.skeletalMuscleStatus)}
      ${metricCard("內臟脂肪", b.visceralFatLevel, "", delta(b.visceralFatDelta), b.visceralFatStatus)}
      ${metricCard("基礎代謝", b.bmrKcal, "kcal", delta(b.bmrDelta), b.bmrStatus)}
      ${metricCard("腰臀比", b.waistHipRatio, "", delta(b.waistHipDelta), b.waistHipStatus)}
      ${metricCard("身體年齡", b.bodyAge, "歲", delta(b.bodyAgeDelta), "")}
      ${metricCard("心率", b.heartRateBpm, "bpm", "", b.heartRateStatus)}
    </div>
    <article class="card">
      <div class="section-title" style="margin-top:0">身體類型</div>
      <div class="fine" style="margin-bottom:8px">而家小米標示「${b.bodyType}」。11月目標落喺肌肉型（體脂↓、肌肉↑）。</div>
      <div class="body-type">
        ${typeCells
          .map(([name, on]) => `<b class="${on ? "on" : ""} ${name === "肌肉型" ? "goal" : ""}">${name}</b>`)
          .join("")}
      </div>
    </article>
    <article class="card">
      <div class="section-title" style="margin-top:0">體重建議 vs 我哋目標</div>
      <div class="list-item"><span>小米標準體重</span><strong>${fmt(b.standardWeightKg, 1)} kg</strong></div>
      <div class="list-item"><span>小米體重控制</span><strong>${fmt(b.weightControlKg, 1)} kg</strong></div>
      <div class="list-item"><span>脂肪控制</span><strong>${fmt(b.fatControlKg, 1)} kg</strong></div>
      <div class="list-item"><span>肌肉控制</span><strong>${b.muscleControl}</strong></div>
      <p class="fine">肌肉型路線：體重守 ${g.targetWeightKg}kg，脂肪再減大約 ${fmt((b.fatMassKg || 0) - g.targetFatMassKg, 1)}kg，肌肉量由 ${fmt(b.muscleMassKg, 1)} 去 ${g.targetMuscleMassKg}kg。</p>
    </article>
    <article class="card">
      <div class="section-title" style="margin-top:0">體脂趨勢<span>目標 ${g.targetBodyFatPercent}%</span></div>
      ${sparkline(db.body.records.map((r) => r.bodyFatPercent).reverse(), g.targetBodyFatPercent)}
    </article>
    ${b.recommendation ? `<article class="card coach-card"><p>${b.recommendation}</p></article>` : ""}
  `;
}

function renderFood() {
  const p = db.profile.nutrition;
  const today = todayFood();
  const kcal = sum(today, "totalKcal");
  const protein = sum(today, "totalProteinG");
  const fat = sum(today, "totalFatG");
  const chol = sum(today, "totalCholesterolMg");
  const weightKg = latest(db.body.records)?.weightKg || db.profile.goal.targetWeightKg || 72.7;
  const burned = totalTrainKcal(todayTrain(), weightKg);
  const metric = FOOD_METRICS[foodTrendMetric] || FOOD_METRICS.kcal;
  const target = Number(p[metric.targetKey]) || 0;
  const series = dailyFoodSeries(db.food.records, { endDate: hkDate() });
  const values = series.map((row) => row[metric.key]);
  const last = series.at(-1);
  const lastVal = last ? last[metric.key] : 0;
  const vs = target ? lastVal - target : 0;
  const vsLabel =
    !series.length || !target
      ? "未有對照"
      : vs > 0
        ? `今日高過目標 ${fmt(vs, 0)} ${metric.unit}`
        : vs < 0
          ? `今日低過目標 ${fmt(Math.abs(vs), 0)} ${metric.unit}`
          : "今日啱啱目標";
  return `
    <article class="card food-trend-card">
      <div class="section-title" style="margin-top:0">${metric.title}趨勢<span>vs ${fmt(target, 0)} ${metric.unit}</span></div>
      ${baselineTrend(values, target, 320, 168, { unit: metric.unit, labels: series.map((row) => row.date) })}
      <div class="legend food-trend-legend">
        <span><i class="dot" style="background:#ff8a3d"></i>高過目標</span>
        <span><i class="dot" style="background:#3d9eff"></i>低過目標</span>
        <span><i class="dot" style="background:#7ec8ff"></i>目標線</span>
      </div>
      <div class="fine">${vsLabel} · 撳下面數據卡切換指標</div>
    </article>
    <div id="foodMetrics">
      ${kcalIntakeCard({ eaten: kcal, burned, target: p.kcalTarget, selected: foodTrendMetric === "kcal" })}
      ${intakeCard("蛋白質攝取量", protein, p.proteinG, "g", "#3dffb0", { metric: "protein", selected: foodTrendMetric === "protein" })}
      <div class="grid-2">
        ${intakeCard("脂肪攝取量", fat, p.fatG, "g", "#ff8a3d", { metric: "fat", selected: foodTrendMetric === "fat" })}
        ${intakeCard("膽固醇攝取量", chol, p.cholesterolMg, "mg", "#ff5d73", { metric: "chol", selected: foodTrendMetric === "chol" })}
      </div>
    </div>
    <div class="section-title">今日時間軸<span>綠＝高蛋白　黃＝高脂／膽固醇</span></div>
    ${foodDayTimeline(today, p)}
  `;
}

function foodDayTimeline(records, nutrition) {
  const groups = recordsByTimeBand(records);
  return `<article class="day-timeline" aria-label="今日飲食時間軸">
    ${FOOD_TIME_BANDS.map((band) => {
      const rows = groups[band.id] || [];
      return `<section class="time-band band-${band.id}" style="--band-flex:${band.flex}">
        <div class="band-label">${band.label}<span>${band.hint}</span></div>
        ${rows.map((rec) => timelineRow(rec, nutrition)).join("")}
      </section>`;
    }).join("")}
  </article>`;
}

function timelineRow(rec, nutrition) {
  const health = mealHealth(rec, nutrition);
  const names = rec.items?.map((i) => i.name).join("、") || rec.notes || "一餐";
  return `<div class="timeline-row ${health.className}">
    <div class="timeline-time">${formatHkHm(rec.eatenAt)}</div>
    <div class="timeline-main">
      <div class="timeline-name">${names}</div>
      <div class="fine">${fmt(rec.totalKcal, 0)} kcal · 蛋白 ${fmt(rec.totalProteinG, 0)}g · 脂肪 ${fmt(rec.totalFatG, 0)}g · 膽固醇 ${fmt(rec.totalCholesterolMg, 0)}mg</div>
      <div class="meal-tag meal-tag-${health.tone}">${health.label}</div>
    </div>
  </div>`;
}

function renderTrain() {
  const plan = db.profile.training.split.find((s) => s.weekday === weekdayHK());
  const today = todayTrain();
  const weightKg = latest(db.body.records)?.weightKg || db.profile.goal.targetWeightKg || 72.7;
  const weekStart = (() => {
    const [y, m, d] = hkDate().split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const wd = weekdayHK();
    dt.setUTCDate(dt.getUTCDate() - wd);
    return dt;
  })();
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(weekStart);
    dt.setUTCDate(weekStart.getUTCDate() + i);
    return dt.toISOString().slice(0, 10);
  });
  const weekCount = db.fitness.records.filter((r) => weekDates.includes(r.date)).length;
  const stats = muscleStats(db.fitness.records);
  const part = stats.byId[selectedMuscle] || stats.byId.chest;
  const trend = (part.series || []).map((p) => p.e1rm || p.volume);
  const latestLoad = part.series?.at(-1);
  return `
    <article class="hero">
      <div class="label">今日訓練</div>
      <div class="value" style="font-size:34px">${plan.title}</div>
      <div class="fine">${plan.focus} · 本週 ${weekCount} / ${db.profile.training.sessionsPerWeek} 堂</div>
    </article>
    ${
      today
        .map(
          (r) => `<article class="card"><strong>${r.title}</strong><div class="fine">${r.durationMin || 0} 分鐘 · ${fmt(sessionKcal(r, weightKg), 0)} kcal · RPE ${r.rpe ?? "—"}</div>
          ${(r.exercises || []).map((e) => `<div class="list-item"><span>${e.name}</span><span>${e.sets || ""}×${e.reps || e.durationMin || ""} ${e.weightKg ? e.weightKg + "kg" : ""}</span></div>`).join("")}</article>`,
        )
        .join("") || `<article class="card"><div class="empty">今日未訓練。喺 Cursor 對話傳器械相，再寫 kg × 組 × 次數／時間，我會入庫。</div></article>`
    }
    <article class="card body-map-card">
      <div class="section-title" style="margin-top:0">肌群力量<span>越光＝訓練量越高</span></div>
      <div class="chips" id="bodyViewChips">
        <button class="chip ${bodyView === "front" ? "is-on" : ""}" data-view="front" type="button">正面</button>
        <button class="chip ${bodyView === "back" ? "is-on" : ""}" data-view="back" type="button">背面</button>
      </div>
      <div class="body-map" id="bodyMap">${renderBodyMap(stats, { view: bodyView, selected: selectedMuscle })}</div>
      <div class="fine" style="text-align:center">撳一個部位睇力量趨勢</div>
      <div class="fine" style="text-align:center;opacity:.7">解剖向量來自 MuscleMap（MIT）</div>
    </article>
    <article class="card" id="muscleTrend">
      <div class="section-title" style="margin-top:0">${part.label}力量<span>${part.sessions || 0} 堂</span></div>
      <div class="grid-2">
        <div class="metric"><div class="k">估計 1RM</div><div class="v">${fmt(part.e1rm, 0)}</div><div class="fine">kg</div></div>
        <div class="metric"><div class="k">累積訓練量</div><div class="v">${fmt(part.volume, 0)}</div><div class="fine">kg·組·次</div></div>
      </div>
      ${
        trend.length
          ? sparkline(trend)
          : `<div class="empty">未有${part.label}趨勢。傳器械相同 kg × 組 × 次數就會喺呢度畫。</div>`
      }
      ${
        latestLoad
          ? `<div class="fine" style="margin-top:8px">最近 ${latestLoad.date} · ${fmt(latestLoad.e1rm, 0)} kg 1RM · 量 ${fmt(latestLoad.volume, 0)}</div>`
          : ""
      }
    </article>
    <article class="card">
      <div class="section-title" style="margin-top:0">最近訓練</div>
      ${
        db.fitness.records.length
          ? db.fitness.records
              .slice(0, 10)
              .map((r) => `<div class="list-item"><div><strong>${r.title}</strong><div class="fine">${r.date} · ${(r.exercises || []).map((e) => e.name).join("、") || ""}</div></div><span>${r.durationMin || 0}分</span></div>`)
              .join("")
          : `<div class="empty">未有訓練紀錄</div>`
      }
    </article>
  `;
}

function render() {
  const p = db.profile;
  const b = latest(db.body.records);
  const y = window.scrollY;
  $("greeting").textContent = `${greet()}，${p.displayName}`;
  const { days } = goalProgress(p, b);
  $("goalStrip").textContent = `肌肉型目標 · 仲有 ${days} 日到 ${p.goal.deadline} · 體脂 ${b?.bodyFatPercent ?? "—"}% → ${p.goal.targetBodyFatPercent}%`;
  $("screen").innerHTML = { body: renderBody, food: renderFood, train: renderTrain }[route]();
  document.querySelectorAll(".tab").forEach((el) => el.classList.toggle("is-active", el.dataset.route === route));
  bindPage();
  if (route === "food") window.scrollTo(0, y);
}

function bindPage() {
  $("bodyViewChips")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (!btn) return;
    bodyView = btn.dataset.view;
    if (bodyView === "back" && !["shoulders", "back", "triceps", "glutes", "hamstrings", "calves"].includes(selectedMuscle)) {
      selectedMuscle = "back";
    }
    if (bodyView === "front" && !["shoulders", "chest", "biceps", "forearms", "core", "quads", "calves"].includes(selectedMuscle)) {
      selectedMuscle = "chest";
    }
    render();
  });
  $("bodyMap")?.addEventListener("click", (e) => {
    const part = e.target.closest("[data-muscle]");
    if (!part) return;
    selectedMuscle = part.dataset.muscle;
    render();
    $("muscleTrend")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  const metrics = $("foodMetrics");
  const pickMetric = (e) => {
    const card = e.target.closest("[data-metric]");
    if (!card) return;
    const next = card.dataset.metric;
    if (!FOOD_METRICS[next] || next === foodTrendMetric) return;
    foodTrendMetric = next;
    render();
  };
  metrics?.addEventListener("click", pickMetric);
  metrics?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    pickMetric(e);
  });
}

function toast(text) {
  const n = document.createElement("div");
  n.textContent = text;
  Object.assign(n.style, {
    position: "fixed",
    left: "50%",
    bottom: "110px",
    transform: "translateX(-50%)",
    background: "#1c2a3d",
    color: "#d6ecff",
    border: "1px solid rgba(61,158,255,.4)",
    padding: "10px 14px",
    borderRadius: "12px",
    zIndex: 80,
    fontSize: "13px",
    width: "min(360px, calc(100% - 32px))",
    textAlign: "center",
  });
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 2800);
}

async function hardRefresh() {
  toast("重新整理緊…");
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    const regs = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* still reload */
  }
  const url = new URL(location.href);
  url.searchParams.set("_r", String(Date.now()));
  location.replace(url.toString());
}

function watchServiceWorker(reg) {
  let reloading = false;
  reg.update().catch(() => {});
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reg.update().catch(() => {});
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

function openSettings() {
  const token = getToken();
  $("sheetTitle").textContent = "設定";
  $("sheetBody").innerHTML = `
    <button class="btn" id="refreshNow" type="button">重新整理（清 cache）</button>
    <a class="btn ghost" href="./reminders.ics">加入飲食打卡日曆（09:30／13:30／20:00）</a>
    <button class="btn ghost row" id="notifyBtn" type="button">允許瀏覽器通知</button>
    <label class="fine">GitHub token（可選）</label>
    <input id="tokenInput" type="password" value="${token}" placeholder="ghp_..." autocomplete="off" aria-label="GitHub token" />
    <button class="btn" id="saveToken" type="button">儲存 token</button>
  `;
  $("sheet").hidden = false;
  $("refreshNow").onclick = hardRefresh;
  $("saveToken").onclick = () => {
    setToken($("tokenInput").value.trim());
    toast("已儲存");
    $("sheet").hidden = true;
  };
  $("notifyBtn").onclick = async () => {
    if (!("Notification" in window)) return toast("呢個 Safari 版本未支援通知");
    const perm = await Notification.requestPermission();
    toast(perm === "granted" ? "已允許通知" : "未允許通知");
  };
}

function maybeRemind() {
  const t = hkTime();
  const hits = ["09:30", "13:30", "20:00"];
  const slotMap = { "09:30": "breakfast", "13:30": "lunch", "20:00": "dinner" };
  if (!hits.includes(t)) return;
  const slot = slotMap[t];
  if (mealLogged(slot)) return;
  if (sessionStorage.getItem("reminded-" + t + hkDate())) return;
  sessionStorage.setItem("reminded-" + t + hkDate(), "1");
  if (Notification.permission === "granted") {
    new Notification("身體管理", { body: `而家 ${t}，記低${mealLabel(slot)}熱量。`, icon: "./assets/icons/icon-192.png" });
  }
  toast(`提醒：記低${mealLabel(slot)}`);
}

function setRoute() {
  const hash = (location.hash || "#food").replace("#", "").replace("/", "") || "food";
  route = routes.includes(hash) ? hash : "food";
}

async function init() {
  if (standalone()) document.documentElement.classList.add("is-standalone");
  document.querySelectorAll(".tab").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      location.hash = a.dataset.route;
    }),
  );
  $("refreshBtn").onclick = hardRefresh;
  $("settingsBtn").onclick = openSettings;
  $("sheet").addEventListener("click", (e) => {
    if (e.target.dataset.closeSheet !== undefined || e.target.classList.contains("sheet-backdrop")) $("sheet").hidden = true;
  });
  window.addEventListener("hashchange", () => {
    setRoute();
    if (db) render();
  });
  try {
    db = await loadDB();
  } catch (err) {
    $("screen").innerHTML = `<div class="empty">資料庫讀唔到：${err.message}</div>`;
    return;
  }
  setRoute();
  render();
  maybeRemind();
  setInterval(maybeRemind, 30000);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").then(watchServiceWorker).catch(() => {});
  }
}

init();

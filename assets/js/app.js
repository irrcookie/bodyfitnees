import {
  loadDB,
  queueRecord,
  getToken,
  setToken,
  commitJson,
  latest,
  onDate,
  sum,
  daysUntil,
  weekdayHK,
  currentMealSlot,
  mealLabel,
  statusTone,
  uid,
  hkDate,
  hkTime,
  nowIso,
} from "./store.js";
import { sparkline, ring, composition } from "./charts.js";

const $ = (id) => document.getElementById(id);
const routes = ["food", "body", "train", "coach", "home"];
let db = null;
let route = "food";

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

function renderHome() {
  const p = db.profile;
  const b = latest(db.body.records);
  const { days, done } = goalProgress(p, b);
  const kcal = sum(todayFood(), "totalKcal");
  const protein = sum(todayFood(), "totalProteinG");
  const fat = sum(todayFood(), "totalFatG");
  const chol = sum(todayFood(), "totalCholesterolMg");
  const trained = todayTrain().length > 0;
  const slot = currentMealSlot();
  const needMeal = !mealLogged(slot);
  const plan = p.training.split.find((s) => s.weekday === weekdayHK()) || p.training.split[0];

  return `
    <article class="hero">
      <div class="label">而家體重 · ${b ? b.measuredAt.slice(0, 16).replace("T", " ") : "未有數據"}</div>
      <div class="value">${fmt(b?.weightKg, 1)}<small>kg</small></div>
      <div>${badge(b?.weightStatus)} ${b?.weightTrendNote || ""}</div>
      <div class="fine" style="margin-top:8px">目標線 ${p.goal.targetWeightKg}kg　體脂目標 ${p.goal.targetBodyFatPercent}%　仲有 ${days} 日</div>
    </article>
    <div class="grid-2">
      <div class="metric"><div class="k">身體得分</div><div class="v">${b?.bodyScore ?? "—"}</div>${badge("肌肉型計劃")}</div>
      <div class="metric"><div class="k">目標進度</div><div class="v">${fmt(done, 0)}%</div><div class="fine">體脂由 22.7% 去 ${p.goal.targetBodyFatPercent}%</div></div>
      <div class="metric"><div class="k">今日卡路里</div><div class="v">${fmt(kcal, 0)}</div><div class="fine">參考 ${p.nutrition.kcalTarget} kcal</div></div>
      <div class="metric"><div class="k">今日蛋白</div><div class="v">${fmt(protein, 0)}</div><div class="fine">參考 ${p.nutrition.proteinG} g</div></div>
      <div class="metric"><div class="k">今日脂肪</div><div class="v">${fmt(fat, 0)}</div><div class="fine">參考 ${p.nutrition.fatG} g</div></div>
      <div class="metric"><div class="k">今日膽固醇</div><div class="v">${fmt(chol, 0)}</div><div class="fine">參考 ${p.nutrition.cholesterolMg} mg</div></div>
    </div>
    <article class="card ${needMeal ? "warn-pulse" : ""}">
      <div class="section-title" style="margin-top:0">飲食打卡<span>${hkTime()}</span></div>
      <div class="progress-row"><span>${mealLabel(slot)}</span><span>${needMeal ? "未入" : "已入"}</span></div>
      <div class="bar"><i style="width:${Math.min(100, (kcal / p.nutrition.kcalTarget) * 100)}%;background:var(--tech)"></i></div>
      <p class="fine">${needMeal ? `而家係 ${mealLabel(slot)} 時段，記低食咗咩。` : "呢個時段已經有紀錄。"}</p>
    </article>
    <article class="card">
      <div class="section-title" style="margin-top:0">今日訓練<span>${trained ? "已練" : "未練"}</span></div>
      <strong>${plan.title}</strong>
      <p class="fine">${plan.focus}</p>
    </article>
    <article class="card coach-card">
      <div class="section-title" style="margin-top:0">今日建議</div>
      <p>${coachToday(b, { kcal, protein, fat, chol, trained, days })}</p>
    </article>
    <div class="section-title">體重趨勢<span>目標 ${p.goal.targetWeightKg}kg</span></div>
    <article class="card">${sparkline(db.body.records.map((r) => r.weightKg).reverse(), p.goal.targetWeightKg)}</article>
  `;
}

function coachToday(b, ctx) {
  const bits = [];
  bits.push(`離 11 月仲有 ${ctx.days} 日。`);
  if (b?.bodyFatPercent > 18) bits.push(`體脂 ${b.bodyFatPercent}% 仍然偏高，控制脂肪同膽固醇。`);
  if (ctx.protein < db.profile.nutrition.proteinG * 0.5) bits.push(`蛋白先得 ${fmt(ctx.protein, 0)}g，盡量食到 ${db.profile.nutrition.proteinG}g。`);
  if (ctx.kcal != null && ctx.kcal > db.profile.nutrition.kcalTarget) bits.push(`卡路里已超過參考 ${db.profile.nutrition.kcalTarget} kcal。`);
  if (ctx.fat != null && ctx.fat > db.profile.nutrition.fatG) bits.push(`脂肪已超過參考 ${db.profile.nutrition.fatG}g。`);
  if (ctx.chol != null && ctx.chol > db.profile.nutrition.cholesterolMg) bits.push(`膽固醇已超過參考 ${db.profile.nutrition.cholesterolMg}mg。`);
  if (!ctx.trained) bits.push("未訓練：做齊力量為主，有氧用步行就得，唔好掉肌肉。");
  if (b?.visceralFatLevel >= 10) bits.push("內臟脂肪稍多，晚餐早啲、少油炸。");
  if (b?.boneSaltRatePercent < 4.2) bits.push("骨鹽率不足，注意鈣同力量訓練。");
  return bits.join(" ");
}

function intakeCard(title, current, target, unit, color) {
  const pct = target ? Math.min(100, (current / target) * 100) : 0;
  const over = target ? current > target : false;
  return `<article class="card intake-card ${over ? "over" : ""}">
    <div class="section-title" style="margin-top:0">${title}<span>參考 ${fmt(target, 0)} ${unit}${over ? " · 超標" : ""}</span></div>
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
  const byMeal = ["breakfast", "lunch", "dinner", "snack"].map((id) => ({
    id,
    rec: today.find((r) => r.meal === id),
  }));
  const history = db.food.records.slice(0, 12);
  return `
    ${intakeCard("卡路里攝取量", kcal, p.kcalTarget, "kcal", "#3d9eff")}
    ${intakeCard("蛋白質攝取量", protein, p.proteinG, "g", "#3dffb0")}
    <div class="grid-2">
      ${intakeCard("脂肪攝取量", fat, p.fatG, "g", "#ff8a3d")}
      ${intakeCard("膽固醇攝取量", chol, p.cholesterolMg, "mg", "#ff5d73")}
    </div>
    ${byMeal
      .map(({ id, rec }) => {
        const meal = p.meals.find((m) => m.id === id);
        return `<article class="card">
          <div class="section-title" style="margin-top:0">${meal.label}<span>${meal.remindAt || "隨時"} · ${rec ? "已入" : "未入"}</span></div>
          ${
            rec
              ? `<div>${rec.items?.map((i) => i.name).join("、") || rec.notes || ""}</div>
                 <div class="fine">${fmt(rec.totalKcal, 0)} kcal · 蛋白 ${fmt(rec.totalProteinG, 0)}g · 脂肪 ${fmt(rec.totalFatG, 0)}g · 膽固醇 ${fmt(rec.totalCholesterolMg, 0)}mg</div>`
              : `<div class="fine">未有紀錄。用下面快速輸入。</div>`
          }
        </article>`;
      })
      .join("")}
    <article class="card">
      <div class="section-title" style="margin-top:0">快速輸入</div>
      <div class="chips" id="mealChips">
        ${["breakfast", "lunch", "dinner", "snack"]
          .map((id) => `<button class="chip ${id === currentMealSlot() ? "is-on" : ""}" data-meal="${id}" type="button">${mealLabel(id)}</button>`)
          .join("")}
      </div>
      <input id="foodItems" aria-label="食物" placeholder="例如：雞胸 200g、白飯、西蘭花" />
      <div class="grid-2">
        <input id="foodKcal" aria-label="卡路里 kcal" inputmode="decimal" placeholder="卡路里 kcal" />
        <input id="foodProtein" aria-label="蛋白質 g" inputmode="decimal" placeholder="蛋白質 g" />
        <input id="foodFat" aria-label="脂肪 g" inputmode="decimal" placeholder="脂肪 g" />
        <input id="foodChol" aria-label="膽固醇 mg" inputmode="decimal" placeholder="膽固醇 mg" />
      </div>
      <button class="btn" id="saveFood" type="button">存呢餐</button>
    </article>
    <div class="section-title">最近紀錄</div>
    <article class="card">
      ${
        history.length
          ? history
              .map(
                (r) =>
                  `<div class="list-item"><div><strong>${mealLabel(r.meal)}</strong><div class="fine">${r.date} · ${(r.items || []).map((i) => i.name).join("、") || r.notes || ""} · 蛋白 ${fmt(r.totalProteinG, 0)}g · 脂 ${fmt(r.totalFatG, 0)}g · 膽固醇 ${fmt(r.totalCholesterolMg, 0)}mg</div></div><strong>${fmt(r.totalKcal, 0)}</strong></div>`,
              )
              .join("")
          : `<div class="empty">未有飲食紀錄</div>`
      }
    </article>
  `;
}

function renderTrain() {
  const plan = db.profile.training.split.find((s) => s.weekday === weekdayHK());
  const today = todayTrain();
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
  return `
    <article class="hero">
      <div class="label">今日訓練</div>
      <div class="value" style="font-size:34px">${plan.title}</div>
      <div class="fine">${plan.focus} · 本週 ${weekCount} / ${db.profile.training.sessionsPerWeek} 堂</div>
    </article>
    ${
      today
        .map(
          (r) => `<article class="card"><strong>${r.title}</strong><div class="fine">${r.durationMin || 0} 分鐘 · ${fmt(r.kcalBurned, 0)} kcal · RPE ${r.rpe ?? "—"}</div>
          ${(r.exercises || []).map((e) => `<div class="list-item"><span>${e.name}</span><span>${e.sets || ""}×${e.reps || ""} ${e.weightKg ? e.weightKg + "kg" : ""}</span></div>`).join("")}</article>`,
        )
        .join("") || `<article class="card"><div class="empty">今日未訓練。做完用下面記低。</div></article>`
    }
    <article class="card">
      <div class="section-title" style="margin-top:0">記低呢堂</div>
      <input id="trainTitle" aria-label="訓練標題" value="${plan.title}" />
      <div class="chips" id="trainType">
        ${["strength", "cardio", "mobility", "other"]
          .map((t, i) => `<button class="chip ${i === 0 ? "is-on" : ""}" data-type="${t}" type="button">${{ strength: "力量", cardio: "有氧", mobility: "活動度", other: "其他" }[t]}</button>`)
          .join("")}
      </div>
      <input id="trainMoves" aria-label="訓練動作" placeholder="動作，例如：臥推 4x8 60kg、划船 4x10" />
      <div class="grid-2">
        <input id="trainMin" aria-label="分鐘" inputmode="numeric" placeholder="分鐘" />
        <input id="trainKcal" aria-label="消耗 kcal" inputmode="decimal" placeholder="消耗 kcal" />
      </div>
      <button class="btn" id="saveTrain" type="button">存訓練</button>
    </article>
    <article class="card">
      <div class="section-title" style="margin-top:0">最近訓練</div>
      ${
        db.fitness.records.length
          ? db.fitness.records
              .slice(0, 10)
              .map((r) => `<div class="list-item"><div><strong>${r.title}</strong><div class="fine">${r.date}</div></div><span>${r.durationMin || 0}分</span></div>`)
              .join("")
          : `<div class="empty">未有訓練紀錄</div>`
      }
    </article>
  `;
}

function renderCoach() {
  const msgs = db.coach.messages;
  return `
    ${msgs
      .map(
        (m) =>
          `<article class="msg ${m.role === "user" ? "me" : ""}"><div class="when">${(m.createdAt || "").replace("T", " ").slice(0, 16)} · ${m.role === "coach" ? "教練" : "你"}</div><strong>${m.title || ""}</strong><p style="white-space:pre-wrap;margin:6px 0 0">${m.body}</p></article>`,
      )
      .join("") || `<div class="empty">未有教練訊息</div>`}
    <article class="card">
      <textarea id="coachNote" aria-label="教練留言" placeholder="例如：而家想加強背部，或者今晚食咗燒味..."></textarea>
      <button class="btn" id="saveCoach" type="button">傳俾教練紀錄</button>
    </article>
  `;
}

function render() {
  const p = db.profile;
  const b = latest(db.body.records);
  $("greeting").textContent = `${greet()}，${p.displayName}`;
  const { days } = goalProgress(p, b);
  $("goalStrip").textContent = `肌肉型目標 · 仲有 ${days} 日到 ${p.goal.deadline} · 體脂 ${b?.bodyFatPercent ?? "—"}% → ${p.goal.targetBodyFatPercent}%`;
  $("screen").innerHTML = { home: renderHome, body: renderBody, food: renderFood, train: renderTrain, coach: renderCoach }[route]();
  document.querySelectorAll(".tab").forEach((el) => el.classList.toggle("is-active", el.dataset.route === route));
  bindPage();
}

function bindChips(id) {
  const root = $(id);
  if (!root) return;
  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    root.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-on", c === btn));
  });
}

function bindPage() {
  bindChips("mealChips");
  bindChips("trainType");
  $("saveFood")?.addEventListener("click", async () => {
    const meal = document.querySelector("#mealChips .chip.is-on")?.dataset.meal || currentMealSlot();
    const text = $("foodItems").value.trim();
    const kcal = Number($("foodKcal").value);
    const proteinG = Number($("foodProtein").value);
    const fatG = Number($("foodFat").value);
    const chol = Number($("foodChol").value);
    if (!text && !kcal) return toast("寫低食咗咩或者卡路里");
    const rec = {
      id: uid("food"),
      date: hkDate(),
      eatenAt: nowIso(),
      meal,
      items: text.split(/[、,，]/).map((n) => n.trim()).filter(Boolean).map((name) => ({ name })),
      totalKcal: Number.isFinite(kcal) && kcal > 0 ? kcal : null,
      totalProteinG: Number.isFinite(proteinG) && proteinG > 0 ? proteinG : null,
      totalCarbG: null,
      totalFatG: Number.isFinite(fatG) && fatG > 0 ? fatG : null,
      totalCholesterolMg: Number.isFinite(chol) && chol > 0 ? chol : null,
      notes: text,
      source: "app",
    };
    queueRecord("food", rec);
    db.food.records = [rec, ...db.food.records.filter((x) => x.id !== rec.id)];
    try {
      const token = getToken();
      if (token) {
        const next = { version: 1, updatedAt: nowIso(), records: db.food.records };
        const g = db.profile.github;
        await commitJson({ owner: g.owner, repo: g.repo, branch: g.branch, path: "db/food.json", json: next, token, message: `data: 飲食 ${mealLabel(meal)}` });
        toast("已寫入 GitHub");
      } else {
        toast("已暫存喺手機。填 GitHub token 或者用 Cursor 同步。");
      }
    } catch (err) {
      toast(err.message);
    }
    render();
  });
  $("saveTrain")?.addEventListener("click", async () => {
    const title = $("trainTitle").value.trim() || "訓練";
    const type = document.querySelector("#trainType .chip.is-on")?.dataset.type || "strength";
    const moves = $("trainMoves").value.trim();
    const rec = {
      id: uid("fit"),
      date: hkDate(),
      trainedAt: nowIso(),
      type,
      title,
      durationMin: Number($("trainMin").value) || null,
      kcalBurned: Number($("trainKcal").value) || null,
      rpe: null,
      muscleGroups: [],
      exercises: moves
        ? moves.split(/[、,，]/).map((name) => ({ name: name.trim(), sets: null, reps: null, weightKg: null }))
        : [],
      notes: moves,
      source: "app",
    };
    queueRecord("fitness", rec);
    db.fitness.records = [rec, ...db.fitness.records];
    try {
      const token = getToken();
      if (token) {
        const g = db.profile.github;
        await commitJson({
          owner: g.owner,
          repo: g.repo,
          branch: g.branch,
          path: "db/fitness.json",
          json: { version: 1, updatedAt: nowIso(), records: db.fitness.records },
          token,
          message: `data: 訓練 ${title}`,
        });
        toast("已寫入 GitHub");
      } else toast("已暫存喺手機。");
    } catch (err) {
      toast(err.message);
    }
    render();
  });
  $("saveCoach")?.addEventListener("click", () => {
    const body = $("coachNote").value.trim();
    if (!body) return;
    const rec = { id: uid("coach"), createdAt: nowIso(), role: "user", title: "留言", body };
    queueRecord("coach", rec);
    db.coach.messages = [rec, ...db.coach.messages];
    $("coachNote").value = "";
    toast("已記低。");
    render();
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

function openSettings() {
  const token = getToken();
  $("sheetTitle").textContent = "設定";
  $("sheetBody").innerHTML = `
    <a class="btn" href="./reminders.ics">加入飲食打卡日曆（09:30／13:30／20:00）</a>
    <button class="btn ghost row" id="notifyBtn" type="button">允許瀏覽器通知</button>
    <label class="fine">GitHub token（可選）</label>
    <input id="tokenInput" type="password" value="${token}" placeholder="ghp_..." autocomplete="off" aria-label="GitHub token" />
    <button class="btn" id="saveToken" type="button">儲存 token</button>
  `;
  $("sheet").hidden = false;
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
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

init();

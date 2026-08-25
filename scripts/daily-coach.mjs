#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tz = "Asia/Hong_Kong";

function hkDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(root, "db", name), "utf8"));
}

function weekday() {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date());
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
}

export function buildCoachMessage() {
  const profile = load("profile.json");
  const body = load("body.json");
  const food = load("food.json");
  const fitness = load("fitness.json");
  const latest = body.records[0];
  const today = hkDate();
  const days = Math.round(
    (new Date(`${profile.goal.deadline}T00:00:00+08:00`) - new Date(`${today}T00:00:00+08:00`)) / 86400000,
  );
  const kcal = food.records.filter((r) => r.date === today).reduce((n, r) => n + (r.totalKcal || 0), 0);
  const protein = food.records.filter((r) => r.date === today).reduce((n, r) => n + (r.totalProteinG || 0), 0);
  const fat = food.records.filter((r) => r.date === today).reduce((n, r) => n + (r.totalFatG || 0), 0);
  const chol = food.records.filter((r) => r.date === today).reduce((n, r) => n + (r.totalCholesterolMg || 0), 0);
  const trained = fitness.records.some((r) => r.date === today);
  const plan = profile.training.split.find((s) => s.weekday === weekday());
  const lines = [
    `Kp，離肌肉型目標仲有 ${days} 日（${profile.goal.deadline}）。`,
    latest
      ? `最新體重 ${latest.weightKg}kg、體脂 ${latest.bodyFatPercent}%、肌肉 ${latest.muscleMassKg}kg。目標：${profile.goal.targetWeightKg}kg / ${profile.goal.targetBodyFatPercent}% / ${profile.goal.targetMuscleMassKg}kg 肌肉。`
      : "未有身體數據。",
    `卡路里 ${kcal} / ${profile.nutrition.kcalTarget} kcal。蛋白質 ${protein} / ${profile.nutrition.proteinG}g。脂肪 ${fat} / ${profile.nutrition.fatG}g。膽固醇 ${chol} / ${profile.nutrition.cholesterolMg}mg。`,
    `今日訓練：${plan?.title || "—"}（${plan?.focus || ""}）${trained ? "，已打卡。" : "，未打卡。"}`,
  ];
  if ((latest?.bodyFatPercent || 0) > 18) lines.push("體脂仍然偏高：控制脂肪同膽固醇，蛋白質優先。");
  if (kcal > profile.nutrition.kcalTarget) lines.push("卡路里已超過每日參考。");
  if (fat > profile.nutrition.fatG) lines.push("脂肪已超過每日參考。");
  if (chol > profile.nutrition.cholesterolMg) lines.push("膽固醇已超過每日參考。");
  if (!trained && plan?.title !== "休息") lines.push("未訓練就去練力量，有氧用步行，保住肌肉。");
  if (protein < profile.nutrition.proteinG * 0.6) lines.push("蛋白質未夠，補雞胸、蛋、乳清或豆腐。");
  if ((latest?.visceralFatLevel || 0) >= 10) lines.push("內臟脂肪稍多，晚餐早啲、少汽水。");
  return {
    id: `coach-${today.replaceAll("-", "")}`,
    createdAt: `${today}T08:00:00+08:00`,
    role: "coach",
    title: "今日建議",
    body: lines.join("\n"),
  };
}

const coachPath = path.join(root, "db/coach.json");
const coach = JSON.parse(fs.readFileSync(coachPath, "utf8"));
const msg = buildCoachMessage();
coach.messages = [msg, ...coach.messages.filter((m) => m.id !== msg.id)];
coach.updatedAt = msg.createdAt;
fs.writeFileSync(coachPath, JSON.stringify(coach, null, 2) + "\n");
console.log(msg.body);

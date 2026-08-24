#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseForm(body = "") {
  const out = {};
  const chunks = body.split(/^### /m).filter(Boolean);
  for (const chunk of chunks) {
    const [head, ...rest] = chunk.split("\n");
    out[head.trim()] = rest.join("\n").trim().replace(/^_No response_$/m, "");
  }
  return out;
}

function hkNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return {
    date: `${g("year")}-${g("month")}-${g("day")}`,
    iso: `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}+08:00`,
  };
}

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function save(rel, json) {
  json.updatedAt = hkNow().iso;
  fs.writeFileSync(path.join(root, rel), JSON.stringify(json, null, 2) + "\n");
}

const mealMap = { 早餐: "breakfast", 午餐: "lunch", 晚餐: "dinner", 小食: "snack" };
const typeMap = { 力量: "strength", 有氧: "cardio", 活動度: "mobility", 其他: "other", 運動: "sports" };

export function ingest(issue) {
  const labels = (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));
  const form = parseForm(issue.body || "");
  const now = hkNow();
  if (labels.includes("food") || issue.title?.includes("飲食")) {
    const rec = {
      id: `food-issue-${issue.number}`,
      eatenAt: now.iso,
      date: form["日期"] || now.date,
      meal: mealMap[form["餐"]] || "lunch",
      items: String(form["食物"] || "")
        .split(/[、,\n]/)
        .map((n) => n.trim())
        .filter(Boolean)
        .map((name) => ({ name })),
      totalKcal: form["熱量kcal"] ? Number(form["熱量kcal"]) : null,
      totalProteinG: form["蛋白質g"] ? Number(form["蛋白質g"]) : null,
      totalCarbG: null,
      totalFatG: null,
      source: "issue",
      notes: form["備註"] || "",
    };
    const doc = load("db/food.json");
    doc.records = [rec, ...doc.records.filter((r) => r.id !== rec.id)];
    save("db/food.json", doc);
    return rec;
  }
  if (labels.includes("fitness") || issue.title?.includes("訓練")) {
    const rec = {
      id: `fit-issue-${issue.number}`,
      trainedAt: now.iso,
      date: form["日期"] || now.date,
      type: typeMap[form["類型"]] || "strength",
      title: form["標題"] || issue.title || "訓練",
      durationMin: form["分鐘"] ? Number(form["分鐘"]) : null,
      kcalBurned: form["消耗kcal"] ? Number(form["消耗kcal"]) : null,
      exercises: String(form["動作"] || "")
        .split(/\n/)
        .map((n) => n.trim())
        .filter(Boolean)
        .map((name) => ({ name })),
      source: "issue",
      notes: form["備註"] || "",
    };
    const doc = load("db/fitness.json");
    doc.records = [rec, ...doc.records.filter((r) => r.id !== rec.id)];
    save("db/fitness.json", doc);
    return rec;
  }
  throw new Error("Issue 未標 food 或 fitness，未有得入庫");
}

if (path.basename(process.argv[1] || "") === "ingest-issue.mjs") {
  let issue;
  if (process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    issue = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")).issue;
  } else if (process.argv[2]) {
    issue = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  } else {
    console.log("未有 Issue payload");
    process.exit(0);
  }
  console.log("已入庫", ingest(issue).id);
}

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateAll } from "./validate-db.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
function check(name, cond, detail) {
  if (!cond) errors.push(`${name}: ${detail}`);
}

validateAll();

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/css/app.css"), "utf8");
const js = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));

check("PWA display", manifest.display === "standalone", "manifest 要 standalone");
check("PWA lang", manifest.lang === "zh-HK", "manifest 語言要 zh-HK");
check("theme", String(manifest.theme_color).toLowerCase() === "#0b0b0f", "theme-color 要深色");
check("icons", manifest.icons?.length >= 2, "要有 PWA icons");
check("viewport", html.includes("viewport-fit=cover"), "iPhone 要 viewport-fit=cover");
check("status bar", html.includes("black-translucent"), "status bar 要 black-translucent");
check("touch icon", html.includes("apple-touch-icon"), "要有 apple-touch-icon");
check("tabbar", html.includes("tabbar") && html.includes("飲食"), "要有粵語底部導覽");
check("food first", (() => {
  const nav = html.slice(html.indexOf("tabbar"));
  return nav.indexOf("飲食") < nav.indexOf("身體") && nav.indexOf("身體") < nav.indexOf("訓練");
})(), "飲食要放開頭");
check("safe top", css.includes("safe-area-inset-top"), "頂部 Dynamic Island");
check("safe bottom", css.includes("safe-area-inset-bottom"), "底部 Home Indicator");
check("touch", css.includes("min-height: 44px") || css.includes("min-height:44px"), "觸控目標 44px");
check("input 16", css.includes("font-size: 16px"), "input 16px 防 iOS zoom");
check("tech blue", css.includes("#3d9eff"), "tech blue");
check("dark bg", css.includes("#0b0b0f"), "dark further 背景");
check("routes", ["body", "food", "train"].every((r) => js.includes(`"${r}"`)), "三個畫面");
check("no extra tabs", !html.includes("教練") && !html.includes("總覽"), "唔要教練同總覽頁");
check("macros", (js.includes("卡路里攝取量") || fs.readFileSync(path.join(root, "assets/js/kcal-burn.js"), "utf8").includes("卡路里攝取量")) && js.includes("蛋白質攝取量") && js.includes("脂肪攝取量") && js.includes("膽固醇攝取量"), "要分卡路里／蛋白／脂肪／膽固醇");
check("no setup banner", !js.includes("加入主畫面"), "網頁唔使 setup 提示");
check("no food form", !js.includes("快速輸入") && !js.includes("存呢餐"), "飲食用 Cursor 入，唔使網頁表格");
check("no train form", !js.includes("記低呢堂") && !js.includes("存訓練"), "訓練用 Cursor 入，唔使網頁表格");
check("body map", js.includes("bodyMap") && js.includes("肌群力量"), "訓練頁要有人體肌群圖");
check("meal colours", js.includes("mealHealth") && css.includes("meal-card-good") && css.includes("meal-card-warn"), "最近紀錄要有綠／黃背景");
check("refresh", html.includes("refreshBtn") && js.includes("hardRefresh"), "主畫面要有重新整理");
check("calendar", fs.existsSync(path.join(root, "reminders.ics")), "要有 Apple 日曆檔");
check("sw", fs.existsSync(path.join(root, "sw.js")) && fs.readFileSync(path.join(root, "sw.js"), "utf8").includes("bodyfit-v7"), "要有新版 service worker");
check("train kcal on food", js.includes("kcalIntakeCard") && css.includes("kcal-burn-label") && fs.existsSync(path.join(root, "assets/js/kcal-burn.js")), "飲食卡路里要分色顯示訓練消耗");
check("muscle map vectors", fs.existsSync(path.join(root, "assets/js/vendor/male-front.js")) && fs.existsSync(path.join(root, "assets/js/vendor/male-back.js")), "要有 MuscleMap 解剖向量");
check("iphone width", /min\(440px/.test(css), "欄寬要貼 iPhone 16 Pro Max 440px");

if (errors.length) {
  console.error("QA UI 失敗：\n" + errors.map((e) => "- " + e).join("\n"));
  process.exit(1);
}
console.log("QA UI 靜態檢查通過（iPhone 16 Pro Max PWA 契約）");

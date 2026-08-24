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
check("tabbar", html.includes("tabbar") && html.includes("總覽"), "要有粵語底部導覽");
check("safe top", css.includes("safe-area-inset-top"), "頂部 Dynamic Island");
check("safe bottom", css.includes("safe-area-inset-bottom"), "底部 Home Indicator");
check("touch", css.includes("min-height: 44px") || css.includes("min-height:44px"), "觸控目標 44px");
check("input 16", css.includes("font-size: 16px"), "input 16px 防 iOS zoom");
check("tech blue", css.includes("#3d9eff"), "tech blue");
check("dark bg", css.includes("#0b0b0f"), "dark further 背景");
check("routes", ["home", "body", "food", "train", "coach"].every((r) => js.includes(`"${r}"`)), "五個畫面");
check("calendar", fs.existsSync(path.join(root, "reminders.ics")), "要有 Apple 日曆檔");
check("sw", fs.existsSync(path.join(root, "sw.js")), "要有 service worker");
check("iphone width", /min\(440px/.test(css), "欄寬要貼 iPhone 16 Pro Max 440px");

if (errors.length) {
  console.error("QA UI 失敗：\n" + errors.map((e) => "- " + e).join("\n"));
  process.exit(1);
}
console.log("QA UI 靜態檢查通過（iPhone 16 Pro Max PWA 契約）");

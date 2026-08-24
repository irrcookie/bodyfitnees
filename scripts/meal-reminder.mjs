#!/usr/bin/env node
const slot = process.env.SLOT || process.argv[2] || "lunch";
const map = {
  breakfast: { time: "09:30", label: "早餐" },
  lunch: { time: "13:30", label: "午餐" },
  dinner: { time: "20:00", label: "晚餐" },
};
const info = map[slot];
if (!info) {
  console.error("未知時段", slot);
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) {
  console.log(`[dry-run] ${info.time} ${info.label}打卡提醒`);
  process.exit(0);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "bodyfit-meal-bot",
};

const title = "飲食打卡提醒";
const list = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=50`, { headers });
const issues = await list.json();
let issue = Array.isArray(issues) ? issues.find((i) => i.title === title) : null;
if (!issue) {
  const created = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      labels: ["reminder", "food"],
      body: "呢條 Issue 專門用嚟每日 09:30／13:30／20:00 飲食打卡通知。Watch 呢個 repo 就會收到 GitHub 通知。\n\n回覆格式：\n```\nmeal: breakfast\nkcal: 500\nprotein: 35\nitems: 蛋、燕麥\n```",
    }),
  });
  issue = await created.json();
}

const pages = "https://irrcookie.github.io/bodyfitnees/";
const body = `⏰ **${info.time} ${info.label}打卡**\n\nKp，記低呢餐食咗咩同熱量。可以：\n1. 喺 Cursor 對話傳相／文字\n2. 打開 [身體管理](${pages}) App 輸入\n3. 回覆呢條 Issue\n\n目標：2200 kcal／蛋白 160g，11月前做成肌肉型。`;
const res = await fetch(`https://api.github.com/repos/${repo}/issues/${issue.number}/comments`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ body }),
});
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
console.log(`已留言 Issue #${issue.number}`);

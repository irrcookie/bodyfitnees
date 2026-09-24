# 身體管理

Kp 嘅身體／飲食／訓練儀表板。資料全部放喺 Git 入面嘅 JSON（`db/`），網站用 GitHub Pages，專為 **iPhone 16 Pro Max 加入主畫面**。

介面同 bot 回覆用 **香港粵語（繁體）**。風格：dark further + tech blue。

## 三個 schema

| 用途 | Schema | 數據 |
|---|---|---|
| 飲食熱量 | `db/schema/food.schema.json` | `db/food.json` |
| 身體（小米） | `db/schema/body.schema.json` | `db/body.json` |
| 訓練 | `db/schema/fitness.schema.json` | `db/fitness.json` |

另外：`db/profile.json`（170cm／28歲／11月肌肉型目標）、`db/coach.json`（每日建議）、`db/brands.md`（常用牌子，而家有 Body Attack whey）。

## 點樣同我溝通（Cursor 對話）

Agent 入庫快徑：[`UPLOAD.md`](UPLOAD.md)。

Kp 喺 Cursor／Grok Bot chat **只傳相**（可加一句短 caption）。**唔使填網頁 form**，亦唔使確認 macros、餐段、或者講「push／merge」。

直接傳：

1. **小米體脂截圖** → OCR 之後寫入 `db/body.json`
2. **飯餐相** → `db/food.json`
3. **訓練器械相**（caption 可寫 kg × 組 × 次數／時間）→ `db/fitness.json`，人體圖會更新嗰個部位力量同趨勢

Agent 會自己分類、入庫、validate、開 data-only PR，**CI 綠咗就自己 merge 去 `main`**。GitHub Pages／PWA 會跟住自動更新。Kp 喺主畫面 App 撳 **重新整理** 就見到最新數據。飲食同訓練頁都冇輸入表格。

## iPhone 加入主畫面

1. 用 **Safari** 打開 GitHub Pages
2. 分享 → **加入主畫面**
3. 主畫面開「身體管理」：全畫面、避開 Dynamic Island 同底部橫條

設定入面可以：

- 下載 `reminders.ics`，加入 Apple 日曆（每日 09:30／13:30／20:00）
- 開瀏覽器通知（要加咗主畫面先穩）
- 可選填 GitHub token，由手機直接寫入 DB

## 提醒 bot

GitHub Actions 每日 **09:30、13:30、20:00（香港時間）** 會喺「飲食打卡提醒」Issue 留言。Watch 呢個 repo 就會收到 GitHub 通知／電郵。

同時請加入日曆檔，iPhone 鎖定畫面會準時彈。

## 教練同目標（2026-11-01 前）

- 體重守約 **72kg**（唔跟小米 63kg 標準體重）
- 體脂 **22.7% → 15%**
- 肌肉量 **53.3kg → 58kg**
- 每日蛋白 160g、卡路里參考 2200kcal、脂肪 70g、膽固醇 300mg、每週 5 堂力量

每日朝早 bot 會根據最新 DB 寫一則粵語建議到 `db/coach.json`。

## 本機

```bash
npm test
npm run serve
```

瀏覽器打開 `http://127.0.0.1:4173`

## GitHub Pages

正確網址係 **project site**，唔係帳戶根網址：

- 用呢個：<https://irrcookie.github.io/bodyfitnees/>
- 唔好用：`https://irrcookie.github.io/`（呢個會 404，因為 repo 名唔係 `irrcookie.github.io`）

第一次要開 Pages：

1. GitHub repo → **Settings → Pages**
2. Build and deployment → Source 選 **GitHub Actions**
3. 等 `GitHub Pages` workflow 變綠色
4. 用 Safari 打開上面嗰條 **bodyfitnees** 網址 → 分享 → 加入主畫面


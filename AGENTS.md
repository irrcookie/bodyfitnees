# 身體管理 — Agent 指引

呢個 repo 用 **Git 入面嘅 JSON 做資料庫**，GitHub Pages 做 iPhone Web App。所有 UI 同 bot 回覆用 **香港粵語（繁體）**。

## 資料庫

| Schema | 檔案 | 用途 |
|---|---|---|
| 飲食熱量 | `db/food.json` + `db/schema/food.schema.json` | 三餐／小食 |
| 身體紀錄 | `db/body.json` + `db/schema/body.schema.json` | 小米體脂磅 OCR |
| 訓練紀錄 | `db/fitness.json` + `db/schema/fitness.schema.json` | 力量／有氧 |
| 個人同目標 | `db/profile.json` | 170cm、28歲、11月肌肉型 |
| 教練訊息 | `db/coach.json` | 每日建議 |

寫入規則：

1. 唔好刪舊 record，用新 `id` append。
2. 改完更新該檔 `updatedAt`（`Asia/Hong_Kong`，`+08:00`）。
3. `node scripts/validate-db.mjs` 一定要過。
4. 唔好把個人 GitHub token 寫入 repo。

## 用家點同你溝通

入庫步驟、JSON 模板、餐段同估算表：**先讀 [`UPLOAD.md`](UPLOAD.md)**，唔使再翻 schema。

Kp 會喺 **Cursor 對話**傳：

- 小米人體成分報告截圖 → OCR 之後寫入 `db/body.json`
- 飯餐相或文字 → 寫入 `db/food.json`
- 訓練內容 → 寫入 `db/fitness.json`

OCR 小米報告時要盡量填晒 schema 欄位（體重、BMI、體脂、肌肉量、內臟脂肪、BMR、成分組成等）。截圖係傳統中文 label。

入庫後用粵語覆：記咗咩、同 11 月肌肉型目標差幾遠、今日飲食／訓練建議。

## 目標（2026-11-01 前）

- 體重大約 **72kg**（唔係小米嗰個 63kg 標準體重）
- 體脂 **~15%**（而家 22.7%）
- 肌肉量 **~58kg**（而家 53.3kg）
- 路線：增肌減脂，力量為主，有氧用步行

## iPhone Web App 約束

- 目標機：iPhone 16 Pro Max
- `viewport-fit=cover`、`apple-mobile-web-app-capable`、`black-translucent`
- 用 `env(safe-area-inset-*)`，頂部至少 62px、底部至少 34px（Dynamic Island + Home Indicator）
- 觸控目標 ≥ 44px；input 字體 ≥ 16px（防 iOS zoom）
- Dark further + tech blue，粵語 UI
- 唔好破壞 standalone / 底部 tabbar

## Bots

| Bot | 檔案 | 職責 |
|---|---|---|
| 飲食提醒 | `.github/workflows/meal-reminder.yml` | 09:30 / 13:30 / 20:00 HKT |
| 每日教練 | `.github/workflows/daily-coach.yml` | 根據 DB 寫 `db/coach.json` |
| 入庫 | `.github/workflows/ingest.yml` | Issue 表單 → JSON |
| 資料驗證 | `.github/workflows/validate.yml` | schema |
| QA UI | `.github/workflows/qa-ui.yml` | iPhone 16 Pro Max viewport |
| Debug | `.github/workflows/debug.yml` | Issue `bot-debug` |

改 UI 之後要跑 `npm test` 同 `node scripts/qa-ui.mjs`。

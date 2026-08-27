# Cursor 入庫快徑

Agent 見到餐相／器械相／小米截圖，**先跟呢份做**，唔使再翻 schema、UI、舊 PR。目標：判斷 → 寫 JSON → validate → 開 PR → CI 綠就自己 merge 去 `main` → 粵語覆，一次過做完。

Kp **只喺 Cursor／Grok Bot 對話傳相**（可以加一句短 caption）。**冇網頁 form**。Agent 自己分類相（餐／小米體脂／健身器械），跟下面規則入庫。**唔好**問佢確認 macros、餐段、或者要唔要 push／merge。

## 60 秒流程

1. 判斷類型（下表）。空 query + 食物相 = 入餐，唔好當 UI 任務。
2. 用 **香港時間 `+08:00`**。`id` 唔好含 `demo`。
3. **Append** `db/*.json` 最前或最後都可以，**唔好刪舊 record**。改檔頂 `updatedAt`。
4. `node scripts/validate-db.mjs`
5. 由 `origin/main` 開 `cursor/<short-name>-b07f`，commit、push、開 **data-only PR**（data 同 UI 分開）。
6. **Validate／CI 綠咗之後，agent 自己 regular merge 去 `main`**（commit 用 `Merge pull request #N from irrcookie/cursor/<short>-b07f`）。**唔使等 Kp 講 push 或 merge**。現有 Pages workflow 會自動 deploy，Kp 喺 PWA 撳重新整理就見到新數據。
7. 粵語覆：記咗咩、macros／重量、離 11 月目標幾遠、下一餐或訓練建議。

| 傳來嘅嘢 | 寫入 | `source` |
|---|---|---|
| 飯餐相（可加短 caption） | `db/food.json` | `chat` |
| 小米人體成分報告截圖 | `db/body.json` | `xiaomi` / `ocr` |
| 器械相（caption 可寫 `kg × 組 × 次數` 或時間） | `db/fitness.json` | `chat` |

## 時間同餐段

Timestamp 用對話時間轉 HKT。餐段：

| 本地鐘 | `meal` |
|---|---|
| 05:00–11:00 | `breakfast`（提醒 09:30） |
| 11:00–16:30 | `lunch`（提醒 13:30） |
| 16:30–24:00 | `dinner`（提醒 20:00） |
| 用家講小食／唔係正餐 | `snack` |

`eatenAt` / `trainedAt` / `measuredAt` 例：`2026-08-25T13:26:00+08:00`  
`date`：`2026-08-25`  
`id`：`food-20260825-lunch-carbonara`、`fit-20260825-leg-press`、`body-20260823-2136`

## 常用牌子 `db/brands.md`

固定產品營養寫喺 [`db/brands.md`](db/brands.md)。而家有 **Body Attack 100% Irish Whey**（Kp 朝早預設 50g 粉 + 水）。之後講「飲蛋白粉」就跟呢份，唔使再估。新牌子 chat 俾相就加落去。

## 飲食 `db/food.json`

每日參考（`db/profile.json`）：kcal **2200**、蛋白 **160g**、脂肪 **70g**、膽固醇 **300mg**。餐份額：早 0.25 / 午 0.35 / 晚 0.3 / 小食 0.1。

黃卡（高脂／膽固醇）如果：脂肪 > 該餐份額×70×1.2，或脂肪熱量 > 40%，或膽固醇 > 該餐份額×300×1.2。  
綠卡（高蛋白）如果未黃，而且蛋白 ≥ 該餐份額×160×0.85，或蛋白熱量 ≥ 28%。

相片無標籤就估算餐廳／家常一份，`notes` 寫明「由餐相估算」。`items[].name` 用粵語。`additionalProperties: false`，唔好加多欄。

```json
{
  "id": "food-YYYYMMDD-lunch-slug",
  "eatenAt": "YYYY-MM-DDTHH:mm:ss+08:00",
  "date": "YYYY-MM-DD",
  "meal": "lunch",
  "items": [
    {
      "name": "螺旋意粉",
      "amount": 320,
      "unit": "g",
      "kcal": 470,
      "proteinG": 16,
      "carbG": 94,
      "fatG": 2.5,
      "cholesterolMg": 0
    }
  ],
  "totalKcal": 1070,
  "totalProteinG": 44,
  "totalCarbG": 100,
  "totalFatG": 55,
  "totalCholesterolMg": 223,
  "photoNote": "相入面見到咩",
  "source": "chat",
  "notes": "由餐相估算。"
}
```

`totals` = 各 item 相加（四捨五入到整數即可）。

粗估（香港餐廳一份，無營養標就用呢個量級，再按相調整）：

| 樣 | kcal | 蛋白 g | 脂肪 g | 膽固醇 mg |
|---|---|---|---|---|
| 白飯一碗 | 280 | 6 | 1 | 0 |
| 雞胸 150g | 250 | 46 | 4 | 90 |
| 油炒時菜 | 180 | 4 | 14 | 0 |
| 忌廉意粉／碳拿拉 | 900–1100 | 35–45 | 45–60 | 180–250 |
| 漢堡薯條套餐 | 900–1200 | 30–40 | 40–55 | 80–140 |
| 蛋治／腸仔包 | 400–550 | 15–22 | 18–28 | 80–180 |
| 清湯麵 + 瘦肉 | 500–650 | 25–35 | 8–15 | 40–80 |

## 訓練 `db/fitness.json`

用家格式：器械相，caption 可寫 `kg × 組 × 次數`（或時間）。一個動作一行都可以。空 fitness 陣列直到第一堂真訓練，**唔好造 dummy workout**。相入面睇到重量／組數就直接入，**唔好**再問 Kp 確認。

`muscleGroups` 只准：`chest` `shoulders` `biceps` `triceps` `forearms` `back` `core` `quads` `glutes` `hamstrings` `calves`。名入面有蹲／腿伸 → quads；臥推 → chest；划船／下拉 → back。詳情 `assets/js/muscles.js` 關鍵字。

`type`：`strength` | `cardio` | `sports` | `mobility` | `other`。

```json
{
  "id": "fit-YYYYMMDD-slug",
  "trainedAt": "YYYY-MM-DDTHH:mm:ss+08:00",
  "date": "YYYY-MM-DD",
  "type": "strength",
  "title": "下肢",
  "durationMin": 55,
  "kcalBurned": null,
  "exercises": [
    {
      "name": "腿推",
      "sets": 4,
      "reps": 10,
      "weightKg": 120,
      "muscleGroups": ["quads", "glutes"]
    }
  ],
  "muscleGroups": ["quads", "glutes", "hamstrings"],
  "rpe": 7,
  "source": "chat",
  "notes": "由器械相 + 文字入庫"
}
```

同一日多個動作：合成 **一條** record（除非用家分開兩堂）。`title` 跟當日 split（一推力／二下肢／四拉力…）。有 `kcalBurned` 或 `durationMin` 時，飲食頁卡路里卡會用紫色顯示訓練扣減。

## 身體 `db/body.json`

小米報告截圖：OCR **盡量填晒 schema 欄**（體重、BMI、體脂、肌肉量、內臟脂肪、BMR、成分、status 中文）。Label 係傳統中文。

- 用家目標體重 **~72kg**，**唔好**跟小米「標準體重 63kg」做建議。
- `source`: `xiaomi`。`id`: `body-YYYYMMDD-HHmm`。
- 只 append；舊 2026-08-23 嗰條係基準（72.7kg、體脂 22.7%、肌肉 53.3kg、體型肥胖）。

## Git（Cloud Agent）

```bash
git fetch origin main
git checkout -b cursor/<descriptive>-b07f origin/main
# 改 db/*.json
node scripts/validate-db.mjs
git add db/<file>.json
git commit -m "Log lunch: …"
git push -u origin cursor/<descriptive>-b07f
# 開 data-only PR，base = main
```

PR 標題短、body 寫估算數字。data PR 唔好夾雜 UI。

**CI（validate）綠咗就自己 merge**，用 GitHub **regular merge**（唔好 squash／rebase），commit 風格同之前一樣：

```
Merge pull request #N from irrcookie/cursor/<short>-b07f
```

**唔好停手等 Kp 講「push」或「merge」。** merge 去 `main` 之後，GitHub Pages／PWA 會自動更新；Kp 只要撳重新整理。

## 覆用家（粵語）

```
記咗今日{早餐/午餐/晚餐}：{食物}。
估算：{kcal} kcal · 蛋白 {g}g · 脂肪 {g}g · 膽固醇 {mg}mg。（黃/綠/均衡）
對住 11 月目標（72kg、體脂 15%、肌肉 ~58kg）：{一句距離}。
下一餐／訓練：{具體建議}。
```

訓練就報 kg×組×次同邊啲肌群會喺人體圖亮。

## 唔好做

- 唔好清空 `records` 或改舊 id
- 唔好加 dummy 餐／dummy 訓練
- 唔好建議減到 63kg
- 唔好喺網頁加輸入 form
- 唔好為咗入一餐去改 CSS／tab
- 相片含糊就估算並寫 `notes`，唔好追問先停手（Cloud Agent 無得問）
- 唔好問 Kp 確認 macros、餐段、或者要唔要 push／merge
- 唔好等 Kp 講「push」或「merge」先入庫／合入 `main`

# iRent+ 智能車況管家

2026 和泰 AI 黑客松 iRent 題目的作品。用 AI 檢查取車與還車照片：拍照當下就在手機上擋掉模糊、太暗的照片，送出後由視覺語言模型（VLM）比對新車損、判斷車內整潔度、檢查加油卡和停車卡，有問題自動開預警和工單給營運團隊。

| | |
|---|---|
| 說明影片 | 待補 |
| 簡報 | 待補 |
| 手機取還車模擬 | https://irent-mobile.vercel.app |
| 營運後台 | https://irent-admin-sepia.vercel.app（需要密碼，另行提供） |

## 系統架構

三層，各自負責不同的延遲需求：

| 層級 | 在哪裡跑 | 做什麼 | 回應時間 |
|---|---|---|---|
| 即時層 | 手機瀏覽器 | 每張照片拍完立刻檢查清晰度、亮度、反光，不合格當場重拍 | 1 秒內 |
| 分析層 | 實驗室 GPU server 上的 worker | 用 VLM 比對取車照和還車照、判斷車內整潔度和遺留物、檢查卡片 | 送出後幾分鐘內 |
| 營運層 | Supabase 與營運後台 | 依結果開預警與工單，需要整理或維修的車自動暫停出租 | 即時 |

```
手機網頁（mobile/）
  拍照，即時品質檢查（src/lib/quality.ts）
  照片用簽名網址直接上傳
        |
        v
Supabase（supabase/）
  Postgres：車輛、租用、取還車紀錄、照片、分析結果、預警、工單
  Storage：取還車照片（私有 bucket）
        ^                                   |
        | 領工作、寫回結果                     | 預警、工單、車輛狀態
        |                                   v
VLM worker（worker/）                  營運後台（web/）
  vLLM + Qwen/Qwen3.5-9B               預警處理、工單、取還車紀錄、
  每張照片判讀 3 次取多數決              車輛管理、顧客評論
```

手機和後台都是 Next.js 16，部署在 Vercel；兩者只在伺服器端用 Supabase 的 Secret key，瀏覽器拿不到資料庫權限。

## 主要功能

### 取車與還車（手機）

- 介面照 iRent App 的取車、用車、還車畫面做，拍照順序也一樣：卡夾、前座、後座、左前、右前、左後、右後
- 頁面內直接開相機，疊上對齊框線和上一次同角度的半透明照片，按快門前就提示太暗或模糊
- 拍完立刻在手機上檢查畫質（門檻用 1,200 張真實還車照校準），不合格只能重拍
- 還車：按「開始還車」計費就停止，10 分鐘內拍完車內照片並鎖門，超過就取消還車、照常計費；鎖門不用等照片上傳完，地下室訊號差也能還車
- 鎖門後拍車外四角，最後提供停車位置（照片加說明），方便下一位用戶找車
- 可以主動拍下已知車損和其他損傷，保障自己的權益；送出後可查看 AI 初步判讀的取還車確認

### AI 分析（worker）

| 照片 | 判讀 | 可能開的預警 |
|---|---|---|
| 車外 4 角 | 跟基準照比對新車損（還車比取車照，取車比上一次紀錄） | 新車損、取車時已有的差異、無法比對送人工 |
| 前座、後座 | 整潔度與遺留物 | 髒汙、遺留物 |
| 卡夾 | 加油卡、停車卡是否都在 | 缺卡片 |
| 用戶自拍的損傷 | 描述看得到的損傷，和比對結果核對 | 用戶回報的損傷 |

新車損比對用主辦方的 144 組取還車照片評估，評估腳本和線上 worker 用同一套提示詞與多數決規則，方法見 `eval/README.md`。

### 營運後台

- 預警：依嚴重度排序，同一次取還車的預警合成一個案件；確認車損時可以記成已知車損，下一位用戶取車會被提示拍下來
- 工單：髒汙開清潔、嚴重車損開維修、缺卡片和遺留物要聯絡用戶；未完成的清潔、維修會讓車暫停出租
- 取還車紀錄、車輛管理（新增車輛、登錄基準照、已知車損）
- 顧客評論：爬蟲收集的 iRent 還車相關評論，可分類、標記重要程度和處理狀態

## 專案結構

| 目錄 | 內容 |
|---|---|
| `mobile/` | 手機取還車模擬（Next.js），說明見 `mobile/README.md` |
| `web/` | 營運後台（Next.js），說明見 `web/README.md` |
| `supabase/` | 資料表、Storage、觸發器的 SQL |
| `worker/` | 在 GPU server 上常駐的 VLM 分析程式，說明見 `worker/README.md` |
| `eval/` | 新車損判讀的評估腳本，說明見 `eval/README.md` |
| `scraper/` | PTT、Dcard、Google Play、App Store 的還車評論爬蟲與資料，說明見 `scraper/README.md` |
| `plan/` | 題目分析、系統架構、功能設計、模型策略、POC 與評估、簡報規劃 |
| `video/` | 說明影片的 Remotion 專案與旁白，說明見 `video/README.md` |

主辦方提供的照片資料集（`datasets/`）不公開，沒有放進 repo。

## 在本機執行

需要 Node.js 20.9 以上、一個 Supabase 專案；跑 worker 另外需要有 GPU 的機器。

### 1. 建資料庫

在 Supabase 的 SQL Editor 依序執行 `supabase/` 裡的：

1. `01_reviews.sql`
2. `04_inspections.sql`
3. `05_operations.sql`
4. `06_return_lock.sql`
5. `07_parking.sql`

`02_returns.sql`、`03_analyses.sql` 是早期的示範版本，已被 `04_inspections.sql` 取代，新專案不用執行。

### 2. 營運後台

```bash
cd web
npm install
cp .env.example .env.local   # 填 SUPABASE_URL、SUPABASE_SECRET_KEY、ADMIN_PASSWORD、SESSION_SECRET、MOBILE_BASE_URL
npm run import:reviews       # 匯入 scraper/output 的評論資料
npm run dev                  # http://localhost:3000
```

### 3. 手機取還車模擬

```bash
cd mobile
npm install
cp .env.example .env.local   # 填跟後台同一個 Supabase 專案的 SUPABASE_URL、SUPABASE_SECRET_KEY
npm run dev -- -p 3001       # http://localhost:3001
```

手機上的網頁相機需要 HTTPS，要用手機測試請部署到 Vercel；在電腦上用 localhost 可以用視訊鏡頭。

### 4. VLM worker

在 GPU server 上用 vLLM 啟動 `Qwen/Qwen3.5-9B`，再啟動 worker，步驟見 `worker/README.md`。沒有 GPU 時，照 `worker/README.md` 裝好套件、填好 `worker/.env` 後，可以用假模型測資料流：

```bash
cd worker
VLM_BACKEND=fake python -m irent_worker --check
```

### 5. 示範流程

1. 後台「車輛」新增一台車，用手機打開登錄連結拍基準照，車輛變成可借用
2. 手機首頁選車取車：拍照、損傷紀錄、確認取車，進入用車頁
3. 用車頁按「開始還車」：拍車內、鎖門、拍車外、提供停車位置後送出
4. worker 分析完，後台「預警」和「工單」出現結果；手機的歷史訂單可以看取還車確認

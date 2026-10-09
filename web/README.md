# iRent 營運後台

Next.js 16 加 Supabase。目前有顧客評論頁（`/reviews`），車況看板之後加。

## 第一次設定

1. 在 Supabase 建立專案。
2. 到 SQL Editor 開新查詢，貼上 `supabase/schema.sql` 的內容並執行，建立 `reviews` 資料表。
3. 填寫 `.env.local`（範本是 `.env.example`）：
   - `SUPABASE_URL`：Project Settings > Data API 的 Project URL
   - `SUPABASE_SECRET_KEY`：Project Settings > API Keys 的 Secret key（`sb_secret_...`）
   - `ADMIN_PASSWORD`：營運團隊共用的後台密碼
   - `SESSION_SECRET`：簽署登入 cookie 的隨機字串，例如 `openssl rand -hex 32`
4. 安裝並匯入資料：

```bash
cd web
npm install
npm run import:reviews      # 匯入 ../scraper/output 的爬蟲資料
npm run dev                 # http://localhost:3000/reviews
```

## 評論頁功能

- 問題分類統計，點分類可篩選列表
- 依來源、分類、星等、重要程度、處理狀態篩選，或搜尋標題和內文
- 每則評論可以標記「重要」或「不重要」，再按一次取消標記
- 篩選重要程度時，上方的統計和分類圖只計算該重要程度的評論
- 每則評論可以設定處理狀態（未處理、討論中、已修正、不處理）和團隊備註

## 評論資料

- 資料表：`supabase/schema.sql`
- 問題分類規則：`src/lib/review-categories.json`（關鍵字正規表示式）。修改後重新執行 `npm run import:reviews` 就會重新分類
- 匯入時，每個來源只用最新一份爬蟲檔案；以 `(source, source_id)` 去重。重要程度、處理狀態和備註不會被覆蓋

## 登入與安全性

- 全站（登入頁和靜態檔除外）都要先輸入共用密碼，由 `src/proxy.ts` 導向 `/login`
- 登入後發一個 7 天有效、用 `SESSION_SECRET` 簽署的 httpOnly cookie
- 每個 server action 和資料讀取都會再用 `requireSession()` 檢查一次
- 換密碼：改 `ADMIN_PASSWORD`（本機和 Vercel 都要改）。要讓所有人立刻登出：改 `SESSION_SECRET`
- Supabase Secret key 只在伺服器端使用，不會送到瀏覽器

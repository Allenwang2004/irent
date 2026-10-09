# 還車拍照模擬（手機網頁）

用網頁模擬 iRent App 的還車拍照流程，示範拍照當下的即時品質檢查。黑客松展示用，不需要登入。

## 流程

1. 選一筆模擬訂單（`rentals` 資料表的 3 筆 DEMO 訂單）
2. 依 iRent 的順序拍 6 張：前座、後座、左前、右前、左後、右後
3. 每張拍完立刻在瀏覽器裡檢查清晰度、亮度、反光
   - 不合格：只能重拍
   - 有提醒：可以重拍或仍使用
4. 通過的照片縮到長邊 1280px，用伺服器發的簽名網址直接上傳到 Supabase Storage
5. 確認後送出，營運後台（`web/` 的「還車照片」頁）就看得到

## 品質檢查門檻

在 `src/lib/quality.ts`，用資料集 1,200 張真實還車照片校準：

| 檢查 | 不合格 | 提醒 |
| --- | --- | --- |
| 清晰度（Laplacian 變異數，長邊 640） | < 20 | < 45 |
| 平均亮度 | < 20 | < 35 |
| 過曝面積 | > 30% | > 15% |

真實照片約 2 到 3% 會被判為不合格。目前只檢查畫質，還不會判斷拍攝角度或車牌。

## 本機開發

```bash
cd mobile
npm install
cp .env.example .env.local   # 填入跟 web/ 同一個 Supabase 專案的 URL 和 Secret key
npm run dev                  # 預設 http://localhost:3000，手機測試相機需要 HTTPS（部署到 Vercel）
```

資料表和 Storage bucket 由 repo 根目錄的 `supabase/02_returns.sql` 建立。

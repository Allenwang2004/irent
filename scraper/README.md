# iRent 還車體驗爬蟲

從 PTT、Dcard、Google Play、App Store 收集「iRent + 還車相關關鍵字」的文章與評論，輸出 CSV 與 JSON，用來了解客戶的還車體驗。

## 安裝

```bash
cd scraper
uv venv .venv
uv pip install --python .venv/bin/python -r requirements.txt
```

## 執行

```bash
.venv/bin/python irent_scraper.py                              # 全部來源
.venv/bin/python irent_scraper.py --sources google_play app_store
```

結果寫到 `output/irent_return_<時間>.csv` 與 `.json`（不進 git）。CSV 用 UTF-8 BOM，Excel 可直接開。

## 欄位

| 欄位 | 說明 |
| --- | --- |
| source | ptt / dcard / google_play / app_store |
| url | 原文連結 |
| board | PTT 板名或 Dcard 看板 |
| title, author, date | 標題、作者、日期 |
| rating | App 評論星等（1-5），文章為空 |
| matched_keywords | 命中的關鍵字 |
| snippets | 關鍵字前後各 60 字的片段 |
| content | 全文 |
| comments | PTT 推文，或 Google Play 官方回覆 |

## 篩選邏輯

- PTT、Dcard：內文、標題或推文要出現 `iRent`（不分大小寫），而且至少命中一個還車關鍵字
- App 評論：評論本身命中至少一個還車關鍵字（官方回覆不算）
- 關鍵字清單在 `irent_scraper.py` 的 `RETURN_KEYWORDS`，可自行增減

## 各來源限制

- PTT：只搜 `PTT_BOARDS` 列出的板，每板最多 10 頁搜尋結果
- Dcard：搜尋 API 被 Cloudflare 擋，改抓搜尋頁 HTML，每個查詢只能拿到前約 30 筆，所以用多組查詢字（`DCARD_QUERIES`）擴大範圍；留言抓不到，只有內文
- Google Play：抓最新 5000 則評論後再篩（`GOOGLE_PLAY_MAX_REVIEWS`）
- App Store：Apple 公開 RSS 只提供最新 50 則評論，數量較少
- 每次請求間隔 1-2 秒，請勿調太快

# VLM worker（實驗室 server）

在實驗室 server 上常駐，持續從 Supabase 領取「已送出的取車與還車」，用本機 vLLM 上的 VLM 判讀照片，把結果和預警寫回 Supabase，營運後台的「預警」頁就看得到。

## 它做什麼

```
後台新增車輛 → 手機開登錄連結拍基準照（registration，不需要分析）
手機取車（pickup）或還車（return）送出
        │  inspections.status = submitted、analysis_status = pending
        ▼
worker 領工作（claim_inspection，多台 worker 不會重複）
        │
        ├─ 卡片（遮陽板卡夾）→ card：加油卡、停車卡是否都在
        ├─ 車外 4 張 → compare：跟「基準」同角度的照片比對新車損
        │     取車的基準：這台車上一次的紀錄（上一次還車，或第一次出租時的登錄照）
        │     還車的基準：這筆租用的取車照
        ├─ 車內 2 張 → tidy：整潔度（乾淨／普通／髒汙）與遺留物
        ├─ 用戶自己拍的損傷（extra）→ describe：照片裡看得到什麼損傷，再和比對結果核對
        └─ 已知車損特寫（known_damage）→ 不判讀，留給人工當證據
        │
        │  每張照片判讀 VLM_RUNS 次（預設 3），多數決
        ▼
寫回 photo_analyses（每張照片一筆）與 alerts（需要人處理的預警），analysis_status = done
```

- compare 的提示詞、JSON schema、取樣參數、多數決規則和 `eval/compare_eval.py` 完全相同，所以評估跑出來的 recall、誤報率就是線上的表現。改其中一邊時兩邊要一起改，改完重跑評估。
- 「無法比對」不當成沒車損，會開一筆 `needs_review` 預警送人工，對應評估裡的 `flagged_recall`。
- tidy、card、describe 還沒有評估過，數字要先用標註資料量過才能拿去報告。

| 預警 kind | 什麼時候 | 嚴重度 |
|---|---|---|
| `new_damage` | 還車：過半次數判定和取車照比有新車損，訊息會註明用戶有沒有自行回報 | 有「中等」或「嚴重」為 high，否則 medium |
| `pickup_difference` | 取車：和上一次紀錄比有差異，不是這位用戶造成（上一位用戶或停放期間） | medium |
| `reported_damage` | 用戶自己拍的損傷。取車時：請營運確認後記成已知車損；還車時：註明比對有沒有也偵測到 | 取車 low、還車 medium |
| `dirty` | 整潔度多數決為髒汙（平手時取較髒的）；取車時指上一位用戶 | high |
| `left_item` | 過半次數看到遺留物 | medium |
| `card_missing` | 加油卡或停車卡不在卡夾裡；取車時指上一位用戶 | high |
| `needs_review` | 無法比對、卡夾沒拍到、或所有判讀都失敗 | low／medium |

營運人員在後台「預警」頁確認車損類的預警時，可以一併記成這台車的已知車損，下一位用戶取車就會被提示拍下這處損傷。

## 第一次設定

### 1. 建資料表（只做一次，任何電腦都可以）

到 Supabase 的 SQL Editor，貼上 repo 根目錄的 `supabase/04_inspections.sql` 並執行。它會取代 02、03 建的示範資料表（舊的示範還車資料會被刪除）。

### 2. 在 server 上安裝

沿用評估用的 `~/irent/.venv`（裡面已經有 vLLM、openai、pillow）：

```bash
cd ~/irent
git fetch && git switch feat/VLM && git pull
uv pip install --python .venv/bin/python -r worker/requirements.txt
cp worker/.env.example worker/.env
chmod 600 worker/.env
```

編輯 `worker/.env`，填入 `SUPABASE_URL` 和 `SUPABASE_SECRET_KEY`（跟 `web/`、`mobile/` 用同一個 Supabase 專案）。這個檔案不會進 git。

### 3. 先用假模型確認資料流

不需要 GPU，確認 Supabase 連得到、資料表都在：

```bash
cd ~/irent/worker
VLM_BACKEND=fake ../.venv/bin/python -m irent_worker --check
```

三行都要是 `ok` 或 `fake backend`。如果顯示 `TABLES MISSING`，回到第 1 步。

## 每次啟動

### 終端機 A：vLLM

照 `eval/README.md` 第 1 步啟動（`CUDA_HOME`、選比較空的 GPU、port 8137）。看到 `Application startup complete` 再往下。

### 終端機 B：worker

```bash
cd ~/irent/worker
../.venv/bin/python -m irent_worker --check   # vlm 那行要是 ok
../.venv/bin/python -m irent_worker           # 開始常駐，Ctrl+C 停止
```

要斷線後繼續跑，用 tmux：

```bash
tmux new -s irent-worker
cd ~/irent/worker && ../.venv/bin/python -m irent_worker
# 按 Ctrl+B 再按 D 離開；之後 tmux attach -t irent-worker 回來看
```

正常的 log 長這樣：

```
worker gpu-server:12345 polling every 5s (model Qwen/Qwen3.5-9B, backend openai, 3 runs per photo)
done 7cfdbb21 plate=ABC-1234 baseline=yes alerts=1 in 18.4s [compare:no_new_damage, compare:new_damage, ..., tidy:clean]
```

## 常用指令

| 指令 | 用途 |
|---|---|
| `python -m irent_worker` | 常駐，每 `POLL_SECONDS` 秒查一次有沒有新的取車或還車 |
| `python -m irent_worker --once` | 處理一筆就結束，方便除錯 |
| `python -m irent_worker --session <inspection id>` | 重新判讀指定的取車或還車（例如改了提示詞之後），會覆蓋舊結果和未處理的預警 |
| `python -m irent_worker --check` | 檢查 Supabase 和 vLLM 連線 |
| `VLM_BACKEND=fake FAKE_VLM_FLAG=damage python -m irent_worker --once` | 不用 GPU，產生一筆「有新車損」的假結果，測後台預警顯示（`dirty` 測髒汙、`card` 測缺卡片） |
| `python tests/test_decide.py` | 測多數決規則 |

設定都在 `worker/.env`，可用的項目和預設值見 `.env.example`。

## 示範流程

1. 後台「車輛」新增實車（車牌、車型），用手機打開頁面上的登錄連結，拍卡片和 6 個角度 → 車輛變成可借用
2. （選用）在後台車輛頁新增登錄時就有的舊傷 → 取車時會提示用戶拍下來
3. 手機取車 → worker 用登錄照比對，車況一樣就不會有 `pickup_difference`
4. 車身某處貼一小段膠帶（模擬新刮傷），手機還車，在「這次租用有造成損傷嗎？」可以選擇拍下來回報 → worker 用取車照比對，開 `new_damage`（並註明用戶有沒有回報）
5. 後台「預警」頁確認 → 記成已知車損；下一次取車就會提示這處損傷

## 失敗與重試

- 判讀中 worker 當掉：該筆會停在 `running`，超過 `STALE_MINUTES`（預設 15 分鐘）後被重新領取。
- 處理時發生錯誤（連不到 vLLM、照片下載失敗等）：退回 `pending` 重試，最多 `MAX_ATTEMPTS` 次（預設 3），之後標成 `error`，原因寫在 `inspections.analysis_error`。
- 連不到 vLLM（沒啟動、重啟中、模型名稱不符）：worker 不領新工作，log 出現 `vLLM not ready`，每 `POLL_SECONDS` 秒檢查一次，恢復後出現 `vLLM ready` 再繼續。判讀到一半 vLLM 停掉的那筆會退回 `pending`，算用掉一次。
- 連不到 Supabase：worker 不會結束，log 出現 `claim failed`，每 `POLL_SECONDS` 秒重試。
- 個別判讀失敗（逾時、JSON 解析失敗）：不算整筆失敗，由其他次判讀多數決；全部失敗才開 `needs_review` 預警。

查詢目前狀態（Supabase SQL Editor）：

```sql
select kind, analysis_status, count(*) from inspections where status = 'submitted' group by 1, 2;
select id, kind, analysis_attempts, analysis_error from inspections where analysis_status = 'error';
```

## 還沒做的

- tidy、card、describe 的評估：需要標註過的照片。
- 已知車損特寫的判讀（例如損傷是否擴大）：目前只存證，不分析。
- 通知（Slack 或 LINE）：預警建立時推播給營運人員。

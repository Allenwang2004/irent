# VLM worker（實驗室 server）

在實驗室 server 上常駐，持續從 Supabase 領取「已送出的還車」，用本機 vLLM 上的 VLM 判讀照片，把結果和預警寫回 Supabase，營運後台就看得到。

## 它做什麼

```
手機模擬（mobile/）送出還車
        │  return_sessions.status = submitted、analysis_status = pending
        ▼
worker 領工作（claim_return_session，多台 worker 不會重複）
        │
        ├─ 車外 4 張（左前、右前、左後、右後）→ compare：跟「同一台車上一次還車」同角度的照片比對新車損
        │     第一次還車的車沒有可比的照片 → no_baseline，不判讀
        └─ 車內 2 張（前座、後座）→ tidy：整潔度（乾淨／普通／髒汙）與遺留物
        │
        │  每張照片判讀 VLM_RUNS 次（預設 3），多數決
        ▼
寫回 photo_analyses（每張照片一筆）與 alerts（需要人處理的預警），analysis_status = done
```

- compare 的提示詞、JSON schema、取樣參數、多數決規則和 `eval/compare_eval.py` 完全相同，所以評估跑出來的 recall、誤報率就是線上的表現。改其中一邊時兩邊要一起改，改完重跑評估。
- 「無法比對」不當成沒車損，會開一筆 `needs_review` 預警送人工，對應評估裡的 `flagged_recall`。
- tidy 還沒有評估過，數字要先用標註資料量過才能拿去報告。

| 預警 kind | 什麼時候 | 嚴重度 |
|---|---|---|
| `new_damage` | 過半次數判定有新車損 | 有「中等」或「嚴重」為 high，否則 medium |
| `dirty` | 整潔度多數決為髒汙（平手時取較髒的） | high |
| `left_item` | 過半次數看到遺留物 | medium |
| `needs_review` | 無法比對，或所有判讀都失敗 | low／medium |

## 第一次設定

### 1. 建資料表（只做一次，任何電腦都可以）

到 Supabase 的 SQL Editor，貼上 repo 根目錄的 `supabase/03_analyses.sql` 並執行。它需要 `02_returns.sql` 已經跑過（在 `feature/app` 分支上，之前已經跑了）。

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
| `python -m irent_worker` | 常駐，每 `POLL_SECONDS` 秒查一次有沒有新的還車 |
| `python -m irent_worker --once` | 處理一筆就結束，方便除錯 |
| `python -m irent_worker --session <return id>` | 重新判讀指定的還車（例如改了提示詞之後），會覆蓋舊結果和未處理的預警 |
| `python -m irent_worker --check` | 檢查 Supabase 和 vLLM 連線 |
| `VLM_BACKEND=fake FAKE_VLM_FLAG=damage python -m irent_worker --once` | 不用 GPU，產生一筆「有新車損」的假結果，測後台預警顯示（`FAKE_VLM_FLAG=dirty` 測髒汙） |
| `python tests/test_decide.py` | 測多數決規則 |

設定都在 `worker/.env`，可用的項目和預設值見 `.env.example`。

## 示範時怎麼產生可比對的資料

compare 需要同一台車的上一次還車當基準，所以同一筆模擬訂單（同一個車牌）要還車兩次：

1. 手機模擬選 ABC-1234 還車一次 → worker 判讀結果是 `no_baseline`（車外）＋整潔度（車內）
2. 同一筆訂單再還車一次，這次車身某處貼膠帶或用有車損的照片（「從相簿選擇」）→ worker 拿第 1 次的照片當基準比對

## 失敗與重試

- 判讀中 worker 當掉：該筆會停在 `running`，超過 `STALE_MINUTES`（預設 15 分鐘）後被重新領取。
- 處理時發生錯誤（連不到 vLLM、照片下載失敗等）：退回 `pending` 重試，最多 `MAX_ATTEMPTS` 次（預設 3），之後標成 `error`，原因寫在 `return_sessions.analysis_error`。
- 個別判讀失敗（逾時、JSON 解析失敗）：不算整筆失敗，由其他次判讀多數決；全部失敗才開 `needs_review` 預警。

查詢目前狀態（Supabase SQL Editor）：

```sql
select analysis_status, count(*) from return_sessions where status = 'submitted' group by 1;
select id, analysis_attempts, analysis_error from return_sessions where analysis_status = 'error';
```

## 還沒做的

- 營運後台顯示 `alerts` 和 `photo_analyses`：在 `feature/app` 的 `web/` 加預警頁與照片判讀結果（下一步）。
- tidy 的評估：需要標註過的車內照片（乾淨／普通／髒汙）。
- 通知（Slack 或 LINE）：預警建立時推播給營運人員。

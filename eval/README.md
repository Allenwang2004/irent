# 新車損判讀評估（開源 VLM）

用本機 vLLM 跑開源 VLM，比對 `datasets/pairs.json` 裡的取車照與還車照，量測新車損判讀的 recall、誤報率、穩定度與延遲。

- 評估資料：`datasets/pairs.json`，共 144 組。24 組有索賠（`claim`），120 組沒有索賠（`no_claim`，30 台車 × 4 個角度）。
- 評估腳本：`eval/compare_eval.py`
- 目前模型：`Qwen/Qwen3.5-9B`（中型的 `Qwen/Qwen3.8-27B-FP8` 暫停中）

`datasets/` 在 `.gitignore` 裡，評估結果含車牌，不會被 commit。

## 事前準備（只需做一次）

這台機器上已經做好，換機器時才需要：

```bash
cd ~/irent
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python vllm
.venv/bin/hf download Qwen/Qwen3.5-9B

# 對照圖用的中文字型（Noto Sans CJK TC，SIL Open Font License）
mkdir -p ~/.local/share/fonts
for w in Regular Bold; do
  curl -sSfL -o ~/.local/share/fonts/NotoSansCJKtc-$w.otf \
    "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-$w.otf"
done
```

## 1. 啟動 vLLM（終端機 A，保持開著）

```bash
cd ~/irent
export CUDA_HOME=/usr/local/cuda
CUDA_VISIBLE_DEVICES=3 .venv/bin/vllm serve Qwen/Qwen3.5-9B \
  --host 127.0.0.1 --port 8137 \
  --gpu-memory-utilization 0.4 \
  --max-model-len 16384 --max-num-seqs 16 \
  --limit-mm-per-prompt '{"image": 2, "video": 0}' \
  --reasoning-parser qwen3
```

第一次啟動要編譯 kernel，可能要幾分鐘；看到 `Application startup complete` 代表啟動完成。

參數說明：

| 參數 | 用途 |
|---|---|
| `export CUDA_HOME=/usr/local/cuda` | **必要。** 系統預設的 `/usr/bin/nvcc` 是 CUDA 12.0，FlashInfer 會因此誤判 GPU 不支援，啟動失敗並出現 `FlashInfer requires GPUs with sm75 or higher`。`/usr/local/cuda` 是 CUDA 13.2。 |
| `CUDA_VISIBLE_DEVICES=3` | 只用 GPU 3。GPU 是多人共用，開跑前先用 `nvidia-smi` 看哪張卡比較空。 |
| `--host 127.0.0.1` | 只允許本機連線。 |
| `--gpu-memory-utilization 0.4` | 最多使用 GPU 總記憶體的 40%（約 39GB），避免影響同一張卡上的其他程式。 |
| `--limit-mm-per-prompt` | 每次請求最多 2 張圖（取車照＋還車照）。 |
| `--reasoning-parser qwen3` | 開啟思考模式時，把思考內容和最後的 JSON 答案分開。 |

## 2. 跑評估（終端機 B）

```bash
cd ~/irent

# 確認服務已啟動
curl -s http://127.0.0.1:8137/v1/models

# 試跑 10 組（有索賠、沒索賠各 5 組），每組 3 次
.venv/bin/python eval/compare_eval.py --model Qwen/Qwen3.5-9B --base-url http://127.0.0.1:8137/v1 --limit 10

# 跑完整 144 組（已完成的會自動跳過，接續上一步的結果）
.venv/bin/python eval/compare_eval.py --model Qwen/Qwen3.5-9B --base-url http://127.0.0.1:8137/v1

#（選用）開啟思考模式，結果另存成 Qwen3.5-9B-thinking.jsonl
.venv/bin/python eval/compare_eval.py --model Qwen/Qwen3.5-9B --base-url http://127.0.0.1:8137/v1 --thinking

# 只重算指標，不呼叫模型
.venv/bin/python eval/compare_eval.py --summarize datasets/eval_results/Qwen3.5-9B.jsonl
```

其他常用選項：

| 選項 | 預設值 | 用途 |
|---|---|---|
| `--runs` | 3 | 每組判讀幾次，用來量穩定度 |
| `--concurrency` | 8 | 同時送出的請求數 |
| `--max-side` | 1280 | 圖片長邊上限（像素） |
| `--out` | `datasets/eval_results/<模型名>.jsonl` | 結果檔位置 |
| `--no-viz` | 關閉 | 跑完不產生對照圖 |

## 3. 結束

在終端機 A 按 `Ctrl+C` 停掉 vLLM，再用 `nvidia-smi` 確認 GPU 3 的記憶體已釋放。

## 結果與指標

| 檔案 | 內容 |
|---|---|
| `datasets/eval_results/<模型名>.jsonl` | 每次判讀的原始結果（一行一筆） |
| `datasets/eval_results/<模型名>.summary.json` | 指標彙總，另列出每組有索賠的判讀結果和誤報清單 |

每組會判讀多次，以多數決決定該組的結果：

| 指標 | 意義 |
|---|---|
| `recall` | 有索賠的組裡，判定「有新車損」的比例 |
| `false_positive_rate` | 沒索賠的組裡，被判定「有新車損」的比例 |
| `flagged_recall` | 有索賠的組裡，判定「有新車損」或「無法比較」的比例；無法比較的會送人工，這個數字比較接近實際流程 |
| `flagged_false_positive_rate` | 沒索賠的組裡，被判定「有新車損」或「無法比較」的比例 |
| `consistency` | 同一組多次判讀結果一致的比例 |
| `request_errors` | 請求失敗或 JSON 解析失敗的次數 |
| `latency_s` | 每次請求的延遲（p50、p95） |

有索賠的只有 24 組，指標的誤差範圍很大，報告時要一併附上樣本數。

## 對照圖

評估跑完會自動產生對照圖，每組一張 PNG：左邊取車照、中間還車照、右邊列出每次判讀的結論、能否比對、信心、損傷位置、觀察與理由。

也可以對既有的結果檔單獨產生（只用 CPU，約 10 秒）：

```bash
.venv/bin/python eval/visualize.py datasets/eval_results/Qwen3.5-9B.jsonl
```

圖片依多數決的結果分資料夾，規則與 summary 的 recall、誤報率相同：

| 資料夾 | 意思 |
|---|---|
| `datasets/eval_results/<模型名>_viz/TP/` | 有索賠，判定有新車損 |
| `.../FN/` | 有索賠，判定沒有（漏報） |
| `.../FP/` | 沒索賠，判定有新車損（誤報） |
| `.../TN/` | 沒索賠，判定沒有 |
| `.../ERROR/` | 每次判讀都失敗 |

檔名格式是 `車號_位置_v票數of次數[_nc無法比對次數].png`，例如 `RDU-9162_左前_v1of3_nc3.png` 代表 3 次中 1 次說有新車損、3 次都說無法比對。`v1of3`、`v2of3` 這類票數不一致的是邊緣案例；FN 裡帶 `_nc` 的，實際流程中會送人工，不算真的漏掉。

每次重新產生會先清空舊的分類資料夾。一個模型的 144 張圖約 300MB。

## 疑難排解

| 狀況 | 處理方式 |
|---|---|
| `FlashInfer requires GPUs with sm75 or higher` | 沒有設 `CUDA_HOME=/usr/local/cuda`，見第 1 步 |
| 記憶體不足（OOM） | GPU 被其他程式佔用，換一張比較空的卡，或調低 `--gpu-memory-utilization` |
| `curl` 連不上 | vLLM 還在啟動中，或 port 不一致；`--base-url` 要和 `--port` 對上 |

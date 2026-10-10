# iRent+ 說明影片

完整版：`out/irent-plus_full.mp4`（v3，2:55.8，1080p，旁白是微軟台灣腔 AI 語音「雲哲」）。舊版：`out/irent-plus_full_v2.mp4`（v2，2:36.9）、`out/irent-plus_full_v1-kokoro.mp4`（v1，2:58.8）。

| 路徑 | 內容 |
|---|---|
| `01-故事線與分鏡表.md` | v3 故事線、8 個機制、逐段分鏡、成片時間表、數字來源 |
| `配音稿.md` | 真人配音用：每句的檔名、台詞、目前長度 |
| `archive/` | v2 的分鏡表與配音稿 |
| `remotion/` | 影片專案（動畫、字幕、旁白對時都在這裡） |
| `remotion/src/copy.ts` | **畫面上所有文字與數據**（改字改這裡） |
| `remotion/public/audio/` | 旁白音檔（每句一個 WAV，`lines.json` 記錄文字與長度） |
| `remotion/public/demo/` | 放 Demo 實機錄影的地方 |
| `remotion/public/private/` | 由主辦方照片做成的模糊縮圖，**只限競賽使用，已排除在 git 外** |
| `tools/tts/` | 旁白台詞（`narration.json`）與產生語音的腳本 |
| `out/` | 輸出的影片（已排除在 git 外） |

## 預覽與輸出

```bash
cd video/remotion
npm install                  # 第一次才需要
npx remotion studio          # 瀏覽器預覽，可拖時間軸；左側可單獨看每一段（S0–S8）
npx remotion render Main ../out/irent-plus_full.mp4
```

Studio 左上會顯示總長度。**比賽限制 3 分鐘，改完旁白要確認不超過 3:00。**

## 改台詞與配音

影片的每一段都依旁白長度自動對時，所以換配音不用動畫面，只要換音檔。每句裡的動畫時間點（例如念到「尖峰」時長條變紅）是照 `remotion/src/tuned-lengths.json` 的句長排的，換成較快或較慢的聲音時會按比例伸縮，不用手動對。

台詞都在 `tools/tts/narration.json`：`subtitle` 是畫面字幕，也是台灣腔語音念的文字；`spoken` 是給方法二的 Kokoro 念的版本（簡體、數字寫成國字）。

### 方法一：台灣腔 AI 語音（目前使用：雲哲）

`tools/tts/make_narration_tw.py` 用微軟的台灣腔語音（曉臻、曉雨、雲哲）。要在自己的電腦上跑（需要連到微軟的語音服務）：

```bash
cd video/tools/tts
uv run make_narration_tw.py --preview                                  # 三個聲音的試聽檔，存在 preview_tw/
uv run make_narration_tw.py --voice zh-TW-YunJheNeural --rate=-2%      # 產生全部旁白並取代 remotion/public/audio/
```

跑完重新輸出影片即可。

- 沒有 uv 的話先 `pip install edge-tts soundfile numpy`，再把 `uv run` 換成 `python`。
- `--rate` 要寫等號，負值才不會被當成參數。目前影片的旁白是用 `--rate=-8%` 產生後，再加快 6%（ffmpeg `atempo=1.06`，音高不變）壓在 3 分鐘內，語速約等於 `--rate=-2%`；之後重新產生時直接用 `--rate=-2%` 即可。
- 念法要跟字幕不同的詞寫在腳本裡的 `SAY`：目前「iRent+」念成「iRent Plus」、「1 人」念成「一個人」、「還車」念成同音的「環車」（不然句首的「還」會被念成「海」）。個別句子也可以在 `narration.json` 加 `spoken_tw` 欄位。
- 預設走 edge-tts（免費但非官方）；設定 `AZURE_SPEECH_KEY`、`AZURE_SPEECH_REGION` 就改用 Azure 官方服務（免費額度就夠）。
- 腳本會印出旁白總長：**要在 148 秒以內，影片才不會超過 3:00**（目前 146 秒）。

### 方法二：離線 AI 語音（Kokoro，第一版用的）

不用連網，但口音偏大陸腔。

1. 第一次使用要裝套件、下載語音模型（約 360 MB）：
   ```bash
   pip install sherpa-onnx soundfile
   cd video/tools/tts
   curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_1.tar.bz2
   tar xjf kokoro-multi-lang-v1_1.tar.bz2
   ```
2. 執行 `python make_narration.py`，再重新輸出影片。

換聲音改 `narration.json` 的 `voice_sid`（中文女聲約 3–58，男聲約 59–102），語速改 `speed`。念錯的字加進 `pronunciations`（已修正「還車」）。

### 方法三：真人配音（建議正式版使用）

1. 照 `配音稿.md` 一句一句錄，每句存成同名 WAV（例如 `s1_1.wav`）。
2. 全部放進 `remotion/public/audio/`，覆蓋原本的檔案。
3. 執行 `python tools/tts/measure.py`，它會量出每個檔案的長度並更新 `lines.json`。
4. 重新輸出影片。

台詞如果有改，記得同步改 `remotion/public/audio/lines.json` 裡的 `text`（字幕）。

### 方法四：只換其中幾句

只覆蓋要換的那幾個 WAV，再執行 `measure.py`，其他句子不受影響。

## 放入 Demo 實機錄影

目前 Demo 段是依 App 與後台實際介面與文案做的示意畫面（畫面下方標「示意畫面」）。把錄影放進 `remotion/public/demo/`，檔名照下表，重新輸出就會自動取代（不用改程式）。錄影建議 1080p 以上、30fps；手機請直式錄整個螢幕。

| 檔名 | 段落 | 內容 |
|---|---|---|
| `s2-reviews.mp4` | 0:21 | 評論管理後台 `/reviews`：來源、問題類型分布、處理狀態 |
| `s5a-pickup.mp4` | 1:06 | 手機：取車開場頁的「已記錄的損傷」→ 損傷紀錄頁拍下特寫 |
| `s5b-camera.mp4` | 1:13 | 手機：即時相機、上次照片疊影、晃動與太暗提示、拍照通過 |
| `s5c-return.mp4` | 1:24 | 手機：還車損傷紀錄 → 確認照片 → 送出 → 還車完成 |
| `s5e-vehicles.mp4` | 1:49 | 手機：取車清單，車輛從可借用變成整備中 |
| `s5f-alerts.mp4` | 1:59 | 後台：預警頁，確認一筆車損並記成已知車損，再駁回一筆誤報 |
| `s5g-receipt.mp4` | 2:14 | 手機：歷史訂單 → 還車確認 → 取車確認 |

每段錄長一點沒關係，影片只會取需要的長度（從頭開始播）。如果要從錄影中間開始，可在 `src/scenes/S5Demo.tsx` 設定 `startFrom`。

## 還沒做完的部分

- **隊名**：結尾目前不顯示。填進 `src/copy.ts` 的 `S8.team`（例如 `"隊名：○○○"`）就會出現。
- **VLM 評估數字**：召回率、誤報率出來後，可以加進 S6 技術段（`src/copy.ts` 的 `S6.metrics`，畫面要另外加回）。
- **AI 標記率**：人力估算用 10%（`src/copy.ts` 的 `S7`），有實測數字後一起更新。

# iRent+ 說明影片

**v11 草稿**：`out/irent-plus_full_v11-draft.mp4`（3:19.8，1080p），以及整支加速到 3 分鐘內的 `out/irent-plus_full_v11-draft_3min.mp4`（2:59.5，加速 1.11 倍）。v11 拿掉 S1 的 24 小時長條圖（旁白已經不講尖峰）。v10 為了縮短長度：刪掉「尖峰每 1.7 秒」那句、S4 三句合成一句、S5f 第一句縮短、每段結尾的停頓縮短、封面縮成 2.6 秒。

v9 依 pp 對旁白的檢查意見修改：用詞統一（用戶、營運後台）、術語改白話，並補上「省人力」與「提升用戶體驗」兩條線（每天要看的從 4,800 筆降到約 480 筆、一年估計省下 540–1,080 萬元人事成本；當場重拍、還車痛點的評論原文、下一位不會借到有問題的車）。改了什麼見 `01-故事線與分鏡表.md` 開頭。每個要放實機 Demo 的位置用紅框和紅色標籤標出來。

> 草稿裡有 34 句旁白是暫用的離線語音（口音不同，已調成雲哲的語速），其餘沿用 v3 的雲哲。**繳交前請在自己的電腦重跑一次雲哲**（見下方「重新產生旁白」），整支影片的聲音就會一致。

舊版：`out/irent-plus_full_v10-draft.mp4`（v10 草稿，還有長條圖；`_3min` 是加速版）、`out/irent-plus_full_v9-draft.mp4`（v9 草稿，3:33.1；`_x1.185` 是整支加速到 3:00 的試聽版）、`out/irent-plus_full_v8-draft.mp4`（v8 草稿，3:19.5）、`out/irent-plus_full_v7-draft.mp4`（v7 草稿）、`out/irent-plus_full_v6-draft.mp4`（v6 草稿）、`out/irent-plus_full_v5-draft.mp4`（v5 草稿，2:58.5）、`out/irent-plus_full_v4-draft.mp4`（v4 草稿）、`out/irent-plus_full.mp4`（v3，2:55.8）。

| 路徑 | 內容 |
|---|---|
| `01-故事線與分鏡表.md` | v4 故事線、9 個機制、逐段分鏡、**實機 Demo 位置**、成片時間表、數字來源 |
| `配音稿.md` | 真人配音用：每句的檔名、台詞、目前長度 |
| `archive/` | v2、v3 的分鏡表與配音稿 |
| `remotion/` | 影片專案（動畫、字幕、旁白對時都在這裡） |
| `remotion/src/copy.ts` | **畫面上所有文字與數據**（改字改這裡），也包括 Demo 錄影的檔名清單 `DEMO_SHOTS` |
| `remotion/fit-3min.mjs` | 影片超過 3 分鐘時，把輸出的影片整支加速到 3 分鐘內 |
| `remotion/public/audio/` | 旁白音檔（每句一個 WAV，`lines.json` 記錄文字與長度） |
| `remotion/public/demo/` | 放實機 Demo 錄影的地方 |
| `remotion/public/private/` | 由主辦方照片做成的圖（S1 的模糊縮圖、S5r 的實測照片），**只限競賽使用，已排除在 git 外** |
| `tools/tts/` | 旁白台詞（`narration.json`）與產生語音的腳本 |
| `out/` | 輸出的影片（已排除在 git 外） |

## 實機 Demo：要錄的 7 段

影片裡每個要換成實機錄影的位置，都有**紅色虛線框**和**紅色標籤**（編號、檔名、長度、要錄什麼）。把錄影用下表的檔名放進 `remotion/public/demo/`，重新輸出就會自動取代示意畫面，紅框和標籤也會自動消失，不用改程式。

| # | 檔名 | 錄什麼 | 影片位置 | 長度 | 內容 |
|---|---|---|---|---|---|
| ① | `s2-reviews.mp4` | 後台 | 0:20–0:29 | 約 10 秒 | 評論管理後台 |
| ② | `s5a-pickup.mp4` | 手機 | 1:00–1:05 | 約 5 秒 | 取車：已知車損 |
| ③ | `s5b-camera.mp4` | 手機 | 1:05–1:22 | 約 17 秒 | 相機：疊影、車牌、遠近 |
| ④ | `s5c-return.mp4` | 手機 | 1:22–1:32 | 約 10 秒 | 還車：車內 → 鎖門 → 車外 |
| ⑤ | `s5e-vehicles.mp4` | 手機 | 2:08–2:18 | 約 10 秒 | 取車清單：整備中 |
| ⑥ | `s5f-alerts.mp4` | 後台 | 2:18–2:34 | 約 16 秒 | 預警：確認與駁回 |
| ⑦ | `s5g-receipt.mp4` | 手機 | 2:34–2:43 | 約 9 秒 | 歷史訂單與確認單 |

每段的詳細錄法（第幾步停在哪個畫面）在 `01-故事線與分鏡表.md` 第 4 節。

錄影建議：

- **手機**：直式錄整個螢幕（iPhone 控制中心的「螢幕錄製」），會放進影片裡的手機框（9:19.5），不用另外裁切。
- **後台**：會放進約 2:1（1500×780）的瀏覽器框。把瀏覽器視窗調成約 1500×800，只錄網頁內容區（不要網址列）。
- **長度**：錄影要比表中的「長度」長；影片從錄影開頭播。太長或開頭有多餘的部分，可以先剪好，或在 `remotion/src/copy.ts` 的 `DEMO_SHOTS` 該段加上 `from: 5`（跳過開頭 5 秒）、`rate: 3`（3 倍速）。
- 錄影時避開真實車牌與個資；後台資料用測試資料。
- 想先看沒有紅色標記的版本：把 `src/copy.ts` 的 `DEMO.mark` 改成 `false`，沒錄的段落就會顯示示意畫面。

## 預覽與輸出

```bash
cd video/remotion
npm install                  # 第一次才需要
npx remotion studio          # 瀏覽器預覽，可拖時間軸；左側可單獨看每一段（S0–S8）
npx remotion render Main ../out/irent-plus_full.mp4
node fit-3min.mjs ../out/irent-plus_full.mp4   # 超過 3 分鐘時，整支加速成 ../out/irent-plus_full_3min.mp4
```

Studio 左上會顯示總長度。**比賽限制 3 分鐘。** 超過的話，`fit-3min.mjs` 會算出剛好壓到 2:59.5 的倍數，把畫面和聲音一起加快（音高不變），繳交的是 `_3min.mp4` 那支：

- 用的是 Remotion 內建的 ffmpeg，不用另外安裝。畫面不重新壓縮，每一格都保留，只是播快一點（約 33 fps）。
- 想指定倍數用 `--speed 1.1`，指定長度用 `--to 178`。
- 超過約 1.1 倍會開始覺得趕；目前的草稿要 1.11 倍。

## 重新產生旁白（繳交前必做）

影片的每一段都依旁白長度自動對時，換配音不用動畫面，只要換音檔。每句裡的動畫時間點是照 `remotion/src/tuned-lengths.json` 的句長排的，換成較快或較慢的聲音時會按比例伸縮。

台詞都在 `tools/tts/narration.json`：`subtitle` 是畫面字幕，也是台灣腔語音念的文字；`spoken` 是給離線語音 Kokoro 念的版本（簡體、數字寫成國字）。

### 方法一：台灣腔 AI 語音（雲哲）

`tools/tts/make_narration_tw.py` 用微軟的台灣腔語音。要在自己的電腦上跑（需要連到微軟的語音服務）：

```bash
cd video/tools/tts
uv run make_narration_tw.py --voice zh-TW-YunJheNeural --rate=-2%
```

預設只重做需要的句子：`lines.json` 裡標了 `draft` 的（草稿暫用離線語音的 34 句）、`narration.json` 台詞有改過的、還沒有音檔的。其他句子保留原本的錄音。要全部重做加 `--all`，只做某幾句用 `--only s2_1,s5r_2`。跑完重新輸出影片即可。

- 沒有 uv 的話先 `pip install edge-tts soundfile numpy`，再把 `uv run` 換成 `python`。
- `--rate` 要寫等號，負值才不會被當成參數。
- 念法要跟字幕不同的詞寫在腳本裡的 `SAY`：目前「iRent+」念成「iRent Plus」、「1 人」念成「一個人」、「還車」念成同音的「環車」。個別句子也可以在 `narration.json` 加 `spoken_tw` 欄位。
- 腳本會印出旁白總長：**在 153 秒以內，影片就不會超過 3:00**（v10 草稿估計 174 秒）。超過的話，輸出後用 `fit-3min.mjs` 整支加速（見上方「預覽與輸出」），或用 `--rate=+5% --all` 只加快旁白。
- `remotion/public/audio/` 裡沒用到的舊檔（例如 `s5e_2.wav`）可以刪掉，不影響影片。

**出現 `403, message='Invalid response status'`**：預設走的 edge-tts 是借用 Edge 瀏覽器朗讀功能的免費服務。**2026/10/10 起微軟改了連線方式，edge-tts 對所有人都連不上**（[edge-tts #490](https://github.com/rany2/edge-tts/issues/490)），修好之前請改用 Azure（下面第 3 點）或 Mac 內建的美佳。平常偶爾的 403 是短時間請求太多。腳本會自動等 5、15、40 秒重試；還是失敗就會把做好的句子存起來，之後再執行同一個指令會接著做。可以依序試：

1. 等 10–30 分鐘再跑一次。
2. 關掉 VPN 或 iCloud 私密轉送，或改用手機熱點再跑。
3. 改用微軟官方的 Azure 語音服務（同一個雲哲聲音，免費額度每月 50 萬字，整支旁白約 1,000 字）：
   1. 在 [Azure 入口網站](https://portal.azure.com) 建立「語音服務（Speech service）」資源，定價層選 **Free F0**，區域選 **East Asia**。
   2. 在資源的「金鑰與端點」複製「金鑰 1」。
   3. 執行：
      ```bash
      export AZURE_SPEECH_KEY=貼上金鑰
      export AZURE_SPEECH_REGION=eastasia
      uv run make_narration_tw.py --voice zh-TW-YunJheNeural --rate=-2%
      ```

### 方法一之二：Mac 內建的台灣女聲「美佳」（離線）

不用帳號、不用連網，edge-tts 連不上時可以用。音質比雲哲差一些，而且是女聲，所以要整支重做（`--all`），聲音才一致。

```bash
cd video/tools/tts
uv run make_narration_tw.py --voice Meijia --preview      # 先聽 4 句：preview_tw/Meijia.wav
uv run make_narration_tw.py --voice Meijia --all          # 整支重做
```

- 語速用 `--rate` 調，例如 `--rate=+8%`（以每分鐘約 180 字為基準）。
- 說找不到聲音：到「系統設定 → 輔助使用 → 朗讀內容 → 系統聲音 → 管理聲音…」，在「中文（台灣）」下載「美佳」。有「加強版」或「高品質」可選的話選那個，比較自然，用 `say -v '?' | grep -i meijia` 看名字，再用 `--voice "Meijia (Enhanced)"` 這樣指定。
- 之後想換回雲哲，用 Azure 或等 edge-tts 修好後加 `--all` 再跑一次。

### 方法二：自己配音

照 `配音稿.md` 錄。最簡單是**一次錄完整份**（句子之間停約 1 秒），再用 `tools/tts/split_recording.py` 自動切成 40 句、寫進影片：

```bash
cd video/tools/tts
uv run split_recording.py ~/Desktop/旁白.m4a --dry-run   # 先看切得對不對
uv run split_recording.py ~/Desktop/旁白.m4a             # 寫入 remotion/public/audio/
```

iPhone 語音備忘錄的 .m4a、.mp3、.wav 都可以。總長超過 153 秒時加 `--speed 1.05` 之類（音高不變），或輸出後用 `fit-3min.mjs` 整支加速；只重錄幾句用 `--only s5r_1,s5r_2`。原本的音檔會先備份到 `tools/tts/audio_backup/`。

也可以一句錄一個檔（檔名見 `配音稿.md`），放進 `remotion/public/audio/` 後執行 `uv run measure.py` 更新長度。

建議 40 句都用自己的聲音；只換一部分，會聽得出兩種聲音交錯。

### 方法三：離線 AI 語音（Kokoro）

不用連網，但口音偏大陸腔。第一次使用要 `pip install sherpa-onnx soundfile`，並下載語音模型（約 360 MB）：

```bash
cd video/tools/tts
curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_1.tar.bz2
tar xjf kokoro-multi-lang-v1_1.tar.bz2
python make_narration.py
```

## 主辦方資料的使用

S5r 的 4 組照片來自主辦方資料集（`deck/src/img/crash1.png` 等，已裁切並遮蔽車牌），S1 開場的模糊縮圖也是。主辦方 README 規定資料只能用於本競賽、未經書面同意不得公開，所以：

- `remotion/public/private/` 不進 git（`.gitignore` 已設定）。
- 影片繳交給主辦方沒有問題；**若要上傳到 YouTube 等公開平台，請設成「不公開」**，或先向主辦方確認。

## 還沒做完的部分

- **實機 Demo 7 段**：見上表。
- **旁白**：重跑雲哲（方法一）或自己配音（方法二），二選一。

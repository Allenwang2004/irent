# iRent+ 說明影片

**v18**：`out/irent-plus_full_v18.mp4`（3:14.9，1080p），以及整支加速到 3 分鐘內、**繳交用**的 `out/irent-plus_full_v18_3min.mp4`（2:59.5，加速 1.09 倍）。v18 是 v17 換上 pp 重跑的雲哲（S5f 那一句），旁白全部是雲哲。v17 改了 S5f 確認車損後的說法：需要立即維修的先送修（工單：檢修，修好前暫停出租），小損傷才恢復出租並記進車損紀錄、下一位取車看得到，跟 `supabase/05_operations.sql` 的規則一致（嚴重的新車損開檢修工單、擋出租）；旁邊的提示框改成這兩種情況，錄影中間的靜止畫面會依旁白長度自動拉長或縮短，讓「駁回」一直對上旁白。S7 刪掉「每天要看的從 4,800 筆降到約 480 筆」和「10 到 20 人的」，直接說「以一成估算，工作量降到 1 到 2 人」（這兩句是從原本的雲哲錄音剪接的），算式改在「確認 AI 標記的部分」時就出現。v16 的真車換成 pp 拍的 Toyota Camry（照片＋影片），手機畫面上的車型改成「Toyota Camry」；「用車中」的車輛照片改成直式、看得到整台車。v15 的 S5a–S5c 不再錄影，用動畫手機畫面，其中 S5b 相機的取景畫面換成 pp 拍的真車影片，疊著上次的照片和這台車的輪廓虛線框、車牌框；S5c「用車中」的車輛照片和車外縮圖換成 pp 拍的照片；車牌全部模糊（見下方「真車畫面」）。實機 Demo 剩 3 段，編號改成 ①②③（原本的 ⑤⑥ 改成 ②③）。v14 的歷史訂單裁掉 iPhone 狀態列（時間、錄影紅點、「◀ Notion」）和 Safari 的網址列，改畫影片自己的「9:41」狀態列，看不出是網頁版；手機錄影上的點擊加上紅色的點擊效果。v13 放入 pp 錄的 ⑤ 後台預警與 ⑥ 歷史訂單：剪掉按下確認、駁回後各約 3 秒的等待，以及手機上三次「載入中」，並讓點擊對上旁白（見下方「錄影怎麼剪的」）；S5f 旁邊的提示框改成錄影裡的車（RDU-6956、RDE-6160）。v12 的 S2 換成 pp 錄的評論後台（①，`demo/s2-reviews.mp4`，由 `.mov` 轉檔、裁掉選單列並放大，開頭多停 2.5 秒）；S5e 的取車清單改用動畫手機畫面，不錄影，所以實機 Demo 剩 6 段（原本的 ⑥⑦ 改成 ⑤⑥）。v11 拿掉 S1 的 24 小時長條圖（旁白已經不講尖峰）。v10 為了縮短長度：刪掉「尖峰每 1.7 秒」那句、S4 三句合成一句、S5f 第一句縮短、每段結尾的停頓縮短、封面縮成 2.6 秒。

v9 依 pp 對旁白的檢查意見修改：用詞統一（用戶、營運後台）、術語改白話，並補上「省人力」與「提升用戶體驗」兩條線（每天要看的從 4,800 筆降到約 480 筆、一年估計省下 540–1,080 萬元人事成本；當場重拍、還車痛點的評論原文、下一位不會借到有問題的車）。改了什麼見 `01-故事線與分鏡表.md` 開頭。每個要放實機 Demo 的位置用紅框和紅色標籤標出來。

> 旁白已全部是雲哲（pp 在 10/13 用 `make_narration_tw.py` 重跑）。之後改了台詞，再跑同一個指令，只會重做改過的句子。

舊版：`out/irent-plus_full_v17.mp4`（v17，S5f 新句是暫用語音）、`out/irent-plus_full_v16.mp4`（v16，S5f 還說「下一位取車時就會看到」嚴重車損）、`out/irent-plus_full_v15.mp4`（v15，真車是 Nissan）、`out/irent-plus_full_v14.mp4`（v14，S5b 還是卡通車）、`out/irent-plus_full_v13.mp4`（v13，⑥ 還看得到 Safari）、`out/irent-plus_full_v12-draft.mp4`（v12 草稿）、`out/irent-plus_full_v11-draft.mp4`（v11 草稿；`_3min` 是加速版）、`out/irent-plus_full_v10-draft.mp4`（v10 草稿，還有長條圖；`_3min` 是加速版）、`out/irent-plus_full_v9-draft.mp4`（v9 草稿，3:33.1；`_x1.185` 是整支加速到 3:00 的試聽版）、`out/irent-plus_full_v8-draft.mp4`（v8 草稿，3:19.5）、`out/irent-plus_full_v7-draft.mp4`（v7 草稿）、`out/irent-plus_full_v6-draft.mp4`（v6 草稿）、`out/irent-plus_full_v5-draft.mp4`（v5 草稿，2:58.5）、`out/irent-plus_full_v4-draft.mp4`（v4 草稿）、`out/irent-plus_full.mp4`（v3，2:55.8）。

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
| `remotion/public/real/` | S5b、S5c 的真車畫面（由 `tools/demo/real_car.py` 產生，車牌已模糊） |
| `remotion/public/private/` | 由主辦方照片做成的圖（S1 的模糊縮圖、S5r 的實測照片），**只限競賽使用，已排除在 git 外** |
| `tools/tts/` | 旁白台詞（`narration.json`）與產生語音的腳本 |
| `out/` | 輸出的影片（已排除在 git 外） |

## 實機 Demo：3 段（都已放入）

取車（S5a）、拍照（S5b）、還車（S5c）用動畫手機畫面，不錄影。要重錄這 3 段時，把錄影用下表的檔名放進 `remotion/public/demo/`，重新輸出就會自動取代；檔案不存在時，影片會在那個位置顯示**紅色虛線框**和**紅色標籤**（編號、檔名、長度、要錄什麼）。

| # | 檔名 | 錄什麼 | 影片位置 | 長度 | 內容 | 狀態 |
|---|---|---|---|---|---|---|
| ① | `s2-reviews.mp4` | 後台 | 0:19–0:28 | 約 10 秒 | 評論管理後台 | 已放入 |
| ② | `s5f-alerts.mp4` | 後台 | 2:17–2:35 | 約 18 秒 | 預警：確認與駁回 | 已放入 |
| ③ | `s5g-receipt.mp4` | 手機 | 2:35–2:44 | 約 9 秒 | 歷史訂單與確認單 | 已放入 |

每段的詳細錄法（第幾步停在哪個畫面）在 `01-故事線與分鏡表.md` 第 4 節。

錄影建議：

- **手機**：直式錄整個螢幕（iPhone 控制中心的「螢幕錄製」）。上方的狀態列（時間、錄影紅點、「◀ 某 App」）和下方 Safari 的網址列會裁掉，改畫影片自己的「9:41」狀態列，不用自己處理。
- **點了哪裡**：iPhone 錄影不會顯示手指的位置，影片會在點擊的地方加紅色的點擊效果。位置寫在 `src/copy.ts` 的 `DEMO_SHOTS`（`taps`：剪好的影片第幾秒、畫面上的 x、y）。看畫面判斷不出點了哪裡時會先問你。
- **後台**：會放進約 2:1（1500×780）的瀏覽器框。把瀏覽器視窗調成約 1500×800，只錄網頁內容區（不要網址列）。
- **長度**：錄影要比表中的「長度」長；影片從錄影開頭播。太長或開頭有多餘的部分，可以先剪好，或在 `remotion/src/copy.ts` 的 `DEMO_SHOTS` 該段加上 `from: 5`（跳過開頭 5 秒）、`rate: 3`（3 倍速）。
- 錄影時避開真實車牌與個資；後台資料用測試資料。
- 想先看沒有紅色標記的版本：把 `src/copy.ts` 的 `DEMO.mark` 改成 `false`，沒錄的段落就會顯示示意畫面。

### 錄影怎麼剪的

原始錄影放在 `demo-raw/`（不進 git），影片用的是剪好放進 `remotion/public/demo/` 的 mp4。剪法都寫在 `tools/demo/cut_demos.py`（需要 `brew install ffmpeg`，在 `video/` 執行 `uv run tools/demo/cut_demos.py`）：

- 統一成 30 fps；Mac 的錄影裁掉上方選單列和左右空白（畫面放大約 1.25 倍）；手機的裁掉狀態列和 Safari 網址列，放成手機螢幕的 2 倍大（780×1688），上方留給影片自己畫的狀態列。
- 剪掉等待：按下按鈕後的等待、手機上的「載入中」。
- 在畫面靜止的地方多停幾秒，讓點擊對上旁白；結尾停在最後一格，換成自己的配音、段落變長時也不會穿幫。
- ② 的提示框（「下一位取車時」「整備中 → 可借用」）寫的是錄影裡的車，在 `src/copy.ts` 的 `DEMO_UI.rec*`；重錄換了車要一起改。
- ②③ 的錄影裡有主辦方資料集的照片，跟 `public/private/` 一樣**只限競賽使用、不要推到 GitHub**（`.gitignore` 已排除 `public/demo/` 裡新加的檔案和 `demo-raw/`）。

### 真車畫面（S5b、S5c）

pp 拍的 Toyota Camry 照片和影片（`demo-raw/toyota.jpg`、`demo-raw/toyota.mov`，原檔看得到車牌，**不進 git**）由 `tools/demo/real_car.py` 轉成 `remotion/public/real/`（需要 `brew install ffmpeg`；在 `video/` 執行 `uv run tools/demo/real_car.py`，約 30 秒）：

- **車牌**：影片從對齊那一格開始，用車牌周圍的車身逐格追蹤（光流），車牌一半在畫面外的開頭幾格也追得到；照片手動標出四個角。都先打馬賽克再重度模糊，看不出號碼。`public/real/` 裡已經沒有可辨識的車牌，可以進 git。
- **相機取景**：影片裁成 3:4，`live/f000–f204.jpg`（30 fps）。畫面從車的右前方繞到左前方，第 81 格（約 2.7 秒）對齊上次的照片，之後只留一點手晃。
- **上次的照片**：照片的角度和距離跟影片不同，程式用特徵點把照片對齊到第 81 格（`ref.jpg`），在相機畫面上以 38% 透明度疊上去，所以走到位時兩台車會重合。
- **輪廓框線**：沿著對齊那一格的車手動描的 38 個點，畫成平滑的虛線（`real_car.py` 的 `OUTLINE`；車的右側超出畫面），另外在車牌位置畫「車牌」虛線框，樣式跟 App 的取景框一樣。
- **「比上次遠」**：影片裡沒有後退的片段，是用數位縮小（1.12 倍 → 0.94 倍，邊緣補上模糊的同一張畫面）模擬的。
- **還車畫面**：`car_wide.jpg`（用車中頁，直式看得到整台車）、`car_square.jpg`（車外四角的縮圖，左右兩欄交錯鏡像）。
- 換一台車重拍：照片、影片放進 `demo-raw/`，再改 `real_car.py` 開頭的 `PHOTO`、`VIDEO`、`ALIGNED`、`CROP_Y`、`PLATE0`（對齊那一格的車牌四角）、`PHOTO_PLATE`（照片的車牌四角）、`OUTLINE`、`ZOOM`。

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
- 超過約 1.1 倍會開始覺得趕；目前的草稿要 1.09 倍。

## 重新產生旁白（繳交前必做）

影片的每一段都依旁白長度自動對時，換配音不用動畫面，只要換音檔。每句裡的動畫時間點是照 `remotion/src/tuned-lengths.json` 的句長排的，換成較快或較慢的聲音時會按比例伸縮。

台詞都在 `tools/tts/narration.json`：`subtitle` 是畫面字幕，也是台灣腔語音念的文字；`spoken` 是給離線語音 Kokoro 念的版本（簡體、數字寫成國字）。

### 方法一：台灣腔 AI 語音（雲哲）

`tools/tts/make_narration_tw.py` 用微軟的台灣腔語音。要在自己的電腦上跑（需要連到微軟的語音服務）：

```bash
cd video/tools/tts
uv run make_narration_tw.py --voice zh-TW-YunJheNeural --rate=-2%
```

預設只重做需要的句子：`lines.json` 裡標了 `draft` 的（目前 0 句）、`narration.json` 台詞有改過的、還沒有音檔的。其他句子保留原本的錄音。要全部重做加 `--all`，只做某幾句用 `--only s2_1,s5r_2`。跑完重新輸出影片即可。

- 沒有 uv 的話先 `pip install edge-tts soundfile numpy`，再把 `uv run` 換成 `python`。
- `--rate` 要寫等號，負值才不會被當成參數。
- 念法要跟字幕不同的詞寫在腳本裡的 `SAY`：目前「iRent+」念成「iRent Plus」、「1 人」念成「一個人」、「還車」念成同音的「環車」。個別句子也可以在 `narration.json` 加 `spoken_tw` 欄位。
- 腳本會印出旁白總長：**在 153 秒以內，影片就不會超過 3:00**（v10 草稿估計 169 秒）。超過的話，輸出後用 `fit-3min.mjs` 整支加速（見上方「預覽與輸出」），或用 `--rate=+5% --all` 只加快旁白。
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

- **實機 Demo**：3 段都已放入；取車、拍照、還車用動畫手機畫面（拍照、還車的車是 pp 拍的真車）。
- **旁白**：目前是雲哲。要自己配音的話照 `配音稿.md` 錄，再重新輸出。

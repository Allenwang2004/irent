// Every piece of on-screen text and data lives here, so wording can be changed
// without touching the animation code. The fonts are preloaded from these strings
// (see components/FontLoader.tsx), so keep all visible text in this file.

import lines from "../public/audio/lines.json";

// ---------------------------------------------------------------- S0 cover
export const COVER = {
  brand: "iRent",
  tagline: "AI 智能車況管家",
};

// ---------------------------------------------------------------- S1 data and manpower
// Source: organiser's photo upload list (車外車內照片上傳清單.xlsx),
// 2026-04-22 00:01 to 2026-04-23 00:03 (27,367 photos; 27,318 of them on 4/22).
// Photos per hour on 4/22.
export const HOURLY = [
  1126, 1019, 704, 466, 345, 316, 280, 390, 638, 611, 664, 676, 1068, 1329, 1361, 1619, 2144, 1988, 1761, 1584,
  1510, 1977, 2068, 1674,
];

export const S1 = {
  total: 27367,
  unit: "張",
  label: "推估一天收到的車況照片",
  date: "依主辦方資料集推估",
  source: "資料來源：主辦方提供之照片上傳清單（2026/4/22 全天，4,820 筆取還車紀錄）",
  peakHour: 16,
  peakTitle: "16 點這一小時",
  peakValue: "2,144 張",
  peakNote: "每 1.7 秒就有一張",
  hourSuffix: "時",
  // manpower estimate (moved here from the end, per review)
  calcTitle: "如果全靠人工檢視",
  orders: "4,820",
  ordersUnit: "筆取還車／天",
  secs: "1–2",
  secsUnit: "分鐘／筆",
  hours: "80–160",
  hoursUnit: "工時／天",
  people: "10–20",
  peopleUnit: "人",
  assumption: "估算假設：每筆人工檢視 1–2 分鐘、每人每天 8 小時",
  opsTag: "營運端",
  opsBig: "約 10–20 人",
  opsSub: "每天 4,820 筆、80–160 個工時",
  userTag: "用戶端",
  userBig: "流程有問題",
  userSub: "拍照、接車、賠償，都有抱怨",
};

// ---------------------------------------------------------------- S2 review back office
// Source: scraper/output, deduplicated (970 reviews), classified with
// web/src/lib/review-categories.json. "related" = photo, cleanliness, damage.
export const S2 = {
  pageTitle: "顧客評論",
  pageSub: "收集 Google Play、App Store、PTT、Dcard 的評論，依問題類型分類，標記重要程度與處理狀態。",
  url: "irent-admin / reviews",
  aiChip: "AI 歸納分類",
  total: "970 則評論",
  sources: [
    { name: "Google Play", n: 682 },
    { name: "Dcard", n: 153 },
    { name: "PTT", n: 130 },
    { name: "App Store", n: 5 },
  ],
  categories: [
    { label: "扣款、費用、罰單爭議", n: 274, related: false },
    { label: "還車範圍、找車位、GPS 定位", n: 189, related: false },
    { label: "拍照流程、照片被退", n: 147, related: true },
    { label: "App 當機、鎖車失敗、連線", n: 106, related: false },
    { label: "車內髒亂、遺留物", n: 60, related: true },
    { label: "客服難聯絡、回覆慢", n: 53, related: false },
    { label: "車損爭議、求償", n: 52, related: true },
  ],
  triage: ["未處理", "討論中", "已修正", "不處理"],
  statBig: "206 則",
  statLine: "跟車況有關",
  statNote: "拍照、髒亂、車損三類，重複只算一次",
  problemsTitle: "跟車況有關的三個問題",
  stars: "★☆☆☆☆",
  problems: [
    {
      title: "拍照耗時，常被要求重拍",
      n: "147 則",
      quote: "還車拍照四邊都拍了\n還一直要我重拍，\n耗時好幾分鐘。",
      meta: "Google Play・2026/06/10",
    },
    {
      title: "接到上一位留下的髒車",
      n: "60 則",
      quote: "經常會遇到車上有\n前一位使用者沒喝完的\n飲料罐⋯⋯",
      meta: "Google Play・2023/09/18",
    },
    {
      title: "車損賠償，說不清責任",
      n: "52 則",
      quote: "3 個月內都有可能\n會被坑說是你用的，\n要你賠。",
      meta: "Google Play・2026/02/20",
    },
  ],
};

// ---------------------------------------------------------------- demo clip slots
// Drop a screen recording into public/demo/ with this file name and render again.
export const DEMO = {
  placeholderTitle: "Demo 錄影待放",
  placeholderHint: "放入 public/demo/",
  placeholderHint2: " 後重新輸出",
};

// ---------------------------------------------------------------- S3 root cause
export const S3 = {
  titleA: "照片是車況的主要證據，",
  titleB: "但把關跟不上",
  gates: [
    { when: "拍照時", what: "沒人檢查", detail: "拍糊、拍歪照樣送出" },
    { when: "送出後", what: "人工看不完", detail: "看不完，也看得太晚" },
    { when: "出問題時", what: "前後對不上", detail: "角度不同，很難比對" },
  ],
  evidence: "主辦方資料說明：「實際照片內容常與所選分類不一致」",
};

// ---------------------------------------------------------------- S4 stages and mechanisms
// Three stages, shown in the step bar through the demo.
export const STEPS = [
  { word: "拍照", who: "手機" },
  { word: "比對", who: "後台 AI" },
  { word: "處理", who: "系統・營運・用戶" },
];

// The mechanisms we added. `n` is shown in a red circle; the demo labels each one.
export const MECH = [
  { n: 1, stage: 0, name: "已知車損提前告知", note: "取車時先列出已記錄的損傷" },
  { n: 2, stage: 0, name: "上次照片疊影對齊", note: "上一次同角度照片疊在畫面上" },
  { n: 3, stage: 0, name: "手機即時畫質檢查", note: "每 0.5 秒檢查清晰度與亮度" },
  { n: 4, stage: 1, name: "取車比上次、還車比取車", note: "取車時的差異記為取車前就有" },
  { n: 5, stage: 1, name: "三次判讀、多數決", note: "無法判斷的照片送人工" },
  { n: 6, stage: 2, name: "自動開工單、暫停出租", note: "髒汙排清潔、嚴重車損排檢修" },
  { n: 7, stage: 2, name: "營運確認，記成已知車損", note: "駁回誤報，工單自動取消" },
  { n: 8, stage: 2, name: "用戶取還車確認單", note: "AI 初步判讀與營運確認狀態" },
];

export const S4 = {
  titleA: "三個環節，",
  titleB: "8 個機制",
  stageNames: ["拍照時", "送出後", "發現問題後"],
};

// ---------------------------------------------------------------- S5 demo
export const DEMO_UI = {
  mockLabel: "示意畫面",
  mockNote: "依 App 與後台實際介面製作",
  plate: "ABC-1234",
  carModel: "Toyota Yaris",
  // phone: pickup intro (mobile/src/app/inspection-flow.tsx)
  back: "返回",
  pickupTitle: "取車：檢查車輛狀況",
  pickupIntro: "請仔細檢查有無損傷、凹陷等，\n完整拍照可保障自身權益。",
  needShots: "需要拍攝",
  steps: ["加油卡／停車卡", "車內裝（前座）", "車內裝（後座）", "車身左前", "車身右前", "車身左後", "車身右後"],
  knownTitle: (n: number) => `這台車已記錄的損傷（${n} 處）`,
  knownOld: "右後・刮傷",
  knownNew: "右前・刮傷",
  knownHint: "拍完必拍照片後，可以把這些損傷拍下來保障自身權益。",
  qualityHint: "每張照片拍完會立刻檢查清晰度與亮度，\n不合格會請你重拍。",
  startShoot: "開始拍照",
  newBadge: "新記錄",
  // phone: damage record page
  damagesTitle: "損傷紀錄",
  damagesIntro: "必拍照片已完成。以下都不強制，但拍下來可以保障你的權益。",
  recorded: "已記錄的損傷",
  recordedPickup: "這些是這台車之前就有的損傷，建議先拍下來。",
  oldDamageName: "右後",
  oldDamageMeta: "刮傷・輕微・從右後看得到",
  notShot: "未拍",
  shoot: "拍攝",
  reshoot: "重拍",
  uploaded: "已上傳",
  // phone: camera (capture-screen.tsx, camera-view.tsx)
  camTitle: "車身左前",
  camProgress: "4 / 7",
  camHint: "請站在左前方斜角，拍到整個車頭與車牌",
  camClose: "取消取車",
  liveAim: "對準後拍照",
  liveBlur: "畫面模糊，請拿穩手機",
  liveDark: "太暗了，請移到亮處或開補光",
  liveOk: "畫面清楚，可以拍了",
  plateBadge: "車號：ABC-1234",
  album: "從相簿選擇",
  hideRef: "隱藏上次照片",
  passLabel: "通過",
  passText: "照片清楚，可以使用。",
  failLabel: "需重拍",
  failText: "照片太暗，幾乎看不到車況。請移到亮處或開啟閃光燈。",
  retake: "重拍",
  use: "使用這張",
  plateLabel: "車牌",
  // phone: return
  returnDamagesHeading: "這次租用有造成損傷嗎？",
  returnDamagesText: "如果有，可以主動拍下來說明，營運團隊會一併確認。（不強制）",
  addDamage: "新增損傷照片",
  next: "下一步：確認照片",
  submit: "送出照片",
  returnDone: "還車完成",
  returnDoneText: "照片會由 AI 檢查車況，通常幾分鐘內完成。之後也可以在首頁的「歷史訂單」查看。",
  viewReceipt: "查看還車確認",
  home: "回到首頁",
  // phone: vehicle list (mobile/src/app/page.tsx)
  listTitle: "選擇車輛",
  historyLink: "歷史訂單",
  available: "可借用",
  maintenance: "整備中（清潔或維修完成後可借用）",
  pickupButton: "我要取車",
  otherPlate: "RCW-8160",
  otherModel: "Toyota Altis",
  // phone: history (mobile/src/app/history/page.tsx)
  historyTitle: "歷史訂單",
  historySub: "每筆訂單的取車確認與還車確認，包含當時拍的照片與 AI 檢查結果。",
  returned: "已還車",
  orderLine: "訂單 R261010-3F9A2C・2026年10月10日 下午2:05",
  orderLine2: "訂單 R261008-A41D07・2026年10月8日 上午9:12",
  pickupReceipt: "取車確認",
  returnReceipt: "還車確認",
  attention: (n: number) => `${n} 項需留意`,
  clear: "沒有異常",
  // phone: receipt (mobile/src/app/records/[inspectionId]/page.tsx, lib/records.ts)
  receiptLinks: ["歷史訂單", "回到首頁"],
  returnMeta: "ABC-1234・Toyota Yaris・2026年10月10日 下午4:30",
  pickupMeta: "ABC-1234・Toyota Yaris・2026年10月10日 下午2:05",
  receiptSummary: (n: number) => `AI 檢查發現 ${n} 項需要留意的地方。以下是初步判讀，以營運人員確認的結果為準。`,
  reviewPending: "AI 初步判讀",
  reviewConfirmed: "營運人員已確認",
  newDamageTitle: "疑似新的車損",
  newDamageText: "右前與取車時的照片相比，疑似有新的損傷（右前保險桿刮傷）。營運人員會確認，如有需要，客服會與您聯絡。",
  diffTitle: "已記錄車內清潔狀況",
  diffText: "車內清潔狀況不佳，已記錄為上一位用戶留下，不會算在您這次租用。如影響使用，請聯絡客服。",
  photosTitle: "您上傳的照片（7 張）",
  photosNote: (name: string) => `這些照片是這次${name}的車況證明。`,
  // admin (web/src/app/(admin)/alerts, work-orders)
  adminBrand: "iRent 營運後台",
  adminNav: ["預警", "工單", "取還車紀錄", "車輛", "顧客評論"],
  adminUrl: "irent-admin / alerts",
  alertsTitle: "預警",
  alertsSub: "VLM worker 比對取車、還車照片後回報的狀況，一次取還車一張卡片，最嚴重、等最久的排最前面。頁面每 15 秒自動更新。",
  tabs: ["待處理", "已確認", "已駁回", "全部"],
  returnChip: "還車",
  maxSevHigh: "最高嚴重度 高",
  sevHigh: "嚴重度 高",
  submitted1: "10/10 16:30 送出",
  submitted2: "10/10 16:12 送出",
  openItems: (n: number) => `${n} 項待處理`,
  handled: "已處理",
  woRepairOpen: "工單：檢修・進行中・車輛暫停出租",
  woCleanOpen: "工單：清潔・進行中・車輛暫停出租",
  woCleanCancelled: "工單：清潔・已取消",
  toWorkOrders: "前往工單",
  alertNew: "還車新車損",
  alertDirty: "車內髒汙",
  statusOpen: "待處理",
  statusConfirmed: "已確認",
  statusDismissed: "已駁回",
  alertMsg: "右前疑似本次租用期間的新車損：右前保險桿刮傷（2/3 次判定）。用戶沒有自行回報",
  dirtyMsg: "後座髒汙（本次用戶還車時），須立即清潔：地墊垃圾",
  baseline: "比對基準（上一次）",
  current: "這次：右前",
  currentRear: "這次：車內裝（後座）",
  record: "確認時記錄為這台車的已知車損",
  location: "右前保險桿",
  dtype: "刮傷",
  dsev: "輕微",
  notePh: "處理備註（選填）",
  confirm: "確認",
  dismiss: "駁回（誤報）",
  handledConfirm: "10/10 16:41 處理・已記錄為已知車損：右前保險桿・刮傷・輕微",
  handledDismiss: "10/10 16:42 處理・備註：是地墊花紋，不是垃圾",
  // callouts next to the back office
  calloutNext: "下一位取車時",
  calloutFree: "RDS-6583",
  calloutFreeFrom: "整備中",
  calloutFreeTo: "可借用",
  calloutSort: "最嚴重、等最久的排前面",
  calloutPending: "待處理",
  calloutPause: "暫停出租",
};

export const S5_PANELS = {
  a: { step: 0, mech: [1], chip: "已知車損提前告知", title: "取車前，先列出已知車損", points: ["列出這台車已記錄的損傷", "提醒拍下特寫，保障自己的權益"] },
  b: { step: 0, mech: [2, 3], chip: "疊影對齊・即時檢查", title: "對齊上一次的照片，當場拍對", points: ["上一次同角度的照片疊在畫面上", "每 0.5 秒檢查清晰度與亮度", "不合格當場重拍，不必先上傳"] },
  c: { step: 0, mech: [] as number[], chip: "還車送出", title: "照片都把關過，拍完就能離開", points: ["每張照片都在手機上檢查過", "送出後交給後台 VLM 判斷", "完成頁可直接查看還車確認單"] },
  d: { step: 1, mech: [4, 5], chip: "前後比對・三次多數決" },
  e: { step: 2, mech: [6], chip: "自動開工單・暫停出租" },
  f: { step: 2, mech: [7], chip: "營運確認・記成已知車損" },
  g: { step: 2, mech: [8], chip: "用戶取還車確認單", title: "檢查結果，用戶看得到", points: ["AI 初步判讀，用白話說明", "標示營運人員是否已確認", "取車時就有的問題，不算這次租用"] },
};

// S5d: what the lab-server worker does (worker/irent_worker/decide.py).
export const WORKER = {
  title: "VLM 檢查",
  where: "Qwen 系列視覺語言模型",
  poll: "照片送出後自動檢查",
  chainTitle: "比對基準",
  photos: ["上一次紀錄", "這次取車", "這次還車"],
  rules: ["取車：比上一次紀錄", "還車：比這次取車"],
  checks: [
    { what: "車身 4 角", find: "新車損" },
    { what: "車內", find: "整潔、遺留物" },
    { what: "卡夾", find: "加油卡、停車卡" },
    { what: "用戶回報", find: "核對損傷" },
  ],
  votesTitle: "每張照片判讀 3 次",
  votes: ["新車損", "新車損", "無"],
  majority: "多數決：新車損",
  output: "寫入預警",
};

// S5e: alerts -> work orders (supabase/05_operations.sql)
export const ORDERS = {
  title: "預警寫入後，資料庫自動處理",
  head: ["預警", "工單", "暫停出租"],
  rows: [
    { alert: "車內髒汙", order: "清潔", pause: "是" },
    { alert: "高嚴重度新車損", order: "檢修", pause: "是" },
    { alert: "缺卡片、遺留物", order: "聯絡用戶", pause: "否" },
    { alert: "其他（中低嚴重度車損、需人工確認）", order: "—", pause: "否" },
  ],
  note: "暫停出租的車變成「整備中」，取車清單上不能借；工單全部完成後自動恢復可借用。",
};

// ---------------------------------------------------------------- S6 technology
export const S6 = {
  title: "手機管拍照品質，後台管車況判讀",
  edgeWord: "手機端",
  edgeTitle: "輕量影像檢查",
  edgePoints: ["清晰度、亮度、反光", "每 0.5 秒一次，在手機上完成", "門檻以 1,200 張真實還車照片校準"],
  cloudWord: "後台",
  cloudTitle: "自架開源模型",
  cloudPoints: ["Qwen 系列視覺語言模型", "照片不外流，不按次付費", "同角度比對，判讀 3 次取多數決"],
  loopTitle: "反覆迭代，模型更加強大",
  loop: ["營運確認或駁回", "收集成資料集", "重新訓練模型", "更新上線"],
  evalTitle: "離線評估：主辦方 144 組取還車照片（24 組有索賠）",
  metrics: [
    { label: "車損召回率", value: "[待補]" },
    { label: "誤報率", value: "[待補]" },
  ],
};

// ---------------------------------------------------------------- S7 benefit
export const S7 = {
  beforeLabel: "全靠人工",
  beforeValue: "80–160 工時 ≈ 10–20 人",
  orders: "4,820",
  ordersUnit: "筆／天",
  flagged: "10%",
  flaggedUnit: "AI 標記",
  checked: "482",
  checkedUnit: "筆人工確認",
  hours: "8–16",
  hoursUnit: "工時",
  after: "1–2",
  afterUnit: "人",
  userLine: "用戶：每次取還車都有確認單，知道車況是怎麼判定的",
  assumption: "估算假設：每筆人工檢視 1–2 分鐘、每人每天 8 小時、AI 標記率以 10% 計",
};

// ---------------------------------------------------------------- S8 outro
export const S8 = {
  brand: "iRent",
  line: "利用 AI，打造全台最好的租車平台",
  // Team name shown under the brand at the end; leave empty to hide the line.
  team: "",
};

// ---------------------------------------------------------------- narration text
export const NARRATION = lines as { key: string; text: string; seconds: number }[];

// Text written directly inside the mock screens (src/mock/) and scenes.
const INLINE_TEXT =
  "≈×→存檔STEP機制發現其他損傷？如果看到上面沒列出的損傷，可以拍下來回報，避免之後被誤認為是你造成的。（不強制）確認照片點照片可以重拍。確認無誤後送出。照片上傳中...請拍下這些已記錄損傷目前的狀況。登出";

export const ALL_TEXT =
  JSON.stringify([COVER, S1, S2, DEMO, S3, STEPS, MECH, S4, DEMO_UI, S5_PANELS, WORKER, ORDERS, S6, S7, S8, NARRATION]) +
  INLINE_TEXT +
  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [DEMO_UI.knownTitle(n), DEMO_UI.attention(n), DEMO_UI.receiptSummary(n), DEMO_UI.openItems(n)].join("")).join("") +
  DEMO_UI.photosNote("取車") + DEMO_UI.photosNote("還車") +
  "0123456789,.%／・：、。⋯★☆處（）第次租用";

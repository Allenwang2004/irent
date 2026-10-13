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
  opsBig: "需 10–20 人",
  opsSub: "每天 4,820 筆、80–160 個工時",
  userTag: "用戶端",
  userBig: "流程有問題",
  userSub: "拍照、接車、賠償，都有抱怨",
};

// ---------------------------------------------------------------- S2 review back office
// Source: scraper/output (scraping branch), 924 reviews once each (46 Dcard posts
// were scraped twice), classified with the keyword rules in
// web/src/lib/review-categories.json. "related" = photo, cleanliness, damage.
export const S2 = {
  pageTitle: "顧客評論",
  pageSub: "收集 Google Play、App Store、PTT、Dcard 的評論，依問題類型分類，標記重要程度與處理狀態。",
  url: "irent-admin / reviews",
  aiChip: "自動分類",
  total: "924 則評論",
  sources: [
    { name: "Google Play", n: 682 },
    { name: "PTT", n: 130 },
    { name: "Dcard", n: 107 },
    { name: "App Store", n: 5 },
  ],
  categories: [
    { label: "扣款、費用、罰單爭議", n: 250, related: false },
    { label: "還車範圍、找車位、GPS 定位", n: 186, related: false },
    { label: "拍照流程、照片被退", n: 145, related: true },
    { label: "App 當機、鎖車失敗、連線", n: 105, related: false },
    { label: "車內髒亂、遺留物", n: 60, related: true },
    { label: "客服難聯絡、回覆慢", n: 53, related: false },
    { label: "車損爭議、求償", n: 49, related: true },
  ],
  triage: ["未處理", "討論中", "已修正", "不處理"],
  statBig: "208 則",
  statLine: "跟車況有關",
  statNote: "拍照、髒亂、車損三類，重複只算一次",
  problemsTitle: "跟車況有關的三個問題",
  stars: "★☆☆☆☆",
  problems: [
    {
      title: "拍照耗時，常被要求重拍",
      n: "145 則",
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
      n: "49 則",
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
  // true: every place a real demo recording goes is marked in red (number, file
  // name, length, what to record) until that recording is in public/demo/.
  // Set to false to show the plain mock screens instead.
  mark: true,
  markWord: "實機 Demo",
  markTodo: "待錄",
  markSecs: (s: number) => `約 ${Math.round(s)} 秒`,
};

// Where the real demo recordings go. `scene` is used to show how long the clip runs.
// S5e (the car list turning "整備中") stays as the animated phone screen, no recording.
// A recording longer than its slot can be trimmed here instead of in an editor:
// add `from: 12` to skip the first 12 seconds, `rate: 3` to play it 3x faster.
// `taps`: where a finger pressed in a phone recording (seconds into the clip; x, y in
// screen points, 390 x 844), drawn as a tap mark because iOS recordings don't show touches.
// `mock`: no recording for this one; the animated screen stays (S5b and S5c use the real car photo and video).
export const DEMO_SHOTS: Record<"s2" | "a" | "b" | "c" | "f" | "g", { n: number; scene: string; file: string; what: string; from?: number; rate?: number; mock?: boolean; taps?: { at: number; x: number; y: number }[] }> = {
  s2: { n: 1, scene: "S2", file: "demo/s2-reviews.mp4", what: "評論後台：來源、問題分類、處理狀態" },
  a: { n: 0, mock: true, scene: "S5a", file: "demo/s5a-pickup.mp4", what: "取車：已記錄的損傷 → 補拍特寫" },
  b: { n: 0, mock: true, scene: "S5b", file: "demo/s5b-camera.mp4", what: "相機：疊影對齊 → 車牌、遠近提示 → 通過" },
  c: { n: 0, mock: true, scene: "S5c", file: "demo/s5c-return.mp4", what: "還車：開始還車 → 車內 → 鎖門 → 車外" },
  f: { n: 2, scene: "S5f", file: "demo/s5f-alerts.mp4", what: "後台預警：確認車損、駁回誤報" },
  g: {
    n: 3,
    scene: "S5g",
    file: "demo/s5g-receipt.mp4",
    what: "歷史訂單 → 還車確認 → 取車確認",
    // RDQ-1950「還車確認」, then RDE-6160「取車確認」 (going back used Safari's back button, cropped off)
    taps: [
      { at: 1.5, x: 278, y: 323 },
      { at: 4.72, x: 112, y: 491 },
    ],
  },
};
export type DemoShotId = keyof typeof DEMO_SHOTS;

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
  { n: 3, stage: 0, name: "即時檢查畫質、車牌、角度", note: "站錯、太遠太近、太暗都提醒" },
  { n: 4, stage: 0, name: "先拍車內，鎖門再拍車外", note: "按下還車就停止計費" },
  { n: 5, stage: 1, name: "取車比上次、還車比取車", note: "差異歸屬到對的人" },
  { n: 6, stage: 1, name: "三次判讀、多數決", note: "無法比對的照片送人工" },
  { n: 7, stage: 2, name: "自動開工單、暫停出租", note: "髒汙排清潔、嚴重車損排檢修" },
  { n: 8, stage: 2, name: "營運確認，記成已知車損", note: "駁回誤報，工單自動取消" },
  { n: 9, stage: 2, name: "用戶取還車確認單", note: "AI 初步判讀與營運確認狀態" },
];

export const S4 = {
  titleA: "三個環節，",
  titleB: "9 個機制",
  stageNames: ["拍照時", "送出後", "發現問題後"],
};

// ---------------------------------------------------------------- S5 demo
export const DEMO_UI = {
  mockLabel: "示意畫面",
  mockNote: "依 App 與後台實際介面製作",
  plate: "ABC-1234",
  carModel: "Toyota Camry",
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
  liveMoved: "角度跟上次不同，請對齊上次的照片",
  liveBlur: "畫面模糊，請拿穩手機",
  liveFar: "比上次遠，請靠近一點",
  liveDark: "比上次暗很多，請開補光或移到亮處",
  liveOk: "看得到車牌，可以拍了",
  plateBadge: "車號：ABC-1234",
  hideRef: "隱藏上次照片",
  passLabel: "通過",
  passText: "照片清楚，可以使用。",
  failLabel: "需重拍",
  failText: "照片太暗，幾乎看不到車況。請移到亮處或開啟閃光燈。",
  retake: "重拍",
  use: "使用這張",
  plateLabel: "車牌",
  // phone: return start (in-use.tsx, inspection-flow.tsx)
  inUseTitle: "用車中",
  inUseSub: "ABC-1234・Toyota Camry",
  startReturn: "開始還車",
  billingStopped: "計費已停在 16:30",
  returnRule: "請在 10 分鐘內拍完車內照片、下車並按「下一步」鎖門；超過時間會自動取消還車。",
  countdown: "剩下 08:42",
  interiorTitle: "先拍車內",
  interiorShots: ["加油卡／停車卡", "車內裝（前座）", "車內裝（後座）"],
  lockStep: "下車鎖門",
  lockButton: "確認，鎖門",
  confirmReturn: "確認還車",
  locked: "已鎖門",
  lockNote: "照片在背景上傳，不用等",
  exteriorTitle: "再拍車外",
  exteriorShots: ["車身左前", "車身右前", "車身左後", "車身右後", "停車位置"],
  done: "完成",
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
  returnMeta: "ABC-1234・Toyota Camry・2026年10月10日 下午4:30",
  pickupMeta: "ABC-1234・Toyota Camry・2026年10月10日 下午2:05",
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
  calloutSort: "最嚴重的問題排在最前面",
  calloutPending: "待處理",
  calloutPause: "暫停出租",
  // the same callouts when the real recording (demo/s5f-alerts.mp4) is in: the cars in it
  recNextCar: "RDU-6956",
  recKnownTitle: "已記錄的損傷",
  recNewDamage: "左前保險桿・破裂・嚴重",
  recFreeCar: "RDE-6160",
  // S5f: what happens to a confirmed new damage (the same rule as supabase/05_operations.sql)
  branchTitle: "確認是新車損",
  branchRepair: "需要立即維修",
  branchRepairDo: "先送修",
  branchRepairNote: "工單：檢修，修好前暫停出租",
  branchEg: "例：",
  branchMinor: "小損傷",
  branchMinorDo: "恢復出租",
  branchMinorNote: "記進這台車的車損紀錄",
  branchNext: "下一位取車時就看得到",
};

export const S5_PANELS = {
  a: { step: 0, mech: [1], chip: "已知車損提前告知", title: "取車前，先列出已知車損", points: ["列出這台車已記錄的損傷", "提醒拍下特寫，保障自己的權益"] },
  b: {
    step: 0,
    mech: [2, 3],
    chip: "疊影對齊・即時檢查",
    title: "對齊上一次的照片，當場拍對",
    points: ["上一次同角度的照片疊在畫面上", "即時檢查畫質、角度、遠近與光線", "不合格當場提醒重拍"],
    guardTitle: "拍完就能離開，不用事後補拍",
    // 27,367 photos a day x 2–3% (mobile/src/lib/quality.ts, calibrated on 1,200 return photos)
    guardText: "推估每天約 550–820 張不合格照片，在手機上就當場重拍",
  },
  c: {
    step: 0,
    mech: [4],
    chip: "先拍車內，鎖門再拍車外",
    title: "改成先拍車內，再鎖門",
    points: ["按下還車，計費就停止", "10 分鐘內拍完車內、下車鎖門", "鎖門不用等上傳，再拍車外"],
    // scraper/output (Google Play review, 2026-07-12)
    quote: "還車鎖門後才要拍內部照片，這很不合理⋯⋯",
    quoteMeta: "Google Play 用戶評論・2026/07/12",
  },
  d: { step: 1, mech: [5, 6], chip: "前後比對・三次多數決" },
  r: { step: 1, mech: [] as number[], chip: "實測結果" },
  e: { step: 2, mech: [7], chip: "自動開工單・暫停出租" },
  f: { step: 2, mech: [8], chip: "營運確認・記成已知車損" },
  g: { step: 2, mech: [9], chip: "用戶取還車確認單", title: "檢查結果，用戶看得到", points: ["AI 初步判讀，用白話說明", "標示營運人員是否已確認", "取車時就有的問題，不算這次租用"] },
};

// S5d: what the lab-server worker does (worker/irent_worker/decide.py).
export const WORKER = {
  title: "AI 車況檢查",
  where: "Qwen 系列視覺語言模型",
  poll: "照片送出後自動檢查",
  chainTitle: "比對基準",
  photos: ["上一次紀錄", "這次取車", "這次還車"],
  rules: ["取車：比上一次紀錄", "還車：比這次取車"],
  blame: "取車到還車之間的新損傷，才算這次租用",
  checks: [
    { what: "車身 4 角", find: "新車損" },
    { what: "車內", find: "整潔、遺留物" },
    { what: "卡夾", find: "加油卡、停車卡" },
    { what: "用戶回報", find: "核對損傷" },
  ],
  votesTitle: "每張照片 AI 看 3 次",
  votes: ["新車損", "新車損", "無"],
  majority: "以多數為準：新車損",
  output: "寫入預警",
};

// S5r: results on the organiser's data (eval/README.md). Photos are the
// organiser's, plates blurred, in public/private/ (kept out of git).
export type EvidenceCardT = {
  photos: [string, string][];
  tag: string;
  kind: "damage" | "tidy";
  verdict?: string;
  votes?: string;
  verdicts?: [string, string, boolean][];
  detail: string;
};
export const RESULTS = {
  title: "主辦方資料集實測",
  sub: "144 組取還車照片：24 組有索賠、120 組沒有",
  gates: ["拍照時角度把關", "光線把關", "每組判讀 3 次"],
  kpis: [
    { value: 100, suffix: "%", label: "車損召回率", note: "有索賠的 24 組，全部判為新車損" },
    { value: 3, suffix: "%", label: "誤報率", note: "沒有索賠的 120 組，被誤判的比例" },
  ],
  cards: [
    { photos: [["private/results/crash1_pickup.jpg", "取車"], ["private/results/crash1_return.jpg", "還車"]], tag: "車身左前・白天", verdict: "新車損", votes: "3/3 次", detail: "保險桿破裂、大燈破損", kind: "damage" },
    { photos: [["private/results/crash2_pickup.jpg", "取車"], ["private/results/crash2_return.jpg", "還車"]], tag: "車身左後・夜間", verdict: "新車損", votes: "3/3 次", detail: "保險桿凹陷破裂", kind: "damage" },
    { photos: [["private/results/tidy1_front.jpg", "前座"], ["private/results/tidy1_rear.jpg", "後座"]], tag: "還車車內・夜間", verdicts: [["前座", "乾淨", false], ["後座", "髒汙", true]], detail: "後座有碎屑、地墊有沙土", kind: "tidy" },
    { photos: [["private/results/tidy2_front.jpg", "前座"], ["private/results/tidy2_rear.jpg", "後座"]], tag: "還車車內・白天", verdicts: [["前座", "髒汙", true], ["後座", "乾淨", false]], detail: "中控台有灰塵、腳踏墊有污漬", kind: "tidy" },
  ] as EvidenceCardT[],
  note: "主辦方資料集照片，車牌已遮蔽",
};

// S5e: alerts -> work orders (supabase/05_operations.sql)
export const ORDERS = {
  title: "自動開工單，不用人工派單",
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
  edgePoints: ["畫質：清晰度、亮度、反光", "車牌：讀車牌判斷角度與遠近", "每 0.5 秒一次，都在手機上完成"],
  cloudWord: "後台",
  cloudTitle: "自架開源模型",
  cloudPoints: ["Qwen 系列視覺語言模型", "照片不外流，不按次付費", "同角度比對，判讀 3 次取多數決"],
  loopTitle: "營運每次判斷都變成訓練資料，模型越來越準",
  loop: ["營運確認或駁回", "收集成資料集", "重新訓練模型", "更新上線"],
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
  // 9–18 fewer people x NT$600k a year (assumption, same as the deck)
  costPre: "每年約省",
  cost: "540–1,080",
  costUnit: "萬元人事成本",
  userLine: "用戶：不用一直重拍、不會接到髒車、車損說得清",
  assumption: [
    "估算假設：每筆人工檢視 1–2 分鐘、每人每天 8 小時、AI 標記率以 10% 計（實測誤報率 3%）",
    "人事成本以每人每年 60 萬元計（少 9–18 人），未扣除 GPU 與導入成本",
  ],
};

// ---------------------------------------------------------------- S8 outro
export const S8 = {
  brand: "iRent",
  line: "利用 AI，打造全台最好的租車平台",
  // Team name shown under the brand at the end; leave empty to hide the line.
  team: "團隊：pp",
};

// ---------------------------------------------------------------- narration text
export const NARRATION = lines as { key: string; text: string; seconds: number }[];

// Text written directly inside the mock screens (src/mock/) and scenes.
const INLINE_TEXT =
  "“≈×→存檔STEP機制發現其他損傷？如果看到上面沒列出的損傷，可以拍下來回報，避免之後被誤認為是你造成的。（不強制）確認照片點照片可以重拍。確認無誤後送出。照片上傳中...請拍下這些已記錄損傷目前的狀況。登出";

export const ALL_TEXT =
  JSON.stringify([COVER, S1, S2, DEMO, DEMO_SHOTS, S3, STEPS, MECH, S4, DEMO_UI, S5_PANELS, WORKER, RESULTS, ORDERS, S6, S7, S8, NARRATION]) +
  INLINE_TEXT +
  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [DEMO_UI.knownTitle(n), DEMO_UI.attention(n), DEMO_UI.receiptSummary(n), DEMO_UI.openItems(n)].join("")).join("") +
  DEMO_UI.photosNote("取車") + DEMO_UI.photosNote("還車") +
  [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(DEMO.markSecs).join("") +
  "0123456789,.%／・：、。⋯★☆處（）第次租用";

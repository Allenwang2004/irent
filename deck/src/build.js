// iRent+ solution deck for the 2026 和泰 AI 黑客松 (iRent challenge).
// Build: npm install && node build.js ../iRent+_解決方案.pptx
// Text, numbers and layout all live in this file; images are in img/.
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");


const OUT = process.argv[2] || "iRent+_解決方案.pptx";
const IMG = path.join(__dirname, "img");
const FONT = "Microsoft JhengHei";

// ---------------------------------------------------------------- theme
const HEX = { red: "D7000F", ink: "141414", ink2: "454545", ink3: "8C8C8C", line: "E4E4E4", panel: "F5F5F5", redSoft: "FCE9EA", redMid: "EF9A9F", gray: "C9C9C9", white: "FFFFFF" };
const THEME = {
  name: "iRent Plus",
  headFontFace: FONT,
  bodyFontFace: FONT,
  colors: {
    dk1: HEX.ink, lt1: HEX.white, dk2: HEX.ink2, lt2: HEX.panel,
    accent1: HEX.red, accent2: HEX.ink3, accent3: HEX.line, accent4: HEX.redSoft, accent5: "1E8E3E", accent6: "E8A100",
    hlink: HEX.red, folHlink: HEX.ink3,
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in, same as the official template
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.author = "iRent+ 團隊";
pres.title = "iRent+ AI 智能車況管家｜解決方案簡報";
pres.subject = "2026 和泰 AI 黑客松 iRent 企業挑戰題";
const C = pres.SchemeColor;
const SH = pres.shapes;

const W = 13.333;
const MX = 0.6; // side margin
const CW = W - MX * 2; // content width 12.133

// ---------------------------------------------------------------- layouts
const footer = () => ({ text: { text: "iRent+｜AI 智能車況管家", options: { x: MX, y: 7.03, w: 5, h: 0.3, fontSize: 10, color: C.accent2, margin: 0, valign: "middle" } } });
const slideNum = () => ({ x: W - MX - 0.8, y: 7.03, w: 0.8, h: 0.3, fontSize: 10, color: C.accent2, align: "right", margin: 0 });

pres.defineSlideMaster({ title: "COVER", background: { color: C.background1 } });
pres.defineSlideMaster({
  title: "SUMMARY",
  background: { color: C.background1 },
  objects: [
    footer(),
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.5, w: CW, h: 0.7, fontSize: 28, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
  ],
  slideNumber: slideNum(),
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  objects: [
    footer(),
    { placeholder: { options: { name: "kicker", type: "body", x: MX, y: 0.42, w: CW, h: 0.32, fontSize: 13, bold: true, color: C.accent1, valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.76, w: CW, h: 0.62, fontSize: 28, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
  ],
  slideNumber: slideNum(),
});

// ---------------------------------------------------------------- helpers
const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, margin: 0, valign: "top", fontSize: 14, color: C.text1, lang: "zh-TW" }, o));
const box = (s, x, y, w, h, o = {}) =>
  s.addShape(o.square ? SH.RECTANGLE : SH.ROUNDED_RECTANGLE, Object.assign({ x, y, w, h, fill: { color: C.background2 }, line: { color: C.background2, width: 0 } }, o.square ? {} : { rectRadius: 0.1 }, o));
const outline = (s, x, y, w, h, o = {}) => box(s, x, y, w, h, Object.assign({ fill: { color: C.background1 }, line: { color: C.accent3, width: 1 } }, o));
const chip = (s, n, x, y, d = 0.4, o = {}) =>
  T(s, String(n), Object.assign({ shape: SH.OVAL, x, y, w: d, h: d, fill: { color: C.accent1 }, color: C.background1, fontSize: Math.round(d * 30), bold: true, align: "center", valign: "middle" }, o));
const arrow = (s, x1, y1, x2, y2, o = {}) =>
  s.addShape(SH.LINE, Object.assign({ x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipH: x2 < x1, flipV: y2 < y1, line: { color: C.accent1, width: 2, endArrowType: "triangle" } }, o));
const lines = (items, o = {}) => items.map((t, i) => ({ text: t, options: Object.assign({ breakLine: i < items.length - 1 }, o) }));
// One bullet per item. Keep items to one line, or let them wrap: pptxgenjs writes an invalid
// second <a:pPr> for soft line breaks, and a "\n" would start a new paragraph.
const bullets = (items, o = {}) => items.map((t, i) => ({ text: t, options: Object.assign({ bullet: { indent: 14 }, breakLine: i < items.length - 1 }, o) }));

// Viewfinder corners: the motif from the video (iRent+ cover and S1/S7 numbers).
const corners = (s, x, y, w, h, arm = 0.3, th = 0.05) => {
  const r = (xx, yy, ww, hh) => s.addShape(SH.RECTANGLE, { x: xx, y: yy, w: ww, h: hh, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 } });
  r(x, y, arm, th); r(x, y, th, arm);
  r(x + w - arm, y, arm, th); r(x + w - th, y, th, arm);
  r(x, y + h - th, arm, th); r(x, y + h - arm, th, arm);
  r(x + w - arm, y + h - th, arm, th); r(x + w - th, y + h - arm, th, arm);
};

const iconCache = {};
async function icon(name, hex) {
  const key = name + hex;
  if (!iconCache[key]) {
    const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[name], { color: "#" + hex, size: 256 }));
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    iconCache[key] = "image/png;base64," + png.toString("base64");
  }
  return iconCache[key];
}
// Icon in a soft red circle.
async function iconDot(s, name, x, y, d = 0.62) {
  s.addShape(SH.OVAL, { x, y, w: d, h: d, fill: { color: C.accent4 }, line: { color: C.accent4, width: 0 } });
  const k = d * 0.5;
  s.addImage({ data: await icon(name, HEX.red), x: x + (d - k) / 2, y: y + (d - k) / 2, w: k, h: k });
}

// Phone mock images (deckshots, PAD 130): 674 x 1128 CSS px, phone body 414 x 868 at (130, 110),
// the rest is room for the drop shadow. Place them by the phone body: centre x, top y, body height.
const IMG_W = 674, IMG_H = 1128, BODY_X = 130, BODY_Y = 110, BODY_W = 414, BODY_H = 868;
const phone = (s, file, cx, top, bodyH) => {
  const k = bodyH / BODY_H;
  s.addImage({ path: path.join(IMG, file), altText: ALT[file] || "手機畫面示意", x: cx - (BODY_X + BODY_W / 2) * k, y: top - BODY_Y * k, w: IMG_W * k, h: IMG_H * k });
};
const bodyW = (bodyH) => (bodyH * BODY_W) / BODY_H;
const ALT = {
  "pickup.png": "手機畫面示意：取車時列出這台車已記錄的損傷",
  "camera-ok.png": "手機畫面示意：相機畫面疊著上一次同角度照片，提示畫面清楚可以拍",
  "camera-fail.png": "手機畫面示意：照片太暗，提示需重拍",
  "receipt-return.png": "手機畫面示意：還車確認單，疑似新的車損，營運人員已確認",
  "receipt-pickup.png": "手機畫面示意：取車確認單，車內清潔狀況記為上一位用戶留下",
  "history.png": "手機畫面示意：歷史訂單，列出取車確認與還車確認",
};

const content = (section, kicker, title) => {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(kicker, { placeholder: "kicker" });
  s.addText(title, { placeholder: "title" });
  return s;
};

// ---------------------------------------------------------------- data
const HOURLY = [1126, 1019, 704, 466, 345, 316, 280, 390, 638, 611, 664, 676, 1068, 1329, 1361, 1619, 2144, 1988, 1761, 1584, 1510, 1977, 2068, 1674];
const REVIEWS = [
  // 924 unique posts (46 Dcard posts were scraped twice), classified on title + content
  // with web/src/lib/review-categories.json. A post can fall into several categories.
  { label: "扣款、費用、罰單爭議", n: 250, related: false },
  { label: "還車範圍、找車位、GPS 定位", n: 186, related: false },
  { label: "拍照流程、照片被退", n: 145, related: true },
  { label: "App 當機、鎖車失敗、連線", n: 105, related: false },
  { label: "車內髒亂、遺留物", n: 60, related: true },
  { label: "客服難聯絡、回覆慢", n: 53, related: false },
  { label: "車損爭議、求償", n: 49, related: true },
];

// Evidence photos from the organiser's dataset (plates blurred), 9:16 portrait crops.
// They may only be used for the competition: keep them out of the public repo.
const EV_RATIO = 0.5625;
const EV_ALT = {
  "crash1_pickup.jpg": "主辦方照片：取車時車身左前完好（車牌已遮蔽）",
  "crash1_return.jpg": "主辦方照片：還車時車身左前嚴重受損",
  "crash2_pickup.jpg": "主辦方照片：夜間取車時車身左後完好（車牌已遮蔽）",
  "crash2_return.jpg": "主辦方照片：夜間還車時車身左後保險桿凹陷破裂（車牌已遮蔽）",
  "tidy1_front.jpg": "主辦方照片：還車時前座乾淨（夜間）",
  "tidy1_rear.jpg": "主辦方照片：還車時後座座椅有碎屑、地墊有沙土",
  "tidy2_front.jpg": "主辦方照片：還車時前座儀表板有灰塵、腳踏墊有污漬",
  "tidy2_rear.jpg": "主辦方照片：還車時後座乾淨",
};
const evPhoto = (s, file, x, y, h, label, red) => {
  const w = h * EV_RATIO;
  s.addImage({ path: path.join(IMG, file), altText: EV_ALT[file] || "主辦方照片", x, y, w, h });
  if (label) T(s, label, { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.05, x: x + 0.06, y: y + 0.06, w: 0.5, h: 0.24, fill: { color: red ? C.accent1 : C.text1 }, color: C.background1, fontSize: 9.5, bold: true, align: "center", valign: "middle" });
  return w;
};

async function build() {
  // ============================================================ 0 cover
  pres.addSection({ title: "封面" });
  {
    const s = pres.addSlide({ masterName: "COVER", sectionTitle: "封面" });
    T(s, "2026 和泰 AI 黑客松｜iRent 企業挑戰題", { x: 0.8, y: 0.7, w: 7, h: 0.35, fontSize: 14, color: C.accent2 });
    corners(s, 0.8, 1.75, 6.4, 2.75, 0.45, 0.07);
    T(s, "iRent+", { x: 1.2, y: 1.98, w: 5.8, h: 1.4, fontSize: 88, bold: true, color: C.accent1, valign: "middle" });
    T(s, "AI 智能車況管家", { x: 1.25, y: 3.42, w: 5.8, h: 0.75, fontSize: 36, bold: true, valign: "middle" });
    T(s, lines(["拍照當場把關、AI 前後比對、問題自動派工", "每天 2.7 萬張車況照片，從 10–20 人檢視變成 1–2 人確認"]), { x: 0.8, y: 4.85, w: 6.6, h: 0.9, fontSize: 17, color: C.text2, paraSpaceAfter: 6 });
    T(s, "團隊名稱：pp", { x: 0.8, y: 6.5, w: 5, h: 0.35, fontSize: 14, color: C.accent2 });
    // a real result from the organiser's photos
    const ph = 4.3, x0 = 7.75, y0 = 1.0;
    const w1 = evPhoto(s, "crash1_pickup.jpg", x0, y0, ph, "取車", false);
    evPhoto(s, "crash1_return.jpg", x0 + w1 + 0.1, y0, ph, "還車", true);
    T(s, "AI 比對：左前新車損・3 次判讀都一致", { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.08, x: x0, y: y0 + ph + 0.18, w: w1 * 2 + 0.1, h: 0.45, fill: { color: C.accent1 }, color: C.background1, fontSize: 14, bold: true, align: "center", valign: "middle" });
    T(s, "主辦方資料集實測，車牌已遮蔽", { x: x0, y: y0 + ph + 0.7, w: w1 * 2 + 0.1, h: 0.28, fontSize: 10, color: C.accent2, align: "center" });
    s.addNotes("封面。iRent+：AI 智能車況管家，團隊 pp。一句話：拍照當場把關、AI 前後比對、問題自動派工，讓每天 2.7 萬張取還車照片，從需要 10–20 人檢視變成 1–2 人確認。右邊是主辦方資料集的實際判讀：取車時完好、還車時左前受損，AI 三次判讀都判定為新車損。");
  }

  // ============================================================ summary (not counted in the 15 pages)
  pres.addSection({ title: "提案摘要" });
  {
    const s = pres.addSlide({ masterName: "SUMMARY", sectionTitle: "提案摘要" });
    s.addText("提案摘要", { placeholder: "title" });
    const L = (t) => ({ text: t, options: { bold: true, fill: { color: HEX.panel }, color: HEX.ink } });
    const rows = [
      [L("團隊名稱"), { text: "pp" }],
      [L("產品/服務名稱"), { text: "iRent+ AI 智能車況管家" }],
      [L("企業挑戰題目"), { text: "iRent｜運用 AI 打造 iRent 智能車況管家：優化租還車體驗與營運效率" }],
      [L("目標對象"), { text: "iRent 自助取還車的租車用戶，以及負責檢視車況、安排清潔與檢修的營運團隊" }],
      [
        L("解決方案設計重點\n(至多3項)"),
        {
          text: [
            { text: "1. 拍照時把關：疊影對齊上次照片，手機即時檢查畫質、車牌、角度與遠近，不合格當場重拍", options: { breakLine: true } },
            { text: "2. 送出後比對：後台 VLM 比對前後照片，判讀新車損、車內整潔、遺留物與卡片，三次判讀取多數", options: { breakLine: true } },
            { text: "3. 發現問題自動處理：自動開工單、暫停出租；營運確認後記成已知車損，用戶看得到取還車確認單" },
          ],
        },
      ],
      [L("運用到的AI技術、\n服務或模型等資源"), { text: "Qwen 系列開源視覺語言模型（以 vLLM 自架推論，照片不外流）；\n手機端：PaddleOCR PP-OCRv4 車牌辨識（onnxruntime-web）與畫質檢查，都在瀏覽器內運算" }],
      [L("預期效益簡述"), { text: "主辦方 144 組取還車照片實測：車損召回率 100%、誤報率 3%。\n每天約 4,820 筆取還車全數檢查，所需人力由約 10–20 人降至 1–2 人（約 −90%）；\n不合格照片當場重拍；髒車與嚴重車損自動暫停出租；每次取還車都有確認單" }],
    ];
    s.addTable(rows, {
      x: MX, y: 1.45, w: CW, colW: [2.75, CW - 2.75],
      fontFace: FONT, fontSize: 14, color: HEX.ink, valign: "middle",
      border: { type: "solid", pt: 0.75, color: HEX.line },
      margin: [6, 10, 6, 10],
      rowH: [0.44, 0.44, 0.44, 0.6, 1.45, 0.8, 1.0],
    });
    s.addNotes("提案摘要（不計入 15 頁）。欄位名稱與順序依官方範本。");
  }

  // ============================================================ 1 overview
  pres.addSection({ title: "1. 提案概述" });
  {
    const s = content("1. 提案概述", "1　提案概述", "把取還車照片，變成會自己處理的車況紀錄");
    box(s, MX, 1.6, CW, 1.15);
    T(s, "提案名稱", { x: 0.9, y: 1.73, w: 3.9, h: 0.25, fontSize: 11, color: C.accent2 });
    T(s, "iRent+ AI 智能車況管家", { x: 0.9, y: 2.0, w: 4.1, h: 0.5, fontSize: 20, bold: true, color: C.accent1 });
    T(s, "核心價值主張", { x: 5.1, y: 1.73, w: 7.4, h: 0.25, fontSize: 11, color: C.accent2 });
    T(s, "照片在拍的當下就把關，送出後由 AI 比對前後照片，發現問題自動派工。\n營運只確認 AI 標記的部分，用戶每次都看得到判定結果。", { x: 5.1, y: 2.0, w: 7.45, h: 0.65, fontSize: 15 });

    const cw = (CW - 0.9) / 3;
    const xs = [0, 1, 2].map((i) => MX + i * (cw + 0.45));
    const top = 3.0, ch = 3.75;
    ["要解決的核心問題", "我們的做法", "目標與實測"].forEach((h, i) => {
      outline(s, xs[i], top, cw, ch);
      T(s, h, { x: xs[i] + 0.3, y: top + 0.25, w: cw - 0.6, h: 0.3, fontSize: 13, bold: true, color: C.accent1 });
      if (i < 2) T(s, "›", { x: xs[i] + cw + 0.05, y: top + ch / 2 - 0.35, w: 0.35, h: 0.6, fontSize: 36, bold: true, color: C.accent1, align: "center", valign: "middle" });
    });
    T(s, [
      { text: "營運端", options: { bold: true, fontSize: 15, breakLine: true } },
      { text: "每天約 2.7 萬張車況照片，", options: { breakLine: true } },
      { text: "要每筆都看需 10–20 人；", options: { breakLine: true } },
      { text: "問題常等下一位用戶取車才發現", options: { breakLine: true, paraSpaceAfter: 14 } },
      { text: "用戶端", options: { bold: true, fontSize: 15, breakLine: true } },
      { text: "924 則評論中 208 則與車況有關：", options: { breakLine: true } },
      { text: "拍照常被要求重拍、接到髒車、", options: { breakLine: true } },
      { text: "車損責任說不清" },
    ], { x: xs[0] + 0.3, y: top + 0.7, w: cw - 0.6, h: 2.8, fontSize: 14, color: C.text1, paraSpaceAfter: 2 });
    T(s, "3 個環節・9 個機制", { x: xs[1] + 0.3, y: top + 0.65, w: cw - 0.6, h: 0.5, fontSize: 22, bold: true });
    [["拍照時", "手機當場檢查畫質、車牌與角度，\n還車先拍車內再鎖門"], ["送出後", "後台 AI 比對前後照片"], ["發現問題後", "自動開工單、營運確認，\n用戶看得到結果"]].forEach(([a, b], i) => {
      chip(s, i + 1, xs[1] + 0.3, top + 1.35 + i * 0.75, 0.36);
      T(s, [{ text: a, options: { bold: true, breakLine: true } }, { text: b }], { x: xs[1] + 0.8, y: top + 1.3 + i * 0.75, w: cw - 1.1, h: 0.7, fontSize: 13.5 });
    });
    [["1–2 人", "每天 4,820 筆取還車全數檢查\n所需人力（全人工需 10–20 人）"], ["召回率 100%", "主辦方 144 組照片實測，\n車損全部抓到，誤報率 3%"], ["當場重拍", "不合格照片在手機上就擋下"]].forEach(([v, l], i) => {
      T(s, v, { x: xs[2] + 0.3, y: top + 0.65 + i * 1.0, w: cw - 0.6, h: 0.45, fontSize: 24, bold: true, color: C.accent1 });
      T(s, l, { x: xs[2] + 0.3, y: top + 1.1 + i * 1.0, w: cw - 0.6, h: 0.5, fontSize: 13 });
    });
    s.addNotes("提案概述。核心價值：照片不再只是存檔，而是拍的當下就把關、送出後由 AI 比對、發現問題自動派工。目標：人力 10–20 人降到 1–2 人、不合格照片當場重拍；主辦方 144 組照片實測，車損召回率 100%、誤報率 3%。");
  }

  // ============================================================ 2 users and pain points
  pres.addSection({ title: "2. 目標對象與痛點分析" });
  {
    const s = content("2. 目標對象與痛點分析", "2　目標對象與痛點分析", "兩個目標對象，卡在同一個環節：車況照片");
    const pw = (CW - 0.35) / 2;
    const personas = [
      { icon: "FaUser", title: "租車用戶", items: ["iRent 會員已突破 200 萬人¹", "自助取還車，現場沒有人員點交", "還車要拍 7 張必拍照片"] },
      { icon: "FaClipboardCheck", title: "營運團隊", items: ["每天約 4,820 筆取還車、27,367 張照片²", "照片送出後，才由後台人員查看", "清潔、檢修靠人工判斷與安排"] },
    ];
    for (const [i, p] of personas.entries()) {
      const x = MX + i * (pw + 0.35);
      box(s, x, 1.6, pw, 1.8);
      await iconDot(s, p.icon, x + 0.3, 1.85, 0.7);
      T(s, p.title, { x: x + 1.2, y: 1.82, w: pw - 1.5, h: 0.4, fontSize: 18, bold: true });
      T(s, bullets(p.items), { x: x + 1.2, y: 2.27, w: pw - 1.45, h: 1.05, fontSize: 14, paraSpaceAfter: 3 });
    }
    T(s, "現行拍照流程與三個斷點", { x: MX, y: 3.65, w: 6, h: 0.32, fontSize: 15, bold: true });
    const steps = ["加油卡／停車卡", "車內前座、後座", "車身四角\n（含車牌）", "其他車損\n（最多 4 張）", "送出照片", "後台人員查看"];
    const sw = 1.72, sg = (CW - sw * 6) / 5;
    steps.forEach((t, i) => {
      const x = MX + i * (sw + sg);
      outline(s, x, 4.08, sw, 0.62, { rectRadius: 0.08 });
      T(s, t, { x: x + 0.05, y: 4.08, w: sw - 0.1, h: 0.62, fontSize: 13, align: "center", valign: "middle" });
      if (i < 5) arrow(s, x + sw + 0.05, 4.39, x + sw + sg - 0.05, 4.39, { line: { color: C.accent2, width: 1.25, endArrowType: "triangle" } });
    });
    const bx1 = MX, bx2 = MX + 3 * (sw + sg) + sw, bx3 = MX + 4 * (sw + sg), bx4 = MX + CW;
    s.addShape(SH.RECTANGLE, { x: bx1, y: 4.82, w: bx2 - bx1, h: 0.035, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 } });
    s.addShape(SH.RECTANGLE, { x: bx3, y: 4.82, w: bx4 - bx3, h: 0.035, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 } });
    const gaps = [
      { x: bx1, y: 5.0, w: 6.0, n: 1, t: "拍照時沒人檢查", d: "拍糊、拍歪照樣送出，事後才被要求重拍" },
      { x: bx3, y: 5.0, w: bx4 - bx3, n: 2, t: "送出後人工看不完", d: "看不完，也看得太晚" },
      { x: bx1, y: 5.72, w: 8.0, n: 3, t: "出問題時前後對不上", d: "取車、還車照片角度不同，很難比對責任" },
    ];
    for (const g of gaps) {
      chip(s, g.n, g.x, g.y + 0.05, 0.36);
      T(s, [{ text: g.t, options: { bold: true, breakLine: true } }, { text: g.d, options: { color: C.text2, fontSize: 12.5 } }], { x: g.x + 0.48, y: g.y, w: g.w - 0.5, h: 0.65, fontSize: 14.5 });
    }
    T(s, "主辦方：「實際照片內容常與所選分類不一致」", { x: bx3, y: 5.85, w: bx4 - bx3, h: 0.3, fontSize: 11.5, italic: true, color: C.text2 });
    T(s, "¹ 旺得富理財網〈iRent共享車平台 用戶突破200萬大關〉，2026/2/6　² 主辦方照片上傳清單，2026/4/22 全天", { x: MX, y: 6.55, w: CW, h: 0.3, fontSize: 10, color: C.accent2 });
    s.addNotes("目標對象：租車用戶與營運團隊。兩者都卡在車況照片。現行流程（依主辦方還車流程圖）：拍卡夾、車內、車身四角、其他車損，送出後由後台人員查看。三個斷點：拍照時沒人檢查、送出後人工看不完、出問題時前後照片對不上。");
  }
  {
    const s = content("2. 目標對象與痛點分析", "2　目標對象與痛點分析｜營運端", "每天約 2.7 萬張照片，要每筆都看需 10–20 人");
    T(s, "2026/4/22 每小時上傳的車況照片（張）", { x: MX, y: 1.6, w: 7.4, h: 0.32, fontSize: 13, bold: true });
    const colors = HOURLY.map((_, i) => (i === 16 ? HEX.red : i > 16 ? HEX.redMid : HEX.gray));
    s.addChart(pres.charts.BAR, [{ name: "照片數", labels: HOURLY.map((_, i) => String(i)), values: HOURLY }], {
      x: MX - 0.1, y: 1.95, w: 7.6, h: 4.0, barDir: "col", barGapWidthPct: 40,
      chartColors: colors, showLegend: false, showValue: false, showTitle: false,
      catAxisLabelFontSize: 10, catAxisLabelColor: HEX.ink3, catAxisLabelFontFace: "+mn-lt", catAxisLineShow: false,
      valAxisLabelFontSize: 10, valAxisLabelColor: HEX.ink3, valAxisLabelFontFace: "+mn-lt", valAxisLabelFormatCode: "#,##0", valAxisMaxVal: 2500, valAxisMajorUnit: 500, valAxisLineShow: false,
      valGridLine: { color: HEX.line, size: 0.5 }, catGridLine: { style: "none" },
      catAxisTitle: "時", showCatAxisTitle: false,
    });
    T(s, [{ text: "尖峰 16 時：2,144 張", options: { bold: true, color: C.accent1, breakLine: true } }, { text: "每 1.7 秒就有一張", options: { color: C.text2, fontSize: 12.5 } }], { x: 3.15, y: 2.02, w: 2.35, h: 0.58, fontSize: 14, align: "right", fill: { color: C.background1 } });
    arrow(s, 5.52, 2.3, 5.68, 2.52, { line: { color: C.accent1, width: 1.5, endArrowType: "triangle" } });
    T(s, "下午 4 點到午夜每小時都超過 1,500 張：最需要即時處理時，照片也最多", { x: MX, y: 6.02, w: 7.6, h: 0.32, fontSize: 13.5, color: C.text2 });

    const rx = 8.45, rw = W - MX - rx;
    T(s, "如果每一筆都靠人工檢視", { x: rx, y: 1.6, w: rw, h: 0.32, fontSize: 13, bold: true });
    const calc = [["4,820 筆", "取還車／天（照片 27,367 張）"], ["× 1–2 分鐘", "每筆人工檢視"], ["= 80–160 工時", "每天"]];
    calc.forEach(([v, u], i) => {
      T(s, v, { x: rx, y: 2.05 + i * 0.95, w: rw, h: 0.5, fontSize: 28, bold: true });
      T(s, u, { x: rx, y: 2.55 + i * 0.95, w: rw, h: 0.3, fontSize: 12.5, color: C.text2 });
    });
    corners(s, rx - 0.2, 4.85, rw + 0.2, 1.4, 0.22, 0.045);
    T(s, [{ text: "≈ 10–20", options: { fontSize: 40, bold: true, color: C.accent1 } }, { text: " 人", options: { fontSize: 22, bold: true, color: C.accent1 } }], { x: rx + 0.15, y: 4.98, w: rw - 0.35, h: 0.72, valign: "middle" });
    T(s, "每人每天 8 小時", { x: rx + 0.15, y: 5.72, w: rw - 0.35, h: 0.3, fontSize: 12.5, color: C.text2 });
    T(s, "估算假設：每筆人工檢視 1–2 分鐘、每人每天 8 小時。資料：主辦方照片上傳清單（2026/4/22 全天，4,820 筆取還車）", { x: MX, y: 6.55, w: CW, h: 0.3, fontSize: 10, color: C.accent2 });
    s.addNotes("營運端痛點。主辦方資料：一天 27,367 張照片、4,820 筆取還車；16 點尖峰 2,144 張，每 1.7 秒一張；下午 4 點到午夜每小時都超過 1,500 張。若每筆都人工看，以 1–2 分鐘計，一天 80–160 工時，約 10–20 人。");
  }
  {
    const s = content("2. 目標對象與痛點分析", "2　目標對象與痛點分析｜用戶端", "924 則評論裡，208 則跟車況有關");
    T(s, "顧客評論依問題分類（則數，一則可屬多類）", { x: MX, y: 1.6, w: 6.4, h: 0.32, fontSize: 13, bold: true });
    s.addChart(pres.charts.BAR, [{ name: "則數", labels: REVIEWS.map((r) => r.label), values: REVIEWS.map((r) => r.n) }], {
      x: MX - 0.1, y: 1.95, w: 6.6, h: 3.95, barDir: "bar", barGapWidthPct: 45, catAxisOrientation: "maxMin",
      chartColors: REVIEWS.map((r) => (r.related ? HEX.red : HEX.gray)), showLegend: false, showTitle: false,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 11, dataLabelColor: HEX.ink2, dataLabelFontFace: "+mn-lt",
      catAxisLabelFontSize: 11, catAxisLabelColor: HEX.ink2, catAxisLabelFontFace: "+mn-lt", catAxisLineShow: false,
      valAxisHidden: true, valAxisMaxVal: 300, valGridLine: { style: "none" }, catGridLine: { style: "none" },
    });
    T(s, "來源：Google Play 682、PTT 130、Dcard 107、App Store 5 則\n（同一篇只算一次，2026/10/7 擷取）", { x: MX, y: 5.98, w: 6.4, h: 0.4, fontSize: 10, color: C.accent2 });

    const rx = 7.35, rw = W - MX - rx;
    T(s, [{ text: "208 則", options: { fontSize: 36, bold: true, color: C.accent1 } }, { text: "　跟車況有關，占全部評論 22.5%", options: { fontSize: 15, bold: true } }], { x: rx, y: 1.55, w: rw, h: 0.7, valign: "middle" });
    T(s, "拍照、髒亂、車損三類任一，重複只算一次", { x: rx, y: 2.22, w: rw, h: 0.28, fontSize: 11, color: C.accent2 });
    const probs = [
      ["拍照流程類 145 則", "拍照耗時，常被要求重拍", "「還車拍照四邊都拍了，還一直要我重拍，耗時好幾分鐘。」", "Google Play・2026/06/10"],
      ["髒亂類 60 則", "接到上一位留下的髒車", "「最近很多⋯⋯喜歡丟垃圾在車上，建議⋯⋯罰款清潔費」", "Google Play・2026/07/12"],
      ["車損類 49 則", "車損賠償，說不清責任", "「3 個月內都有可能會被坑說是你用的，要你賠。」", "Google Play・2026/02/20"],
    ];
    probs.forEach(([n, t, q, m], i) => {
      const y = 2.65 + i * 1.33;
      box(s, rx, y, rw, 1.18);
      T(s, t, { x: rx + 0.25, y: y + 0.14, w: rw - 2.3, h: 0.4, fontSize: 15, bold: true, valign: "middle" });
      T(s, n, { x: rx + rw - 2.05, y: y + 0.14, w: 1.8, h: 0.4, fontSize: 11.5, bold: true, color: C.accent1, align: "right", valign: "middle" });
      T(s, [{ text: q, options: { italic: true, breakLine: true } }, { text: m, options: { color: C.accent2, fontSize: 10 } }], { x: rx + 0.25, y: y + 0.58, w: rw - 0.4, h: 0.55, fontSize: 12, color: C.text2 });
    });
    s.addNotes("用戶端痛點。我們做了評論管理後台，收集 Google Play、App Store、PTT、Dcard 共 924 則評論（同一篇只算一次），依關鍵字規則分成 7 類；其中 208 則（22.5%）跟車況有關。拍照流程類 145 則、髒亂類 60 則、車損類 49 則，常見的抱怨是拍照耗時常被要求重拍、接到上一位留下的髒車、車損賠償說不清責任。");
  }

  // ============================================================ 3 solution
  pres.addSection({ title: "3. 解決方案設計" });
  {
    const s = content("3. 解決方案設計", "3　解決方案設計｜整體架構", "三個環節、9 個機制，補上三個斷點");
    const cw = (CW - 0.58) / 3;
    const cols = [
      { gap: "補斷點 ① 拍照沒人檢查、③ 角度對不上", stage: "拍照時", who: "手機", mech: [[1, "已知車損提前告知", "取車時先列出已記錄的損傷"], [2, "上次照片疊影對齊", "上一次同角度照片疊在畫面上"], [3, "即時檢查畫質、車牌、角度", "站錯、太遠太近、太暗都提醒"], [4, "先拍車內，鎖門再拍車外", "按下還車就停止計費"]] },
      { gap: "補斷點 ② 人工看不完、③ 前後難比對", stage: "送出後", who: "後台 AI", mech: [[5, "取車比上次、還車比取車", "差異歸屬到對的人"], [6, "三次判讀、多數決", "無法比對的照片送人工確認"]] },
      { gap: "補斷點 ② 看得太晚、處理靠人工", stage: "發現問題後", who: "系統・營運・用戶", mech: [[7, "自動開工單、暫停出租", "髒汙排清潔、嚴重車損排檢修"], [8, "營運確認，記成已知車損", "駁回誤報，工單自動取消、恢復出租"], [9, "用戶取還車確認單", "AI 初步判讀與營運確認狀態"]] },
    ];
    cols.forEach((c, i) => {
      const x = MX + i * (cw + 0.29);
      T(s, c.gap, { x, y: 1.58, w: cw, h: 0.3, fontSize: 12, bold: true, color: C.accent1 });
      box(s, x, 1.95, cw, 3.95);
      s.addShape(SH.ROUNDED_RECTANGLE, { x, y: 1.95, w: cw, h: 0.68, rectRadius: 0.1, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 } });
      T(s, [{ text: c.stage, options: { fontSize: 20, bold: true } }, { text: "　" + c.who, options: { fontSize: 13 } }], { x: x + 0.25, y: 1.95, w: cw - 0.5, h: 0.68, color: C.background1, valign: "middle" });
      c.mech.forEach(([n, name, note], j) => {
        const y = 2.8 + j * 0.78;
        chip(s, n, x + 0.25, y + 0.02, 0.42);
        T(s, [{ text: name, options: { bold: true, fontSize: 14.5, breakLine: true } }, { text: note, options: { fontSize: 12.5, color: C.text2 } }], { x: x + 0.82, y, w: cw - 1.0, h: 0.72 });
      });
      if (i === 1) T(s, "照片送出後自動檢查，\n用戶不必在現場等結果", { x: x + 0.82, y: 4.45, w: cw - 1.0, h: 0.62, fontSize: 12.5, italic: true, color: C.accent2 });
    });
    T(s, "系統架構", { x: MX, y: 6.08, w: 0.95, h: 0.6, fontSize: 12, bold: true, color: C.text2, valign: "middle" });
    const arch = [["手機 App", "Next.js 網頁"], ["Supabase", "資料庫、照片儲存"], ["VLM 檢查服務", "Qwen 系列，自架"], ["預警與工單", "資料庫自動觸發"], ["營運後台", "用戶確認單"]];
    const ax0 = MX + 1.0, aw = 1.92, ag = (CW - 1.0 - aw * 5) / 4;
    arch.forEach(([a, b], i) => {
      const x = ax0 + i * (aw + ag);
      outline(s, x, 6.08, aw, 0.6, { rectRadius: 0.08 });
      T(s, [{ text: a, options: { bold: true, breakLine: true } }, { text: b, options: { color: C.text2, fontSize: 10.5 } }], { x: x + 0.05, y: 6.08, w: aw - 0.1, h: 0.6, fontSize: 12, align: "center", valign: "middle" });
      if (i < 4) arrow(s, x + aw + 0.04, 6.38, x + aw + ag - 0.04, 6.38, { line: { color: C.accent2, width: 1.25, endArrowType: "triangle" } });
    });
    s.addNotes("整體架構：三個環節、9 個機制，補上三個斷點。拍照時（手機）：已知車損提前告知、疊影對齊、即時檢查畫質車牌角度、還車先拍車內再鎖門。送出後（後台 AI）：取車比上次、還車比取車；每張判讀三次取多數決。發現問題後：自動開工單與暫停出租、營運確認記成已知車損、用戶確認單。系統：Next.js 手機網頁、Supabase、自架 Qwen 系列 VLM、資料庫觸發的預警與工單、營運後台。");
  }
  {
    const s = content("3. 解決方案設計", "3　解決方案設計｜取還車流程", "用戶端：拍一次就拍對，還車不用回頭開門");
    const lanes = [
      { name: "取車", y: 1.6, steps: [["1", "看已知車損", "先列出這台車\n已記錄的損傷"], ["2", "對齊上次照片", "上一次同角度照片\n疊在畫面上"], ["3", "即時檢查", "畫質、車牌、\n角度、光線，\n不合格當場重拍"], ["", "損傷紀錄", "已知車損與新損傷\n可補拍特寫"], ["", "確認取車", "進入用車頁"]] },
      { name: "還車", y: 3.75, steps: [["4", "開始還車", "按下就停止計費"], ["4", "先拍車內", "卡夾、前座、後座，\n10 分鐘內完成"], ["4", "下車鎖門", "關門後一鍵鎖門，\n不用等照片上傳"], ["3", "拍車外四角", "一樣有疊影\n與即時檢查"], ["9", "停車位置", "拍停車位置後送出；\n確認單在歷史訂單"]] },
    ];
    const lw = 0.62, gap = 0.22, lx = MX + lw + 0.2, bw = (CW - lw - 0.2 - gap * 4) / 5, bh = 1.8;
    for (const lane of lanes) {
      T(s, lane.name.split("").join("\n"), { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.1, x: MX, y: lane.y, w: lw, h: bh, fill: { color: C.accent1 }, color: C.background1, fontSize: 18, bold: true, align: "center", valign: "middle" });
      lane.steps.forEach(([n, t, d], i) => {
        const x = lx + i * (bw + gap);
        box(s, x, lane.y, bw, bh);
        if (n) chip(s, n, x + 0.18, lane.y + 0.2, 0.36);
        T(s, t, { x: x + (n ? 0.62 : 0.18), y: lane.y + 0.17, w: bw - (n ? 0.72 : 0.3), h: 0.42, fontSize: 14, bold: true, valign: "middle" });
        T(s, d, { x: x + 0.18, y: lane.y + 0.75, w: bw - 0.3, h: 0.95, fontSize: 12, color: C.text2 });
        if (i < 4) T(s, "›", { x: x + bw - 0.04, y: lane.y + bh / 2 - 0.25, w: gap + 0.08, h: 0.5, fontSize: 20, bold: true, color: C.accent1, align: "center", valign: "middle" });
      });
    }
    box(s, MX, 5.85, CW, 0.62, { fill: { color: C.accent4 }, line: { color: C.accent4, width: 0 } });
    T(s, [{ text: "對應評論：", options: { bold: true, color: C.accent1 } }, { text: "「還車鎖門後才要拍內部照片，這很不合理」（Google Play・2026/07/12）" }], { x: MX + 0.25, y: 5.85, w: CW - 0.5, h: 0.62, fontSize: 13.5, valign: "middle" });
    T(s, "紅色數字為機制編號", { x: MX, y: 6.62, w: CW, h: 0.25, fontSize: 10, color: C.accent2 });
    s.addNotes("取還車流程。取車：先看到這台車已記錄的損傷；拍照時疊著上一次同角度的照片，手機每 0.5 秒檢查畫質、讀車牌判斷角度與遠近、比對光線，不合格當場重拍；可補拍損傷特寫後確認取車。還車：按開始還車，計費就停止；10 分鐘內先拍卡夾和前後座，下車關門後鎖門，鎖門不用等照片上傳；再拍車外四角與停車位置。之後在歷史訂單看得到取還車確認單。這直接回應評論裡「鎖門後才要拍內部照片」的抱怨。");
  }
  {
    const s = content("3. 解決方案設計", "3　解決方案設計｜營運流程", "營運端：AI 先篩、系統派工，人只做確認");
    const iw = 7.0, ih = iw * 1560 / 2260;
    s.addImage({ path: path.join(IMG, "admin_crop.png"), altText: "營運後台預警頁示意：一次取還車一張卡片，含比對照片與確認、駁回按鈕", x: MX, y: 1.6, w: iw, h: ih });
    s.addShape(SH.RECTANGLE, { x: MX, y: 1.6, w: iw, h: ih, fill: { type: "none" }, line: { color: C.accent3, width: 1 } });
    T(s, "營運後台・預警頁（示意畫面，依實際介面製作）", { x: MX, y: 1.6 + ih + 0.1, w: iw, h: 0.28, fontSize: 10, color: C.accent2 });

    const rx = 7.95, rw = W - MX - rx;
    T(s, "預警寫入後，自動開工單", { x: rx, y: 1.55, w: rw, h: 0.32, fontSize: 15, bold: true });
    T(s, "資料庫觸發，不需要人工轉單", { x: rx, y: 1.87, w: rw, h: 0.28, fontSize: 12, color: C.text2 });
    const hd = (t) => ({ text: t, options: { bold: true, color: HEX.white, fill: { color: HEX.ink } } });
    s.addTable([
      [hd("預警"), hd("工單"), hd("暫停出租")],
      ["車內髒汙", "清潔", { text: "是", options: { bold: true, color: HEX.red } }],
      ["高嚴重度新車損", "檢修", { text: "是", options: { bold: true, color: HEX.red } }],
      ["缺卡片、遺留物", "聯絡用戶", "否"],
      ["中低嚴重度車損", "由營運確認", "否"],
    ], { x: rx, y: 2.25, w: rw, colW: [2.15, 1.5, rw - 3.65], fontFace: FONT, fontSize: 13, color: HEX.ink, valign: "middle", border: { type: "solid", pt: 0.75, color: HEX.line }, margin: [4, 8, 4, 8], rowH: 0.38 });

    T(s, "營運人員只做確認", { x: rx, y: 4.35, w: rw, h: 0.32, fontSize: 15, bold: true });
    T(s, "確認", { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.08, x: rx, y: 4.8, w: 0.85, h: 0.4, fill: { color: C.accent1 }, color: C.background1, fontSize: 13, bold: true, align: "center", valign: "middle" });
    T(s, "記成已知車損，下一位取車時就看得到", { x: rx + 1.0, y: 4.8, w: rw - 1.0, h: 0.4, fontSize: 13.5, valign: "middle" });
    T(s, "駁回", { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.08, x: rx, y: 5.32, w: 0.85, h: 0.4, fill: { color: C.background1 }, line: { color: C.accent2, width: 1 }, fontSize: 13, bold: true, align: "center", valign: "middle" });
    T(s, "誤報時工單自動取消，車輛恢復出租", { x: rx + 1.0, y: 5.32, w: rw - 1.0, h: 0.4, fontSize: 13.5, valign: "middle" });
    await iconDot(s, "FaSortAmountDown", rx + 0.2, 5.9, 0.45);
    T(s, "一次取還車一張卡片，\n最嚴重、等最久的排前面", { x: rx + 1.0, y: 5.84, w: rw - 1.0, h: 0.6, fontSize: 13.5, valign: "middle" });
    s.addNotes("營運流程。VLM 檢查後寫入預警，資料庫自動開工單：車內髒汙排清潔、高嚴重度新車損排檢修，兩者都暫停出租；缺卡片或遺留物排聯絡用戶。營運人員在預警頁一次處理一筆取還車，最嚴重、等最久的排前面；確認的車損記成已知車損，駁回誤報時工單自動取消、車輛恢復出租。");
  }

  // ============================================================ 4 AI
  pres.addSection({ title: "4. AI 應用方法" });
  {
    const s = content("4. AI 應用方法", "4　AI 應用方法｜AI 的角色", "手機端把關拍照求快，後台 AI 判讀車況求準");
    const lw = 5.55, rx = MX + lw + 0.3, rw = W - MX - rx, top = 1.6, ph = 4.4;
    box(s, MX, top, lw, ph);
    box(s, rx, top, rw, ph);
    await iconDot(s, "FaMobileAlt", MX + 0.3, top + 0.28, 0.62);
    T(s, [{ text: "手機端｜即時檢查", options: { bold: true, fontSize: 18, breakLine: true } }, { text: "要快：在瀏覽器內運算，拍的當下就回饋", options: { color: C.accent1, fontSize: 13, bold: true } }], { x: MX + 1.1, y: top + 0.25, w: lw - 1.3, h: 0.72 });
    {
      const hd = (t) => ({ text: t, options: { bold: true, color: HEX.white, fill: { color: HEX.ink } } });
      const k = (t) => ({ text: t, options: { bold: true } });
      s.addTable([
        [hd("檢查"), hd("做法與實測")],
        [k("畫質"), "清晰度、亮度、過曝；\n門檻用 1,200 張還車照片校準"],
        [k("車牌"), "PaddleOCR 每 0.5 秒讀車牌；\n整張入鏡 92% 讀對，從未認錯車"],
        [k("角度、遠近"), "比對上次照片的車牌位置與大小；\n站對 95% 通過，站錯 77% 抓到"],
        [k("光線"), "比上次暗很多就提醒\n（主辦方照片約 6%）"],
      ], { x: MX + 0.3, y: top + 1.1, w: lw - 0.6, colW: [1.2, lw - 0.6 - 1.2], fontFace: FONT, fontSize: 12.5, color: HEX.ink, fill: { color: HEX.white }, valign: "middle", border: { type: "solid", pt: 0.75, color: HEX.line }, margin: [3, 8, 3, 8], rowH: [0.34, 0.58, 0.58, 0.58, 0.58] });
    }
    T(s, "角色：把不能用、比不起來的照片擋在源頭", { x: MX + 0.3, y: top + 3.92, w: lw - 0.6, h: 0.4, fontSize: 13.5, bold: true, color: C.accent1 });

    await iconDot(s, "FaServer", rx + 0.3, top + 0.28, 0.62);
    T(s, [{ text: "後台｜Qwen 系列視覺語言模型（自架）", options: { bold: true, fontSize: 18, breakLine: true } }, { text: "要準：用戶離開後，再仔細判讀", options: { color: C.accent1, fontSize: 13, bold: true } }], { x: rx + 1.1, y: top + 0.25, w: rw - 1.3, h: 0.72 });
    const hd = (t) => ({ text: t, options: { bold: true, color: HEX.white, fill: { color: HEX.ink } } });
    s.addTable([
      [hd("看哪裡"), hd("判讀什麼")],
      ["車身四角", "與比對基準找新車損：位置、類型、嚴重度"],
      ["車內前座、後座", "整潔度（乾淨／普通／髒汙）與遺留物"],
      ["加油卡／停車卡", "卡片是否在卡夾裡"],
      ["用戶回報的損傷", "核對用戶自己拍下的損傷"],
    ], { x: rx + 0.3, y: top + 1.15, w: rw - 0.6, colW: [1.75, rw - 0.6 - 1.75], fontFace: FONT, fontSize: 13, color: HEX.ink, fill: { color: HEX.white }, valign: "middle", border: { type: "solid", pt: 0.75, color: HEX.line }, margin: [3, 8, 3, 8], rowH: 0.36 });
    T(s, bullets(["每張照片判讀 3 次，取多數決", "整潔度意見不一致時，取較髒的等級", "角度不同、無法比對的照片送人工，不當作沒問題"]), { x: rx + 0.3, y: top + 3.12, w: rw - 0.6, h: 1.15, fontSize: 13.5, paraSpaceAfter: 4 });

    box(s, MX, 6.2, CW, 0.55, { fill: { color: C.accent4 }, line: { color: C.accent4, width: 0 } });
    T(s, [{ text: "設計原則：寧可多報，不要漏報。", options: { bold: true, color: C.accent1 } }, { text: "漏掉一台髒車或新車損的代價，高於多一次人工確認；標記率在試點時實測並調整門檻。" }], { x: MX + 0.25, y: 6.2, w: CW - 0.5, h: 0.55, fontSize: 13.5, valign: "middle" });
    s.addNotes("手機端把關拍照、後台 AI 判讀車況。手機端要快，全部在瀏覽器內運算：畫質（清晰度、亮度、過曝，門檻用 1,200 張還車照片校準）；車牌（PaddleOCR 每 0.5 秒讀一次，整張車牌入鏡時 92% 讀對，從未認成別台車）；角度與遠近（比對上一張同角度照片的車牌位置與大小，站對的 95% 通過、站錯的 77% 被抓到）；光線（比上一張暗很多就提醒）。後台要準：自架 Qwen 系列視覺語言模型，看車身四角、車內、卡夾、核對用戶回報；每張判讀 3 次取多數決，整潔度意見不一取較髒，無法比對的送人工。");
  }
  {
    const s = content("4. AI 應用方法", "4　AI 應用方法｜實測結果", "主辦方 144 組照片：車損召回率 100%、誤報率 3%");
    const kw = 2.9;
    const kpi = (y, v, t, d) => {
      box(s, MX, y, kw, 1.62, { fill: { color: C.accent4 }, line: { color: C.accent4, width: 0 } });
      T(s, v, { x: MX + 0.25, y: y + 0.12, w: kw - 0.5, h: 0.7, fontSize: 40, bold: true, color: C.accent1, valign: "middle" });
      T(s, [{ text: t, options: { bold: true, fontSize: 14.5, breakLine: true } }, { text: d, options: { fontSize: 11.5, color: C.text2 } }], { x: MX + 0.25, y: y + 0.82, w: kw - 0.45, h: 0.75 });
    };
    kpi(1.6, "100%", "車損召回率", "24 組有索賠的照片，\n全部判為新車損");
    kpi(3.42, "3%", "誤報率", "120 組沒有索賠的照片中，\n被誤判的比例");
    T(s, "評估方式：同一套提示詞與多數決規則，每組判讀 3 次；搭配拍照時的角度審核與光線判斷。右側為實際判讀結果，車牌已遮蔽。", { x: MX, y: 5.2, w: kw, h: 1.45, fontSize: 11, color: C.text2 });

    const gx = MX + kw + 0.3, gw = W - MX - gx, cw = (gw - 0.25) / 2, chh = 2.42;
    const cards = [
      { photos: [["crash1_pickup.jpg", "取車", false], ["crash1_return.jpg", "還車", true]], tag: "車身左前・白天", verdict: [{ text: "新車損", c: "red" }], detail: "3 次判讀都判定新車損：保險桿破裂、大燈破損、葉子板凹陷", meta: "信心 0.98–0.99" },
      { photos: [["crash2_pickup.jpg", "取車", false], ["crash2_return.jpg", "還車", true]], tag: "車身左後・夜間", verdict: [{ text: "新車損", c: "red" }], detail: "3 次判讀都判定新車損：保險桿凹陷破裂、葉子板凹陷", meta: "信心 0.95–0.98" },
      { photos: [["tidy1_front.jpg", "前座", false], ["tidy1_rear.jpg", "後座", true]], tag: "還車車內・夜間", verdict: [{ text: "前座 " }, { text: "乾淨", c: "green", br: true }, { text: "後座 " }, { text: "髒汙", c: "red" }], detail: "後座座椅有碎屑、地墊有沙土，需要清潔", meta: "信心 0.95" },
      { photos: [["tidy2_front.jpg", "前座", true], ["tidy2_rear.jpg", "後座", false]], tag: "還車車內・白天", verdict: [{ text: "前座 " }, { text: "髒汙", c: "red", br: true }, { text: "後座 " }, { text: "乾淨", c: "green" }], detail: "儀表板與中控台有灰塵，腳踏墊有深色污漬", meta: "信心 0.95" },
    ];
    cards.forEach((cd, i) => {
      const x = gx + (i % 2) * (cw + 0.25), y = 1.6 + Math.floor(i / 2) * (chh + 0.25);
      box(s, x, y, cw, chh);
      const ph = chh - 0.3;
      let px = x + 0.15;
      for (const [f, lab, red] of cd.photos) px += evPhoto(s, f, px, y + 0.15, ph, lab, red) + 0.06;
      const tx = px + 0.1, tw = x + cw - tx - 0.15;
      T(s, cd.tag, { x: tx, y: y + 0.15, w: tw, h: 0.28, fontSize: 10.5, color: C.accent2 });
      const two = cd.verdict.length > 1, vh = two ? 0.62 : 0.42;
      T(s, cd.verdict.map((r) => ({ text: r.text, options: { breakLine: !!r.br, color: r.c === "red" ? C.accent1 : r.c === "green" ? C.accent5 : C.text1 } })), { x: tx, y: y + 0.45, w: tw, h: vh, fontSize: two ? 14 : 18, bold: true, valign: "middle" });
      T(s, cd.detail, { x: tx, y: y + 0.45 + vh + 0.1, w: tw, h: chh - 0.45 - vh - 0.1 - 0.45, fontSize: 11.5, color: C.text1 });
      T(s, cd.meta, { x: tx, y: y + chh - 0.42, w: tw, h: 0.26, fontSize: 10, color: C.accent2 });
    });
    s.addNotes("實測結果。用主辦方提供的 144 組取還車照片評估（24 組有索賠、120 組沒有），搭配拍照時的角度審核與光線判斷：有索賠的 24 組全部判為新車損，召回率 100%；沒有索賠的 120 組，誤報率 3%。右邊是實際判讀：白天左前、夜間左後的車損，三次判讀都一致；車內照片能分出乾淨與髒汙，並說出髒在哪裡。照片來自主辦方資料集，車牌已遮蔽。");
  }
  {
    const s = content("4. AI 應用方法", "4　AI 應用方法｜選用原因與迭代", "選用原因：照片不外流、不按次付費，越用越準");
    const reasons = [
      ["FaEye", "為什麼用視覺語言模型", "不必先標註大量資料就能上線；\n一個模型同時看車損、整潔、遺留物與卡片，並寫出白話理由"],
      ["FaLock", "為什麼選 Qwen 系列開源模型自架", "照片含車牌與車內影像，留在自己的環境；\n每天約 8.2 萬次判讀，不按次付費；可用 iRent 的資料微調"],
      ["FaMobileAlt", "為什麼畫質檢查放在手機", "上傳後才檢查，用戶已經離開；\n在手機上運算即時回饋，也不佔伺服器資源"],
      ["FaIdCard", "為什麼車牌辨識用 PaddleOCR", "開源、模型約 15 MB，在瀏覽器內每 0.5 秒執行；\n相機畫面不用上傳到伺服器"],
    ];
    const lw = 6.55;
    for (const [i, [ic, t, d]] of reasons.entries()) {
      const y = 1.62 + i * 1.18;
      await iconDot(s, ic, MX, y + 0.05, 0.58);
      T(s, [{ text: t, options: { bold: true, fontSize: 15, breakLine: true } }, { text: d, options: { fontSize: 12.5, color: C.text2 } }], { x: MX + 0.8, y, w: lw - 1.0, h: 1.08, paraSpaceAfter: 2 });
    }
    const rx = MX + lw + 0.4, rw = W - MX - rx;
    T(s, "資料飛輪：營運每次確認，都是訓練資料", { x: rx, y: 1.6, w: rw, h: 0.32, fontSize: 15, bold: true });
    const cx = rx + rw / 2, cy = 3.28, bw = 1.85, bh = 0.52;
    const nodes = [
      { t: "營運確認或駁回", x: cx - bw / 2, y: 2.08 },
      { t: "收集成資料集", x: rx + rw - bw, y: cy - bh / 2 },
      { t: "重新訓練模型", x: cx - bw / 2, y: 4.48 - bh },
      { t: "更新上線", x: rx, y: cy - bh / 2 },
    ];
    nodes.forEach((n) => {
      outline(s, n.x, n.y, bw, bh, { rectRadius: 0.08, line: { color: C.accent1, width: 1.25 } });
      T(s, n.t, { x: n.x, y: n.y, w: bw, h: bh, fontSize: 13, bold: true, align: "center", valign: "middle" });
    });
    arrow(s, cx + bw / 2 + 0.05, 2.08 + bh / 2, rx + rw - bw / 2, cy - bh / 2 - 0.06);
    arrow(s, rx + rw - bw / 2, cy + bh / 2 + 0.06, cx + bw / 2 + 0.05, 4.48 - bh / 2);
    arrow(s, cx - bw / 2 - 0.05, 4.48 - bh / 2, rx + bw / 2, cy + bh / 2 + 0.06);
    arrow(s, rx + bw / 2, cy - bh / 2 - 0.06, cx - bw / 2 - 0.05, 2.08 + bh / 2);
    T(s, "反覆迭代", { x: cx - 0.8, y: cy - 0.22, w: 1.6, h: 0.44, fontSize: 15, bold: true, color: C.accent1, align: "center", valign: "middle" });

    T(s, "演進路線", { x: rx, y: 4.72, w: rw, h: 0.3, fontSize: 13, bold: true });
    const road = [["A", "VLM 先行", "上線並累積\n照片與確認結果"], ["B", "累積標註", "以營運確認、\n駁回的案例當標籤"], ["C", "自訓小模型", "小模型先篩、\nVLM 複核，\n延遲與成本更低"]];
    const gw = (rw - 0.3) / 3;
    road.forEach(([k, t, d], i) => {
      const x = rx + i * (gw + 0.15);
      box(s, x, 5.08, gw, 1.35);
      T(s, [{ text: k + "｜" + t, options: { bold: true, fontSize: 13, color: C.accent1, breakLine: true } }, { text: d, options: { fontSize: 12, color: C.text2 } }], { x: x + 0.12, y: 5.18, w: gw - 0.24, h: 1.18, paraSpaceAfter: 3 });
    });
    s.addNotes("選用原因。VLM 不必先標註大量資料就能上線，一個模型同時處理車損、整潔、遺留物、卡片並寫出理由。自架 Qwen 系列開源模型：照片不外流、不按次付費（每天約 8.2 萬次判讀）、可用自己的資料微調。畫質檢查放手機是因為上傳後才檢查用戶已離開。車牌辨識用開源的 PaddleOCR，模型約 15 MB，在瀏覽器內每 0.5 秒執行，相機畫面不用上傳。營運每次確認或駁回都收集成資料集，重新訓練、更新上線，反覆迭代；長期由自訓小模型先篩、VLM 複核。");
  }

  // ============================================================ 5 differentiation
  pres.addSection({ title: "5. 獨特優勢與差異化" });
  {
    const s = content("5. 獨特優勢與差異化", "5　獨特優勢與差異化", "從事後存證變成即時處理，資料越用越準");
    const hd = (t, fill) => ({ text: t, options: { bold: true, color: HEX.white, fill: { color: fill } } });
    const rows = [
      ["拍照品質", "送出後才發現拍糊，常被要求重拍", "每 0.5 秒檢查畫質、車牌與角度，當場重拍"],
      ["拍攝角度", "每次自由拍，前後角度不同", "疊上上次照片，用車牌位置判斷站位與遠近"],
      ["還車順序", "鎖門後才要拍車內", "先拍車內再鎖門，計費停在按下還車"],
      ["檢查方式", "靠人工查看，看不完也看得晚", "AI 每筆都看，人只確認 AI 標記的部分"],
      ["責任歸屬", "事後翻照片，說不清是誰造成", "取車比上次、還車比取車，差異歸到對的人"],
      ["髒車處理", "下一位用戶取車才發現、客訴", "還車後自動排清潔、暫停出租"],
      ["用戶透明度", "看不到判定結果", "每次取還車都有確認單與營運確認狀態"],
    ];
    s.addTable([
      [hd("項目", HEX.ink), hd("現行做法", HEX.ink3), hd("iRent+", HEX.red)],
      ...rows.map(([a, b, c]) => [{ text: a, options: { bold: true, fill: { color: HEX.panel } } }, { text: b, options: { color: HEX.ink2 } }, { text: c, options: { bold: true } }]),
    ], { x: MX, y: 1.55, w: CW, colW: [1.75, 4.6, CW - 6.35], fontFace: FONT, fontSize: 13, color: HEX.ink, valign: "middle", border: { type: "solid", pt: 0.75, color: HEX.line }, margin: [3, 10, 3, 10], rowH: [0.38, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42] });
    const cards = [
      ["FaDatabase", "iRent 專屬的資料", "營運確認的結果就是訓練資料，\n用得越久越準"],
      ["FaLink", "每張照片都有比對基準", "取車比上次、還車比取車，\n爭議時有照片可查"],
      ["FaCameraRetro", "為 AI 設計的拍照流程", "疊影、車牌與角度檢查，\n讓前後照片比得起來"],
      ["FaSyncAlt", "從判讀到派工的閉環", "預警自動開工單、暫停出租，\n不需人工轉單"],
    ];
    const kw = (CW - 0.75) / 4, ky = 5.08, kh = 1.5;
    for (const [i, [ic, t, d]] of cards.entries()) {
      const x = MX + i * (kw + 0.25);
      box(s, x, ky, kw, kh);
      await iconDot(s, ic, x + 0.2, ky + 0.2, 0.5);
      T(s, t, { x: x + 0.8, y: ky + 0.2, w: kw - 0.95, h: 0.5, fontSize: 13.5, bold: true, valign: "middle" });
      T(s, d, { x: x + 0.2, y: ky + 0.82, w: kw - 0.4, h: 0.6, fontSize: 11.5, color: C.text2 });
    }
    T(s, "現行做法依主辦方提供的還車流程圖與 924 則顧客評論整理", { x: MX, y: 6.68, w: CW, h: 0.24, fontSize: 10, color: C.accent2 });
    s.addNotes("與現行做法比較：照片從事後存證，變成拍的當下把關、送出後立即比對、發現問題自動處理；還車不用鎖門後再開門拍車內；人從每筆都看，變成只確認 AI 標記的部分；用戶每次都有確認單。難以複製的地方：營運確認的結果是只有 iRent 能累積的訓練資料；每張照片都有比對基準；拍照流程是為 AI 設計的；從判讀到派工是閉環。");
  }

  // ============================================================ 6 benefits and rollout
  pres.addSection({ title: "6. 預期效益與落地評估" });
  {
    const s = content("6. 預期效益與落地評估", "6　預期效益與落地評估｜預期效益", "要每筆都檢查：人力從 10–20 人降到 1–2 人");
    const pw = (CW - 0.7) / 2, top = 1.6, ph = 2.35;
    box(s, MX, top, pw, ph);
    box(s, MX + pw + 0.7, top, pw, ph, { fill: { color: C.accent4 }, line: { color: C.accent4, width: 0 } });
    T(s, "›", { x: MX + pw + 0.15, y: top + ph / 2 - 0.35, w: 0.4, h: 0.6, fontSize: 36, bold: true, color: C.accent1, align: "center", valign: "middle" });
    const panel = (x, label, calc, result, red) => {
      T(s, label, { x: x + 0.35, y: top + 0.25, w: pw - 0.7, h: 0.32, fontSize: 14, bold: true, color: red ? C.accent1 : C.text2 });
      T(s, calc, { x: x + 0.35, y: top + 0.68, w: pw - 0.7, h: 0.75, fontSize: 16 });
      T(s, result, { x: x + 0.35, y: top + 1.45, w: pw - 0.7, h: 0.7, fontSize: 36, bold: true, color: red ? C.accent1 : C.text1, valign: "middle" });
    };
    panel(MX, "全靠人工", "4,820 筆 × 每筆 1–2 分鐘\n= 每天 80–160 工時", "≈ 10–20 人", false);
    panel(MX + pw + 0.7, "導入 iRent+", "4,820 筆 × AI 標記 10% = 482 筆\n× 每筆 1–2 分鐘 = 每天 8–16 工時", "≈ 1–2 人", true);
    T(s, [{ text: "檢視工時約減少 90%，", options: { bold: true, color: C.accent1 } }, { text: "人事成本每年約少 540–1,080 萬元（GPU 與導入成本見下頁）。", options: { bold: true } }], { x: MX, y: 4.05, w: CW, h: 0.36, fontSize: 16, valign: "middle" });
    T(s, "實測誤報率 3%，10% 標記率是保守估計；就算標記率 20%，也只需 2–4 人（964 筆 × 1–2 分鐘 = 16–32 工時）。", { x: MX, y: 4.42, w: CW, h: 0.3, fontSize: 13, color: C.text2, valign: "middle" });

    const kpis = [
      ["550–820 張／天", "不合格照片（約 2–3%）\n當場重拍，不必事後補拍"],
      ["自動暫停出租", "髒車、嚴重車損自動排清潔\n或檢修，不交給下一位"],
      ["車損可追償", "新車損對應到該筆租用，\n有同角度前後照片為證"],
      ["208 則", "對應占 22.5% 的車況評論：\n拍照、髒車、車損"],
    ];
    const kw = (CW - 0.75) / 4;
    kpis.forEach(([v, l], i) => {
      const x = MX + i * (kw + 0.25);
      outline(s, x, 4.9, kw, 1.4);
      T(s, v, { x: x + 0.2, y: 5.02, w: kw - 0.4, h: 0.5, fontSize: 20, bold: true, color: C.accent1, valign: "middle" });
      T(s, l, { x: x + 0.2, y: 5.57, w: kw - 0.4, h: 0.68, fontSize: 12.5, color: C.text2 });
    });
    T(s, "估算假設：每筆人工檢視 1–2 分鐘、每人每天 8 小時、AI 標記率 10%（試點時以實測校正）、每人每年人事成本 60 萬元；不合格比例依 1,200 張真實還車照片的校準結果", { x: MX, y: 6.45, w: CW, h: 0.4, fontSize: 10, color: C.accent2 });
    s.addNotes("預期效益。若每筆取還車都要人工看，一天 80–160 工時、約 10–20 人；導入後人只確認 AI 標記的部分，以 10% 估算是 482 筆、8–16 工時、約 1–2 人，工時減少約 90%，以每人每年 60 萬元估約少 540–1,080 萬元人事成本（GPU 與導入成本另計）。實測誤報率 3%，所以 10% 是保守估計；就算 20% 也只需 2–4 人。用戶端：每天約 550–820 張不合格照片當場重拍；髒車與嚴重車損自動暫停出租；新車損對應到該筆租用；直接對應 208 則與車況有關的評論。");
  }
  {
    const s = content("6. 預期效益與落地評估", "6　預期效益與落地評估｜落地評估", "分四階段導入：先驗證、再試點、後擴大");
    const phases = [
      ["第 1–2 個月", "擴大驗證", "主辦方 144 組已完成；\n再用更多歷史照片與索賠紀錄\n確認召回率與誤報率"],
      ["第 3–4 個月", "影子模式", "手機即時檢查先上線；\nAI 在背景判讀、與人工比對，\n不影響現有作業"],
      ["第 5–6 個月", "區域試點", "選 1–2 個區域開啟自動工單、\n暫停出租與確認單，\n追蹤工時與客訴"],
      ["第 7 個月起", "全面導入", "擴大到全車隊；\n每月以營運確認資料\n重新訓練模型"],
    ];
    const gw = 0.3, pw = (CW - gw * 3) / 4;
    phases.forEach(([when, t, d], i) => {
      const x = MX + i * (pw + gw);
      box(s, x, 1.6, pw, 2.0);
      chip(s, i + 1, x + 0.22, 1.8, 0.4);
      T(s, when, { x: x + 0.75, y: 1.8, w: pw - 0.9, h: 0.4, fontSize: 12.5, bold: true, color: C.accent1, valign: "middle" });
      T(s, t, { x: x + 0.22, y: 2.3, w: pw - 0.44, h: 0.4, fontSize: 17, bold: true });
      T(s, d, { x: x + 0.22, y: 2.75, w: pw - 0.44, h: 0.8, fontSize: 12.5, color: C.text2 });
      if (i < 3) T(s, "›", { x: x + pw - 0.02, y: 2.3, w: gw + 0.04, h: 0.5, fontSize: 24, bold: true, color: C.accent1, align: "center", valign: "middle" });
    });
    const lw = 6.75;
    T(s, "落地條件與資源需求", { x: MX, y: 3.9, w: lw, h: 0.32, fontSize: 15, bold: true });
    const L = (t) => ({ text: t, options: { bold: true, fill: { color: HEX.panel } } });
    s.addTable([
      [L("運算"), "GPU 伺服器自架 Qwen 系列模型；尖峰約每秒 1.8 次判讀。試點先用 1 台，實測吞吐量後再估全車隊台數與成本"],
      [L("系統"), "App 拍照頁加入疊影、畫質與車牌檢查（模型約 15 MB）；後台串接預警與工單資料表"],
      [L("人力"), "營運確認 1–2 人；導入期需 App、後台與模型工程人力，上線後併入既有團隊維運"],
      [L("資料"), "歷史照片與索賠紀錄供驗證；照片留在內部環境"],
    ], { x: MX, y: 4.3, w: lw, colW: [0.95, lw - 0.95], fontFace: FONT, fontSize: 13, color: HEX.ink, valign: "middle", border: { type: "solid", pt: 0.75, color: HEX.line }, margin: [4, 8, 4, 8], rowH: [0.62, 0.62, 0.62, 0.5] });
    const rx = MX + lw + 0.4, rw = W - MX - rx;
    T(s, "上線後追蹤的指標", { x: rx, y: 3.9, w: rw, h: 0.32, fontSize: 15, bold: true });
    T(s, bullets(["照片當場重拍率、事後被要求重拍次數", "AI 標記率（目標 10% 以下）", "新車損召回率、誤報率", "髒車客訴與車損爭議客服件數", "預警到工單完成的時間", "營運每日檢視工時"]), { x: rx, y: 4.32, w: rw, h: 2.3, fontSize: 13.5, paraSpaceAfter: 5 });
    T(s, "尖峰推論量：16 時 2,144 張 × 每張 3 次 ÷ 3,600 秒 ≈ 1.8 次／秒", { x: MX, y: 6.72, w: CW, h: 0.24, fontSize: 10, color: C.accent2 });
    s.addNotes("落地評估。四階段：第 1–2 個月擴大驗證（主辦方 144 組已完成，召回率 100%、誤報率 3%，再用更多歷史照片確認）；第 3–4 個月影子模式，手機即時檢查先上線、AI 在背景判讀與人工比對；第 5–6 個月區域試點，開啟自動工單、暫停出租與確認單；第 7 個月起全面導入，每月以營運確認資料重新訓練。資源：GPU 伺服器自架模型（尖峰約每秒 1.8 次判讀，試點先 1 台）、App 拍照頁（車牌模型約 15 MB）與後台串接、營運確認 1–2 人；導入期需要工程人力，上線後併入既有團隊維運。");
  }

  // ============================================================ 7 references
  pres.addSection({ title: "7. 補充資料" });
  {
    const s = content("7. 補充資料", "7　補充資料", "資料來源、程式碼與概念原型");
    const lw = 5.95;
    T(s, "資料來源", { x: MX, y: 1.6, w: lw, h: 0.3, fontSize: 14, bold: true });
    T(s, bullets([
      "主辦方照片上傳清單：2026/4/22，27,367 張、4,820 筆",
      "主辦方〈0921_iRent 解題資源 README〉與還車流程圖",
      "主辦方取還車照片 144 組（24 組有索賠）：評估與佐證圖片",
      "顧客評論 924 則：Google Play、App Store、PTT、Dcard",
      "旺得富理財網〈iRent共享車平台 用戶突破200萬大關〉，2026/2/6",
    ]), { x: MX, y: 1.98, w: lw, h: 2.2, fontSize: 12, paraSpaceAfter: 5 });
    T(s, "參考文獻與工具", { x: MX, y: 4.3, w: lw, h: 0.3, fontSize: 14, bold: true });
    T(s, bullets([
      "Pech-Pacheco, J. L. et al. (2000). Diatom autofocusing in brightfield microscopy: a comparative study. ICPR.（Laplacian 清晰度量測）",
      "Kwon, W. et al. (2023). Efficient Memory Management for Large Language Model Serving with PagedAttention. SOSP.（vLLM 推論框架）",
      "PaddleOCR PP-OCRv4（PaddlePaddle 開源 OCR，手機端車牌辨識）",
    ]), { x: MX, y: 4.66, w: lw, h: 1.4, fontSize: 11, paraSpaceAfter: 4 });

    const mx = MX + lw + 0.35, mw = 3.55;
    T(s, "GitHub 程式碼", { x: mx, y: 1.6, w: mw, h: 0.3, fontSize: 14, bold: true });
    T(s, "github.com/Allenwang2004/irent", { x: mx, y: 1.98, w: mw, h: 0.32, fontSize: 13, bold: true, color: C.accent1, hyperlink: { url: "https://github.com/Allenwang2004/irent" } });
    const code = [["README.md", "給評審：架構、功能與執行方式"], ["mobile/", "手機 App：取還車、拍照、即時檢查"], ["web/", "營運後台：預警、工單、車輛、評論"], ["worker/", "VLM 檢查服務"], ["eval/", "VLM 與車牌辨識的評估腳本"], ["supabase/", "資料表與自動工單"]];
    code.forEach(([d, t], i) => {
      T(s, [{ text: d, options: { bold: true, breakLine: true } }, { text: t, options: { color: C.text2, fontSize: 11.5 } }], { x: mx, y: 2.42 + i * 0.6, w: mw, h: 0.56, fontSize: 12.5 });
    });

    const px = mx + mw + 0.2, pwid = W - MX - px;
    T(s, "概念原型", { x: px, y: 1.6, w: pwid, h: 0.3, fontSize: 14, bold: true });
    const aw = pwid, ah = aw * 1560 / 2260;
    s.addImage({ path: path.join(IMG, "admin_crop.png"), altText: "營運後台預警頁示意", x: px, y: 2.0, w: aw, h: ah });
    s.addShape(SH.RECTANGLE, { x: px, y: 2.0, w: aw, h: ah, fill: { type: "none" }, line: { color: C.accent3, width: 1 } });
    T(s, "網頁模擬 App 與營運後台，\n實機操作見 3 分鐘說明影片", { x: px, y: 2.1 + ah, w: pwid, h: 0.6, fontSize: 11, color: C.text2 });
    box(s, MX, 6.15, CW, 0.6, { fill: { color: C.accent4 }, line: { color: C.accent4, width: 0 } });
    T(s, [{ text: "iRent+", options: { bold: true, color: C.accent1 } }, { text: "　利用 AI，打造全台最好的租車平台", options: { bold: true } }], { x: MX + 0.3, y: 6.15, w: CW - 0.6, h: 0.6, fontSize: 18, valign: "middle" });
    s.addNotes("補充資料：資料來源、GitHub 程式碼（github.com/Allenwang2004/irent，README 有給評審的說明）與概念原型。程式碼：mobile 手機 App、web 營運後台、worker VLM 檢查服務、eval 評估腳本、supabase 資料表與自動工單。");
  }

  await pres.writeFile({ fileName: OUT });
  await patchTheme(OUT);
  console.log("wrote", OUT);
}

// pptxgenjs writes Office's stock colours into the theme and leaves its East Asian font empty
// (Chinese text would fall back to 新細明體). Write THEME's colours and name, and point the
// East Asian font at the same font as the Latin text.
const SLOTS = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
async function patchTheme(file) {
  const JSZip = require(require.resolve("jszip", { paths: [require.resolve("pptxgenjs")] }));
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const part = "ppt/theme/theme1.xml";
  let xml = await zip.file(part).async("string");
  const scheme = `<a:clrScheme name="${THEME.name}">` + SLOTS.map((k) => `<a:${k}><a:srgbClr val="${THEME.colors[k]}"/></a:${k}>`).join("") + "</a:clrScheme>";
  xml = xml
    .replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme)
    .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, head) => `${head}${THEME.name}"`)
    .replace(/<a:ea typeface="[^"]*"\/>/g, `<a:ea typeface="${FONT}"/>`)
    .replace(/<a:font script="Hant" typeface="[^"]*"\/>/g, `<a:font script="Hant" typeface="${FONT}"/>`);
  zip.file(part, xml);
  // pptxgenjs 4 repeats <a:pPr> before every run of a multi-run paragraph; the schema allows
  // one, first. Keep the first and drop the repeats (they only say "no bullet").
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
    const src = await zip.file(name).async("string");
    const out = src.replace(/<a:p>([\s\S]*?)<\/a:p>/g, (m, body) => {
      let seen = false;
      const fixed = body.replace(/<a:pPr\b[^>]*\/>|<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/g, (pp, offset) => {
        if (!seen && offset === 0) { seen = true; return pp; }
        return "";
      });
      return "<a:p>" + fixed + "</a:p>";
    });
    zip.file(name, out);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});

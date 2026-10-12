// Live plate check, off the main thread so the viewfinder never waits for it.
// PP-OCRv4 text detection finds text boxes in the frame, recognition reads the
// plate-shaped ones, and the reading is matched against the rented car's plate.
// Pre- and post-processing follow PaddleOCR / RapidOCR, which eval/plate_eval.py
// measured on the hackathon photos (detection long side 640: 92% of photos with
// the whole plate in frame matched, no other car's plate ever matched).

import * as ort from "onnxruntime-web/wasm";
import { matchesPlate } from "@/lib/plate";

export type PlateRequest =
  | { type: "load"; base: string }
  | { type: "check"; frame: ImageBitmap; plate: string };

export type PlateResponse =
  | { type: "ready" }
  | { type: "failed"; reason: string }
  | { type: "result"; found: boolean; texts: string[]; detMs: number; recMs: number };

const DET_LONG_SIDE = 640;
const DET_THRESH = 0.3;
const BOX_THRESH = 0.5;
const UNCLIP_RATIO = 1.6;
const REC_HEIGHT = 48;
const REC_MIN_WIDTH = 320;
const REC_MAX_WIDTH = 640;
// Plates are wide; keep the few largest wide boxes for recognition.
const MIN_ASPECT = 1.5;
const MAX_ASPECT = 10;
const MAX_CANDIDATES = 4;

// Recognition output index -> character, for the letters, digits and dash a
// plate can contain (index 0 is the CTC blank). Taken from the model's own
// character list (ch_PP-OCRv4_rec_infer.onnx metadata); other characters are dropped.
const PLATE_CHARS: Record<number, string> = {
  25: "2", 26: "0", 27: "8", 28: "-", 29: "7", 93: "1", 94: "3", 425: "H", 631: "5", 632: "4", 933: "6",
  1033: "s", 1034: "u", 1109: "9", 1217: "S", 1218: "Y", 1219: "F", 1220: "D", 1221: "A", 1310: "P",
  1381: "T", 1958: "r", 2156: "q", 2697: "J", 2710: "l", 2993: "x", 3316: "z", 3332: "e", 3333: "t",
  3463: "b", 3506: "L", 3537: "w", 3538: "i", 3539: "h", 3587: "I", 3588: "B", 3589: "N", 3639: "M",
  4136: "Z", 4244: "C", 4245: "o", 4381: "E", 4389: "f", 4497: "U", 4544: "a", 4545: "p", 4546: "y",
  4547: "n", 4548: "g", 4731: "Q", 4741: "O", 4849: "k", 4902: "c", 4922: "v", 5033: "W", 5127: "R",
  5128: "G", 5171: "d", 5193: "K", 5200: "X", 5233: "m", 5405: "V", 5493: "j",
};

type Box = { cx: number; cy: number; w: number; h: number; angle: number };

let det: ort.InferenceSession | null = null;
let rec: ort.InferenceSession | null = null;

const post = (message: PlateResponse) => (self as unknown as Worker).postMessage(message);

self.onmessage = async (event: MessageEvent<PlateRequest>) => {
  const msg = event.data;
  if (msg.type === "load") {
    try {
      ort.env.wasm.numThreads = 1;
      const options: ort.InferenceSession.SessionOptions = { executionProviders: ["wasm"] };
      [det, rec] = await Promise.all([
        ort.InferenceSession.create(`${msg.base}/ch_PP-OCRv4_det_infer.onnx`, options),
        ort.InferenceSession.create(`${msg.base}/ch_PP-OCRv4_rec_infer.onnx`, options),
      ]);
      post({ type: "ready" });
    } catch (err) {
      post({ type: "failed", reason: err instanceof Error ? err.message : String(err) });
    }
    return;
  }
  const { frame, plate } = msg;
  try {
    if (!det || !rec) return;
    const t0 = performance.now();
    const boxes = await detect(det, frame);
    const t1 = performance.now();
    const texts = boxes.length ? await recognize(rec, frame, boxes) : [];
    const t2 = performance.now();
    post({ type: "result", found: matchesPlate(texts, plate), texts, detMs: t1 - t0, recMs: t2 - t1 });
  } finally {
    frame.close();
  }
};

// ---------------------------------------------------------------- detection

async function detect(session: ort.InferenceSession, frame: ImageBitmap): Promise<Box[]> {
  const scale = DET_LONG_SIDE / Math.max(frame.width, frame.height);
  const w = Math.max(32, Math.round((frame.width * scale) / 32) * 32);
  const h = Math.max(32, Math.round((frame.height * scale) / 32) * 32);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(frame, 0, 0, w, h);
  const input = toTensor(ctx.getImageData(0, 0, w, h), w, h, w);
  const out = await session.run({ [session.inputNames[0]]: input });
  const prob = out[session.outputNames[0]].data as Float32Array;

  const boxes = textBoxes(prob, w, h)
    .map((b) => ({ ...b, cx: (b.cx * frame.width) / w, cy: (b.cy * frame.height) / h, w: (b.w * frame.width) / w, h: (b.h * frame.height) / h }))
    .filter((b) => {
      const aspect = Math.max(b.w, b.h) / Math.min(b.w, b.h);
      return aspect >= MIN_ASPECT && aspect <= MAX_ASPECT;
    })
    .sort((a, b) => b.w * b.h - a.w * a.h);
  return boxes.slice(0, MAX_CANDIDATES);
}

// DB post-processing: threshold the probability map, dilate, take connected
// regions, keep confident ones, and grow each region's minimum-area rectangle.
function textBoxes(prob: Float32Array, w: number, h: number): Box[] {
  const n = w * h;
  const bin = new Uint8Array(n);
  for (let i = 0; i < n; i++) bin[i] = prob[i] > DET_THRESH ? 1 : 0;
  // 2 x 2 dilation, as PaddleOCR does.
  const dil = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      dil[i] = bin[i] | (x > 0 ? bin[i - 1] : 0) | (y > 0 ? bin[i - w] : 0) | (x > 0 && y > 0 ? bin[i - w - 1] : 0);
    }
  }

  const label = new Int32Array(n);
  const boxes: Box[] = [];
  const stack: number[] = [];
  let next = 0;
  for (let start = 0; start < n; start++) {
    if (!dil[start] || label[start]) continue;
    next += 1;
    label[start] = next;
    stack.push(start);
    const points: number[] = [];
    let score = 0;
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % w;
      const y = (i - x) / w;
      points.push(x, y);
      score += prob[i];
      const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of neighbours) {
        if (j >= 0 && dil[j] && !label[j]) {
          label[j] = next;
          stack.push(j);
        }
      }
    }
    const count = points.length / 2;
    if (count < 10 || score / count < BOX_THRESH) continue;
    const rect = minAreaRect(points);
    if (Math.min(rect.w, rect.h) < 3) continue;
    const d = (rect.w * rect.h * UNCLIP_RATIO) / (2 * (rect.w + rect.h));
    const grown = { ...rect, w: rect.w + 2 * d, h: rect.h + 2 * d };
    if (Math.min(grown.w, grown.h) < 5) continue;
    boxes.push(grown);
  }
  return boxes;
}

// Smallest rotated rectangle around a set of points (convex hull, then one
// candidate orientation per hull edge).
function minAreaRect(flat: number[]): Box {
  const pts: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
  const hull = convexHull(pts);
  let best: Box = { cx: hull[0][0], cy: hull[0][1], w: 1, h: 1, angle: 0 };
  let bestArea = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i];
    const [x2, y2] = hull[(i + 1) % hull.length];
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [x, y] of hull) {
      const u = x * c + y * s;
      const v = -x * s + y * c;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    // Pixels are cells: include the last row and column.
    const w = maxU - minU + 1;
    const h = maxV - minV + 1;
    if (w * h < bestArea) {
      bestArea = w * h;
      const u = (minU + maxU) / 2;
      const v = (minV + maxV) / 2;
      best = { cx: u * c - v * s + 0.5, cy: u * s + v * c + 0.5, w, h, angle };
    }
  }
  return best;
}

function convexHull(points: [number, number][]) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// ---------------------------------------------------------------- recognition

async function recognize(session: ort.InferenceSession, frame: ImageBitmap, boxes: Box[]) {
  // Lay each box flat (long side horizontal, text upright) at the model's height.
  const crops = boxes.map((b) => {
    let { w, h, angle } = b;
    if (h > w) {
      [w, h] = [h, w];
      angle += Math.PI / 2;
    }
    while (angle > Math.PI / 2) angle -= Math.PI;
    while (angle <= -Math.PI / 2) angle += Math.PI;
    const scale = REC_HEIGHT / h;
    const width = Math.min(REC_MAX_WIDTH, Math.max(1, Math.ceil(w * scale)));
    const canvas = new OffscreenCanvas(width, REC_HEIGHT);
    const ctx = canvas.getContext("2d")!;
    ctx.translate(width / 2, REC_HEIGHT / 2);
    ctx.rotate(-angle);
    ctx.scale(scale, scale);
    ctx.translate(-b.cx, -b.cy);
    ctx.drawImage(frame, 0, 0);
    return { data: ctx.getImageData(0, 0, width, REC_HEIGHT), width };
  });

  const inputWidth = Math.max(REC_MIN_WIDTH, ...crops.map((c) => c.width));
  const batch = new Float32Array(crops.length * 3 * REC_HEIGHT * inputWidth);
  crops.forEach((c, k) => {
    batch.set(toTensor(c.data, c.width, REC_HEIGHT, inputWidth).data as Float32Array, k * 3 * REC_HEIGHT * inputWidth);
  });
  const input = new ort.Tensor("float32", batch, [crops.length, 3, REC_HEIGHT, inputWidth]);
  const out = (await session.run({ [session.inputNames[0]]: input }))[session.outputNames[0]];
  const [, steps, classes] = out.dims;
  const probs = out.data as Float32Array;

  return crops.map((_, k) => {
    let text = "";
    let last = -1;
    for (let t = 0; t < steps; t++) {
      const offset = (k * steps + t) * classes;
      let best = 0;
      for (let c = 1; c < classes; c++) if (probs[offset + c] > probs[offset + best]) best = c;
      if (best !== last && best !== 0) text += PLATE_CHARS[best] ?? "";
      last = best;
    }
    return text;
  });
}

// RGBA pixels -> BGR planes scaled to [-1, 1], zero-padded on the right to padWidth.
function toTensor(image: ImageData, width: number, height: number, padWidth: number) {
  const plane = height * padWidth;
  const data = new Float32Array(3 * plane);
  const px = image.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const j = y * padWidth + x;
      data[j] = px[i + 2] / 127.5 - 1;
      data[plane + j] = px[i + 1] / 127.5 - 1;
      data[2 * plane + j] = px[i] / 127.5 - 1;
    }
  }
  return new ort.Tensor("float32", data, [1, 3, height, padWidth]);
}

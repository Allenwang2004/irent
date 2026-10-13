// Renders the mock screens used in the solution deck (deck/src/img/) from the same
// components as the video, so the deck and the video show the same screens.
//   cd video/remotion && node deckshots/render.mjs ../../deck/src/img
// Then crop admin.png to admin_crop.png: x 260–2520, y 316–1876 (the page under the address bar).
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] || path.join(root, "../../deck/src/img"));
const ids = ["pickup", "camera-ok", "camera-fail", "receipt-return", "receipt-pickup", "vehicles", "history", "admin"];
// Optional: point at a local Chrome/Chromium; otherwise Remotion downloads its own.
const browserExecutable = process.env.REMOTION_BROWSER || null;
const serveUrl = await bundle({ entryPoint: path.join(root, "deckshots/index.tsx"), publicDir: path.join(root, "public") });
for (const id of ids) {
  const comp = await selectComposition({ serveUrl, id, browserExecutable });
  await renderStill({ composition: comp, serveUrl, frame: 150, output: path.join(out, `${id}.png`), browserExecutable, scale: 2, imageFormat: "png" });
  console.log("ok", id);
}

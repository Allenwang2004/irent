// Speed the rendered video up so it fits the 3-minute limit.
//
//   node fit-3min.mjs ../out/irent-plus_full.mp4            # -> ../out/irent-plus_full_3min.mp4
//   node fit-3min.mjs ../out/irent-plus_full.mp4 --to 178   # another target length (seconds)
//   node fit-3min.mjs ../out/irent-plus_full.mp4 --speed 1.1
//
// Picture and sound get faster together; the voice keeps its pitch (atempo).
// The picture is not re-encoded: every frame is kept and shown a little sooner,
// so the file plays at about 33 fps instead of 30. Uses the ffmpeg that comes
// with Remotion (npx remotion ffmpeg), so nothing else needs installing.
import { execFileSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--") && !/^\d/.test(a));
if (!input) {
  console.error("用法：node fit-3min.mjs ../out/irent-plus_full.mp4 [--to 179.5] [--speed 1.1]");
  process.exit(1);
}
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : undefined;
};

const run = (tool, a) => execFileSync("npx", ["remotion", tool, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const duration = Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input]).trim());
const target = opt("--to") ?? 179.5;
const speed = opt("--speed") ?? duration / target;
if (!(speed > 1.0001)) {
  console.log(`影片 ${duration.toFixed(1)} 秒，已經在 ${target} 秒以內，不用加速。`);
  process.exit(0);
}
const out = path.join(path.dirname(input), path.basename(input, path.extname(input)) + "_3min.mp4");
console.log(`影片 ${duration.toFixed(1)} 秒 → 加速 ${speed.toFixed(3)} 倍 → ${(duration / speed).toFixed(1)} 秒`);
if (speed > 1.15) console.log("注意：超過 1.15 倍，旁白會聽起來偏快。");
run("ffmpeg", [
  "-v", "error", "-y",
  "-itsscale", String(1 / speed), "-i", input,
  "-i", input,
  "-map", "0:v", "-map", "1:a",
  "-c:v", "copy",
  "-af", `atempo=${speed}`,
  "-c:a", "aac", "-b:a", "320k",
  "-movflags", "+faststart",
  out,
]);
console.log(`完成：${out}`);

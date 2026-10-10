import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { SUBTITLES } from "../timeline";
import { C, FONT, FPS } from "../theme";

// Break a long line into two at the punctuation mark nearest the middle,
// so words are never split across lines.
const wrap = (text: string, max: number) => {
  if (text.length <= max) return text;
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length - 1; i++) {
    if ("，、；：。".includes(text[i]) && (best < 0 || Math.abs(i + 1 - mid) < Math.abs(best - mid))) best = i + 1;
  }
  return best > 0 ? `${text.slice(0, best)}\n${text.slice(best)}` : text;
};

// Burned-in subtitles that follow the narration line by line.
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const block = SUBTITLES.find((b) => t >= b.from && t < b.to);
  if (!block) return null;
  const raw = block.parts
    .filter((p) => t >= p.at)
    .map((p) => p.text)
    .join("");
  const text = wrap(raw, block.side === "right" ? 26 : 44);
  const fade = Math.min(
    interpolate(t, [block.from, block.from + 0.12], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(t, [block.to - 0.12, block.to], [1, 0], { extrapolateLeft: "clamp" }),
  );
  return (
    <div
      style={{
        position: "absolute",
        left: block.side === "right" ? 780 : 0,
        right: block.side === "right" ? 60 : 0,
        bottom: 52,
        display: "flex",
        justifyContent: "center",
        opacity: fade,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: block.side === "right" ? 35 : raw.length > 38 ? 36 : 38,
          fontWeight: 500,
          color: "#fff",
          background: "rgba(20,20,20,0.84)",
          padding: "12px 30px",
          borderRadius: 12,
          letterSpacing: 1,
          maxWidth: 1780,
          textAlign: "center",
          lineHeight: 1.4,
          whiteSpace: "pre-line",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const SUB_SAFE = 150; // keep content above this many px from the bottom
export const subtitleColor = C.ink;

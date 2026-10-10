import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Viewfinder } from "../components/Viewfinder";
import { COVER } from "../copy";
import { S0_LEN } from "../timeline";
import { C, f, FONT } from "../theme";

// White background, red "iRent+". The red viewfinder corners close in on the
// word (shutter), then shrink into the "+" (ding).
const BRAND_SIZE = 230;
const ROW_CENTER_Y = 470;
const PLUS = 124; // size of the drawn plus sign
// Approximate width of "iRent" in Noto Sans TC Black at BRAND_SIZE (2.6 em with
// the tighter letter spacing) plus the gap and the plus sign.
const TEXT_W = BRAND_SIZE * 2.6;
const GAP = 22;
const ROW_W = TEXT_W + GAP + PLUS;
const ROW_X = 960 - ROW_W / 2;
const PLUS_CX = ROW_X + TEXT_W + GAP + PLUS / 2;
const PLUS_CY = ROW_CENTER_Y + 26;

export const S0Cover: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Corners close in on the word.
  const lock = spring({ frame, fps, config: { damping: 15, stiffness: 110 }, durationInFrames: 26 });
  const pulse = interpolate(frame, [26, 30, 36], [1, 1.035, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // 2. Corners shrink into the plus.
  const shrink = interpolate(frame, [48, 64], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const big = { x: ROW_X - 70, y: ROW_CENTER_Y - 175, w: ROW_W + 140, h: 350 };
  const small = { x: PLUS_CX - PLUS / 2, y: PLUS_CY - PLUS / 2, w: PLUS, h: PLUS };
  const box = {
    x: big.x + (small.x - big.x) * shrink,
    y: big.y + (small.y - big.y) * shrink,
    w: big.w + (small.w - big.w) * shrink,
    h: big.h + (small.h - big.h) * shrink,
  };
  const cornerFade = interpolate(frame, [52, 62], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const plusIn = spring({ frame: frame - 60, fps, config: { damping: 11, stiffness: 160 } });
  const brandIn = interpolate(frame, [16, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagIn = interpolate(frame, [74, 92], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [f(S0_LEN) - 12, f(S0_LEN)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: exit }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${pulse})` }}>
        <Viewfinder {...box} progress={lock} thickness={10} arm={shrink > 0.5 ? 40 : 70} spread={420} opacity={cornerFade} />
      </div>
      <div
        style={{
          position: "absolute",
          left: ROW_X,
          top: ROW_CENTER_Y - BRAND_SIZE * 0.62,
          width: TEXT_W,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: BRAND_SIZE,
          lineHeight: 1.2,
          letterSpacing: -5,
          color: C.red,
          opacity: brandIn,
          transform: `scale(${0.94 + 0.06 * brandIn}) scale(${pulse})`,
          transformOrigin: "center",
          whiteSpace: "nowrap",
        }}
      >
        {COVER.brand}
      </div>
      {/* the plus sign */}
      <div
        style={{
          position: "absolute",
          left: PLUS_CX - PLUS / 2,
          top: PLUS_CY - PLUS / 2,
          width: PLUS,
          height: PLUS,
          transform: `scale(${plusIn}) rotate(${(1 - plusIn) * 90}deg)`,
        }}
      >
        <div style={{ position: "absolute", left: 0, top: PLUS / 2 - 15, width: PLUS, height: 30, borderRadius: 6, background: C.red }} />
        <div style={{ position: "absolute", top: 0, left: PLUS / 2 - 15, height: PLUS, width: 30, borderRadius: 6, background: C.red }} />
      </div>
      <div
        style={{
          position: "absolute",
          top: ROW_CENTER_Y + 170,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 56,
          letterSpacing: 10,
          color: C.ink2,
          opacity: tagIn,
          transform: `translateY(${(1 - tagIn) * 16}px)`,
        }}
      >
        {COVER.tagline}
      </div>
      <Sequence from={24} durationInFrames={20}>
        <Audio src={staticFile("sfx/shutter.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={62} durationInFrames={45}>
        <Audio src={staticFile("sfx/ding.wav")} volume={0.8} />
      </Sequence>
    </AbsoluteFill>
  );
};

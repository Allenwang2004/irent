import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { CarPhoto } from "../components/CarArt";
import { clamp, easeInOut, Narration, ramp, sceneOpacity, Sfx, useSpringAt, useT } from "../components/Common";
import { S3 } from "../copy";
import { S3_CUES, S3_LEN } from "../timeline";
import { C, FONT } from "../theme";

// The photo passes three checkpoints; nobody checks it at any of them.
const GATE_X = [190, 740, 1290];
const GATE_W = 440;
const GATE_Y = 410;
const TRACK_Y = 236;

const Cross: React.FC<{ k: number }> = ({ k }) => (
  <div
    style={{
      position: "absolute",
      right: -22,
      top: -22,
      width: 64,
      height: 64,
      borderRadius: 32,
      background: C.red,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: `scale(${k})`,
      boxShadow: "0 8px 20px rgba(215,0,15,0.35)",
    }}
  >
    <svg width={30} height={30} viewBox="0 0 24 24">
      <path d="M5 5 L19 19 M19 5 L5 19" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
    </svg>
  </div>
);

export const S3Cause: React.FC = () => {
  const t = useT();
  const c = S3_CUES;
  const gateAt = [c.s3_1.at + 0.1, c.s3_1.into(1.9), c.s3_2.at];
  const archiveAt = c.s3_2.end - 0.1;

  const titleK = ramp(t, 0.05, 0.5);
  const verdict = 0;
  const crosses = [useSpringAt(gateAt[0] + 0.5), useSpringAt(gateAt[1] + 0.5), useSpringAt(gateAt[2] + 0.5)];

  // photo token travels along the track from gate to gate, then into the archive
  const stops = [80, ...GATE_X.map((x) => x + GATE_W / 2 - 60), 1700];
  const times = [0.3, gateAt[0], gateAt[1], gateAt[2], archiveAt];
  let tokenX = stops[0];
  for (let i = 1; i < stops.length; i++) {
    const m = interpolate(t, [times[i] - 0.1, times[i] + 0.5], [0, 1], { ...clamp, easing: easeInOut });
    tokenX = tokenX + (stops[i] - tokenX) * m;
  }
  const tokenK = ramp(t, 0.2, 0.4);
  const intoArchive = ramp(t, archiveAt + 0.1, 0.4);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S3_LEN) }}>
      <div style={{ position: "absolute", top: 96, width: "100%", textAlign: "center", fontFamily: FONT, fontSize: 70, fontWeight: 900, color: C.ink, opacity: titleK * (1 - verdict), transform: `translateY(${(1 - titleK) * 16}px)` }}>
        {S3.titleA}
        <span style={{ color: C.red }}>{S3.titleB}</span>
      </div>

      {/* track */}
      <div style={{ position: "absolute", left: 120, top: TRACK_Y + 40, width: 1680 * ramp(t, 0.15, 0.8), height: 4, background: C.line, opacity: 1 - verdict }} />
      {/* archive box at the end */}
      <div style={{ position: "absolute", left: 1690, top: TRACK_Y - 6, width: 130, height: 96, opacity: ramp(t, 0.3, 0.4) * (1 - verdict) }}>
        <svg width={130} height={96} viewBox="0 0 130 96">
          <path d="M6 22 h44 l10 10 h64 v58 h-118 Z" fill={C.panel} stroke={C.ink3} strokeWidth={4} strokeLinejoin="round" />
        </svg>
        <div style={{ position: "absolute", top: 100, width: 130, textAlign: "center", fontFamily: FONT, fontSize: 24, color: C.ink3 }}>存檔</div>
      </div>
      {/* the photo */}
      <div
        style={{
          position: "absolute",
          left: tokenX,
          top: TRACK_Y - 10 + intoArchive * 26,
          width: 120,
          height: 100,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 10px 26px rgba(0,0,0,0.2)",
          border: "4px solid #fff",
          opacity: tokenK * (1 - intoArchive),
          transform: `scale(${1 - intoArchive * 0.5}) rotate(${-4 + intoArchive * 10}deg)`,
        }}
      >
        <CarPhoto width={120} height={100} />
      </div>

      {/* checkpoints */}
      {S3.gates.map((g, i) => {
        const k = ramp(t, gateAt[i] - 0.1, 0.45);
        return (
          <div
            key={g.when}
            style={{
              position: "absolute",
              left: GATE_X[i],
              top: GATE_Y,
              width: GATE_W,
              height: 300,
              background: C.panel,
              borderRadius: 26,
              padding: "40px 40px",
              boxSizing: "border-box",
              fontFamily: FONT,
              opacity: k * (1 - verdict),
              transform: `translateY(${(1 - k) * 40}px)`,
            }}
          >
            <Cross k={crosses[i]} />
            <div style={{ fontSize: 32, fontWeight: 700, color: C.red }}>{g.when}</div>
            <div style={{ fontSize: 60, fontWeight: 900, color: C.ink, marginTop: 18 }}>{g.what}</div>
            <div style={{ fontSize: 30, color: C.ink2, marginTop: 16, lineHeight: 1.45 }}>{g.detail}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: GATE_X[0], top: GATE_Y + 330, width: 1540, fontFamily: FONT, fontSize: 26, color: C.ink3, opacity: ramp(t, gateAt[0] + 1.2, 0.4) * (1 - verdict) }}>
        {S3.evidence}
      </div>

      <Narration cues={c} />
      {gateAt.map((a, i) => (
        <Sfx key={i} at={a + 0.5} name="pop" volume={0.5} />
      ))}
    </AbsoluteFill>
  );
};

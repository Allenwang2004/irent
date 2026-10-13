import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ramp } from "../components/Common";
import { Block, Op, Person } from "../components/Calc";
import { Viewfinder } from "../components/Viewfinder";
import { S1 } from "../copy";
import { S1_CUES, S1_LEN } from "../timeline";
import { C, f, FONT, FPS } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.out(Easing.cubic);

// ---------------------------------------------------------------- background photo pile
const THUMBS = 42;
// Deterministic pseudo-random layout.
const rand = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const COLS = 8;
const tiles = Array.from({ length: THUMBS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return {
    i,
    x: col * 250 - 40 + rand(i) * 60,
    y: row * 200 - 30 + rand(i + 99) * 50,
    rot: (rand(i + 7) - 0.5) * 12,
    order: rand(i + 31),
  };
});

const PhotoPile: React.FC<{ t: number; fadeOut: number }> = ({ t, fadeOut }) => (
  <AbsoluteFill style={{ opacity: fadeOut }}>
    {tiles.map((tile) => {
      const appear = 0.2 + tile.order * 3.8;
      const k = interpolate(t, [appear, appear + 0.35], [0, 1], { ...clamp, easing: ease });
      return (
        <Img
          key={tile.i}
          src={staticFile(`private/thumbs/t${String(tile.i).padStart(2, "0")}.jpg`)}
          style={{
            position: "absolute",
            left: tile.x,
            top: tile.y,
            width: 230,
            height: 172,
            objectFit: "cover",
            borderRadius: 10,
            opacity: 0.55 * k,
            transform: `rotate(${tile.rot}deg) scale(${0.85 + 0.15 * k})`,
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
          }}
        />
      );
    })}
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 52% 46% at 50% 50%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.93) 45%, rgba(255,255,255,0.45) 100%)",
      }}
    />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- split panels
// Operations: the people needed. Renters: a phone with a complaint.
const TeamIcon: React.FC = () => (
  <svg width={150} height={130} viewBox="0 0 150 130">
    {[
      { x: 34, c: C.mute, s: 0.82 },
      { x: 116, c: C.mute, s: 0.82 },
      { x: 75, c: C.ink, s: 1 },
    ].map(({ x, c, s }) => (
      <g key={x} transform={`translate(${x} ${s === 1 ? 14 : 26}) scale(${s})`}>
        <circle cx={0} cy={22} r={19} fill={c} stroke="#F5F5F5" strokeWidth={4} />
        <path d="M-36 112 v-26 a36 32 0 0 1 72 0 v26 Z" fill={c} stroke="#F5F5F5" strokeWidth={4} />
      </g>
    ))}
  </svg>
);
const PhoneIcon: React.FC = () => (
  <svg width={150} height={130} viewBox="0 0 150 130">
    <rect x={34} y={8} width={66} height={116} rx={13} fill="#fff" stroke={C.ink} strokeWidth={5} />
    <rect x={56} y={18} width={22} height={5} rx={2.5} fill={C.ink} />
    <rect x={46} y={40} width={42} height={6} rx={3} fill={C.mute} />
    <rect x={46} y={54} width={34} height={6} rx={3} fill={C.mute} />
    <rect x={46} y={68} width={38} height={6} rx={3} fill={C.mute} />
    {/* complaint badge */}
    <circle cx={108} cy={34} r={24} fill={C.red} stroke="#F5F5F5" strokeWidth={5} />
    <rect x={105} y={21} width={6} height={17} rx={3} fill="#fff" />
    <circle cx={108} cy={45} r={3.5} fill="#fff" />
  </svg>
);
const Panel: React.FC<{ x: number; k: number; tag: string; big: string; sub: string; icon: React.ReactNode }> = ({ x, k, tag, big, sub, icon }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 250,
      width: 780,
      height: 470,
      background: C.panel,
      borderRadius: 30,
      padding: "56px 60px",
      boxSizing: "border-box",
      fontFamily: FONT,
      opacity: k,
      transform: `translateY(${(1 - k) * 60}px)`,
    }}
  >
    <div style={{ position: "absolute", right: 48, top: 44 }}>{icon}</div>
    <div style={{ fontSize: 36, fontWeight: 700, color: C.red, letterSpacing: 4 }}>{tag}</div>
    <div style={{ fontSize: 108, fontWeight: 900, color: C.ink, marginTop: 70, lineHeight: 1.1 }}>{big}</div>
    <div style={{ fontSize: 36, fontWeight: 500, color: C.ink2, marginTop: 28, lineHeight: 1.45 }}>{sub}</div>
  </div>
);

// ---------------------------------------------------------------- scene
export const S1Problems: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / FPS;
  const c = S1_CUES;

  // "根據主辦方的資料集推估，iRent 一天約收到 2.7 萬張車況照片": the big counter stays
  // "這些照片來自約 4,800 筆取還車，如果全靠人工看，每筆 1 到 2 分鐘，就需要 10 到 20 人"
  const phaseC = c.s1_3.at - 0.2; // manpower estimate
  const phaseD = c.s1_4.at - 0.45; // estimate fades, ops / user panels come in

  const enter = interpolate(t, [0, 0.35], [0, 1], clamp);
  const counterValue = Math.round(interpolate(t, [0.1, 1.35], [0, S1.total], { ...clamp, easing: Easing.out(Easing.quad) }));
  const bigOut = interpolate(t, [phaseC - 0.1, phaseC + 0.3], [1, 0], { ...clamp, easing: ease });
  const sourceOut = interpolate(t, [phaseC, phaseC + 0.4], [1, 0], clamp);
  const labelIn = interpolate(t, [c.s1_1.into(2.0), c.s1_1.into(2.4)], [0, 1], { ...clamp, easing: ease });
  const lockBig = spring({ frame: frame - f(1.35), fps, config: { damping: 14, stiffness: 120 } });
  const calcIn = interpolate(t, [phaseC + 0.1, phaseC + 0.5], [0, 1], { ...clamp, easing: ease });
  const calcOut = interpolate(t, [phaseD, phaseD + 0.35], [1, 0], clamp);
  const b = [ramp(t, c.s1_3.into(1.0)), ramp(t, c.s1_3.into(4.4)), ramp(t, c.s1_3.into(5.3)), ramp(t, c.s1_3.into(6.3))];
  const peopleAt = c.s1_3.into(6.4);
  const leftIn = spring({ frame: frame - f(phaseD + 0.35), fps, config: { damping: 16, stiffness: 110 } });
  const rightIn = spring({ frame: frame - f(c.s1_4.at + 0.2), fps, config: { damping: 16, stiffness: 110 } });
  const sceneOut = interpolate(t, [S1_LEN - 0.35, S1_LEN], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: Math.min(enter, sceneOut) }}>
      {t < phaseC + 0.5 && <PhotoPile t={t} fadeOut={bigOut} />}

      {/* big centred counter */}
      {bigOut > 0 && (
        <AbsoluteFill style={{ opacity: bigOut, transform: `scale(${0.9 + 0.1 * bigOut})` }}>
          <div style={{ position: "absolute", top: 268, width: "100%", textAlign: "center", fontFamily: FONT, fontSize: 40, fontWeight: 500, color: C.ink2 }}>
            {S1.date}
          </div>
          <div
            style={{
              position: "absolute",
              top: 320,
              width: "100%",
              textAlign: "center",
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 270,
              lineHeight: 1.15,
              color: C.ink,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -4,
            }}
          >
            {counterValue.toLocaleString("en-US")}
            <span style={{ fontSize: 110, color: C.red, marginLeft: 18, letterSpacing: 0 }}>{S1.unit}</span>
          </div>
          <Viewfinder x={430} y={330} w={1060} h={300} progress={lockBig} thickness={8} arm={54} spread={120} />
          <div
            style={{
              position: "absolute",
              top: 690,
              width: "100%",
              textAlign: "center",
              fontFamily: FONT,
              fontSize: 54,
              fontWeight: 700,
              color: C.ink,
              opacity: labelIn,
              transform: `translateY(${(1 - labelIn) * 14}px)`,
            }}
          >
            {S1.label}
          </div>
        </AbsoluteFill>
      )}

      {/* source line */}
      {t < phaseC + 0.4 && (
        <div
          style={{
            position: "absolute",
            right: 60,
            top: 40,
            fontFamily: FONT,
            fontSize: 22,
            color: C.ink2,
            background: "rgba(255,255,255,0.9)",
            padding: "4px 12px",
            borderRadius: 8,
            opacity: Math.min(enter, sourceOut),
          }}
        >
          {S1.source}
        </div>
      )}

      {/* manpower estimate */}
      {t >= phaseC && calcOut > 0 && (
        <AbsoluteFill style={{ opacity: Math.min(calcIn, calcOut), fontFamily: FONT }}>
          <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center", fontSize: 54, fontWeight: 900, color: C.ink }}>{S1.calcTitle}</div>
          <div style={{ position: "absolute", top: 270, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Block n={S1.orders} unit={S1.ordersUnit} k={b[0]} size={100} />
            <Op s="×" k={b[1]} size={68} />
            <Block n={S1.secs} unit={S1.secsUnit} k={b[1]} size={100} />
            <Op s="=" k={b[2]} size={68} />
            <Block n={S1.hours} unit={S1.hoursUnit} k={b[2]} size={100} />
            <Op s="≈" k={b[3]} size={68} />
            <Block n={S1.people} unit={S1.peopleUnit} k={b[3]} size={100} red />
          </div>
          <div style={{ position: "absolute", top: 560, width: "100%", display: "flex", justifyContent: "center", gap: 14 }}>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} style={{ opacity: ramp(t, peopleAt + i * 0.03, 0.3) }}>
                <Person color={i < 10 ? C.ink2 : "#BDBDBD"} size={52} />
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", top: 700, width: "100%", textAlign: "center", fontSize: 24, color: C.ink3, opacity: ramp(t, c.s1_3.into(4.4), 0.4) }}>{S1.assumption}</div>
        </AbsoluteFill>
      )}

      {/* ops / user panels */}
      {t >= phaseD + 0.3 && (
        <>
          <Panel x={140} k={leftIn} tag={S1.opsTag} big={S1.opsBig} sub={S1.opsSub} icon={<TeamIcon />} />
          <Panel x={1000} k={rightIn} tag={S1.userTag} big={S1.userBig} sub={S1.userSub} icon={<PhoneIcon />} />
        </>
      )}

      {/* narration */}
      {Object.values(c).map((cue) => (
        <Sequence key={cue.key} from={f(cue.at)} durationInFrames={f(cue.end - cue.at) + 6}>
          <Audio src={staticFile(`audio/${cue.key}.wav`)} />
        </Sequence>
      ))}
      <Sequence from={f(phaseD)} durationInFrames={f(0.6)}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={f(c.s1_3.into(6.3))} durationInFrames={f(0.3)}>
        <Audio src={staticFile("sfx/pop.wav")} volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
};

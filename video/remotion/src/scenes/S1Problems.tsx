import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ramp } from "../components/Common";
import { Block, Op, Person } from "../components/Calc";
import { Viewfinder } from "../components/Viewfinder";
import { HOURLY, S1 } from "../copy";
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

// ---------------------------------------------------------------- 24-hour chart
const CH = { left: 220, right: 1700, base: 830, maxH: 420 };
const SLOT = (CH.right - CH.left) / 24;
const BAR_W = 40;
const MAX = Math.max(...HOURLY);
const barX = (h: number) => CH.left + h * SLOT + (SLOT - BAR_W) / 2;
const barH = (v: number) => (v / MAX) * CH.maxH;

const HourChart: React.FC<{ t: number; start: number; peakAt: number }> = ({ t, start, peakAt }) => {
  const peak = interpolate(t, [peakAt, peakAt + 0.4], [0, 1], { ...clamp, easing: ease });
    const ph = S1.peakHour;
  const peakTop = CH.base - barH(HOURLY[ph]);
  return (
    <AbsoluteFill>
      {HOURLY.map((v, h) => {
        const grow = interpolate(t, [start + h * 0.035, start + h * 0.035 + 0.55], [0, 1], { ...clamp, easing: ease });
        const isPeak = h === ph;
        const color = isPeak && peak > 0 ? C.red : "#C9C9C9";
        return (
          <div
            key={h}
            style={{
              position: "absolute",
              left: barX(h),
              top: CH.base - barH(v) * grow,
              width: BAR_W,
              height: barH(v) * grow,
              background: color,
              borderRadius: "8px 8px 0 0",
            }}
          />
        );
      })}
      {/* axis */}
      <div style={{ position: "absolute", left: CH.left - 10, top: CH.base, width: CH.right - CH.left + 20, height: 3, background: C.ink, opacity: interpolate(t, [start, start + 0.3], [0, 1], clamp) }} />
      {HOURLY.map((_, h) =>
        h % 3 === 0 ? (
          <div
            key={h}
            style={{
              position: "absolute",
              left: barX(h) - 30,
              width: BAR_W + 60,
              top: CH.base + 12,
              textAlign: "center",
              fontFamily: FONT,
              fontSize: 26,
              color: C.ink3,
              opacity: interpolate(t, [start + 0.2, start + 0.6], [0, 1], clamp),
            }}
          >
            {h} {S1.hourSuffix}
          </div>
        ) : null,
      )}
      {/* peak highlight */}
      <Viewfinder x={barX(ph) - 16} y={peakTop - 16} w={BAR_W + 32} h={barH(HOURLY[ph]) + 16} progress={peak} thickness={6} arm={26} spread={60} />
      <div
        style={{
          position: "absolute",
          left: 700,
          top: 236,
          width: 470,
          textAlign: "right",
          fontFamily: FONT,
          opacity: peak,
          transform: `translateY(${(1 - peak) * 14}px)`,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, color: C.ink2 }}>{S1.peakTitle}</div>
        <div style={{ fontSize: 76, fontWeight: 900, color: C.red, lineHeight: 1.1 }}>{S1.peakValue}</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: C.ink }}>{S1.peakNote}</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1182,
          top: 300,
          width: barX(ph) - 1182 + BAR_W / 2,
          height: 3,
          background: C.red,
          opacity: peak,
          transformOrigin: "left",
          transform: `scaleX(${peak})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: barX(ph) + BAR_W / 2 - 1.5,
          top: 300,
          width: 3,
          height: Math.max(0, peakTop - 16 - 300),
          background: C.red,
          opacity: peak,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- split panels
const PhotosIcon: React.FC = () => (
  <svg width={150} height={130} viewBox="0 0 150 130">
    {[0, 1, 2].map((i) => (
      <rect key={i} x={10 + i * 18} y={34 - i * 14} width={96} height={74} rx={10} fill="#fff" stroke={C.ink} strokeWidth={5} />
    ))}
    <circle cx={78} cy={42} r={8} fill={C.red} />
    <path d="M52 92 L74 66 L90 82 L102 70 L118 92 Z" fill={C.ink} />
  </svg>
);
const PhoneIcon: React.FC = () => (
  <svg width={150} height={130} viewBox="0 0 150 130">
    <rect x={20} y={8} width={64} height={116} rx={12} fill="#fff" stroke={C.ink} strokeWidth={5} />
    <circle cx={52} cy={56} r={15} fill="none" stroke={C.ink} strokeWidth={5} />
    <circle cx={52} cy={104} r={6} fill={C.ink} />
    {/* retake arrow */}
    <path d="M136 70 a24 24 0 1 1 -8 -18" fill="none" stroke={C.red} strokeWidth={6} strokeLinecap="round" />
    <path d="M118 44 L130 52 L120 62" fill="none" stroke={C.red} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
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

  const phaseB = c.s1_2.at - 0.35; // hourly chart
  const phaseC = c.s1_3.at - 0.2; // manpower estimate
  const phaseD = c.s1_4.at - 0.45; // estimate fades, ops / user panels come in

  const enter = interpolate(t, [0, 0.35], [0, 1], clamp);
  const counterValue = Math.round(interpolate(t, [0.1, 1.35], [0, S1.total], { ...clamp, easing: Easing.out(Easing.quad) }));
  const bigOut = interpolate(t, [phaseB, phaseB + 0.45], [1, 0], { ...clamp, easing: ease });
  const smallIn = interpolate(t, [phaseB + 0.2, phaseB + 0.6], [0, 1], { ...clamp, easing: ease });
  const chartOut = interpolate(t, [phaseC, phaseC + 0.4], [1, 0], clamp);
  const labelIn = interpolate(t, [c.s1_1.into(2.0), c.s1_1.into(2.4)], [0, 1], { ...clamp, easing: ease });
  const lockBig = spring({ frame: frame - f(1.35), fps, config: { damping: 14, stiffness: 120 } });
  const calcIn = interpolate(t, [phaseC + 0.1, phaseC + 0.5], [0, 1], { ...clamp, easing: ease });
  const calcOut = interpolate(t, [phaseD, phaseD + 0.35], [1, 0], clamp);
  const d3 = c.s1_3.end - c.s1_3.at;
  const at3 = (p: number) => c.s1_3.at + d3 * p;
  const b = [ramp(t, at3(0.0)), ramp(t, at3(0.22)), ramp(t, at3(0.5)), ramp(t, at3(0.78))];
  const leftIn = spring({ frame: frame - f(phaseD + 0.35), fps, config: { damping: 16, stiffness: 110 } });
  const rightIn = spring({ frame: frame - f(c.s1_4.at + 0.2), fps, config: { damping: 16, stiffness: 110 } });
  const sceneOut = interpolate(t, [S1_LEN - 0.35, S1_LEN], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: Math.min(enter, sceneOut) }}>
      {t < phaseB + 1 && <PhotoPile t={t} fadeOut={bigOut} />}

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

      {/* chart phase */}
      {t >= phaseB && chartOut > 0 && (
        <AbsoluteFill style={{ opacity: chartOut }}>
          <div style={{ position: "absolute", left: 120, top: 86, fontFamily: FONT, opacity: smallIn, transform: `translateX(${(1 - smallIn) * -30}px)` }}>
            <div style={{ fontSize: 30, fontWeight: 500, color: C.ink2 }}>{S1.label}</div>
            <div style={{ fontSize: 92, fontWeight: 900, color: C.ink, lineHeight: 1.15 }}>
              {S1.total.toLocaleString("en-US")}
              <span style={{ fontSize: 48, color: C.red, marginLeft: 10 }}>{S1.unit}</span>
            </div>
          </div>
          <HourChart t={t} start={phaseB + 0.25} peakAt={c.s1_2.into(0.35)} />
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
            opacity: Math.min(enter, chartOut),
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
              <div key={i} style={{ opacity: ramp(t, at3(0.8) + i * 0.03, 0.3) }}>
                <Person color={i < 10 ? C.ink2 : "#BDBDBD"} size={52} />
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", top: 700, width: "100%", textAlign: "center", fontSize: 24, color: C.ink3, opacity: ramp(t, at3(0.3), 0.4) }}>{S1.assumption}</div>
        </AbsoluteFill>
      )}

      {/* ops / user panels */}
      {t >= phaseD + 0.3 && (
        <>
          <Panel x={140} k={leftIn} tag={S1.opsTag} big={S1.opsBig} sub={S1.opsSub} icon={<PhotosIcon />} />
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
      <Sequence from={f(c.s1_2.into(0.35))} durationInFrames={f(0.3)}>
        <Audio src={staticFile("sfx/pop.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={f(at3(0.78))} durationInFrames={f(0.3)}>
        <Audio src={staticFile("sfx/pop.wav")} volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
};

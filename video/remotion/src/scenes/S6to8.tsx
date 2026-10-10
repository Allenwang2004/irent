import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Block, Op, Person } from "../components/Calc";
import { clamp, Narration, ramp, sceneOpacity, Sfx, useSpringAt, useT } from "../components/Common";
import { Viewfinder } from "../components/Viewfinder";
import { COVER, S6, S7, S8 } from "../copy";
import { S6_CUES, S6_LEN, S7_CUES, S7_LEN, S8_CUES, S8_LEN } from "../timeline";
import { C, FONT } from "../theme";

// ---------------------------------------------------------------- S6 technology
const TechCard: React.FC<{ x: number; k: number; hl: number; word: string; title: string; points: string[]; t: number; at: number }> = ({ x, k, hl, word, title, points, t, at }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 190,
      width: 770,
      height: 360,
      background: hl > 0.5 ? "#fff" : C.panel,
      boxShadow: hl > 0.5 ? "0 24px 60px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)" : "none",
      borderRadius: 28,
      padding: "36px 44px",
      boxSizing: "border-box",
      fontFamily: FONT,
      opacity: k,
      transform: `translateY(${(1 - k) * 40}px)`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <span style={{ background: C.red, color: "#fff", fontSize: 34, fontWeight: 900, borderRadius: 999, padding: "4px 24px" }}>{word}</span>
      <span style={{ fontSize: 44, fontWeight: 900, color: C.ink }}>{title}</span>
    </div>
    <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 18 }}>
      {points.map((p, i) => (
        <div key={p} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, color: C.ink, opacity: ramp(t, at + 0.3 + i * 0.3, 0.35) }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: C.red, flexShrink: 0 }} />
          {p}
        </div>
      ))}
    </div>
  </div>
);

export const S6Tech: React.FC = () => {
  const t = useT();
  const c = S6_CUES;
  const titleK = ramp(t, 0.05, 0.5);
  const left = useSpringAt(0.2);
  const right = useSpringAt(c.s6_1.at - 0.1);
  const rateK = useSpringAt(c.s6_2.at - 0.1);
  const cloudHl = ramp(t, c.s6_1.at, 0.3) * (1 - ramp(t, c.s6_2.at, 0.3));
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S6_LEN), fontFamily: FONT }}>
      <div style={{ position: "absolute", top: 70, width: "100%", textAlign: "center", fontSize: 58, fontWeight: 900, color: C.ink, opacity: titleK }}>{S6.title}</div>
      <TechCard x={150} k={left} hl={0} word={S6.edgeWord} title={S6.edgeTitle} points={S6.edgePoints} t={t} at={0.2} />
      <TechCard x={1000} k={right} hl={cloudHl} word={S6.cloudWord} title={S6.cloudTitle} points={S6.cloudPoints} t={t} at={c.s6_1.at - 0.1} />
      {/* staff decisions become training data */}
      <div style={{ position: "absolute", left: 150, top: 590, width: 1620, height: 210, borderRadius: 28, border: `3px solid ${C.red}`, padding: "26px 44px", boxSizing: "border-box", opacity: rateK, transform: `translateY(${(1 - rateK) * 30}px)` }}>
        <div style={{ fontSize: 38, fontWeight: 900, color: C.red }}>{S6.loopTitle}</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 22 }}>
          {S6.loop.map((step, i) => {
            const k = ramp(t, c.s6_2.into(0.6 + i * 1.3), 0.35);
            return (
              <React.Fragment key={step}>
                {i > 0 && <div style={{ fontSize: 40, fontWeight: 900, color: C.red, margin: "0 22px", opacity: k }}>→</div>}
                <div style={{ fontSize: 32, fontWeight: 700, color: C.ink, background: C.panel, borderRadius: 16, padding: "12px 26px", opacity: k, transform: `scale(${0.9 + 0.1 * k})` }}>{step}</div>
              </React.Fragment>
            );
          })}
          <svg width={70} height={60} viewBox="0 0 70 60" style={{ marginLeft: 22, opacity: ramp(t, c.s6_2.into(5.0), 0.35) }}>
            <path d="M10 30 a22 22 0 1 0 8 -17" fill="none" stroke={C.red} strokeWidth={5} strokeLinecap="round" />
            <path d="M8 6 L18 13 L8 20" fill="none" stroke={C.red} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <Narration cues={c} />
      <Sfx at={c.s6_2.at} name="pop" volume={0.45} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- S7 benefit
export const S7Benefit: React.FC = () => {
  const t = useT();
  const c = S7_CUES;
  const d1 = c.s7_1.end - c.s7_1.at;
  const at = (p: number) => c.s7_1.at + d1 * p;
  const b = [ramp(t, at(0.0)), ramp(t, at(0.22)), ramp(t, at(0.42)), ramp(t, at(0.62))];
  const cut = ramp(t, at(0.75), 0.6);
  const oneK = useSpringAt(at(0.88));
  const userK = ramp(t, c.s7_2.at - 0.1, 0.45);
  const beforeK = ramp(t, 0.1, 0.4);
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S7_LEN), fontFamily: FONT }}>
      {/* before */}
      <div style={{ position: "absolute", top: 80, width: "100%", textAlign: "center", fontSize: 34, color: C.ink3, opacity: beforeK }}>
        {S7.beforeLabel}
        <span style={{ marginLeft: 18, fontWeight: 700, textDecoration: cut > 0.5 ? "line-through" : "none" }}>{S7.beforeValue}</span>
      </div>
      {/* after */}
      <div style={{ position: "absolute", top: 170, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Block n={S7.orders} unit={S7.ordersUnit} k={b[0]} size={100} />
        <Op s="×" k={b[1]} size={68} />
        <Block n={S7.flagged} unit={S7.flaggedUnit} k={b[1]} size={100} red />
        <Op s="=" k={b[2]} size={68} />
        <Block n={S7.checked} unit={S7.checkedUnit} k={b[2]} size={100} />
        <Op s="→" k={b[3]} size={68} />
        <Block n={S7.hours} unit={S7.hoursUnit} k={b[3]} size={100} />
      </div>
      <div style={{ position: "absolute", top: 450, width: "100%", display: "flex", justifyContent: "center", gap: 14 }}>
        {Array.from({ length: 20 }, (_, i) => {
          const keep = i < 2;
          const base = i < 10 ? 40 : 150;
          const color = keep && cut > 0.5 ? C.red : `rgba(${base},${base},${base},${1 - (keep ? 0 : cut * 0.85)})`;
          return (
            <div key={i} style={{ opacity: ramp(t, at(0.62) + i * 0.025, 0.3) }}>
              <Person color={color} size={52} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 548, width: "100%", textAlign: "center", opacity: oneK, transform: `scale(${0.9 + 0.1 * oneK})` }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: C.ink2, marginRight: 18 }}>約</span>
        <span style={{ fontSize: 140, fontWeight: 900, color: C.red }}>{S7.after}</span>
        <span style={{ fontSize: 56, fontWeight: 900, color: C.red, marginLeft: 8 }}>{S7.afterUnit}</span>
      </div>
      <div style={{ position: "absolute", top: 790, width: "100%", textAlign: "center", opacity: userK, transform: `translateY(${(1 - userK) * 16}px)` }}>
        <span style={{ fontSize: 36, fontWeight: 700, color: C.ink, background: C.panel, borderRadius: 999, padding: "12px 36px" }}>{S7.userLine}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 890, textAlign: "center", fontSize: 22, color: C.ink3, opacity: ramp(t, at(0.2), 0.4) }}>{S7.assumption}</div>
      <Narration cues={c} />
      <Sfx at={at(0.88)} name="ding" volume={0.4} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- S8 outro
export const S8Outro: React.FC = () => {
  const t = useT();
  const c = S8_CUES;
  const lockK = useSpringAt(0.1);
  const shrink = interpolate(t, [0.7, 1.1], [0, 1], clamp);
  const brandK = useSpringAt(0.15);
  const lineK = ramp(t, c.s8_1.into(1.3), 0.5);
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: Math.min(interpolate(t, [0, 0.3], [0, 1], clamp), interpolate(t, [S8_LEN - 0.4, S8_LEN], [1, 0], clamp)), fontFamily: FONT }}>
      <Viewfinder x={500 + shrink * 40} y={300 + shrink * 20} w={920 - shrink * 80} h={300 - shrink * 40} progress={lockK} thickness={8} arm={50} spread={110} opacity={1 - shrink} />
      <div style={{ position: "absolute", top: 330, width: "100%", textAlign: "center", opacity: brandK, transform: `scale(${0.92 + 0.08 * brandK})` }}>
        <span style={{ fontSize: 200, fontWeight: 900, color: C.red, letterSpacing: -5 }}>{COVER.brand}</span>
        <span style={{ display: "inline-block", width: 110, height: 110, position: "relative", marginLeft: 18, verticalAlign: "middle", top: -44 }}>
          <span style={{ position: "absolute", left: 0, top: 41, width: 110, height: 28, borderRadius: 6, background: C.red }} />
          <span style={{ position: "absolute", top: 0, left: 41, height: 110, width: 28, borderRadius: 6, background: C.red }} />
        </span>
      </div>
      <div style={{ position: "absolute", top: 640, width: "100%", textAlign: "center", fontSize: 64, fontWeight: 900, color: C.ink, letterSpacing: 4, opacity: lineK, transform: `translateY(${(1 - lineK) * 16}px)` }}>{S8.line}</div>
      {S8.team && <div style={{ position: "absolute", top: 760, width: "100%", textAlign: "center", fontSize: 30, color: C.ink3, opacity: lineK }}>{S8.team}</div>}
      <Narration cues={c} />
      <Sfx at={0.15} name="ding" volume={0.5} />
    </AbsoluteFill>
  );
};

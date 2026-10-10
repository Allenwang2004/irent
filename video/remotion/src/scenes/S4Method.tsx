import React from "react";
import { AbsoluteFill } from "remotion";
import { Narration, Num, ramp, sceneOpacity, Sfx, useSpringAt, useT } from "../components/Common";
import { Viewfinder } from "../components/Viewfinder";
import { MECH, S4, STEPS } from "../copy";
import { S4_CUES, S4_LEN } from "../timeline";
import { C, FONT } from "../theme";

// Three stages, each with the mechanisms we added (numbered; the demo refers back to them).
const COL_X = [80, 685, 1290];
const COL_W = 550;
const COL_Y = 220;
const COL_H = 640;

const StepIcon: React.FC<{ i: number }> = ({ i }) => {
  if (i === 0)
    return (
      <svg width={72} height={72} viewBox="0 0 84 84">
        <rect x={24} y={6} width={36} height={72} rx={8} fill="none" stroke={C.ink} strokeWidth={5} />
        <path d="M30 30 h-8 v-8 M54 30 h8 v-8 M30 54 h-8 v8 M54 54 h8 v8" stroke={C.red} strokeWidth={4} fill="none" />
      </svg>
    );
  if (i === 1)
    return (
      <svg width={72} height={72} viewBox="0 0 84 84">
        <rect x={14} y={14} width={56} height={56} rx={10} fill="none" stroke={C.ink} strokeWidth={5} />
        <text x={42} y={51} textAnchor="middle" fontSize={24} fontWeight={900} fill={C.red} fontFamily="Arial">AI</text>
        <path d="M28 6 v8 M42 6 v8 M56 6 v8 M28 70 v8 M42 70 v8 M56 70 v8 M6 28 h8 M6 42 h8 M6 56 h8 M70 28 h8 M70 42 h8 M70 56 h8" stroke={C.ink} strokeWidth={4} />
      </svg>
    );
  return (
    <svg width={72} height={72} viewBox="0 0 84 84">
      <rect x={14} y={10} width={56} height={66} rx={8} fill="none" stroke={C.ink} strokeWidth={5} />
      <path d="M26 30 h32 M26 44 h32 M26 58 h18" stroke={C.ink} strokeWidth={4} />
      <path d="M46 58 l7 7 l14 -16" stroke={C.red} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const S4Method: React.FC = () => {
  const t = useT();
  const c = S4_CUES;
  const colAt = [c.s4_2.at, c.s4_3.at, c.s4_4.at]; // focus follows the narration
  const inAt = [c.s4_1.at + 0.2, c.s4_1.at + 0.55, c.s4_1.at + 0.9]; // but all columns are on screen early
  const titleK = ramp(t, 0.05, 0.5);
  const springs = [useSpringAt(inAt[0]), useSpringAt(inAt[1]), useSpringAt(inAt[2])];
  const focus = [0, 1, 2].reduce((acc, i) => (t >= colAt[i] ? i : acc), -1);
  const lockK = useSpringAt(colAt[0] - 0.1);
  const allK = ramp(t, c.s4_4.end + 0.2, 0.5); // all columns back to full at the end

  let vx = COL_X[0];
  for (let i = 1; i < 3; i++) vx = vx + (COL_X[i] - vx) * ramp(t, colAt[i] - 0.1, 0.35);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S4_LEN), fontFamily: FONT }}>
      <div style={{ position: "absolute", top: 72, width: "100%", textAlign: "center", fontSize: 68, fontWeight: 900, color: C.ink, opacity: titleK, transform: `translateY(${(1 - titleK) * 16}px)` }}>
        {S4.titleA}
        <span style={{ color: C.red }}>{S4.titleB}</span>
      </div>

      {STEPS.map((s, i) => {
        const k = springs[i];
        const active = focus === i && allK < 1;
        const items = MECH.filter((m) => m.stage === i);
        return (
          <React.Fragment key={s.word}>
            {i > 0 && <div style={{ position: "absolute", left: COL_X[i] - 62, top: COL_Y + 50, fontSize: 52, fontWeight: 900, color: C.mute, opacity: k }}>→</div>}
            <div
              style={{
                position: "absolute",
                left: COL_X[i],
                top: COL_Y,
                width: COL_W,
                height: COL_H,
                background: active ? "#fff" : C.panel,
                borderRadius: 28,
                boxShadow: active ? "0 24px 60px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)" : "none",
                padding: "34px 36px",
                boxSizing: "border-box",
                opacity: k,
                transform: `translateY(${(1 - k) * 50}px)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 58, fontWeight: 900, color: active ? C.red : C.ink, lineHeight: 1.1 }}>{S4.stageNames[i]}</div>
                  <span style={{ display: "inline-block", marginTop: 12, fontSize: 24, fontWeight: 700, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 999, padding: "2px 14px" }}>{s.who}</span>
                </div>
                <StepIcon i={i} />
              </div>
              <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 30 }}>
                {items.map((m, j) => {
                  const mk = ramp(t, inAt[i] + 0.3 + j * 0.25, 0.35);
                  return (
                    <div key={m.n} style={{ display: "flex", gap: 16, opacity: mk, transform: `translateX(${(1 - mk) * 16}px)` }}>
                      <Num n={m.n} size={48} />
                      <div>
                        <div style={{ fontSize: 35, fontWeight: 900, color: C.ink, lineHeight: 1.3 }}>{m.name}</div>
                        <div style={{ fontSize: 26, color: C.ink2, marginTop: 6, lineHeight: 1.45 }}>{m.note}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <Viewfinder x={vx - 14} y={COL_Y - 14} w={COL_W + 28} h={COL_H + 28} progress={lockK} thickness={8} arm={46} spread={100} opacity={1 - allK} />

      <Narration cues={c} />
      {colAt.map((a, i) => (
        <Sfx key={i} at={a} name="pop" volume={0.45} />
      ))}
    </AbsoluteFill>
  );
};

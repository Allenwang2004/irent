import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, mockLabel, Narration, ramp, RecordingOr, Sfx } from "../components/Common";
import { BrowserFrame } from "../components/DemoSlot";
import { Viewfinder } from "../components/Viewfinder";
import { DEMO_UI, S2 } from "../copy";
import { S2_CUES, S2_LEN } from "../timeline";
import { C, f, FONT, FPS } from "../theme";

const ease = Easing.out(Easing.cubic);
const A = { accent: "#c8102e", bg: "#f4f4f2", line: "#e0dfda", ink: "#111", ink2: "#55544f", ink3: "#85847e" };
const BW = 1500;
const BH = 760;
const FILE = "demo/s2-reviews.mp4";
const MAXN = Math.max(...S2.categories.map((c) => c.n));

// Mock of web/src/app/(admin)/reviews: sources, category distribution, triage.
const ReviewsPage: React.FC<{ t: number; barsAt: number; hl: number }> = ({ t, barsAt, hl }) => (
  <div style={{ position: "relative", width: BW, height: BH, overflow: "hidden", background: A.bg, fontFamily: FONT, color: A.ink }}>
    <div style={{ height: 60, background: "#fff", borderBottom: `1.5px solid ${A.line}`, display: "flex", alignItems: "center", gap: 30, padding: "0 40px" }}>
      <span style={{ fontSize: 21, fontWeight: 700 }}>{DEMO_UI.adminBrand}</span>
      {DEMO_UI.adminNav.map((n) => (
        <span key={n} style={{ fontSize: 17, color: n === "顧客評論" ? A.ink : A.ink2, fontWeight: n === "顧客評論" ? 700 : 400 }}>
          {n}
        </span>
      ))}
    </div>
    <div style={{ padding: "26px 48px" }}>
      <div style={{ fontSize: 36, fontWeight: 700 }}>{S2.pageTitle}</div>
      <div style={{ fontSize: 19, color: A.ink2, marginTop: 6 }}>{S2.pageSub}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center" }}>
        <span style={{ fontSize: 26, fontWeight: 700, marginRight: 8 }}>{S2.total}</span>
        {S2.sources.map((s) => (
          <span key={s.name} style={{ border: `1.5px solid ${A.line}`, background: "#fff", borderRadius: 999, padding: "4px 16px", fontSize: 18, color: A.ink2 }}>
            {s.name} <b style={{ color: A.ink }}>{s.n}</b>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 22 }}>
        {/* category distribution */}
        <div style={{ width: 880, background: "#fff", border: `1.5px solid ${A.line}`, borderRadius: 12, padding: "22px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 23, fontWeight: 700 }}>問題類型</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", background: C.red, borderRadius: 999, padding: "3px 16px", opacity: ramp(t, barsAt - 0.2, 0.3), transform: `scale(${0.8 + 0.2 * ramp(t, barsAt - 0.2, 0.3)})` }}>{S2.aiChip}</span>
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 19 }}>
            {S2.categories.map((cat, i) => {
              const grow = ramp(t, barsAt + i * 0.12, 0.55);
              const dim = cat.related ? 0 : hl;
              const color = cat.related && hl > 0 ? C.red : `rgba(160,160,160,${1 - 0.55 * dim})`;
              return (
                <div key={cat.label} style={{ display: "flex", alignItems: "center", gap: 14, opacity: 1 - dim * 0.45 }}>
                  <div style={{ width: 310, textAlign: "right", fontSize: 20, fontWeight: cat.related && hl > 0 ? 700 : 400, color: A.ink }}>{cat.label}</div>
                  <div style={{ width: (cat.n / MAXN) * 400 * grow, height: 30, borderRadius: 6, background: color }} />
                  <div style={{ fontSize: 20, fontWeight: 700, opacity: grow }}>{cat.n}</div>
                </div>
              );
            })}
          </div>
        </div>
        {/* triage list */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {S2.problems.map((p, i) => (
            <div key={p.title} style={{ background: "#fff", border: `1.5px solid ${A.line}`, borderRadius: 12, padding: "16px 20px", opacity: ramp(t, barsAt + 0.5 + i * 0.2, 0.3) }}>
              <div style={{ display: "flex", gap: 8, fontSize: 15, color: A.ink3 }}>
                <span style={{ color: C.red }}>{S2.stars}</span>
                <span>{p.meta}</span>
              </div>
              <div style={{ fontSize: 18, marginTop: 6, lineHeight: 1.5 }}>{p.quote.replace(/\n/g, "")}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 14, border: `1.5px solid ${A.line}`, borderRadius: 999, padding: "1px 10px" }}>{S2.categories.filter((c) => c.related)[i].label}</span>
                <span style={{ fontSize: 14, border: `1.5px solid ${A.line}`, borderRadius: 999, padding: "1px 10px", color: A.ink2 }}>{S2.triage[i === 0 ? 1 : 0]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const CARD_W = 520;
const CARD_X = (i: number) => 140 + i * 560;
const CARD_Y = 250;
const CARD_H = 560;

export const S2Voices: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / FPS;
  const c = S2_CUES;

  const barsAt = c.s2_1.into(2.6); // "交給 AI 歸納分類"
  const hlAt = c.s2_2.at - 0.1;
  const browserOut = c.s2_3.at - 0.35;
  const cardAt = [c.s2_3.at - 0.05, c.s2_4.at - 0.05, c.s2_5.at - 0.05];

  const enter = interpolate(t, [0, 0.3], [0, 1], clamp);
  const browserK = ramp(t, 0.05, 0.5);
  const out = 1 - ramp(t, browserOut, 0.35);
  const hl = ramp(t, hlAt, 0.45);
  const stat = spring({ frame: frame - f(c.s2_2.at), fps, config: { damping: 15, stiffness: 120 } });
  const titleK = ramp(t, browserOut + 0.15, 0.4);
  const sceneOut = interpolate(t, [S2_LEN - 0.5, S2_LEN], [1, 0], clamp);
  const label = mockLabel(FILE);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: Math.min(enter, sceneOut) }}>
      {/* 1. the review back office */}
      {out > 0 && (
        <AbsoluteFill style={{ opacity: out }}>
          <div style={{ position: "absolute", left: 210, top: 60, opacity: browserK, transform: `scale(${0.95 + 0.05 * browserK})`, transformOrigin: "center top" }}>
            <BrowserFrame url={S2.url} width={BW}>
              <RecordingOr file={FILE} width={BW} height={BH}>
                <ReviewsPage t={t} barsAt={barsAt} hl={hl} />
              </RecordingOr>
            </BrowserFrame>
            {label && <div style={{ marginTop: 8, textAlign: "center", fontFamily: FONT, fontSize: 18, color: C.ink3 }}>{label}</div>}
          </div>
          {/* 206 related */}
          <div style={{ position: "absolute", left: 1290, top: 300, width: 470, height: 330, background: "rgba(255,255,255,0.96)", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.14)", opacity: stat, transform: `scale(${0.9 + 0.1 * stat})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
            <div style={{ fontSize: 120, fontWeight: 900, color: C.red, lineHeight: 1.05 }}>{S2.statBig}</div>
            <div style={{ fontSize: 50, fontWeight: 900, color: C.ink }}>{S2.statLine}</div>
            <div style={{ fontSize: 22, color: C.ink3, marginTop: 12 }}>{S2.statNote}</div>
          </div>
          <Viewfinder x={1290} y={300} w={470} h={330} progress={stat} thickness={7} arm={42} spread={90} />
        </AbsoluteFill>
      )}

      {/* 2. the three problems */}
      {t >= browserOut && (
        <AbsoluteFill>
          <div style={{ position: "absolute", left: 140, top: 100, fontFamily: FONT, fontSize: 66, fontWeight: 900, color: C.ink, opacity: titleK }}>{S2.problemsTitle}</div>
          {S2.problems.map((p, i) => {
            const k = spring({ frame: frame - f(cardAt[i]), fps, config: { damping: 14, stiffness: 130 } });
            const ghost = ramp(t, browserOut + 0.2 + i * 0.1, 0.35);
            const x = CARD_X(i);
            return (
              <React.Fragment key={p.title}>
                <div style={{ position: "absolute", left: x, top: CARD_Y, width: CARD_W, height: CARD_H, borderRadius: 22, background: C.panel, opacity: ghost * (1 - k) }} />
                <div
                  style={{
                    position: "absolute",
                    left: x,
                    top: CARD_Y,
                    width: CARD_W,
                    height: CARD_H,
                    boxSizing: "border-box",
                    padding: "40px 40px",
                    background: "#fff",
                    borderRadius: 22,
                    boxShadow: "0 18px 50px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)",
                    fontFamily: FONT,
                    opacity: k,
                    transform: `translateY(${(1 - k) * 50}px)`,
                  }}
                >
                  <div style={{ fontSize: 80, fontWeight: 900, color: C.red, lineHeight: 1 }}>{p.n}</div>
                  <div style={{ fontSize: 40, fontWeight: 900, color: C.ink, marginTop: 22, lineHeight: 1.3 }}>{p.title}</div>
                  <div style={{ fontSize: 29, color: C.ink2, lineHeight: 1.6, marginTop: 28, whiteSpace: "pre-line" }}>「{p.quote}」</div>
                  <div style={{ position: "absolute", left: 40, bottom: 34, fontSize: 22, color: C.ink3 }}>
                    <span style={{ color: C.red, marginRight: 12, letterSpacing: 2 }}>{S2.stars}</span>
                    {p.meta}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </AbsoluteFill>
      )}

      {/* one viewfinder that follows the problem being read */}
      {t >= cardAt[0] &&
        (() => {
          const appear = spring({ frame: frame - f(cardAt[0]), fps, config: { damping: 14, stiffness: 130 } });
          let x = CARD_X(0);
          for (let i = 1; i < cardAt.length; i++) {
            const m = interpolate(t, [cardAt[i], cardAt[i] + 0.3], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
            x = x + (CARD_X(i) - x) * m;
          }
          return <Viewfinder x={x - 16} y={CARD_Y - 16} w={CARD_W + 32} h={CARD_H + 32} progress={appear} thickness={8} arm={48} spread={90} />;
        })()}

      <Narration cues={c} />
      {cardAt.map((a, i) => (
        <Sfx key={i} at={a} name="pop" volume={0.5} />
      ))}
      <Sfx at={c.s2_2.at} name="shutter" volume={0.35} />
    </AbsoluteFill>
  );
};

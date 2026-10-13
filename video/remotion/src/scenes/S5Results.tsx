// S5r: what the VLM got right on the organiser's 144 pickup/return pairs, shown
// with real photos from that data set (plates blurred; public/private/ is not in git).
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import { clamp, Narration, ramp, sceneOpacity, Sfx, useSpringAt, useT } from "../components/Common";
import { RESULTS as R, S5_PANELS as P, type EvidenceCardT } from "../copy";
import { S5R_CUES, S5R_LEN } from "../timeline";
import { C, FONT } from "../theme";
import { Header } from "./S5Back";

const GREEN = "#0a8a0a";
const CARD = { y: 340, w: 410, h: 540, gap: 20, x0: 110 };
const PHOTO = { h: 336, gap: 8 };
const PHOTO_W = Math.round((PHOTO.h * 478) / 851);

type Card = EvidenceCardT;

const Photo: React.FC<{ src: string; label: string; ring: string | null; ringK: number }> = ({ src, label, ring, ringK }) => (
  <div style={{ position: "relative", width: PHOTO_W, height: PHOTO.h, borderRadius: 12, overflow: "hidden", background: "#222" }}>
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    <div style={{ position: "absolute", left: 8, top: 8, fontSize: 19, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "2px 10px" }}>{label}</div>
    {ring && <div style={{ position: "absolute", inset: 0, borderRadius: 12, border: `5px solid ${ring}`, opacity: ringK }} />}
  </div>
);

const EvidenceCard: React.FC<{ card: Card; x: number; k: number; verdictK: number; tagK: number }> = ({ card, x, k, verdictK, tagK }) => {
  const damage = card.kind === "damage";
  const rings = card.photos.map((_, i) => {
    if (damage) return i === 1 ? C.red : null;
    const v = card.verdicts![i];
    return v[2] ? C.red : GREEN;
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: CARD.y,
        width: CARD.w,
        height: CARD.h,
        background: C.panel,
        borderRadius: 22,
        padding: "16px 10px 0",
        boxSizing: "border-box",
        opacity: k,
        transform: `translateY(${(1 - k) * 40}px)`,
        boxShadow: tagK > 0.01 ? `0 0 0 ${4 * tagK}px ${C.red}` : "none",
      }}
    >
      <div style={{ fontSize: 23, fontWeight: 700, color: tagK > 0.5 ? C.red : C.ink2, paddingLeft: 6, height: 34 }}>{card.tag}</div>
      <div style={{ display: "flex", gap: PHOTO.gap, marginTop: 6 }}>
        {card.photos.map(([src, label], i) => (
          <Photo key={src} src={src} label={label} ring={rings[i]} ringK={verdictK} />
        ))}
      </div>
      <div style={{ paddingLeft: 6, marginTop: 14, opacity: verdictK, transform: `translateY(${(1 - verdictK) * 10}px)` }}>
        {damage ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: C.red }}>{card.verdict}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: C.ink2 }}>{card.votes}</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 22, fontSize: 32, fontWeight: 900 }}>
            {card.verdicts!.map(([where, v, bad]) => (
              <span key={where}>
                <span style={{ color: C.ink }}>{where} </span>
                <span style={{ color: bad ? C.red : GREEN }}>{v}</span>
              </span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 21, color: C.ink2, marginTop: 6 }}>{card.detail}</div>
      </div>
    </div>
  );
};

const Kpi: React.FC<{ x: number; k: number; count: number; i: number }> = ({ x, k, count, i }) => {
  const m = R.kpis[i];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 112,
        width: 400,
        height: 208,
        background: C.redSoft,
        borderRadius: 24,
        padding: "18px 28px",
        boxSizing: "border-box",
        opacity: k,
        transform: `scale(${0.92 + 0.08 * k})`,
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 900, color: C.ink }}>{m.label}</div>
      <div style={{ fontSize: 92, fontWeight: 900, color: C.red, lineHeight: 1.05, marginTop: 2 }}>
        {Math.round(m.value * count)}
        <span style={{ fontSize: 58 }}>{m.suffix}</span>
      </div>
      <div style={{ fontSize: 19, color: C.ink2, marginTop: 6, whiteSpace: "nowrap" }}>{m.note}</div>
    </div>
  );
};

export const S5Results: React.FC = () => {
  const t = useT();
  const c = S5R_CUES;
  const titleK = ramp(t, 0.1, 0.45);
  const subK = ramp(t, c.s5r_1.into(0.3), 0.4);
  // "我們用主辦方的 144 組取還車照片實測，加上角度和光線把關"
  const cardK = [0, 1, 2, 3].map((i) => ramp(t, c.s5r_1.into(0.9 + i * 0.35), 0.45));
  const gateK = [c.s5r_1.into(3.8), c.s5r_1.into(4.3), c.s5r_1.into(4.7)].map((a) => ramp(t, a, 0.3));
  // "真的有車損的全部抓到，沒問題的只有 3% 被誤報"
  const kpiAt = [c.s5r_2.into(0.85), c.s5r_2.into(2.1)];
  const kpiK = [useSpringAt(kpiAt[0]), useSpringAt(kpiAt[1])];
  const count = kpiAt.map((a) => interpolate(t, [a, a + 0.8], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) }));
  const crashVerdict = [ramp(t, c.s5r_2.into(0.3), 0.3), ramp(t, c.s5r_2.into(0.6), 0.3)];
  // "白天、夜間的車損都抓得到，車內也分得出乾淨和髒汙。"
  const r3 = c.s5r_3;
  const dayK = Math.max(0, Math.min(ramp(t, r3.at, 0.25), 1 - ramp(t, r3.into(1.0), 0.25)));
  const nightK = Math.max(0, Math.min(ramp(t, r3.into(0.75), 0.25), 1 - ramp(t, r3.into(1.9), 0.25)));
  const tidyVerdict = [ramp(t, r3.into(2.4), 0.3), ramp(t, r3.into(2.8), 0.3)];
  const verdictK = [crashVerdict[0], crashVerdict[1], tidyVerdict[0], tidyVerdict[1]];
  const tagK = [dayK, nightK, 0, 0];
  const noteK = ramp(t, r3.into(3.2), 0.4);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S5R_LEN), fontFamily: FONT }}>
      <Header mech={P.r.mech} chip={P.r.chip} step={P.r.step} />
      <div style={{ position: "absolute", left: 110, top: 128, opacity: titleK, transform: `translateY(${(1 - titleK) * 14}px)` }}>
        <div style={{ fontSize: 58, fontWeight: 900, color: C.ink }}>{R.title}</div>
        <div style={{ fontSize: 27, color: C.ink2, marginTop: 8, opacity: subK }}>{R.sub}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
          {R.gates.map((g, i) => (
            <span key={g} style={{ fontSize: 23, fontWeight: 700, color: C.red, border: `2px solid ${C.red}`, borderRadius: 999, padding: "4px 18px", opacity: gateK[i], transform: `scale(${0.9 + 0.1 * gateK[i]})` }}>
              {g}
            </span>
          ))}
        </div>
      </div>
      <Kpi x={990} k={kpiK[0]} count={count[0]} i={0} />
      <Kpi x={1410} k={kpiK[1]} count={count[1]} i={1} />
      {R.cards.map((card, i) => (
        <EvidenceCard key={card.tag} card={card} x={CARD.x0 + i * (CARD.w + CARD.gap)} k={cardK[i]} verdictK={verdictK[i]} tagK={tagK[i]} />
      ))}
      <div style={{ position: "absolute", right: 110, top: CARD.y + CARD.h + 10, fontSize: 18, color: C.ink3, opacity: noteK }}>{R.note}</div>
      <Narration cues={c} />
      <Sfx at={kpiAt[0]} name="ding" volume={0.4} />
      <Sfx at={kpiAt[1]} name="pop" volume={0.4} />
      {[r3.into(2.4), r3.into(2.8)].map((a, i) => (
        <Sfx key={i} at={a} name="tick" volume={0.4} />
      ))}
    </AbsoluteFill>
  );
};

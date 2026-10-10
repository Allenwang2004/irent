// Mock of the back office alerts page (web/src/app/(admin)/alerts), drawn from
// its real copy and layout, used until a screen recording is dropped in.
// Alerts are grouped into one card per pickup or return, most severe first.
import React from "react";
import { interpolate } from "remotion";
import { CarPhoto } from "../components/CarArt";
import { clamp, ramp, Tap } from "../components/Common";
import { Viewfinder } from "../components/Viewfinder";
import { DEMO_UI as U } from "../copy";
import { FONT } from "../theme";

const A = { accent: "#c8102e", bg: "#f4f4f2", line: "#e0dfda", ink: "#111", ink2: "#55544f", ink3: "#85847e", good: "#0ca30c" };
export const ADMIN = { w: 1500, h: 780 };
const CONTENT_W = 1120;

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ border: `1.5px solid ${A.line}`, borderRadius: 999, padding: "1px 11px", fontSize: 16 }}>{children}</span>
);
const Field: React.FC<{ w: number; children: React.ReactNode }> = ({ w, children }) => (
  <div style={{ width: w, height: 38, border: `1.5px solid ${A.line}`, borderRadius: 7, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 17, boxSizing: "border-box", background: "#fff" }}>{children}</div>
);
const Check: React.FC = () => (
  <span style={{ width: 17, height: 17, borderRadius: 4, background: A.accent, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
    <svg width={11} height={11} viewBox="0 0 24 24">
      <path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
    </svg>
  </span>
);
const press = (t: number, at: number | undefined) => (at === undefined ? 0 : interpolate(t, [at - 0.05, at, at + 0.2], [0, 1, 0], clamp));

export type CaseTimes = {
  badgeAt: number; // highlight the open counts in the navigation
  sortAt: number; // highlight the order of the cards
  confirmAt: number; // confirm the damage on the first card
  scrollAt: number; // scroll to the second card
  dismissAt: number; // dismiss the second card as a false alarm
};

// Where the buttons end up on screen (for the tap rings), given the scroll.
const SCROLL = 310;

export const AdminCases: React.FC<{ t: number; times: CaseTimes }> = ({ t, times: k }) => {
  const confirmed = t >= k.confirmAt + 0.15;
  const dismissed = t >= k.dismissAt + 0.15;
  const scroll = ramp(t, k.scrollAt, 0.5) * SCROLL;
  const badgeHl = Math.min(ramp(t, k.badgeAt, 0.35), 1 - ramp(t, k.sortAt, 0.3));
  const sortHl = Math.min(ramp(t, k.sortAt, 0.35), 1 - ramp(t, k.confirmAt - 0.3, 0.3));
  const openCases = 2 - (confirmed ? 1 : 0) - (dismissed ? 1 : 0);
  const openOrders = 2 - (dismissed ? 1 : 0);
  const scratchMark = ramp(t, k.sortAt + 0.3, 0.4);

  return (
    <div style={{ position: "relative", width: ADMIN.w, height: ADMIN.h, overflow: "hidden", background: A.bg, fontFamily: FONT, color: A.ink }}>
      {/* header */}
      <div style={{ position: "relative", zIndex: 2, height: 60, background: "#fff", borderBottom: `1.5px solid ${A.line}`, display: "flex", alignItems: "center", gap: 30, padding: "0 40px" }}>
        <span style={{ fontSize: 21, fontWeight: 700 }}>{U.adminBrand}</span>
        {U.adminNav.map((n, i) => {
          const count = i === 0 ? openCases : i === 1 ? openOrders : 0;
          return (
            <span key={n} style={{ fontSize: 17, color: i === 0 ? A.ink : A.ink2, fontWeight: i === 0 ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>
              {n}
              {count > 0 && <span style={{ background: A.accent, color: "#fff", borderRadius: 999, fontSize: 13, padding: "1px 7px", fontWeight: 600 }}>{count}</span>}
            </span>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 15, color: A.ink2 }}>登出</span>
      </div>
      <Viewfinder x={206} y={10} w={190} h={40} progress={badgeHl} thickness={4} arm={14} spread={30} opacity={badgeHl} />
      <div style={{ position: "absolute", zIndex: 3, left: 232, top: 64, opacity: badgeHl, transform: `translateY(${(1 - badgeHl) * 10}px)`, display: "flex", alignItems: "center", gap: 6, background: A.accent, color: "#fff", borderRadius: 999, padding: "4px 14px 4px 10px", fontSize: 17, fontWeight: 700 }}>
        <svg width={14} height={18} viewBox="0 0 14 18">
          <path d="M7 16 V3 M2 8 L7 3 L12 8" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {U.calloutPending}
      </div>

      <div style={{ position: "relative", zIndex: 1, width: CONTENT_W, padding: "24px 48px", transform: `translateY(${-scroll}px)` }}>
        <div style={{ fontSize: 32, fontWeight: 700 }}>{U.alertsTitle}</div>
        <div style={{ fontSize: 17, color: A.ink2, marginTop: 6, lineHeight: 1.5 }}>{U.alertsSub}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {U.tabs.map((tb, i) => (
            <span key={tb} style={{ fontSize: 16, padding: "4px 14px", borderRadius: 999, background: i === 0 ? A.ink : "#fff", color: i === 0 ? "#fff" : A.ink2, border: `1.5px solid ${i === 0 ? A.ink : A.line}` }}>
              {tb}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          {/* case 1: new damage on return */}
          <div style={{ background: "#fff", border: `1.5px solid ${confirmed ? A.line : A.accent}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 23, fontWeight: 700 }}>{U.plate}</span>
              <Chip>{U.returnChip}</Chip>
              <Chip>{U.maxSevHigh}</Chip>
              <span style={{ fontSize: 17, color: A.ink2 }}>{U.submitted1}</span>
              <span style={{ marginLeft: "auto", fontSize: 17, color: A.ink3 }}>{confirmed ? U.handled : U.openItems(1)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 15 }}>
              <span style={{ border: `1.5px solid ${A.line}`, borderRadius: 5, padding: "2px 8px" }}>{U.woRepairOpen}</span>
              <span style={{ color: A.accent, padding: "2px 0" }}>{U.toWorkOrders}</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1.5px solid ${A.line}` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{U.alertNew}</span>
                <span style={{ fontSize: 15, color: A.ink3 }}>{U.sevHigh}</span>
                <span style={{ marginLeft: "auto", fontSize: 15, color: confirmed ? A.ink : A.ink3, fontWeight: confirmed ? 700 : 400 }}>{confirmed ? U.statusConfirmed : U.statusOpen}</span>
              </div>
              <div style={{ fontSize: 18, marginTop: 4 }}>{U.alertMsg}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                {[false, true].map((cur) => (
                  <div key={String(cur)} style={{ position: "relative" }}>
                    <div style={{ width: 200, height: 140, borderRadius: 7, overflow: "hidden", border: `1.5px solid ${A.line}` }}>
                      <CarPhoto width={200} height={140} mirror scratch={cur} />
                    </div>
                    <div style={{ fontSize: 15, color: A.ink3, marginTop: 4 }}>{cur ? U.current : U.baseline}</div>
                    {cur && (
                      <div style={{ position: "absolute", left: 0, top: 0, width: 200, height: 140 }}>
                        <Viewfinder x={110} y={60} w={58} h={38} progress={scratchMark} thickness={3} arm={10} spread={24} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {confirmed ? (
                <div style={{ marginTop: 10, fontSize: 17, color: A.ink2 }}>{U.handledConfirm}</div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 17 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Check />
                    {U.record}
                  </span>
                  <Field w={120}>{U.location}</Field>
                  <Field w={70}>{U.dtype}</Field>
                  <Field w={70}>{U.dsev}</Field>
                  <div style={{ width: "100%", display: "flex", gap: 8 }}>
                    <Field w={420}>
                      <span style={{ color: A.ink3 }}>{U.notePh}</span>
                    </Field>
                    <span style={{ background: A.accent, color: "#fff", borderRadius: 7, padding: "7px 18px", fontWeight: 600, transform: `scale(${1 - press(t, k.confirmAt) * 0.06})` }}>{U.confirm}</span>
                    <span style={{ border: `1.5px solid ${A.line}`, borderRadius: 7, padding: "6px 16px", background: "#fff" }}>{U.dismiss}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* case 2: dirty interior, later dismissed */}
          <div style={{ background: "#fff", border: `1.5px solid ${dismissed ? A.line : A.accent}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 23, fontWeight: 700 }}>{U.calloutFree}</span>
              <Chip>{U.returnChip}</Chip>
              <Chip>{U.maxSevHigh}</Chip>
              <span style={{ fontSize: 17, color: A.ink2 }}>{U.submitted2}</span>
              <span style={{ marginLeft: "auto", fontSize: 17, color: A.ink3 }}>{dismissed ? U.handled : U.openItems(1)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 15 }}>
              <span style={{ border: `1.5px solid ${A.line}`, borderRadius: 5, padding: "2px 8px", color: dismissed ? A.ink3 : A.ink }}>{dismissed ? U.woCleanCancelled : U.woCleanOpen}</span>
              <span style={{ color: A.accent, padding: "2px 0" }}>{U.toWorkOrders}</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1.5px solid ${A.line}` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{U.alertDirty}</span>
                <span style={{ fontSize: 15, color: A.ink3 }}>{U.sevHigh}</span>
                <span style={{ marginLeft: "auto", fontSize: 15, color: dismissed ? A.ink : A.ink3, fontWeight: dismissed ? 700 : 400 }}>{dismissed ? U.statusDismissed : U.statusOpen}</span>
              </div>
              <div style={{ fontSize: 18, marginTop: 4 }}>{U.dirtyMsg}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <div>
                  <div style={{ width: 200, height: 140, borderRadius: 7, overflow: "hidden", border: `1.5px solid ${A.line}` }}>
                    <SeatPhoto />
                  </div>
                  <div style={{ fontSize: 15, color: A.ink3, marginTop: 4 }}>{U.currentRear}</div>
                </div>
              </div>
              {dismissed ? (
                <div style={{ marginTop: 10, fontSize: 17, color: A.ink2 }}>{U.handledDismiss}</div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", gap: 8, fontSize: 17 }}>
                  <Field w={420}>
                    <span style={{ color: A.ink3 }}>{U.notePh}</span>
                  </Field>
                  <span style={{ background: A.accent, color: "#fff", borderRadius: 7, padding: "7px 18px", fontWeight: 600 }}>{U.confirm}</span>
                  <span style={{ border: `1.5px solid ${A.line}`, borderRadius: 7, padding: "6px 16px", background: "#fff", transform: `scale(${1 - press(t, k.dismissAt) * 0.06})` }}>{U.dismiss}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* "most severe and longest waiting first" */}
      <div style={{ position: "absolute", left: CONTENT_W - 20, top: 214, opacity: sortHl, fontSize: 18, fontWeight: 700, color: A.accent, display: "flex", alignItems: "center", gap: 8 }}>
        <svg width={26} height={60} viewBox="0 0 26 60">
          <path d="M13 56 V6 M4 16 L13 6 L22 16" stroke={A.accent} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {U.calloutSort}
      </div>
      <Tap x={530} y={650} at={k.confirmAt} t={t} />
      <Tap x={642} y={1016 - SCROLL} at={k.dismissAt} t={t} />
    </div>
  );
};

// Back-seat photo for the dirty-interior alert.
const SeatPhoto: React.FC = () => (
  <svg width="100%" height="100%" viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
    <rect width={200} height={140} fill="#4a443f" />
    <rect x={14} y={30} width={172} height={54} rx={14} fill="#2c2825" />
    <rect x={14} y={86} width={172} height={40} rx={10} fill="#36312d" />
    <rect x={40} y={112} width={120} height={22} rx={4} fill="#58524c" />
    <path d="M60 118 l8 4 M90 116 l10 3 M120 120 l6 -3" stroke="#8a8279" strokeWidth={2} />
  </svg>
);

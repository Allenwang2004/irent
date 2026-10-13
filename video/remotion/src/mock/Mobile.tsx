// Mock screens of the phone web app (mobile/), drawn from its real copy and
// layout, used until screen recordings are dropped into public/demo/.
import React from "react";
import { Img, interpolate, staticFile } from "remotion";
import { CarPhoto, CarShape, CornerGuide, Garage } from "../components/CarArt";
import { clamp, ramp, Tap } from "../components/Common";
import { Viewfinder } from "../components/Viewfinder";
import { DEMO_UI as U } from "../copy";
import { REAL_CAR } from "./realCar";
import { C, FONT } from "../theme";

const M = { accent: "#c8102e", surface2: "#ececea", line: "#e0dfda", ink: "#111111", ink2: "#55544f", ink3: "#85847e", good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" };

// Clock and battery. Also drawn over the real screen recordings, whose own status
// bar is cropped off (time, recording dot, "back to app" link).
export const StatusBar: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: dark ? "#fff" : M.ink, pointerEvents: "none" }}>
    <div style={{ position: "absolute", top: 16, left: 30, fontSize: 16, fontWeight: 700 }}>9:41</div>
    <div style={{ position: "absolute", top: 18, right: 28, display: "flex", gap: 6 }}>
      <div style={{ width: 18, height: 11, borderRadius: 2, border: `1.5px solid ${dark ? "#fff" : M.ink}` }} />
    </div>
  </div>
);

const Screen: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <div style={{ position: "absolute", inset: 0, background: dark ? "#0d0d0d" : "#fff", fontFamily: FONT, color: dark ? "#fff" : M.ink }}>
    <StatusBar dark={dark} />
    {children}
  </div>
);

const Button: React.FC<{ y: number; label: string; outline?: boolean; pressed?: number }> = ({ y, label, outline, pressed = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: 24,
      right: 24,
      top: y,
      height: 52,
      borderRadius: 26,
      background: outline ? "#fff" : M.accent,
      border: outline ? `1.5px solid ${M.line}` : "none",
      color: outline ? M.ink : "#fff",
      fontSize: 18,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: `scale(${1 - pressed * 0.04})`,
    }}
  >
    {label}
  </div>
);

// ---------------------------------------------------------------- pickup intro
export const PickupIntro: React.FC<{ t: number; damages: { label: string; isNew?: boolean }[]; highlightAt: number; tapAt?: number }> = ({ t, damages, highlightAt, tapAt }) => {
  const hl = ramp(t, highlightAt, 0.45);
  return (
    <Screen>
      <div style={{ position: "absolute", top: 58, left: 24, fontSize: 16, color: M.ink2 }}>{U.back}</div>
      <div style={{ position: "absolute", top: 92, left: 0, right: 0, textAlign: "center", fontSize: 24, fontWeight: 700 }}>{U.pickupTitle}</div>
      <div style={{ position: "absolute", top: 132, left: 20, right: 20, textAlign: "center", fontSize: 15, color: M.ink2, lineHeight: 1.5, whiteSpace: "pre-line" }}>{U.pickupIntro}</div>
      <div style={{ position: "absolute", top: 196, left: 24, right: 24, background: M.surface2, borderRadius: 14, padding: "16px 0", textAlign: "center" }}>
        <div style={{ fontSize: 29, fontWeight: 700 }}>{U.plate}</div>
        <div style={{ fontSize: 15, color: M.ink2 }}>{U.carModel}</div>
      </div>
      <div style={{ position: "absolute", top: 304, left: 24, fontSize: 17, fontWeight: 700 }}>{U.needShots}</div>
      <div style={{ position: "absolute", top: 334, left: 24, fontSize: 15, color: M.ink2, lineHeight: "23px" }}>
        {U.steps.map((s, i) => (
          <div key={s}>
            {i + 1}. {s}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 518, left: 18, right: 18, padding: "10px 6px", borderRadius: 10, background: `rgba(215,0,15,${0.06 * hl})` }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{U.knownTitle(damages.length)}</div>
        <div style={{ marginTop: 6, fontSize: 15, color: M.ink2, lineHeight: "24px" }}>
          {damages.map((d) => (
            <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {d.label}
              {d.isNew && <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: M.accent, borderRadius: 999, padding: "1px 8px" }}>{U.newBadge}</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: M.ink3 }}>{U.knownHint}</div>
      </div>
      <Viewfinder x={12} y={510} w={366} h={74 + damages.length * 24 + 22} progress={hl} thickness={4} arm={20} spread={30} />
      <div style={{ position: "absolute", top: 690, left: 24, right: 24, fontSize: 13, color: M.ink3, whiteSpace: "pre-line" }}>{U.qualityHint}</div>
      <Button y={752} label={U.startShoot} pressed={tapAt !== undefined ? interpolate(t, [tapAt - 0.05, tapAt, tapAt + 0.2], [0, 1, 0], clamp) : 0} />
      {tapAt !== undefined && <Tap x={195} y={778} at={tapAt} t={t} />}
    </Screen>
  );
};

// ---------------------------------------------------------------- damage record page (pickup)
export const PickupDamages: React.FC<{ t: number; tapAt: number }> = ({ t, tapAt }) => {
  const shot = t >= tapAt + 0.35;
  const flash = interpolate(t, [tapAt + 0.25, tapAt + 0.35, tapAt + 0.6], [0, 1, 0], clamp);
  return (
    <Screen>
      <div style={{ position: "absolute", top: 70, left: 18, fontSize: 24, fontWeight: 700 }}>{U.damagesTitle}</div>
      <div style={{ position: "absolute", top: 108, left: 18, right: 18, fontSize: 15, color: M.ink2, lineHeight: 1.5 }}>{U.damagesIntro}</div>
      <div style={{ position: "absolute", top: 172, left: 18, fontSize: 19, fontWeight: 700 }}>{U.recorded}</div>
      <div style={{ position: "absolute", top: 204, left: 18, right: 18, fontSize: 15, color: M.ink2 }}>{U.recordedPickup}</div>
      <div style={{ position: "absolute", top: 240, left: 18, right: 18, height: 86, border: `1.5px solid ${M.line}`, borderRadius: 14, display: "flex", alignItems: "center", gap: 12, padding: "0 12px", boxSizing: "border-box" }}>
        <div style={{ width: 62, height: 62, borderRadius: 8, overflow: "hidden", background: M.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: M.ink3, flexShrink: 0 }}>
          {shot ? <CarPhoto width={62} height={62} mirror /> : U.notShot}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{U.oldDamageName}</div>
          <div style={{ fontSize: 14, color: M.ink3 }}>{U.oldDamageMeta}</div>
          {shot && <div style={{ fontSize: 13, color: M.good }}>{U.uploaded}</div>}
        </div>
        <div style={{ border: `1.5px solid ${M.line}`, borderRadius: 999, padding: "8px 16px", fontSize: 15 }}>{shot ? U.reshoot : U.shoot}</div>
      </div>
      <Tap x={330} y={283} at={tapAt} t={t} />
      <div style={{ position: "absolute", top: 356, left: 18, fontSize: 19, fontWeight: 700 }}>發現其他損傷？</div>
      <div style={{ position: "absolute", top: 388, left: 18, right: 18, fontSize: 15, color: M.ink2, lineHeight: 1.5 }}>如果看到上面沒列出的損傷，可以拍下來回報，避免之後被誤認為是你造成的。（不強制）</div>
      <Button y={470} label={U.addDamage} outline />
      <Button y={752} label={U.next} />
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
    </Screen>
  );
};

// ---------------------------------------------------------------- live camera
export type CamTimes = {
  alignFrom: number; // car starts off the guide
  alignTo: number; // lined up with the previous photo
  blurFrom: number;
  blurTo: number;
  farFrom?: number; // plate smaller than in the previous photo: "比上次遠，請靠近一點"
  farTo?: number;
  okAt: number; // "看得到車牌，可以拍了"
  shootAt: number; // shutter
  passAt: number; // banner "通過"
  darkHintFrom: number; // live hint "太暗了" before the shutter
  darkHintTo: number;
  darkFrom: number; // second attempt in a dark spot
  darkShootAt: number;
  failAt: number; // banner "需重拍"
};

const VF = { x: 16, y: 132, w: 358, h: 477 };

// Real car (tools/demo/real_car.py): live = current video frame; the overlay is the
// previous photo lined up with the aligned frame, plus that car's outline.
// Normal framing is REAL_CAR.zoom; "too far" zooms out to REAL_CAR.zoomFar so the car looks
// smaller (below 1, the edges show a blurred copy of the same frame).
const REAL_ZOOM = REAL_CAR.zoom;
const REAL_ORIGIN = `${REAL_CAR.origin[0] * 100}% ${REAL_CAR.origin[1] * 100}%`;
const RealView: React.FC<{ src: string; zoom: number }> = ({ src, zoom }) => (
  <>
    {zoom < 1 && <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(10px)", transform: "scale(1.05)" }} />}
    <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, transformOrigin: REAL_ORIGIN }} />
  </>
);
const realFrame = (i: number) => staticFile(`real/live/f${String(Math.max(0, Math.min(REAL_CAR.frames - 1, i))).padStart(3, "0")}.jpg`);
export const realFrameAt = (v: number) => realFrame(Math.round(v * REAL_CAR.fps));

// The previous photo's plate, as a dashed box like the app's guide ("車牌").
const plateBox = `M${REAL_CAR.plate.replace(/ /g, " L")} Z`;
const [labelX, labelY] = REAL_CAR.plateLabel;

export const CameraScreen: React.FC<{ t: number; times: CamTimes; live?: string }> = ({ t, times: k, live: liveSrc }) => {
  const align = interpolate(t, [k.alignFrom, k.alignTo], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  const blur = Math.max(0, Math.min(ramp(t, k.blurFrom, 0.25), 1 - ramp(t, k.blurTo, 0.3)));
  const shake = blur * Math.sin(t * 38) * 6;
  const darkHint = Math.max(0, Math.min(ramp(t, k.darkHintFrom, 0.3), 1 - ramp(t, k.darkHintTo, 0.3)));
  const far = k.farFrom === undefined ? 0 : Math.max(0, Math.min(ramp(t, k.farFrom, 0.35), 1 - ramp(t, k.farTo ?? 999, 0.45)));
  const dark = Math.max(darkHint, ramp(t, k.darkFrom, 0.4));
  const captured = t >= k.shootAt && t < k.darkFrom;
  const captured2 = t >= k.darkShootAt;
  const flash = interpolate(t, [k.shootAt, k.shootAt + 0.05, k.shootAt + 0.3], [0, 0.9, 0], clamp) + interpolate(t, [k.darkShootAt, k.darkShootAt + 0.05, k.darkShootAt + 0.3], [0, 0.9, 0], clamp);

  // live hint
  let hint = { text: U.liveAim, dot: "rgba(255,255,255,0.6)" };
  if (t >= k.alignFrom && align < 0.85) hint = { text: U.liveMoved, dot: M.warning };
  if (blur > 0.3) hint = { text: U.liveBlur, dot: M.critical };
  else if (far > 0.3) hint = { text: U.liveFar, dot: M.warning };
  else if (t >= k.okAt && t < k.darkFrom && darkHint < 0.5) hint = { text: U.liveOk, dot: M.good };
  if (dark > 0.5) hint = { text: U.liveDark, dot: M.critical };
  const showHint = !captured && !captured2;

  const live = { x: (1 - align) * 34, y: (1 - align) * -26 + far * 22, s: (1 - (1 - align) * 0.08) * (1 - far * 0.2), r: (1 - align) * -4 };
  const banner = captured && t >= k.passAt ? "pass" : captured2 && t >= k.failAt ? "fail" : null;

  return (
    <Screen dark>
      <div style={{ position: "absolute", top: 58, left: 16, fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{U.camClose}</div>
      <div style={{ position: "absolute", top: 56, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.6)", marginRight: 8 }}>{U.camProgress}</span>
          {U.camTitle}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>{U.camHint}</div>
      </div>
      {/* viewfinder */}
      <div style={{ position: "absolute", left: VF.x, top: VF.y, width: VF.w, height: VF.h, borderRadius: 10, overflow: "hidden", background: "#1d1d1c" }}>
        <div style={{ position: "absolute", inset: 0, filter: `blur(${blur * 5}px)`, transform: `translateX(${shake}px)` }}>
          {liveSrc ? (
            <RealView src={liveSrc} zoom={REAL_ZOOM - (REAL_ZOOM - REAL_CAR.zoomFar) * far} />
          ) : (
            <svg width={VF.w} height={VF.h} viewBox="0 0 300 400">
              <Garage />
              <g transform={`translate(${live.x} ${live.y}) rotate(${live.r} 150 250) scale(${live.s})`} style={{ transformOrigin: "150px 250px" }}>
                <CarShape />
              </g>
            </svg>
          )}
        </div>
        {/* previous photo, 40% */}
        {!captured && !captured2 && liveSrc && (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - dark }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.38 }}>
              <RealView src={staticFile("real/ref.jpg")} zoom={REAL_ZOOM} />
            </div>
            {/* the previous photo's car outline */}
            <svg width={VF.w} height={VF.h} viewBox="0 0 1080 1440" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, transform: `scale(${REAL_ZOOM})`, transformOrigin: REAL_ORIGIN, overflow: "visible" }}>
              {[REAL_CAR.outline, plateBox].map((d) => (
                <React.Fragment key={d}>
                  <path d={d} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={14} strokeLinejoin="round" />
                  <path d={d} fill="none" stroke="#ffffff" strokeWidth={7} strokeLinejoin="round" strokeDasharray="26 14" />
                </React.Fragment>
              ))}
              <rect x={labelX - 52} y={labelY - 78} width={104} height={52} rx={10} fill="rgba(0,0,0,0.55)" />
              <text x={labelX} y={labelY - 42} textAnchor="middle" fontSize={31} fill="#fff" fontFamily={FONT}>
                {U.plateLabel}
              </text>
            </svg>
          </div>
        )}
        {!captured && !captured2 && !liveSrc && (
          <svg width={VF.w} height={VF.h} viewBox="0 0 300 400" style={{ position: "absolute", inset: 0, opacity: 0.38 * (1 - dark) }}>
            <CarShape color="#ffffff" />
          </svg>
        )}
        {/* the app's generic guide is only used with the drawn car; the real car gets its own outline above */}
        {!captured && !captured2 && !liveSrc && (
          <svg width={VF.w} height={VF.h} viewBox="0 0 300 400" style={{ position: "absolute", inset: 0 }}>
            <CornerGuide />
          </svg>
        )}
        <div style={{ position: "absolute", inset: 0, background: "#000", opacity: dark * 0.82 }} />
        {showHint && (
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.65)", borderRadius: 999, padding: "7px 14px", fontSize: 15, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: hint.dot }} />
            {hint.text}
          </div>
        )}
        {!captured && !captured2 && (
          <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: 999, padding: "4px 12px", fontSize: 14, whiteSpace: "nowrap" }}>{U.plateBadge}</div>
        )}
        {banner && (
          <div style={{ position: "absolute", left: 8, right: 8, bottom: 8, background: "rgba(0,0,0,0.78)", borderRadius: 10, borderLeft: `5px solid ${banner === "pass" ? M.good : M.critical}`, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: banner === "pass" ? M.good : M.critical }} />
              {banner === "pass" ? U.passLabel : U.failLabel}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.82)", marginTop: 4, lineHeight: 1.45 }}>{banner === "pass" ? U.passText : U.failText}</div>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
      </div>
      {/* thumbnails */}
      <div style={{ position: "absolute", top: 622, left: 16, right: 16, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
        {U.steps.map((s, i) => (
          <div key={s} style={{ height: 42, borderRadius: 6, background: i < 3 ? "#3a3a38" : "#262624", border: i === 3 ? "2px solid #fff" : "2px solid transparent", boxSizing: "border-box" }} />
        ))}
      </div>
      {/* bottom controls */}
      {banner ? (
        <div style={{ position: "absolute", top: 700, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 20 }}>
          <div style={{ border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 999, padding: "12px 26px", fontSize: 16 }}>{U.retake}</div>
          {banner === "pass" && <div style={{ background: "#fff", color: "#000", borderRadius: 999, padding: "12px 26px", fontSize: 16, fontWeight: 600 }}>{U.use}</div>}
        </div>
      ) : (
        <div style={{ position: "absolute", top: 690, left: 16, right: 16, height: 80, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ width: 100 }} />
          <div style={{ width: 70, height: 70, borderRadius: 35, border: "4px solid #fff", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", width: 100, textAlign: "right" }}>{U.hideRef}</div>
        </div>
      )}
      <Tap x={195} y={730} at={k.shootAt} t={t} />
      <Tap x={195} y={730} at={k.darkShootAt} t={t} />
    </Screen>
  );
};

// ---------------------------------------------------------------- return start: billing stops, interior, lock, exterior
// mobile/src/app/rental/[rentalId]/in-use.tsx and inspection-flow.tsx (v4 order).
export type ReturnTimes = { tapAt: number; stopAt: number; interiorAt: number; lockAt: number; exteriorAt: number };

const Check: React.FC<{ on: number }> = ({ on }) => (
  <div style={{ width: 26, height: 26, borderRadius: 13, background: on > 0.5 ? M.good : "transparent", border: on > 0.5 ? "none" : `2px solid ${M.line}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${0.8 + 0.2 * on})`, flexShrink: 0 }}>
    {on > 0.5 && (
      <svg width={16} height={16} viewBox="0 0 24 24">
        <path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </div>
);

const ShotRow: React.FC<{ y: number; label: string; on: number; thumb?: React.ReactNode }> = ({ y, label, on, thumb }) => (
  <div style={{ position: "absolute", top: y, left: 18, right: 18, height: 62, borderBottom: `1px solid ${M.line}`, display: "flex", alignItems: "center", gap: 12 }}>
    <div style={{ width: 46, height: 46, borderRadius: 8, overflow: "hidden", background: M.surface2, opacity: on > 0.5 ? 1 : 0.5 }}>{on > 0.5 ? thumb : null}</div>
    <div style={{ flex: 1, fontSize: 17, fontWeight: 600 }}>{label}</div>
    <Check on={on} />
  </div>
);

export const ReturnStart: React.FC<{ t: number; times: ReturnTimes }> = ({ t, times: k }) => {
  const pressed = interpolate(t, [k.tapAt - 0.05, k.tapAt, k.tapAt + 0.2], [0, 1, 0], clamp);
  // 1. in use: tap "開始還車", the sheet says billing stopped
  if (t < k.interiorAt) {
    const sheet = ramp(t, k.tapAt + 0.2, 0.35);
    const hl = ramp(t, k.stopAt, 0.35);
    return (
      <Screen>
        <div style={{ position: "absolute", top: 70, left: 18, fontSize: 26, fontWeight: 700 }}>{U.inUseTitle}</div>
        <div style={{ position: "absolute", top: 112, left: 18, fontSize: 16, color: M.ink2 }}>{U.inUseSub}</div>
        <div style={{ position: "absolute", top: 160, left: 18, right: 18, height: 330, borderRadius: 14, overflow: "hidden", background: M.surface2 }}>
          <Img src={staticFile("real/car_wide.jpg")} style={{ width: 354, height: 330, objectFit: "cover", display: "block" }} />
        </div>
        <Button y={752} label={U.startReturn} pressed={pressed} />
        <Tap x={195} y={778} at={k.tapAt} t={t} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", opacity: sheet }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 360, background: "#fff", borderRadius: "22px 22px 0 0", padding: "28px 22px", boxSizing: "border-box", transform: `translateY(${(1 - sheet) * 360}px)` }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: hl > 0.5 ? M.accent : M.ink, background: `rgba(215,0,15,${0.08 * hl})`, borderRadius: 8, padding: "4px 6px", marginLeft: -6, display: "inline-block" }}>{U.billingStopped}</div>
          <div style={{ fontSize: 16, color: M.ink2, marginTop: 12, lineHeight: 1.6 }}>{U.returnRule}</div>
          <div style={{ position: "absolute", left: 22, right: 22, bottom: 40, height: 52, borderRadius: 26, background: M.accent, color: "#fff", fontSize: 18, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{U.confirmReturn}</div>
        </div>
      </Screen>
    );
  }
  // 2. interior shots with the countdown, then lock the doors
  if (t < k.exteriorAt) {
    const left = Math.max(0, 522 - Math.floor((t - k.interiorAt) * 4));
    const done = [0, 1, 2].map((i) => ramp(t, k.interiorAt + 0.25 + i * 0.3, 0.15));
    const lockPressed = interpolate(t, [k.lockAt - 0.05, k.lockAt, k.lockAt + 0.2], [0, 1, 0], clamp);
    const locked = ramp(t, k.lockAt + 0.25, 0.3);
    return (
      <Screen>
        <div style={{ position: "absolute", top: 70, left: 18, fontSize: 26, fontWeight: 700 }}>{U.interiorTitle}</div>
        <div style={{ position: "absolute", top: 72, right: 18, fontSize: 16, fontWeight: 700, color: M.accent, border: `1.5px solid ${M.accent}`, borderRadius: 999, padding: "4px 12px" }}>
          剩下 {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
        </div>
        {U.interiorShots.map((s, i) => (
          <ShotRow key={s} y={130 + i * 66} label={s} on={done[i]} thumb={<InteriorThumb kind={i} />} />
        ))}
        <div style={{ position: "absolute", top: 352, left: 18, right: 18, fontSize: 18, fontWeight: 700 }}>{U.lockStep}</div>
        <div style={{ position: "absolute", top: 384, left: 18, right: 18, fontSize: 15, color: M.ink2, lineHeight: 1.5 }}>{U.returnRule}</div>
        <Button y={752} label={U.lockButton} pressed={lockPressed} />
        <Tap x={195} y={778} at={k.lockAt} t={t} />
        {locked > 0 && (
          <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: locked, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <svg width={96} height={96} viewBox="0 0 48 48" style={{ transform: `scale(${0.85 + 0.15 * locked})` }}>
              <rect x={9} y={21} width={30} height={22} rx={4} fill={M.accent} />
              <path d="M16 21 v-6 a8 8 0 0 1 16 0 v6" fill="none" stroke={M.accent} strokeWidth={4} />
            </svg>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 16 }}>{U.locked}</div>
            <div style={{ fontSize: 16, color: M.ink2, marginTop: 10 }}>{U.lockNote}</div>
          </div>
        )}
      </Screen>
    );
  }
  // 3. exterior corners and the parking spot
  const k3 = ramp(t, k.exteriorAt, 0.3);
  return (
    <Screen>
      <div style={{ opacity: k3 }}>
        <div style={{ position: "absolute", top: 70, left: 18, fontSize: 26, fontWeight: 700 }}>{U.exteriorTitle}</div>
        <div style={{ position: "absolute", top: 72, right: 18, fontSize: 16, fontWeight: 700, color: M.good, border: `1.5px solid ${M.good}`, borderRadius: 999, padding: "4px 12px" }}>{U.locked}</div>
        {U.exteriorShots.map((s, i) => (
          <ShotRow key={s} y={130 + i * 66} label={s} on={ramp(t, k.exteriorAt + 0.35 + i * 0.28, 0.15)} thumb={i < 4 ? <Img src={staticFile("real/car_square.jpg")} style={{ width: 46, height: 46, objectFit: "cover", display: "block", transform: i % 2 === 1 ? "scaleX(-1)" : undefined }} /> : <div style={{ width: 46, height: 46, background: "#8a8a86" }} />} />
        ))}
      </div>
    </Screen>
  );
};

// ---------------------------------------------------------------- return: damages -> submit -> done
export const ReturnFlow: React.FC<{ t: number; nextAt: number; submitAt: number; doneAt: number }> = ({ t, nextAt, submitAt, doneAt }) => {
  if (t >= doneAt) {
    const k = ramp(t, doneAt, 0.4);
    return (
      <Screen>
        <div style={{ position: "absolute", top: 260, left: 0, right: 0, textAlign: "center", opacity: k }}>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: M.good, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={44} height={44} viewBox="0 0 24 24">
              <path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ marginTop: 26, fontSize: 26, fontWeight: 700 }}>{U.returnDone}</div>
          <div style={{ marginTop: 14, fontSize: 16, color: M.ink2, padding: "0 36px", lineHeight: 1.55 }}>{U.returnDoneText}</div>
        </div>
        <Button y={690} label={U.viewReceipt} />
        <Button y={752} label={U.home} outline />
      </Screen>
    );
  }
  if (t >= nextAt + 0.35) {
    // review: thumbnails + submit
    const uploading = t >= submitAt + 0.25;
    return (
      <Screen>
        <div style={{ position: "absolute", top: 70, left: 18, fontSize: 24, fontWeight: 700 }}>確認照片</div>
        <div style={{ position: "absolute", top: 108, left: 18, fontSize: 15, color: M.ink2 }}>點照片可以重拍。確認無誤後送出。</div>
        <div style={{ position: "absolute", top: 150, left: 18, right: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {U.steps.slice(0, 7).map((s, i) => (
            <div key={s}>
              <div style={{ height: 120, borderRadius: 8, overflow: "hidden", background: M.surface2 }}>
                {i >= 3 ? <CarPhoto width={112} height={120} mirror={i % 2 === 0} /> : <InteriorThumb kind={i} />}
              </div>
              <div style={{ fontSize: 12, color: M.ink3, marginTop: 4 }}>{s}</div>
            </div>
          ))}
        </div>
        <Button y={752} label={uploading ? "照片上傳中..." : U.submit} pressed={interpolate(t, [submitAt - 0.05, submitAt, submitAt + 0.2], [0, 1, 0], clamp)} />
        <Tap x={195} y={778} at={submitAt} t={t} />
      </Screen>
    );
  }
  return (
    <Screen>
      <div style={{ position: "absolute", top: 70, left: 18, fontSize: 24, fontWeight: 700 }}>{U.damagesTitle}</div>
      <div style={{ position: "absolute", top: 108, left: 18, right: 18, fontSize: 15, color: M.ink2, lineHeight: 1.5 }}>{U.damagesIntro}</div>
      <div style={{ position: "absolute", top: 172, left: 18, fontSize: 19, fontWeight: 700 }}>{U.recorded}</div>
      <div style={{ position: "absolute", top: 204, left: 18, right: 18, fontSize: 15, color: M.ink2 }}>請拍下這些已記錄損傷目前的狀況。</div>
      <div style={{ position: "absolute", top: 240, left: 18, right: 18, height: 86, border: `1.5px solid ${M.line}`, borderRadius: 14, display: "flex", alignItems: "center", gap: 12, padding: "0 12px", boxSizing: "border-box" }}>
        <div style={{ width: 62, height: 62, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          <CarPhoto width={62} height={62} mirror />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{U.oldDamageName}</div>
          <div style={{ fontSize: 14, color: M.ink3 }}>{U.oldDamageMeta}</div>
          <div style={{ fontSize: 13, color: M.good }}>{U.uploaded}</div>
        </div>
        <div style={{ border: `1.5px solid ${M.line}`, borderRadius: 999, padding: "8px 16px", fontSize: 15 }}>{U.reshoot}</div>
      </div>
      <div style={{ position: "absolute", top: 352, left: 12, right: 12, padding: "10px 6px", borderRadius: 10, background: "rgba(215,0,15,0.06)" }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{U.returnDamagesHeading}</div>
        <div style={{ marginTop: 6, fontSize: 15, color: M.ink2, lineHeight: 1.5 }}>{U.returnDamagesText}</div>
      </div>
      <Button y={480} label={U.addDamage} outline />
      <Button y={752} label={U.next} pressed={interpolate(t, [nextAt - 0.05, nextAt, nextAt + 0.2], [0, 1, 0], clamp)} />
      <Tap x={195} y={778} at={nextAt} t={t} />
    </Screen>
  );
};

// Simple drawings for the card-holder and seat photos in the review grid.
const InteriorThumb: React.FC<{ kind: number }> = ({ kind }) => (
  <svg width="100%" height="100%" viewBox="0 0 112 120" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
    <rect width={112} height={120} fill={kind === 0 ? "#5d6166" : "#4a443f"} />
    {kind === 0 && (
      <>
        <rect x={10} y={34} width={92} height={52} rx={4} fill="#3b3e42" />
        <rect x={16} y={40} width={36} height={40} rx={3} fill="#e9e3d0" />
        <rect x={60} y={40} width={36} height={40} rx={3} fill="#d7e3ea" />
      </>
    )}
    {kind === 1 && (
      <>
        <circle cx={36} cy={46} r={18} fill="none" stroke="#222" strokeWidth={6} />
        <rect x={12} y={70} width={36} height={44} rx={8} fill="#2c2825" />
        <rect x={64} y={64} width={36} height={50} rx={8} fill="#2c2825" />
      </>
    )}
    {kind === 2 && (
      <>
        <rect x={8} y={40} width={96} height={40} rx={10} fill="#2c2825" />
        <rect x={8} y={82} width={96} height={30} rx={8} fill="#36312d" />
      </>
    )}
  </svg>
);

// ---------------------------------------------------------------- vehicle list (mobile/src/app/page.tsx)
export const VehicleList: React.FC<{ t: number; pauseAt: number }> = ({ t, pauseAt }) => {
  const paused = t >= pauseAt;
  const k = ramp(t, pauseAt, 0.35);
  const Card: React.FC<{ plate: string; model: string; status: string; button: boolean; y: number; hl?: number }> = ({ plate, model, status, button, y, hl = 0 }) => (
    <div style={{ position: "absolute", top: y, left: 18, right: 18, border: `1.5px solid ${hl > 0 ? M.accent : M.line}`, borderRadius: 14, padding: "16px 16px", background: `rgba(215,0,15,${0.04 * hl})` }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{plate}</div>
      <div style={{ fontSize: 15, color: M.ink2, marginTop: 2 }}>
        {model}・{status}
      </div>
      {button && <div style={{ marginTop: 14, height: 46, borderRadius: 23, background: M.accent, color: "#fff", fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{U.pickupButton}</div>}
    </div>
  );
  return (
    <Screen>
      <div style={{ position: "absolute", top: 64, left: 18, right: 18, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 26, fontWeight: 700 }}>{U.listTitle}</span>
        <span style={{ fontSize: 15, color: M.accent }}>{U.historyLink}</span>
      </div>
      <Card plate={U.plate} model={U.carModel} status={paused ? U.maintenance : U.available} button={!paused} y={120} hl={k} />
      <Card plate={U.otherPlate} model={U.otherModel} status={U.available} button y={paused ? 236 : 284} />
    </Screen>
  );
};

// ---------------------------------------------------------------- history (mobile/src/app/history/page.tsx)
const Receipt: React.FC<{ label: string; state: "attention" | "clear"; n?: number }> = ({ label, state, n = 1 }) => (
  <div style={{ flex: 1, border: `1.5px solid ${M.line}`, borderRadius: 10, padding: "8px 12px" }}>
    <div style={{ fontSize: 15, fontWeight: 600 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: M.ink2, marginTop: 2 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: state === "attention" ? M.critical : M.good }} />
      {state === "attention" ? U.attention(n) : U.clear}
    </div>
  </div>
);

export const HistoryScreen: React.FC<{ t: number; tapAt: number }> = ({ t, tapAt }) => (
  <Screen>
    <div style={{ position: "absolute", top: 58, left: 18, fontSize: 15, color: M.ink2 }}>{U.home}</div>
    <div style={{ position: "absolute", top: 90, left: 18, fontSize: 28, fontWeight: 700 }}>{U.historyTitle}</div>
    <div style={{ position: "absolute", top: 134, left: 18, right: 18, fontSize: 15, color: M.ink2, lineHeight: 1.5 }}>{U.historySub}</div>
    {[
      { plate: U.plate, model: U.carModel, line: U.orderLine, a: "attention" as const, b: "attention" as const, y: 200 },
      { plate: U.otherPlate, model: U.otherModel, line: U.orderLine2, a: "clear" as const, b: "clear" as const, y: 380 },
    ].map((r) => (
      <div key={r.plate} style={{ position: "absolute", top: r.y, left: 18, right: 18, border: `1.5px solid ${M.line}`, borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{r.plate}</span>
          <span style={{ fontSize: 15, color: M.ink2 }}>{U.returned}</span>
        </div>
        <div style={{ fontSize: 15, color: M.ink2 }}>{r.model}</div>
        <div style={{ fontSize: 12, color: M.ink3, marginTop: 2 }}>{r.line}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Receipt label={U.pickupReceipt} state={r.a} />
          <Receipt label={U.returnReceipt} state={r.b} />
        </div>
      </div>
    ))}
    <Tap x={282} y={330} at={tapAt} t={t} />
  </Screen>
);

// ---------------------------------------------------------------- receipt (mobile/src/app/records/[inspectionId]/page.tsx)
export const ReceiptScreen: React.FC<{ kind: "pickup" | "return"; t: number; hlAt: number }> = ({ kind, t, hlAt }) => {
  const ret = kind === "return";
  const name = ret ? "還車" : "取車";
  const hl = ramp(t, hlAt, 0.4);
  const finding = ret
    ? { title: U.newDamageTitle, label: U.reviewConfirmed, text: U.newDamageText, color: M.critical }
    : { title: U.diffTitle, label: U.reviewPending, text: U.diffText, color: M.warning };
  return (
    <Screen>
      <div style={{ position: "absolute", top: 58, left: 18, display: "flex", gap: 16, fontSize: 15, color: M.ink2 }}>
        {U.receiptLinks.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div style={{ position: "absolute", top: 92, left: 18, fontSize: 24, fontWeight: 700 }}>{name}確認</div>
      <div style={{ position: "absolute", top: 128, left: 18, right: 18, fontSize: 14, color: M.ink2 }}>{ret ? U.returnMeta : U.pickupMeta}</div>
      <div style={{ position: "absolute", top: 168, left: 18, right: 18, background: M.surface2, borderRadius: 12, padding: "14px 14px", fontSize: 15, lineHeight: 1.55 }}>{U.receiptSummary(1)}</div>
      <div
        style={{
          position: "absolute",
          top: 264,
          left: 18,
          right: 18,
          background: "#fff",
          borderRadius: 12,
          borderLeft: `5px solid ${finding.color}`,
          boxShadow: `0 2px 8px rgba(0,0,0,0.08), 0 0 0 ${hl * 3}px rgba(215,0,15,${0.35 * hl})`,
          padding: "14px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>{finding.title}</span>
          <span style={{ fontSize: 12, color: M.ink3, flexShrink: 0 }}>{finding.label}</span>
        </div>
        <div style={{ fontSize: 14, color: M.ink2, marginTop: 6, lineHeight: 1.55 }}>{finding.text}</div>
      </div>
      <div style={{ position: "absolute", top: 448, left: 18, fontSize: 15, fontWeight: 600 }}>{U.photosTitle}</div>
      <div style={{ position: "absolute", top: 474, left: 18, fontSize: 12, color: M.ink3 }}>{U.photosNote(name)}</div>
      <div style={{ position: "absolute", top: 500, left: 18, right: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {U.steps.slice(0, 6).map((s, i) => (
          <div key={s}>
            <div style={{ height: 118, borderRadius: 6, overflow: "hidden", background: M.surface2 }}>
              {i >= 3 ? <CarPhoto width={112} height={118} mirror={i % 2 === 0} scratch={ret && i === 4} /> : <InteriorThumb kind={i} />}
            </div>
            <div style={{ fontSize: 12, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden" }}>{s}</div>
          </div>
        ))}
      </div>
    </Screen>
  );
};

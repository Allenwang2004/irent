import React from "react";
import { Audio, Easing, getStaticFiles, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DEMO_UI, STEPS } from "../copy";
import type { Cues } from "../timeline";
import { C, f, FONT, FPS } from "../theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.out(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.cubic);

// 0 -> 1 between two times (seconds), eased.
export const ramp = (t: number, from: number, dur = 0.4, easing = easeOut) =>
  interpolate(t, [from, from + dur], [0, 1], { ...clamp, easing });

export const useT = () => useCurrentFrame() / FPS;

export const useSpringAt = (at: number, config = { damping: 15, stiffness: 120 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - f(at), fps, config });
};

// Plays the narration lines of a scene at their cue times.
export const Narration: React.FC<{ cues: Cues }> = ({ cues }) => (
  <>
    {Object.values(cues).map((cue) => (
      <Sequence key={cue.key} from={f(cue.at)} durationInFrames={f(cue.end - cue.at) + 6}>
        <Audio src={staticFile(`audio/${cue.key}.wav`)} />
      </Sequence>
    ))}
  </>
);

export const Sfx: React.FC<{ at: number; name: "pop" | "shutter" | "ding" | "whoosh" | "tick"; volume?: number }> = ({ at, name, volume = 0.6 }) => (
  <Sequence from={f(at)} durationInFrames={f(1.2)}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

// Scene fade in/out.
export const sceneOpacity = (t: number, len: number, fadeIn = 0.3, fadeOut = 0.35) =>
  Math.min(interpolate(t, [0, fadeIn], [0, 1], clamp), interpolate(t, [len - fadeOut, len], [1, 0], clamp));

// "拍照 · 比對 · 處理" progress indicator used through the demo.
export const StepBar: React.FC<{ active: number; x?: number; y?: number; opacity?: number }> = ({ active, x = 1360, y = 54, opacity = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, opacity }}>
    {STEPS.map((s, i) => (
      <React.Fragment key={s.word}>
        {i > 0 && <div style={{ width: 26, height: 3, background: C.mute }} />}
        <div
          style={{
            padding: "8px 20px",
            borderRadius: 999,
            fontSize: 26,
            fontWeight: 900,
            background: i === active ? C.red : "transparent",
            color: i === active ? "#fff" : C.ink3,
            border: `2px solid ${i === active ? C.red : C.mute}`,
          }}
        >
          {s.word}
        </div>
      </React.Fragment>
    ))}
  </div>
);

// Mechanism number in a red circle (drawn, so it does not depend on font glyphs).
export const Num: React.FC<{ n: number; size?: number; filled?: boolean }> = ({ n, size = 34, filled = true }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: size / 2,
      background: filled ? C.red : "#fff",
      color: filled ? "#fff" : C.red,
      border: filled ? "none" : `2px solid ${C.red}`,
      fontFamily: FONT,
      fontSize: size * 0.62,
      fontWeight: 900,
      lineHeight: 1,
      flexShrink: 0,
      boxSizing: "border-box",
    }}
  >
    {n}
  </span>
);

// "機制 (2)(3) 疊影對齊・即時檢查" label used on every demo scene.
export const MechChip: React.FC<{ mech: number[]; label: string; size?: number }> = ({ mech, label, size = 30 }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      color: C.red,
      border: `2px solid ${C.red}`,
      borderRadius: 999,
      padding: "6px 22px 6px 12px",
      background: "#fff",
      whiteSpace: "nowrap",
    }}
  >
    {mech.length > 0 && (
      <>
        <span style={{ fontSize: size * 0.8, color: C.red, marginLeft: 8 }}>機制</span>
        {mech.map((n) => (
          <Num key={n} n={n} size={size * 1.15} />
        ))}
      </>
    )}
    <span style={{ marginLeft: mech.length ? 4 : 10 }}>{label}</span>
  </span>
);

// Right-hand explanation panel next to the phone.
export const SidePanel: React.FC<{ mech: number[]; chip: string; title: string; points: string[]; t: number; at: number }> = ({ mech, chip, title, points, t, at }) => {
  const k = ramp(t, at, 0.45);
  return (
    <div style={{ position: "absolute", left: 830, top: 230, width: 960, fontFamily: FONT, opacity: k, transform: `translateX(${(1 - k) * 40}px)` }}>
      <MechChip mech={mech} label={chip} />
      <div style={{ fontSize: 70, fontWeight: 900, color: C.ink, marginTop: 28, lineHeight: 1.2 }}>{title}</div>
      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 20 }}>
        {points.map((p, i) => {
          const pk = ramp(t, at + 0.35 + i * 0.25, 0.4);
          return (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 38, color: C.ink2, opacity: pk, transform: `translateY(${(1 - pk) * 12}px)` }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: C.red, flexShrink: 0 }} />
              {p}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// A tap indicator (finger press) at screen coordinates.
export const Tap: React.FC<{ x: number; y: number; at: number; t: number }> = ({ x, y, at, t }) => {
  const k = interpolate(t, [at - 0.15, at, at + 0.45], [0, 1, 1], clamp);
  const ring = interpolate(t, [at, at + 0.45], [0, 1], clamp);
  if (t < at - 0.15 || t > at + 0.5) return null;
  return (
    <>
      <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, background: "rgba(20,20,20,0.35)", opacity: k * (1 - ring * 0.6) }} />
      <div
        style={{
          position: "absolute",
          left: x - 22 - ring * 18,
          top: y - 22 - ring * 18,
          width: 44 + ring * 36,
          height: 44 + ring * 36,
          borderRadius: 999,
          border: "3px solid rgba(20,20,20,0.4)",
          opacity: 1 - ring,
        }}
      />
    </>
  );
};

// Phone bezel. Screen is 390 x 844 (iPhone points); content is drawn at that size.
export const PHONE = { w: 390, h: 844, bezel: 12 };
export const PhoneFrame: React.FC<{ x: number; y: number; scale?: number; children: React.ReactNode; label?: string | null; opacity?: number }> = ({
  x,
  y,
  scale = 1,
  children,
  label,
  opacity = 1,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `scale(${scale})`, transformOrigin: "top left", opacity }}>
    <div
      style={{
        width: PHONE.w + PHONE.bezel * 2,
        height: PHONE.h + PHONE.bezel * 2,
        borderRadius: 62,
        background: "#111",
        padding: PHONE.bezel,
        boxSizing: "border-box",
        boxShadow: "0 40px 90px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ position: "relative", width: PHONE.w, height: PHONE.h, borderRadius: 50, overflow: "hidden", background: "#fff" }}>
        {children}
        <div style={{ position: "absolute", top: 10, left: PHONE.w / 2 - 60, width: 120, height: 34, borderRadius: 20, background: "#000" }} />
      </div>
    </div>
    {label && (
      <div style={{ position: "absolute", left: -200, right: -200, top: PHONE.h + PHONE.bezel * 2 + 10, textAlign: "center", fontFamily: FONT, fontSize: 18, color: C.ink3, whiteSpace: "nowrap" }}>
        {label}
      </div>
    )}
  </div>
);

// Plays the screen recording when public/<file> exists; otherwise shows the mock.
export const RecordingOr: React.FC<{ file: string; width: number; height: number; startFrom?: number; children: React.ReactNode }> = ({
  file,
  width,
  height,
  startFrom = 0,
  children,
}) => {
  const exists = getStaticFiles().some((s) => s.name === file);
  if (!exists) return <>{children}</>;
  return <OffthreadVideo src={staticFile(file)} muted startFrom={f(startFrom)} style={{ width, height, objectFit: "cover", display: "block" }} />;
};
export const hasRecording = (file: string) => getStaticFiles().some((s) => s.name === file);
export const mockLabel = (file: string) => (hasRecording(file) ? null : `${DEMO_UI.mockLabel}・${DEMO_UI.mockNote}`);

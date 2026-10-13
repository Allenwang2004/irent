import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { clamp, DashedMark, demoMarked, DemoNote, DemoTag, easeInOut, hasRecording, MechChip, mockLabel, Narration, PHONE, PhoneFrame, ramp, RecordingOr, sceneOpacity, SidePanel, Sfx, StepBar, useT } from "../components/Common";
import { BrowserFrame } from "../components/DemoSlot";
import { DEMO_SHOTS, DEMO_UI as U, S5_PANELS as P, type DemoShotId } from "../copy";
import { ADMIN, AdminCases } from "../mock/Admin";
import { CameraScreen, HistoryScreen, PickupDamages, PickupIntro, ReceiptScreen, ReturnStart } from "../mock/Mobile";
import { S5A_CUES, S5A_LEN, S5B_CUES, S5B_LEN, S5C_CUES, S5C_LEN, S5F_CUES, S5F_LEN, S5G_CUES, S5G_LEN } from "../timeline";
import { C, FONT } from "../theme";

// Screen recordings: drop files with these names into public/demo/ and render again.
// (file names are listed in copy.ts DEMO_SHOTS)
export const DEMO_FILES = {
  a: DEMO_SHOTS.a.file,
  b: DEMO_SHOTS.b.file,
  c: DEMO_SHOTS.c.file,
  f: DEMO_SHOTS.f.file,
  g: DEMO_SHOTS.g.file,
};

const PHONE_X = 300;
const PHONE_Y = 46;

// startFrom: seconds to skip at the start of the recording.
const Phone: React.FC<{ id: DemoShotId; startFrom?: number; children: React.ReactNode }> = ({ id, startFrom = 0, children }) => {
  const file = DEMO_SHOTS[id].file;
  return (
    <>
      <PhoneFrame x={PHONE_X} y={PHONE_Y} scale={1.04} label={mockLabel(file)} marked={demoMarked(id)}>
        <RecordingOr file={file} width={PHONE.w} height={PHONE.h} startFrom={startFrom}>
          {children}
        </RecordingOr>
      </PhoneFrame>
      <DemoNote id={id} x={34} y={250} />
    </>
  );
};

// Slide between two phone screens.
const Swap: React.FC<{ t: number; at: number; a: React.ReactNode; b: React.ReactNode }> = ({ t, at, a, b }) => {
  const m = interpolate(t, [at, at + 0.4], [0, 1], { ...clamp, easing: easeInOut });
  return (
    <>
      {m < 1 && <div style={{ position: "absolute", inset: 0, transform: `translateX(${-m * PHONE.w}px)` }}>{a}</div>}
      {m > 0 && <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - m) * PHONE.w}px)` }}>{b}</div>}
    </>
  );
};

// ---------------------------------------------------------------- 5a pickup: known damage first
export const S5aPickup: React.FC = () => {
  const t = useT();
  const c = S5A_CUES;
  const swapAt = c.s5a_1.into(3.5);
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S5A_LEN) }}>
      <StepBar active={P.a.step} />
      <Phone id="a">
        <Swap
          t={t}
          at={swapAt}
          a={<PickupIntro t={t} damages={[{ label: U.knownOld }]} highlightAt={c.s5a_1.into(1.4)} />}
          b={<PickupDamages t={t} tapAt={swapAt + 0.8} />}
        />
      </Phone>
      <SidePanel mech={P.a.mech} chip={P.a.chip} title={P.a.title} points={P.a.points} t={t} at={0.15} />
      <Narration cues={c} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5b live camera with the previous photo
export const S5bCamera: React.FC = () => {
  const t = useT();
  const c = S5B_CUES;
  const b2 = c.s5b_2;
  // "拍照畫面疊著上次同角度的照片，讓用戶有參考依據，角度一致，能更清楚辨識是否有車損"
  // "手機即時檢查角度、遠近和光線，不合格當場提醒重拍"
  const times = {
    alignFrom: c.s5b_1.into(0.8),
    alignTo: c.s5b_1.into(4.4),
    blurFrom: b2.at,
    blurTo: b2.into(1.2),
    farFrom: b2.into(1.4),
    farTo: b2.into(2.1),
    darkHintFrom: b2.into(2.2),
    darkHintTo: b2.into(3.3),
    okAt: b2.into(3.4),
    shootAt: b2.into(3.8),
    passAt: b2.into(4.2),
    darkFrom: 999,
    darkShootAt: 999,
    failAt: 999,
  };
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S5B_LEN) }}>
      <StepBar active={P.b.step} />
      <Phone id="b">
        <CameraScreen t={t} times={times} />
      </Phone>
      <SidePanel mech={P.b.mech} chip={P.b.chip} title={P.b.title} points={P.b.points} t={t} at={0.15} />
      {/* "不用等事後通知補拍，用戶拍完就能離開" */}
      <GuardNote t={t} at={c.s5b_3.at - 0.1} />
      <Narration cues={c} />
      {!hasRecording(DEMO_FILES.b) && <Sfx at={times.shootAt} name="shutter" volume={0.6} />}
    </AbsoluteFill>
  );
};

const GuardNote: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  const k = ramp(t, at, 0.4);
  return (
    <div style={{ position: "absolute", left: 830, top: 700, width: 900, display: "flex", alignItems: "center", gap: 22, padding: "22px 30px", borderRadius: 22, border: `3px solid ${C.red}`, background: "#fff", fontFamily: FONT, opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>
      <svg width={54} height={54} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <circle cx={12} cy={12} r={11} fill={C.red} />
        <path d="M6.5 12.5 L10.5 16.5 L17.5 8" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <div style={{ fontSize: 36, fontWeight: 900, color: C.ink }}>{P.b.guardTitle}</div>
        <div style={{ fontSize: 26, color: C.ink2, marginTop: 6 }}>{P.b.guardText}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 5c return and leave
export const S5cReturn: React.FC = () => {
  const t = useT();
  const c = S5C_CUES;
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S5C_LEN) }}>
      <StepBar active={P.c.step} />
      <Phone id="c">
        {/* "原本還車要先鎖門，才能拍車內，評論裡也有人抱怨" / "現在改成先拍車內，用戶下車確認鎖門後，再拍車外" */}
        <ReturnStart t={t} times={{ tapAt: c.s5c_1.into(3.3), stopAt: c.s5c_1.into(3.6), interiorAt: c.s5c_2.into(0.55), lockAt: c.s5c_2.into(2.5), exteriorAt: c.s5c_2.into(3.6) }} />
      </Phone>
      <SidePanel mech={P.c.mech} chip={P.c.chip} title={P.c.title} points={P.c.points} t={t} at={0.15} />
      <QuoteNote t={t} at={c.s5c_1.into(2.8)} />
      <Narration cues={c} />
    </AbsoluteFill>
  );
};

// The renter review behind the new order (scraper/output, Google Play).
const QuoteNote: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  const k = ramp(t, at, 0.4);
  return (
    <div style={{ position: "absolute", left: 830, top: 690, width: 900, display: "flex", gap: 22, padding: "22px 30px", borderRadius: 22, background: C.panel, fontFamily: FONT, opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>
      <div style={{ fontSize: 96, lineHeight: 0.8, fontWeight: 900, color: C.red, flexShrink: 0 }}>“</div>
      <div>
        <div style={{ fontSize: 34, fontWeight: 900, color: C.ink, lineHeight: 1.35 }}>{P.c.quote}</div>
        <div style={{ fontSize: 22, color: C.ink3, marginTop: 8 }}>{P.c.quoteMeta}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 5f back office: confirm or dismiss
const Callout: React.FC<{ k: number; y: number; children: React.ReactNode }> = ({ k, y, children }) => (
  <div
    style={{
      position: "absolute",
      left: 1330,
      top: y,
      width: 400,
      background: "#fff",
      borderRadius: 20,
      boxShadow: "0 20px 50px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.05)",
      padding: "22px 26px",
      boxSizing: "border-box",
      fontFamily: FONT,
      opacity: k,
      transform: `translateX(${(1 - k) * 30}px)`,
    }}
  >
    {children}
  </div>
);

export const S5fCases: React.FC = () => {
  const t = useT();
  const c = S5F_CUES;
  const times = {
    // "營運人員只需要看 AI 標記的案件，最嚴重的問題排在最前面"
    badgeAt: c.s5f_1.into(0.6),
    sortAt: c.s5f_1.into(2.7),
    // "確認是新車損，就會記進這台車的紀錄，下一位取車時就會看到" / "如果檢查發現是誤報，按下駁回，車輛馬上恢復出租"
    confirmAt: c.s5f_2.into(0.7),
    scrollAt: c.s5f_3.at,
    dismissAt: c.s5f_3.into(1.95),
  };
  const k = ramp(t, 0.05, 0.5);
  const nextK = Math.min(ramp(t, c.s5f_2.into(1.4), 0.4), 1 - ramp(t, times.scrollAt, 0.3));
  const freeK = ramp(t, times.dismissAt + 0.6, 0.4);
  const label = mockLabel(DEMO_FILES.f);
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S5F_LEN), fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 210, top: 28 }}>
        <MechChip mech={P.f.mech} label={P.f.chip} size={34} />
      </div>
      <StepBar active={P.f.step} y={32} />
      {label && <div style={{ position: "absolute", right: 210, top: 936, fontSize: 18, color: C.ink3 }}>{label}</div>}
      <DemoTag id="f" style={{ left: 760, top: 18 }} />
      <div style={{ position: "absolute", left: 210, top: 100, opacity: k, transform: `translateY(${(1 - k) * 30}px)` }}>
        {demoMarked("f") && <DashedMark inset={-14} radius={30} />}
        <BrowserFrame url={U.adminUrl} width={ADMIN.w}>
          <RecordingOr file={DEMO_FILES.f} width={ADMIN.w} height={ADMIN.h}>
            <AdminCases t={t} times={times} />
          </RecordingOr>
        </BrowserFrame>
      </div>
      {/* next renter sees the confirmed damage */}
      <Callout k={nextK} y={300}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.red }}>{U.calloutNext}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, marginTop: 10 }}>{U.knownTitle(2)}</div>
        <div style={{ fontSize: 22, color: C.ink2, marginTop: 8, lineHeight: 1.6 }}>
          <div>{U.knownOld}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {U.knownNew}
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", background: C.red, borderRadius: 999, padding: "1px 10px" }}>{U.newBadge}</span>
          </div>
        </div>
      </Callout>
      {/* dismissed: work order cancelled, car rentable again */}
      <Callout k={freeK} y={520}>
        <div style={{ fontSize: 26, fontWeight: 900, color: C.ink }}>{U.calloutFree}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, fontSize: 26, fontWeight: 700 }}>
          <span style={{ color: C.ink3, textDecoration: "line-through" }}>{U.calloutFreeFrom}</span>
          <span style={{ color: C.ink3 }}>→</span>
          <span style={{ color: "#0a8a0a" }}>{U.calloutFreeTo}</span>
        </div>
        <div style={{ fontSize: 20, color: C.ink2, marginTop: 8 }}>{U.woCleanCancelled}</div>
      </Callout>
      <Narration cues={c} />
      <Sfx at={times.confirmAt} name="tick" volume={0.5} />
      <Sfx at={times.dismissAt} name="tick" volume={0.5} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5g renter receipts
export const S5gReceipt: React.FC = () => {
  const t = useT();
  const c = S5G_CUES;
  const tapAt = c.s5g_1.into(1.1);
  const returnAt = tapAt + 0.25;
  const pickupAt = c.s5g_2.at - 0.2;
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S5G_LEN) }}>
      <StepBar active={P.g.step} />
      <Phone id="g">
        <Swap
          t={t}
          at={returnAt}
          a={<HistoryScreen t={t} tapAt={tapAt} />}
          b={<Swap t={t} at={pickupAt} a={<ReceiptScreen kind="return" t={t} hlAt={c.s5g_1.into(2.6)} />} b={<ReceiptScreen kind="pickup" t={t} hlAt={c.s5g_2.into(1.2)} />} />}
        />
      </Phone>
      <SidePanel mech={P.g.mech} chip={P.g.chip} title={P.g.title} points={P.g.points} t={t} at={0.15} />
      <Narration cues={c} />
    </AbsoluteFill>
  );
};

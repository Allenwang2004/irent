// S5d: what the lab-server worker checks. S5e: alerts turn into work orders.
import React from "react";
import { AbsoluteFill } from "remotion";
import { CarPhoto } from "../components/CarArt";
import { MechChip, mockLabel, Narration, PhoneFrame, ramp, RecordingOr, sceneOpacity, Sfx, StepBar, useSpringAt, useT, PHONE } from "../components/Common";
import { Viewfinder } from "../components/Viewfinder";
import { DEMO_UI as U, ORDERS, S5_PANELS as P, WORKER as W } from "../copy";
import { VehicleList } from "../mock/Mobile";
import { S5D_CUES, S5D_LEN, S5E_CUES, S5E_LEN } from "../timeline";
import { C, FONT } from "../theme";

const Header: React.FC<{ mech: number[]; chip: string; step: number }> = ({ mech, chip, step }) => (
  <>
    <div style={{ position: "absolute", left: 140, top: 46 }}>
      <MechChip mech={mech} label={chip} size={36} />
    </div>
    <StepBar active={step} y={52} />
  </>
);

const ServerIcon: React.FC = () => (
  <svg width={70} height={70} viewBox="0 0 70 70">
    {[8, 28, 48].map((y) => (
      <g key={y}>
        <rect x={6} y={y} width={58} height={16} rx={4} fill="none" stroke={C.ink} strokeWidth={4} />
        <circle cx={52} cy={y + 8} r={3} fill={C.red} />
      </g>
    ))}
  </svg>
);

const Arrow: React.FC<{ x: number; y: number; w: number; k: number }> = ({ x, y, w, k }) => (
  <svg width={w} height={30} style={{ position: "absolute", left: x, top: y - 15, opacity: k }}>
    <path d={`M4 15 H${(w - 14) * k + 4}`} stroke={C.red} strokeWidth={5} strokeLinecap="round" />
    {k > 0.95 && <path d={`M${w - 18} 5 L${w - 6} 15 L${w - 18} 25`} stroke={C.red} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
);

// ---------------------------------------------------------------- 5d worker
const PH = { y: 236, w: 240, h: 170, xs: [700, 1070, 1440] };

export const S5dWorker: React.FC = () => {
  const t = useT();
  const c = S5D_CUES;
  const workerK = useSpringAt(c.s5d_1.at - 0.2);
  const photosAt = c.s5d_1.into(1.9);
  const rule1At = c.s5d_2.at;
  const rule2At = c.s5d_2.into(1.4);
  const checkAt = [photosAt + 0.2, c.s5d_3.at, c.s5d_3.into(1.5), c.s5d_3.into(2.6)];
  const voteAt = [c.s5d_4.at + 0.1, c.s5d_4.into(0.45), c.s5d_4.into(0.8)];
  const majorityAt = c.s5d_4.into(1.5);
  const outAt = c.s5d_4.into(2.4);
  const pairHl = (i: number) => ramp(t, i === 0 ? rule1At : rule2At, 0.35) * (1 - ramp(t, i === 0 ? rule2At : c.s5d_3.at, 0.3));

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S5D_LEN), fontFamily: FONT }}>
      <Header mech={P.d.mech} chip={P.d.chip} step={P.d.step} />

      {/* the worker */}
      <div style={{ position: "absolute", left: 140, top: PH.y - 6, width: 470, height: PH.h + 40, background: C.panel, borderRadius: 24, padding: "24px 28px", boxSizing: "border-box", opacity: workerK, transform: `translateY(${(1 - workerK) * 30}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <ServerIcon />
          <div>
            <div style={{ fontSize: 40, fontWeight: 900, color: C.ink }}>{W.title}</div>
            <div style={{ fontSize: 22, color: C.ink2 }}>{W.where}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22, fontSize: 26, fontWeight: 700, color: C.ink }}>
          <svg width={34} height={34} viewBox="0 0 24 24">
            <circle cx={12} cy={12} r={11} fill={C.red} />
            <path d="M6.5 12.5 L10.5 16 L17.5 8.5" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {W.poll}
        </div>
      </div>

      {/* baselines */}
      <div style={{ position: "absolute", left: PH.xs[0], top: 132, fontSize: 26, fontWeight: 700, color: C.ink3, opacity: ramp(t, photosAt, 0.4) }}>{W.chainTitle}</div>
      {W.rules.map((r, i) => {
        const k = ramp(t, i === 0 ? rule1At : rule2At, 0.4);
        const x1 = PH.xs[i] + PH.w / 2;
        const x2 = PH.xs[i + 1] + PH.w / 2;
        return (
          <React.Fragment key={r}>
            <div style={{ position: "absolute", left: x1, width: x2 - x1, top: 160, textAlign: "center", fontSize: 28, fontWeight: 900, color: C.red, opacity: k }}>{r}</div>
            <svg width={x2 - x1} height={30} style={{ position: "absolute", left: x1, top: 202, opacity: k }}>
              <path d={`M3 28 V8 H${x2 - x1 - 3} V28`} stroke={C.red} strokeWidth={4} fill="none" />
            </svg>
          </React.Fragment>
        );
      })}
      {W.photos.map((label, i) => {
        const k = ramp(t, photosAt + i * 0.15, 0.4);
        const hl = Math.max(i <= 1 ? pairHl(0) : 0, i >= 1 ? pairHl(1) : 0);
        return (
          <div key={label} style={{ position: "absolute", left: PH.xs[i], top: PH.y, opacity: k, transform: `translateY(${(1 - k) * 20}px)` }}>
            <div style={{ width: PH.w, height: PH.h, borderRadius: 14, overflow: "hidden", boxShadow: `0 10px 26px rgba(0,0,0,0.14), 0 0 0 ${hl * 5}px rgba(215,0,15,${hl})` }}>
              <CarPhoto width={PH.w} height={PH.h} mirror scratch={i === 2} />
            </div>
            <div style={{ marginTop: 10, textAlign: "center", fontSize: 26, fontWeight: 700, color: C.ink }}>{label}</div>
            {i === 2 && (
              <div style={{ position: "absolute", left: 0, top: 0, width: PH.w, height: PH.h }}>
                <Viewfinder x={130} y={72} w={70} h={46} progress={ramp(t, rule2At + 0.4, 0.4)} thickness={4} arm={12} spread={30} />
              </div>
            )}
          </div>
        );
      })}

      {/* what is checked */}
      <div style={{ position: "absolute", left: 140, top: 500, width: 1640, display: "flex", gap: 30 }}>
        {W.checks.map((ch, i) => {
          const k = ramp(t, checkAt[i], 0.4);
          return (
            <div key={ch.what} style={{ flex: 1, height: 120, borderRadius: 20, border: `2px solid ${C.line}`, background: "#fff", padding: "18px 26px", boxSizing: "border-box", opacity: k, transform: `translateY(${(1 - k) * 20}px)` }}>
              <div style={{ fontSize: 26, color: C.ink2, fontWeight: 700 }}>{ch.what}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: C.ink, marginTop: 4 }}>{ch.find}</div>
            </div>
          );
        })}
      </div>

      {/* three reads, majority vote, alert */}
      <div style={{ position: "absolute", left: 140, top: 690, width: 1640, height: 150, display: "flex", alignItems: "center", gap: 26 }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: C.ink, width: 290, opacity: ramp(t, voteAt[0] - 0.2, 0.3) }}>{W.votesTitle}</div>
        {W.votes.map((v, i) => {
          const k = ramp(t, voteAt[i], 0.3);
          const yes = v !== "無";
          return (
            <div key={i} style={{ width: 150, height: 74, borderRadius: 16, border: `2px solid ${yes ? C.red : C.mute}`, color: yes ? C.red : C.ink3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, opacity: k, transform: `scale(${0.85 + 0.15 * k})` }}>
              {v}
            </div>
          );
        })}
        <div style={{ position: "relative", width: 90, height: 30 }}>
          <Arrow x={0} y={15} w={90} k={ramp(t, majorityAt - 0.2, 0.3)} />
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, color: C.ink, opacity: ramp(t, majorityAt, 0.3) }}>{W.majority}</div>
        <div style={{ position: "relative", width: 90, height: 30 }}>
          <Arrow x={0} y={15} w={90} k={ramp(t, outAt - 0.2, 0.3)} />
        </div>
        <div style={{ background: C.red, color: "#fff", fontSize: 36, fontWeight: 900, borderRadius: 999, padding: "12px 34px", opacity: ramp(t, outAt, 0.3), transform: `scale(${0.85 + 0.15 * ramp(t, outAt, 0.3)})` }}>{W.output}</div>
      </div>

      <Narration cues={c} />
      <Sfx at={photosAt} name="pop" volume={0.4} />
      <Sfx at={outAt} name="ding" volume={0.45} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5e work orders
const COLS = [560, 300, 260];
const ROW_H = 96;
const FILE_E = "demo/s5e-vehicles.mp4";

export const S5eOrders: React.FC = () => {
  const t = useT();
  const c = S5E_CUES;
  const rowAt = [c.s5e_1.into(1.9), c.s5e_1.into(3.2), c.s5e_2.at, c.s5e_2.into(1.4)];
  const pauseAt = c.s5e_1.into(4.4);
  const headK = ramp(t, 0.15, 0.4);
  const pauseHl = ramp(t, pauseAt, 0.35);
  const phoneK = useSpringAt(0.3);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: sceneOpacity(t, S5E_LEN), fontFamily: FONT }}>
      <Header mech={P.e.mech} chip={P.e.chip} step={P.e.step} />
      <div style={{ position: "absolute", left: 140, top: 138, fontSize: 52, fontWeight: 900, color: C.ink, opacity: headK }}>{ORDERS.title}</div>

      {/* table */}
      <div style={{ position: "absolute", left: 140, top: 240, width: COLS.reduce((a, b) => a + b, 0), opacity: headK }}>
        <div style={{ display: "flex", height: 64, alignItems: "center", borderBottom: `3px solid ${C.ink}` }}>
          {ORDERS.head.map((h, i) => (
            <div key={h} style={{ width: COLS[i], fontSize: 28, fontWeight: 700, color: C.ink2, paddingLeft: 20, boxSizing: "border-box" }}>
              {h}
            </div>
          ))}
        </div>
        {ORDERS.rows.map((r, i) => {
          const k = ramp(t, rowAt[i] - 0.15, 0.35);
          const pause = r.pause === "是";
          return (
            <div key={r.alert} style={{ display: "flex", height: ROW_H, alignItems: "center", borderBottom: `2px solid ${C.line}`, opacity: k, transform: `translateX(${(1 - k) * 20}px)` }}>
              <div style={{ width: COLS[0], fontSize: i === 3 ? 28 : 34, fontWeight: 700, color: i === 3 ? C.ink2 : C.ink, paddingLeft: 20, boxSizing: "border-box" }}>{r.alert}</div>
              <div style={{ width: COLS[1], paddingLeft: 20, boxSizing: "border-box" }}>
                {r.order === "—" ? (
                  <span style={{ fontSize: 32, color: C.ink3 }}>{r.order}</span>
                ) : (
                  <span style={{ fontSize: 30, fontWeight: 700, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "4px 16px" }}>{r.order}</span>
                )}
              </div>
              <div style={{ width: COLS[2], paddingLeft: 20, boxSizing: "border-box" }}>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: pause ? (pauseHl > 0.5 ? "#fff" : C.red) : C.ink3,
                    background: pause ? `rgba(215,0,15,${pauseHl})` : "transparent",
                    border: pause ? `2px solid ${C.red}` : "none",
                    borderRadius: 10,
                    padding: "4px 18px",
                  }}
                >
                  {r.pause}
                </span>
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 28, fontSize: 26, color: C.ink2, lineHeight: 1.5, width: 1040, opacity: ramp(t, pauseAt + 0.3, 0.4) }}>{ORDERS.note}</div>
      </div>

      {/* the paused car, enlarged */}
      <div style={{ position: "absolute", left: 1392, top: 540, width: 386, background: "#fff", borderRadius: 18, boxShadow: "0 18px 46px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.05)", padding: "18px 22px", boxSizing: "border-box", zIndex: 2, opacity: ramp(t, pauseAt + 0.25, 0.35), transform: `translateX(${(1 - ramp(t, pauseAt + 0.25, 0.35)) * 20}px)` }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.ink }}>{U.plate}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, fontSize: 28, fontWeight: 700 }}>
          <span style={{ color: C.ink3, textDecoration: "line-through" }}>{U.available}</span>
          <span style={{ color: C.ink3 }}>→</span>
          <span style={{ color: C.red }}>整備中</span>
        </div>
        <div style={{ fontSize: 20, color: C.ink2, marginTop: 6 }}>{U.calloutPause}・取車清單上不能借</div>
      </div>
      {/* the renter's car list */}
      <div style={{ opacity: phoneK, transform: `translateX(${(1 - phoneK) * 60}px)` }}>
        <PhoneFrame x={1410} y={128} scale={0.86} label={mockLabel(FILE_E)}>
          <RecordingOr file={FILE_E} width={PHONE.w} height={PHONE.h}>
            <VehicleList t={t} pauseAt={pauseAt} />
          </RecordingOr>
        </PhoneFrame>
      </div>

      <Narration cues={c} />
      {rowAt.slice(0, 3).map((a, i) => (
        <Sfx key={i} at={a} name="pop" volume={0.4} />
      ))}
      <Sfx at={pauseAt} name="tick" volume={0.5} />
    </AbsoluteFill>
  );
};

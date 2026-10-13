// Still images of the mock screens for the solution deck (not part of the video).
import React from "react";
import { Composition, registerRoot } from "remotion";
import { FontLoader } from "../src/components/FontLoader";
import { PhoneFrame, PHONE } from "../src/components/Common";
import { BrowserFrame } from "../src/components/DemoSlot";
import { ADMIN, AdminCases } from "../src/mock/Admin";
import { CameraScreen, HistoryScreen, PickupIntro, ReceiptScreen, VehicleList } from "../src/mock/Mobile";
import { DEMO_UI as U } from "../src/copy";

const PAD = 130;
const PW = PHONE.w + PHONE.bezel * 2 + PAD * 2;
const PH = PHONE.h + PHONE.bezel * 2 + PAD * 2;
const T = 5;
const never = 99;

const Phone: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <FontLoader />
    <PhoneFrame x={PAD} y={PAD - 20}>{children}</PhoneFrame>
  </>
);

const camOk = { alignFrom: 0, alignTo: 0.5, blurFrom: never, blurTo: never + 1, okAt: 1, shootAt: never, passAt: never, darkHintFrom: never, darkHintTo: never + 1, darkFrom: never, darkShootAt: never, failAt: never };
const camFail = { alignFrom: 0, alignTo: 0.5, blurFrom: never, blurTo: never + 1, okAt: 1, shootAt: 0.2, passAt: never, darkHintFrom: never, darkHintTo: never + 1, darkFrom: 1, darkShootAt: 2, failAt: 2.5 };

const SHOTS: Record<string, React.FC> = {
  pickup: () => <Phone><PickupIntro t={T} damages={[{ label: U.knownOld }]} highlightAt={0} /></Phone>,
  "camera-ok": () => <Phone><CameraScreen t={T} times={camOk} /></Phone>,
  "camera-fail": () => <Phone><CameraScreen t={T} times={camFail} /></Phone>,
  "receipt-return": () => <Phone><ReceiptScreen kind="return" t={T} hlAt={never} /></Phone>,
  "receipt-pickup": () => <Phone><ReceiptScreen kind="pickup" t={T} hlAt={never} /></Phone>,
  vehicles: () => <Phone><VehicleList t={T} pauseAt={0} /></Phone>,
  history: () => <Phone><HistoryScreen t={T} tapAt={never} /></Phone>,
  admin: () => (
    <>
      <FontLoader />
      <div style={{ position: "absolute", left: PAD, top: PAD - 20 }}>
        <BrowserFrame url={U.adminUrl} width={ADMIN.w}>
          <AdminCases t={T} times={{ badgeAt: never, sortAt: never, confirmAt: never, scrollAt: never, dismissAt: never }} />
        </BrowserFrame>
      </div>
    </>
  ),
};

const Root: React.FC = () => (
  <>
    {Object.entries(SHOTS).map(([id, C]) => (
      <Composition key={id} id={id} component={C} durationInFrames={300} fps={30} width={id === "admin" ? ADMIN.w + PAD * 2 : PW} height={id === "admin" ? ADMIN.h + 48 + PAD * 2 : PH} />
    ))}
  </>
);
registerRoot(Root);

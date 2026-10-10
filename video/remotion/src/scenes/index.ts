import type React from "react";
import { S0Cover } from "./S0Cover";
import { S1Problems } from "./S1Problems";
import { S2Voices } from "./S2Voices";
import { S3Cause } from "./S3Cause";
import { S4Method } from "./S4Method";
import { S5dWorker, S5eOrders } from "./S5Back";
import { S5aPickup, S5bCamera, S5cReturn, S5fCases, S5gReceipt } from "./S5Demo";
import { S6Tech, S7Benefit, S8Outro } from "./S6to8";

export const SCENE_COMPONENTS: Record<string, React.FC> = {
  S0: S0Cover,
  S1: S1Problems,
  S2: S2Voices,
  S3: S3Cause,
  S4: S4Method,
  S5a: S5aPickup,
  S5b: S5bCamera,
  S5c: S5cReturn,
  S5d: S5dWorker,
  S5e: S5eOrders,
  S5f: S5fCases,
  S5g: S5gReceipt,
  S6: S6Tech,
  S7: S7Benefit,
  S8: S8Outro,
};

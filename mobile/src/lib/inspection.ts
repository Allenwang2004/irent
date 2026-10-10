// Shared definitions for registration, pickup and return inspections.
// The back office (web/src/lib/inspections.ts) and the worker keep matching
// label maps; change them together.

export type InspectionKind = "registration" | "pickup" | "return";
export type PhotoCategory = "card" | "angle" | "known_damage" | "extra";

export const PHOTO_BUCKET = "inspection-photos";
export const MAX_EXTRA_PHOTOS = 6;

// A guide key for the live camera overlay: "card", an iRent image_type, or none.
export type GuideKey = "card" | 1 | 2 | 3 | 4 | 10 | 11;

export type RequiredStep = {
  slot: string;
  category: "card" | "angle";
  imageType?: 1 | 2 | 3 | 4 | 10 | 11;
  title: string;
  hint: string;
  guide: GuideKey;
};

// Order follows iRent's app: card holder first, then interior, then the four corners.
export const REQUIRED_STEPS: RequiredStep[] = [
  {
    slot: "card",
    category: "card",
    title: "加油卡／停車卡",
    hint: "請拍攝駕駛座上方遮陽板的卡夾，加油卡和停車卡都要入鏡",
    guide: "card",
  },
  { slot: "angle-10", category: "angle", imageType: 10, title: "車內裝（前座）", hint: "請拍攝前座，包含方向盤與座椅", guide: 10 },
  { slot: "angle-11", category: "angle", imageType: 11, title: "車內裝（後座）", hint: "請拍攝後座，包含整排座椅與地墊", guide: 11 },
  { slot: "angle-1", category: "angle", imageType: 1, title: "車身左前", hint: "請站在左前方斜角，拍到整個車頭與車牌", guide: 1 },
  { slot: "angle-2", category: "angle", imageType: 2, title: "車身右前", hint: "請站在右前方斜角，拍到整個車頭與車牌", guide: 2 },
  { slot: "angle-3", category: "angle", imageType: 3, title: "車身左後", hint: "請站在左後方斜角，拍到整個車尾與車牌", guide: 3 },
  { slot: "angle-4", category: "angle", imageType: 4, title: "車身右後", hint: "請站在右後方斜角，拍到整個車尾與車牌", guide: 4 },
];

export const REQUIRED_SLOTS = REQUIRED_STEPS.map((s) => s.slot);

// On return, the card and interior are shot before the renter locks the doors;
// the corners after. Billing stops at the Return tap, so the renter gets a
// short window to finish the interior and lock, or the return is cancelled.
export const INTERIOR_SLOTS = ["card", "angle-10", "angle-11"];
export const RETURN_LOCK_SECONDS = 5 * 60;

export const ANGLE_LABELS: Record<number, string> = {
  1: "左前",
  2: "右前",
  3: "左後",
  4: "右後",
  10: "前座",
  11: "後座",
};

// Where a renter can say an extra damage is.
export const DAMAGE_AREAS = ["車頭", "車尾", "左側", "右側", "車頂", "車內", "其他"] as const;

export const knownDamageSlot = (damageId: number) => `known-${damageId}`;
export const extraSlot = (index: number) => `extra-${index}`;

export function storagePath(kind: InspectionKind, inspectionId: string, slot: string) {
  return `${kind}/${inspectionId}/${slot}.jpg`;
}

export type KnownDamage = {
  id: number;
  location: string;
  damage_type: string;
  severity: string;
  image_type: number | null;
  note: string | null;
};

export type Vehicle = { id: number; plate: string; car_model: string };

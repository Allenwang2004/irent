// The required return photos, in the order iRent's app asks for them.
// image_type values are iRent's upload codes; the back office (web/) keeps a
// matching label map, so change both together.

export const PHOTO_STEPS = [
  { imageType: 10, title: "車內裝（前座）", hint: "請拍攝前座，包含方向盤與座椅" },
  { imageType: 11, title: "車內裝（後座）", hint: "請拍攝後座，包含整排座椅與地墊" },
  { imageType: 1, title: "車身左前", hint: "請站在左前方斜角，拍到整個車頭與車牌" },
  { imageType: 2, title: "車身右前", hint: "請站在右前方斜角，拍到整個車頭與車牌" },
  { imageType: 3, title: "車身左後", hint: "請站在左後方斜角，拍到整個車尾與車牌" },
  { imageType: 4, title: "車身右後", hint: "請站在右後方斜角，拍到整個車尾與車牌" },
] as const;

export type ImageType = (typeof PHOTO_STEPS)[number]["imageType"];

export const IMAGE_TYPES: readonly number[] = PHOTO_STEPS.map((s) => s.imageType);

export const PHOTO_BUCKET = "return-photos";

export function photoPath(sessionId: string, imageType: number) {
  return `${sessionId}/${imageType}.jpg`;
}

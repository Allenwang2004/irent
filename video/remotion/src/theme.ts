// Visual system for the whole video. Change colours or the font here only.

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const C = {
  red: "#D7000F", // iRent app red
  redSoft: "#FCE9EA",
  ink: "#141414",
  ink2: "#454545",
  ink3: "#8C8C8C",
  line: "#E4E4E4",
  mute: "#D3D3D3",
  panel: "#F5F5F5",
  bg: "#FFFFFF",
} as const;

export const FONT = "'Noto Sans TC Variable', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";

// Seconds to frames.
export const f = (seconds: number) => Math.round(seconds * FPS);

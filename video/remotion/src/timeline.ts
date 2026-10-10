// Scene lengths and narration cues, derived from the narration audio lengths in
// public/audio/lines.json. Re-generate the audio and everything re-times itself.

import { NARRATION } from "./copy";
import TUNED from "./tuned-lengths.json";

const seconds: Record<string, number> = Object.fromEntries(NARRATION.map((l) => [l.key, l.seconds]));
export const lineText: Record<string, string> = Object.fromEntries(NARRATION.map((l) => [l.key, l.text]));

// Animations inside a line were timed against the line lengths in tuned-lengths.json.
// cue.into(s) = "s seconds into the line" at that pace, stretched or squeezed to the
// current recording, so a faster or slower voice keeps the picture on the right words.
export type Cue = { key: string; at: number; end: number; into: (s: number) => number };
export type Cues = Record<string, Cue>;
const tuned: Record<string, number> = TUNED;

// Place lines one after another; gap = pause before the line (seconds).
function chain(steps: [key: string, gap: number][]): Cues {
  let t = 0;
  const out: Cues = {};
  for (const [key, gap] of steps) {
    const len = seconds[key];
    if (len === undefined) throw new Error(`Missing narration line ${key}`);
    t += gap;
    const at = t;
    const k = Math.min(1.6, Math.max(0.6, len / (tuned[key] ?? len)));
    out[key] = { key, at, end: t + len, into: (s: number) => at + s * k };
    t += len;
  }
  return out;
}
const lastEnd = (c: Cues) => Math.max(...Object.values(c).map((x) => x.end));

// ---------------------------------------------------------------- per scene
// tail = seconds the picture stays after the last line (time to read / breathe).
export const S0_LEN = 3.6;

export const S1_CUES = chain([["s1_1", 0.3], ["s1_2", 0.35], ["s1_3", 0.45], ["s1_4", 0.45]]);
export const S1_LEN = lastEnd(S1_CUES) + 0.6;

export const S2_CUES = chain([["s2_1", 0.35], ["s2_2", 0.35], ["s2_3", 0.35], ["s2_4", 0.3], ["s2_5", 0.3]]);
export const S2_LEN = lastEnd(S2_CUES) + 1.0;

export const S3_CUES = chain([["s3_1", 0.4], ["s3_2", 0.3]]);
export const S3_LEN = lastEnd(S3_CUES) + 0.8;

export const S4_CUES = chain([["s4_1", 0.4], ["s4_2", 0.35], ["s4_3", 0.35], ["s4_4", 0.35]]);
export const S4_LEN = lastEnd(S4_CUES) + 2.0;

export const S5A_CUES = chain([["s5a_1", 0.5]]);
export const S5A_LEN = lastEnd(S5A_CUES) + 0.6;

export const S5B_CUES = chain([["s5b_1", 0.4], ["s5b_2", 0.4]]);
export const S5B_LEN = lastEnd(S5B_CUES) + 0.9;

export const S5C_CUES = chain([["s5c_1", 0.4]]);
export const S5C_LEN = lastEnd(S5C_CUES) + 0.6;

export const S5D_CUES = chain([["s5d_1", 0.45], ["s5d_2", 0.3], ["s5d_3", 0.3], ["s5d_4", 0.3]]);
export const S5D_LEN = lastEnd(S5D_CUES) + 0.8;

export const S5E_CUES = chain([["s5e_1", 0.5], ["s5e_2", 0.35]]);
export const S5E_LEN = lastEnd(S5E_CUES) + 0.9;

export const S5F_CUES = chain([["s5f_1", 0.5], ["s5f_2", 0.4]]);
export const S5F_LEN = lastEnd(S5F_CUES) + 1.0;

export const S5G_CUES = chain([["s5g_1", 0.5], ["s5g_2", 0.4]]);
export const S5G_LEN = lastEnd(S5G_CUES) + 0.8;

export const S6_CUES = chain([["s6_1", 0.5], ["s6_2", 0.4]]);
export const S6_LEN = lastEnd(S6_CUES) + 0.9;

export const S7_CUES = chain([["s7_1", 0.4], ["s7_2", 0.4]]);
export const S7_LEN = lastEnd(S7_CUES) + 0.9;

export const S8_CUES = chain([["s8_1", 0.5]]);
export const S8_LEN = lastEnd(S8_CUES) + 1.3;

// ---------------------------------------------------------------- whole video
const ORDER: { id: string; len: number; cues: Cues }[] = [
  { id: "S0", len: S0_LEN, cues: {} },
  { id: "S1", len: S1_LEN, cues: S1_CUES },
  { id: "S2", len: S2_LEN, cues: S2_CUES },
  { id: "S3", len: S3_LEN, cues: S3_CUES },
  { id: "S4", len: S4_LEN, cues: S4_CUES },
  { id: "S5a", len: S5A_LEN, cues: S5A_CUES },
  { id: "S5b", len: S5B_LEN, cues: S5B_CUES },
  { id: "S5c", len: S5C_LEN, cues: S5C_CUES },
  { id: "S5d", len: S5D_LEN, cues: S5D_CUES },
  { id: "S5e", len: S5E_LEN, cues: S5E_CUES },
  { id: "S5f", len: S5F_LEN, cues: S5F_CUES },
  { id: "S5g", len: S5G_LEN, cues: S5G_CUES },
  { id: "S6", len: S6_LEN, cues: S6_CUES },
  { id: "S7", len: S7_LEN, cues: S7_CUES },
  { id: "S8", len: S8_LEN, cues: S8_CUES },
];

export const SCENES = ORDER.reduce<{ id: string; start: number; len: number; cues: Cues }[]>((acc, s) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].len : 0;
  return [...acc, { ...s, start }];
}, []);
export const TOTAL_LEN = SCENES[SCENES.length - 1].start + SCENES[SCENES.length - 1].len;
export const sceneStart = (id: string) => SCENES.find((s) => s.id === id)!.start;

// Subtitle blocks, in seconds from the start of the whole video. A block can
// collect several lines (the three problems at the end of S2 stay on one line).
// `side` moves the subtitle to the right half while a phone is shown on the left.
export type SubBlock = { from: number; to: number; side: "center" | "right"; parts: { at: number; text: string }[] };

const GROUPS: Record<string, string[][]> = {
  S2: [["s2_1"], ["s2_2"], ["s2_3", "s2_4", "s2_5"]],
};
const RIGHT_SIDE = new Set(["S5a", "S5b", "S5c", "S5g"]);

export const SUBTITLES: SubBlock[] = SCENES.flatMap((s) => {
  const keys = Object.keys(s.cues);
  const groups = GROUPS[s.id] ?? keys.map((k) => [k]);
  return groups.map((g) => {
    const first = s.cues[g[0]];
    const last = s.cues[g[g.length - 1]];
    return {
      from: s.start + first.at,
      to: s.start + last.end + 0.25,
      side: RIGHT_SIDE.has(s.id) ? "right" : "center",
      parts: g.map((k) => ({ at: s.start + s.cues[k].at, text: lineText[k] })),
    } as SubBlock;
  });
});

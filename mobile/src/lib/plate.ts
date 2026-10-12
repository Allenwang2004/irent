// Does a reading match the rented car's plate? Same rules as eval/plate_eval.py,
// which measured them on the hackathon photos: the app knows which car it is,
// so it only confirms the plate, allowing one wrong character.

const MATCH_EDITS = 1;

// Recognition mistakes common on plates. Letters sit in the first three places
// and digits in the last four, so a character is read back to the right kind.
const TO_DIGIT: Record<string, string> = { O: "0", D: "0", Q: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6", T: "7" };
const TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "2": "Z", "5": "S", "8": "B", "6": "G", "7": "T" };

export function normalizePlate(plate: string) {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function edits(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Plate-length windows of a reading, with letters and digits put back in place.
function candidates(text: string) {
  const s = normalizePlate(text);
  const out: string[] = [];
  for (let i = 0; i < Math.max(1, s.length - 6); i++) {
    const w = s.slice(i, i + 7);
    if (w.length < 6) continue;
    const letters = [...w.slice(0, 3)].map((c) => TO_LETTER[c] ?? c).join("");
    const digits = [...w.slice(3)].map((c) => TO_DIGIT[c] ?? c).join("");
    out.push(letters + digits);
  }
  return out;
}

export function matchesPlate(texts: string[], expected: string) {
  const want = normalizePlate(expected);
  return texts.some((t) => candidates(t).some((c) => edits(c, want) <= MATCH_EDITS));
}

// Where a plate sits in a frame, in fractions of the frame (3:4 viewfinder).
export type PlatePose = { cx: number; cy: number; width: number; aspect: number };

// Largest differences from the previous photo still counted as the same shot.
// Measured on the hackathon pickup/return pairs: 95% of
// matching pairs pass, 77% of visibly mis-aimed ones and nearly all shots of the
// other side of the car are caught (front and rear of the same side often look alike).
const MAX_SHIFT = 0.18;
const MAX_SIZE = 0.35; // |log| of the width ratio: about 1.4x
const MAX_SHAPE = 0.4; // |log| of the aspect change

export type PoseCheck = "same" | "moved" | "closer" | "farther";

export function comparePose(previous: PlatePose, current: PlatePose): PoseCheck {
  const shift = Math.hypot(current.cx - previous.cx, current.cy - previous.cy);
  const size = Math.log(current.width / previous.width);
  const shape = Math.abs(Math.log(current.aspect / previous.aspect));
  // A different spot or angle also changes the size, so report it first.
  if (shift > MAX_SHIFT || shape > MAX_SHAPE) return "moved";
  if (size > MAX_SIZE) return "closer";
  if (size < -MAX_SIZE) return "farther";
  return "same";
}

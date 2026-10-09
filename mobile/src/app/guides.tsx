import type { GuideKey } from "@/lib/inspection";

// Dashed alignment guides drawn over the live camera, one per photo step.
// Drawn in a 300x400 box, the same 3:4 shape as the viewfinder and the
// captured photo, so what lines up on screen lines up in the saved image.
//
// Corner shots are three-quarter views. Standing at the left front corner, the
// nose is on the left of the frame and the car's side runs off to the right;
// the other corners mirror or swap that.

const STROKE = {
  fill: "none",
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

// Dark underlay keeps the white dashes visible on bright or white cars.
function Dashed({ d }: { d: string }) {
  return (
    <>
      <path d={d} {...STROKE} stroke="rgb(0 0 0 / 0.45)" strokeWidth={4} />
      <path d={d} {...STROKE} stroke="white" strokeWidth={2.5} strokeDasharray="7 5" />
    </>
  );
}

function Label({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <g>
      <rect x={x - 20} y={y - 10} width={40} height={20} rx={4} fill="rgb(0 0 0 / 0.55)" />
      <text x={x} y={y + 4.5} textAnchor="middle" fontSize={12} fill="white">
        {children}
      </text>
    </g>
  );
}

// Three-quarter car with the end face (front or rear) on the left, drawn in a
// 300x400 box and then scaled up so the car fills most of the frame.
const CORNER_SCALE = 1.16;
const CORNER_SHIFT = { x: -27, y: -32 };
const PLATE_LABEL = { x: 84, y: 233 };

function CornerShape({ end }: { end: "front" | "rear" }) {
  const body =
    end === "front"
      ? "M40 292 L36 222 L62 206 L104 158 L148 146 L238 152 L262 196 L268 282 L146 298 Z"
      : "M40 292 L36 216 L58 160 L96 148 L200 150 L242 198 L268 214 L268 282 L146 298 Z";
  const faceEdge = end === "front" ? "M136 190 L142 298" : "M110 156 L120 300";
  const glass =
    end === "front" ? "M64 206 L136 190 L150 148" : "M58 166 L108 158 L118 214 L44 222";
  return (
    <g transform={`translate(${CORNER_SHIFT.x} ${CORNER_SHIFT.y}) scale(${CORNER_SCALE})`}>
      <Dashed d={body} />
      <Dashed d={faceEdge} />
      <Dashed d={glass} />
      <Dashed d="M150 286 a18 22 0 1 0 36 0 a18 22 0 1 0 -36 0" />
      <Dashed d="M228 280 a15 19 0 1 0 30 0 a15 19 0 1 0 -30 0" />
      <Dashed d="M58 248 h52 v20 h-52 Z" />
    </g>
  );
}

function Corner({ end, faceSide }: { end: "front" | "rear"; faceSide: "left" | "right" }) {
  // The label sits outside the mirrored group so its text never reads backwards.
  const labelX = PLATE_LABEL.x * CORNER_SCALE + CORNER_SHIFT.x;
  const labelY = PLATE_LABEL.y * CORNER_SCALE + CORNER_SHIFT.y;
  return (
    <>
      {faceSide === "left" ? (
        <CornerShape end={end} />
      ) : (
        <g transform="translate(300 0) scale(-1 1)">
          <CornerShape end={end} />
        </g>
      )}
      <Label x={faceSide === "left" ? labelX : 300 - labelX} y={labelY}>
        車牌
      </Label>
    </>
  );
}

function FrontSeats() {
  return (
    <>
      <Dashed d="M44 120 h96 v120 h-96 Z" />
      <Dashed d="M160 120 h96 v120 h-96 Z" />
      <Dashed d="M38 240 h108 v70 h-108 Z" />
      <Dashed d="M154 240 h108 v70 h-108 Z" />
      <Dashed d="M92 168 m-34 0 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0" />
    </>
  );
}

function RearSeats() {
  return (
    <>
      <Dashed d="M34 110 h232 v140 h-232 Z" />
      <Dashed d="M28 250 h244 v70 h-244 Z" />
      <Dashed d="M110 110 v140 M190 110 v140" />
    </>
  );
}

// The card holder on the driver's sun visor: parking card on the left, fuel
// card on the right, as in iRent's own photo guide.
function CardHolder() {
  return (
    <>
      <Dashed d="M30 130 h240 v140 h-240 Z" />
      <Dashed d="M110 130 v140 M190 130 v140" />
      <Label x={70} y={200}>停車卡</Label>
      <Label x={230} y={200}>加油卡</Label>
    </>
  );
}

const GUIDES: Record<string, React.ReactNode> = {
  card: <CardHolder />,
  10: <FrontSeats />,
  11: <RearSeats />,
  1: <Corner end="front" faceSide="left" />,
  2: <Corner end="front" faceSide="right" />,
  3: <Corner end="rear" faceSide="right" />,
  4: <Corner end="rear" faceSide="left" />,
};

export function Guide({ guide }: { guide: GuideKey }) {
  return (
    <svg
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      {GUIDES[String(guide)]}
    </svg>
  );
}

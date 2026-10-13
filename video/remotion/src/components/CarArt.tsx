import React from "react";
import { DEMO_UI } from "../copy";

// A flat illustration of a car seen from the front-left corner, drawn in the
// same 300 x 400 box and with the same outline as the app's photo guide
// (mobile/src/app/guides.tsx, CornerShape "front"), so the guide lines up with it.
const CORNER_SCALE = 1.16;
const CORNER_SHIFT = { x: -27, y: -32 };

const BODY = "M40 292 L36 222 L62 206 L104 158 L148 146 L238 152 L262 196 L268 282 L146 298 Z";

export const CarShape: React.FC<{ scratch?: boolean; color?: string; plateText?: boolean }> = ({ scratch = false, color = "#F4F4F2", plateText = true }) => (
  <g transform={`translate(${CORNER_SHIFT.x} ${CORNER_SHIFT.y}) scale(${CORNER_SCALE})`}>
    {/* shadow */}
    <ellipse cx={156} cy={300} rx={128} ry={12} fill="rgba(0,0,0,0.35)" />
    <path d={BODY} fill={color} stroke="#9a9a96" strokeWidth={1.5} strokeLinejoin="round" />
    {/* side panel shade */}
    <path d="M142 192 L262 196 L268 282 L146 298 Z" fill="#E2E2DE" />
    {/* windscreen and side windows */}
    <path d="M64 206 L104 160 L148 148 L136 190 Z" fill="#2B3440" />
    <path d="M150 150 L234 154 L252 190 L142 192 Z" fill="#36404C" />
    <path d="M196 152 L198 191" stroke="#E2E2DE" strokeWidth={4} />
    {/* front face */}
    <path d="M38 224 L136 192 L142 296 L40 292 Z" fill="#ECECE8" />
    <path d="M44 232 L72 224 L74 236 L46 244 Z" fill="#FFF8DA" stroke="#b9b9b4" strokeWidth={1} />
    <path d="M108 214 L132 207 L133 220 L110 226 Z" fill="#FFF8DA" stroke="#b9b9b4" strokeWidth={1} />
    <path d="M56 262 L126 252 L128 274 L58 282 Z" fill="#3a3a3a" />
    {/* plate */}
    <rect x={58} y={248} width={52} height={20} fill="#fff" stroke="#333" strokeWidth={1.5} />
    {plateText && (
      <text x={84} y={262.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#222" fontFamily="Arial">
        {DEMO_UI.plate}
      </text>
    )}
    {/* wheels */}
    <ellipse cx={168} cy={286} rx={18} ry={22} fill="#1d1d1d" />
    <ellipse cx={168} cy={286} rx={9} ry={11} fill="#8d8d8d" />
    <ellipse cx={243} cy={280} rx={15} ry={19} fill="#1d1d1d" />
    <ellipse cx={243} cy={280} rx={7.5} ry={9.5} fill="#8d8d8d" />
    {scratch && <path d="M70 236 L84 241 L96 238 L110 244" stroke="#C0261F" strokeWidth={3} fill="none" strokeLinecap="round" />}
  </g>
);

// Parking-garage background behind the car.
export const Garage: React.FC = () => (
  <>
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8f9499" />
        <stop offset="1" stopColor="#5f6469" />
      </linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4a4d50" />
        <stop offset="1" stopColor="#2c2e30" />
      </linearGradient>
    </defs>
    <rect x={0} y={0} width={300} height={230} fill="url(#wall)" />
    <rect x={0} y={60} width={300} height={10} fill="#d9b23a" opacity={0.7} />
    <rect x={0} y={230} width={300} height={170} fill="url(#floor)" />
    <path d="M10 400 L80 236 M290 400 L240 236" stroke="#e8e8e8" strokeWidth={4} opacity={0.5} />
  </>
);

// Dashed guide outline, copied from the app.
const STROKE = { fill: "none", strokeLinejoin: "round" as const, strokeLinecap: "round" as const, vectorEffect: "non-scaling-stroke" as const };
const Dashed: React.FC<{ d: string }> = ({ d }) => (
  <>
    <path d={d} {...STROKE} stroke="rgb(0 0 0 / 0.45)" strokeWidth={4} />
    <path d={d} {...STROKE} stroke="white" strokeWidth={2.5} strokeDasharray="7 5" />
  </>
);
export const CornerGuide: React.FC = () => (
  <>
    <g transform={`translate(${CORNER_SHIFT.x} ${CORNER_SHIFT.y}) scale(${CORNER_SCALE})`}>
      <Dashed d={BODY} />
      <Dashed d="M136 190 L142 298" />
      <Dashed d="M64 206 L136 190 L150 148" />
      <Dashed d="M150 286 a18 22 0 1 0 36 0 a18 22 0 1 0 -36 0" />
      <Dashed d="M228 280 a15 19 0 1 0 30 0 a15 19 0 1 0 -30 0" />
      <Dashed d="M58 248 h52 v20 h-52 Z" />
    </g>
    <g>
      <rect x={84 * CORNER_SCALE + CORNER_SHIFT.x - 20} y={233 * CORNER_SCALE + CORNER_SHIFT.y - 10} width={40} height={20} rx={4} fill="rgb(0 0 0 / 0.55)" />
      <text x={84 * CORNER_SCALE + CORNER_SHIFT.x} y={233 * CORNER_SCALE + CORNER_SHIFT.y + 4.5} textAnchor="middle" fontSize={12} fill="white">
        {DEMO_UI.plateLabel}
      </text>
    </g>
  </>
);

// A "photo" of the car: background + car, optionally mirrored (right-front view).
export const CarPhoto: React.FC<{ width: number; height: number; mirror?: boolean; scratch?: boolean }> = ({ width, height, mirror = false, scratch = false }) => (
  <svg width={width} height={height} viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
    <Garage />
    <g transform={mirror ? "translate(300 0) scale(-1 1)" : undefined}>
      <CarShape scratch={scratch} plateText={!mirror} />
    </g>
    {mirror && (
      // plate text drawn outside the mirrored group so it reads correctly
      <text x={300 - (84 * CORNER_SCALE + CORNER_SHIFT.x)} y={262.5 * CORNER_SCALE + CORNER_SHIFT.y} textAnchor="middle" fontSize={11.6} fontWeight={700} fill="#222" fontFamily="Arial">
        {DEMO_UI.plate}
      </text>
    )}
  </svg>
);

// Pieces for the manpower estimate (S1) and the benefit (S7).
import React from "react";
import { C, FONT } from "../theme";

export const Person: React.FC<{ color: string; size?: number }> = ({ color, size = 64 }) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 40 50">
    <circle cx={20} cy={12} r={9} fill={color} />
    <path d="M4 48 v-10 a16 14 0 0 1 32 0 v10 Z" fill={color} />
  </svg>
);

export const Block: React.FC<{ n: string; unit: string; k: number; red?: boolean; size?: number }> = ({ n, unit, k, red, size = 112 }) => (
  <div style={{ textAlign: "center", opacity: k, transform: `translateY(${(1 - k) * 18}px)`, fontFamily: FONT }}>
    <div style={{ fontSize: size, fontWeight: 900, color: red ? C.red : C.ink, lineHeight: 1.05 }}>{n}</div>
    <div style={{ fontSize: size * 0.29, color: C.ink2, whiteSpace: "nowrap" }}>{unit}</div>
  </div>
);

export const Op: React.FC<{ s: string; k: number; size?: number }> = ({ s, k, size = 76 }) => (
  <div style={{ fontSize: size, fontWeight: 700, color: C.mute, opacity: k, margin: `0 ${size * 0.34}px`, paddingBottom: size * 0.5, fontFamily: FONT }}>{s}</div>
);

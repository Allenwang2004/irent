import React from "react";
import { C } from "../theme";

// The red camera-viewfinder corners: the visual motif of the whole video.
// progress 0 = corners pushed outwards by `spread` and invisible, 1 = locked on the box.
export const Viewfinder: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  progress: number;
  color?: string;
  thickness?: number;
  arm?: number;
  spread?: number;
  opacity?: number;
}> = ({ x, y, w, h, progress, color = C.red, thickness = 8, arm = 56, spread = 140, opacity = 1 }) => {
  const off = (1 - progress) * spread;
  const a = Math.min(arm, w / 2, h / 2);
  const line = `${thickness}px solid ${color}`;
  const corners: React.CSSProperties[] = [
    { left: x - off, top: y - off, borderLeft: line, borderTop: line },
    { left: x + w - a + off, top: y - off, borderRight: line, borderTop: line },
    { left: x - off, top: y + h - a + off, borderLeft: line, borderBottom: line },
    { left: x + w - a + off, top: y + h - a + off, borderRight: line, borderBottom: line },
  ];
  const alpha = Math.max(0, Math.min(1, progress * 2.5)) * opacity;
  return (
    <>
      {corners.map((s, i) => (
        <div
          key={i}
          style={{ position: "absolute", width: a, height: a, boxSizing: "border-box", opacity: alpha, ...s }}
        />
      ))}
    </>
  );
};

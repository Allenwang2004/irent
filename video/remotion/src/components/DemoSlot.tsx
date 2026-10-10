import React from "react";
import { getStaticFiles, OffthreadVideo, staticFile } from "remotion";
import { DEMO } from "../copy";
import { C, FONT } from "../theme";

// A place for a screen recording. When public/<file> exists it plays;
// otherwise a placeholder says which file to drop in.
export const DemoSlot: React.FC<{
  file: string;
  label: string;
  width: number;
  height: number;
  startFromSeconds?: number;
}> = ({ file, label, width, height, startFromSeconds = 0 }) => {
  const exists = getStaticFiles().some((s) => s.name === file);
  if (exists) {
    return (
      <OffthreadVideo
        src={staticFile(file)}
        muted
        startFrom={Math.round(startFromSeconds * 30)}
        style={{ width, height, objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <div
      style={{
        width,
        height,
        boxSizing: "border-box",
        background: "repeating-linear-gradient(135deg, #F7F7F7 0 22px, #F1F1F1 22px 44px)",
        border: `3px dashed ${C.mute}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        fontFamily: FONT,
        color: C.ink3,
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 700, color: C.ink2 }}>
        {DEMO.placeholderTitle}：{label}
      </div>
      <div style={{ fontSize: 24 }}>
        {DEMO.placeholderHint}
        <span style={{ fontWeight: 700, color: C.red }}>{file.replace(/^demo\//, "")}</span>
        {DEMO.placeholderHint2}
      </div>
    </div>
  );
};

export const BrowserFrame: React.FC<{ url: string; width: number; children: React.ReactNode }> = ({
  url,
  width,
  children,
}) => (
  <div
    style={{
      width,
      borderRadius: 18,
      overflow: "hidden",
      background: "#fff",
      boxShadow: "0 30px 80px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)",
    }}
  >
    <div style={{ height: 48, background: "#F2F2F2", display: "flex", alignItems: "center", gap: 10, padding: "0 18px" }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
        <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
      ))}
      <div
        style={{
          marginLeft: 18,
          flex: 1,
          height: 28,
          borderRadius: 8,
          background: "#fff",
          fontFamily: FONT,
          fontSize: 17,
          color: C.ink3,
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
        }}
      >
        {url}
      </div>
    </div>
    {children}
  </div>
);

"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { GuideKey } from "@/lib/inspection";
import { analyzeFrame, type QualityResult } from "@/lib/quality";
import { Guide } from "./guides";

// The viewfinder, the guide and the saved photo all share this shape.
const ASPECT = 3 / 4;
const LIVE_CHECK_MS = 500;
const CAPTURE_JPEG_QUALITY = 0.92;

export type CameraHandle = { capture: () => Promise<Blob> };

type Props = {
  ref: Ref<CameraHandle>;
  // Alignment overlay; none for close-ups of a specific damage.
  guide: GuideKey | null;
  // Previous photo of this view, drawn faintly so the new shot can match it.
  reference?: string | null;
  plate: string;
  // Live hints run only while the user is aiming, not while reviewing a shot.
  liveCheck: boolean;
  onReady: () => void;
  onUnavailable: (reason: string) => void;
};

// Centre crop of the video that matches what object-cover shows on screen.
function visibleCrop(video: HTMLVideoElement) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw / vh > ASPECT) {
    const w = vh * ASPECT;
    return { sx: (vw - w) / 2, sy: 0, sw: w, sh: vh };
  }
  const h = vw / ASPECT;
  return { sx: 0, sy: (vh - h) / 2, sw: vw, sh: h };
}

export function CameraView({ ref, guide, reference, plate, liveCheck, onReady, onUnavailable }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState<QualityResult | null>(null);
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const onReadyRef = useRef(onReady);
  const onUnavailableRef = useRef(onUnavailable);
  useEffect(() => {
    onReadyRef.current = onReady;
    onUnavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailableRef.current("這個瀏覽器不支援網頁相機");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1920 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setTorch({ supported: Boolean(caps?.torch), on: false });
        onReadyRef.current();
      } catch (err) {
        if (cancelled) return;
        const denied = err instanceof DOMException && err.name === "NotAllowedError";
        onUnavailableRef.current(denied ? "沒有取得相機權限" : "無法開啟相機");
      }
    }
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!liveCheck) return;
    const canvas = document.createElement("canvas");
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      const { sx, sy, sw, sh } = visibleCrop(video);
      setLive(analyzeFrame(video, sx, sy, sw, sh, canvas));
    }, LIVE_CHECK_MS);
    return () => clearInterval(timer);
  }, [liveCheck]);

  useImperativeHandle(ref, () => ({
    async capture() {
      const video = videoRef.current;
      if (!video || !video.videoWidth) throw new Error("Camera is not ready");
      const { sx, sy, sw, sh } = visibleCrop(video);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported");
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      return new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not capture photo"))),
          "image/jpeg",
          CAPTURE_JPEG_QUALITY,
        ),
      );
    },
  }));

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on: next });
    } catch {
      setTorch({ supported: false, on: false });
    }
  }

  const hint = liveCheck ? liveHint(live) : null;

  return (
    <>
      <video ref={videoRef} muted playsInline autoPlay className="h-full w-full object-cover" />
      {reference && (
        // Same 3:4 framing and object-cover crop as the viewfinder, so the
        // previous shot sits where the new one will be taken.
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
        <img
          src={reference}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
        />
      )}
      {guide !== null && <Guide guide={guide} />}
      {hint && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-sm whitespace-nowrap"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${hint.dot}`} aria-hidden />
          {hint.text}
        </div>
      )}
      {torch.supported && (
        <button
          type="button"
          onClick={toggleTorch}
          aria-pressed={torch.on}
          className="absolute top-3 right-3 rounded-full bg-black/65 px-3 py-1.5 text-xs"
        >
          {torch.on ? "關閉補光" : "開啟補光"}
        </button>
      )}
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm whitespace-nowrap">
        車號：{plate}
      </span>
    </>
  );
}

// Short, one-line versions of the post-capture messages, worst issue first.
function liveHint(result: QualityResult | null) {
  if (!result) return { dot: "bg-white/60", text: "對準後拍照" };
  const issue =
    result.issues.find((i) => i.level === "fail") ?? result.issues.find((i) => i.level === "warn");
  if (!issue) return { dot: "bg-good", text: "畫面清楚，可以拍了" };
  const fail = issue.level === "fail";
  const text = {
    dark: fail ? "太暗了，請移到亮處或開補光" : "畫面偏暗",
    blurry: fail ? "畫面模糊，請拿穩手機" : "畫面有點模糊，請拿穩",
    overexposed: fail ? "反光太強，請換個角度" : "有反光，請注意",
  }[issue.code];
  return { dot: fail ? "bg-critical" : "bg-warning", text };
}

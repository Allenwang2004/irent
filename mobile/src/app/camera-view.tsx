"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { GuideKey } from "@/lib/inspection";
import { analyzeFrame, muchDarkerThan, type QualityResult } from "@/lib/quality";
import { Guide } from "./guides";
import { comparePose, type PlatePose } from "@/lib/plate";
import type { PlateRequest, PlateResponse } from "./plate-worker";

// The viewfinder, the guide and the saved photo all share this shape.
const ASPECT = 3 / 4;
const LIVE_CHECK_MS = 500;
const CAPTURE_JPEG_QUALITY = 0.92;

// Live plate check on the four corner shots (guides 1-4; 1 and 2 are the front).
// Frames go to a worker at most this large; a reading counts as "seen" for a
// moment so the hint does not flicker between frames.
const PLATE_GUIDES = new Set<GuideKey>([1, 2, 3, 4]);
const PLATE_FRAME_LONG_SIDE = 1280;
const PLATE_SEEN_MS = 1500;
const PLATE_MODELS = "/models";


export type CameraHandle = {
  capture: () => Promise<Blob>;
  // Turn the phone's light on or off; resolves to the new state.
  setTorch: (on: boolean) => Promise<boolean>;
};

type Props = {
  ref: Ref<CameraHandle>;
  // Alignment overlay; none for close-ups of a specific damage.
  guide: GuideKey | null;
  // Previous photo of this view, drawn faintly so the new shot can match it.
  reference?: string | null;
  plate: string;
  // The previous photo of this corner (shown or not) and its mean luma, to warn
  // when the new shot is aimed differently or much darker.
  previousUrl: string | null;
  previousLuma: number | null;
  // Live hints run only while the user is aiming, not while reviewing a shot.
  liveCheck: boolean;
  // torch: whether the phone lets the page switch its light on.
  onReady: (torch: boolean) => void;
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

export function CameraView({
  ref,
  guide,
  reference,
  plate,
  previousUrl,
  previousLuma,
  liveCheck,
  onReady,
  onUnavailable,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState<QualityResult | null>(null);
  const plateCheck = guide !== null && PLATE_GUIDES.has(guide);
  const { plateHint } = usePlateCheck(videoRef, plate, guide, previousUrl, liveCheck && plateCheck);
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
        onReadyRef.current(Boolean(caps?.torch));
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
    async setTorch(on: boolean) {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return false;
      try {
        await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
        return on;
      } catch {
        return false;
      }
    },
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

  const lightHint =
    live && muchDarkerThan(previousLuma, live.metrics.meanLuma)
      ? { dot: "bg-warning", text: "比上次暗很多，請開補光或移到亮處" }
      : null;
  const hint = liveCheck ? (qualityHint(live) ?? lightHint ?? plateHint ?? GOOD_HINT) : null;

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
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm whitespace-nowrap">
        車號：{plate}
      </span>
    </>
  );
}

const GOOD_HINT = { dot: "bg-good", text: "畫面清楚，可以拍了" };

// Short, one-line versions of the post-capture messages, worst issue first;
// null when the frame is fine.
function qualityHint(result: QualityResult | null) {
  if (!result) return { dot: "bg-white/60", text: "對準後拍照" };
  const issue =
    result.issues.find((i) => i.level === "fail") ?? result.issues.find((i) => i.level === "warn");
  if (!issue) return null;
  const fail = issue.level === "fail";
  const text = {
    dark: fail ? "太暗了，請移到亮處或開補光" : "畫面偏暗",
    blurry: fail ? "畫面模糊，請拿穩手機" : "畫面有點模糊，請拿穩",
    overexposed: fail ? "反光太強，請換個角度" : "有反光，請注意",
    darker: "比上次暗很多，請開補光或移到亮處",
  }[issue.code];
  return { dot: fail ? "bg-critical" : "bg-warning", text };
}

// Every LIVE_CHECK_MS, while the worker is free, send the visible frame to the
// plate worker. A slow phone simply checks less often; the viewfinder and the
// shutter never wait for it. Models load in the background when the camera
// opens, so they are usually ready by the corner shots; if they never load, the
// hints are the quality ones only.
//
// The previous photo of the corner goes through the same worker once, so the
// live plate can be compared with where it was: a different place or angle,
// or much closer or farther, gets a hint to line up with the overlay.
function usePlateCheck(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  plate: string,
  guide: GuideKey | null,
  previousUrl: string | null,
  active: boolean,
) {
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);
  const sentRef = useRef<{ at: number; guide: GuideKey | null; previousUrl: string | null }>({
    at: 0,
    guide: null,
    previousUrl: null,
  });
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  // The latest reading and the corner it was taken for.
  const [reading, setReading] = useState<{ guide: GuideKey | null; seenAt: number; pose: PlatePose | null } | null>(null);
  // Where the plate was in the previous photo (null: not found there), by photo.
  const [previous, setPrevious] = useState<{ url: string; pose: PlatePose | null } | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const worker = new Worker(new URL("./plate-worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<PlateResponse>) => {
      const msg = event.data;
      if (msg.type === "ready") setStatus("ready");
      else if (msg.type === "failed") setStatus("failed");
      else {
        busyRef.current = false;
        const sent = sentRef.current;
        if (msg.source === "previous") {
          if (sent.previousUrl) setPrevious({ url: sent.previousUrl, pose: msg.pose });
          return;
        }
        const end = performance.now();
        performance.measure("plate-check", { start: sent.at, end, detail: { detMs: msg.detMs, recMs: msg.recMs } });
        setReading((r) =>
          msg.found
            ? { guide: sent.guide, seenAt: end, pose: msg.pose }
            : r?.guide === sent.guide
              ? r
              : { guide: sent.guide, seenAt: 0, pose: null },
        );
      }
    };
    worker.onerror = () => setStatus("failed");
    worker.postMessage({ type: "load", base: PLATE_MODELS } satisfies PlateRequest);
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active || status !== "ready") return;
    const canvas = document.createElement("canvas");
    const send = async () => {
      const worker = workerRef.current;
      if (!worker) return;
      // The previous photo first, once per photo.
      if (previousUrl && previous?.url !== previousUrl) {
        let frame: ImageBitmap;
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = previousUrl;
          await img.decode();
          frame = await createImageBitmap(img);
        } catch {
          // Unreadable: compare nothing for this photo rather than retry forever.
          setPrevious({ url: previousUrl, pose: null });
          busyRef.current = false;
          return;
        }
        sentRef.current = { ...sentRef.current, previousUrl };
        worker.postMessage({ type: "check", frame, plate, source: "previous" } satisfies PlateRequest, [frame]);
        return;
      }
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) throw new Error("No frame");
      const { sx, sy, sw, sh } = visibleCrop(video);
      const scale = Math.min(1, PLATE_FRAME_LONG_SIDE / Math.max(sw, sh));
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      canvas.getContext("2d")?.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const frame = await createImageBitmap(canvas);
      sentRef.current = { at: performance.now(), guide, previousUrl: sentRef.current.previousUrl };
      worker.postMessage({ type: "check", frame, plate, source: "frame" } satisfies PlateRequest, [frame]);
    };
    const timer = setInterval(() => {
      setNow(performance.now());
      if (busyRef.current) return;
      busyRef.current = true;
      send().catch(() => {
        busyRef.current = false;
      });
    }, LIVE_CHECK_MS);
    return () => clearInterval(timer);
  }, [active, status, guide, plate, previousUrl, previous, videoRef]);

  // Nothing to say until this corner has been checked at least once.
  if (!active || status !== "ready" || reading?.guide !== guide) return { plateHint: null };
  const end = guide === 1 || guide === 2 ? "車頭" : "車尾";
  if (now - reading.seenAt >= PLATE_SEEN_MS) {
    return { plateHint: { dot: "bg-warning", text: `看不到車牌，請拍到${end}和車牌` } };
  }
  const before = previous?.url === previousUrl ? previous.pose : null;
  const pose = before && reading.pose ? comparePose(before, reading.pose) : "same";
  const text = {
    same: "看得到車牌，可以拍了",
    moved: "角度跟上次不同，請對齊上次的照片",
    closer: "比上次近，請往後退一點",
    farther: "比上次遠，請靠近一點",
  }[pose];
  return { plateHint: { dot: pose === "same" ? "bg-good" : "bg-warning", text } };
}

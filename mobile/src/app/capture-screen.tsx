"use client";

import { useRef, useState } from "react";
import type { GuideKey } from "@/lib/inspection";
import { preparePhoto, type PreparedPhoto, type QualityResult } from "@/lib/quality";
import { CameraView, type CameraHandle } from "./camera-view";

export type Shot = {
  slot: string;
  title: string;
  hint: string;
  guide: GuideKey | null;
  // Previous photo of the same view (pickup: last return or registration;
  // return: this rental's pickup), if there is one.
  reference?: string;
};

type Progress = {
  current: number;
  total: number;
  thumbs: { slot: string; label: string; previewUrl?: string }[];
  onSelect: (slot: string) => void;
};

// The in-page camera is preferred so the guide can be overlaid; if it cannot
// start, shooting falls back to the phone's own camera app.
type CameraState = { status: "starting" | "ready" } | { status: "unavailable"; reason: string };

type Props = {
  shot: Shot;
  plate: string;
  accepted?: PreparedPhoto;
  pending?: PreparedPhoto;
  progress?: Progress;
  onShot: (photo: PreparedPhoto) => void;
  onRetake: () => void;
  onAccept: () => void;
  onClose: () => void;
  closeLabel: string;
};

// Full-screen viewfinder, one screen tall and never scrolling. Stays mounted
// while the shot changes so the camera stream is not restarted between steps.
export function CaptureScreen({
  shot,
  plate,
  accepted,
  pending,
  progress,
  onShot,
  onRetake,
  onAccept,
  onClose,
  closeLabel,
}: Props) {
  const [camera, setCamera] = useState<CameraState>({ status: "starting" });
  const [showReference, setShowReference] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const albumInput = useRef<HTMLInputElement>(null);

  async function check(source: Blob) {
    setBusy(true);
    setError(null);
    try {
      onShot(await preparePhoto(source));
    } catch {
      setError("無法讀取這張照片，請重拍。");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await check(file);
  }

  async function shoot() {
    if (camera.status !== "ready") {
      fileInput.current?.click();
      return;
    }
    try {
      await check(await cameraRef.current!.capture());
    } catch {
      setError("拍照失敗，請再試一次。");
    }
  }

  function retake() {
    onRetake();
    if (camera.status !== "ready") fileInput.current?.click();
  }

  const aiming = !pending && !busy;

  return (
    <main className="flex h-dvh flex-col overflow-hidden overscroll-none bg-camera text-white">
      <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      {/* Prepared photos for demos, e.g. to show a blurry shot being rejected. */}
      <input ref={albumInput} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <header className="relative shrink-0 px-14 pt-3 pb-2 text-center">
        <button type="button" onClick={onClose} className="absolute top-3 left-3 text-sm text-white/75">
          {closeLabel}
        </button>
        <h1 className="text-base font-semibold">
          {progress && (
            <span className="mr-2 text-xs font-normal text-white/60">
              {progress.current} / {progress.total}
            </span>
          )}
          {shot.title}
        </h1>
        <p className="text-xs text-white/75">{shot.hint}</p>
      </header>

      {/* Size the 3:4 viewfinder from the space available (container query units)
          so it keeps the exact shape the guide and the saved crop assume. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 [container-type:size]">
        <div className="relative h-[min(100cqh,133.333cqw)] w-[min(100cqw,75cqh)] overflow-hidden rounded-lg bg-camera-2">
          {camera.status === "unavailable" ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center text-sm text-white/70">
              <p>{camera.reason}，改用手機相機拍照。</p>
              <p>{shot.hint}</p>
            </div>
          ) : (
            <CameraView
              ref={cameraRef}
              guide={shot.guide}
              reference={showReference ? shot.reference : null}
              plate={plate}
              liveCheck={aiming && camera.status === "ready"}
              onReady={() => setCamera({ status: "ready" })}
              onUnavailable={(reason) => setCamera({ status: "unavailable", reason })}
            />
          )}
          {pending && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img
              src={pending.previewUrl}
              alt={`${shot.title}照片`}
              className="absolute inset-0 h-full w-full bg-camera-2 object-contain"
            />
          )}
          {/* Messages overlay the frame so they never push the shutter off screen. */}
          <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5">
            {busy && <p className="rounded-lg bg-black/70 px-3 py-2 text-sm">檢查照片中...</p>}
            {!busy && pending && <QualityBanner quality={pending.quality} />}
            {!busy && !pending && accepted && (
              <p className="mb-9 rounded-lg bg-black/70 px-3 py-2 text-sm text-white/85">
                這張已經拍好了，可以重拍{progress ? "，或點下方縮圖切換" : ""}。
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-black/70 px-3 py-2 text-sm text-critical">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {progress && <Thumbnails progress={progress} current={shot.slot} />}

      <div className="grid h-24 shrink-0 grid-cols-3 items-center px-4 pb-[env(safe-area-inset-bottom)]">
        {pending ? (
          <div className="col-span-3 flex justify-center gap-6">
            <button type="button" onClick={retake} className="rounded-full border border-white/40 px-6 py-3 text-sm">
              重拍
            </button>
            {pending.quality.verdict !== "fail" && (
              <button
                type="button"
                onClick={onAccept}
                className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
              >
                {pending.quality.verdict === "warn" ? "仍使用這張" : "使用這張"}
              </button>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => albumInput.current?.click()}
              disabled={busy}
              className="justify-self-start text-sm text-white/75"
            >
              從相簿選擇
            </button>
            <button
              type="button"
              onClick={shoot}
              disabled={busy || camera.status === "starting"}
              aria-label="拍照"
              className="h-18 w-18 justify-self-center rounded-full border-4 border-white bg-white/10 disabled:opacity-50"
            />
            {shot.reference && camera.status !== "unavailable" ? (
              <button
                type="button"
                onClick={() => setShowReference((v) => !v)}
                aria-pressed={showReference}
                className="justify-self-end text-right text-sm text-white/75"
              >
                {showReference ? "隱藏上次照片" : "顯示上次照片"}
              </button>
            ) : (
              <span />
            )}
          </>
        )}
      </div>
    </main>
  );
}

const BANNER = {
  pass: { label: "通過", className: "border-good", dot: "bg-good", text: "照片清楚，可以使用。" },
  warn: { label: "請確認", className: "border-warning", dot: "bg-warning", text: "" },
  fail: { label: "需重拍", className: "border-critical", dot: "bg-critical", text: "" },
} as const;

export function QualityBanner({ quality }: { quality: QualityResult }) {
  const style = BANNER[quality.verdict];
  return (
    <div role="status" className={`rounded-lg border-l-4 bg-black/75 px-3 py-2 ${style.className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} aria-hidden />
        {style.label}
      </div>
      {style.text && <p className="mt-1 text-sm text-white/80">{style.text}</p>}
      {quality.issues.map((issue) => (
        <p key={issue.code} className="mt-1 text-sm text-white/80">
          {issue.message}
        </p>
      ))}
    </div>
  );
}

function Thumbnails({ progress, current }: { progress: Progress; current: string }) {
  return (
    <ol
      className="mx-4 mt-2 grid shrink-0 gap-1.5"
      style={{ gridTemplateColumns: `repeat(${progress.thumbs.length}, minmax(0, 1fr))` }}
    >
      {progress.thumbs.map((t, i) => (
        <li key={t.slot}>
          <button
            type="button"
            onClick={() => progress.onSelect(t.slot)}
            aria-label={`${t.label}${t.previewUrl ? "（已拍）" : ""}`}
            aria-current={t.slot === current ? "step" : undefined}
            className={`block aspect-square w-full overflow-hidden rounded-md bg-camera-2 text-[10px] text-white/60 ${
              t.slot === current ? "ring-2 ring-white" : ""
            }`}
          >
            {t.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={t.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              i + 1
            )}
          </button>
        </li>
      ))}
    </ol>
  );
}

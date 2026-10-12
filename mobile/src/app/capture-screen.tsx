"use client";

import { useEffect, useRef, useState } from "react";
import type { GuideKey } from "@/lib/inspection";
import { imageLuma, preparePhoto, withPrevious, type PreparedPhoto, type QualityResult } from "@/lib/quality";
import { CameraView, type CameraHandle } from "./camera-view";
import { FlashOff, FlashOn } from "./icons";

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
  thumbs: { slot: string; label: string; short: string; previewUrl?: string }[];
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
  // Shown under the hint, e.g. the return countdown.
  notice?: React.ReactNode;
  // Top-right "done", as in iRent: moves on once every photo of this stage is taken.
  onDone?: () => void;
  doneEnabled?: boolean;
  doneLabel?: string;
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
  notice,
  onDone,
  doneEnabled = false,
  doneLabel = "完成",
}: Props) {
  const [camera, setCamera] = useState<CameraState>({ status: "starting" });
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [showReference, setShowReference] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const previousLuma = usePreviousLuma(shot.reference);

  async function check(source: Blob) {
    setBusy(true);
    setError(null);
    try {
      const photo = await preparePhoto(source);
      onShot({ ...photo, quality: withPrevious(photo.quality, previousLuma) });
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

  async function toggleTorch() {
    const on = await cameraRef.current!.setTorch(!torch.on);
    setTorch((t) => ({ ...t, on }));
  }

  const aiming = !pending && !busy;

  return (
    <main className="flex h-dvh flex-col overflow-hidden overscroll-none bg-camera text-white">
      <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />

      {/* Layout follows iRent's own photo screen: title and instructions in the
          middle, "done" on the right. */}
      <header className="grid shrink-0 grid-cols-[4.5rem_1fr_4.5rem] items-start px-4 pt-4 pb-3">
        <button type="button" onClick={onClose} className="justify-self-start text-[15px] leading-6 text-white">
          {closeLabel}
        </button>
        <div className="text-center">
          <h1 className="text-base leading-6 font-semibold">
            {shot.title}
            {progress && (
              <span className="ml-1.5 text-xs font-normal text-white/60">
                {progress.current}/{progress.total}
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-[13px] leading-[18px] text-white/85">{shot.hint}</p>
          {notice}
        </div>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            disabled={!doneEnabled}
            className="justify-self-end text-[15px] leading-6 text-white disabled:text-white/35"
          >
            {doneLabel}
          </button>
        ) : (
          <span />
        )}
      </header>

      {/* Size the 3:4 viewfinder from the space available (container query units)
          so it keeps the exact shape the guide and the saved crop assume. */}
      <div className="flex min-h-0 flex-1 items-center justify-center [container-type:size]">
        <div className="relative h-[min(100cqh,133.333cqw)] w-[min(100cqw,75cqh)] overflow-hidden bg-camera-2">
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
              previousUrl={shot.reference ?? null}
              previousLuma={previousLuma}
              liveCheck={aiming && camera.status === "ready"}
              onReady={(canTorch) => {
                setCamera({ status: "ready" });
                setTorch({ supported: canTorch, on: false });
              }}
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

      <div className="grid h-28 shrink-0 grid-cols-3 items-center px-5 pb-[env(safe-area-inset-bottom)]">
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
            {/* iRent always shows the flash; it only works where the phone lets the page use it. */}
            <button
              type="button"
              onClick={toggleTorch}
              disabled={!torch.supported || camera.status !== "ready"}
              aria-pressed={torch.on}
              aria-label={torch.on ? "關閉閃光燈" : "開啟閃光燈"}
              className="h-10 w-10 justify-self-center text-white disabled:opacity-100"
            >
              {torch.on ? <FlashOn className="mx-auto h-6 w-6" /> : <FlashOff className="mx-auto h-6 w-6" />}
            </button>
            <button
              type="button"
              onClick={shoot}
              disabled={busy || camera.status === "starting"}
              aria-label="拍照"
              className="flex h-[72px] w-[72px] items-center justify-center justify-self-center rounded-full border-[3px] border-white disabled:opacity-50"
            >
              <span className="h-[58px] w-[58px] rounded-full bg-white" />
            </button>
            {shot.reference && camera.status !== "unavailable" ? (
              <button
                type="button"
                onClick={() => setShowReference((v) => !v)}
                aria-pressed={showReference}
                className="justify-self-center text-center text-[13px] leading-4 text-white/80"
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

// Brightness of the previous photo of this corner, measured once when it loads,
// so new shots can be compared with it. Null while loading or if it cannot be read.
function usePreviousLuma(url: string | undefined) {
  const [measured, setMeasured] = useState<{ url: string; luma: number } | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    imageLuma(url)
      .then((luma) => {
        if (!cancelled) setMeasured({ url, luma });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);
  return measured && measured.url === url ? measured.luma : null;
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

// Strip of the stage's shots under the viewfinder, as in iRent: tap one to
// retake it. Scrolls sideways when the stage has more shots than fit.
function Thumbnails({ progress, current }: { progress: Progress; current: string }) {
  return (
    <ol className="no-scrollbar mt-2 flex shrink-0 gap-2 overflow-x-auto px-1.5 py-1">
      {progress.thumbs.map((t) => (
        <li key={t.slot} className="shrink-0">
          <button
            type="button"
            onClick={() => progress.onSelect(t.slot)}
            ref={t.slot === current ? (el) => el?.scrollIntoView({ inline: "nearest", block: "nearest" }) : undefined}
            aria-label={`${t.label}${t.previewUrl ? "（已拍）" : ""}`}
            aria-current={t.slot === current ? "step" : undefined}
            className={`flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-md bg-camera-2 text-xs text-white/70 ${
              t.slot === current ? "ring-2 ring-white" : ""
            }`}
          >
            {t.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={t.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              t.short
            )}
          </button>
        </li>
      ))}
    </ol>
  );
}

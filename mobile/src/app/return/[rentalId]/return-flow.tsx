"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PHOTO_STEPS } from "@/lib/photo-steps";
import { preparePhoto, type PreparedPhoto, type QualityResult } from "@/lib/quality";
import { completeReturn, startReturn, type PhotoReport, type UploadTarget } from "../actions";
import { CameraView, type CameraHandle } from "./camera-view";

type Rental = { id: number; order_no: string; plate: string; car_model: string };

type UploadState = "idle" | "uploading" | "done" | "error";

type StepState = {
  accepted?: PreparedPhoto;
  // The shot being reviewed right after capture, before the user accepts it.
  pending?: PreparedPhoto;
  rejectedShots: number;
  upload: UploadState;
};

type Phase = "intro" | "capture" | "review" | "submitting" | "done";

// The in-page camera is preferred so the guide can be overlaid; if it cannot
// start, shooting falls back to the phone's own camera app.
type CameraState = { status: "starting" | "ready" } | { status: "unavailable"; reason: string };

const emptySteps = (): StepState[] => PHOTO_STEPS.map(() => ({ rejectedShots: 0, upload: "idle" }));

export function ReturnFlow({ rental }: { rental: Rental }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [session, setSession] = useState<{ sessionId: string; targets: UploadTarget[] } | null>(null);
  const [steps, setSteps] = useState<StepState[]>(emptySteps);
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState<CameraState>({ status: "starting" });
  const cameraRef = useRef<CameraHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const albumInput = useRef<HTMLInputElement>(null);

  function updateStep(index: number, patch: Partial<StepState>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function begin() {
    setBusy(true);
    setError(null);
    try {
      setSession(await startReturn(rental.id));
      setPhase("capture");
    } catch {
      setError("無法開始還車，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await checkShot(file);
  }

  async function shoot() {
    if (camera.status !== "ready") {
      fileInput.current?.click();
      return;
    }
    try {
      const blob = await cameraRef.current!.capture();
      await checkShot(blob);
    } catch {
      setError("拍照失敗，請再試一次。");
    }
  }

  // Back to the viewfinder; without the in-page camera, reopen the camera app.
  function retake() {
    const step = steps[current];
    if (step.pending) URL.revokeObjectURL(step.pending.previewUrl);
    updateStep(current, { pending: undefined });
    if (camera.status !== "ready") fileInput.current?.click();
  }

  async function checkShot(source: Blob) {
    setBusy(true);
    setError(null);
    try {
      const photo = await preparePhoto(source);
      const step = steps[current];
      if (step.pending) URL.revokeObjectURL(step.pending.previewUrl);
      updateStep(current, {
        pending: photo,
        rejectedShots: step.rejectedShots + (photo.quality.verdict === "fail" ? 1 : 0),
      });
    } catch {
      setError("無法讀取這張照片，請重拍。");
    } finally {
      setBusy(false);
    }
  }

  async function upload(index: number, photo: PreparedPhoto) {
    const target = session?.targets.find((t) => t.imageType === PHOTO_STEPS[index].imageType);
    if (!target) return;
    updateStep(index, { upload: "uploading" });
    try {
      const res = await fetch(target.signedUrl, {
        method: "PUT",
        headers: { "content-type": "image/jpeg", "x-upsert": "true" },
        body: photo.blob,
      });
      updateStep(index, { upload: res.ok ? "done" : "error" });
    } catch {
      updateStep(index, { upload: "error" });
    }
  }

  function accept() {
    const step = steps[current];
    if (!step.pending || step.pending.quality.verdict === "fail") return;
    if (step.accepted && step.accepted !== step.pending) URL.revokeObjectURL(step.accepted.previewUrl);
    const photo = step.pending;
    updateStep(current, { accepted: photo, pending: undefined });
    void upload(current, photo);

    const next = steps.findIndex((s, i) => i !== current && !s.accepted);
    if (next === -1) setPhase("review");
    else setCurrent(next);
  }

  async function submit() {
    if (!session) return;
    setPhase("submitting");
    setError(null);
    const reports: PhotoReport[] = steps.map((s, i) => {
      const photo = s.accepted!;
      return {
        imageType: PHOTO_STEPS[i].imageType,
        width: photo.width,
        height: photo.height,
        verdict: photo.quality.verdict === "warn" ? "warn" : "pass",
        rejectedShots: s.rejectedShots,
        metrics: photo.quality.metrics,
        issues: photo.quality.issues.map((issue) => `${issue.code}:${issue.level}`),
      };
    });
    try {
      await completeReturn(session.sessionId, reports);
      setPhase("done");
    } catch {
      setError("送出失敗，請確認網路後再試一次。");
      setPhase("review");
    }
  }

  const input = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      {/* Prepared photos for demos, e.g. to show a blurry shot being rejected. */}
      <input ref={albumInput} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </>
  );

  if (phase === "intro") {
    return (
      <main className="flex flex-1 flex-col px-6 py-8">
        <BackLink />
        <h1 className="mt-6 text-center text-xl font-semibold">檢查車輛狀況</h1>
        <p className="mt-2 text-center text-sm text-ink-2">
          請仔細檢查有無損傷、凹陷等，完整拍照可保障自身權益。
        </p>
        <div className="mt-10 rounded-xl bg-surface-2 p-5 text-center">
          <div className="text-xs text-ink-3">訂單 {rental.order_no}</div>
          <div className="mt-1 text-2xl font-semibold">{rental.plate}</div>
          <div className="text-sm text-ink-2">{rental.car_model}</div>
        </div>
        <ol className="mt-8 space-y-1 text-sm text-ink-2">
          {PHOTO_STEPS.map((s, i) => (
            <li key={s.imageType}>
              {i + 1}. {s.title}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-ink-3">每張照片拍完會立刻檢查清晰度與亮度，不合格會請你重拍。</p>
        <div className="mt-auto pt-8">
          {error && <p role="alert" className="mb-3 text-center text-sm text-critical">{error}</p>}
          <button
            type="button"
            onClick={begin}
            disabled={busy}
            className="w-full rounded-full bg-accent py-3 font-medium text-accent-ink disabled:opacity-60"
          >
            {busy ? "準備中..." : "拍攝車輛狀況"}
          </button>
        </div>
      </main>
    );
  }

  if (phase === "capture") {
    const stepDef = PHOTO_STEPS[current];
    const step = steps[current];
    const aiming = !step.pending && !busy;
    return (
      // Exactly one screen tall and never scrolls: the viewfinder takes whatever
      // height is left after the header, thumbnails and shutter.
      <main className="flex h-dvh flex-col overflow-hidden overscroll-none bg-camera text-white">
        {input}
        <header className="shrink-0 px-4 pt-3 pb-2 text-center">
          <h1 className="text-base font-semibold">
            <span className="mr-2 text-xs font-normal text-white/60">
              {current + 1} / {PHOTO_STEPS.length}
            </span>
            {stepDef.title}
          </h1>
          <p className="text-xs text-white/75">{stepDef.hint}</p>
        </header>

        {/* Size the 3:4 viewfinder from the space available (container query units)
            so it keeps the exact shape the guide and the saved crop assume. */}
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 [container-type:size]">
          <div className="relative h-[min(100cqh,133.333cqw)] w-[min(100cqw,75cqh)] overflow-hidden rounded-lg bg-camera-2">
            {camera.status === "unavailable" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center text-sm text-white/70">
                <p>{camera.reason}，改用手機相機拍照。</p>
                <p>{stepDef.hint}</p>
              </div>
            ) : (
              <CameraView
                ref={cameraRef}
                imageType={stepDef.imageType}
                plate={rental.plate}
                liveCheck={aiming && camera.status === "ready"}
                onReady={() => setCamera({ status: "ready" })}
                onUnavailable={(reason) => setCamera({ status: "unavailable", reason })}
              />
            )}
            {step.pending && (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img
                src={step.pending.previewUrl}
                alt={`${stepDef.title}照片`}
                className="absolute inset-0 h-full w-full bg-camera-2 object-contain"
              />
            )}
            {/* Messages overlay the frame so they never push the shutter off screen. */}
            <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5">
              {busy && <p className="rounded-lg bg-black/70 px-3 py-2 text-sm">檢查照片中...</p>}
              {!busy && step.pending && <QualityBanner quality={step.pending.quality} />}
              {!busy && !step.pending && step.accepted && (
                <p className="mb-9 rounded-lg bg-black/70 px-3 py-2 text-sm text-white/85">
                  這個角度已經拍好了。可以重拍，或點下方縮圖切換。
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

        <Thumbnails steps={steps} current={current} onSelect={setCurrent} />

        <div className="grid h-24 shrink-0 grid-cols-3 items-center px-4 pb-[env(safe-area-inset-bottom)]">
          {step.pending ? (
            <div className="col-span-3 flex justify-center gap-6">
              <button type="button" onClick={retake} className="rounded-full border border-white/40 px-6 py-3 text-sm">
                重拍
              </button>
              {step.pending.quality.verdict !== "fail" && (
                <button
                  type="button"
                  onClick={accept}
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
                >
                  {step.pending.quality.verdict === "warn" ? "仍使用這張" : "使用這張"}
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
              <span />
            </>
          )}
        </div>
      </main>
    );
  }

  if (phase === "review" || phase === "submitting") {
    const uploading = steps.some((s) => s.upload === "uploading");
    const failed = steps.map((s, i) => (s.upload === "error" ? i : -1)).filter((i) => i >= 0);
    const ready = steps.every((s) => s.upload === "done");
    return (
      <main className="flex flex-1 flex-col px-4 py-6">
        <h1 className="text-xl font-semibold">確認還車照片</h1>
        <p className="mt-1 text-sm text-ink-2">點照片可以重拍。確認無誤後送出。</p>
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {steps.map((s, i) => (
            <li key={PHOTO_STEPS[i].imageType}>
              <button
                type="button"
                onClick={() => {
                  setCurrent(i);
                  // The camera restarts when the viewfinder remounts.
                  if (camera.status === "ready") setCamera({ status: "starting" });
                  setPhase("capture");
                }}
                className="block w-full text-left"
              >
                {s.accepted && (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                  <img
                    src={s.accepted.previewUrl}
                    alt={`${PHOTO_STEPS[i].title}照片`}
                    className="aspect-[3/4] w-full rounded-lg bg-surface-2 object-cover"
                  />
                )}
                <div className="mt-1 text-sm font-medium">{PHOTO_STEPS[i].title}</div>
                <div className="text-xs text-ink-3">
                  {s.accepted?.quality.verdict === "warn" ? "有提醒" : "清楚"}・
                  {s.upload === "done" ? "已上傳" : s.upload === "error" ? "上傳失敗" : "上傳中"}
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6">
          {failed.length > 0 && (
            <button
              type="button"
              onClick={() => failed.forEach((i) => void upload(i, steps[i].accepted!))}
              className="mb-3 w-full rounded-full border border-line py-3 text-sm"
            >
              重新上傳失敗的照片
            </button>
          )}
          {error && <p role="alert" className="mb-3 text-center text-sm text-critical">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={!ready || phase === "submitting"}
            className="w-full rounded-full bg-accent py-3 font-medium text-accent-ink disabled:opacity-50"
          >
            {phase === "submitting" ? "送出中..." : uploading ? "照片上傳中..." : "確認還車"}
          </button>
        </div>
      </main>
    );
  }

  const totalRejected = steps.reduce((n, s) => n + s.rejectedShots, 0);
  const warned = steps.filter((s) => s.accepted?.quality.verdict === "warn").length;
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">還車照片已送出</h1>
      <p className="mt-2 text-sm text-ink-2">{rental.plate} 的 6 張照片已上傳，營運團隊會再確認車況。</p>
      <dl className="mt-8 grid w-full grid-cols-2 gap-3 text-left">
        <div className="rounded-xl bg-surface-2 p-4">
          <dt className="text-xs text-ink-3">拍照時攔下的不合格照片</dt>
          <dd className="mt-1 text-2xl font-semibold">{totalRejected} 張</dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-4">
          <dt className="text-xs text-ink-3">有提醒但仍使用</dt>
          <dd className="mt-1 text-2xl font-semibold">{warned} 張</dd>
        </div>
      </dl>
      <Link href="/" className="mt-auto w-full rounded-full border border-line py-3 text-sm">
        回到訂單
      </Link>
    </main>
  );
}

function BackLink() {
  return (
    <Link href="/" className="text-sm text-ink-2">
      返回
    </Link>
  );
}

const BANNER = {
  pass: { label: "通過", className: "border-good", dot: "bg-good", text: "照片清楚，可以使用。" },
  warn: { label: "請確認", className: "border-warning", dot: "bg-warning", text: "" },
  fail: { label: "需重拍", className: "border-critical", dot: "bg-critical", text: "" },
} as const;

function QualityBanner({ quality }: { quality: QualityResult }) {
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

function Thumbnails({
  steps,
  current,
  onSelect,
}: {
  steps: StepState[];
  current: number;
  onSelect: (i: number) => void;
}) {
  return (
    <ol className="mx-4 mt-2 grid shrink-0 grid-cols-6 gap-1.5">
      {steps.map((s, i) => (
        <li key={PHOTO_STEPS[i].imageType}>
          <button
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`${PHOTO_STEPS[i].title}${s.accepted ? "（已拍）" : ""}`}
            aria-current={i === current ? "step" : undefined}
            className={`block aspect-square w-full overflow-hidden rounded-md bg-camera-2 text-[10px] text-white/60 ${
              i === current ? "ring-2 ring-white" : ""
            }`}
          >
            {s.accepted ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={s.accepted.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              i + 1
            )}
          </button>
        </li>
      ))}
    </ol>
  );
}

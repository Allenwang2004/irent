"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ANGLE_LABELS,
  DAMAGE_AREAS,
  extraSlot,
  INTERIOR_SLOTS,
  type InspectionKind,
  type KnownDamage,
  knownDamageSlot,
  MAX_EXTRA_PHOTOS,
  REQUIRED_STEPS,
  RETURN_LOCK_SECONDS,
  type Vehicle,
} from "@/lib/inspection";
import type { PreparedPhoto } from "@/lib/quality";
import {
  cancelInspection,
  completeInspection,
  extraUploadUrl,
  lockReturn,
  type PhotoReport,
  startPickup,
  startRegistration,
  startReturn,
  type Started,
} from "./actions";
import { CaptureScreen, type Shot } from "./capture-screen";

type UploadState = "idle" | "uploading" | "done" | "error";

type SlotState = {
  accepted?: PreparedPhoto;
  // The shot being reviewed right after capture, before the user accepts it.
  pending?: PreparedPhoto;
  rejectedShots: number;
  upload: UploadState;
};

type Extra = { slot: string; location: string; note: string };

// Return adds "lock" (interior done, get out and lock the doors) between the
// interior and exterior shots, and "expired" when the lock window runs out.
type Phase = "intro" | "capture" | "lock" | "damages" | "review" | "submitting" | "done" | "expired";

const INTERIOR_STEPS = REQUIRED_STEPS.filter((s) => INTERIOR_SLOTS.includes(s.slot));
const EXTERIOR_STEPS = REQUIRED_STEPS.filter((s) => !INTERIOR_SLOTS.includes(s.slot));
const LOCK_MINUTES = RETURN_LOCK_SECONDS / 60;

type Props = {
  kind: InspectionKind;
  vehicle: Vehicle;
  knownDamages: KnownDamage[];
  rentalId?: number;
  token?: string;
};

const COPY = {
  registration: {
    title: "車輛登錄",
    intro: "拍攝這台車目前的狀態，作為之後取車、還車比對的基準。",
    close: "離開",
    done: (plate: string) => `${plate} 已登錄完成，現在可以出租了。`,
  },
  pickup: {
    title: "取車：檢查車輛狀況",
    intro: "請仔細檢查有無損傷、凹陷等，完整拍照可保障自身權益。",
    close: "取消取車",
    done: (plate: string) => `已完成 ${plate} 的取車拍照，祝行車平安。還車時請回到首頁點「我要還車」。`,
  },
  return: {
    title: "還車",
    intro: `按下「還車」後計費就停止。接著請在 ${LOCK_MINUTES} 分鐘內拍完車內照片、下車並鎖門，再到車外拍外部照片。`,
    close: "取消還車",
    done: (plate: string) => `${plate} 的還車照片已送出，營運團隊會再確認車況。`,
  },
} as const;

const EXTRA_COPY = {
  pickup: {
    heading: "發現其他損傷？",
    text: "如果看到上面沒列出的損傷，可以拍下來回報，避免之後被誤認為是你造成的。（不強制）",
    shotHint: "請靠近拍清楚這處損傷",
  },
  return: {
    heading: "這次租用有造成損傷嗎？",
    text: "如果有，可以主動拍下來說明，營運團隊會一併確認。（不強制）",
    shotHint: "請靠近拍清楚這處損傷",
  },
} as const;

// Next keeps visited pages alive (Activity), so coming back to this page would
// show the last attempt's photos. Each fresh visit (link or router.push) starts
// a new flow; the browser's back button still restores the one in progress.
export function InspectionFlow(props: Props) {
  const { bfcacheId } = useRouter();
  return <Flow key={bfcacheId} {...props} />;
}

function Flow({ kind, vehicle, knownDamages, rentalId, token }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [started, setStarted] = useState<Started | null>(null);
  const [targets, setTargets] = useState<Map<string, string>>(new Map());
  const [references, setReferences] = useState<Map<string, string>>(new Map());
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const [extras, setExtras] = useState<Extra[]>([]);
  const [captureSlot, setCaptureSlot] = useState<string>(REQUIRED_STEPS[0].slot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  // Return only.
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [locked, setLocked] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const expiring = useRef(false);
  const locking = useRef(false);

  const copy = COPY[kind];
  const hasDamageStep = kind !== "registration";
  const isReturn = kind === "return";
  // Steps shot in the current stage: a return splits them at the door lock.
  const stageSteps = isReturn ? (locked ? EXTERIOR_STEPS : INTERIOR_STEPS) : REQUIRED_STEPS;
  const lockDeadline = started?.lockDeadline ? Date.parse(started.lockDeadline) : null;
  const counting = isReturn && lockDeadline !== null && !locked && (phase === "capture" || phase === "lock");
  const secondsLeft = lockDeadline === null ? 0 : Math.max(0, Math.ceil((lockDeadline - now) / 1000));

  // Lock window: tick every second; at zero the return is cancelled and the
  // renter keeps the car (billing carries on).
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  useEffect(() => {
    if (!counting || secondsLeft > 0 || expiring.current || locking.current || !started) return;
    expiring.current = true;
    setConfirmClose(false);
    setConfirmLock(false);
    cancelInspection(started.inspectionId)
      .catch(() => {})
      .finally(() => setPhase("expired"));
  }, [counting, secondsLeft, started]);
  const slotState = (slot: string): SlotState => slots[slot] ?? { rejectedShots: 0, upload: "idle" };

  function patchSlot(slot: string, patch: Partial<SlotState>) {
    setSlots((prev) => ({ ...prev, [slot]: { ...(prev[slot] ?? { rejectedShots: 0, upload: "idle" }), ...patch } }));
  }

  async function begin() {
    setBusy(true);
    setError(null);
    try {
      const s =
        kind === "pickup"
          ? await startPickup(vehicle.id)
          : kind === "return"
            ? await startReturn(rentalId!)
            : await startRegistration(vehicle.id, token!);
      setStarted(s);
      setTargets(new Map(s.targets.map((t) => [t.slot, t.signedUrl])));
      setReferences(new Map(s.references.map((r) => [r.slot, r.url])));
      setNow(Date.now());
      setCaptureSlot(REQUIRED_STEPS[0].slot);
      setPhase("capture");
    } catch {
      setError(kind === "pickup" ? "這台車目前無法借用，請回到首頁重新選擇。" : "無法開始，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  async function upload(slot: string, photo: PreparedPhoto, url?: string) {
    const target = url ?? targets.get(slot);
    if (!target) return;
    patchSlot(slot, { upload: "uploading" });
    try {
      const res = await fetch(target, {
        method: "PUT",
        headers: { "content-type": "image/jpeg", "x-upsert": "true" },
        body: photo.blob,
      });
      patchSlot(slot, { upload: res.ok ? "done" : "error" });
    } catch {
      patchSlot(slot, { upload: "error" });
    }
  }

  // ---------------------------------------------------------------- shots

  const requiredShot = REQUIRED_STEPS.find((s) => s.slot === captureSlot);
  const knownDamage = knownDamages.find((d) => knownDamageSlot(d.id) === captureSlot);
  const shot: Shot = requiredShot
    ? {
        slot: requiredShot.slot,
        title: requiredShot.title,
        hint: requiredShot.hint,
        guide: requiredShot.guide,
        reference: references.get(requiredShot.slot),
      }
    : knownDamage
      ? {
          slot: captureSlot,
          title: `已知車損：${knownDamage.location}`,
          hint: `${knownDamage.damage_type}・${knownDamage.severity}${knownDamage.note ? `・${knownDamage.note}` : ""}，請靠近拍清楚`,
          guide: null,
        }
      : { slot: captureSlot, title: "其他損傷", hint: kind === "registration" ? "" : EXTRA_COPY[kind].shotHint, guide: null };

  function onShot(photo: PreparedPhoto) {
    const s = slotState(captureSlot);
    if (s.pending) URL.revokeObjectURL(s.pending.previewUrl);
    patchSlot(captureSlot, {
      pending: photo,
      rejectedShots: s.rejectedShots + (photo.quality.verdict === "fail" ? 1 : 0),
    });
  }

  function onRetake() {
    const s = slotState(captureSlot);
    if (s.pending) URL.revokeObjectURL(s.pending.previewUrl);
    patchSlot(captureSlot, { pending: undefined });
  }

  async function onAccept() {
    const slot = captureSlot;
    const s = slotState(slot);
    if (!s.pending || s.pending.quality.verdict === "fail") return;
    if (s.accepted && s.accepted !== s.pending) URL.revokeObjectURL(s.accepted.previewUrl);
    const photo = s.pending;
    patchSlot(slot, { accepted: photo, pending: undefined });

    if (requiredShot) {
      void upload(slot, photo);
      const next = stageSteps.find((st) => st.slot !== slot && !slots[st.slot]?.accepted);
      if (next) setCaptureSlot(next.slot);
      else if (isReturn && !locked) setPhase("lock");
      else setPhase(hasDamageStep ? "damages" : "review");
      return;
    }

    // Optional photos: extras get their upload URL on demand.
    if (slot.startsWith("extra-") && !targets.has(slot) && started) {
      try {
        const t = await extraUploadUrl(started.inspectionId, Number(slot.slice("extra-".length)));
        setTargets((prev) => new Map(prev).set(slot, t.signedUrl));
        void upload(slot, photo, t.signedUrl);
      } catch {
        patchSlot(slot, { upload: "error" });
      }
      setExtras((prev) => (prev.some((e) => e.slot === slot) ? prev : [...prev, { slot, location: "", note: "" }]));
    } else {
      void upload(slot, photo);
    }
    setPhase("damages");
  }

  function addExtra() {
    const used = new Set(extras.map((e) => e.slot));
    const index = Array.from({ length: MAX_EXTRA_PHOTOS }, (_, i) => i).find((i) => !used.has(extraSlot(i)) && !slots[extraSlot(i)]?.accepted);
    if (index === undefined) return;
    setCaptureSlot(extraSlot(index));
    setPhase("capture");
  }

  function removeExtra(slot: string) {
    setExtras((prev) => prev.filter((e) => e.slot !== slot));
    setSlots((prev) => {
      const next = { ...prev };
      if (next[slot]?.accepted) URL.revokeObjectURL(next[slot].accepted!.previewUrl);
      delete next[slot];
      return next;
    });
  }

  async function close() {
    // Locked doors cannot be undone; the unfinished return goes to customer service.
    if (started && !locked) {
      try {
        await cancelInspection(started.inspectionId);
      } catch {
        // Already submitted or gone; nothing to undo.
      }
    }
    router.push("/");
    router.refresh();
  }

  async function lock() {
    if (!started) return;
    setBusy(true);
    setError(null);
    locking.current = true;
    try {
      const result = await lockReturn(started.inspectionId);
      if (result.ok) {
        setLocked(true);
        setConfirmLock(false);
        setCaptureSlot(EXTERIOR_STEPS[0].slot);
        setPhase("capture");
      } else if (result.reason === "expired") {
        expiring.current = true;
        setPhase("expired");
      } else {
        setError("車內照片還沒上傳完成，請稍候再鎖門。");
        setConfirmLock(false);
      }
    } catch {
      setError("鎖門失敗，請確認網路後再試一次。");
      setConfirmLock(false);
    } finally {
      locking.current = false;
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------- submit

  const optionalSlots = [
    ...knownDamages.map((d) => knownDamageSlot(d.id)).filter((s) => slots[s]?.accepted),
    ...extras.map((e) => e.slot),
  ];
  const allSlots = [...REQUIRED_STEPS.map((s) => s.slot), ...optionalSlots];

  async function submit() {
    if (!started) return;
    setPhase("submitting");
    setError(null);
    const extraBySlot = new Map(extras.map((e) => [e.slot, e]));
    const reports: PhotoReport[] = allSlots.map((slot) => {
      const photo = slots[slot].accepted!;
      const extra = extraBySlot.get(slot);
      return {
        slot,
        width: photo.width,
        height: photo.height,
        verdict: photo.quality.verdict === "warn" ? "warn" : "pass",
        rejectedShots: slots[slot].rejectedShots,
        metrics: photo.quality.metrics,
        issues: photo.quality.issues.map((issue) => `${issue.code}:${issue.level}`),
        ...(extra ? { location: extra.location, note: extra.note.trim() || undefined } : {}),
      };
    });
    try {
      await completeInspection(started.inspectionId, reports);
      setPhase("done");
    } catch {
      setError("送出失敗，請確認網路後再試一次。");
      setPhase("review");
    }
  }

  // ---------------------------------------------------------------- screens

  const closeNote =
    isReturn && locked
      ? "車門已經鎖上，外部照片還沒拍完。離開後需要聯絡客服才能完成還車。"
      : isReturn
        ? "已拍的照片不會保留，車輛繼續租用並照常計費。"
        : "已拍的照片不會保留。";

  if (phase === "intro") {
    return (
      <main className="flex flex-1 flex-col px-6 py-8">
        <Link href="/" className="text-sm text-ink-2">
          返回
        </Link>
        <h1 className="mt-6 text-center text-xl font-semibold">{copy.title}</h1>
        <p className="mt-2 text-center text-sm text-ink-2">{copy.intro}</p>
        <div className="mt-8 rounded-xl bg-surface-2 p-5 text-center">
          <div className="text-2xl font-semibold">{vehicle.plate}</div>
          <div className="text-sm text-ink-2">{vehicle.car_model}</div>
        </div>
        {isReturn ? (
          <>
            <h2 className="mt-8 text-sm font-semibold">鎖門前：車內（{LOCK_MINUTES} 分鐘內完成並鎖門）</h2>
            <StepList steps={INTERIOR_STEPS} start={1} />
            <h2 className="mt-4 text-sm font-semibold">鎖門後：車外</h2>
            <StepList steps={EXTERIOR_STEPS} start={INTERIOR_STEPS.length + 1} />
            <p className="mt-2 text-xs text-ink-3">鎖門後就無法再打開車門，請先帶走隨身物品。</p>
          </>
        ) : (
          <>
            <h2 className="mt-8 text-sm font-semibold">需要拍攝</h2>
            <StepList steps={REQUIRED_STEPS} start={1} />
          </>
        )}
        {knownDamages.length > 0 && (
          <>
            <h2 className="mt-6 text-sm font-semibold">這台車已記錄的損傷（{knownDamages.length} 處）</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-2">
              {knownDamages.map((d) => (
                <li key={d.id}>
                  {d.location}・{d.damage_type}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-3">拍完必拍照片後，可以把這些損傷拍下來保障自身權益。</p>
          </>
        )}
        <p className="mt-4 text-xs text-ink-3">每張照片拍完會立刻檢查清晰度與亮度，不合格會請你重拍。</p>
        <div className="mt-auto pt-8">
          {error && <p role="alert" className="mb-3 text-center text-sm text-critical">{error}</p>}
          <button
            type="button"
            onClick={isReturn ? () => setConfirmReturn(true) : begin}
            disabled={busy}
            className="w-full rounded-full bg-accent py-3 font-medium text-accent-ink disabled:opacity-60"
          >
            {busy ? "準備中..." : isReturn ? "還車" : "開始拍照"}
          </button>
        </div>
        {confirmReturn && (
          <Sheet
            title="確定要還車嗎？"
            text={`計費會停在現在。請在 ${LOCK_MINUTES} 分鐘內拍完車內照片並下車鎖門；超過時間會自動取消還車，這段時間照常計費。`}
            confirmLabel={busy ? "準備中..." : "確認還車"}
            cancelLabel="繼續借車"
            busy={busy}
            onConfirm={async () => {
              await begin();
              setConfirmReturn(false);
            }}
            onCancel={() => router.push("/")}
          />
        )}
      </main>
    );
  }

  if (phase === "expired") {
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">還車已取消</h1>
        <p className="mt-2 text-sm text-ink-2">
          {LOCK_MINUTES} 分鐘內沒有完成車內拍照並鎖門，{vehicle.plate} 仍在租用中，
          {started?.startedAt ? `從 ${formatClock(started.startedAt)} 按下還車到現在` : "這段時間"}照常計費。
        </p>
        <p className="mt-2 text-sm text-ink-2">準備好後可以重新還車。</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 w-full rounded-full bg-accent py-3 font-medium text-accent-ink"
        >
          重新還車
        </button>
        <Link href="/" className="mt-3 w-full rounded-full border border-line py-3 text-sm">
          回到首頁
        </Link>
      </main>
    );
  }

  const countdown = counting ? <Countdown seconds={secondsLeft} /> : null;

  if (phase === "lock") {
    const interiorUploads = INTERIOR_STEPS.map((st) => slots[st.slot]?.upload);
    const uploading = interiorUploads.some((u) => u === "uploading");
    const failed = INTERIOR_STEPS.filter((st) => slots[st.slot]?.upload === "error");
    const ready = interiorUploads.every((u) => u === "done");
    return (
      <main className="flex flex-1 flex-col px-4 py-6">
        <h1 className="text-xl font-semibold">下車並鎖門</h1>
        <p className="mt-1 text-sm text-ink-2">車內照片已完成。鎖門後就無法再打開車門，請先確認：</p>
        <div className="mt-3">{countdown}</div>
        <ul className="mt-4 space-y-2 text-sm">
          {["隨身物品都已帶走", "加油卡、停車卡已放回卡夾", "車窗已關、引擎已熄火", "人已經下車"].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-ink-3">□</span>
              {item}
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-sm font-semibold">車內照片（點照片可重拍）</h2>
        <ul className="mt-2 grid grid-cols-3 gap-2">
          {INTERIOR_STEPS.map((st) => (
            <li key={st.slot}>
              <button
                type="button"
                onClick={() => {
                  setCaptureSlot(st.slot);
                  setPhase("capture");
                }}
                className="block w-full text-left"
              >
                {slots[st.slot]?.accepted && (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                  <img
                    src={slots[st.slot].accepted!.previewUrl}
                    alt={`${st.title}照片`}
                    className="aspect-[3/4] w-full rounded-lg bg-surface-2 object-cover"
                  />
                )}
                <div className="mt-1 truncate text-xs font-medium">{st.title}</div>
                <UploadNote state={slots[st.slot]?.upload ?? "idle"} />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6">
          {failed.length > 0 && (
            <button
              type="button"
              onClick={() => failed.forEach((st) => void upload(st.slot, slots[st.slot].accepted!))}
              className="mb-3 w-full rounded-full border border-line py-3 text-sm"
            >
              重新上傳失敗的照片
            </button>
          )}
          {error && <p role="alert" className="mb-3 text-center text-sm text-critical">{error}</p>}
          <button
            type="button"
            onClick={() => setConfirmLock(true)}
            disabled={!ready || busy}
            className="w-full rounded-full bg-accent py-3 font-medium text-accent-ink disabled:opacity-50"
          >
            {uploading ? "照片上傳中..." : "我已下車，鎖門"}
          </button>
          <button type="button" onClick={() => setConfirmClose(true)} className="mt-2 w-full py-2 text-sm text-ink-2">
            取消還車，繼續借車
          </button>
        </div>
        {confirmLock && (
          <Sheet
            title="確定要鎖門嗎？"
            text="鎖門後就無法再打開車門，車內照片也不能再重拍。接著請到車外拍外部照片。"
            confirmLabel={busy ? "鎖門中..." : "鎖門"}
            cancelLabel="還沒好"
            busy={busy}
            onConfirm={lock}
            onCancel={() => setConfirmLock(false)}
          />
        )}
        {confirmClose && (
          <CloseSheet label={copy.close} note={closeNote} onConfirm={close} onCancel={() => setConfirmClose(false)} />
        )}
      </main>
    );
  }

  if (phase === "capture") {
    const s = slotState(captureSlot);
    const index = stageSteps.findIndex((st) => st.slot === captureSlot);
    return (
      <>
        <CaptureScreen
          shot={shot}
          plate={vehicle.plate}
          accepted={s.accepted}
          pending={s.pending}
          progress={
            requiredShot
              ? {
                  current: index + 1,
                  total: stageSteps.length,
                  thumbs: stageSteps.map((st) => ({
                    slot: st.slot,
                    label: st.title,
                    previewUrl: slots[st.slot]?.accepted?.previewUrl,
                  })),
                  onSelect: setCaptureSlot,
                }
              : undefined
          }
          onShot={onShot}
          onRetake={onRetake}
          onAccept={onAccept}
          onClose={() => (requiredShot ? setConfirmClose(true) : setPhase("damages"))}
          closeLabel={requiredShot ? (isReturn && locked ? "離開" : copy.close) : "返回"}
          notice={countdown}
        />
        {confirmClose && (
          <CloseSheet
            label={isReturn && locked ? "離開" : copy.close}
            note={closeNote}
            onConfirm={close}
            onCancel={() => setConfirmClose(false)}
          />
        )}
      </>
    );
  }

  if (phase === "damages" && kind !== "registration") {
    const extraCopy = EXTRA_COPY[kind];
    const pendingUploads = optionalSlots.some((slot) => slots[slot]?.upload === "uploading");
    const missingLocation = extras.some((e) => !e.location);
    return (
      <main className="flex flex-1 flex-col px-4 py-6">
        <h1 className="text-xl font-semibold">損傷紀錄</h1>
        <p className="mt-1 text-sm text-ink-2">必拍照片已完成。以下都不強制，但拍下來可以保障你的權益。</p>

        {knownDamages.length > 0 && (
          <section className="mt-6">
            <h2 className="font-semibold">已記錄的損傷</h2>
            <p className="mt-1 text-sm text-ink-2">
              {kind === "pickup"
                ? "這些是這台車之前就有的損傷，建議先拍下來。"
                : "請拍下這些已記錄損傷目前的狀況。"}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {knownDamages.map((d) => {
                const slot = knownDamageSlot(d.id);
                const photo = slots[slot]?.accepted;
                return (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                      <img src={photo.previewUrl} alt="" className="h-14 w-14 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-surface-2 text-xs text-ink-3">
                        未拍
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-medium">{d.location}</div>
                      <div className="text-ink-3">
                        {d.damage_type}・{d.severity}
                        {d.image_type ? `・從${ANGLE_LABELS[d.image_type]}看得到` : ""}
                      </div>
                      {photo && <UploadNote state={slots[slot].upload} />}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCaptureSlot(slot);
                        setPhase("capture");
                      }}
                      className="rounded-full border border-line px-4 py-2 text-sm"
                    >
                      {photo ? "重拍" : "拍攝"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h2 className="font-semibold">{extraCopy.heading}</h2>
          <p className="mt-1 text-sm text-ink-2">{extraCopy.text}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {extras.map((e) => {
              const photo = slots[e.slot]?.accepted;
              return (
                <li key={e.slot} className="flex gap-3 rounded-xl border border-line p-3">
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                    <img src={photo.previewUrl} alt="" className="h-20 w-16 shrink-0 rounded-md object-cover" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
                    <select
                      value={e.location}
                      onChange={(ev) =>
                        setExtras((prev) => prev.map((x) => (x.slot === e.slot ? { ...x, location: ev.target.value } : x)))
                      }
                      aria-label="損傷位置"
                      className="rounded border border-line bg-surface-1 px-2 py-1.5"
                    >
                      <option value="">選擇位置（必填）</option>
                      {DAMAGE_AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <input
                      value={e.note}
                      maxLength={200}
                      onChange={(ev) =>
                        setExtras((prev) => prev.map((x) => (x.slot === e.slot ? { ...x, note: ev.target.value } : x)))
                      }
                      placeholder="補充說明（選填）"
                      className="rounded border border-line bg-surface-1 px-2 py-1.5"
                    />
                    <div className="flex items-center justify-between">
                      <UploadNote state={slots[e.slot]?.upload ?? "idle"} />
                      <button type="button" onClick={() => removeExtra(e.slot)} className="text-ink-3">
                        刪除
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {extras.length < MAX_EXTRA_PHOTOS && (
            <button type="button" onClick={addExtra} className="mt-3 w-full rounded-full border border-line py-3 text-sm">
              新增損傷照片
            </button>
          )}
        </section>

        <div className="mt-auto pt-6">
          {missingLocation && <p className="mb-2 text-center text-sm text-ink-2">請為每張損傷照片選擇位置</p>}
          <button
            type="button"
            onClick={() => setPhase("review")}
            disabled={missingLocation || pendingUploads}
            className="w-full rounded-full bg-accent py-3 font-medium text-accent-ink disabled:opacity-50"
          >
            {pendingUploads ? "照片上傳中..." : "下一步：確認照片"}
          </button>
        </div>
      </main>
    );
  }

  if (phase === "review" || phase === "submitting") {
    const uploading = allSlots.some((slot) => slots[slot]?.upload === "uploading");
    const failed = allSlots.filter((slot) => slots[slot]?.upload === "error");
    const ready = allSlots.every((slot) => slots[slot]?.upload === "done");
    return (
      <main className="flex flex-1 flex-col px-4 py-6">
        <h1 className="text-xl font-semibold">確認照片</h1>
        <p className="mt-1 text-sm text-ink-2">
          {isReturn ? "點車外或損傷照片可以重拍（車門已鎖，車內照片無法重拍）。" : "點照片可以重拍。"}確認無誤後送出。
        </p>
        <ul className="mt-5 grid grid-cols-3 gap-2">
          {allSlots.map((slot) => {
            const photo = slots[slot]?.accepted;
            const label = labelFor(slot, knownDamages, extras);
            // The doors are locked; the interior can no longer be reshot.
            const fixed = isReturn && INTERIOR_SLOTS.includes(slot);
            return (
              <li key={slot}>
                <button
                  type="button"
                  disabled={fixed}
                  onClick={() => {
                    setCaptureSlot(slot);
                    setPhase("capture");
                  }}
                  className="block w-full text-left"
                >
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                    <img src={photo.previewUrl} alt={`${label}照片`} className="aspect-[3/4] w-full rounded-lg bg-surface-2 object-cover" />
                  )}
                  <div className="mt-1 truncate text-xs font-medium">{label}</div>
                  <UploadNote state={slots[slot]?.upload ?? "idle"} />
                </button>
              </li>
            );
          })}
        </ul>
        {hasDamageStep && (
          <button type="button" onClick={() => setPhase("damages")} className="mt-4 text-sm text-ink-2 underline">
            回到損傷紀錄
          </button>
        )}
        <div className="mt-auto pt-6">
          {failed.length > 0 && (
            <button
              type="button"
              onClick={() => failed.forEach((slot) => void upload(slot, slots[slot].accepted!))}
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
            {phase === "submitting" ? "送出中..." : uploading ? "照片上傳中..." : kind === "pickup" ? "確認取車" : kind === "return" ? "確認還車" : "完成登錄"}
          </button>
        </div>
      </main>
    );
  }

  const totalRejected = Object.values(slots).reduce((n, s) => n + s.rejectedShots, 0);
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">{kind === "pickup" ? "取車完成" : kind === "return" ? "還車完成" : "登錄完成"}</h1>
      <p className="mt-2 text-sm text-ink-2">{copy.done(vehicle.plate)}</p>
      {isReturn && started?.startedAt && (
        <p className="mt-2 text-sm text-ink-2">計費已停在 {formatClock(started.startedAt)}（按下還車的時間）。</p>
      )}
      <dl className="mt-8 grid w-full grid-cols-2 gap-3 text-left">
        <div className="rounded-xl bg-surface-2 p-4">
          <dt className="text-xs text-ink-3">送出照片</dt>
          <dd className="mt-1 text-2xl font-semibold">{allSlots.length} 張</dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-4">
          <dt className="text-xs text-ink-3">拍照時攔下的不合格照片</dt>
          <dd className="mt-1 text-2xl font-semibold">{totalRejected} 張</dd>
        </div>
      </dl>
      {kind !== "registration" && started && (
        <>
          <p className="mt-8 text-sm text-ink-2">
            照片會由 AI 檢查車況，通常幾分鐘內完成。之後也可以在首頁的「歷史訂單」查看。
          </p>
          <Link
            href={`/records/${started.inspectionId}`}
            className="mt-3 w-full rounded-full bg-accent py-3 font-medium text-accent-ink"
          >
            查看{kind === "pickup" ? "取車" : "還車"}確認
          </Link>
        </>
      )}
      <Link href="/" className="mt-auto w-full rounded-full border border-line py-3 text-sm">
        回到首頁
      </Link>
    </main>
  );
}

function labelFor(slot: string, knownDamages: KnownDamage[], extras: Extra[]) {
  const required = REQUIRED_STEPS.find((s) => s.slot === slot);
  if (required) return required.title;
  const damage = knownDamages.find((d) => knownDamageSlot(d.id) === slot);
  if (damage) return `已知：${damage.location}`;
  const extra = extras.find((e) => e.slot === slot);
  return `其他損傷${extra?.location ? `：${extra.location}` : ""}`;
}

function UploadNote({ state }: { state: UploadState }) {
  const text = { idle: "", uploading: "上傳中", done: "已上傳", error: "上傳失敗" }[state];
  return text ? <div className={`text-xs ${state === "error" ? "text-critical" : "text-ink-3"}`}>{text}</div> : null;
}

function CloseSheet({
  label,
  note,
  onConfirm,
  onCancel,
}: {
  label: string;
  note: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-2xl bg-surface-1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="text-center font-medium">確定要{label}嗎？</p>
        <p className="mt-1 text-center text-sm text-ink-2">{note}</p>
        <button type="button" onClick={onConfirm} className="mt-4 w-full rounded-full bg-accent py-3 font-medium text-accent-ink">
          {label}
        </button>
        <button type="button" onClick={onCancel} className="mt-2 w-full rounded-full border border-line py-3 text-sm">
          繼續拍照
        </button>
      </div>
    </div>
  );
}

function Sheet({
  title,
  text,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-2xl bg-surface-1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="text-center font-medium">{title}</p>
        <p className="mt-1 text-center text-sm text-ink-2">{text}</p>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="mt-4 w-full rounded-full bg-accent py-3 font-medium text-accent-ink disabled:opacity-60"
        >
          {confirmLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="mt-2 w-full rounded-full border border-line py-3 text-sm">
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

function StepList({ steps, start }: { steps: typeof REQUIRED_STEPS; start: number }) {
  return (
    <ol className="mt-2 space-y-1 text-sm text-ink-2">
      {steps.map((s, i) => (
        <li key={s.slot}>
          {start + i}. {s.title}
        </li>
      ))}
    </ol>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <p className={`mt-1 text-sm font-semibold tabular-nums ${seconds <= 60 ? "text-critical" : ""}`}>
      請在 {text} 內拍完車內並鎖門
    </p>
  );
}

function formatClock(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );
}

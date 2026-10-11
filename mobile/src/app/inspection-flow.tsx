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
  MAX_PARKING_PHOTOS,
  parkingSlot,
  REQUIRED_STEPS,
  RETURN_LOCK_SECONDS,
  type Vehicle,
} from "@/lib/inspection";
import { preparePhoto, type PreparedPhoto } from "@/lib/quality";
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
import { AppBar } from "./app-bar";
import { CaptureScreen, type Shot } from "./capture-screen";
import { CarArt } from "./car-art";
import { Camera, CheckCircle, ChevronRight, Close, Pencil } from "./icons";

type UploadState = "idle" | "uploading" | "done" | "error";

type SlotState = {
  accepted?: PreparedPhoto;
  // The shot being reviewed right after capture, before the user accepts it.
  pending?: PreparedPhoto;
  rejectedShots: number;
  upload: UploadState;
};

type Extra = { slot: string; location: string; note: string };

// Pickup:       intro -> capture -> damages -> confirm (iRent's 確認取車) -> in-use page
// Return:       capture (interior) -> lock -> capture (exterior) -> damages -> parking -> done
//               "expired" when the lock window runs out
// Registration: intro -> capture -> review -> done
type Phase =
  | "intro"
  | "capture"
  | "lock"
  | "damages"
  | "confirm"
  | "parking"
  | "review"
  | "submitting"
  | "done"
  | "expired";

const INTERIOR_STEPS = REQUIRED_STEPS.filter((s) => INTERIOR_SLOTS.includes(s.slot));
const EXTERIOR_STEPS = REQUIRED_STEPS.filter((s) => !INTERIOR_SLOTS.includes(s.slot));
const LOCK_MINUTES = RETURN_LOCK_SECONDS / 60;

type Props = {
  kind: InspectionKind;
  vehicle: Vehicle;
  knownDamages: KnownDamage[];
  rentalId?: number;
  token?: string;
  // Return opened from the in-use page's "start return": billing stops at once,
  // so skip the intro and go straight to the camera.
  autoStart?: boolean;
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
    intro: "請仔細檢查有無損傷、凹陷等，\n完善拍照可保障自身權益。",
    close: "取消取車",
    done: (plate: string) => `已完成 ${plate} 的取車拍照，祝行車平安。`,
  },
  return: {
    title: "還車",
    intro: `按下「還車」後計費就停止。接著請在 ${LOCK_MINUTES} 分鐘內拍完車內照片、下車關門並按「下一步」鎖門，再到車外拍外部照片。`,
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

// Short labels for the thumbnail strip.
const SHORT: Record<string, string> = { card: "卡片" };
const shortLabel = (slot: string, imageType?: number) => SHORT[slot] ?? (imageType ? ANGLE_LABELS[imageType] : "");

// iRent's red pill button: 48px tall, 15px label.
const PRIMARY =
  "flex h-12 w-full items-center justify-center rounded-full bg-accent text-[15px] text-accent-ink disabled:opacity-50";

const LOCK_CHECKLIST = ["隨身物品都已帶走", "加油卡、停車卡已放回卡夾", "車窗已關、引擎已熄火", "人已經下車並關好車門"];

function Flow({ kind, vehicle, knownDamages, rentalId, token, autoStart }: Props) {
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
  const [locked, setLocked] = useState(false);
  const [parkingNote, setParkingNote] = useState("");
  const parkingInput = useRef<HTMLInputElement>(null);
  const autoStarted = useRef(false);
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
    cancelInspection(started.inspectionId)
      .catch(() => {})
      .finally(() => setPhase("expired"));
  }, [counting, secondsLeft, started]);
  // Return opened with "start return" from the in-use page: begin right away.
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    void begin();
    // begin only reads props and setters; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

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
      else finishStage();
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

  // Every photo of the current stage is taken: on to the next screen.
  function finishStage() {
    if (isReturn && !locked) setPhase("lock");
    else setPhase(hasDamageStep ? "damages" : "review");
  }

  const stageDone = stageSteps.every((st) => slots[st.slot]?.accepted);

  function afterDamages() {
    setPhase(kind === "pickup" ? "confirm" : kind === "return" ? "parking" : "review");
  }

  // Where the car was left (return): no quality check, uploaded straight away.
  async function onParkingFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const slot = Array.from({ length: MAX_PARKING_PHOTOS }, (_, i) => parkingSlot(i)).find((sl) => !slots[sl]?.accepted);
    if (!file || !slot) return;
    try {
      const photo = await preparePhoto(file);
      patchSlot(slot, { accepted: photo, rejectedShots: 0 });
      void upload(slot, photo);
    } catch {
      setError("無法讀取這張照片，請再拍一次。");
    }
  }

  function removeParking(slot: string) {
    setSlots((prev) => {
      const next = { ...prev };
      if (next[slot]?.accepted) URL.revokeObjectURL(next[slot].accepted!.previewUrl);
      delete next[slot];
      return next;
    });
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
    router.push(isReturn && rentalId ? `/rental/${rentalId}` : "/");
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
        setCaptureSlot(EXTERIOR_STEPS[0].slot);
        setPhase("capture");
      } else {
        expiring.current = true;
        setPhase("expired");
      }
    } catch {
      setError("鎖門失敗，請確認網路後再試一次。");
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
  const parkingSlots = Array.from({ length: MAX_PARKING_PHOTOS }, (_, i) => parkingSlot(i)).filter(
    (sl) => slots[sl]?.accepted,
  );
  const allSlots = [...REQUIRED_STEPS.map((s) => s.slot), ...optionalSlots, ...(isReturn ? parkingSlots : [])];
  const uploadsReady = allSlots.every((slot) => slots[slot]?.upload === "done");
  const uploadsBusy = allSlots.some((slot) => slots[slot]?.upload === "uploading");
  const failedUploads = allSlots.filter((slot) => slots[slot]?.upload === "error");
  const retryFailed = () => failedUploads.forEach((slot) => void upload(slot, slots[slot].accepted!));

  async function submit(back: Phase) {
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
      await completeInspection(started.inspectionId, reports, isReturn ? { note: parkingNote } : undefined);
      if (kind === "pickup" && started.rentalId) {
        // Straight to the in-use page, as in iRent.
        router.push(`/rental/${started.rentalId}`);
        router.refresh();
        return;
      }
      setPhase("done");
    } catch {
      setError("送出失敗，請確認網路後再試一次。");
      setPhase(back);
    }
  }

  // ---------------------------------------------------------------- screens

  const closeNote =
    isReturn && locked
      ? "車門已經鎖上，外部照片還沒拍完。離開後需要聯絡客服才能完成還車。"
      : isReturn
        ? "已拍的照片不會保留，車輛繼續租用並照常計費。"
        : "已拍的照片不會保留。";
  const rentalPage = rentalId ? `/rental/${rentalId}` : "/";
  const countdown = counting ? <Countdown seconds={secondsLeft} /> : null;

  if (phase === "intro") {
    // A return started from the in-use page skips this screen; show it only
    // while starting, or if starting failed.
    const starting = isReturn && autoStart && !error;
    // Spacing follows iRent's 取車拍照 screen.
    return (
      <main className="flex flex-1 flex-col bg-surface-0">
        <AppBar
          title={kind === "pickup" ? "取車拍照" : kind === "return" ? "還車拍照" : "車輛登錄"}
          back={isReturn ? rentalPage : "/"}
          progress={0.67}
        />
        <div className="flex flex-1 flex-col items-center px-[27px] pt-[43px] pb-8 text-center">
          <h2 className="text-2xl leading-8 font-semibold text-[#222]">
            {kind === "pickup" ? "檢查車輛狀況" : kind === "return" ? "還車檢查" : copy.title}
          </h2>
          <p className="mt-2.5 text-sm leading-5 whitespace-pre-line text-ink-2">{copy.intro}</p>
          <CarArt plate={vehicle.plate} className="mt-[64px] w-[280px] max-w-full" />
          <p className="mt-6 text-[15px] text-ink-2">車號：{vehicle.plate}</p>
          {knownDamages.length > 0 && kind === "pickup" && (
            <p className="mt-2 text-xs text-ink-3">
              這台車已記錄 {knownDamages.length} 處損傷，拍完車況後可以把它們拍下來，保障自身權益。
            </p>
          )}
          <div className="mt-[84px] w-full">
            {error && <p role="alert" className="mb-3 text-sm text-critical">{error}</p>}
            {starting ? (
              <p className="py-3 text-sm text-ink-2">準備還車中...</p>
            ) : (
              <button type="button" onClick={isReturn ? () => setConfirmReturn(true) : begin} disabled={busy} className={PRIMARY}>
                {busy ? "準備中..." : kind === "pickup" ? "拍攝車輛狀況" : isReturn ? "還車" : "開始拍照"}
              </button>
            )}
          </div>
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
            onCancel={() => setConfirmReturn(false)}
          />
        )}
      </main>
    );
  }

  if (phase === "expired") {
    return (
      <main className="flex flex-1 flex-col bg-surface-0">
        <AppBar title="還車已取消" back={rentalPage} />
        <div className="flex flex-1 flex-col items-center px-6 py-12 text-center">
          <p className="text-sm text-ink-2">
            {LOCK_MINUTES} 分鐘內沒有完成車內拍照並鎖門，{vehicle.plate} 仍在租用中，
            {started?.startedAt ? `從 ${formatClock(started.startedAt)} 按下還車到現在` : "這段時間"}照常計費。
          </p>
          <p className="mt-2 text-sm text-ink-2">準備好後可以重新還車。</p>
          <Link href={rentalPage} className={`mt-auto ${PRIMARY}`}>
            回到用車頁
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "lock") {
    return (
      <main className="flex flex-1 flex-col bg-surface-0">
        <AppBar title="下車鎖門" onBack={() => setConfirmClose(true)} progress={0.45} />
        <div className="flex flex-1 flex-col px-4 py-5">
          <h2 className="text-xl font-semibold">鎖門前請確認</h2>
          <p className="mt-1 text-sm text-ink-2">鎖門後就無法再打開車門，車內照片也不能重拍。確認以下事項後按「確認，鎖門」。</p>
          <div className="mt-2">{countdown}</div>
          <ul className="mt-4 flex flex-col gap-2 rounded-xl bg-surface-1 p-4 text-sm">
            {LOCK_CHECKLIST.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-ink-3">{LOCK_CHECKLIST.indexOf(item) + 1}.</span>
                {item}
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-semibold">車內照片（鎖門前可以點照片重拍）</h3>
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
          <p className="mt-2 text-xs text-ink-3">照片會在背景繼續上傳，不用等上傳完成就可以鎖門。</p>
          <div className="mt-auto pt-6">
            {error && <p role="alert" className="mb-3 text-center text-sm text-critical">{error}</p>}
            <button
              type="button"
              onClick={lock}
              disabled={busy}
              className={PRIMARY}
            >
              {busy ? "鎖門中..." : "確認，鎖門"}
            </button>
            <button type="button" onClick={() => setConfirmClose(true)} className="mt-2 w-full py-2 text-sm text-ink-2">
              取消還車，繼續借車
            </button>
          </div>
        </div>
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
                    short: shortLabel(st.slot, st.imageType),
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
          closeLabel={requiredShot ? (isReturn && locked ? "離開" : "取消") : "返回"}
          notice={countdown}
          onDone={requiredShot ? finishStage : undefined}
          doneLabel={isReturn && !locked ? "下一步" : "完成"}
          doneEnabled={stageDone && !s.pending}
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
    const missingLocation = extras.some((e) => !e.location);
    return (
      <main className="flex flex-1 flex-col bg-surface-0">
        <AppBar title="損傷紀錄" progress={isReturn ? 0.75 : 0.6} />
        <div className="flex flex-1 flex-col px-4 py-5">
          <p className="text-sm text-ink-2">必拍照片已完成。以下都不強制，但拍下來可以保障你的權益。</p>

          {knownDamages.length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold">已記錄的損傷</h2>
              <p className="mt-1 text-sm text-ink-2">
                {kind === "pickup" ? "這些是這台車之前就有的損傷，建議先拍下來。" : "請拍下這些已記錄損傷目前的狀況。"}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {knownDamages.map((d) => {
                  const slot = knownDamageSlot(d.id);
                  const photo = slots[slot]?.accepted;
                  return (
                    <li key={d.id} className="flex items-center gap-3 rounded-xl bg-surface-1 p-3">
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
                  <li key={e.slot} className="flex gap-3 rounded-xl bg-surface-1 p-3">
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
              <button type="button" onClick={addExtra} className="mt-3 w-full rounded-full border border-line bg-surface-1 py-3 text-sm">
                新增損傷照片
              </button>
            )}
          </section>

          <div className="mt-auto pt-6">
            {missingLocation && <p className="mb-2 text-center text-sm text-ink-2">請為每張損傷照片選擇位置</p>}
            <button
              type="button"
              onClick={afterDamages}
              disabled={missingLocation}
              className={PRIMARY}
            >
              下一步
            </button>
          </div>
        </div>
      </main>
    );
  }

  // iRent's 確認取車: only the confirm button does anything in the demo; the
  // rows, prices and signature are shown as in the app.
  if ((phase === "confirm" || (phase === "submitting" && kind === "pickup")) && kind === "pickup") {
    const dueBack = new Date(Math.ceil((now + 24 * 3600 * 1000) / 3600000) * 3600000);
    return (
      <main className="flex flex-1 flex-col bg-surface-0">
        <AppBar title="確認取車" onBack={() => setPhase("damages")} progress={1} />
        <div className="flex flex-1 flex-col">
          <ul className="mx-[23px] mt-8 divide-y divide-line rounded-lg bg-white">
            <ConfirmRow label="查看租車合約" chevron />
            <ConfirmRow label="查詢/邀請共同承租人" note="還有人未回覆邀請哦！快通知對方至通知中心確認" chevron />
            <ConfirmRow label="預設還車時間">
              <span className="flex items-center gap-1.5 text-base text-irent-blue">
                {formatDue(dueBack)}
                <Pencil className="h-4 w-4" />
              </span>
            </ConfirmRow>
            <ConfirmRow label="確認簽名">
              <Signature className="h-8 w-20 text-[#222]" />
            </ConfirmRow>
            <ConfirmRow label="安心服務" price="$50" unit="/hr">
              <AddOn />
            </ConfirmRow>
            <ConfirmRow label="行車記錄器" price="$100" unit="/日">
              <AddOn />
            </ConfirmRow>
          </ul>
          <ul className="mt-[22px] flex flex-col gap-3 pr-[26px] pl-[33px] text-sm leading-[23px] text-[#555]">
            {[
              "我已確認租車合約無誤",
              "我確實遵守「酒後不駕車」的安全法則",
              "我同意不懸掛偽造、已吊扣、報廢、其他車輛之車牌，及污損車牌行為",
              "我同意訂單異動時，由和雲行動服務代為處理發票及銷貨退回證明單，以加速退款作業",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle className="h-[19px] w-[19px] shrink-0 text-irent-blue" />
                {t}
              </li>
            ))}
            <li className="flex items-center gap-3">
              <CheckCircle className="h-[19px] w-[19px] shrink-0 text-irent-blue" />
              <span>
                我同意<span className="text-irent-blue underline underline-offset-2">行車紀錄器啟用須知</span>
              </span>
            </li>
          </ul>
          <div className="mt-auto bg-white px-[23px] pt-[15px] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {!uploadsReady && (
              <p className="mb-2 text-center text-xs text-ink-2">
                {failedUploads.length ? `${failedUploads.length} 張照片上傳失敗` : "取車照片上傳中..."}
              </p>
            )}
            {failedUploads.length > 0 && (
              <button
                type="button"
                onClick={retryFailed}
                className="mb-3 flex h-12 w-full items-center justify-center rounded-full border border-line bg-white text-[15px]"
              >
                重新上傳失敗的照片
              </button>
            )}
            {error && <p role="alert" className="mb-3 text-center text-sm text-critical">{error}</p>}
            <button
              type="button"
              onClick={() => submit("confirm")}
              disabled={!uploadsReady || phase === "submitting"}
              className={PRIMARY}
            >
              {phase === "submitting" ? "取車中..." : "確認取車"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // iRent's 提供停車位置: a parking photo is required (no quality check); the
  // description is optional. "Next" uploads anything left and submits.
  if ((phase === "parking" || (phase === "submitting" && isReturn)) && isReturn) {
    const hasPhoto = parkingSlots.length > 0;
    return (
      <main className="flex flex-1 flex-col bg-white">
        <AppBar title="提供停車位置" onBack={() => setPhase("damages")} progress={0.5} />
        <input ref={parkingInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onParkingFile} />
        <div className="flex flex-1 flex-col px-[25px] pt-[70px] pb-[max(4.5rem,env(safe-area-inset-bottom))]">
          <h2 className="text-center text-2xl leading-8 font-semibold text-[#222]">幫助下一位用戶找車吧</h2>
          <div className="mt-6 px-2.5 text-[13px] leading-5 text-ink-2">
            <p>
              <span className="text-accent">路邊停車</span>：請【描述】停車位置並【拍攝】車輛停放環境（含車輛）
            </p>
            <p className="mt-[18px]">
              <span className="text-accent">停車場停車</span>：請【描述】
              <span className="font-semibold text-[#222]">「還車樓層和停車格號碼」</span>
              並【拍攝】車輛停放環境（含車輛）
            </p>
          </div>
          <input
            value={parkingNote}
            maxLength={100}
            onChange={(e) => setParkingNote(e.target.value)}
            placeholder="長安東路150號7-11附近"
            aria-label="停車位置說明（選填）"
            className="mt-[23px] h-[47px] rounded-md bg-surface-2 px-3 text-sm text-[#333] outline-none placeholder:text-ink-3"
          />
          <div className="-mx-[25px] mt-[25px] flex items-center gap-3 text-xs text-ink-3">
            <span className="h-px flex-1 bg-line" />且<span className="h-px flex-1 bg-line" />
          </div>
          <ul className="mt-[31px] flex flex-wrap gap-6 px-2">
            {parkingSlots.map((slot) => (
              <li key={slot} className="w-16">
                <div className="relative h-16 w-16">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img src={slots[slot].accepted!.previewUrl} alt="停車環境照片" className="h-16 w-16 rounded-sm object-cover" />
                  <button
                    type="button"
                    onClick={() => removeParking(slot)}
                    aria-label="移除這張照片"
                    className="absolute -top-1.5 -right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#9a9ca0] text-white"
                  >
                    <Close className="h-2.5 w-2.5" />
                  </button>
                </div>
                <p className={`mt-3 text-center text-sm ${slots[slot].upload === "error" ? "text-critical" : "text-ink-2"}`}>
                  {slots[slot].upload === "error" ? "上傳失敗" : "直接拍攝"}
                </p>
              </li>
            ))}
            {parkingSlots.length < MAX_PARKING_PHOTOS && (
              <li>
                <button
                  type="button"
                  onClick={() => parkingInput.current?.click()}
                  aria-label="拍攝停車環境"
                  className="flex h-16 w-16 items-center justify-center rounded-sm bg-surface-2 text-[#b5b7bb]"
                >
                  <Camera className="h-7 w-7" />
                </button>
              </li>
            )}
          </ul>
          <div className="mt-auto pt-6">
            {failedUploads.length > 0 && (
              <button
                type="button"
                onClick={retryFailed}
                className="mb-3 flex h-12 w-full items-center justify-center rounded-full border border-line bg-white text-[15px]"
              >
                重新上傳失敗的照片
              </button>
            )}
            {error && <p role="alert" className="mb-3 text-center text-sm text-critical">{error}</p>}
            <button
              type="button"
              onClick={() => submit("parking")}
              disabled={!hasPhoto || !uploadsReady || phase === "submitting"}
              className={PRIMARY}
            >
              {phase === "submitting" ? "送出中..." : uploadsBusy ? "照片上傳中..." : "下一步"}
            </button>
            {/* Shown as in iRent; the demo requires a parking photo. */}
            <p className="mt-[14px] text-center text-sm text-ink-2">略過</p>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "review" || phase === "submitting") {
    return (
      <main className="flex flex-1 flex-col bg-surface-0">
        <AppBar title="確認照片" progress={0.9} />
        <div className="flex flex-1 flex-col px-4 py-5">
          <p className="text-sm text-ink-2">點照片可以重拍。確認無誤後送出。</p>
          <ul className="mt-5 grid grid-cols-3 gap-2">
            {allSlots.map((slot) => {
              const photo = slots[slot]?.accepted;
              const label = labelFor(slot, knownDamages, extras);
              return (
                <li key={slot}>
                  <button
                    type="button"
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
          <div className="mt-auto pt-6">
            {failedUploads.length > 0 && (
              <button type="button" onClick={retryFailed} className="mb-3 flex h-12 w-full items-center justify-center rounded-full border border-line bg-white text-[15px]">
                重新上傳失敗的照片
              </button>
            )}
            {error && <p role="alert" className="mb-3 text-center text-sm text-critical">{error}</p>}
            <button
              type="button"
              onClick={() => submit("review")}
              disabled={!uploadsReady || phase === "submitting"}
              className={PRIMARY}
            >
              {phase === "submitting" ? "送出中..." : uploadsBusy ? "照片上傳中..." : "完成登錄"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const totalRejected = Object.values(slots).reduce((n, s) => n + s.rejectedShots, 0);
  return (
    <main className="flex flex-1 flex-col bg-surface-0">
      <AppBar title={kind === "return" ? "還車完成" : "登錄完成"} back="/" />
      <div className="flex flex-1 flex-col items-center px-6 py-10 text-center">
        <p className="text-sm text-ink-2">{copy.done(vehicle.plate)}</p>
        {isReturn && started?.startedAt && (
          <p className="mt-2 text-sm text-ink-2">計費已停在 {formatClock(started.startedAt)}（按下還車的時間）。</p>
        )}
        <dl className="mt-8 grid w-full grid-cols-2 gap-3 text-left">
          <div className="rounded-xl bg-surface-1 p-4">
            <dt className="text-xs text-ink-3">送出照片</dt>
            <dd className="mt-1 text-2xl font-semibold">{allSlots.length} 張</dd>
          </div>
          <div className="rounded-xl bg-surface-1 p-4">
            <dt className="text-xs text-ink-3">拍照時攔下的不合格照片</dt>
            <dd className="mt-1 text-2xl font-semibold">{totalRejected} 張</dd>
          </div>
        </dl>
        {isReturn && started && (
          <>
            <p className="mt-8 text-sm text-ink-2">照片會由 AI 檢查車況，通常幾分鐘內完成。之後也可以在首頁的「歷史訂單」查看。</p>
            <Link
              href={`/records/${started.inspectionId}`}
              className={`mt-3 ${PRIMARY}`}
            >
              查看還車確認
            </Link>
          </>
        )}
        <Link href="/" className="mt-auto flex h-12 w-full items-center justify-center rounded-full border border-line bg-white text-[15px]">
          回到首頁
        </Link>
      </div>
    </main>
  );
}

// One row of iRent's confirm-pickup card: 56px tall, 16px label.
function ConfirmRow({
  label,
  note,
  price,
  unit,
  chevron = false,
  children,
}: {
  label: string;
  note?: string;
  price?: string;
  unit?: string;
  chevron?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex min-h-14 items-center justify-between gap-3 px-[25px] py-3">
      <div>
        <div className="text-base font-medium text-[#333]">
          {label}
          {price && (
            <>
              ・{price}
              <span className="text-xs font-normal text-ink-2">{unit}</span>
            </>
          )}
        </div>
        {note && <div className="mt-0.5 text-[11px] text-accent">{note}</div>}
      </div>
      {children}
      {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-[#b0b2b6]" />}
    </li>
  );
}

// "Added" with a switched-on toggle, as on iRent's add-on rows.
function AddOn() {
  return (
    <span className="flex items-center gap-2 text-sm text-irent-blue">
      已加購
      <span className="flex h-6 w-[42px] items-center justify-end rounded-full bg-irent-blue p-0.5" aria-hidden>
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </span>
    </span>
  );
}

// A handwritten-looking stroke standing in for the renter's signature.
function Signature({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 32" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-label="已簽名">
      <path d="M4 22c4-9 7-14 9-13s-3 14 0 14 6-12 9-12-1 10 2 10 5-8 8-8 0 7 3 7 4-9 7-9-2 9 1 9 5-6 8-6 2 5 5 5 5-3 8-4" />
      <path d="M30 6c-2 6-3 12-2 20M58 5l-3 21" />
    </svg>
  );
}

function formatDue(d: Date) {
  const p = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
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
        <button type="button" onClick={onConfirm} className={`mt-4 ${PRIMARY}`}>
          {label}
        </button>
        <button type="button" onClick={onCancel} className="mt-2 flex h-12 w-full items-center justify-center rounded-full border border-line bg-white text-[15px]">
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
          className={`mt-4 ${PRIMARY}`}
        >
          {confirmLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="mt-2 flex h-12 w-full items-center justify-center rounded-full border border-line bg-white text-[15px]">
          {cancelLabel}
        </button>
      </div>
    </div>
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

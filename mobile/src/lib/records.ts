import "server-only";
import { ANGLE_LABELS, PHOTO_BUCKET, REQUIRED_STEPS } from "./inspection";
import { getSupabase } from "./supabase";

// What the renter sees after a pickup or return: the AI's preliminary findings
// in plain language, and whether staff have reviewed them. Built from alert
// kinds and details, never from the internal alert message (written for staff).

type AlertRow = {
  kind: string;
  status: "open" | "confirmed" | "dismissed";
  details: { items?: { location: string; type: string }[] | string[]; missing?: string[]; location?: string } | null;
  inspection_photos: { image_type: number | null } | null;
};

export type Finding = {
  title: string;
  text: string;
  review: "pending" | "confirmed" | "dismissed";
};

export type RecordView = {
  kind: "pickup" | "return";
  plate: string;
  carModel: string;
  submittedAt: string;
  analysisDone: boolean;
  analysisFailed: boolean;
  findings: Finding[];
  photos: { slot: string; label: string; url: string | null }[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function damageItems(rows: AlertRow[]) {
  const items = rows.flatMap((r) => (r.details?.items ?? []) as { location: string; type: string }[]);
  return [...new Set(items.map((i) => `${i.location}${i.type}`))].join("、");
}

function angles(rows: AlertRow[]) {
  return [...new Set(rows.map((r) => ANGLE_LABELS[r.inspection_photos?.image_type ?? 0]).filter(Boolean))].join("、");
}

// A group is "confirmed" if staff confirmed any of it, "dismissed" only if all were dismissed.
function review(rows: AlertRow[]): Finding["review"] {
  if (rows.some((r) => r.status === "confirmed")) return "confirmed";
  if (rows.every((r) => r.status === "dismissed")) return "dismissed";
  return "pending";
}

function describe(kind: "pickup" | "return", alertKind: string, rows: AlertRow[]): Omit<Finding, "review"> | null {
  const pickup = kind === "pickup";
  switch (alertKind) {
    case "new_damage":
      return {
        title: "疑似新的車損",
        text: `${angles(rows)}與取車時的照片相比，疑似有新的損傷（${damageItems(rows) || "位置待確認"}）。營運人員會確認，如有需要，客服會與您聯絡。`,
      };
    case "pickup_difference":
      return {
        title: "已記錄取車前就有的差異",
        text: `${angles(rows)}與這台車上一次的紀錄不同（${damageItems(rows) || "位置待確認"}）。這會記錄為取車前就存在，不會算在您這次租用。`,
      };
    case "reported_damage": {
      const where = [...new Set(rows.map((r) => r.details?.location).filter(Boolean))].join("、");
      return pickup
        ? { title: "已收到您回報的既有損傷", text: `${where}的損傷已記錄為取車前就存在，不會算在您這次租用。` }
        : { title: "已收到您回報的損傷", text: `感謝您主動說明${where}的損傷，營運人員會一併確認。` };
    }
    case "dirty":
      return pickup
        ? { title: "已記錄車內清潔狀況", text: "車內清潔狀況不佳，已記錄為上一位用戶留下，不會算在您這次租用。如影響使用，請聯絡客服。" }
        : { title: "車內清潔狀況需要處理", text: "還車照片中車內有需要清潔的地方，營運人員確認後會安排清潔。" };
    case "left_item": {
      const things = [...new Set(rows.flatMap((r) => (r.details?.items ?? []) as string[]))].join("、");
      return pickup
        ? { title: "車內有上一位用戶的物品", text: `車內疑似有遺留物品（${things}），請勿帶走，客服會處理。` }
        : { title: "車內疑似有遺留物品", text: `還車照片中看到疑似遺留的物品（${things}）。如果是您的東西，請聯絡客服。` };
    }
    case "card_missing": {
      const missing = [...new Set(rows.flatMap((r) => r.details?.missing ?? []))].join("、") || "卡片";
      return pickup
        ? { title: "已記錄卡片缺少", text: `卡夾中沒有看到${missing}，已記錄為取車前就缺少，不會算在您這次租用。` }
        : { title: "請確認卡片是否放回", text: `卡夾中沒有看到${missing}，請確認是否已放回遮陽板的卡夾。` };
    }
    case "needs_review":
      return { title: "部分照片需要人工確認", text: "有些照片 AI 無法判斷，營運人員會人工檢查。" };
    default:
      return null;
  }
}

const KIND_ORDER = ["new_damage", "pickup_difference", "reported_damage", "dirty", "left_item", "card_missing", "needs_review"];

export async function getRecord(inspectionId: string): Promise<RecordView | null> {
  if (!UUID_RE.test(inspectionId)) return null;
  const supabase = getSupabase();
  const { data: inspection, error } = await supabase
    .from("inspections")
    .select("id, kind, status, submitted_at, analysis_status, vehicles(plate, car_model)")
    .eq("id", inspectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!inspection || inspection.status !== "submitted" || inspection.kind === "registration") return null;
  const kind = inspection.kind as "pickup" | "return";
  const vehicle = inspection.vehicles as unknown as { plate: string; car_model: string };

  const [{ data: alerts, error: alertError }, { data: photos, error: photoError }] = await Promise.all([
    supabase.from("alerts").select("kind, status, details, inspection_photos(image_type)").eq("inspection_id", inspectionId),
    supabase.from("inspection_photos").select("slot, category, location, storage_path").eq("inspection_id", inspectionId),
  ]);
  if (alertError) throw new Error(alertError.message);
  if (photoError) throw new Error(photoError.message);

  const byKind = new Map<string, AlertRow[]>();
  for (const a of (alerts ?? []) as unknown as AlertRow[]) byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a]);
  const findings = KIND_ORDER.flatMap((k) => {
    const rows = byKind.get(k);
    const d = rows && describe(kind, k, rows);
    return d ? [{ ...d, review: review(rows) }] : [];
  });

  const list = photos ?? [];
  const { data: signed } = list.length
    ? await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(list.map((p) => p.storage_path), 60 * 60)
    : { data: [] };
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const order = (slot: string) => {
    const i = REQUIRED_STEPS.findIndex((s) => s.slot === slot);
    return i === -1 ? 100 : i;
  };
  return {
    kind,
    plate: vehicle.plate,
    carModel: vehicle.car_model,
    submittedAt: inspection.submitted_at,
    analysisDone: inspection.analysis_status === "done",
    analysisFailed: inspection.analysis_status === "error",
    findings,
    photos: list
      .sort((a, b) => order(a.slot) - order(b.slot) || a.slot.localeCompare(b.slot))
      .map((p) => ({
        slot: p.slot,
        label:
          REQUIRED_STEPS.find((s) => s.slot === p.slot)?.title ??
          (p.category === "known_damage" ? "已知損傷" : `損傷：${p.location ?? ""}`),
        url: urls.get(p.storage_path) ?? null,
      })),
  };
}

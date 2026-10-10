import "server-only";
import { getSupabase } from "./supabase";

// Every rental with its pickup and return receipts. The demo has no user
// accounts, so this lists all rentals rather than one person's.

export type ReceiptSummary = {
  id: string;
  submittedAt: string;
  // checking: the AI has not finished; clear: nothing to note; attention: open findings.
  state: "checking" | "clear" | "attention" | "failed";
  openFindings: number;
};

export type HistoryRental = {
  id: number;
  orderNo: string;
  status: "picking_up" | "in_use" | "returned";
  startedAt: string;
  plate: string;
  carModel: string;
  pickup: ReceiptSummary | null;
  return: ReceiptSummary | null;
};

type Row = {
  id: number;
  order_no: string;
  status: HistoryRental["status"];
  started_at: string;
  vehicles: { plate: string; car_model: string } | null;
  inspections: { id: string; kind: "pickup" | "return"; status: string; analysis_status: string; submitted_at: string }[];
};

export async function listHistory(limit = 50): Promise<HistoryRental[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("rentals")
    .select("id, order_no, status, started_at, vehicles(plate, car_model), inspections(id, kind, status, analysis_status, submitted_at)")
    .neq("status", "cancelled")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  const submitted = rows.flatMap((r) => r.inspections.filter((i) => i.status === "submitted"));
  // Findings a renter still sees as open: anything staff have not dismissed.
  const open = new Map<string, number>();
  if (submitted.length) {
    const { data: alerts, error: alertError } = await supabase
      .from("alerts")
      .select("inspection_id, kind")
      .in("inspection_id", submitted.map((i) => i.id))
      .neq("status", "dismissed");
    if (alertError) throw new Error(alertError.message);
    // The receipt groups alerts of one kind into one finding; count the same way.
    const kinds = new Map<string, Set<string>>();
    for (const a of alerts ?? []) kinds.set(a.inspection_id, (kinds.get(a.inspection_id) ?? new Set()).add(a.kind));
    for (const [id, set] of kinds) open.set(id, set.size);
  }

  const summary = (i: Row["inspections"][number] | undefined): ReceiptSummary | null => {
    if (!i || i.status !== "submitted") return null;
    const findings = open.get(i.id) ?? 0;
    const state =
      i.analysis_status === "error"
        ? "failed"
        : i.analysis_status !== "done"
          ? "checking"
          : findings > 0
            ? "attention"
            : "clear";
    return { id: i.id, submittedAt: i.submitted_at, state, openFindings: findings };
  };

  return rows.map((r) => ({
    id: r.id,
    orderNo: r.order_no,
    status: r.status,
    startedAt: r.started_at,
    plate: r.vehicles?.plate ?? "?",
    carModel: r.vehicles?.car_model ?? "",
    pickup: summary(r.inspections.find((i) => i.kind === "pickup")),
    return: summary(r.inspections.find((i) => i.kind === "return" && i.status === "submitted")),
  }));
}

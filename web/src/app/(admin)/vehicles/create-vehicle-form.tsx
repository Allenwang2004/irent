"use client";

import { useActionState } from "react";
import { createVehicle, type CreateVehicleState } from "./actions";

export function CreateVehicleForm() {
  const [state, action, pending] = useActionState<CreateVehicleState, FormData>(createVehicle, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface-1 p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-2">車牌</span>
        <input name="plate" required placeholder="ABC-1234" className="w-36 rounded border border-line bg-surface-1 px-2 py-1.5 uppercase" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-2">車型</span>
        <input name="car_model" required placeholder="Toyota Yaris" className="w-56 rounded border border-line bg-surface-1 px-2 py-1.5" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "新增中..." : "新增車輛"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-ink">
          {state.error}
        </p>
      )}
    </form>
  );
}

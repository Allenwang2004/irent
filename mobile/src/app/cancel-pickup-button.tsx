"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelPickupRental } from "./actions";

// A pickup left half done (page closed) keeps the car reserved; this frees it.
export function CancelPickupButton({ rentalId }: { rentalId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await cancelPickupRental(rentalId);
        } finally {
          router.refresh();
          setBusy(false);
        }
      }}
      className="mt-4 w-full rounded-full border border-line py-3 text-sm disabled:opacity-60"
    >
      {busy ? "取消中..." : "取車沒有完成，取消這次取車"}
    </button>
  );
}

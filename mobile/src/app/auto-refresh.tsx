"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-render the server page every few seconds, e.g. while the AI is still
// analysing photos.
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}

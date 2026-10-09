"""Supabase access over plain HTTP (PostgREST and Storage).

Uses the secret key, which bypasses RLS; keep it only on the lab server.
Tables are defined in supabase/04_inspections.sql.
"""

from datetime import datetime, timezone
from typing import Any

import httpx

from .config import Config

PHOTO_BUCKET = "inspection-photos"
PHOTO_FIELDS = "id,slot,category,image_type,location,note,storage_path"


class Store:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.http = httpx.AsyncClient(
            base_url=cfg.supabase_url,
            headers={"apikey": cfg.supabase_key, "Authorization": f"Bearer {cfg.supabase_key}"},
            timeout=60,
        )

    async def close(self) -> None:
        await self.http.aclose()

    async def _json(self, method: str, path: str, **kwargs) -> Any:
        resp = await self.http.request(method, path, **kwargs)
        if resp.is_error:
            raise RuntimeError(f"{method} {path.split('?')[0]} -> {resp.status_code}: {resp.text[:300]}")
        return resp.json() if resp.content else None

    # ------------------------------------------------------------ queue

    async def claim(self) -> dict | None:
        rows = await self._json(
            "POST",
            "/rest/v1/rpc/claim_inspection",
            json={
                "p_worker": self.cfg.worker_id,
                "p_stale_minutes": self.cfg.stale_minutes,
                "p_max_attempts": self.cfg.max_attempts,
            },
        )
        return rows[0] if rows else None

    async def claim_specific(self, inspection_id: str) -> dict | None:
        """Re-run one pickup or return on request, whatever its analysis status."""
        rows = await self._json(
            "PATCH",
            "/rest/v1/inspections",
            params={"id": f"eq.{inspection_id}", "status": "eq.submitted", "kind": "in.(pickup,return)"},
            json={
                "analysis_status": "running",
                "analysis_worker": self.cfg.worker_id,
                "analysis_claimed_at": _now(),
                "analysis_error": None,
            },
            headers={"Prefer": "return=representation"},
        )
        return rows[0] if rows else None

    async def finish(self, inspection_id: str) -> None:
        await self._json(
            "PATCH",
            f"/rest/v1/inspections?id=eq.{inspection_id}",
            json={"analysis_status": "done", "analysis_finished_at": _now(), "analysis_error": None},
        )

    async def fail(self, inspection: dict, error: str) -> None:
        # Retry later unless this was the last allowed attempt.
        retry = inspection.get("analysis_attempts", 0) < self.cfg.max_attempts
        await self._json(
            "PATCH",
            f"/rest/v1/inspections?id=eq.{inspection['id']}",
            json={
                "analysis_status": "pending" if retry else "error",
                "analysis_error": error[:1000],
                "analysis_finished_at": None if retry else _now(),
            },
        )

    # ------------------------------------------------------------ reads

    async def plate(self, vehicle_id: int) -> str:
        rows = await self._json("GET", f"/rest/v1/vehicles?id=eq.{vehicle_id}&select=plate")
        return rows[0]["plate"] if rows else "?"

    async def photos(self, inspection_id: str) -> list[dict]:
        return await self._json(
            "GET",
            "/rest/v1/inspection_photos",
            params={"inspection_id": f"eq.{inspection_id}", "select": PHOTO_FIELDS, "order": "slot"},
        )

    async def baseline(self, inspection: dict) -> tuple[dict | None, dict[int, dict]]:
        """The inspection to compare against, and its angle photos keyed by image_type.

        pickup: the car's most recent earlier inspection (last return, or the
                registration for a car's first rental).
        return: this rental's pickup; falls back to the most recent earlier
                inspection if the pickup is missing.
        """
        base = None
        if inspection["kind"] == "return" and inspection.get("rental_id"):
            rows = await self._json(
                "GET",
                "/rest/v1/inspections",
                params={
                    "rental_id": f"eq.{inspection['rental_id']}",
                    "kind": "eq.pickup",
                    "status": "eq.submitted",
                    "select": "id,kind,submitted_at",
                    "limit": "1",
                },
            )
            base = rows[0] if rows else None
        if base is None:
            rows = await self._json(
                "GET",
                "/rest/v1/inspections",
                params={
                    "vehicle_id": f"eq.{inspection['vehicle_id']}",
                    "status": "eq.submitted",
                    "submitted_at": f"lt.{inspection['submitted_at']}",
                    "id": f"neq.{inspection['id']}",
                    "select": "id,kind,submitted_at",
                    "order": "submitted_at.desc",
                    "limit": "1",
                },
            )
            base = rows[0] if rows else None
        if base is None:
            return None, {}
        photos = await self.photos(base["id"])
        return base, {p["image_type"]: p for p in photos if p["category"] == "angle"}

    async def download(self, storage_path: str) -> bytes:
        resp = await self.http.get(f"/storage/v1/object/{PHOTO_BUCKET}/{storage_path}")
        if resp.is_error:
            raise RuntimeError(f"download {storage_path} -> {resp.status_code}: {resp.text[:200]}")
        return resp.content

    # ------------------------------------------------------------ writes

    async def save_analyses(self, rows: list[dict]) -> None:
        if rows:
            await self._json(
                "POST",
                "/rest/v1/photo_analyses?on_conflict=photo_id,kind",
                json=rows,
                headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            )

    async def replace_alerts(self, inspection_id: str, alerts: list[dict]) -> None:
        # Re-analysis replaces open alerts; ones an operator already handled stay.
        await self._json("DELETE", f"/rest/v1/alerts?inspection_id=eq.{inspection_id}&status=eq.open")
        if alerts:
            await self._json("POST", "/rest/v1/alerts", json=alerts, headers={"Prefer": "return=minimal"})

    async def check(self) -> str:
        await self._json("GET", "/rest/v1/inspections?select=id&limit=1")
        await self._json("GET", "/rest/v1/photo_analyses?select=id&limit=1")
        return "ok"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

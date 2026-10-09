"""Supabase access over plain HTTP (PostgREST and Storage).

Uses the secret key, which bypasses RLS; keep it only on the lab server.
"""

from datetime import datetime, timezone

from typing import Any

import httpx

from .config import Config

PHOTO_BUCKET = "return-photos"


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
            "/rest/v1/rpc/claim_return_session",
            json={
                "p_worker": self.cfg.worker_id,
                "p_stale_minutes": self.cfg.stale_minutes,
                "p_max_attempts": self.cfg.max_attempts,
            },
        )
        return rows[0] if rows else None

    async def claim_specific(self, session_id: str) -> dict | None:
        """Re-run one return on request, whatever its analysis status."""
        rows = await self._json(
            "PATCH",
            f"/rest/v1/return_sessions?id=eq.{session_id}&status=eq.submitted",
            json={
                "analysis_status": "running",
                "analysis_worker": self.cfg.worker_id,
                "analysis_claimed_at": _now(),
                "analysis_error": None,
            },
            headers={"Prefer": "return=representation"},
        )
        return rows[0] if rows else None

    async def finish(self, session_id: str) -> None:
        await self._json(
            "PATCH",
            f"/rest/v1/return_sessions?id=eq.{session_id}",
            json={"analysis_status": "done", "analysis_finished_at": _now(), "analysis_error": None},
        )

    async def fail(self, session: dict, error: str) -> None:
        # Retry later unless this was the last allowed attempt.
        retry = session.get("analysis_attempts", 0) < self.cfg.max_attempts
        await self._json(
            "PATCH",
            f"/rest/v1/return_sessions?id=eq.{session['id']}",
            json={
                "analysis_status": "pending" if retry else "error",
                "analysis_error": error[:1000],
                "analysis_finished_at": None if retry else _now(),
            },
        )

    # ------------------------------------------------------------ reads

    async def session_plate(self, session_id: str) -> tuple[str, str]:
        rows = await self._json(
            "GET",
            f"/rest/v1/return_sessions?id=eq.{session_id}&select=submitted_at,rentals(plate)",
        )
        row = rows[0]
        return row["rentals"]["plate"], row["submitted_at"]

    async def photos(self, session_id: str) -> list[dict]:
        return await self._json(
            "GET",
            f"/rest/v1/return_photos?session_id=eq.{session_id}&select=id,image_type,storage_path&order=image_type",
        )

    async def baseline_photos(self, plate: str, before: str) -> dict[int, dict]:
        """Photos from the same car's most recent earlier return, keyed by image_type."""
        rows = await self._json(
            "GET",
            "/rest/v1/return_sessions",
            params={
                "select": "id,submitted_at,rentals!inner(plate)",
                "rentals.plate": f"eq.{plate}",
                "status": "eq.submitted",
                "submitted_at": f"lt.{before}",
                "order": "submitted_at.desc",
                "limit": "1",
            },
        )
        if not rows:
            return {}
        return {p["image_type"]: p for p in await self.photos(rows[0]["id"])}

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

    async def replace_alerts(self, session_id: str, alerts: list[dict]) -> None:
        # Re-analysis replaces open alerts; ones an operator already handled stay.
        await self._json("DELETE", f"/rest/v1/alerts?session_id=eq.{session_id}&status=eq.open")
        if alerts:
            await self._json("POST", "/rest/v1/alerts", json=alerts, headers={"Prefer": "return=minimal"})

    async def check(self) -> str:
        await self._json("GET", "/rest/v1/return_sessions?select=id&limit=1")
        await self._json("GET", "/rest/v1/photo_analyses?select=id&limit=1")
        return "ok"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

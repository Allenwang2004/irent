"""Worker entry point.

    python -m irent_worker              # poll for submitted pickups and returns until stopped
    python -m irent_worker --once       # process at most one waiting inspection, then exit
    python -m irent_worker --session ID # (re)analyse one inspection, e.g. after changing a prompt
    python -m irent_worker --check      # check Supabase and VLM connectivity, then exit
"""

import argparse
import asyncio
import logging
import signal
import time

from .config import Config
from .decide import (
    EXTERIOR,
    INTERIOR,
    Decision,
    decide_card,
    decide_compare,
    decide_describe,
    decide_tidy,
    note_unreported,
    reconcile,
)
from .store import Store
from .vlm import Backend, VLMUnavailable, make_backend

log = logging.getLogger("irent_worker")


async def judge_runs(cfg: Config, call) -> list[dict]:
    """Run the same judgement cfg.vlm_runs times in parallel for majority voting."""
    return list(await asyncio.gather(*(call() for _ in range(cfg.vlm_runs))))


async def analyse_photo(cfg: Config, store: Store, vlm: Backend, inspection: dict, photo: dict, baseline: dict[int, dict]):
    """One photo's analysis row, its decision, and how long it took."""
    context = inspection["kind"]
    category, image_type = photo["category"], photo["image_type"]
    t0 = time.perf_counter()
    if category == "known_damage":
        # Close-ups of recorded damage are kept as evidence for staff, not judged.
        return None, None

    data = await store.download(photo["storage_path"])
    base_id = None
    if category == "card":
        kind = "card"
        runs = await judge_runs(cfg, lambda: vlm.card(data))
        decision = decide_card(runs, context)
    elif category == "extra":
        kind = "describe"
        runs = await judge_runs(cfg, lambda: vlm.describe(data))
        decision = decide_describe(runs)
    elif image_type in EXTERIOR:
        kind = "compare"
        base = baseline.get(image_type)
        if base is None:
            # No earlier photo of this angle (should not happen once the car is registered).
            runs, decision = [], Decision("no_baseline", None)
        else:
            before = await store.download(base["storage_path"])
            runs = await judge_runs(cfg, lambda: vlm.compare(before, data))
            decision, base_id = decide_compare(image_type, runs, context), base["id"]
    elif image_type in INTERIOR:
        kind = "tidy"
        runs = await judge_runs(cfg, lambda: vlm.tidy(data))
        decision = decide_tidy(image_type, runs, context)
    else:
        return None, None

    row = {
        "inspection_id": inspection["id"],
        "photo_id": photo["id"],
        "kind": kind,
        "baseline_photo_id": base_id,
        "model": cfg.vlm_model if cfg.vlm_backend != "fake" else "fake",
        "runs": len(runs),
        "verdict": decision.verdict,
        "confidence": decision.confidence,
        "results": runs,
        "latency_ms": round((time.perf_counter() - t0) * 1000),
    }
    return row, decision


async def process(cfg: Config, store: Store, vlm: Backend, inspection: dict) -> None:
    iid = inspection["id"]
    context = inspection["kind"]
    t0 = time.perf_counter()
    try:
        plate = await store.plate(inspection["vehicle_id"])
        photos = await store.photos(iid)
        base, baseline = await store.baseline(inspection)
        results = await asyncio.gather(*(analyse_photo(cfg, store, vlm, inspection, p, baseline) for p in photos))

        rows, alerts = [], []
        reported, found_new_damage = [], False
        for photo, (row, decision) in zip(photos, results):
            if row is None:
                continue
            rows.append(row)
            if photo["category"] == "extra":
                reported.append({"photo_id": photo["id"], "location": photo["location"], "note": photo["note"], "decision": decision})
                continue
            found_new_damage |= decision.verdict == "new_damage"
            alerts += [(photo["id"], a) for a in decision.alerts]

        # Renter-reported damage is judged together with what the comparison found.
        if context == "return":
            note_unreported([a for _, a in alerts], len(reported))
        report_alerts = reconcile(context, reported, found_new_damage)
        alerts += [(r["photo_id"], a) for r, a in zip(reported, report_alerts)]

        await store.save_analyses(rows)
        await store.replace_alerts(
            iid,
            [
                {
                    "inspection_id": iid,
                    "vehicle_id": inspection["vehicle_id"],
                    "photo_id": photo_id,
                    "kind": a.kind,
                    "severity": a.severity,
                    "message": a.message,
                    "details": a.details,
                }
                for photo_id, a in alerts
            ],
        )
        await store.finish(iid)
        verdicts = ", ".join(f"{r['kind']}:{r['verdict']}" for r in rows)
        log.info(
            "done %s %s plate=%s baseline=%s alerts=%d in %.1fs [%s]",
            context, iid[:8], plate, base["kind"] if base else "none", len(alerts), time.perf_counter() - t0, verdicts,
        )
    except Exception as e:
        vlm_down = isinstance(e, VLMUnavailable)
        if vlm_down:
            log.warning("vLLM unavailable, returning %s to the queue: %s", iid[:8], e)
        else:
            log.exception("failed %s", iid[:8])
        try:
            await store.fail(inspection, f"{type(e).__name__}: {e}")
        except Exception:
            # Supabase is unreachable too; the inspection stays "running" and is
            # handed out again after STALE_MINUTES.
            log.exception("could not record the failure of %s", iid[:8])
        if vlm_down:
            raise


async def check(cfg: Config, store: Store) -> None:
    print(f"worker id    {cfg.worker_id}")
    try:
        status = await store.check()
    except RuntimeError as e:
        status = "TABLES MISSING, run supabase/04_inspections.sql" if "PGRST205" in str(e) else f"ERROR {e}"
    print(f"supabase     {status} ({cfg.supabase_url})")
    if cfg.vlm_backend == "fake":
        print("vlm          fake backend (no model calls)")
        return
    from openai import AsyncOpenAI

    client = AsyncOpenAI(base_url=cfg.vlm_base_url, api_key="EMPTY", timeout=10)
    models = [m.id for m in (await client.models.list()).data]
    status = "ok" if cfg.vlm_model in models else f"MODEL NOT SERVED (served: {models})"
    print(f"vlm          {status} ({cfg.vlm_base_url}, {cfg.vlm_model})")


async def main(args) -> None:
    cfg = Config.from_env()
    store = Store(cfg)
    vlm = make_backend(cfg)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    try:
        if args.check:
            await check(cfg, store)
            return
        if args.session:
            session = await store.claim_specific(args.session)
            if not session:
                raise SystemExit(f"No submitted pickup or return with id {args.session}")
            try:
                await process(cfg, store, vlm, session)
            except VLMUnavailable as e:
                raise SystemExit(f"vLLM unavailable, {args.session} is back in the queue: {e}")
            return

        async def pause() -> None:
            try:
                await asyncio.wait_for(stop.wait(), timeout=cfg.poll_seconds)
            except asyncio.TimeoutError:
                pass

        log.info(
            "worker %s polling every %.0fs (model %s, backend %s, %d runs per photo)",
            cfg.worker_id, cfg.poll_seconds, cfg.vlm_model, cfg.vlm_backend, cfg.vlm_runs,
        )
        # Take no work while the model is unreachable: an inspection that fails
        # goes straight back to the queue and would use up its attempts in seconds.
        vlm_down = not await vlm.ready()
        if vlm_down:
            log.warning("vLLM not ready (%s, %s), waiting for it before taking inspections", cfg.vlm_base_url, cfg.vlm_model)
        while not stop.is_set():
            if vlm_down:
                if not await vlm.ready():
                    if args.once:
                        raise SystemExit(f"vLLM not ready ({cfg.vlm_base_url}, {cfg.vlm_model})")
                    await pause()
                    continue
                log.info("vLLM ready, taking inspections again")
                vlm_down = False
            try:
                session = await store.claim()
            except Exception as e:
                if args.once:
                    raise
                # Supabase unreachable or erroring: stay up and try again.
                log.warning("claim failed, retrying in %.0fs: %s: %s", cfg.poll_seconds, type(e).__name__, e)
                await pause()
                continue
            if session:
                try:
                    await process(cfg, store, vlm, session)
                except VLMUnavailable:
                    vlm_down = True
                if args.once:
                    return
                continue
            if args.once:
                log.info("no waiting inspections")
                return
            await pause()
        log.info("stopped")
    finally:
        await store.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(prog="python -m irent_worker", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--once", action="store_true", help="process at most one waiting inspection, then exit")
    ap.add_argument("--session", help="(re)analyse this pickup or return id, whatever its analysis status")
    ap.add_argument("--check", action="store_true", help="check Supabase and VLM connectivity, then exit")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    asyncio.run(main(args))

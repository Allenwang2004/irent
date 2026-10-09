"""Worker entry point.

    python -m irent_worker              # poll for submitted returns until stopped
    python -m irent_worker --once       # process at most one waiting return, then exit
    python -m irent_worker --session ID # (re)analyse one return, e.g. after changing the prompt
    python -m irent_worker --check      # check Supabase and VLM connectivity, then exit
"""

import argparse
import asyncio
import logging
import signal
import time

from .config import Config
from .decide import EXTERIOR, INTERIOR, Decision, decide_compare, decide_tidy
from .store import Store
from .vlm import Backend, make_backend

log = logging.getLogger("irent_worker")


async def judge_runs(cfg: Config, call) -> list[dict]:
    """Run the same judgement cfg.vlm_runs times in parallel for majority voting."""
    return list(await asyncio.gather(*(call() for _ in range(cfg.vlm_runs))))


async def analyse_photo(cfg, store: Store, vlm: Backend, session_id: str, photo: dict, baseline: dict[int, dict]):
    image_type = photo["image_type"]
    t0 = time.perf_counter()
    after = await store.download(photo["storage_path"])

    if image_type in EXTERIOR:
        kind = "compare"
        base = baseline.get(image_type)
        if base is None:
            # First return of this car: nothing to compare against yet.
            runs, decision, base_id = [], Decision("no_baseline", None), None
        else:
            before = await store.download(base["storage_path"])
            runs = await judge_runs(cfg, lambda: vlm.compare(before, after))
            decision, base_id = decide_compare(image_type, runs), base["id"]
    elif image_type in INTERIOR:
        kind, base_id = "tidy", None
        runs = await judge_runs(cfg, lambda: vlm.tidy(after))
        decision = decide_tidy(image_type, runs)
    else:
        return None, []

    row = {
        "session_id": session_id,
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
    alerts = [
        {"session_id": session_id, "photo_id": photo["id"], "kind": a.kind, "severity": a.severity, "message": a.message}
        for a in decision.alerts
    ]
    return row, alerts


async def process(cfg: Config, store: Store, vlm: Backend, session: dict) -> None:
    sid = session["id"]
    t0 = time.perf_counter()
    try:
        plate, submitted_at = await store.session_plate(sid)
        photos = await store.photos(sid)
        baseline = await store.baseline_photos(plate, submitted_at)
        results = await asyncio.gather(*(analyse_photo(cfg, store, vlm, sid, p, baseline) for p in photos))
        rows = [r for r, _ in results if r]
        alerts = [a for _, al in results for a in al]
        await store.save_analyses(rows)
        await store.replace_alerts(sid, alerts)
        await store.finish(sid)
        verdicts = ", ".join(f"{r['kind']}:{r['verdict']}" for r in rows)
        log.info(
            "done %s plate=%s baseline=%s alerts=%d in %.1fs [%s]",
            sid[:8], plate, "yes" if baseline else "no", len(alerts), time.perf_counter() - t0, verdicts,
        )
    except Exception as e:
        log.exception("failed %s", sid[:8])
        await store.fail(session, f"{type(e).__name__}: {e}")


async def check(cfg: Config, store: Store) -> None:
    print(f"worker id    {cfg.worker_id}")
    try:
        status = await store.check()
    except RuntimeError as e:
        status = "TABLES MISSING, run supabase/03_analyses.sql" if "PGRST205" in str(e) else f"ERROR {e}"
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
                raise SystemExit(f"No submitted return with id {args.session}")
            await process(cfg, store, vlm, session)
            return

        log.info(
            "worker %s polling every %.0fs (model %s, backend %s, %d runs per photo)",
            cfg.worker_id, cfg.poll_seconds, cfg.vlm_model, cfg.vlm_backend, cfg.vlm_runs,
        )
        while not stop.is_set():
            session = await store.claim()
            if session:
                await process(cfg, store, vlm, session)
                if args.once:
                    return
                continue
            if args.once:
                log.info("no waiting returns")
                return
            try:
                await asyncio.wait_for(stop.wait(), timeout=cfg.poll_seconds)
            except asyncio.TimeoutError:
                pass
        log.info("stopped")
    finally:
        await store.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(prog="python -m irent_worker", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--once", action="store_true", help="process at most one waiting return, then exit")
    ap.add_argument("--session", help="(re)analyse this return id, whatever its analysis status")
    ap.add_argument("--check", action="store_true", help="check Supabase and VLM connectivity, then exit")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    asyncio.run(main(args))

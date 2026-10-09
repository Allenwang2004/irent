import os
import socket
from dataclasses import dataclass
from pathlib import Path


def load_dotenv(path: Path) -> None:
    """Minimal .env reader so the worker needs no extra dependency.

    Values already set in the environment win, so `VLM_BACKEND=fake python -m ...`
    overrides the file.
    """
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _bool(value: str) -> bool:
    return value.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Config:
    supabase_url: str
    supabase_key: str
    vlm_base_url: str
    vlm_model: str
    vlm_backend: str
    vlm_runs: int
    vlm_concurrency: int
    vlm_thinking: bool
    vlm_timeout: float
    max_side: int
    poll_seconds: float
    stale_minutes: int
    max_attempts: int
    worker_id: str

    @classmethod
    def from_env(cls) -> "Config":
        load_dotenv(Path(__file__).resolve().parent.parent / ".env")
        missing = [k for k in ("SUPABASE_URL", "SUPABASE_SECRET_KEY") if not os.environ.get(k)]
        if missing:
            raise SystemExit(f"Missing {', '.join(missing)} (see worker/.env.example)")
        env = os.environ.get
        return cls(
            supabase_url=env("SUPABASE_URL", "").rstrip("/"),
            supabase_key=env("SUPABASE_SECRET_KEY", ""),
            vlm_base_url=env("VLM_BASE_URL", "http://127.0.0.1:8137/v1"),
            vlm_model=env("VLM_MODEL", "Qwen/Qwen3.5-9B"),
            vlm_backend=env("VLM_BACKEND", "openai"),
            vlm_runs=int(env("VLM_RUNS", "3")),
            vlm_concurrency=int(env("VLM_CONCURRENCY", "8")),
            vlm_thinking=_bool(env("VLM_THINKING", "false")),
            vlm_timeout=float(env("VLM_TIMEOUT", "300")),
            max_side=int(env("MAX_SIDE", "1280")),
            poll_seconds=float(env("POLL_SECONDS", "5")),
            stale_minutes=int(env("STALE_MINUTES", "15")),
            max_attempts=int(env("MAX_ATTEMPTS", "3")),
            worker_id=env("WORKER_ID") or f"{socket.gethostname()}:{os.getpid()}",
        )

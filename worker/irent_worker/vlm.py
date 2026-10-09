"""Calls to the VLM: one judgement per call, returned as a run record.

A run record is {"result": {...}} on success or {"error": "..."} on failure,
plus latency_s, mirroring eval/compare_eval.py so the same voting applies.
"""

import asyncio
import base64
import io
import json
import time
from typing import Protocol

from PIL import Image, ImageOps

from .config import Config
from .prompts import (
    COMPARE_AFTER_LABEL,
    COMPARE_BEFORE_LABEL,
    COMPARE_INSTRUCTION,
    COMPARE_SCHEMA,
    COMPARE_SYSTEM,
    TIDY_INSTRUCTION,
    TIDY_SCHEMA,
    TIDY_SYSTEM,
)


def encode_image(data: bytes, max_side: int) -> str:
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    im.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


class VLMUnavailable(Exception):
    """The VLM server cannot be reached, so no judgement can be made.

    Raised instead of recording a failed run: the whole return goes back to
    the queue rather than being finished with every photo marked "error".
    """


class Backend(Protocol):
    async def ready(self) -> bool: ...
    async def compare(self, before: bytes, after: bytes) -> dict: ...
    async def tidy(self, photo: bytes) -> dict: ...


class OpenAIBackend:
    """vLLM (or any OpenAI-compatible server) with JSON-schema constrained output."""

    def __init__(self, cfg: Config):
        from openai import AsyncOpenAI

        self.cfg = cfg
        self.client = AsyncOpenAI(base_url=cfg.vlm_base_url, api_key="EMPTY", timeout=cfg.vlm_timeout, max_retries=1)
        self.sem = asyncio.Semaphore(cfg.vlm_concurrency)

    async def ready(self) -> bool:
        """True when the server answers and serves cfg.vlm_model."""
        try:
            models = await self.client.with_options(timeout=10, max_retries=0).models.list()
        except Exception:
            return False
        return any(m.id == self.cfg.vlm_model for m in models.data)

    async def _call(self, system: str, content: list, schema: dict, name: str) -> dict:
        from openai import APIConnectionError, APITimeoutError

        cfg = self.cfg
        record: dict = {}
        t0 = time.perf_counter()
        async with self.sem:
            try:
                resp = await self.client.chat.completions.create(
                    model=cfg.vlm_model,
                    messages=[{"role": "system", "content": system}, {"role": "user", "content": content}],
                    response_format={"type": "json_schema", "json_schema": {"name": name, "schema": schema}},
                    # Sampling settings match eval/compare_eval.py.
                    temperature=0.7,
                    top_p=0.95 if cfg.vlm_thinking else 0.8,
                    max_tokens=8192 if cfg.vlm_thinking else 1536,
                    extra_body={"top_k": 20, "chat_template_kwargs": {"enable_thinking": cfg.vlm_thinking}},
                )
                text = resp.choices[0].message.content or ""
                try:
                    record["result"] = json.loads(text)
                except json.JSONDecodeError:
                    record["error"] = "parse"
                    record["raw"] = text[:2000]
            except APITimeoutError as e:  # one slow run: record and let voting decide
                record["error"] = f"{type(e).__name__}: {e}"
            except APIConnectionError as e:  # server down or restarting: every run would fail
                raise VLMUnavailable(f"{cfg.vlm_base_url}: {e}") from e
            except Exception as e:  # bad response for this run: record and let voting decide
                record["error"] = f"{type(e).__name__}: {e}"
        record["latency_s"] = round(time.perf_counter() - t0, 2)
        return record

    async def compare(self, before: bytes, after: bytes) -> dict:
        side = self.cfg.max_side
        content = [
            {"type": "text", "text": COMPARE_BEFORE_LABEL},
            {"type": "image_url", "image_url": {"url": encode_image(before, side)}},
            {"type": "text", "text": COMPARE_AFTER_LABEL},
            {"type": "image_url", "image_url": {"url": encode_image(after, side)}},
            {"type": "text", "text": COMPARE_INSTRUCTION},
        ]
        return await self._call(COMPARE_SYSTEM, content, COMPARE_SCHEMA, "damage_compare")

    async def tidy(self, photo: bytes) -> dict:
        content = [
            {"type": "image_url", "image_url": {"url": encode_image(photo, self.cfg.max_side)}},
            {"type": "text", "text": TIDY_INSTRUCTION},
        ]
        return await self._call(TIDY_SYSTEM, content, TIDY_SCHEMA, "interior_tidy")


class FakeBackend:
    """Canned answers for testing the queue and database plumbing without a GPU.

    FAKE_VLM_FLAG=damage or FAKE_VLM_FLAG=dirty makes every answer report a
    problem, to see alerts reach the back office.
    """

    def __init__(self, flag: str = ""):
        self.flag = flag

    async def ready(self) -> bool:
        return True

    async def compare(self, before: bytes, after: bytes) -> dict:
        damage = self.flag == "damage"
        return {
            "latency_s": 0.0,
            "result": {
                "observation": "（測試用假結果）",
                "comparable": True,
                "new_damage": damage,
                "items": [{"location": "前保險桿", "type": "刮傷", "severity": "中等"}] if damage else [],
                "confidence": 0.9,
                "reason": "FAKE_VLM",
            },
        }

    async def tidy(self, photo: bytes) -> dict:
        dirty = self.flag == "dirty"
        return {
            "latency_s": 0.0,
            "result": {
                "observation": "（測試用假結果）",
                "level": "髒汙" if dirty else "乾淨",
                "issues": [{"location": "後座腳踏墊", "type": "垃圾"}] if dirty else [],
                "left_items": ["雨傘"] if dirty else [],
                "confidence": 0.9,
                "reason": "FAKE_VLM",
            },
        }


def make_backend(cfg: Config) -> Backend:
    import os

    if cfg.vlm_backend == "fake":
        return FakeBackend(os.environ.get("FAKE_VLM_FLAG", ""))
    if cfg.vlm_backend == "openai":
        return OpenAIBackend(cfg)
    raise SystemExit(f"Unknown VLM_BACKEND={cfg.vlm_backend!r} (use openai or fake)")

"""Collect customer posts and reviews about the iRent car-return experience.

Sources: PTT, Dcard, Google Play reviews, App Store reviews.
Output: CSV + JSON under scraper/output/.

Usage:
    .venv/bin/python irent_scraper.py                      # all sources
    .venv/bin/python irent_scraper.py --sources ptt dcard  # subset
"""

import argparse
import csv
import json
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests

# Keywords that mark a post as being about returning the car.
RETURN_KEYWORDS = [
    "還車", "還不了車", "無法還車", "不能還車", "還車失敗", "還車範圍",
    "扣款", "GPS", "定位", "拍照", "據點", "停車費", "停車格", "罰款", "罰單",
]
BRAND_PATTERN = re.compile(r"irent", re.I)

PTT_BOARDS = [
    "car", "Gossiping", "Lifeismoney", "MobileComm", "Taoyuan", "Taichung",
    "Tainan", "Kaohsiung", "ask", "Bus", "Railway", "WomenTalk", "Boy-Girl",
]
PTT_MAX_PAGES = 10

DCARD_QUERIES = [
    "iRent 還車", "iRent 還不了車", "iRent 無法還車", "iRent 扣款",
    "iRent GPS", "iRent 停車費", "iRent 罰單", "iRent 據點", "iRent",
]

GOOGLE_PLAY_APP_ID = "com.cht.easyrent.irent"
GOOGLE_PLAY_MAX_REVIEWS = 5000
APP_STORE_APP_ID = "860552248"

SNIPPET_RADIUS = 60
REQUEST_DELAY = (1.5, 3.0)

OUTPUT_DIR = Path(__file__).parent / "output"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0 Safari/537.36"
)


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def pause():
    time.sleep(random.uniform(*REQUEST_DELAY))


def match_keywords(text):
    lower = text.lower()
    return [kw for kw in RETURN_KEYWORDS if kw.lower() in lower]


def extract_snippets(text, keywords, radius=SNIPPET_RADIUS):
    """Return text windows around each keyword hit, with overlapping windows merged."""
    lower = text.lower()
    spans = []
    for kw in keywords:
        for m in re.finditer(re.escape(kw.lower()), lower):
            spans.append((max(0, m.start() - radius), min(len(text), m.end() + radius)))
    spans.sort()
    merged = []
    for start, end in spans:
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return [re.sub(r"\s+", " ", text[s:e]).strip() for s, e in merged]


def make_record(source, id_, url, title, author, date, content, comments="",
                rating=None, board=""):
    full = f"{title}\n{content}\n{comments}"
    keywords = match_keywords(full)
    return {
        "source": source,
        "id": str(id_),
        "url": url,
        "board": board,
        "title": title,
        "author": author,
        "date": date,
        "rating": rating,
        "matched_keywords": keywords,
        "snippets": extract_snippets(full, keywords),
        "content": content,
        "comments": comments,
    }


# ---------------------------------------------------------------- PTT

def scrape_ptt():
    session = requests.Session()
    session.headers["User-Agent"] = UA
    session.cookies.set("over18", "1", domain=".ptt.cc")
    records = []
    for board in PTT_BOARDS:
        links = []
        for page in range(1, PTT_MAX_PAGES + 1):
            url = f"https://www.ptt.cc/bbs/{board}/search?page={page}&q=irent"
            resp = session.get(url, timeout=20)
            pause()
            if resp.status_code != 200:
                break
            soup = BeautifulSoup(resp.text, "html.parser")
            found = [a["href"] for a in soup.select("div.r-ent div.title a[href]")]
            if not found:
                break
            links.extend(found)
        log(f"[ptt] {board}: {len(links)} search hits")
        for href in links:
            rec = fetch_ptt_article(session, board, "https://www.ptt.cc" + href)
            pause()
            if rec:
                records.append(rec)
    return records


def fetch_ptt_article(session, board, url):
    resp = session.get(url, timeout=20)
    if resp.status_code != 200:
        return None
    soup = BeautifulSoup(resp.text, "html.parser")
    main = soup.select_one("#main-content")
    if not main:
        return None
    meta = {
        m.select_one(".article-meta-tag").get_text(): m.select_one(".article-meta-value").get_text()
        for m in main.select(".article-metaline")
        if m.select_one(".article-meta-tag") and m.select_one(".article-meta-value")
    }
    pushes = []
    for p in main.select("div.push"):
        user = p.select_one(".push-userid")
        text = p.select_one(".push-content")
        if user and text:
            pushes.append(f"{user.get_text().strip()}{text.get_text().strip()}")
    for tag in main.select("div.push, div.article-metaline, div.article-metaline-right"):
        tag.decompose()
    content = main.get_text().split("\n--\n")[0].strip()
    comments = "\n".join(pushes)
    if not BRAND_PATTERN.search(f"{meta.get('標題', '')}{content}{comments}"):
        return None
    rec = make_record(
        "ptt", url.rsplit("/", 1)[-1].removesuffix(".html"), url,
        meta.get("標題", ""), meta.get("作者", ""), meta.get("時間", ""),
        content, comments, board=board,
    )
    return rec if rec["matched_keywords"] else None


# ---------------------------------------------------------------- Dcard
# The JSON API is behind Cloudflare, but the server-rendered search and post
# pages are reachable with a browser TLS fingerprint. The search page only
# embeds the first ~30 results, so several queries are used to widen coverage.

NEXT_DATA_RE = re.compile(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S)


def dcard_next_data(session, url, retries=3):
    """Fetch a Dcard page's embedded data, backing off when Cloudflare starts returning 403."""
    for attempt in range(retries + 1):
        resp = session.get(url, timeout=20)
        if resp.status_code == 200:
            m = NEXT_DATA_RE.search(resp.text)
            return json.loads(m.group(1)) if m else None
        if attempt < retries:
            wait = 15 * (attempt + 1)
            log(f"[dcard] HTTP {resp.status_code}, retrying in {wait}s: {url}")
            time.sleep(wait)
    return None


def dcard_queries(data):
    return data.get("props", {}).get("dehydratedState", {}).get("queries", [])


def scrape_dcard():
    session = cffi_requests.Session(impersonate="chrome")
    posts = {}
    for query in DCARD_QUERIES:
        data = dcard_next_data(session, f"https://www.dcard.tw/search?query={quote(query)}")
        pause()
        if not data:
            log(f"[dcard] search blocked or failed: {query}")
            continue
        count = 0
        for q in dcard_queries(data):
            if q.get("queryKey", [None])[0] != "search":
                continue
            for page in q["state"]["data"].get("pages", []):
                for widget in page.get("widgets", []):
                    post = widget.get("searchPost", {}).get("post")
                    if post:
                        posts[post["id"]] = post
                        count += 1
        log(f"[dcard] '{query}': {count} results")

    records = []
    for pid, post in posts.items():
        alias = post.get("forumAlias", "")
        url = f"https://www.dcard.tw/f/{alias}/p/{pid}"
        data = dcard_next_data(session, url)
        pause()
        content = ""
        if data:
            for q in dcard_queries(data):
                key = q.get("queryKey", [])
                if key[:2] == ["post", str(pid)]:
                    content = q["state"]["data"].get("content", "")
        if not content:
            # Fall back to the search excerpt when the post page is unavailable.
            content = re.sub(r"</?em>", "", post.get("excerpt", ""))
        title = re.sub(r"</?em>", "", post.get("title", ""))
        if not BRAND_PATTERN.search(title + content):
            continue
        rec = make_record(
            "dcard", pid, url, title, post.get("school") or "匿名",
            post.get("createdAt", ""), content, board=post.get("forumName", ""),
        )
        if rec["matched_keywords"]:
            records.append(rec)
    log(f"[dcard] {len(records)} relevant posts")
    return records


# ---------------------------------------------------------------- Google Play

def scrape_google_play():
    from google_play_scraper import Sort, reviews

    collected, token = [], None
    while len(collected) < GOOGLE_PLAY_MAX_REVIEWS:
        batch, token = reviews(
            GOOGLE_PLAY_APP_ID, lang="zh_TW", country="tw", sort=Sort.NEWEST,
            count=200, continuation_token=token,
        )
        if not batch:
            break
        collected.extend(batch)
        if not token or token.token is None:
            break
        pause()
    log(f"[google_play] fetched {len(collected)} reviews")

    records = []
    for r in collected:
        content = r.get("content") or ""
        reply = r.get("replyContent") or ""
        rec = make_record(
            "google_play", r["reviewId"],
            f"https://play.google.com/store/apps/details?id={GOOGLE_PLAY_APP_ID}&reviewId={r['reviewId']}",
            "", r.get("userName", ""), r["at"].isoformat() if r.get("at") else "",
            content, comments=f"[官方回覆] {reply}" if reply else "", rating=r.get("score"),
        )
        # Only match on the customer's own text, not the official reply.
        if match_keywords(content):
            records.append(rec)
    log(f"[google_play] {len(records)} relevant reviews")
    return records


# ---------------------------------------------------------------- App Store

def scrape_app_store():
    collected = []
    for page in range(1, 11):  # The RSS feed caps at 10 pages.
        url = (f"https://itunes.apple.com/tw/rss/customerreviews/page={page}"
               f"/id={APP_STORE_APP_ID}/sortby=mostrecent/json")
        resp = requests.get(url, headers={"User-Agent": UA}, timeout=20)
        pause()
        if resp.status_code != 200:
            break
        entries = resp.json().get("feed", {}).get("entry", [])
        if isinstance(entries, dict):
            entries = [entries]
        entries = [e for e in entries if "im:rating" in e]
        if not entries:
            break
        collected.extend(entries)
    log(f"[app_store] fetched {len(collected)} reviews")

    records = []
    for e in collected:
        title = e["title"]["label"]
        content = e["content"]["label"]
        if not match_keywords(title + content):
            continue
        records.append(make_record(
            "app_store", e["id"]["label"], e.get("link", {}).get("attributes", {}).get("href", ""),
            title, e["author"]["name"]["label"], e.get("updated", {}).get("label", ""),
            content, rating=int(e["im:rating"]["label"]),
        ))
    log(f"[app_store] {len(records)} relevant reviews")
    return records


# ---------------------------------------------------------------- main

SCRAPERS = {
    "ptt": scrape_ptt,
    "dcard": scrape_dcard,
    "google_play": scrape_google_play,
    "app_store": scrape_app_store,
}


def write_outputs(records):
    OUTPUT_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    json_path = OUTPUT_DIR / f"irent_return_{stamp}.json"
    csv_path = OUTPUT_DIR / f"irent_return_{stamp}.csv"
    json_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    fields = list(records[0].keys()) if records else list(make_record("", "", "", "", "", "", "").keys())
    # utf-8-sig so Excel opens the Chinese text correctly.
    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in records:
            row = dict(r)
            row["matched_keywords"] = "、".join(r["matched_keywords"])
            row["snippets"] = "\n---\n".join(r["snippets"])
            writer.writerow(row)
    return json_path, csv_path


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sources", nargs="+", choices=SCRAPERS, default=list(SCRAPERS))
    args = parser.parse_args()

    records = []
    for name in args.sources:
        log(f"=== {name} ===")
        try:
            records.extend(SCRAPERS[name]())
        except Exception as exc:  # Keep other sources going if one breaks.
            log(f"[{name}] failed: {exc!r}")

    json_path, csv_path = write_outputs(records)
    by_source = {}
    for r in records:
        by_source[r["source"]] = by_source.get(r["source"], 0) + 1
    log(f"done: {len(records)} records {by_source}")
    log(f"  {csv_path}\n  {json_path}")


if __name__ == "__main__":
    main()

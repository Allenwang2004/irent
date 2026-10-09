// Import scraper output into the Supabase reviews table.
//
// Usage (from web/):
//   npm run import:reviews
//
// For each source, only the newest output file that contains it is used, so a
// re-scrape of one source replaces older copies of that source. Rows are
// upserted on (source, source_id); team-edited columns (status, note) are left
// untouched.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import categories from "../src/lib/review-categories.json" with { type: "json" };

const OUTPUT_DIR = new URL("../../scraper/output/", import.meta.url).pathname;
const BATCH_SIZE = 500;

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY (see .env.example)");
  process.exit(1);
}

const categoryPatterns = categories.map((c) => ({ key: c.key, re: new RegExp(c.pattern, "i") }));

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

// PTT dates look like "Sat May 30 17:09:45 2026" in Taiwan time; other sources are ISO 8601.
function parseDate(raw) {
  if (!raw) return null;
  const ptt = raw.trim().match(/^\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+(\d{4})$/);
  if (ptt) {
    const [, mon, day, time, year] = ptt;
    const mm = String(MONTHS[mon]).padStart(2, "0");
    return `${year}-${mm}-${day.padStart(2, "0")}T${time}+08:00`;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function categorize(record) {
  // Official replies are not the customer's words, so only title + content count.
  const text = `${record.title ?? ""} ${record.content ?? ""}`;
  return categoryPatterns.filter((c) => c.re.test(text)).map((c) => c.key);
}

function loadLatestPerSource() {
  const files = readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".json")).sort().reverse();
  const bySource = new Map();
  for (const file of files) {
    const records = JSON.parse(readFileSync(join(OUTPUT_DIR, file), "utf8"));
    const sources = new Set(records.map((r) => r.source));
    for (const source of sources) {
      if (bySource.has(source)) continue;
      bySource.set(source, { file, records: records.filter((r) => r.source === source) });
    }
  }
  return bySource;
}

function toRow(r) {
  return {
    source: r.source,
    source_id: r.id,
    url: r.url || null,
    board: r.board || null,
    title: r.title || null,
    author: r.author || null,
    posted_at: parseDate(r.date),
    rating: r.rating ?? null,
    matched_keywords: r.matched_keywords ?? [],
    snippets: r.snippets ?? [],
    content: r.content || null,
    comments: r.comments || null,
    categories: categorize(r),
    imported_at: new Date().toISOString(),
  };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const bySource = loadLatestPerSource();
let total = 0;
for (const [source, { file, records }] of bySource) {
  // Dedupe within a file in case the scraper emitted the same post twice.
  const rows = [...new Map(records.map((r) => [r.id, toRow(r)])).values()];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const { error } = await supabase
      .from("reviews")
      .upsert(rows.slice(i, i + BATCH_SIZE), { onConflict: "source,source_id" });
    if (error) {
      console.error(`[${source}] upsert failed:`, error.message);
      process.exit(1);
    }
  }
  console.log(`[${source}] ${rows.length} rows from ${file}`);
  total += rows.length;
}
console.log(`done: ${total} rows`);

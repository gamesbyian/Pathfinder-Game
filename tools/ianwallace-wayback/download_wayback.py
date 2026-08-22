#!/usr/bin/env python3
"""Inventory/download distinct Wayback captures for ianwallace.com."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import mimetypes
import re
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

CDX_ENDPOINT = "https://web.archive.org/cdx/search/cdx"
WAYBACK_BASE = "https://web.archive.org/web"
ALLOWED_DOMAIN = "ianwallace.com"
USER_AGENT = "ianwallace-wayback-archive/1.2 (personal archival use)"

MIME_EXTENSIONS = {
    "text/html": ".html",
    "text/css": ".css",
    "application/javascript": ".js",
    "text/javascript": ".js",
    "application/json": ".json",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/xml": ".xml",
    "text/xml": ".xml",
}

FIELDS = ["timestamp", "original", "mimetype", "statuscode", "digest", "length"]


def request_bytes(url: str, timeout: float) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def fetch_cdx(domain: str) -> list[dict[str, str]]:
    params = [
        ("url", domain),
        ("matchType", "domain"),
        ("output", "json"),
        ("fl", ",".join(FIELDS)),
        ("filter", "statuscode:200"),
        ("limit", "1000000"),
    ]
    url = CDX_ENDPOINT + "?" + urllib.parse.urlencode(params)
    print(f"Querying Wayback CDX index for {domain} ...", flush=True)
    payload = request_bytes(url, timeout=60)
    rows = json.loads(payload.decode("utf-8"))
    if not rows:
        return []
    header = rows[0]
    return [dict(zip(header, row)) for row in rows[1:]]


def unique_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[tuple[str, str]] = set()
    out = []
    for row in rows:
        digest = row.get("digest") or f"timestamp:{row.get('timestamp', '')}"
        key = (row.get("original", ""), digest)
        if key not in seen:
            seen.add(key)
            out.append(row)
    return out


def safe_component(value: str, max_len: int = 100) -> str:
    value = urllib.parse.unquote(value)
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._") or "root"
    if len(value) > max_len:
        suffix = hashlib.sha1(value.encode("utf-8")).hexdigest()[:10]
        value = value[: max_len - 11] + "_" + suffix
    return value


def choose_extension(original: str, mimetype: str) -> str:
    suffix = Path(urllib.parse.urlsplit(original).path).suffix
    if suffix and 1 < len(suffix) <= 12 and re.fullmatch(r"\.[A-Za-z0-9]+", suffix):
        return suffix.lower()
    if mimetype in MIME_EXTENSIONS:
        return MIME_EXTENSIONS[mimetype]
    return mimetypes.guess_extension(mimetype or "") or ".bin"


def local_path(row: dict[str, str], output: Path) -> Path:
    parsed = urllib.parse.urlsplit(row["original"])
    host = safe_component(parsed.netloc.lower() or ALLOWED_DOMAIN)
    pieces = [safe_component(p) for p in (parsed.path or "/").split("/") if p]
    parent = output / "captures" / host
    if pieces[:-1]:
        parent = parent.joinpath(*pieces[:-1])
    stem_source = pieces[-1] if pieces else "index"
    stem = safe_component(Path(stem_source).stem or stem_source)
    query_tag = ""
    if parsed.query:
        query_tag = "_q" + hashlib.sha1(parsed.query.encode("utf-8")).hexdigest()[:10]
    ext = choose_extension(row["original"], row.get("mimetype", ""))
    return parent / f"{stem}{query_tag}__{row['timestamp']}{ext}"


def write_csv(path: Path, rows: list[dict[str, str]], columns: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def make_summary(rows: list[dict[str, str]], unique: list[dict[str, str]]) -> dict:
    timestamps = [r["timestamp"] for r in rows if r.get("timestamp")]
    lengths = []
    for row in unique:
        try:
            lengths.append(int(row.get("length") or 0))
        except ValueError:
            pass
    return {
        "domain": ALLOWED_DOMAIN,
        "captures_200": len(rows),
        "unique_original_urls": len({r.get("original", "") for r in rows}),
        "distinct_url_content_versions": len(unique),
        "earliest_timestamp": min(timestamps) if timestamps else None,
        "latest_timestamp": max(timestamps) if timestamps else None,
        "reported_unique_bytes": sum(lengths),
        "reported_unique_megabytes": round(sum(lengths) / 1024 / 1024, 2),
        "mime_types": dict(Counter(r.get("mimetype") or "unknown" for r in unique).most_common()),
    }


def archive_url(row: dict[str, str]) -> str:
    return f"{WAYBACK_BASE}/{row['timestamp']}id_/{row['original']}"


def checkpoint(output: Path, summary: dict, status_rows: list[dict[str, str]]) -> None:
    succeeded = sum(1 for r in status_rows if r["result"] == "downloaded")
    failed = sum(1 for r in status_rows if r["result"] == "failed")
    summary.update({
        "attempted": len(status_rows),
        "downloads_succeeded": succeeded,
        "downloads_failed": failed,
        "remaining_unattempted": summary["distinct_url_content_versions"] - len(status_rows),
        "complete": len(status_rows) == summary["distinct_url_content_versions"] and failed == 0,
    })
    (output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    write_csv(
        output / "download-status.csv",
        status_rows,
        ["timestamp", "original", "result", "local_file", "error"],
    )


def download(unique: list[dict[str, str]], output: Path, delay: float, timeout: float) -> tuple[int, int]:
    status_rows: list[dict[str, str]] = []
    total = len(unique)

    for index, row in enumerate(unique, 1):
        target = local_path(row, output)
        target.parent.mkdir(parents=True, exist_ok=True)
        local_file = str(target.relative_to(output))
        print(f"[{index}/{total}] {row['timestamp']} {row['original']}", flush=True)

        result = "downloaded"
        error = ""
        try:
            # One bounded attempt only. Repeated retries were the source of hour-long runs.
            target.write_bytes(request_bytes(archive_url(row), timeout=timeout))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, socket.timeout, OSError) as exc:
            result = "failed"
            error = str(exc)
            print(f"  FAILED QUICKLY: {error}", file=sys.stderr, flush=True)
            if target.exists() and target.stat().st_size == 0:
                target.unlink()
        except Exception as exc:
            result = "failed"
            error = f"{type(exc).__name__}: {exc}"
            print(f"  FAILED QUICKLY: {error}", file=sys.stderr, flush=True)

        status_rows.append({
            "timestamp": row.get("timestamp", ""),
            "original": row.get("original", ""),
            "result": result,
            "local_file": local_file,
            "error": error,
        })

        # Persist progress continuously so cancellation still yields an honest artifact.
        if index == 1 or index % 10 == 0 or index == total:
            checkpoint(output, SUMMARY, status_rows)
        time.sleep(delay)

    failures = [r for r in status_rows if r["result"] == "failed"]
    if failures:
        write_csv(
            output / "failures.csv",
            failures,
            ["timestamp", "original", "result", "local_file", "error"],
        )
    return total - len(failures), len(failures)


SUMMARY: dict = {}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", default=ALLOWED_DOMAIN)
    parser.add_argument("--output", default="tools/ianwallace-wayback/output")
    parser.add_argument("--census-only", action="store_true")
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--capture-timeout", type=float, default=8.0)
    args = parser.parse_args()

    domain = args.domain.lower().strip().rstrip("/")
    if domain != ALLOWED_DOMAIN:
        parser.error(f"This tool is intentionally scoped to {ALLOWED_DOMAIN}")

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    rows = fetch_cdx(domain)
    rows.sort(key=lambda r: (r.get("original", ""), r.get("timestamp", "")))
    unique = unique_rows(rows)

    global SUMMARY
    SUMMARY = make_summary(rows, unique)
    write_csv(output / "manifest-all.csv", rows, FIELDS)
    write_csv(output / "manifest-unique.csv", unique, FIELDS)
    checkpoint(output, SUMMARY, [])
    print(json.dumps(SUMMARY, indent=2), flush=True)

    if args.census_only:
        print("Census-only mode: payload download skipped.", flush=True)
        return 0

    success, failed = download(
        unique,
        output,
        max(args.delay, 0.5),
        max(2.0, args.capture_timeout),
    )
    print(f"Finished: {success} downloaded, {failed} failed fast.", flush=True)
    print("Failures are preserved in failures.csv for a separate retry strategy.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

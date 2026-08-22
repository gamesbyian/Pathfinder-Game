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
USER_AGENT = "ianwallace-wayback-archive/1.1 (personal archival use)"

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
RETRYABLE_HTTP_CODES = {408, 425, 429, 500, 502, 503, 504}


def request_bytes(url: str, retries: int = 3, timeout: float = 20.0) -> bytes:
    """Fetch bytes without letting one sluggish capture monopolize the harvest."""
    delay = 2.0
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code not in RETRYABLE_HTTP_CODES:
                raise
        except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
            last_error = exc

        if attempt < retries:
            time.sleep(delay)
            delay = min(delay * 2, 15)

    raise RuntimeError(
        f"Request failed after {retries} attempts (timeout {timeout:g}s): {url}: {last_error}"
    )


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
    print(f"Querying Wayback CDX index for {domain} ...")
    payload = request_bytes(url, retries=5, timeout=45)
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
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def safe_component(value: str, max_len: int = 100) -> str:
    value = urllib.parse.unquote(value)
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._")
    if not value:
        value = "root"
    if len(value) > max_len:
        suffix = hashlib.sha1(value.encode("utf-8")).hexdigest()[:10]
        value = value[: max_len - 11] + "_" + suffix
    return value


def choose_extension(original: str, mimetype: str) -> str:
    path = urllib.parse.urlsplit(original).path
    suffix = Path(path).suffix
    if suffix and 1 < len(suffix) <= 12 and re.fullmatch(r"\.[A-Za-z0-9]+", suffix):
        return suffix.lower()
    if mimetype in MIME_EXTENSIONS:
        return MIME_EXTENSIONS[mimetype]
    guessed = mimetypes.guess_extension(mimetype or "")
    return guessed or ".bin"


def local_path(row: dict[str, str], output: Path) -> Path:
    parsed = urllib.parse.urlsplit(row["original"])
    host = safe_component(parsed.netloc.lower() or ALLOWED_DOMAIN)
    url_path = parsed.path or "/"
    pieces = [safe_component(p) for p in url_path.split("/") if p]
    parent = output / "captures" / host
    if pieces[:-1]:
        parent = parent.joinpath(*pieces[:-1])
    stem_source = pieces[-1] if pieces else "index"
    stem = safe_component(Path(stem_source).stem or stem_source)
    query_tag = ""
    if parsed.query:
        query_tag = "_q" + hashlib.sha1(parsed.query.encode("utf-8")).hexdigest()[:10]
    ext = choose_extension(row["original"], row.get("mimetype", ""))
    filename = f"{stem}{query_tag}__{row['timestamp']}{ext}"
    return parent / filename


def write_csv(path: Path, rows: list[dict[str, str]], include_local: bool = False) -> None:
    columns = FIELDS + (["local_file"] if include_local else [])
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def make_summary(rows: list[dict[str, str]], unique: list[dict[str, str]]) -> dict:
    timestamps = [r["timestamp"] for r in rows if r.get("timestamp")]
    urls = {r.get("original", "") for r in rows}
    mime_counts = Counter(r.get("mimetype") or "unknown" for r in unique)
    lengths = []
    for row in unique:
        try:
            lengths.append(int(row.get("length") or 0))
        except ValueError:
            pass
    return {
        "domain": ALLOWED_DOMAIN,
        "captures_200": len(rows),
        "unique_original_urls": len(urls),
        "distinct_url_content_versions": len(unique),
        "earliest_timestamp": min(timestamps) if timestamps else None,
        "latest_timestamp": max(timestamps) if timestamps else None,
        "reported_unique_bytes": sum(lengths),
        "reported_unique_megabytes": round(sum(lengths) / 1024 / 1024, 2),
        "mime_types": dict(mime_counts.most_common()),
    }


def archive_url(row: dict[str, str]) -> str:
    return f"{WAYBACK_BASE}/{row['timestamp']}id_/{row['original']}"


def download_one(row: dict[str, str], output: Path, retries: int, timeout: float) -> None:
    target = local_path(row, output)
    row["local_file"] = str(target.relative_to(output))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(request_bytes(archive_url(row), retries=retries, timeout=timeout))


def download(unique: list[dict[str, str]], output: Path, delay: float) -> tuple[int, int]:
    total = len(unique)
    succeeded: set[int] = set()
    first_pass_failures: list[tuple[int, dict[str, str], str]] = []

    # First pass: move briskly through the archive. A bad replay should cost about
    # a minute at worst, rather than the old several-minute stall.
    for index, row in enumerate(unique, 1):
        print(f"[{index}/{total}] {row['timestamp']} {row['original']}")
        try:
            download_one(row, output, retries=3, timeout=20)
            succeeded.add(index)
        except Exception as exc:
            first_pass_failures.append((index, row, str(exc)))
            print(f"  DEFERRED: {exc}", file=sys.stderr)
        time.sleep(delay)

    # Second pass: give only the stragglers a somewhat more patient retry.
    final_failures: list[dict[str, str]] = []
    if first_pass_failures:
        print(f"Retrying {len(first_pass_failures)} deferred captures ...")

    for retry_index, (index, row, first_error) in enumerate(first_pass_failures, 1):
        print(
            f"[retry {retry_index}/{len(first_pass_failures)}] "
            f"{row['timestamp']} {row['original']}"
        )
        try:
            download_one(row, output, retries=2, timeout=45)
            succeeded.add(index)
        except Exception as exc:
            final_failures.append({
                "timestamp": row.get("timestamp", ""),
                "original": row.get("original", ""),
                "first_pass_error": first_error,
                "retry_error": str(exc),
            })
            print(f"  FAILED FINALLY: {exc}", file=sys.stderr)
        time.sleep(max(delay, 1.0))

    failures_path = output / "failures.csv"
    if final_failures:
        with failures_path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=["timestamp", "original", "first_pass_error", "retry_error"],
            )
            writer.writeheader()
            writer.writerows(final_failures)
    elif failures_path.exists():
        failures_path.unlink()

    return len(succeeded), len(final_failures)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", default=ALLOWED_DOMAIN)
    parser.add_argument("--output", default="tools/ianwallace-wayback/output")
    parser.add_argument("--census-only", action="store_true")
    parser.add_argument("--delay", type=float, default=1.0)
    args = parser.parse_args()

    domain = args.domain.lower().strip().rstrip("/")
    if domain != ALLOWED_DOMAIN:
        parser.error(f"This tool is intentionally scoped to {ALLOWED_DOMAIN}")

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    rows = fetch_cdx(domain)
    rows.sort(key=lambda r: (r.get("original", ""), r.get("timestamp", "")))
    unique = unique_rows(rows)
    summary = make_summary(rows, unique)

    write_csv(output / "manifest-all.csv", rows)
    write_csv(output / "manifest-unique.csv", unique)
    (output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(json.dumps(summary, indent=2))

    if args.census_only:
        print("Census-only mode: payload download skipped.")
        return 0

    success, failed = download(unique, output, max(args.delay, 0.25))
    write_csv(output / "manifest-unique.csv", unique, include_local=True)
    summary["downloads_succeeded"] = success
    summary["downloads_failed"] = failed
    summary["complete"] = failed == 0
    (output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Finished: {success} downloaded, {failed} unavailable after retry.")

    # Individual missing Wayback replays are expected archival imperfections, not
    # a reason to discard the useful artifact. Fatal setup/CDX errors still fail.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

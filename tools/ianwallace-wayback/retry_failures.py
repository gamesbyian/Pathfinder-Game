#!/usr/bin/env python3
"""Retry only failed Wayback captures from a previous archive artifact."""

from __future__ import annotations

import argparse
import csv
import json
import socket
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

WAYBACK_BASE = "https://web.archive.org/web"
USER_AGENT = "ianwallace-wayback-archive/1.3 (personal archival use)"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def write_csv(path: Path, rows: list[dict[str, str]], columns: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def fetch(url: str, timeout: float) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Encoding": "identity",
            "Connection": "close",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def candidates(timestamp: str, original: str) -> list[tuple[str, str]]:
    # id_ is the preferred raw replay. Plain replay and if_ sometimes hit a
    # different Wayback replay path and can succeed when id_ stalls.
    return [
        ("id_", f"{WAYBACK_BASE}/{timestamp}id_/{original}"),
        ("plain", f"{WAYBACK_BASE}/{timestamp}/{original}"),
        ("if_", f"{WAYBACK_BASE}/{timestamp}if_/{original}"),
    ]


def retry_one(row: dict[str, str], output: Path, timeout: float) -> dict[str, str]:
    target = output / row["local_file"]
    target.parent.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []

    for strategy, url in candidates(row["timestamp"], row["original"]):
        try:
            data = fetch(url, timeout)
            if not data:
                raise OSError("empty response")
            target.write_bytes(data)
            return {
                **row,
                "result": "downloaded",
                "error": "",
                "recovery_strategy": strategy,
                "recovery_bytes": str(len(data)),
            }
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, socket.timeout, OSError) as exc:
            errors.append(f"{strategy}: {exc}")
        except Exception as exc:
            errors.append(f"{strategy}: {type(exc).__name__}: {exc}")

    return {
        **row,
        "result": "failed",
        "error": " | ".join(errors),
        "recovery_strategy": "",
        "recovery_bytes": "",
    }


def checkpoint(output: Path, status: list[dict[str, str]], summary: dict) -> None:
    downloaded = sum(1 for row in status if row.get("result") == "downloaded")
    failed = sum(1 for row in status if row.get("result") == "failed")
    summary.update({
        "downloads_succeeded": downloaded,
        "downloads_failed": failed,
        "complete": failed == 0,
    })
    (output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    write_csv(
        output / "download-status.csv",
        status,
        ["timestamp", "original", "result", "local_file", "error", "recovery_strategy", "recovery_bytes"],
    )
    failures = [row for row in status if row.get("result") == "failed"]
    write_csv(
        output / "failures.csv",
        failures,
        ["timestamp", "original", "result", "local_file", "error", "recovery_strategy", "recovery_bytes"],
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="tools/ianwallace-wayback/output")
    parser.add_argument("--timeout", type=float, default=6.0)
    parser.add_argument("--workers", type=int, default=3)
    args = parser.parse_args()

    output = Path(args.output)
    failures_path = output / "failures.csv"
    status_path = output / "download-status.csv"
    summary_path = output / "summary.json"

    if not failures_path.exists() or not status_path.exists() or not summary_path.exists():
        parser.error("output must contain failures.csv, download-status.csv, and summary.json from a previous run")

    failures = read_csv(failures_path)
    status = read_csv(status_path)
    summary = json.loads(summary_path.read_text(encoding="utf-8"))

    if not failures:
        print("No failures remain; archive is already complete.", flush=True)
        return 0

    original_failed = len(failures)
    print(f"Retrying {original_failed} failed captures with {max(1, args.workers)} workers ...", flush=True)

    recovered_by_key: dict[tuple[str, str], dict[str, str]] = {}
    completed = 0

    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 6))) as pool:
        futures = {
            pool.submit(retry_one, row, output, max(2.0, args.timeout)): row
            for row in failures
        }
        for future in as_completed(futures):
            row = future.result()
            key = (row.get("timestamp", ""), row.get("original", ""))
            recovered_by_key[key] = row
            completed += 1
            if row["result"] == "downloaded":
                print(
                    f"RECOVERED {completed}/{original_failed}: {row['timestamp']} via {row['recovery_strategy']} {row['original']}",
                    flush=True,
                )
            elif completed % 25 == 0:
                print(f"Processed {completed}/{original_failed} recovery attempts", flush=True)

    merged: list[dict[str, str]] = []
    for row in status:
        key = (row.get("timestamp", ""), row.get("original", ""))
        merged.append(recovered_by_key.get(key, row))

    summary["recovery_source_failures"] = original_failed
    summary["recovery_attempted"] = original_failed
    summary["recovery_recovered"] = sum(1 for row in recovered_by_key.values() if row["result"] == "downloaded")
    summary["recovery_still_failed"] = sum(1 for row in recovered_by_key.values() if row["result"] == "failed")
    summary["recovery_timeout_seconds"] = max(2.0, args.timeout)
    summary["recovery_workers"] = max(1, min(args.workers, 6))
    summary["attempted"] = summary.get("distinct_url_content_versions", len(merged))
    summary["remaining_unattempted"] = 0

    checkpoint(output, merged, summary)

    print(
        f"Recovery finished: {summary['recovery_recovered']} newly recovered, "
        f"{summary['recovery_still_failed']} still unavailable.",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

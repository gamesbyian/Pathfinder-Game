# ianwallace.com Wayback archive

Self-contained tooling for inventorying and downloading Internet Archive Wayback Machine captures belonging to `ianwallace.com`.

All tool code and generated local output conventions live in this directory. The only file outside it is the GitHub Actions launcher at `.github/workflows/ianwallace-wayback.yml`, because GitHub requires workflow definitions to live there.

## What it does

The downloader queries the Wayback CDX index for the whole `ianwallace.com` domain, including archived `www` URLs and other subdomains returned by domain matching. It records successful (`200`) captures, deduplicates identical content **per original URL** using the Wayback digest, and can either:

1. produce a census/manifest without downloading payloads; or
2. download every distinct archived payload and package the result as a GitHub Actions artifact.

Exact duplicate captures are retained in the raw manifest but only one copy of identical content for a given original URL is downloaded.

## Phone workflow

1. Open the repository on GitHub.
2. Open **Actions**.
3. Select **IanWallace Wayback Archive**.
4. Tap **Run workflow**.
5. Leave **Census only** enabled for a quick inventory, or disable it to download the archive.
6. When the run finishes, download the `ianwallace-wayback-*` artifact from the run page.

## Output

The action writes into `tools/ianwallace-wayback/output/` only while the runner is executing. That directory is uploaded as an Actions artifact; it is not committed to the repository.

Outputs include:

- `manifest-all.csv` — every successful capture returned by CDX.
- `manifest-unique.csv` — one row per distinct `(original URL, content digest)`.
- `summary.json` — counts, date range, MIME breakdown, and byte estimates when available.
- `captures/` — downloaded archived payloads when census-only mode is disabled.

Downloaded filenames contain the Wayback timestamp and preserve a useful extension where possible. The manifest is authoritative for mapping files back to original URLs.

## Scope and safety

The script refuses domains other than `ianwallace.com` by default. Requests are deliberately throttled and retried on transient failures to avoid hammering the Internet Archive.

#!/usr/bin/env python3
"""
Internal Link Crawler — BFS crawl a website, extract all links (internal + external).
Output: JSON file with nodes (pages) + edges (links) for D3.js visualization.

Usage:
  python3 scripts/crawl-internal-links.py https://example.com --max-pages 500 --concurrency 5
  python3 scripts/crawl-internal-links.py https://example.com --output data/crawl-example.json
"""

import argparse
import json
import re
import sys
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# --- Config ---
DEFAULT_MAX_PAGES = 500
DEFAULT_CONCURRENCY = 5
DEFAULT_TIMEOUT = 15
USER_AGENT = "SEO-Manager-Crawler/1.0"
SKIP_EXTENSIONS = {
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico",
    ".css", ".js", ".zip", ".rar", ".mp3", ".mp4", ".avi", ".mov",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".xml",
}


def normalize_url(url: str) -> str:
    """Normalize URL: force https, lowercase host, strip fragment/trailing slash."""
    parsed = urlparse(url)
    scheme = "https"  # Always normalize to https
    path = parsed.path.rstrip("/") or "/"
    return f"{scheme}://{parsed.netloc.lower()}{path}"


def is_same_domain(url: str, base_domain: str) -> bool:
    """Check if URL belongs to same domain (including subdomains)."""
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    return host == base_domain or host.endswith(f".{base_domain}")


def should_skip_url(url: str) -> bool:
    """Skip non-HTML resources."""
    parsed = urlparse(url)
    path_lower = parsed.path.lower()
    return any(path_lower.endswith(ext) for ext in SKIP_EXTENSIONS)


def detect_link_position(tag) -> str:
    """Detect where a link is positioned in the page (nav/header/footer/sidebar/content)."""
    parent = tag
    for _ in range(10):  # walk up max 10 levels
        parent = parent.parent
        if parent is None:
            break
        tag_name = parent.name or ""
        classes = " ".join(parent.get("class", []))
        tag_id = parent.get("id", "")
        combined = f"{tag_name} {classes} {tag_id}".lower()

        if any(x in combined for x in ["nav", "menu", "breadcrumb"]):
            return "navigation"
        if any(x in combined for x in ["header"]):
            return "header"
        if any(x in combined for x in ["footer"]):
            return "footer"
        if any(x in combined for x in ["sidebar", "aside", "widget"]):
            return "sidebar"
    return "content"


def fetch_page(url: str, timeout: int = DEFAULT_TIMEOUT) -> dict:
    """Fetch a page and extract all links with metadata."""
    result = {
        "url": url,
        "status": 0,
        "title": "",
        "links": [],
        "error": None,
    }
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=timeout,
            allow_redirects=True,
        )
        result["status"] = resp.status_code
        result["final_url"] = normalize_url(resp.url)

        # Only parse HTML
        content_type = resp.headers.get("Content-Type", "")
        if "text/html" not in content_type:
            return result

        soup = BeautifulSoup(resp.text, "html.parser")

        # Page title
        title_tag = soup.find("title")
        result["title"] = title_tag.get_text(strip=True) if title_tag else ""

        # Extract all <a> tags
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"].strip()
            if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue

            # Resolve relative URLs
            full_url = urljoin(url, href)
            # Strip fragment
            full_url = full_url.split("#")[0]
            if not full_url.startswith(("http://", "https://")):
                continue

            # Anchor text (strip HTML tags inside <a>)
            anchor = a_tag.get_text(strip=True)
            # Also check for img alt as anchor
            if not anchor:
                img = a_tag.find("img")
                if img and img.get("alt"):
                    anchor = f"[img: {img['alt'].strip()}]"

            # Detect position
            position = detect_link_position(a_tag)

            # Nofollow check
            rel = a_tag.get("rel", [])
            if isinstance(rel, str):
                rel = rel.split()
            is_nofollow = "nofollow" in [r.lower() for r in rel]

            result["links"].append({
                "target_url": normalize_url(full_url),
                "anchor_text": anchor[:200],  # cap at 200 chars
                "position": position,
                "nofollow": is_nofollow,
            })

    except requests.exceptions.Timeout:
        result["error"] = "timeout"
    except requests.exceptions.ConnectionError:
        result["error"] = "connection_error"
    except Exception as e:
        result["error"] = str(e)[:200]

    return result


def fetch_sitemap_urls(domain: str) -> list[str]:
    """Fetch all URLs from sitemap.xml (supports sitemap index)."""
    urls = []
    # Try multiple sitemap locations — validate XML content
    import xml.etree.ElementTree as ET

    sitemap_candidates = [
        f"https://{domain}/sitemap_index.xml",
        f"https://{domain}/sitemap.xml",
        f"https://{domain}/wp-sitemap.xml",
    ]
    sitemap_url = None
    sitemap_content = None
    for candidate in sitemap_candidates:
        try:
            r = requests.get(candidate, headers={"User-Agent": USER_AGENT}, timeout=10, allow_redirects=True)
            if r.status_code == 200 and "<?xml" in r.text[:100]:
                ET.fromstring(r.text)  # validate XML
                sitemap_url = candidate
                sitemap_content = r.text
                break
        except ET.ParseError:
            continue
        except Exception:
            continue

    if not sitemap_url:
        print(f"\n📋 No valid sitemap found for {domain}")
        return urls

    print(f"\n📋 Fetching sitemap: {sitemap_url}")

    try:
        root = ET.fromstring(sitemap_content)
        ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}

        # Check if sitemap index
        sub_sitemaps = root.findall(".//s:sitemap/s:loc", ns)
        if sub_sitemaps:
            print(f"   Found sitemap index with {len(sub_sitemaps)} sub-sitemaps")
            for loc in sub_sitemaps:
                sub_url = loc.text.strip()
                try:
                    sub_resp = requests.get(sub_url, headers={"User-Agent": USER_AGENT}, timeout=15)
                    if sub_resp.status_code == 200:
                        sub_root = ET.fromstring(sub_resp.text)
                        sub_urls = [u.text.strip() for u in sub_root.findall(".//s:url/s:loc", ns) if u.text]
                        urls.extend(sub_urls)
                        print(f"   ✓ {sub_url.split('/')[-1]}: {len(sub_urls)} URLs")
                except Exception as e:
                    print(f"   ✗ {sub_url}: {e}")
        else:
            # Direct sitemap
            direct_urls = [u.text.strip() for u in root.findall(".//s:url/s:loc", ns) if u.text]
            urls.extend(direct_urls)

        print(f"   Total from sitemap: {len(urls)} URLs")
    except Exception as e:
        print(f"   ✗ Error fetching sitemap: {e}")

    return urls


def load_gsc_urls(db_path: str, domain: str) -> list[str]:
    """Load URLs from GSC data in SQLite DB."""
    urls = []
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        # Get pages from GSC snapshots
        rows = conn.execute(
            "SELECT DISTINCT json_extract(value, '$.page') FROM gsc_snapshots, json_each(gsc_snapshots.top_pages) WHERE gsc_snapshots.property LIKE ?",
            (f"%{domain}%",)
        ).fetchall()
        urls = [r[0] for r in rows if r[0]]
        conn.close()
        if urls:
            print(f"📊 GSC: {len(urls)} URLs from Search Console data")
    except Exception as e:
        print(f"   GSC load skipped: {e}")
    return urls


def crawl_site(
    start_url: str,
    max_pages: int = DEFAULT_MAX_PAGES,
    concurrency: int = DEFAULT_CONCURRENCY,
    delay: float = 0.2,
    timeout: int = DEFAULT_TIMEOUT,
    db_path: str = "data/seo-manager.db",
) -> dict:
    """BFS crawl a website, seeded from sitemap + GSC + homepage."""
    parsed_start = urlparse(start_url)
    base_domain = parsed_start.netloc.lower()

    # Collect seed URLs: sitemap + GSC + homepage
    seed_urls = [normalize_url(start_url)]

    # Sitemap seeds
    sitemap_urls = fetch_sitemap_urls(base_domain)
    for u in sitemap_urls:
        norm = normalize_url(u)
        if is_same_domain(norm, base_domain) and norm not in seed_urls:
            seed_urls.append(norm)

    # GSC seeds
    gsc_urls = load_gsc_urls(db_path, base_domain)
    for u in gsc_urls:
        norm = normalize_url(u)
        if is_same_domain(norm, base_domain) and norm not in seed_urls:
            seed_urls.append(norm)

    # Track state
    visited = set()
    queue = deque(seed_urls)
    all_pages = {}    # url -> page data
    all_edges = []    # list of link edges
    external_domains = set()

    print(f"\n🕷️  Crawling {base_domain} (max {max_pages} pages, {concurrency} threads)", flush=True)
    print(f"   Seed URLs: {len(seed_urls)} (sitemap: {len(sitemap_urls)}, GSC: {len(gsc_urls)})", flush=True)
    print(f"{'─' * 60}", flush=True)

    crawled_count = 0
    start_time = time.time()

    while queue and crawled_count < max_pages:
        # Batch: take up to `concurrency` URLs from queue
        batch = []
        while queue and len(batch) < concurrency:
            url = queue.popleft()
            if url in visited:
                continue
            if should_skip_url(url):
                continue
            visited.add(url)
            batch.append(url)

        if not batch:
            break

        # Fetch batch concurrently
        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = {executor.submit(fetch_page, url, timeout): url for url in batch}
            for future in as_completed(futures):
                page = future.result()
                url = page["url"]
                crawled_count += 1

                status_icon = "✓" if page["status"] == 200 else "✗" if page["error"] else "→"
                status_code = page["status"] or "ERR"
                elapsed = time.time() - start_time
                print(
                    f"  [{crawled_count:>4}/{max_pages}] {status_icon} {status_code} "
                    f"{url[:80]:<80} ({elapsed:.1f}s)"
                )

                # Store page node
                norm_url = normalize_url(url)
                all_pages[norm_url] = {
                    "url": norm_url,
                    "title": page["title"],
                    "status": page["status"],
                    "error": page["error"],
                }

                # Process links
                for link in page["links"]:
                    target = link["target_url"]
                    is_internal = is_same_domain(target, base_domain)

                    edge = {
                        "source_url": norm_url,
                        "target_url": target,
                        "anchor_text": link["anchor_text"],
                        "position": link["position"],
                        "nofollow": link["nofollow"],
                        "link_type": "internal" if is_internal else "external",
                    }
                    all_edges.append(edge)

                    if is_internal:
                        # Add to crawl queue if not visited
                        if target not in visited and not should_skip_url(target):
                            queue.append(target)
                    else:
                        ext_domain = urlparse(target).netloc.lower()
                        external_domains.add(ext_domain)

        # Small delay between batches to be polite
        if delay > 0:
            time.sleep(delay)

    elapsed_total = time.time() - start_time

    # --- Build summary ---
    internal_edges = [e for e in all_edges if e["link_type"] == "internal"]
    external_edges = [e for e in all_edges if e["link_type"] == "external"]
    pages_200 = sum(1 for p in all_pages.values() if p["status"] == 200)
    pages_err = sum(1 for p in all_pages.values() if p["status"] != 200)

    summary = {
        "domain": base_domain,
        "start_url": start_url,
        "total_pages": len(all_pages),
        "pages_200": pages_200,
        "pages_error": pages_err,
        "total_links": len(all_edges),
        "internal_links": len(internal_edges),
        "external_links": len(external_edges),
        "external_domains": len(external_domains),
        "crawl_duration_sec": round(elapsed_total, 1),
        "crawled_at": datetime.now(timezone.utc).isoformat(),
    }

    print(f"\n{'─' * 60}")
    print(f"✅ Done! {summary['total_pages']} pages, {summary['total_links']} links ({elapsed_total:.1f}s)")
    print(f"   Internal: {summary['internal_links']} | External: {summary['external_links']}")
    print(f"   Status 200: {pages_200} | Errors: {pages_err}")

    return {
        "summary": summary,
        "nodes": list(all_pages.values()),
        "edges": all_edges,
    }


def main():
    parser = argparse.ArgumentParser(description="Crawl website internal links")
    parser.add_argument("url", help="Start URL (e.g. https://example.com)")
    parser.add_argument("--max-pages", type=int, default=DEFAULT_MAX_PAGES, help=f"Max pages to crawl (default: {DEFAULT_MAX_PAGES})")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY, help=f"Concurrent requests (default: {DEFAULT_CONCURRENCY})")
    parser.add_argument("--delay", type=float, default=0.2, help="Delay between batches in seconds (default: 0.2)")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT, help=f"Request timeout in seconds (default: {DEFAULT_TIMEOUT})")
    parser.add_argument("--output", "-o", type=str, default=None, help="Output JSON file path (default: data/crawl-{domain}.json)")
    args = parser.parse_args()

    # Validate URL
    if not args.url.startswith(("http://", "https://")):
        args.url = f"https://{args.url}"

    # Default output path
    if not args.output:
        domain = urlparse(args.url).netloc.lower().replace(".", "-")
        args.output = f"data/crawl-{domain}.json"

    # Crawl
    result = crawl_site(
        start_url=args.url,
        max_pages=args.max_pages,
        concurrency=args.concurrency,
        delay=args.delay,
        timeout=args.timeout,
    )

    # Save JSON
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n📁 Saved to: {args.output}")
    print(f"   File size: {len(json.dumps(result)) / 1024:.1f} KB")


if __name__ == "__main__":
    main()

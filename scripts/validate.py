#!/usr/bin/env python3
"""Pre-deploy checks for the static site in public/.

Deliberately dependency-free so CI needs no install step and this can also be
run locally with `python3 scripts/validate.py`. Exits non-zero on any failure.
"""
from __future__ import annotations

import re
import sys
import xml.dom.minidom
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "source", "track", "wbr"}

failures: list[str] = []
notes: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)


class Structure(HTMLParser):
    """Tracks tag nesting and collects local asset references."""

    def __init__(self) -> None:
        super().__init__()
        self.stack: list[str] = []
        self.errors: list[str] = []
        self.refs: list[str] = []
        self.has_title = False
        self.has_viewport = False
        self.has_lang = False
        self.imgs_without_alt = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html" and a.get("lang"):
            self.has_lang = True
        if tag == "title":
            self.has_title = True
        if tag == "meta" and a.get("name") == "viewport":
            self.has_viewport = True
        if tag == "img" and not a.get("alt"):
            self.imgs_without_alt += 1
        for key in ("href", "src"):
            v = a.get(key)
            # Local absolute paths only; skip anchors, mailto, and external URLs.
            if v and v.startswith("/") and not v.startswith("//"):
                self.refs.append(v)
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.errors.append(f"unexpected </{tag}>")


def check_html() -> None:
    pages = sorted(PUBLIC.glob("*.html"))
    if not pages:
        fail("no HTML files found in public/")
        return

    for page in pages:
        rel = page.relative_to(ROOT)
        p = Structure()
        p.feed(page.read_text(encoding="utf-8"))

        for err in p.errors:
            fail(f"{rel}: {err}")
        if p.stack:
            fail(f"{rel}: unclosed tags {p.stack}")
        if not p.has_title:
            fail(f"{rel}: missing <title>")
        if not p.has_viewport:
            fail(f"{rel}: missing viewport meta (breaks mobile layout)")
        if not p.has_lang:
            fail(f"{rel}: <html> missing lang attribute (accessibility)")
        if p.imgs_without_alt:
            fail(f"{rel}: {p.imgs_without_alt} <img> without alt text")

        for ref in p.refs:
            target = PUBLIC / ref.lstrip("/")
            if not target.exists():
                fail(f"{rel}: references {ref} which does not exist in public/")

        notes.append(f"{rel}: structure OK, {len(set(p.refs))} local refs resolved")


def check_xml() -> None:
    for name in ("sitemap.xml", "favicon.svg"):
        path = PUBLIC / name
        if not path.exists():
            fail(f"public/{name} is missing")
            continue
        try:
            xml.dom.minidom.parse(str(path))
            notes.append(f"public/{name}: valid XML")
        except Exception as exc:  # noqa: BLE001 - surface the parser's own message
            fail(f"public/{name}: invalid XML - {exc}")


def check_css_classes() -> None:
    css_path = PUBLIC / "styles.css"
    if not css_path.exists():
        fail("public/styles.css is missing")
        return
    css = css_path.read_text(encoding="utf-8")
    used: set[str] = set()
    for page in PUBLIC.glob("*.html"):
        for match in re.findall(r'class="([^"]+)"', page.read_text(encoding="utf-8")):
            used.update(match.split())
    missing = sorted(c for c in used if f".{c}" not in css)
    if missing:
        fail(f"CSS classes used in markup but never defined: {missing}")
    else:
        notes.append(f"all {len(used)} CSS classes are defined")


def check_placeholders() -> None:
    """Placeholder domains must never ship; unfilled TODOs are only a warning."""
    for path in PUBLIC.rglob("*"):
        if not path.is_file() or path.suffix in {".png", ".jpg", ".ico"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for bad in ("example.org", "example.com", "yourdomain"):
            if bad in text:
                fail(f"{path.relative_to(ROOT)}: still contains placeholder '{bad}'")


def check_headers() -> None:
    headers = PUBLIC / "_headers"
    if not headers.exists():
        fail("public/_headers is missing (security headers would not be applied)")
        return
    text = headers.read_text(encoding="utf-8")
    for required in ("Content-Security-Policy", "X-Content-Type-Options",
                     "X-Frame-Options", "Referrer-Policy"):
        if required not in text:
            fail(f"public/_headers: missing {required}")
    notes.append("public/_headers: all required security headers present")


def main() -> int:
    if not PUBLIC.is_dir():
        print("FAIL: public/ directory not found", file=sys.stderr)
        return 1

    check_html()
    check_xml()
    check_css_classes()
    check_placeholders()
    check_headers()

    for note in notes:
        print(f"  ok   {note}")
    for failure in failures:
        print(f"  FAIL {failure}", file=sys.stderr)

    if failures:
        print(f"\n{len(failures)} check(s) failed.", file=sys.stderr)
        return 1
    print(f"\nAll checks passed ({len(notes)} verified).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

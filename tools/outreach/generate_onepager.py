#!/usr/bin/env python3
"""
Generate a personalized Cubby Founding Host one-pager PDF for one business.

This is the lightweight counterpart to generate_proposal.py: a 1-page summary
proposal small enough to send as a real email attachment (the full 18-page
proposal-template.html renders too large to pass through the MCP email tool's
single-call size limit, even after compression -- see tools/outreach/README.md).

Usage:
    python3 generate_onepager.py "Business Name" [output_dir]

What it does:
    1. Copies tools/outreach/onepager-template.html.
    2. Replaces the "Business name" placeholder on the page.
    3. Renders it to PDF with headless Chrome (asserts exactly 1 page).
    4. Sets the PDF's Title/Author/Subject metadata and names the file
       "Cubby x <Business Name> - Founding Host Proposal.pdf".

Requires: a Chromium binary (set CHROME_PATH, or it auto-detects the
Playwright-installed one at /opt/pw-browsers), and Node.js with the "pdf-lib"
package (installed automatically into tools/outreach/node_modules on first
run if missing).
"""
import argparse, os, subprocess, sys, html, json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_PATH = os.path.join(SCRIPT_DIR, "onepager-template.html")

PLACEHOLDER = 'Prepared for <strong>Business name</strong>'


def find_chrome():
    env = os.environ.get("CHROME_PATH")
    if env and os.path.exists(env):
        return env
    candidates = [
        "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    ]
    base = "/opt/pw-browsers"
    if os.path.isdir(base):
        for name in sorted(os.listdir(base)):
            if name.startswith("chromium-") and "headless_shell" not in name:
                cand = os.path.join(base, name, "chrome-linux", "chrome")
                if os.path.exists(cand):
                    candidates.append(cand)
    for c in candidates:
        if os.path.exists(c):
            return c
    raise RuntimeError(
        "No Chromium binary found. Set CHROME_PATH or install one under /opt/pw-browsers."
    )


def ensure_pdf_lib():
    node_modules = os.path.join(SCRIPT_DIR, "node_modules", "pdf-lib")
    if os.path.isdir(node_modules):
        return
    subprocess.run(
        ["npm", "install", "pdf-lib", "--no-audit", "--no-fund"],
        cwd=SCRIPT_DIR, check=True, capture_output=True,
    )


def safe_filename_piece(name: str) -> str:
    return name.replace("/", "-")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("business_name", help="Exact business name as it should appear on the one-pager")
    ap.add_argument("output_dir", nargs="?", default=".", help="Directory to write the PDF into (default: cwd)")
    args = ap.parse_args()

    business_name = args.business_name.strip()
    if not business_name:
        sys.exit("business_name must not be empty")

    os.makedirs(args.output_dir, exist_ok=True)

    with open(TEMPLATE_PATH, encoding="utf-8") as f:
        tpl = f.read()

    if PLACEHOLDER not in tpl:
        sys.exit(
            "Template marker not found -- onepager-template.html may have been edited "
            "and this script's PLACEHOLDER constant needs updating to match."
        )

    replacement = f'Prepared for <strong>{html.escape(business_name)}</strong>'
    personalized_html = tpl.replace(PLACEHOLDER, replacement, 1)

    safe_name = safe_filename_piece(business_name)
    work_html = os.path.join(args.output_dir, f".tmp-onepager-{safe_name}.html")
    with open(work_html, "w", encoding="utf-8") as f:
        f.write(personalized_html)

    raw_pdf = os.path.join(args.output_dir, f".tmp-onepager-{safe_name}-raw.pdf")
    chrome = find_chrome()
    subprocess.run(
        [chrome, "--headless", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
         f"--print-to-pdf={raw_pdf}", "--print-to-pdf-no-header",
         f"file://{os.path.abspath(work_html)}"],
        check=True, capture_output=True,
    )

    ensure_pdf_lib()

    final_name = f"Cubby x {safe_name} - Founding Host Proposal.pdf"
    final_path = os.path.join(args.output_dir, final_name)

    node_script = f"""
const {{ PDFDocument }} = require({json.dumps(os.path.join(SCRIPT_DIR, "node_modules", "pdf-lib"))});
const fs = require('fs');
(async () => {{
  const bytes = fs.readFileSync({json.dumps(raw_pdf)});
  const doc = await PDFDocument.load(bytes);
  const pageCount = doc.getPageCount();
  if (pageCount !== 1) {{
    console.error('UNEXPECTED_PAGE_COUNT:' + pageCount);
    process.exit(2);
  }}
  doc.setTitle({json.dumps(f"Cubby x {business_name} | Founding Host Proposal")});
  doc.setAuthor('Cubby');
  doc.setSubject({json.dumps(f"Founding Host Proposal (overview) — prepared for {business_name}")});
  const out = await doc.save();
  fs.writeFileSync({json.dumps(final_path)}, out);
  console.log('OK:' + pageCount);
}})();
"""
    result = subprocess.run(["node", "-e", node_script], cwd=SCRIPT_DIR, capture_output=True, text=True)
    os.remove(work_html)
    os.remove(raw_pdf)

    if result.returncode != 0:
        sys.stderr.write(result.stdout + result.stderr)
        sys.exit(f"PDF generation failed for '{business_name}' -- did not produce a verified 1-page PDF.")

    print(final_path)


if __name__ == "__main__":
    main()

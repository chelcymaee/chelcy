#!/usr/bin/env python3
"""
Add a business to the Cubby proposal hub page's BUSINESSES lookup.

The hub page (proposal-hub-template.html) is a single Artifact that serves
every business's Founding Host Proposal from one shared, already-public URL,
using a #slug in the link to pick which business name to show (see the
BUSINESSES object and route() function near the end of the file). This
avoids literal PDF attachments, which are not technically deliverable
through the available email tool in this environment (base64 content of
any real PDF vastly exceeds what a single tool call can carry) -- see
README.md for the full story.

This script only edits the local template file. After running it, you
still need to publish the updated file with the Artifact tool to the
existing hub URL (same `url`, so the link and its sharing setting stay the
same) for the new business's link to actually go live.

Usage:
    python3 add_business_to_hub.py "Business Name"

Prints the slug and the full URL fragment to use in that business's email,
e.g.:
    slug: the-business-name
    url fragment: #the-business-name
"""
import argparse, re, sys, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_PATH = os.path.join(SCRIPT_DIR, "proposal-hub-template.html")


def slugify(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("business_name", help="Exact business name as it should appear on the proposal page")
    args = ap.parse_args()

    business_name = args.business_name.strip()
    if not business_name:
        sys.exit("business_name must not be empty")

    slug = slugify(business_name)
    if not slug:
        sys.exit(f"Could not derive a usable slug from '{business_name}'")

    with open(TEMPLATE_PATH, encoding="utf-8") as f:
        html = f.read()

    marker = "var BUSINESSES = {"
    idx = html.find(marker)
    if idx == -1:
        sys.exit("Could not find 'var BUSINESSES = {' in the template -- has it been restructured?")

    existing_key_pattern = re.compile(r'"' + re.escape(slug) + r'"\s*:')
    if existing_key_pattern.search(html):
        print(f"'{slug}' is already in BUSINESSES -- not adding a duplicate.", file=sys.stderr)
        print(f"slug: {slug}")
        print(f"url fragment: #{slug}")
        return

    insert_at = idx + len(marker)
    escaped_name = business_name.replace("\\", "\\\\").replace('"', '\\"')
    new_entry = f'\n    "{slug}": "{escaped_name}",'
    html = html[:insert_at] + new_entry + html[insert_at:]

    with open(TEMPLATE_PATH, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Added '{business_name}' to {TEMPLATE_PATH}")
    print(f"slug: {slug}")
    print(f"url fragment: #{slug}")
    print("Remember: publish this file with the Artifact tool to the existing hub URL for the link to go live.")


if __name__ == "__main__":
    main()

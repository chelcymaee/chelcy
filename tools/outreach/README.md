# Cubby outreach proposal generator

Durable, repo-committed copy of the Cubby Founding Host Proposal, used by the
daily automated outreach routine (and by Claude in any future session) to
generate a personalized proposal PDF without depending on any one session's
temporary files.

## Files

- `proposal-template.html` — the master 18-page proposal. Fully self-contained:
  the founder photo is embedded as a base64 data URI inside the file, so no
  other assets are needed. The cover page has an editable "Business name"
  placeholder that `generate_proposal.py` replaces.
- `generate_proposal.py` — renders a personalized copy to PDF with headless
  Chrome, verifies it came out to 18 pages, and sets the PDF's title/author/
  subject metadata. Auto-installs the one Node dependency it needs (`pdf-lib`)
  on first run.

## Usage

```
python3 tools/outreach/generate_proposal.py "Business Name" /path/to/output/dir
```

Optional `--subtitle` to use something other than "Founding Host Proposal" in
the filename and title, e.g.:

```
python3 tools/outreach/generate_proposal.py "Two Oceans Aquarium" . --subtitle "Luggage Storage Partnership Proposal"
```

Output filename: `Cubby x <Business Name> - <subtitle>.pdf` (hyphen-separated,
matching the outreach brief's naming convention).

## Updating the template

If the proposal content ever changes, edit `proposal-template.html` directly
and commit it here — every future generation (manual or automated) will pick
up the new version immediately, no other file needs touching.

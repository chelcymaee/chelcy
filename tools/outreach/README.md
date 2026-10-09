# Cubby outreach proposal generator

Durable, repo-committed copy of the Cubby Founding Host Proposal, used by the
daily automated outreach routine (and by Claude in any future session)
without depending on any one session's temporary files.

## IMPORTANT: how proposals are actually delivered (read this first)

Outreach emails link to a **live web page**, not a PDF attachment. Literal
PDF attachments are not deliverable through the Gmail tool available in this
environment: a real PDF's base64 content tokenizes catastrophically badly
(roughly 3 tokens per character), so even a heavily compressed ~50KB one-page
PDF exceeds what a single tool call can carry. This was tested repeatedly and
confirmed before switching approaches — don't re-attempt a literal PDF
attachment without re-reading this section.

The working mechanism:

1. `proposal-hub-template.html` is **one** Claude Artifact page containing
   the full real proposal content (cover, founder note + photo, how it
   works, earnings example, FAQ, etc. — the same wording as the original
   18-page deck, recreated as a single scrollable web page). It has already
   been published once and set to "Anyone with the link" sharing by Chelcy
   — that sharing setting is tied to the artifact's URL and persists across
   republishes to the same URL, so it never needs to be redone.
2. A business is added by running `add_business_to_hub.py "Business Name"`,
   which inserts a `slug: "Business Name"` entry into the `BUSINESSES`
   JavaScript lookup near the end of the file. The page reads
   `location.hash` client-side and shows the matching business's name on
   the cover — the rest of the content is identical for everyone, exactly
   like the real 18-page deck (only its cover page was ever personalized).
3. The updated file must then be **published with the Artifact tool** to
   the existing hub URL (pass the same `url`, not a new one) for the new
   business's link to go live. This repo only stores the source file —
   actually publishing it is a separate step a Claude session with Artifact
   tool access has to do.
4. The email links to `<hub URL>#<slug>`, e.g.
   `https://claude.ai/artifact/7fnSShxKxoVr3UHZQHEhSy#the-marly-boutique-hotel`.
   Find the current hub URL in the Outreach Tracker's Notes column for any
   already-sent row, or ask Chelcy if it's ever unclear.

The founder photo is pre-compressed and saved at `founder-photo-small.b64`
(240px wide, ~15KB base64) specifically so it can be substituted into the
HTML via a file-to-file Bash/Python operation — never regenerate or
re-embed it by typing the base64 out directly; that hits the same
tokenization wall as a PDF attachment.

## Files

- `proposal-hub-template.html` — the live multi-business proposal page
  (see above). Edit this file, then publish it with the Artifact tool.
- `add_business_to_hub.py` — adds one business to the page's `BUSINESSES`
  lookup. Usage: `python3 tools/outreach/add_business_to_hub.py "Business Name"`.
  Prints the slug and `#fragment` to use in that business's email. Refuses
  to add a duplicate slug.
- `founder-photo-small.b64` — pre-compressed founder photo, ready to
  substitute into any new HTML via file content, never via typed output.
- `proposal-template.html` / `generate_proposal.py` — the original 18-page
  print/PDF version and its generator. Kept for Chelcy's own manual use
  (e.g. sending the full designed PDF herself to a seriously interested
  lead) — **not** used by the automated daily routine's attachments anymore,
  for the reason above.
- `generate_onepager.py` / `onepager-template.html` — an earlier, abandoned
  attempt at a smaller attachable PDF. Still too large to attach (same
  tokenization wall at any realistic file size). Kept only in case a future
  session wants to reuse the 1-page copy as *content*, not as an attachment.

## Updating the proposal content

If the proposal's wording changes, edit the relevant section inside
`proposal-hub-template.html` directly (it's one HTML file, same content for
every business) and publish it to the existing hub URL — every business's
link picks up the change immediately, nothing else needs touching.

# Sweetpea — brand & project notes

Working notes for Claude (and anyone else) picking up Sweetpea work: the website and social media posts.

## The business

Sweetpea is a **marketing studio in the Rocky Mountains**. It offers social media, brand overhauls and
marketing strategy for mountain-town businesses: shops, lodges, outfitters, restaurants and makers.
The studio is run by Gracie and works with US mountain-town clients; the Drive has Colorado, Wyoming
and Montana content folders.

**Tagline:** "Marketing for mountain towns."
**Sub-line:** "Marketing studio · Rocky Mountains"

## Brand direction (October 2026 rebrand)

The brand must work for masculine and feminine clients alike, so it is **outdoorsy and neutral, not
feminine**. Don't use the old pink palette, flowers or sweet pea illustrations on new work.

The source of truth is the Canva design **"SP Flyer"** (design `DAHX-JNCvu0`, owned by Gracie's account).

### Colours (exact, from the flyer)

| Name | Hex | Use |
| --- | --- | --- |
| Linen | `#E8E0CF` | Light backgrounds, text on dark |
| Sage | `#A3B19B` | Soft accents, labels on forest |
| Forest | `#2F4A3A` | Primary: headlines, dark sections, logo |
| Mist | `#9DB4C0` | Sky, far mountains |
| Rust | `#B5583A` | Calls to action, accents |
| Paper (ours) | `#F7F3EA` | Page background |
| Ink (ours) | `#1E2B23` | Body text |

### Type

- **Headlines:** a semibold classic serif (Canva font ref `YAFdJpU7Kkk`). The web stand-in is
  **Fraunces** with soft and "wonky" both off, weight 600, tight letter-spacing.
- **Labels:** small, spaced capitals in a geometric sans: Montserrat 600 at 0.26em tracking.
- **Body:** Montserrat.

### Logos

- **"sweetpea." wordmark:** same letterforms as before. Recoloured SVGs are in `sweetpea/assets/`:
  `wordmark-forest.svg`, `wordmark-linen.svg` and `wordmark-white.svg`.
- **New "SP" monogram** with a mountain range inside the letters: **we don't have this file yet.** Ask
  for an SVG or PNG. Until then the favicon is a simple mountain, `peak-forest.svg`.
- **Mountain line icon:** the flyer uses Canva's "Minimalist Mountain Silhouette" in rust. The site draws
  its own similar line.

### Photos

The flyer uses mountain photos (Teton-style peaks, a misty valley, red-rock cliffs). They belong to
Gracie's Canva account, and this environment can't download them. Ask for the files to be attached
in chat or added to the GitHub release `sweetpea-assets`.

### Services copy (from the flyer)

- **Social Media:** Posts, Reels, and engagement, handled.
- **Brand Overhauls:** A look that fits who you are now.
- **Marketing Strategy:** A clear plan for locals and visitors.
- **Free offer:** Book a 20-minute marketing check-in.

## Website

- **Location:** `sweetpea/` (index.html, styles.css, main.js). Live at mountain.co.za/sweetpea/ once
  merged to `main`.
- **Pull request:** https://github.com/chelcymaee/chelcy/pull/180
- **Private preview:** https://claude.ai/artifact/YE7BusMVEZuTCipYRbFeJ4. Share it from its
  Share menu.
- **Hero animation:** layered mountain ridges in mist, sage, green and forest, with pine treelines and a
  rust sun. As you scroll, each ridge climbs at its own speed (parallax), the forest rises to fill the
  screen, and "Marketing for mountain towns." appears on the green.
- **Process section:** "Scout. Map. Summit." with a trail that draws itself as you scroll and peak
  markers that light up.
- **Packages:** Basecamp, Trailhead and Summit. The contents are a draft.
- **Check-in section:** rust background with a drawn ridge and treeline.

### Still to do

- New SP monogram file and real photos (see above)
- Real email, Instagram and booking links (marked `TODO` in index.html)
- About text, package contents and prices are drafts and need sign-off

## Social media

- `sweetpea/social/`: posts are built as HTML, then `node sweetpea/social/render.mjs <folder>` exports
  each `.slide` to PNG.
- `winter-emoji-combos/`: Instagram carousel at 1080×1350 using Apple-style emoji images
  (`social/emoji/`). It was made in the **old pink brand**, so redo it in the new palette before
  posting.

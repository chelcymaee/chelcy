# Sweetpea — brand & project notes

Working notes for Claude (and anyone else) picking up Sweetpea work: the website and social media posts.

## The business

Sweetpea is a **social media management** studio for bold, feminine, adventurous brands.
Tagline used on the site: **"Social that blooms."**

The brand identity was designed by Good Spark Creative Design. The original guide was made for a
"Sweetpea Gear + Gadgets" outdoor brand. We reuse its look, but **not** its gear wording:
don't use "Gear + Gadgets", "Gear for the gals", the stacked logo with that text, or the original
brand pattern artboard, which contains that text.

## Brand words

Feminine · Adventurous · Resilient · Outdoorsy

## Colours

| Name | Hex | Use |
| --- | --- | --- |
| Barely Blush | `#F4DBD7` | Main background |
| Punchy Peach | `#ED8C80` | Primary brand colour, logo |
| Goldenrod | `#E4AB55` | Logo use, accents |
| Mellow Yellow | `#F0E6AE` | Soft background |
| Cherry Red | `#F1614E` | Secondary, bold accents |
| Sorbet Delight | `#FFB68D` | Secondary |
| Ink (ours) | `#2B1A17` | Text, buttons |
| Cream (ours) | `#FFF8F3` | Cards, light text on colour |

## Type

- **Brand fonts:** Regards (logo only) and Good Hand Sans (accents in all caps, body text).
  These are paid fonts and we don't have the files yet.
- **Web and social stand-ins** (free, Google Fonts):
  - Fraunces, soft and "wonky" settings, for headlines
  - Barlow Condensed, all caps with wide letter-spacing, for accents and labels
  - Montserrat for body text

## Logos

SVGs are in `sweetpea/assets/`:

- `wordmark-*.svg`: horizontal "sweetpea." wordmark in peach, blush, gold and yellow
- `initials-*.svg`: "SP" monogram (favicon, profile picture)
- `submark-*.svg`: sunburst in a circle

Source files:

- Full logo zip: shared in chat on 2026-10-16
- Brand guidelines PDF: GitHub release `sweetpea-assets`
  (https://github.com/chelcymaee/chelcy/releases/tag/sweetpea-assets)

## Visual motif: the sweet pea

The client loves a **realistic sweet pea flower**, based on reference photos of pink, magenta and
white sweet peas on a stem. On the website it is drawn in SVG (`main.js` → `buildFlower`):

- Parts: a ruffled banner petal, two wings, a keel and a green calyx.
- Colour schemes: peach, blush, berry and cream, each shaded from a deeper centre to a pale rim.

Reuse this flower in social posts for consistency.

## Website status

- **Location:** `sweetpea/` (index.html, styles.css, main.js). Live at mountain.co.za/sweetpea/ once
  merged to `main`.
- **Pull request:** https://github.com/chelcymaee/chelcy/pull/180
- **Private preview:** https://claude.ai/artifact/YE7BusMVEZuTCipYRbFeJ4. Share it from its
  Share menu.
- **Hero:** a sweet pea stem grows as you scroll, and flowers open bottom to top. The top flower
  stays a half-open bud. Then "Social that blooms." appears.
- **Process section:** a green stem with a sweet pea opening at Plant / Grow / Bloom.
- **Reference site:** the client sent thenitrocart.com as a site they like, but the address doesn't
  resolve. They want something "cooler but still minimalistic".

### Still to do

- Real email, Instagram and WhatsApp links (marked `TODO` in index.html)
- About text, package contents and prices are drafts and need sign-off
- Brand font files (Regards, Good Hand Sans)
- Optional: swap the remaining sunburst icons (marquee, contact section) for sweet peas

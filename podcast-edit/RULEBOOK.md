# Break 'n Bad podcast reel: edit rule book

This is how every podcast gets edited. The reference edit is `IMG_0222_reel_9x16_v5.mp4`, which was approved as **perfect**.
Match it exactly. Target: **finished reel within 30 minutes** of receiving all files.

---

## 0. Workflow (in this order)

1. **Get the raw video.** The user uploads it to the working branch at
   `https://github.com/chelcymaee/chelcy/upload/<branch>`. GitHub's upload page limits each file to 25 MB, so the user splits longer files into parts with QuickTime → Trim. The Google Drive download is blocked in this environment.
2. **Set up the tools** with `podcast-edit/tools/setup.sh` (about 3 minutes). It downloads the models from GitHub and the Python packages from PyPI; both are reachable here.
3. **Join the parts losslessly** (ffmpeg concat with `-c copy`). Work out which part comes first from the content, not the filename: the first part starts with someone walking from the camera to sit down, and the last part ends with someone walking up to stop recording.
4. **Transcribe** with Parakeet (`asr.py`, which gives word timestamps) and cross-check with Whisper small.en. Note every place the two models disagree.
5. **🔴 STOP and send the ASSET REQUEST LIST** (section 1) **before editing**. This includes the uncertain caption lines.
6. While the user gathers the assets, start the **face tracking** (`track.py`), the **speaker timeline** (`spk.py`), and a captions-only draft.
7. When the assets land, **cut them out**, build the **stickers and cards**, and **render** (section 2 onward).
8. **Check frames from every shot** and **measure the audio** (section 9). Then commit, push, and send a preview under 30 MB.

---

## 1. Asset request list (always send before editing)

After transcribing, read the whole transcript and send the user **one list** in this format:

```
To make this edit I need you to upload (to <upload link>):

PLAYERS / CHARACTERS (photo, current team uniform, any background, I'll cut it out)
  1. <Name>, <team as said in video>, mentioned at <reel time>: "<quote>"
  ...
TEAM LOGOS / BRANDS
  1. <Team>, at <times>
  ...
ARTICLES / STATS TO SCREENSHOT (one per claim worth backing up or correcting)
  1. <claim as said> at <time> → search: "<suggested search>"
  ...
CARDS / PRODUCTS (exact card: player, year, set, parallel, serial #)
  1. ...
SOLD LISTINGS / PRICE COMPS (screenshot showing price, bids, date) for every sale mentioned
HOOK HERO IMAGE: one strong image for the opening title (e.g. the two players or the card)
B-ROLL / REACTION CLIPS (optional, clips you have rights to): game footage, reaction moments
CAPTIONS I'M UNSURE OF (please tell me the exact words)
  1. <time>: "<model A>" vs "<model B>"
```

Rules for building the list:
- Include **every named player or character, team, brand, card, and product**.
- Add an article or stat request for **every number or claim** a speaker states. This includes claims hedged with "I feel like" or "I heard".
- Ask for **current-team photos**. Flag it if a supplied photo shows a different team from the one discussed.
- Ask for screenshots of the **real article page**. Note when the user sends a Google AI summary instead.
- Never invent a card, sale price, stat, or headline. If something can't be verified, leave it out.

---

## 2. Format and framing

- **9:16 vertical, 1080×1920, 30 fps.** H.264 CRF 20 master. Make a preview copy at CRF 25 so it stays under 30 MB for chat.
- **One speaker on screen at a time.** Pick the speaker from mouth movement with face-mesh landmarks 13/14. Smooth it with a 21-frame average, a 1.35× dominance ratio, and a minimum hold of 1.2 s before switching.
- **Close-up crop** from a 720p source: **340×604**, so the face fills about 1/3 of the frame width with eyes about 55% down. Leave the wall above the head clear for pop-ups. Track the face if the person is still moving at the start.
- **Two people talking at once:** stacked split screen, each half cropped 540×480 → 1080×960.
- **Zoom-ins** (crop 940×1672 → full frame, about 1.15×) on 3–4 hype lines only. Zooms apply to the picture only, never to captions or stickers.
- Check the source resolution first. If it's below 1080p, tell the user the close-ups will be soft and recommend recording in 4K.

## 3. Pacing

- Cut the sitting-down at the start and the standing-up at the end. **Start on the first real word** and **end after the last word's tail**. Check against word timestamps: v1 clipped the opening question and the last word.
- Pauses of 0.45 s or longer (silencedetect −40 dB) get shortened to about 0.22 s. Keep laughs and reactions.

## 4. Captions

- **Barlow Condensed ExtraBold** (from npm `@fontsource/barlow-condensed`, converted from woff2 to ttf). Size **122** on a 1920-tall frame, ALL CAPS, white with a 6 px black outline and a 3 px shadow.
- **1–3 words, one line**, breaking at punctuation or once a line passes 14 characters.
- **The word being spoken turns cyan** `#31C6E8` (karaoke style).
- Bottom margin 300 px, which puts captions at chest height (about 83% down).
- Write numbers as digits. Keep the speaker's exact words: if they misstate a number, the caption keeps it and a card shows the real figure.
- Deliver a `.srt` alongside the video.

## 5. Pop-ups (stickers, cutouts, logos)

- **Background removal:** rembg with **BiRefNet-general**, **one image per process** (more than one at a time runs out of memory). Crop to the cut-out area and never enlarge, so the image keeps its source quality.
- **Logo fixes after cutout:**
  - Refill enclosed holes in the alpha with the brand colour (for example, the 49ers oval interior is `#AA0000`).
  - Put any logo that is mostly white on its brand-colour disc (for example, the Rams on navy `#003594`).
- **Finish:** 14 px white sticker border (10 px for logos) plus a soft drop shadow.
- **Placement:** above the speaker's head (centre y 350–470, bottom edge ≤ about 700). Never cover a face or a caption. Check against zoomed shots too.
- **Animation:** bounce in (scale 0.25 → 1.2 → 1.0 over 0.3 s), gentle float (±7 px at 0.7 Hz), and a 0.15 s shrink out. Time each one to the first mention; it stays for 1.3–3 s.
- Two related items can sit side by side (cx 300 / 790), for example a player next to the MVP trophy.
- Draw cartoon stickers in-house (flat style with a white border) for general ideas: football, trophy, and so on.

## 6. Article and stat cards

- Screenshot → rounded card (radius 28) with a white border and shadow, at most 860–940 px wide.
- Same bounce animation, plus the **card_pop** sound.
- Several headlines on one topic **stack into a pile** (centre y 230 / 410 / 590), each popping in at its own mention. They all leave together.
- **Fact-check badge** (cyan pill, for example "AVG: 134 YDS/GAME") only when its number is computed from data visible on the card.

## 7. Moments

| Trigger | Effect |
|---|---|
| First ~2.3 s | **Hook banner** (white rounded box: black line 1, cyan line 2), written from the episode's core question |
| A fail or bad stat | **Grey-out** (hue s=0) + **sad trombone** |
| Fear or tension ("I'm scared") | **Red vignette + 0.6 s shake** + suspense sting + zoom-in |
| Head-to-head (team vs team) | Both logos (cx 215 / 840) + **⚡VS⚡ badge** + 0.6 s shake + thunder + impact |
| Hype claim ("he's a dog") | Zoom-in + impact |
| "MVP" or awards | Trophy sticker + impact |
| Money or numbers | cha-ching |
| "Phenomenal" or "amazing" | sparkle |
| Sign-off | referee whistle |

## 8. Sound effects

Every sound is made in-house with `sfx.py` and `sfx2.py`, so there's nothing to license. **Each pop-up gets its own sound:**

| Pop-up | Sound |
|---|---|
| QB | `qb_throw_catch` |
| RB | `rb_tackle` |
| WR | `wr_swish_ooh` |
| Other player | `pop` |
| Vikings | `war_horn` |
| Chiefs | `drums` |
| 49ers | `coin_chime` |
| Rams | `deep_horn` |
| Broncos | `gallop` |
| Seahawks | `hawk_cry` |
| Full-screen celebration cutaway | `impact` + `crowd_cheer` |
| Article card | `card_pop` |
| Cartoon sticker | `whoosh` + `pop` |

- For a team not listed, design a matching sound in the same style and add it to this table.
- **Levels:** set gains so each effect sits **9–12 dB under the voice**. Mid-length hits use −6 to −9 dB; long horns use −10 to −11 dB. Effects never cover a key word.

## 9. Audio chain and QC (must pass before sending)

- **Voice chain:** high-pass 80 Hz → afftdn nr 8 → compressor 2.5:1 → loudnorm I −14 → **aresample 48000**. The last step is required: loudnorm outputs 192 kHz, and without it the soundtrack ended about 3 s early in v3 and v4.
- **Final mix:** amix `duration=longest:normalize=0` → alimiter 0.7 → `apad,atrim` to the exact video length.
- **QC checklist:**
  - [ ] Audio stream length = video length (ffprobe both).
  - [ ] Sound is present in the last 3 s.
  - [ ] Integrated loudness about −14 LUFS, true peak ≤ −1 dBTP.
  - [ ] Measure the effects on their own track: about 9–12 dB under the voice.
  - [ ] Check frames from every shot: right speaker, face in frame, no sticker on a face or caption.
  - [ ] Check spectrograms of any new sound effect (no silent or broken synth). This is how the trombone bug was caught.
  - [ ] Captions start on the first word and end on the last word.
  - [ ] **Frame-accurate transitions:** run `tools/glitchscan.py <reel>`. It must report no `FLASH` and no `SHORT SHOT`. Then view every transition at ±2 frames.
    - Put every edit point **halfway between frames**, at `(round(t*fps) - 0.5)/fps`, never on a frame timestamp. Otherwise a frame at a camera cut lands in the wrong shot and gets the wrong crop.
    - Overlay `enable` windows and overlay-stream `setpts` run **+1 frame** relative to the concat timeline.
    - Start overlay streams (panels, B-roll) 2 frames early, and give them extra tail frames so they never run out at the handover.
    - Anything that starts at 0:00 must be on from frame 0.
    - A layout change next to a camera cut must use the **same** boundary as the cut.

## 9b. Footage that is already cut

If the raw video is already vertical and cut between cameras (like `mock_pod_seahawks`):
- Keep the camera cuts.
- Detect them with ffmpeg's scene filter (`select='gt(scene,0.3)'`).
- Track the face for each shot and re-crop to rule-book framing (crop 1400×2489 from 4K for close-ups, 1400×1244 for the split-screen top half).
- `episodes/mock_pod_seahawks/build.py` is the template for this layout: hook split screen, panels, cutaway, stickers and sound cues.
- Crop article and stat screenshots to the relevant region **before** fitting them into the panel, so the text stays readable on a phone.
- Captions in split mode sit just above the split line (MarginV 965), never on top of the panel.

## 10. Delivery

- Commit the master MP4, `.srt`, stickers, sounds, and scripts under `podcast-edit/`, and put the source uploads under `podcast-edit/assets/<episode>/`. Replace the previous version's MP4 rather than keeping every render.
- Send the preview (CRF 25, under 30 MB) in chat. Then list what was added with reel timestamps, plus anything still unsure.

---

## 11. Inspiration layer (We The Hobby reels, `assets/inspo/`)

These rules sit **on top of** sections 2–10. Captions stay exactly as in section 4: Barlow ExtraBold, ALL CAPS, the spoken word in `#31C6E8`. Do **not** copy their yellow italic captions.

- **Split-screen B-roll mode:** use it for anything the viewer must *read or inspect*: articles, sold listings, stat tables, and card close-ups.
  - Speaker crop in the **top half** (1080×960, face centred about 55% down that half).
  - Asset fills the **bottom half** (1080×960, cover-fit on a dark or blurred backdrop).
  - **Captions move to the split line** (about 50% down the frame) while split mode is on.
  - Hold for the length of the point, usually 2–5 s.
  - Quick name or logo mentions still use the bounce-in stickers (section 5).
- **Hook title card:** runs for the first 3–5 s.
  - White rounded box, two lines, centred at about 45% height.
  - Key words coloured: **cyan `#31C6E8`** for the main term, **green `#2BD34B`** for money or gains, **red `#E8312E`** for losses or shock. One relevant emoji is allowed.
  - A **hero image** sits directly below the box, as a thumbnail-style composite (for example, the two players side by side, or the card on a fire background).
- **Annotations on cards and listings:**
  - A red (`#E8312E`) circle, box or arrow draws on over about 0.3 s around the key detail (sale price, date, card label, serial number).
  - **Stamped numbers** (a big condensed red or green figure with a black outline, for example "-$39K" or "+58") slam in with an impact sound.
- **Slow zoom on stills:** every still image in split or full-screen mode slowly zooms in, 100% → 108% over its hold.
- **Scrolling screenshots:** long lists (price comps, game logs) scroll upward slowly in the bottom half.
- **Full-screen cutaways:** 1–2 s of user-supplied game footage or a reaction clip to land a joke or a hype line. Captions stay on.
- **Pace:** a new visual (host cut, B-roll, card, annotation) every 1–3 s. No dead stretches over about 4 s with nothing changing.

## Tool reference (`podcast-edit/tools/`)

| Script | Purpose |
|---|---|
| `setup.sh` | One-time environment setup: Python 3.11 venv, models, fonts |
| `asr.py` | Parakeet transcription with word timestamps → `words.json` |
| `track.py` / `spk.py` | Face-mesh tracking → speaker timeline |
| `build_v2.py` | Pause trimming, pieces list, karaoke ASS and SRT captions |
| `cut1.py` | Background removal, one image per run |
| `stickerize.py` | White-border sticker or card finishing |
| `sfx.py`, `sfx2.py` | Sound-effect synthesis |
| `render_v5.py` | Final render: framing, zooms, grey-out, stickers, cards, shake, vignette, captions, sound mix |

The times, positions, and asset lists inside `build_v2.py` and `render_v5.py` are **IMG_0222-specific**. For a new episode, copy them and replace these:
- the `START`/`END` and silence list
- the `st` sticker list
- `articles.json`
- the `cues` list
- the zoom, grey, shake, and vignette windows
- the hook banner text

Keep every style constant above unchanged.

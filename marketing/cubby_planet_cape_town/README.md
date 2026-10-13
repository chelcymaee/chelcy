# Cubby — "Planet Cape Town" reel

A nature-documentary parody (81 s, 1080×1920) about the rare Cape Town "Suitcase Dragger".

- **Voice:** Kokoro `bm_george`, a synthetic upper-class British narrator, generated locally through sherpa-onnx. It isn't modelled on any real person.
  - Spelling fixes in `voiceover/script_tts.json`: "Kubbie" so it's pronounced *Cubby*, "Boo-Kaap", "Ford... Raptor", "Southeaster".
- **Captions** follow the house style (Barlow Condensed ExtraBold, `#31C6E8` highlight).
- **Music bed and SFX** are made in-house (`podcast-edit/tools/sfx*.py`).
- **Logo:** `cubby_logo_transparent.png`, redrawn as a clean transparent PNG from the Instagram avatar.
- **Claims** follow the site's own terms. It says "trusted local spot" and shows the app's own "ID-verified host" screens. It makes no insurance claim.
- **Rebuild:** `python build.py` (needs the source clips from the `cubby-broll-1` draft release in `src/`).

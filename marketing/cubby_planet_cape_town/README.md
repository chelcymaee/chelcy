# Cubby — "Planet Cape Town" reel

A nature-documentary parody (81 s, 1080×1920) about the rare Cape Town "Suitcase Dragger".

- **Voice:** Kokoro v1.0 `bm_lewis` (speed 1.22, phrase-by-phrase with comic beats, warmth EQ, de-ess and light room ambience), a synthetic British narrator generated locally through sherpa-onnx. It isn't modelled on any real person. Samples of the other British voices are in `voiceover/`.
  - Spelling fixes in `voiceover/script_tts.json`: "Kubbie" so it's pronounced *Cubby*, "Boo-Kaap", "Ford... Raptor", "Southeaster".
- **Captions** follow the house style (Barlow Condensed ExtraBold), with a **yellow `#FFD60A` highlight** for Cubby.
- **Music bed and SFX** are made in-house (`podcast-edit/tools/sfx*.py`).
- **Logo:** `cubby_logo_transparent.png`, redrawn as a clean transparent PNG from the Instagram avatar.
- **Claims** follow the site's own terms. It says "trusted local spot" and shows the app's own "ID-verified host" screens. It makes no insurance claim.
- **Rebuild:** `python build6.py` (word-anchored timeline) (needs the source clips from the `cubby-broll-1` draft release in `src/`).
- **Script** is gender-neutral ("our specimen", "they"), because the clips feature different people.
- **Captions** use the script's exact words, timed to the voice by aligning against speech-to-text, so a misheard word never reaches the screen.

# Mountain Oasis: self check-in guide v2 (new footage)

2:03 vertical (1080×1920) guest guide in the same style as the tester (`../mountain_oasis_checkin/`), rebuilt with the higher-quality clips in the `airbnb-checkin-1` release (IMG_1186–1227, plus sunsets IMG_5890–7988).

## Running order
1. **Sunset opening** (slowed down): the title over the deck-to-pool sunset, then the 4-step card over the golden living room.
2. **Park out front:** the street, then the blue parking sign. The two options (elevator or stairs) are introduced here: "first, grab your keys".
3. **Grab your keys:** the big gate with a ring on the top lockbox, then the tester lockbox clip: enter the code, press both sides (arrows), keys out. Then the remote (red ring) and the green key for the elevator gate.
4. **Option A, the elevator:** the small gate up the stone steps beside the big gate, the welcome sign, and rings on the yellow and green buttons.
   **Option B, the stairs:** the big gate and driveway, then a speed ramp that slows at each real sign. Each sign's card pops up beside it, never on top of it: Follow the stairs, Leg day?, Take a moment, Halfway there, You made it.
5. **Settle in:**
   - The front-door clip: you hold up the keys, then the silver key goes into the lock (white ring follows the key).
   - Firewood in the front entrance (2 bags included, R100 per extra bag).
   - Wi-Fi in the welcome book.
   - The pillow in front of the glass door because of the wind.
   - Left balcony lights (living-room switch).
   - Fireplace supplies in the buckets.
   - Right balcony lights (master-bedroom switch).
   - The **15-minute motion sensor** that switches the balcony lights off automatically.
   - Hairdryer and iron in the main bedroom cupboards.
6. **Ending** (slowed down): the bedroom, the pool and sunsets, then "enjoy your stay at Mountain Oasis".

## Stabilisation and highlight rings
- Every clip is stabilised with a two-pass vidstab: motion analysis in `stab.sh`, then the transform in `stab2.sh` with heavy smoothing (70) and auto-zoom to hide edges.
- No zoompan drift on clips. Zoompan moves in whole-pixel steps, which added its own jitter.
- The sped-up parts of the stairs walk blend frames (`tmix`) so footsteps glide instead of jolting.
- `shake.py` measures frame-to-frame jitter. The stairs dropped from about 17 px to about 9.5 px; every other section is about 1–2 px.
- Highlight rings are drawn by `track_rings.py`. It follows each feature frame by frame with template matching, forwards and backwards from an anchor frame (`ring_anchors.json`). The thin silver door key uses hand-placed keyframes instead.

## Files
- `mountain_oasis_checkin_v2.mp4`: the full video. `mountain_oasis_checkin_v2_preview.mp4`: a smaller copy for WhatsApp and Airbnb messages.
- `voiceover/`: the script (`elevenlabs_script.txt`) and the placeholder voice (Kokoro af_heart) with line timings.
- `build.py`, `gfx.py`, `signs.py`, `ramp.json`: the edit (uses the tester's `../mountain_oasis_checkin/` graphics style).

To swap in an ElevenLabs voice, record `voiceover/elevenlabs_script.txt` and upload it. It gets transcribed and every visual re-anchors to the new timing.

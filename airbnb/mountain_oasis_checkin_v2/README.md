# Mountain Oasis: self check-in guide v2 (new footage)

1:53 vertical (1080×1920) guest guide in the same style as the tester (`../mountain_oasis_checkin/`), rebuilt with the higher-quality clips in the `airbnb-checkin-1` release (IMG_1186–1227, plus sunsets IMG_5890–7988).

## Running order
1. **Sunset opening:** "Mountain Oasis · self check-in guide" over the deck-to-pool sunset, then the 4-step card over the golden living room.
2. **Park out front:** the street, then the blue parking sign with a P icon.
3. **Grab your keys:** walk to the gate, a freeze with a ring on the top lockbox, "enter your code", "press both sides together", keys out. Then the remote (red ring on the button, "red button = main gate") and the green key in the lift gate.
4. **Find your unit:** A/B card over a sunset. The lift: the welcome sign pops up, then rings on the yellow and green buttons. The stairs: a speed ramp that slows at each real sign while its card pops up (Follow the stairs, Leg day? Consider it done, Take a moment, Halfway there, You made it), ending at the front door.
5. **Settle in (house walkthrough):**
   - The key in the front door.
   - Firewood in the front entrance, for the hot tub and fireplace (2 bags included, R100 per extra bag).
   - The clothing rack under the entrance table.
   - Wi-Fi in the welcome book on the dining table.
   - The pillow in front of the glass door because of the wind.
   - Left balcony lights (living-room switch).
   - Fireplace supplies in the buckets.
   - Right balcony lights (master-bedroom switch).
   - Hairdryer and iron in the main bedroom cupboards.
6. **Ending:** the balcony, the master bedroom and the pool, then sunsets and "enjoy your stay at Mountain Oasis".

## Files
- `mountain_oasis_checkin_v2.mp4`: the full video. `mountain_oasis_checkin_v2_preview.mp4`: a smaller copy for WhatsApp and Airbnb messages.
- `voiceover/`: the script (`elevenlabs_script.txt`) and the placeholder voice (Kokoro af_heart) with line timings.
- `build.py`, `gfx.py`, `signs.py`, `ramp.json`: the edit (uses the tester's `../mountain_oasis_checkin/` graphics style).

To swap in an ElevenLabs voice, record `voiceover/elevenlabs_script.txt` and upload it. It gets transcribed and every visual re-anchors to the new timing.

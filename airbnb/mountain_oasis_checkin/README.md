# Mountain Oasis: self check-in guide video

A 62 s vertical (1080×1920) walkthrough for guests, voiced from the host's script. It is a separate project from Cubby and uses only the clips in the `airbnb-checkin-1` release.

## Files
- `mountain_oasis_checkin.mp4`: final video. `mountain_oasis_checkin_preview.mp4`: a smaller copy for sharing (WhatsApp, Airbnb messages).
- `voiceover/`: the script (`script.json`, `elevenlabs_script.txt`), the placeholder voice (`vo_raw.wav`, Kokoro "af_heart") and its line timings.
- `graphics/signs/`: recreated pop-up cards of the property signs.
- `build.py`, `gfx.py`, `signs.py`, `ramp.json`: the edit.

## What's in it
- Title card ("Mountain Oasis · self check-in guide") with sparkles, then a 4-step overview card that builds step by step.
- Step badges (1 park out front, 2 grab your keys, 3 find your unit, 4 settle in) and subtitles for every line.
- Parking shot shown as a rounded card, with a "P" icon and "look for the blue signs".
- Freeze-frame on the gate with a pulsing ring on the top lockbox, then "enter your code" and arrows for "press both sides together", plus a lock click.
- A/B option cards (the lift / the stairs). The lift: the welcome sign pops up, then a slow zoom on the call panel with yellow and green rings and labels.
- The stairs: a speed ramp that slows down at each real sign while its card pops up (Follow the stairs, Take a moment, Halfway there, Where are you heading?, You made it).
- Inside: Wi-Fi icon and "Wi-Fi details: in the welcome book", a cosy ending and an "enjoy your stay" end card with a heart.
- Soft crossfades, a gentle film grade, cosy music ducked under the voice.

## Swapping in an ElevenLabs voice
Record `voiceover/elevenlabs_script.txt` and upload the file. It gets transcribed and every visual re-anchors to the new timing (`VO=... TIM=... python build.py`).

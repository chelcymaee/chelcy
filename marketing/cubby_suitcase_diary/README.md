# Cubby: "A day in the life of a Cape Town suitcase"

A text-only trend reel (no voiceover), 35 s, 1080×1920, cut on a 105 BPM bar grid.
The suitcase narrates its day, from checkout at 10:00 to being stored with Cubby at 17:15.

## Files
- `suitcase_diary.mp4`: final, with the original beat and sound effects.
- `suitcase_diary_no_music.mp4`: sound effects only. Use it when adding a trending sound in Instagram or TikTok (trending sounds can't be baked into an exported file).
- `suitcase_diary_preview.mp4`: a smaller copy for quick sharing.
- `build.py`: the edit (clip list, captions, timings). `music.py`: the beat synth (original, royalty-free).

## Beats (one bar = 2.29 s)
| Time | Clip | Caption |
|---|---|---|
| hook | IMG_9928 (suitcase on head) | a day in the life of a cape town suitcase + "spoiler: at some point i become a hat" |
| 10:00 | IMG_9930 | my human checked out. our flight is at 21:00. |
| 10:30 | 127a72f5 (prom) | the prom. apparently i'm the rescue dog now. |
| 11:15 | IMG_0691 | "quick" lion's head hike. i have wheels, not legs. |
| 12:30 | IMG_9273 | wine farm. "just a quick tasting." |
| 15:45 | IMG_9274 | it was not quick. (record scratch) |
| 16:00 | IMG_9926 | bo-kaap cobblestones. my wheels are filing a complaint. |
| 16:20 | IMG_9927.2 | i've done more steps than you this year. |
| 16:40 | café-window clip (slow-mo, 2 bars) | spotted my cousins through a café window. / they're not okay. |
| 17:00 | IMG_9934 (flyer) | then my human found this. |
| 17:01 | app screen recording in a phone, on red | cubby: a trusted local spot to store me. tap, book, done. |
| 17:15 | IMG_9941 (blue door) | dropped at a local guest house. finally, some peace. + SECURE stamp |
| 17:16 | IMG_9943 | my human: hands-free. first time all day. |
| end | end card | 10/10 day. would get stored again. / Download. Store. Explore. |

## Rebuild
Needs the source clips from the `cubby-broll-1` draft release in `../src/`, the café clip at `../new/clip.mp4`
(sent in chat on 19 Oct, not yet in the release), graphics from the Planet Cape Town reel (`../g/`), Inter 700/800
(`@fontsource/inter`) and the shared SFX. Then run `python build.py`.

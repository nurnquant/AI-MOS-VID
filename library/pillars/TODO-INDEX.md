# Social Pillars — Master Index

Generated from `manifest.json` by `scripts/social/pillar_status.py`.
Plan detail: `library/social-package-v4.md`

## Folder layout

```
library/pillars/
  manifest.json          <- single source of truth, edit status here
  TODO-INDEX.md          <- this file (generated)
  <n>-<slug>/
    TODO.md              <- per-pillar checklist (generated)
    captions.md          <- FB/IG post descriptions
    masters/             <- 1:1 @ 4k originals, one per post
    exports/             <- reframed per platform (free to regenerate)
```

## Aspect ratio workflow

Masters are square 4K so every platform ratio is a **crop, never an upscale**.

```bash
# every platform preset at once
python3 scripts/social/reframe.py masters/1.5-wudu-together-master.png \
    --all --outdir exports/ --logo

# a single platform, crop biased upward to keep faces in frame
python3 scripts/social/reframe.py masters/1.5-wudu-together-master.png \
    --preset fb_landscape --focus upper --outdir exports/

# any custom ratio
python3 scripts/social/reframe.py master.png --ratio 21:9 --size 2560x1097
```

| Preset         | Ratio | Pixels    | Use                               |
| -------------- | ----- | --------- | --------------------------------- |
| `ig_feed`      | 4:5   | 1080×1350 | Instagram feed, Facebook portrait |
| `fb_landscape` | 16:9  | 1920×1080 | Facebook landscape, YouTube       |
| `reel`         | 9:16  | 1080×1920 | Reels, Stories, TikTok, Shorts    |
| `pinterest`    | 2:3   | 1000×1500 | Pinterest pins                    |
| `square`       | 1:1   | 1080×1080 | Square feed, profile grid         |

## Progress

| #   | Pillar                                                        | Day       | Posts  | Todo  | In progress | Published | Blocked |
| --- | ------------------------------------------------------------- | --------- | ------ | ----- | ----------- | --------- | ------- |
| 1   | [Islamic Moments at Home](1-islamic-moments-at-home/TODO.md)  | Monday    | 7      | 0     | 3           | 4         | 0       |
| 2   | [Quran Journey](2-quran-journey/TODO.md)                      | Tuesday   | 7      | 0     | 7           | 0         | 0       |
| 3   | [Teacher Spotlight](3-teacher-spotlight/TODO.md)              | Wednesday | 7      | 0     | 0           | 0         | 7       |
| 4   | [Daily Duas for Kids](4-daily-duas-for-kids/TODO.md)          | Thursday  | 7      | 0     | 7           | 0         | 0       |
| 5   | [Little Muslim, Big Heart](5-little-muslim-big-heart/TODO.md) | Friday    | 7      | 0     | 7           | 0         | 0       |
| 6   | [Community Engagement](6-community-engagement/TODO.md)        | Saturday  | 7      | 0     | 6           | 0         | 1       |
| 7   | [Free Trial Campaign](7-free-trial-campaign/TODO.md)          | Sunday    | 7      | 0     | 6           | 0         | 1       |
|     | **Total**                                                     |           | **49** | **0** | **36**      | **4**     | **9**   |

**Masters to generate: 0 × 4cr = 0 credits (~$0.00)**

Exports, composition, carousels and Pinterest variants are local — free.

## Blocked — needs client input

- **3.1 Meet Our Faculty** (Teacher Spotlight) — Real teacher photos + names + departments + consent
- **3.2 A Day in the Life of a Teacher** (Teacher Spotlight) — Real teacher photos + consent
- **3.3 Why We Teach** (Teacher Spotlight) — Real teacher photo + quote + consent
- **3.4 Student Success Stories** (Teacher Spotlight) — Student/parent testimonial + written consent. Text-only quote card is the safe default.
- **3.5 Learning from Al-Azhar Graduates** (Teacher Spotlight) — Real teacher photo + credential line + consent
- **3.6 More Than a Teacher** (Teacher Spotlight) — Real teacher photo + anecdote + consent
- **3.7 Thank You, Teachers** (Teacher Spotlight) — Faculty photo strip + consent
- **6.6 Student Milestone Wall** (Community Engagement) — Parent permission per child. First names and state only; no photos without written consent.
- **7.2 Meet Your Teacher Before You Commit** (Free Trial Campaign) — Real teacher photo (see pillar 3 dependencies)

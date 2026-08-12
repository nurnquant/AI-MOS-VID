# Review — Social Media Package V3

Reviewed 2026-08-10 against existing produced inventory and the Brand Identity System v1.0.

---

## Verdict

**It is a taxonomy, not a content package.** The structure is sound and worth
keeping. The 35 "posts" contain almost no post content.

Across all 35 entries, five of six fields are byte-identical boilerplate:

| Field                  | Unique values across 35 posts           |
| ---------------------- | --------------------------------------- |
| Post title             | 35                                      |
| Long Caption Framework | 1 (`Hook → Islamic lesson → … → CTA`)   |
| Image Prompt           | 1 (generic style line, no scene)        |
| Google Flow Prompt     | 1 template, only the title interpolated |
| Instagram Carousel     | 1 (Hook / Teaching / Example / CTA)     |
| Hashtags               | 1 set of 4, repeated 35×                |

So the document delivers **35 titles plus a schedule**. Every caption, scene,
and hook still has to be written. That is fine — but plan the work as
"write 30 posts", not "produce a package that already exists".

**Keep as-is:** 5-pillar structure, weekday cadence, KPI list, content funnel,
CTA library. That skeleton is genuinely useful.

---

## Blocking problems

**1. Two of seven weekly slots have zero content.**
The schedule assigns Saturday to _Community Engagement_ and Sunday to
_Free Trial Campaign_. Neither pillar exists in the document. That is 2/7 of
every week — roughly 26 of the 90 days — undefined.

**2. The Teacher pillar cannot be AI-produced.**
Brand Identity System v1.0 states: _"Always use the teacher's real photo.
Never generate AI faces."_ All 7 Teacher posts (Meet Our Faculty, A Day in the
Life, Why We Teach, Student Success Stories, Learning from Al-Azhar Graduates,
More Than a Teacher, Thank You Teachers) need real photos, real names, real
departments. **Needs client assets before any of it can be built.**

**3. Testimonials / Student Success Stories need real, consented sources.**
Monthly target asks for 4 testimonials. These must come from actual students
or parents with permission on file — they cannot be written or illustrated
speculatively without misrepresenting the academy. Treat as a client-input
dependency, not a production task.

**4. The numbers do not reconcile.**

- "90-Day Schedule" + 7 posts/week = ~90 posts needed. 35 supplied = ~5 weeks.
- Monthly targets sum to 50 assets/month (20 images + 10 reels + 8 stories +
  4 testimonials + 4 teacher + 4 campaigns) but the daily schedule implies 30.
- Pick one: **30/month from the daily cadence**, with reels and stories drawn
  from the same concepts rather than counted separately.

**5. One canvas, four aspect ratios required.**
Brand system defines only 1080×1350 (4:5), yet every post specifies a Story
version, a Reel, and a Pinterest pin. Needs an explicit matrix (below).

---

## Smaller fixes

- **~5 duplicate topic pairs.** "Sharing Toys" ≈ "Share Your Toys";
  "Helping Parents" ≈ "Help Your Parents"; "Morning Salam" ≈ "Smile and Say
  Salam"; "Bedtime Dua" ≈ "Before Sleeping"; "Bismillah Before Breakfast" ≈
  "Before Eating". 35 titles is really ~30 unique topics.
- **Identical hashtags on all 35 posts** hurts reach and reads as automated.
  Produced work already uses 7 varied tags per post (topic + niche + brand) —
  keep that pattern.
- **"Swipe-up CTA" is obsolete.** Instagram replaced swipe-up with link
  stickers in 2021. Update the Story spec.
- **Pillar names inconsistent** between schedule and section headers
  ("Teacher Spotlight" vs "Meet Our Teachers"; "Daily Dua" vs "Daily Duas for
  Kids"). Pick one label per pillar so the tracker can key on it.
- **Line 1676 artifact:** `` `text id="riwaqv3" Riwaq Al Ilm` `` — leftover
  generator markup, delete.
- **Audience is "Muslim families in the USA"** but nothing in the document
  localises for it (school calendar, Ramadan/Eid timing, US time zones for
  posting). Worth one section.

---

## Recommended aspect-ratio matrix

Replace the single-canvas rule with:

| Destination                              | Ratio | Pixels      |
| ---------------------------------------- | ----- | ----------- |
| Instagram feed, Facebook feed (portrait) | 4:5   | 1080 × 1350 |
| Facebook feed (landscape), YouTube       | 16:9  | 1920 × 1080 |
| Reels, Stories, TikTok, Shorts           | 9:16  | 1080 × 1920 |
| Pinterest pin                            | 2:3   | 1000 × 1500 |

Produce the photo once, compose per ratio locally — recomposition costs nothing.

---

## What already exists (do not rebuild)

Produced this cycle and sitting in `renders/`:

- **29 image posts** — FB series 01/02/03 (6 each, 16:9), Islamic Moments at
  Home (10, 4:5), Legacy Post (4:5). Series 01/02 also archived at 4:5;
  series 01 additionally exported to `instaPost/`.
- **1 Instagram carousel** — 8 slides, series 01.
- **6 original videos** (9:16, watermarked where requested) — Dream of Every
  Parent, Little Girl Reciting Dua, Dua Before Learning (Johra v2), Allah Is
  Sufficient (Johra), The Most Beautiful Sound, Rabbi Irhamhuma.
- **3 supplied animations** watermarked + captioned — Children Learning
  Arabic, Wake Up and Thank Allah, Bismillah Before We Eat.
- **Captions with hashtags** written for every one of the above.

**This already covers ~1.5 months of the 20-images/month target and ~1 month
of the 10-reels/month target.** The V3 Islamic Moments pillar overlaps four
existing posts (Bismillah Before Breakfast, Bedtime Dua, Family Quran Time,
Friday Preparation). The immediate bottleneck is **scheduling and publishing**,
not production.

---

## Cost reality (for planning)

Balance at review: **1,258 credits** (Ultra, ≈ $0.033/credit).

| Asset                                     | Credits  | USD      |
| ----------------------------------------- | -------- | -------- |
| Image post (1 background + local compose) | 2        | ~$0.07   |
| Short reel (2 stills + 2 clips)           | 48       | ~$1.58   |
| Full reel (7 stills + 7 clips)            | 168      | ~$5.54   |
| **Month at 20 images + 10 short reels**   | **~520** | **~$17** |

Current balance funds roughly **2.5 months** at that rate. Re-composition,
watermarking, carousels, and format variants are local — zero credits.

---

# TODO LISTS

## A. Fix the document — ✅ DONE 2026-08-10 → `riwaq_social_media_package_v4.md`

- [x] A1. Two missing pillars written — **Community Engagement** (6 buildable +
      1 consent-gated) and **Free Trial Campaign** (6 buildable + 1 photo-gated)
- [x] A2. Duplicates resolved by owner pillar: akhlaq topics → Little Muslim Big
      Heart; dua-text topics → Daily Duas; home-scene topics → Islamic Moments.
      3 vacated Islamic Moments slots refilled (Wudu Together, When the Adhan
      Plays, The Quran Shelf). **49 unique concepts**, no overlaps.
- [x] A3. Maths reconciled — 30 posts/month, 49 concepts ≈ 7 weeks first-run,
      90-day plan = 49 first-run + format re-cuts. New monthly output table.
- [x] A4. Four-ratio matrix replaces the single canvas
- [x] A5. Real hook line written for all 49 posts
- [x] A6. Real scene prompt (subject, setting, light, composition, "NO text")
      for every buildable post; layout spec instead for photo-dependent cards
- [x] A7. Unique 7-hashtag set per post — no repeated sets
- [x] A8. Story spec corrected to link sticker
- [x] A9. Pillar names normalised and marked canonical for the tracker;
      line-1676 artifact dropped
- [x] A10. US Localisation section added — school year, Ramadan/Eid build-back,
      Jumu'ah timing, Eastern posting windows, language and framing rules

**Also done beyond the original A list:**

- Boilerplate removed structurally — caption framework, carousel, Story,
  Pinterest, watermark, Arabic-rendering and video-verification rules now live
  once in **Production Specs** instead of 35 repetitions
- Already-produced posts marked ✅ with their file paths so they are not rebuilt
- Blocked posts marked ⛔ / ⚠️ with the exact missing asset
- Appendix status table: **33 buildable now (~66cr ≈ $2.20)**, 7 produced,
  9 blocked

## B. Client inputs needed (blocked until supplied)

- [ ] B1. Real teacher photos — one per featured teacher, usable resolution
- [ ] B2. Teacher bios — name, department, university, specialisation
- [ ] B3. Consent confirmation for teacher photo use in paid/organic social
- [ ] B4. Real student/parent testimonials + written permission
- [ ] B5. Decide whether testimonials appear as text-card quotes (safe, no
      likeness) or with photos (needs consent per person)

## C. Map existing inventory to the schedule (no credits)

- [ ] C1. Build a single publishing calendar: date, pillar, asset path,
      caption path, platform(s), status
- [ ] C2. Mark the 4 V3 Islamic Moments topics already produced — remove from
      the build queue
- [ ] C3. Record what is already posted (captions currently carry ad-hoc
      "posted on FB" notes — move that state into the calendar)
- [ ] C4. Decide the canonical home for the calendar: new sheet in
      `costTracker/social-media-tracker.xlsx`, or its own markdown file

## D. Format gaps on existing assets (no credits, local compose)

- [ ] D1. Series 02 and 03 → 4:5 `instaPost/` exports (series 01 already done)
- [ ] D2. Islamic Moments (10) → 16:9 variants for Facebook feed
- [ ] D3. Pinterest 2:3 exports for the strongest 10 image posts
- [ ] D4. Story (9:16) versions of the top image posts
- [ ] D5. Carousels for series 02 and 03, matching the series 01 pattern

## E. New production (credits — batch these)

- [ ] E1. Community Engagement pillar — 7 image posts (~14cr)
- [ ] E2. Free Trial Campaign pillar — 7 image posts (~14cr)
- [ ] E3. Quran Journey pillar — 7 image posts (~14cr)
- [ ] E4. Daily Duas for Kids — 7 image posts (~14cr)
- [ ] E5. Little Muslim, Big Heart — 7 image posts (~14cr)
- [ ] E6. 3–4 new reels from the strongest unused story briefs (~150–200cr)
- [ ] E7. Teacher pillar cards — **after B1–B3**, real photos only, local
      compose (0cr)

## F. Measurement (no credits)

- [ ] F1. Turn the KPI list into a tracked sheet: reach, engagement rate,
      saves, shares, profile visits, trial bookings, conversion
- [ ] F2. Add a per-post results row so hooks can be compared over time
- [ ] F3. Set a review cadence (monthly) to retire weak pillars and expand
      what converts

---

## Suggested order

1. **C** — know what you already have (free, prevents duplicate spend)
2. **A** — fix the document so it is buildable (free)
3. **D** — squeeze more platforms out of existing assets (free)
4. **B** — request client assets in parallel; longest lead time
5. **E** — batch new production once A is done
6. **F** — stand up measurement before volume ramps

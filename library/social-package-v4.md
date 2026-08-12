# Riwaq Al Ilm — Social Media Package V4

Supersedes V3. V3 kept for reference; its 35 entries carried only titles —
every caption, scene, and hashtag set is now written out.

**Changes from V3**

- Two empty weekday slots filled: **Community Engagement**, **Free Trial Campaign**
- Cross-pillar duplicate topics resolved by assigning each topic one owner pillar
- Per-post **hook**, **scene prompt**, and **7 unique hashtags** written
- Repeated boilerplate (caption framework, carousel, story, Pinterest) moved
  into **Production Specs** once instead of 35 times
- Single canvas replaced with a four-ratio matrix
- Story spec corrected: link sticker, not swipe-up
- Monthly targets reconciled to the actual weekly cadence
- US-audience localisation section added
- Already-produced posts marked ✅ so they are not rebuilt

---

## 1. Brand System

- **Palette:** emerald `#0F5132` / `#0E3B2E`, gold `#D4AF37` / `#DEB876`,
  cream `#F5EFDC`
- **Audience:** Muslim families in the USA, parents aged 28–45
- **Primary CTA:** book a free trial class → `riwaqalilm.com/free-trial`
- **Platforms:** Facebook, Instagram, Pinterest, TikTok, YouTube Shorts
- **Voice:** warm, scholarly, spiritual, professional. No clickbait, no
  aggressive marketing, no emoji storms.

### Aspect-ratio matrix

| Destination                              | Ratio | Pixels      |
| ---------------------------------------- | ----- | ----------- |
| Instagram feed, Facebook feed (portrait) | 4:5   | 1080 × 1350 |
| Facebook feed (landscape), YouTube       | 16:9  | 1920 × 1080 |
| Reels, Stories, TikTok, Shorts           | 9:16  | 1080 × 1920 |
| Pinterest pin                            | 2:3   | 1000 × 1500 |

Generate the photograph **once**, then compose per ratio locally.
Recomposition costs no credits.

---

## 2. Production Specs (apply to every post — do not repeat per post)

**Caption structure**

1. Hook — the line from the post entry, first sentence of the caption
2. Islamic grounding — one or two sentences, verse or hadith meaning where relevant
3. Family application — what a parent can actually do tonight
4. Engagement question — prefixed 👇
5. CTA — from the CTA library, plus link on conversion posts

**On-image text:** rendered locally (Pillow), never AI-generated. Hook or quote
only, ≤35% coverage. Cream for setup lines, gold for the emphasis line.

**Arabic on images:** `arabic_reshaper` + `python-bidi`, GeezaPro 70px+,
**harakat stripped** (the host has no Pillow raqm; diacritics misplace).
Full harakat is fine in caption text fields.

**Watermark:** "Riwaq al Ilm", gold Georgia Bold Italic, ~55% opacity with
shadow. Images: small, bottom-left. Videos: position rotates per scene, never
over faces, subtitles, or the end card.

**Logo:** official circle logo only, never distorted or cropped.
End cards always rendered locally.

**Carousel pattern (4 slides):** hook → teaching → practical example → CTA.
Cover uses the emerald brand card; final slide is the CTA card.

**Story pattern:** one sentence, one sticker (poll / question / quiz),
**link sticker** to the free-trial page. _(Swipe-up was retired in 2021.)_

**Pinterest pattern:** 2:3 vertical, quote-led, larger type than feed posts,
keyword-rich pin description — Pinterest is a search surface, not a feed.

**Video rules:** whisper-verify every dialogue and recitation clip before
assembly. Pin dialogue language explicitly. In two-speaker scenes, pin strict
speaking order and lip state. Recitation text must be quoted exactly in the
prompt, and the user ear-checks it before publishing.

---

## 3. Weekly Cadence

| Day       | Pillar                   | Funnel stage |
| --------- | ------------------------ | ------------ |
| Monday    | Islamic Moments at Home  | Awareness    |
| Tuesday   | Quran Journey            | Education    |
| Wednesday | Teacher Spotlight        | Authority    |
| Thursday  | Daily Duas for Kids      | Education    |
| Friday    | Little Muslim, Big Heart | Awareness    |
| Saturday  | Community Engagement     | Trust        |
| Sunday    | Free Trial Campaign      | Conversion   |

Pillar names above are canonical — use these exact strings in the tracker.

### Volume, reconciled

7 pillars × 7 posts = **49 unique post concepts**.

- **30 posts/month** at the daily cadence (~4 weeks × 7, plus buffer days)
- 49 concepts = **~7 weeks** of first-run content
- A 90-day plan therefore needs **~90 slots**: 49 first-run + re-cuts of the
  strongest performers in new formats (Reel from an image post, carousel from a
  pillar, Pinterest pin from a quote) — not 90 net-new concepts

**Monthly output target (replaces V3's unreconciled list):**

| Output           | Per month | Source                   |
| ---------------- | --------- | ------------------------ |
| Feed image posts | 20        | new + format variants    |
| Reels            | 6         | new video or re-cut      |
| Stories          | 8         | derived from feed posts  |
| Carousels        | 2         | derived from a pillar    |
| Pinterest pins   | 10        | derived from image posts |
| Teacher features | 2         | **requires real photos** |
| Testimonials     | 2         | **requires consent**     |

Derived formats cost no credits. New production is the only spend.

---

## 4. US Localisation

- **School year:** ramp "back to routine" content late August–early September;
  ramp "summer Quran goals" late May.
- **Ramadan / Eid:** build the calendar backwards from the moon sighting —
  countdown content 3 weeks out, daily Ramadan series, Eid greeting assets
  prepared a week early.
- **Jumu'ah:** Friday posts land Thursday evening or early Friday so families
  see them before the khutbah.
- **Posting windows (Eastern):** 7:00–9:00 (school run), 12:00–13:00 (lunch),
  20:30–22:00 (after kids sleep — strongest for parent-facing emotional posts).
  Stagger for Central/Mountain/Pacific where the platform allows.
- **Language:** English-first. Arabic appears only as dua/verse text with
  transliteration and translation — never as an untranslated headline.
- **Comparisons:** frame against US realities (weekend Islamic school
  logistics, screen time, public-school schedules), not overseas norms.

---

## 5. Universal CTA Library

- 🌿 Begin your child's learning path today.
- 📖 Book your free trial class.
- ❤️ Help your child connect with the Quran.
- 🕌 Learn with qualified Al-Azhar teachers.
- ✨ Start your journey with Riwaq Al Ilm.
- 🎁 One free trial class. No card, no commitment.

---

## 6. KPI Dashboard

Reach · Engagement rate · Saves · Shares · Profile visits · Link clicks ·
Trial-class bookings · Booking conversion rate

Log per post so hooks can be compared. Review monthly: retire weak pillars,
expand what converts.

---

# PILLAR 1 — Islamic Moments at Home (Monday)

_Parent-facing. The atmosphere of a Muslim home. Emotional, cinematic._

## 1.1 Bismillah Before Breakfast ✅ produced

**Status:** `renders/islamic-moments/post2-bismillah-dinner.png` (dinner
variant). Reuse; shoot a breakfast version only if a second angle is wanted.

**Hook:** Small habits create great Muslims.

**Scene prompt:** Warm morning kitchen, Muslim family of four at the breakfast
table, father raising a gentle finger to remind the children before the first
bite, steaming food, emerald-and-gold interior, golden window light, shallow
depth of field, photorealistic. NO text anywhere.

**Hashtags:** #Bismillah #SunnahHabits #MuslimFamily #IslamicParenting
#FamilyBreakfast #RaisingMuslims #RiwaqAlIlm

## 1.2 The Last Words Before Sleep ✅ produced

**Status:** `renders/islamic-moments/post1-bedtime-dua.png`

**Hook:** The last words of the day shape the heart that hears them.

**Scene prompt:** Night bedroom, young girl in a beige khimar hugging her
mother before sleep, cool moonlight through the window mixed with warm lamp
glow, open Quran on the bedside table, emerald and cream tones, photorealistic,
tender. NO text anywhere.

**Hashtags:** #BedtimeDua #MuslimParenting #NightRoutine #DuaForKids
#IslamicHome #TenderMoments #RiwaqAlIlm

## 1.3 Family Quran Time ✅ produced

**Status:** `renders/islamic-moments/post4-mother-daughter-quran.png`

**Hook:** A home filled with Quran is a home filled with light.

**Scene prompt:** Mother in cream hijab and young daughter reading one open
Quran together beside a tall window at dusk after Maghrib, last warm light plus
a small glowing lamp, emerald cushions, gold accents, photorealistic, cozy and
spiritual. NO readable text.

**Hashtags:** #QuranTime #FamilyWorship #IslamicHome #MotherAndDaughter
#HomeFilledWithLight #AfterMaghrib #RiwaqAlIlm

## 1.4 Friday Preparation ✅ produced

**Status:** `renders/islamic-moments/post9-friday-preparation.png`

**Hook:** Teach them to love Friday.

**Scene prompt:** Bright Friday morning hallway, mother straightening her son's
crisp white thobe while the father places a kufi on his head, daughter smiling
beside them, emerald wall with subtle geometric pattern, photorealistic,
joyful. NO text anywhere.

**Hashtags:** #Jumuah #JumuahMubarak #FridayFeeling #MuslimFamily
#IslamicTraditions #BlessedFriday #RiwaqAlIlm

## 1.5 Wudu Together — NEW

**Hook:** Before the prayer comes the water — and the lesson.

**Scene prompt:** Warm bathroom or courtyard tap, father crouched beside his
small son showing him how to wash his arms for wudu, water catching the golden
afternoon light, droplets mid-air, emerald towel on the rail, close intimate
framing, photorealistic. Generous soft space in the upper third for text.
NO text anywhere.

**Hashtags:** #Wudu #TeachingSalah #MuslimFathers #LittleMuslims
#IslamicBasics #FirstSteps #RiwaqAlIlm

## 1.6 When the Adhan Plays — NEW

**Hook:** The moment the adhan starts, the whole house changes.

**Scene prompt:** Living room in late afternoon light, a phone on the table
glowing softly as the adhan plays, two children pausing mid-play and looking up,
mother rising in the background, toys still on the rug, emerald-and-gold
interior, photorealistic, hushed reverence. NO readable text on the screen.

**Hashtags:** #Adhan #CallToPrayer #SalahOnTime #MuslimKids
#IslamicParenting #HomeAtmosphere #RiwaqAlIlm

## 1.7 The Quran Shelf — NEW

**Hook:** Where the Quran sits in your home tells your children what matters.

**Scene prompt:** Elegant wooden shelf at child height, ornate Quran resting on
a carved rehal in the centre, small child's hand reaching up toward it, warm
lantern light, emerald wall and gold arabesque detail behind, shallow depth of
field, photorealistic, reverent. NO readable text.

**Hashtags:** #QuranInTheHome #IslamicInteriors #RaisingMuslims
#MuslimHome #RespectForQuran #LittleHands #RiwaqAlIlm

---

# PILLAR 2 — Quran Journey (Tuesday)

_The learning path, from first letter to fluency. Educational, aspirational._

## 2.1 First Letter, First Step

**Hook:** Every hafiz in the world started with one letter: alif.

**Scene prompt:** Young girl at a warm wooden desk tracing a large wooden
Arabic alif block with her fingertip, soft lamp light, emerald wall softly
blurred behind, laptop glowing gently at the side, photorealistic, focused and
hopeful. NO readable words, only abstract letter shapes.

**Hashtags:** #AlifBaTa #ArabicAlphabet #FirstStep #ArabicForKids
#LearnQuran #BeginnersJourney #RiwaqAlIlm

## 2.2 The Beauty of Surah Al-Fatihah

**Related produced asset:** `renders/islamic-moments/post3-father-alfatihah.png`
— reuse the image, this is a different caption angle (meaning, not the moment).

**Hook:** Your child recites it seventeen times a day. Do they know what it means?

**Scene prompt:** Ornate open Quran on a dark wooden rehal, opening page lit by
a single warm shaft of light, golden dust motes in the beam, deep emerald
darkness around it, gold arabesque bokeh, photorealistic, luminous. NO readable
text — page calligraphy softly blurred.

**Hashtags:** #AlFatihah #UnderstandTheQuran #SalahWithMeaning
#QuranTafsir #QuranForKids #SevenVerses #RiwaqAlIlm

## 2.3 One Verse a Day

**Hook:** One ayah a day is more than three hundred and fifty a year.

**Scene prompt:** Warm still life — small brass hourglass with golden sand
beside an open child's Quran on a wooden table, warm lantern glow, a child's
small hand resting on the page, deep emerald background with soft gold bokeh,
photorealistic, calm. NO readable text.

**Hashtags:** #OneAyahADay #ConsistencyInIslam #DailyQuran #SmallSteps
#QuranRoutine #IstiqamahGoals #RiwaqAlIlm

## 2.4 Learning Tajweed

**Hook:** Tajweed is not decoration — it is how the words were meant to sound.

**Scene prompt:** Close-up of a boy in a kufi at a desk with headphones,
mouth mid-articulation, eyes on an open Quran, a teacher visible small and soft
on a laptop screen beside him, warm lamp light, emerald-and-gold study nook,
shallow depth of field, photorealistic. NO readable text on screen.

**Hashtags:** #Tajweed #QuranRecitation #Makhraj #LearnQuranOnline
#QuranTeacher #BeautifulRecitation #RiwaqAlIlm

## 2.5 Quran and Character

**Hook:** A hafiz who forgets kindness — did we succeed?

**Scene prompt:** Young boy in a kufi offering a glass of water with both hands
to his smiling elderly grandfather in an armchair, open Quran resting on the
side table between them, warm golden lamp light, emerald-and-gold living room,
photorealistic, heartwarming. NO text anywhere.

**Hashtags:** #QuranicCharacter #Akhlaq #IslamicManners #MoreThanMemorization
#TarbiyahMatters #AdabFirst #RiwaqAlIlm

## 2.6 Reading Together

**Hook:** Reading alone builds skill. Reading together builds love.

**Scene prompt:** Father and young son sitting close on a floor cushion sharing
one open Quran, the father's finger tracking the line, the boy leaning in,
warm lamp light, emerald-and-gold living room, shallow depth of field,
photorealistic, intimate. NO readable text.

**Hashtags:** #ReadingTogether #FatherAndSon #QuranWithDad #FamilyLearning
#LearnQuran #SharedMoments #RiwaqAlIlm

## 2.7 Celebrate Progress

**Hook:** She finished her first surah. That deserves more than a nod.

**Scene prompt:** Young girl beaming while her parents clap softly behind her,
a small gold-ribboned certificate in her hands, open Quran on the table,
cream and emerald living room with warm gold balloons softly blurred,
photorealistic, joyful celebration. NO readable text on the certificate.

**Hashtags:** #CelebrateProgress #QuranMilestone #FirstSurah #ProudParents
#MuslimKids #KeepGoing #RiwaqAlIlm

---

# PILLAR 3 — Teacher Spotlight (Wednesday)

> ⛔ **BLOCKED — every post in this pillar needs real assets.**
> Brand rule: _always use the teacher's real photo, never generate AI faces._
> Required before any build: teacher photos, names, departments, universities,
> specialisations, and written consent for social use.
> Cards are then composed **locally** (0 credits) — emerald card, gold frame,
> real photo, subtle geometric accents.

## 3.1 Meet Our Faculty

**Hook:** Behind every lesson is a teacher who spent years earning the right to give it.

**Layout:** Faculty grid card — 3–6 real photos, name + department under each,
emerald ground, gold hairline frames.

**Hashtags:** #MeetOurTeachers #AlAzhar #QualifiedTeachers #IslamicScholarship
#OurFaculty #TeacherIntroduction #RiwaqAlIlm

## 3.2 A Day in the Life of a Teacher

**Hook:** Fajr, preparation, and then twelve children in twelve time zones.

**Layout:** Photo-led carousel, 4 slides, real photos only. Timeline captions.

**Hashtags:** #DayInTheLife #OnlineTeaching #QuranTeacher #BehindTheScenes
#TeacherLife #GlobalClassroom #RiwaqAlIlm

## 3.3 Why We Teach

**Hook:** "I teach because someone once taught me — for free."

**Layout:** Quote card — real photo left, pull-quote right, gold rule between.

**Hashtags:** #WhyWeTeach #TeacherStory #PassItOn #SadaqahJariyah
#IslamicEducation #Vocation #RiwaqAlIlm

## 3.4 Student Success Stories

> ⛔ Also requires **student/parent consent**. Text-only quote cards are the
> safe default; photos need per-person permission.

**Hook:** Six months ago he could not read alif. Last week he led the family in prayer.

**Layout:** Testimonial card — quote, first name + age + state only, no photo
unless consent is on file.

**Hashtags:** #StudentSuccess #RealProgress #ParentReview #QuranJourney
#Testimonial #ProudMoment #RiwaqAlIlm

## 3.5 Learning from Al-Azhar Graduates

**Hook:** A thousand years of scholarship, in a one-on-one class with your child.

**Layout:** Authority card — real photo, credential line, Al-Azhar reference,
emerald-and-gold framing.

**Hashtags:** #AlAzhar #ClassicalScholarship #QualifiedTeachers #Ijazah
#IslamicHeritage #TrustedTeaching #RiwaqAlIlm

## 3.6 More Than a Teacher

**Hook:** She noticed he was quiet that week — and asked why before asking for homework.

**Layout:** Warm portrait card, real photo, short anecdote caption.

**Hashtags:** #MoreThanATeacher #Mentorship #ChildWellbeing #CaringTeachers
#OneOnOne #StudentFirst #RiwaqAlIlm

## 3.7 Thank You, Teachers

**Hook:** Every letter your child learns is on someone's record of good deeds.

**Layout:** Gratitude card — emerald ground, gold calligraphic accent, faculty
photos as a small strip.

**Hashtags:** #ThankYouTeachers #Barakah #SadaqahJariyah #Gratitude
#IslamicEducation #TeacherAppreciation #RiwaqAlIlm

---

# PILLAR 4 — Daily Duas for Kids (Thursday)

_The dua text itself: Arabic + transliteration + translation. Save-and-teach
format. Highest Pinterest and save potential of any pillar._

**Per-post image spec:** dua card — photograph in the lower two-thirds, Arabic
(harakat stripped) in gold, transliteration and English translation in cream,
source reference where applicable.

## 4.1 Morning Dua

**Hook:** The first sentence of her day set the tone for all of it.

**Dua:** الحمد لله الذي احيانا بعد ما اماتنا واليه النشور —
_Alhamdulillahilladhi ahyana ba'da ma amatana wa ilayhin-nushur_ —
"All praise to Allah who gave us life after death, and to Him is the return."

**Scene prompt:** Child sitting up in bed in soft dawn light, stretching and
smiling, curtains glowing, emerald blanket, cream pillows, photorealistic,
serene. Generous soft space in the upper third for text. NO text anywhere.

**Hashtags:** #MorningDua #StartTheDayRight #DuaForKids #IslamicRoutine
#Alhamdulillah #TeachYourChild #RiwaqAlIlm

## 4.2 Dua Before Eating

**Hook:** One word turns a meal into worship.

**Dua:** بسم الله — _Bismillah_ — "In the name of Allah."
(If forgotten mid-meal: _Bismillahi awwalahu wa akhirahu_.)

**Scene prompt:** Overhead shot of a child's small hands about to take a date
from a plate, family table set with bread, fruit and milk, warm sunset light,
lanterns softly glowing, photorealistic, warm. NO text anywhere.

**Hashtags:** #Bismillah #DuaBeforeEating #SunnahOfEating #MuslimKids
#TableManners #IslamicHabits #RiwaqAlIlm

## 4.3 Dua Before Sleeping

**Hook:** Teach her this, and she will never sleep unprotected.

**Dua:** بسمك اللهم اموت واحيا — _Bismika Allahumma amutu wa ahya_ —
"In Your name, O Allah, I die and I live."

**Scene prompt:** Child lying in bed with hands tucked under one cheek, eyes
gently closing, crescent-moon night lamp glowing warm on the nightstand,
emerald blanket, dim cozy bedroom, photorealistic, peaceful. NO text anywhere.

**Hashtags:** #BedtimeDua #SleepSunnah #NightRoutine #DuaForKids
#ProtectionDua #MuslimParenting #RiwaqAlIlm

## 4.4 Dua for Parents ✅ produced (video)

**Status:** `renders/rabbi-irhamhuma/riwaq-rabbi-irhamhuma-9x16.mp4` +
caption. Image card still to build for the feed.

**Hook:** The dua every parent hopes to hear one day.

**Dua:** رب ارحمهما كما ربياني صغيرا —
_Rabbi irhamhuma kama rabbayani sagheera_ — "My Lord, have mercy upon them as
they brought me up when I was small." (Quran 17:24)

**Scene prompt:** Close-up of a child's small raised hands in dua, warm lantern
glow, mother's hands resting on the child's shoulders softly blurred behind,
deep emerald background with gold bokeh, photorealistic, moving. NO text.

**Hashtags:** #DuaForParents #RabbiIrhamhuma #Quran1724 #HonourYourParents
#DuaForKids #FamilyDua #RiwaqAlIlm

## 4.5 Dua for Knowledge ✅ produced (video)

**Status:** `renders/dua-before-learning/riwaq-dua-before-learning-johra-9x16.mp4`

- `renders/little-girl-dua/`. Image card still to build.

**Hook:** Before she opens her notebook, she opens her heart.

**Dua:** رب زدني علما — _Rabbi zidni ilma_ —
"My Lord, increase me in knowledge." (Quran 20:114)

**Scene prompt:** Girl at a wooden study desk with hands raised in dua, open
notebook and Quran in front of her, warm lantern light, cozy study corner,
emerald-and-gold interior, photorealistic, hopeful. NO text anywhere.

**Hashtags:** #RabbiZidniIlma #DuaForKnowledge #BeforeStudying #StudentDua
#QuranForKids #SeekKnowledge #RiwaqAlIlm

## 4.6 Dua for Guidance ✅ produced (video)

**Status:** `The Lantern in the Dark — Dua for Guidance` (tracker SL 4).
Image card still to build.

**Hook:** When a child does not know which way to go, teach them who to ask.

**Dua:** اهدنا الصراط المستقيم — _Ihdinas-siratal-mustaqeem_ —
"Guide us to the straight path." (Quran 1:6)

**Scene prompt:** Child holding a small glowing lantern on a dim path at dusk,
warm gold light on their face, deep emerald-blue shadows around, soft mist,
photorealistic, hopeful and cinematic. NO text anywhere.

**Hashtags:** #DuaForGuidance #Hidayah #StraightPath #AlFatihah
#DuaForKids #IslamicParenting #RiwaqAlIlm

## 4.7 Dua When Leaving Home

**Hook:** Three sentences at the door, and she leaves protected.

**Dua:** بسم الله توكلت على الله ولا حول ولا قوة الا بالله —
_Bismillah, tawakkaltu 'alallah, wa la hawla wa la quwwata illa billah_ —
"In the name of Allah, I place my trust in Allah, and there is no power except
with Allah."

**Scene prompt:** Young girl with a backpack at the front door, mother's hand
resting on her head in blessing, bright morning light spilling in from outside,
emerald door frame with gold detail, photorealistic, warm. NO text anywhere.

**Hashtags:** #DuaLeavingHome #SchoolMornings #ProtectionDua #Tawakkul
#DuaForKids #MuslimMornings #RiwaqAlIlm

---

# PILLAR 5 — Little Muslim, Big Heart (Friday)

_Child-facing character and akhlaq. Warm, simple, shareable._

## 5.1 Smile and Say Salam

**Hook:** The Prophet ﷺ greeted children first. So can yours.

**Scene prompt:** Two young children meeting on a sunlit doorstep, one offering
a hand and a bright smile, the other beaming back, warm daylight, emerald door
and gold accents, photorealistic, joyful. NO text anywhere.

**Hashtags:** #Salam #IslamicManners #KindKids #SunnahOfGreeting
#LittleMuslims #Akhlaq #RiwaqAlIlm

## 5.2 Help Your Parents

**Hook:** Helping at home is not a chore — it is worship with a smile.

**Scene prompt:** Small boy carrying a folded towel or setting a plate at the
table beside his mother, both smiling, warm kitchen light, emerald and cream
interior, photorealistic, wholesome. NO text anywhere.

**Hashtags:** #HelpYourParents #BirrAlWalidayn #KindKids #HomeHelpers
#IslamicManners #LittleMuslims #RiwaqAlIlm

## 5.3 Share Your Toys

**Hook:** Sharing is the first sadaqah a child ever gives.

**Scene prompt:** Two small children on a patterned rug, one holding out a
wooden toy to the other with an open hand, warm afternoon light, emerald
cushions, photorealistic, gentle. NO text anywhere.

**Hashtags:** #Sharing #FirstSadaqah #GenerousKids #Akhlaq
#LittleMuslims #KindnessMatters #RiwaqAlIlm

## 5.4 Tell the Truth

**Hook:** Truth is easier to say when a child knows they will still be loved.

**Scene prompt:** Child looking up at a kneeling parent with an honest, slightly
nervous expression, the parent's hand warm on their shoulder, a knocked-over cup
softly blurred behind, warm living-room light, photorealistic, tender. NO text.

**Hashtags:** #Honesty #Sidq #TruthfulKids #IslamicValues
#GentleParenting #Akhlaq #RiwaqAlIlm

## 5.5 Be Thankful

**Hook:** Gratitude is a habit before it is a feeling.

**Scene prompt:** Child holding a simple gift or piece of fruit with both hands,
looking up with a wide grateful smile, warm golden light, emerald-and-cream
interior, photorealistic, bright. NO text anywhere.

**Hashtags:** #Shukr #Gratitude #Alhamdulillah #ThankfulKids
#LittleMuslims #IslamicValues #RiwaqAlIlm

## 5.6 Help a Friend

**Hook:** The best of people are the most useful to others.

**Scene prompt:** Young child helping a classmate pick up scattered books or
tie a shoelace in a sunlit hallway, both smiling, warm light, emerald lockers
or wall softly blurred, photorealistic, kind. NO text anywhere.

**Hashtags:** #HelpAFriend #Ukhuwah #KindKids #BestOfPeople
#SchoolKindness #Akhlaq #RiwaqAlIlm

## 5.7 Spread Kindness

**Hook:** Kindness costs a child nothing and teaches them everything.

**Scene prompt:** Small child offering a flower or a snack to an elderly
neighbour at a doorway, both smiling warmly, soft golden late-afternoon light,
emerald and gold accents, photorealistic, heartwarming. NO text anywhere.

**Hashtags:** #SpreadKindness #Rahmah #KindKids #GoodCharacter
#IslamicManners #LittleMuslims #RiwaqAlIlm

---

# PILLAR 6 — Community Engagement (Saturday) — NEW

_Built to be replied to, not admired. Every post asks for something small.
Lowest production cost, highest comment volume._

## 6.1 Which Dua Should We Teach Next?

**Hook:** You pick — which dua should we teach next week?

**Format:** Four-option poll card. Numbered gold list on emerald ground over a
soft photo. Story version uses the poll sticker.

**Options:** 1️⃣ Dua before eating · 2️⃣ Dua for travel ·
3️⃣ Dua for exams · 4️⃣ Dua when angry

**Scene prompt:** Child's hands raised in dua over an open Quran, warm lantern
light, deep emerald background with soft gold bokeh, generous clean upper
space for a text list, photorealistic. NO text anywhere.

**Hashtags:** #YouChoose #DuaForKids #CommunityPoll #MuslimParents
#TeachTheDua #YourTurn #RiwaqAlIlm

## 6.2 Your Child's First Surah

**Hook:** Everyone remembers the first surah their child learned. Ours was Al-Fatihah.

**Format:** Question card. Comment-thread driver — reply to every comment for
24 hours to lift reach.

**Scene prompt:** Young child holding an open Quran to their chest, proud shy
smile, warm golden light, emerald-and-gold home interior softly blurred,
photorealistic, tender. NO text anywhere.

**Hashtags:** #FirstSurah #Hifz #MuslimParents #ShareYourStory
#QuranForKids #MilestoneMemories #RiwaqAlIlm

## 6.3 Caption This Moment

**Hook:** Caption this. Best one gets pinned. 👇

**Format:** Single expressive photo, no text on image at all beyond the
watermark — the caption box does the work.

**Scene prompt:** Toddler in a kufi standing on a prayer rug looking up with a
comically determined expression, mid-imitation of salah, warm morning light,
emerald rug and gold accents, photorealistic, charming. NO text anywhere.

**Hashtags:** #CaptionThis #LittleMuslims #MuslimFamilyLife #TooCute
#ParentingWins #JoinIn #RiwaqAlIlm

## 6.4 Ask Our Teachers Anything

**Hook:** Your Quran questions, answered by Al-Azhar teachers. Ask below.

**Format:** Invitation card. Collect questions Saturday, answer in Sunday's
Story set and Wednesday's Teacher post.

**Scene prompt:** Warm study desk with an open Quran, notebook, pen and a
steaming cup, soft lamp light, emerald-and-gold interior, no people, inviting
and calm, photorealistic. Clean upper third for text. NO readable text.

**Hashtags:** #AskATeacher #QuranQuestions #AlAzhar #IslamicEducation
#AMA #WeAnswer #RiwaqAlIlm

## 6.5 Tag a Parent Who Needs This

**Hook:** Tag the parent who has been meaning to start this for months. ❤️

**Format:** Share-mechanic card. Short, warm, no guilt — encouragement only.

**Scene prompt:** Parent and child sitting close on a couch with an open Quran
between them, both laughing softly, warm golden hour light, emerald cushions,
photorealistic, inviting. NO text anywhere.

**Hashtags:** #TagAParent #ItIsNotTooLate #StartToday #MuslimParenting
#QuranForKids #Encouragement #RiwaqAlIlm

## 6.6 Student Milestone Wall

> ⚠️ Requires parent permission per child. First names and state only.
> No photos without written consent.

**Hook:** Six students finished their first surah this month. Say mashaAllah. 🌿

**Format:** Milestone card — first names, ages, milestone. Text only unless
consent is on file.

**Hashtags:** #MashaAllah #StudentMilestones #Hifz #CelebrateProgress
#OurStudents #WellDone #RiwaqAlIlm

## 6.7 Seasonal Community Check-In

**Hook:** Ramadan is four weeks away. What is your family's one goal this year?

**Format:** Seasonal question card. Rotate the occasion — Ramadan, Eid,
back-to-school, new Hijri year.

**Scene prompt:** Family silhouette at a window at dusk with a crescent moon
visible in a deep blue-emerald sky, warm interior glow, lanterns softly lit,
photorealistic, anticipatory. NO text anywhere.

**Hashtags:** #RamadanGoals #FamilyGoals #SeasonalCheckIn #MuslimFamily
#Intentions #TogetherThisYear #RiwaqAlIlm

---

# PILLAR 7 — Free Trial Campaign (Sunday) — NEW

_The only openly commercial day. One clear ask, link in every post.
Answers the objection, then removes the risk._

## 7.1 What Happens in a Free Trial Class

**Hook:** Thirty minutes. One teacher. Your child, and no pressure.

**Format:** 4-slide carousel — 1) the ask 2) what happens in the class 3) what you get afterwards 4) CTA card with link.

**Scene prompt:** Child at a desk with headphones smiling at a laptop showing a
warm teacher on a video call, parent watching proudly from the doorway, warm
evening lamp light, fairy lights, emerald accents, photorealistic. NO readable
text on screen.

**Hashtags:** #FreeTrialClass #OnlineQuranClasses #TryItFree #NoPressure
#QuranForKids #FirstClass #RiwaqAlIlm

## 7.2 Meet Your Teacher Before You Commit

> ⚠️ Needs a real teacher photo (see Pillar 3 dependencies).

**Hook:** You meet the teacher first. If it is not the right fit, you walk away.

**Format:** Teacher card + CTA. Real photo only.

**Hashtags:** #MeetYourTeacher #NoCommitment #QualifiedTeachers #AlAzhar
#FreeTrial #RightFit #RiwaqAlIlm

## 7.3 One-on-One vs Group — Why It Matters

**Hook:** In a room of twenty, a shy child never raises their hand.

**Format:** Comparison card — two panels, group vs one-on-one, gold divider.

**Scene prompt:** Quiet young girl with soft headphones smiling shyly but
confidently at a laptop showing a kind teacher, cozy desk with warm fairy
lights and emerald cushions, evening lamp glow, photorealistic, safe and
intimate. NO readable text on screen.

**Hashtags:** #OneOnOne #ShyKids #PersonalisedLearning #EveryChildLearns
#OnlineQuranClasses #ConfidenceBuilding #RiwaqAlIlm

## 7.4 Flexible Times for Busy Families

**Hook:** After school. After Maghrib. After bedtime for the little one. Your call.

**Format:** Schedule card — US time-zone friendly slots, gold on emerald.

**Scene prompt:** Warm evening kitchen table, child doing Quran work on a
laptop while a parent cooks in the softly blurred background, clock on the wall,
emerald-and-gold interior, photorealistic, realistic family evening. NO readable
text.

**Hashtags:** #FlexibleSchedule #BusyFamilies #AfterSchool #WorkingParents
#OnlineQuranClasses #YourTimeZone #RiwaqAlIlm

## 7.5 No Card, No Commitment

**Hook:** No card. No contract. One free class, and you decide.

**Format:** Clean objection-handling card — three gold ticks on emerald,
minimal photo.

**Scene prompt:** Simple elegant still life — open Quran, a notebook and a
child's pencil on a cream desk, soft warm light, deep emerald background with
subtle gold geometric pattern, photorealistic, clean and premium. NO text.

**Hashtags:** #NoCommitment #FreeTrialClass #RiskFree #TryFirst
#OnlineQuranClasses #ParentFriendly #RiwaqAlIlm

## 7.6 From First Letter to First Surah

**Hook:** Alif today. Al-Fatihah by winter. It starts with one class.

**Format:** Journey card or 3-slide mini carousel — letter → verse → surah.

**Scene prompt:** Triptych-friendly wide scene: child's hand tracing a single
Arabic letter, warm gold light, deep emerald background, generous negative
space for staged text, photorealistic. NO readable words.

**Hashtags:** #FromAlifToFatihah #QuranJourney #LearningPath #ProgressNotPerfection
#LearnQuran #StartNow #RiwaqAlIlm

## 7.7 This Week's Open Slots

**Hook:** A few trial slots left this week. Comment "TRIAL" and we will send the link.

**Format:** Evergreen recurring card. Update the slot count weekly. Comment
keyword lifts reach more than an outbound link.

**Scene prompt:** Warm inviting study nook, empty chair pulled slightly out at a
desk with an open Quran and a glowing laptop, soft lamp light, emerald-and-gold
interior, photorealistic, "a seat waiting for you". NO readable text.

**Hashtags:** #OpenSlots #FreeTrialClass #BookThisWeek #LimitedSpots
#OnlineQuranClasses #CommentToBook #RiwaqAlIlm

---

## Appendix — Production status summary

| Pillar                     | Posts  | Ready to build | Already produced | Blocked            |
| -------------------------- | ------ | -------------- | ---------------- | ------------------ |
| 1 Islamic Moments at Home  | 7      | 3              | 4 ✅             | —                  |
| 2 Quran Journey            | 7      | 7              | 1 image reusable | —                  |
| 3 Teacher Spotlight        | 7      | 0              | —                | 7 ⛔               |
| 4 Daily Duas for Kids      | 7      | 4              | 3 ✅ (video)     | —                  |
| 5 Little Muslim, Big Heart | 7      | 7              | —                | —                  |
| 6 Community Engagement     | 7      | 6              | —                | 1 ⚠️ consent       |
| 7 Free Trial Campaign      | 7      | 6              | —                | 1 ⚠️ teacher photo |
| **Total**                  | **49** | **33**         | **7**            | **9**              |

33 posts buildable now ≈ **66 credits ≈ $2.20** for backgrounds; composition,
carousels, Stories, and Pinterest variants are local and free.

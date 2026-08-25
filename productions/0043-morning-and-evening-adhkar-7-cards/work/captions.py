#!/usr/bin/env python3
"""Compose the seven captions.

The Arabic, transliteration, translation, timing and source come from
`cards.json`, which was parsed out of the user's document — the same data the
cards render from. Only the human framing below is written by hand, so no graded
Arabic passage is ever retyped into a caption.
"""
import json, pathlib

C = json.load(open("work/cards.json"))

# day: (title, emoji for the title, opening hook, the turn, the ask)
FRAME = {
 1: ("The Easiest Hundred You Will Ever Say", "✨🌙🌿",
     "A hundred sounds like a lot until you time it.",
     "Four words, a hundred times, takes about three minutes. Most of us lose "
     "more than that deciding what to watch. And the Prophet ﷺ said the one who "
     "says it will not be surpassed on the Day of Resurrection except by someone "
     "who said the same or more.",
     "Try it once tomorrow morning and see how long it actually takes."),
 2: ("The Sentence That Answers Who You Are", "❤️🌙✨",
     "Somebody will ask your child what they are one day. This is the answer.",
     "It is not a slogan. It is three settled statements — my Lord, my way of "
     "life, the Prophet whose example I follow — said out loud before the day "
     "starts pulling at you.",
     "Say it in front of your children this week and let them hear what belonging sounds like."),
 3: ("What To Say Before You Leave The House", "🤲🌙✨",
     "The school run, the commute, the door closing behind them.",
     "Three times in the morning, three in the evening. We still lock the door "
     "and check the road — and we say this, because taking precautions and "
     "trusting Allah were never two different things.",
     "Learn it this week. It is shorter than it looks."),
 4: ("For The End Of A Heavy Day", "🌙✨❤️",
     "Some evenings you do not want to talk to anyone.",
     "Three times, as the light goes. Not a spell and not a formula — a sentence "
     "that puts what you are afraid of somewhere safer than your own hands.",
     "Say it tonight before you sleep."),
 5: ("The Whole Day, Handed Over In One Line", "🌅🌙✨",
     "By You we wake. By You we sleep. By You we live, by You we die.",
     "Morning and evening, with one word changed between them. It does not ask "
     "for anything. It just says out loud who the day belongs to — which is why "
     "it settles something before the day has started.",
     "Teach the morning one first. The evening one is the same sentence turned around."),
 6: ("Name Three Before You Check Your Phone", "🌿❤️✨",
     "Health. Family. Faith. Food. Safety. Another morning.",
     "This dhikr says every blessing you woke up with came from Allah alone. "
     "The practice underneath it is simpler: before the phone, name three. "
     "Children copy that faster than they copy anything you tell them.",
     "What are your three this morning?"),
 7: ("If You Only Memorise One, Make It This", "🤲❤️🌙",
     "The Prophet ﷺ called this the foremost way of seeking forgiveness.",
     "It is longer than the others and worth every line. Gratitude, honesty "
     "about your own sin, and hope, in one breath — you acknowledge the blessing "
     "and the failure in the same sentence, and then ask.",
     "Take it a line at a time. A week is plenty."),
}

def block(c, platform):
    f = FRAME[c["day"]]
    title, emo, hook, turn, ask = f
    L = []
    L.append("**Title**\n")
    L.append(f"{title} {emo}\n")
    L.append("**Body**\n")
    L.append(f"Morning & Evening Adhkār — Day {c['day']} of 7\n")
    L.append(f"{hook}\n")
    L.append(c["ar"] + "\n")
    L.append(c["tl"] + "\n")
    L.append(f"“{c['en']}”\n")
    L.append(f"📖 {c['when']}\n")
    L.append(turn + "\n")
    L.append(f"🌿 Source: {c['src']}\n")
    if platform == "fb":
        L.append(f"👇 {ask}\n")
        L.append("🎁 We teach Qur'an and Arabic to children one-on-one with qualified "
                 "Al-Azhar teachers. First class is free.\n")
        L.append("🔗 https://riwaqalilm.com/free-trial\n")
    else:
        L.append(f"👇 {ask}\n")
        L.append("🔗 Free trial class in bio · Al-Azhar teachers, one-on-one\n")
    L.append("🌿📖🌙✨\n")
    tags = ("#Adhkar #MorningAdhkar #EveningAdhkar #Dhikr #IslamicParenting "
            "#MuslimKids #IslamicEducation #QuranForKids #MuslimFamily #RiwaqAlIlm "
            "#MuslimMoms")
    L.append(tags)
    return "\n".join(L)

out = ["""# Morning & Evening Adhkar — post captions

Seven posts, one a day. Cards: `OUTPUT/0043-adhkar-N-of-7-4x5.png` (1080x1350).

Arabic, transliteration, translation, timing and sources are taken **verbatim
from the source document** by way of `work/cards.json` — the same data the cards
render from. Nothing here was retyped.

Emoji from [library/EMOJI-LIBRARY.md](../../../library/EMOJI-LIBRARY.md).

PLAIN TEXT apart from emoji. The source document's captions used markdown bold;
that has been flattened, because the platforms print asterisks literally.

**Do not post before a qualified review of all seven** — Arabic, transliteration,
translation, repetition counts, context and sources. Asked for by the source
document itself and still outstanding.
"""]

for c in C:
    out.append(f"\n---\n\n# Day {c['day']} of 7\n")
    out.append("## Facebook\n")
    out.append(block(c, "fb"))
    out.append("\n## Instagram (4:5)\n")
    out.append(block(c, "ig"))

out.append("""
---

## Posting notes

For us, not for posting.

- **One a day, in order.** Every caption carries "Day N of 7", which is the whole
  follow mechanism — the reason to come back tomorrow. Posting them out of order
  or in a batch throws that away.
- **The framing is what makes each one different.** The Arabic is fixed, so the
  variation has to come from the opening line: the easiest hundred, what to say
  before you leave the house, for the end of a heavy day. Without that they are
  seven identical cards.
- **Day 6 has the best ask** — "what are your three this morning?" — because it
  can be answered in three words by someone who is not confident writing about
  religion.
- **Day 7 is the strongest post and the longest.** If only one is boosted, that
  one.
- **Saves matter more than likes here.** Adhkar are reference material; a parent
  saves them to use tomorrow. Consider a pinned comment saying "save this for
  your morning routine".
- **Sources stay in the caption.** They are the reason this is trustworthy rather
  than another quote graphic, and they cost one line.
""")

pathlib.Path("OUTPUT/CAPTION.md").write_text("\n".join(out))
print("  OUTPUT/CAPTION.md written")

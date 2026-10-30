# Personality wording: "compared with people your age"

**Status: DRAFT for product-owner review. Not used by the app yet.**

**Purpose.** This file holds the copy for one optional line per personality domain (IPIP-NEO-120) in the report. The report still leads with relative-to-self results. A domain gets this line only when both of these are true:

1. an age-banded population norm exists for the user's onboarding age group, and
2. the user's difference from that norm is larger than the measurement error.

If either is false, the line is left out, or the "typical range" sentence below is used instead.

**Sentence frame.** "Compared with people your age, you …" followed by the cell text. Each cell describes what people at that pole *tend to do or prefer*, based on the domain's facets. It names an upside and a trade-off, and the high and low cells are written to be equally respectful.

**Neutral label for Neuroticism: "Emotional reactivity".** To lay readers "neurotic" is a pejorative and quasi-clinical word, so the user-facing heading should not use "Neuroticism". "Emotional reactivity" describes what the facets measure (how strongly and how quickly worry, anger, low mood, self-consciousness, urges and stress register) and does not suggest that either pole is healthier. The internal id `Neuroticism` stays the same.

## Wording table

| Domain (facets, for reviewers only, not shown to users) | Higher than most people your age | Lower than most people your age |
|---|---|---|
| **Emotional reactivity** (anxiety, anger, depression, self-consciousness, immoderation, vulnerability) | …tend to feel worry, frustration and stress more strongly and notice problems early. This keeps you alert to risk, though pressure and criticism can take more out of you. | …tend to stay calm under pressure and recover quickly from setbacks. This steadies you in tense moments, though you may notice risks, or other people's stress, later than some do. |
| **Extraversion: social energy** (friendliness, gregariousness, assertiveness, activity level, excitement-seeking, cheerfulness) | …tend to seek out company, speak up readily and keep a busy, lively pace. This helps you build contacts and lead groups, though long stretches of quiet, solitary work can feel draining. | …tend to prefer smaller groups, a steadier pace and time on your own. This suits focused, independent work, though roles built around constant networking or self-promotion can tire you. |
| **Openness: ideas and experience** (imagination, artistic interests, emotionality, adventurousness, intellect) | …tend to seek out new ideas, art and experiences and enjoy abstract questions. This helps you see fresh angles, though routine, tightly defined work may feel confining. | …tend to prefer practical, proven approaches and familiar routines. This helps you get concrete things done reliably, though open-ended or highly abstract work may feel less rewarding. |
| **Agreeableness: cooperation** (trust, morality, altruism, cooperation, modesty, sympathy) | …tend to trust people, put others' needs first and look for compromise. This builds goodwill and teamwork, though you may find it harder to push back or bargain hard. | …tend to weigh claims sceptically, say plainly when you disagree and hold your ground. This helps in negotiation and tough reviews, though it can create friction in close-knit teams. |
| **Conscientiousness: planning and follow-through** (self-efficacy, orderliness, dutifulness, achievement-striving, self-discipline, cautiousness) | …tend to plan ahead, keep things in order and follow through on commitments. This makes you dependable on long tasks, though sudden changes or loose plans can be frustrating. | …tend to work flexibly, keep plans loose and decide in the moment. This helps you adapt and improvise, though long, detail-heavy tasks or strict deadlines can take more effort. |

Each cell is about 25–30 words including "Compared with people your age, you".

## Extra sentences

**Typical range** (the difference does not beat the measurement error):
> Compared with people your age, your score here is in the typical range. The difference is smaller than the questionnaire's margin of error, so we don't single it out.

**Method section** (names the norm group in plain words):
> To compare you with people your age, we use published results from a large online study (Kajonius & Johnson, 2019). In that study 320,128 volunteers, mostly adults in the United States, took the same questionnaire. They ranged across all adult ages, with an average age of 28. We compare you only with the people in that study who were in your age group. Because they were volunteers who chose to take an online test, they are not a perfect picture of everyone your age.

*(If age-banded norms can't be built and only the all-ages norms are available, drop the "compared with people your age" lines entirely. The method sentence then says the norms are used only for career matching.)*

## Banned words and patterns (for the copy check)

Matching is case-insensitive on word stems. The check applies to all personality copy.

- **Character labels:** disorganised/disorganized, lazy, careless, sloppy, unreliable, unkind, cold, rude, selfish, hostile, difficult, neurotic, unstable, anxious person, insecure, fragile, needy, closed-minded, narrow-minded, rigid, boring, shy, antisocial, loner, pushover, doormat, naive, gullible, impulsive, flaky.
- **Clinical language:** disorder, symptom, pathology, clinical, diagnosis, depressed, depression, anxiety disorder, mental illness, healthy/unhealthy, normal/abnormal. (Facet names like "Depression" may appear only as internal ids and must never appear in user copy.)
- **Deficit framing:** "lack of", "lacks", "poor", "low in", "deficient", "weak at", "not enough", "too [adjective]", "fails to", "struggle(s) with".
- **Evaluative comparison:** better, worse, best, worst, superior, inferior, "should be", "need(s) to improve", "a problem".
- **Success predictions:** "will succeed", "will fail", "likely to succeed", "destined", "guaranteed", "perfect for".
- **Identity framing:** "you are a [noun/adjective]" or "you're a … person". Use "you tend to …" instead.

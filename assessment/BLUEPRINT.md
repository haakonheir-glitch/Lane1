# Lane Assessment Blueprint v0.1

*The research basis, design decisions and validation plan behind the Lane profile. Pair this with the item files in `/items` and the generators in `/generators`.*

---

## 1. The short version

- **What "most accurate" means here.** Accuracy is not the number of tests. It is how much each test adds to predicting the outcomes Lane cares about (doing well in a lane, staying in it, feeling it fits) beyond what the other tests already capture. A battery of ten overlapping questionnaires is longer, not more accurate. Every module below earns its place by measuring something the others miss.
- **Built from validated, legally usable instruments.** Personality uses the IPIP-NEO-120 (public domain). Interests use the O*NET Interest Profiler. Work values use the O*NET Work Importance Locator. Both O*NET tools are federal tools licensed for reuse with attribution.
- **Reasoning tests are generated, not copied.** Every cognitive item is created from a seed by code. Nobody can look up answers, users can retake, and no commercial test (Raven's, Wechsler, Wonderlic) is reproduced.
- **Three additions most competitors skip:**
  - **Ratings from people who know you.** This is the largest single accuracy upgrade available.
  - **Behavioural tasks** for risk, patience and learning speed, instead of only asking people about these.
  - **Original scales for non-corporate lanes**, which existing instruments barely cover.
- **Honest limits stay in the design.** Results are shown as ranges. There is no IQ number. Experimental scales stay hidden until the pilot validates them. The profile is the starting hypothesis, and sprints are the test.

Total: about 135 minutes for the user, split into five sessions of 20–30 minutes, plus about 5 minutes for each person who rates them.

---

## 2. What the evidence says predicts work outcomes

The battery's design follows from these findings, so they come first.

| Finding | Implication for Lane |
|---|---|
| A 2022 re-analysis of personnel-selection research found that earlier estimates were inflated by statistical over-correction. Most validities dropped by .10–.20. Structured interviews came out on top (≈.42), cognitive ability at ≈.31, with empirically keyed biodata near the top. (Sackett et al., 2022) | No single test dominates. Combine methods. Include a structured life-history (biodata) module, and treat sprints as the lane-specific equivalent of a work sample. |
| Interest fit predicts overall job satisfaction modestly (ρ ≈ .19 across 105 studies, N ≈ 40,000). It predicts satisfaction with one's overall career path and performance more strongly. (Hoff et al., 2020) | Interests are core to choosing *which lane*. Don't oversell them as predicting day-to-day happiness. |
| Ratings from people who know you predict academic and job performance substantially better than self-ratings, and add to them. Observer ratings add beyond self-reports, but not the other way round. (Connelly & Ones, 2010; Oh, Wang & Mount, 2011) | Build informant ratings into the core flow, not as an optional extra. |
| The IPIP-NEO-120's 4-item facet scales have adequate reliability for research. Its author says they should probably not be used for important decisions about individuals. Ipsatizing responses to correct for acquiescence *lowered* validity. (Johnson, 2014) | Show facets with confidence intervals. Never make a decision from a single facet. Do the "relative to yourself" comparison on scores, not on raw responses. |
| Within-person variation in risk-taking across domains (financial, social, recreational, ethical, health) was about 7 times larger than between-person variation. (Blais & Weber, 2006) | There is no single "risk tolerance". Measure risk separately per domain, plus one behavioural task. |
| Ability-based emotional-intelligence tests (STEU/STEM) predict grades beyond vocabulary and personality. Their reliability is modest and varies across studies. (MacCann & Roberts, 2008; later replications) | EI is worth measuring as a performance test, not self-report. Expect noise and use long scales. |
| Automated semantic-distance scoring predicts human creativity ratings on the Alternate Uses Task. (Beaty & Johnson, 2021) | Creativity can be scored at scale without human raters. |
| Careless responding is common online. Response time, long strings of identical answers, inconsistent answers to opposite items, and infrequency items all detect it. (Huang et al., 2012; Curran, 2016) | Data-quality checks are built into every session (§6). |

---

## 3. The most-studied instruments: what we use and what we don't

### Used

| Domain | Instrument | Why this one | License |
|---|---|---|---|
| Personality (Big Five, 30 facets) | **IPIP-NEO-120** (Johnson, 2014) | Public-domain counterpart of the NEO PI-R, the most researched facet-level inventory. Validated on more than 600,000 internet respondents. Facets matter: "Conscientiousness" hides very different profiles (orderly vs. driven vs. cautious). | Public domain, commercial use allowed |
| Sixth personality factor | **Mini-IPIP6 Honesty-Humility** (Sibley et al., 2011) | HEXACO's sixth factor: sincerity, fairness, greed avoidance, modesty. The Big Five largely miss it. Relevant to status-, money- and incentive-heavy lanes. | Public domain |
| Interests (RIASEC) | **O*NET Interest Profiler Short Form**, 60 items | The US federal standard. Linked to about 900 occupation profiles in a free database. Uses concrete work-activity items rather than abstract preferences. | CC BY-ND 4.0, or the O*NET Tools Developer License for modified versions (needs attribution and validation) |
| Work values | **O*NET Work Importance Locator**, 20-card sort | Six values (Achievement, Independence, Recognition, Relationships, Support, Working Conditions) linked to the same occupation database. The forced sort stops people from rating everything "very important". | Same O*NET licenses |
| Other-ratings | **Mini-IPIP**, rewritten in third person (Donnellan et al., 2006) | 20 items, about 5 minutes per rater, public domain, well validated. | Public domain |
| Cognitive ability | **Procedurally generated** matrices, number series, letter series, quantitative problems, 2D rotation, digit span, Corsi span, symbol matching, choice RT | Same item types as the open ICAR research battery and the classic ability literature, but generated fresh for each user. | Lane's own code |
| Creativity | **Alternate Uses Task**, with semantic-distance + LLM scoring | The most-used divergent-thinking task. Public paradigm. | Paradigm, own prompts |

### Rejected, and why

| Instrument | Reason |
|---|---|
| **MBTI / 16Personalities** | Type categories discard information and lack predictive validity for career outcomes. Proprietary (MBTI). Its popularity is a reason to explain the difference to users, not to use it. |
| **NEO PI-R / NEO-PI-3** | Proprietary and paid per administration. The IPIP-NEO measures nearly the same constructs (corrected correlations ≈ .91–.94 with the NEO PI-R scales). |
| **Strong Interest Inventory, Self-Directed Search** | Proprietary. The O*NET Interest Profiler measures the same RIASEC model and links to open occupation data. |
| **CliftonStrengths, Hogan, 16PF, DISC** | Proprietary, and some are built mainly for employer selection. CliftonStrengths uses forced-choice (ipsative) scoring that can't compare people. DISC and the Enneagram have weak research bases. |
| **Raven's, WAIS, Wonderlic, CogAT** | Proprietary. Their items circulate online, so scores of motivated users would be inflated. |
| **ICAR item files** | Public-domain project, but item and key files are shared at a scientific-use level to protect the keys. Use ICAR as a research benchmark (with permission, in a research context), not as product content. |
| **MSCEIT, STEU/STEM, TEIQue** | MSCEIT is proprietary. STEU/STEM need permission for non-research use. TEIQue is free for research only. Lane writes its own ability-EI items instead, modelled on the same theory. |
| **Grit scale** | Meta-analytic work (Credé et al., 2017) found grit largely overlaps with Conscientiousness, which the IPIP-NEO already measures at facet level. Lane measures the useful remainder more directly with *setback resilience* and *long-horizon motivation*. |
| **DNA "talent" tests** | No validity for career prediction. Using them would destroy the brand's credibility. |

---

## 4. The battery

| # | Module | Source | Items | Min | Status |
|---|---|---|---|---|---|
| 01 | Personality: Big Five + 30 facets | IPIP-NEO-120 | 116 administered | 14 | Validated |
| 02 | Honesty-Humility | Mini-IPIP6 | 4 | 1 | Validated |
| 03 | Interests (RIASEC) | O*NET IP Short Form | 60 | 7 | Validated |
| 04 | Lane interest extension | Original | 42 (7 scales) | 5 | Experimental |
| 05 | Work values | O*NET WIL | 20-card sort | 6 | Validated (retired tool) |
| 06 | Lane values extension | Original | 12-card sort | 3 | Experimental |
| 07 | Lane dispositions | Original | 60 (10 scales) | 8 | Experimental |
| 08 | Emotion understanding & management | Original SJT | 18 | 8 | Experimental |
| 09 | Creativity | AUT + 2 applied tasks | 4 tasks | 10 | AUT established; others experimental |
| 10 | Life history (biodata) | Original | 18 | 8 | Experimental (empirically keyed) |
| 11 | Ratings by others | Mini-IPIP + observer items | 28 per rater | 5 per rater | Mini-IPIP validated |
| 12 | Data-quality checks | Original + literature | 7 + indices | ~1 | — |
| 13 | Outcomes & follow-up | Original | ~11 | 3 (repeated) | Ground truth for the model |
| 14 | Cognitive & behavioural battery | Generated | ~12 tasks | 58 (+6 verbal later) | Paradigms established; items need calibration |

**Why one facet is removed.** The IPIP-NEO-120 Openness facet "Liberalism" consists of items about voting for political parties and being tough on crime. It is the scale's weakest facet, irrelevant to work fit, and a liability in any selection-adjacent use. It is not administered. Openness is scored from the other five facets.

---

## 5. What Lane adds, and why

Existing instruments were built for a world of employers and occupations. The lanes Lane wants to map (creator, competitor, trader, founder, independent craftsperson, coach, expedition guide) depend on traits the standard instruments only touch indirectly. The additions target those gaps.

**Lane dispositions (file 07).** Ten 6-item scales with balanced keying. Each maps to a concrete demand of a lane:

| Scale | Why it matters | Lanes where it decides a lot |
|---|---|---|
| Variance tolerance | Income is lumpy and uncertain | Founder, creator, trader, athlete, sales on commission |
| Competitiveness | Being ranked is the job | Athlete, poker, trading, sales |
| Visibility comfort | Being seen is the product | Creator, performer, coach |
| Self-direction | Nobody sets the schedule | All independent lanes |
| Setback resilience | Rejection is constant | Sales, creator, founder, athlete |
| Deliberate-practice orientation | Mastery comes through boring repetition | Athlete, musician, poker, craft |
| Team vs solo | Shared vs individual output | Corporate teams vs solo lanes |
| Long-horizon motivation | Payoffs arrive years later | Athlete, founder, research, craft |
| Physical orientation | The body is the tool | Athlete, trades, outdoor |
| Persuasion | Changing minds is the job | Sales, founder, creator, coach |

Several scales will overlap with IPIP-NEO facets: variance tolerance with Excitement-seeking and Cautiousness, self-direction with Self-discipline, setback resilience with Vulnerability. The pilot will test each scale's *incremental* value and drop any that add nothing. This is the right way to test a new scale. The alternative is assuming it works because the items sound right.

**Lane interests and values (files 04 and 06).** These cover the same idea for interests and values: content creation, competition, strategy and markets, founding, craft, coaching, outdoor work, income upside vs. stability, visibility, ownership, and freedom of time and place.

**Behavioural tasks (file 14).**
- *Learning rate.* A new symbol-key mapping learned over six blocks. It measures how fast you improve on neutral material. That gives a baseline for comparing improvement during sprints ("you got better at sales calls twice as fast as your general learning rate").
- *Balloon task.* Measures actual risk behaviour rather than self-description, plus how you react after a loss.
- *Delay discounting.* Measures patience for delayed rewards.

**Emotion SJT (file 08).** Twelve understanding items keyed from appraisal theory, and six management items. The management key is provisional and must be replaced by an expert-panel consensus. The obvious-answer problem (people choose the "nice" option) is a known weakness. Harder items must be added before scores are shown.

**Creativity applied tasks (file 09).** *Problem finding* (spot unmet needs a business could solve) and *audience ideation* (post ideas to reach 1,000 followers) sample the creative acts that founder and creator lanes actually require, rather than only generic idea fluency.

**Biodata (file 10).** Factual questions about past behaviour, such as "Before 16, how often did you earn money on your own initiative?" or "Highest level you have competed at". Past behaviour is among the better predictors of future behaviour. The weights must be learned from outcome data, not guessed.

---

## 6. Data quality

Online self-report data is noisy, and one careless session can corrupt a whole profile. Each session therefore carries:

1. **Infrequency items.** Four absurd statements ("Have never used a phone or a computer") embedded in the personality and disposition blocks.
2. **Instructed items.** Two items like "Choose 'Moderately inaccurate' for this statement". No more than one per ~50 items, because more irritates people.
3. **Indirect indices:**
   - page time (under 1 second per item);
   - long strings of the same answer (more than 12 in a row);
   - even/odd consistency;
   - consistency across 27 pairs of opposite-meaning IPIP-NEO items.
4. **Rapid-guess filtering** on ability items. Answers faster than 25% of an item's median time count as missing, not wrong.
5. **A self-report effort question** at the end of each session, with no penalty for honesty.
6. **An environment check** before cognitive sessions: quiet place, 25 free minutes, not tired.

Two or more flags mark the session "low confidence". The user sees why and is offered a retake. Data is never silently discarded, and the user is never shamed.

---

## 7. Scoring

**Scales.** Reverse-score negative items, then average. Facets need at least 3 of 4 items answered and longer scales at least 5 of 6. Cognitive tasks start with fixed difficulty ladders. After calibration they are scored with a 2PL IRT model, using the generator parameters (number of active rules, polyomino size, series level) as predictors of item difficulty. Generated items can then be scored before each specific item has data.

**Norms.**
- Until Lane has 1,000+ users per age band, use published IPIP-NEO and O*NET norms and label results "provisional".
- After that, build Lane's own norms per language and per device class (for timed tasks).
- Translated versions need forward and back translation and their own norms. Never compare verbal scores across languages.

**Show uncertainty.** Every score gets an interval: ±1.645 × SEM, where SEM = SD × √(1 − reliability). A 4-item facet with reliability .70 has an SEM of about 0.55 SD, so the 90% interval spans roughly ±0.9 SD. That is wide, and users should see that it is wide. It is part of the honesty that sets Lane apart.

**"Relative to yourself", done correctly.** This is the core idea of the product, and it has a statistical trap.
1. First compute each score against a population (z-scores). Never ipsatize the raw answers: Johnson (2014) showed that this destroys validity.
2. Then rank the person's own z-scores to find their relative strengths.
3. A difference between two of your own scores is *noisier than either score*. The standard error of a difference is SD × √(2 − r₁ − r₂). For two scales with reliability .75, that is 0.71 SD, so two scores must differ by about 1.4 SD before you can be 95% confident the gap is real.
4. The product should only call something a "relative strength" when it passes this test. Otherwise it should say "no clear difference". This rule alone prevents most of the false precision other career tests are guilty of.

**No IQ number.** The cognitive composite is shown as a percentile band with an interval, and as a profile of relative strengths (reasoning, spatial, quantitative, memory, speed). An unproctored online battery cannot support a single IQ figure, and the figure affects people's self-image more than the evidence warrants.

---

## 8. From profile to Lane Map

**Lane demand profiles.** Each lane gets a vector describing what it demands on every construct Lane measures:
- **Occupations** take their interest, work-value and ability profiles from the O*NET database (CC BY 4.0).
- **Non-corporate lanes** (creator, poker player, solo founder, athlete) get expert-built profiles, documented with sources and reviewed at least once a year.

Example starting priors (to be replaced by outcome data):

| Lane | High-weight constructs | Payoff curve |
|---|---|---|
| B2B sales | Enterprising interest, persuasion, setback resilience, E3 Assertiveness, C4 Achievement-striving | Linear to convex (commission) |
| Content creator | Artistic + Enterprising interest, visibility comfort, self-direction, audience-ideation score, variance tolerance | Winner-take-all |
| Poker / trading | Quant reasoning, balloon-task calibration, competitiveness, low N6 Vulnerability, deliberate practice, patience | Winner-take-all with high variance |
| Solo founder | Enterprising, self-direction, variance tolerance, problem-finding score, persuasion, long horizon | Extremely convex |
| Professional athlete | Physical orientation, competitiveness, deliberate practice, long horizon, setback resilience (plus physical data that Lane does not measure) | Winner-take-all |
| Software engineer | Investigative + Conventional, matrix and quant reasoning, solo preference, deliberate practice | Linear, high floor |
| Skilled trades | Realistic interest, physical orientation, 2D/3D spatial ability, self-efficacy | Linear, high floor |
| Coach / trainer | Social + Enterprising interest, emotion management, persuasion, visibility comfort | Linear to convex |

> **Superseded 2026-10-27:** income labels were removed from the product (payoff curves, "Fit × payoff", the `variable_pay` tag). Only relative fit is shown. The text below is kept as the original design record; see `design/REMOVED.md`.

**Two separate numbers per lane**, matching the app's "Relative fit" and "Fit × payoff" views:
1. **Relative fit.** How well the person's strongest relative attributes match what the lane demands, compared with the other lanes for the same person.
2. **Fit × payoff.** An estimate of where the person would land within the lane's own population (a percentile), read off the lane's payoff curve. In winner-take-all lanes a good-but-not-top fit can pay little. The app must say this plainly.

**Updating from evidence.** Start with the priors above. Each completed sprint adds direct evidence for that lane: performance, improvement rate versus the baseline learning rate, energy, and desire to continue. A hierarchical Bayesian model fits naturally here. The profile sets the prior and sprints update it, which is exactly the product story ("evidence, not horoscopes"). Over time the 3-monthly outcome data (file 13) replaces the expert weights with learned weights. That dataset is the moat.

---

## 9. Validation roadmap

| Phase | Sample | What it establishes | Gate to next phase |
|---|---|---|---|
| **Pilot 1** | 300 users, 2 weeks | Completion rates, timings, drop-off points, item statistics, obvious confusion | Every session ≤ 30 min at the median; under 20% drop-off per session |
| **Pilot 2** | 1,000+ users | Factor structure and reliability of new scales (keep a scale at α ≥ .75); IRT calibration of generated items; provisional norms; fairness checks (differential item functioning) across sex, language and device | Each new scale clears reliability and adds measurably beyond IPIP-NEO facets |
| **Retest study** | 200 users at 4 weeks | Test-retest stability (target ≥ .70 for traits; learning rate and balloon task will be lower) | Only stable measures are used for lane ranking |
| **Expert panel** | 10+ experts | Consensus key for the emotion-management SJT; review of non-corporate lane profiles | Key agreement above 70% per item |
| **Criterion study** | All users with sprints and 3-month follow-up | Does the profile predict sprint performance, improvement, energy and later satisfaction, conviction and the "grass is greener" item? | The model beats a RIASEC-only baseline |

**Ethics and law (Norway / EU):**
- **Data protection.** Profiles are personal data about personality and ability. Do a data protection impact assessment, get explicit consent, and offer full export and deletion.
- **No employer access.** Never sell or share profiles with employers. The O*NET Work Importance Locator's own user agreement prohibits using its results for hiring or screening, so a future B2B offer must exclude that module. Any employer-facing product needs its own validation for selection use.
- **No raw scores for minors.** If Lane ever serves users under 18, show interests and exploration, not ability percentiles.

---

## 10. What this battery cannot do

- **It cannot give certainty.** Even a strong battery explains a modest share of the differences in career outcomes. Most of the rest comes from opportunity, effort, luck, timing and the specific job.
- **It cannot measure physical talent.** For athletic lanes, the profile can describe motivation and temperament, not whether the body is elite.
- **It measures a person at one point in time.** Interests and personality keep developing through the twenties. Recommend re-taking interests and values every year.
- **It cannot replace trying.** That is the point of sprints. The profile is a well-informed hypothesis. Sprints test it.

---

## 11. Licensing and attribution checklist

- [ ] Register as an O*NET developer at https://www.onetcenter.org/register.
- [ ] Show the O*NET attribution text (in `items/03_…json`) wherever O*NET-derived content or results appear, with a link to https://www.onetcenter.org/license_tools.html.
- [ ] Use "O*NET" with the ® symbol and only as an adjective ("O*NET Interest Profiler").
- [ ] State that Lane modified the content and that USDOL/ETA has not endorsed the modifications (we use a 5-point scale and add extension items, which falls under the Developer License).
- [ ] Cite IPIP sources on the method page. No permission is required, but citation is good practice.
- [ ] Do not copy ICAR, STEU/STEM, DOSPERT, NEO, MBTI or any other proprietary item content.
- [ ] Get a short legal review of the above before launch. This blueprint is not legal advice.

---

## References

- Beaty, R. E., & Johnson, D. R. (2021). Automating creativity assessment with SemDis: An open platform for computing semantic distance. *Behavior Research Methods, 53*, 757–780. https://osf.io/gz4fc/
- Blais, A.-R., & Weber, E. U. (2006). A Domain-Specific Risk-Taking (DOSPERT) scale for adult populations. *Judgment and Decision Making, 1*, 33–47. https://depot.erudit.org/id/002843dd
- Condon, D. M., & Revelle, W. (2014). The International Cognitive Ability Resource: Development and initial validation of a public-domain measure. *Intelligence, 43*, 52–64.
- Connelly, B. S., & Ones, D. S. (2010). An other perspective on personality: Meta-analytic integration of observers' accuracy and predictive validity. *Psychological Bulletin, 136*, 1092–1122.
- Credé, M., Tynan, M. C., & Harms, P. D. (2017). Much ado about grit: A meta-analytic synthesis of the grit literature. *Journal of Personality and Social Psychology, 113*, 492–511.
- Curran, P. G. (2016). Methods for the detection of carelessly invalid responses in survey data. *Journal of Experimental Social Psychology, 66*, 4–19.
- Donnellan, M. B., Oswald, F. L., Baird, B. M., & Lucas, R. E. (2006). The Mini-IPIP scales: Tiny-yet-effective measures of the Big Five factors of personality. *Psychological Assessment, 18*, 192–203.
- Hoff, K. A., Song, Q. C., Wee, C. J. M., Phan, W. M. J., & Rounds, J. (2020). Interest fit and job satisfaction: A systematic review and meta-analysis. *Journal of Vocational Behavior, 123*, 103503.
- Huang, J. L., Curran, P. G., Keeney, J., Poposki, E. M., & DeShon, R. P. (2012). Detecting and deterring insufficient effort responding to surveys. *Journal of Business and Psychology, 27*, 99–114.
- IPIP permission statement: https://ipip.ori.org/newPermission.htm
- Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. *Journal of Research in Personality, 51*, 78–89.
- Lejuez, C. W., et al. (2002). Evaluation of a behavioral measure of risk taking: The Balloon Analogue Risk Task (BART). *Journal of Experimental Psychology: Applied, 8*, 75–84.
- MacCann, C., & Roberts, R. D. (2008). New paradigms for assessing emotional intelligence: Theory and data. *Emotion, 8*, 540–551.
- O*NET Career Exploration Tools license: https://www.onetcenter.org/license_tools.html
- O*NET Interest Profiler: https://www.onetcenter.org/IP.html
- O*NET Work Importance Locator (archived): https://www.onetcenter.org/reports/WIL_Archive.html
- Oh, I.-S., Wang, G., & Mount, M. K. (2011). Validity of observer ratings of the five-factor model of personality traits: A meta-analysis. *Journal of Applied Psychology, 96*, 762–773.
- Sackett, P. R., Zhang, C., Berry, C. M., & Lievens, F. (2022). Revisiting meta-analytic estimates of validity in personnel selection: Addressing systematic overcorrection for restriction of range. *Journal of Applied Psychology, 107*, 2040–2068.
- Sibley, C. G., et al. (2011). The Mini-IPIP6: Validation and extension of a short measure of the Big-Six factors of personality in New Zealand. *New Zealand Journal of Psychology, 40*, 142–159.

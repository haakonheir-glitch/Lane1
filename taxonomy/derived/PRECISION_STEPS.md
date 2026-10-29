# Precision pass, step by step: the six test profiles

Generated 2026-10-29. The test profiles are read as population percentiles (synthetic.ts, specAs "percentile"): the same people under each step's rules. Each step is added on top of the previous one, starting from v2-0.4: v2-0.4 (before) → 1. Norms only → 2. + values (order statistics) → 3. + environment cap → 4. + weights → 5. + ensemble (= v2-0.5). 500 draws each. Bands in the lists: S strong, P possible, U unlikely. Fit is the expected fulfilment fit (50 = the person's average career path).

## Investigative / conventional analyst

| Step | Strong / possible / unlikely | Archetype blend (top two) | Environment dimensions capped |
|---|---|---|---|
| v2-0.4 (before) | 20 / 127 / 58 | Scout 63.6%, Gatherer 15.8% | no cap |
| 1. Norms only | 20 / 121 / 64 | Scout 65.3%, Gatherer 17% | no cap |
| 2. + values (order statistics) | 20 / 121 / 64 | Scout 65.3%, Gatherer 17% (tentative) | no cap |
| 3. + environment cap | 21 / 125 / 59 | Scout 65.3%, Gatherer 17% (tentative) | social 39→15%, competition 27→15%, variety 15→15% |
| 4. + weights | 21 / 120 / 64 | Scout 65.3%, Gatherer 17% (tentative) | social 20→15% |
| 5. + ensemble (= v2-0.5) | 20 / 127 / 58 | Scout 65.3%, Gatherer 17% (tentative) | social 20→15% |

**Top 15 at each step**

| # | v2-0.4 (before) | 1. Norms only | 2. + values (order statistics) | 3. + environment cap | 4. + weights | 5. + ensemble (= v2-0.5) |
|---|---|---|---|---|---|---|
| 1 | Data science & statistics (S, 64.8) | Data science & statistics (S, 64.6) | Physics, chemistry & mathematics (S, 64.8) | Data science & statistics (S, 63.9) | Data science & statistics (S, 65.6) | Data science & statistics (S, 65.3) |
| 2 | Data analysis & business intelligence (S, 63.6) | Data analysis & business intelligence (S, 64.3) | Data science & statistics (S, 64.7) | Physics, chemistry & mathematics (S, 63.9) | Data analysis & business intelligence (S, 64.8) | Data analysis & business intelligence (S, 64.5) |
| 3 | Software engineering (S, 63.2) | Physics, chemistry & mathematics (S, 64.3) | GIS & geospatial analysis (S, 64.3) | Data analysis & business intelligence (S, 63.5) | Physics, chemistry & mathematics (S, 64.6) | Enterprise systems & IT consulting (S, 64.4) |
| 4 | Data engineering & databases (S, 63.1) | GIS & geospatial analysis (S, 64) | Data analysis & business intelligence (S, 64) | Enterprise systems & IT consulting (S, 63.5) | Enterprise systems & IT consulting (S, 64.3) | Physics, chemistry & mathematics (S, 64.4) |
| 5 | Enterprise systems & IT consulting (S, 63) | Data engineering & databases (S, 63.7) | Data engineering & databases (S, 63.5) | Software engineering (S, 63.3) | Software engineering (S, 64.3) | Software engineering (S, 64.2) |
| 6 | Life sciences & biotech (S, 63) | Earth, ocean & climate sciences (S, 63.3) | Embedded & hardware-near software (S, 63.5) | Embedded & hardware-near software (S, 63) | Data engineering & databases (S, 64.2) | Life sciences & biotech (S, 64.1) |
| 7 | Physics, chemistry & mathematics (S, 63) | Quantitative finance (S, 63.2) | Earth, ocean & climate sciences (S, 63.4) | Quantitative finance (S, 63) | Life sciences & biotech (S, 64.1) | Data engineering & databases (S, 63.9) |
| 8 | UX research (S, 62.9) | Embedded & hardware-near software (S, 63.1) | Software engineering (S, 63.4) | DevOps, cloud & site reliability (S, 62.9) | DevOps, cloud & site reliability (S, 63.8) | DevOps, cloud & site reliability (S, 63.8) |
| 9 | GIS & geospatial analysis (S, 62.8) | Software engineering (S, 63.1) | Life sciences & biotech (S, 63.1) | Life sciences & biotech (S, 62.9) | GIS & geospatial analysis (S, 63.6) | Embedded & hardware-near software (S, 63.4) |
| 10 | Game development (S, 62.6) | Enterprise systems & IT consulting (S, 62.8) | DevOps, cloud & site reliability (S, 62.9) | Data engineering & databases (S, 62.7) | Earth, ocean & climate sciences (S, 63.5) | Earth, ocean & climate sciences (S, 63.3) |
| 11 | Machine learning & AI engineering (S, 62.4) | Life sciences & biotech (S, 62.8) | Enterprise systems & IT consulting (S, 62.7) | GIS & geospatial analysis (S, 62.7) | Embedded & hardware-near software (S, 63.5) | Quantitative finance (S, 63.3) |
| 12 | Embedded & hardware-near software (S, 62.3) | DevOps, cloud & site reliability (S, 62.7) | Quantitative finance (S, 62.5) | Earth, ocean & climate sciences (S, 62.5) | Quantitative finance (S, 63.4) | Software testing & quality assurance (S, 63.3) |
| 13 | Quantitative finance (S, 62.2) | Payments, fintech & crypto operations (S, 62.3) | Software testing & quality assurance (S, 62.5) | Software testing & quality assurance (S, 62.4) | Software testing & quality assurance (S, 63.3) | Machine learning & AI engineering (S, 63.2) |
| 14 | Software testing & quality assurance (S, 62.2) | Urban & transport planning (S, 62.3) | Urban & transport planning (S, 62.4) | Payments, fintech & crypto operations (S, 61.9) | Machine learning & AI engineering (S, 63.2) | GIS & geospatial analysis (S, 63.1) |
| 15 | Earth, ocean & climate sciences (S, 62.1) | Software testing & quality assurance (S, 62.2) | Payments, fintech & crypto operations (S, 62.2) | Machine learning & AI engineering (S, 61.8) | UX research (S, 62.6) | UX research (S, 62.5) |

Of v2-0.4's top 15, 14 are still in v2-0.5's top 15.

**The inputs, anchored (v2-0.4) and as v2-0.5 reads them** (0–100, ± the 90% half-range)

| Input | v2-0.4 | how | v2-0.5 | how |
|---|---|---|---|---|
| interests.R | 39.4 ± 16.5 | anchored | 41.5 ± 20.5 | normed |
| interests.I | 83.1 ± 16.5 | anchored | 84.5 ± 10.5 | normed |
| interests.A | 47.4 ± 16.5 | anchored | 32.5 ± 17.5 | normed |
| interests.S | 37.2 ± 16.5 | anchored | 32.5 ± 18.5 | normed |
| interests.E | 36.1 ± 16.5 | anchored | 37.5 ± 22.5 | normed |
| interests.C | 65.4 ± 16.5 | anchored | 75 ± 15 | normed |
| neo.Neuroticism | 40.2 ± 12.3 | anchored | 41.5 ± 19.5 | normed |
| neo.Extraversion | 54.9 ± 12.3 | anchored | 37 ± 19 | normed |
| neo.Openness | 68.1 ± 12.3 | anchored | 58.5 ± 28.5 | normed |
| neo.Agreeableness | 68 ± 12.3 | anchored | 50 ± 24 | normed |
| neo.Conscientiousness | 78.3 ± 12.3 | anchored | 72 ± 16 | normed |
| values.Achievement | 100 ± 16.5 | ipsative | 81.2 ± 16.5 | ipsative |
| values.Independence | 90 ± 16.5 | ipsative | 67.3 ± 16.5 | ipsative |
| values.Recognition | 20 ± 16.5 | ipsative | 44.4 ± 16.5 | ipsative |
| values.Relationships | 0 ± 16.5 | ipsative | 18.8 ± 16.5 | ipsative |
| values.Support | 10 ± 16.5 | ipsative | 32.7 ± 16.5 | ipsative |
| values.Working Conditions | 70 ± 16.5 | ipsative | 55.6 ± 16.5 | ipsative |

## Social / artistic carer

| Step | Strong / possible / unlikely | Archetype blend (top two) | Environment dimensions capped |
|---|---|---|---|
| v2-0.4 (before) | 21 / 114 / 70 | Healer 66.8%, Storyteller 15.5% (tentative) | no cap |
| 1. Norms only | 19 / 121 / 65 | Healer 67.4%, Teacher 20.9% | no cap |
| 2. + values (order statistics) | 19 / 121 / 65 | Healer 67.4%, Teacher 20.9% | no cap |
| 3. + environment cap | 22 / 121 / 62 | Healer 67.4%, Teacher 20.9% | social 35→15%, conflict 11→15%, competition 13→15%, variety 16→15% |
| 4. + weights | 22 / 123 / 60 | Healer 67.4%, Teacher 20.9% | social 19→15% |
| 5. + ensemble (= v2-0.5) | 20 / 125 / 60 | Healer 67.4%, Teacher 20.9% | social 19→15% |

**Top 15 at each step**

| # | v2-0.4 (before) | 1. Norms only | 2. + values (order statistics) | 3. + environment cap | 4. + weights | 5. + ensemble (= v2-0.5) |
|---|---|---|---|---|---|---|
| 1 | Early childhood education (S, 68.7) | Early childhood education (S, 68.8) | Early childhood education (S, 67.8) | Early childhood education (S, 66.6) | Early childhood education (S, 67) | Early childhood education (S, 66.6) |
| 2 | Social work & welfare (S, 67.4) | Outdoor guiding & instruction (S, 66.9) | Outdoor guiding & instruction (S, 66.7) | Outdoor guiding & instruction (S, 65.9) | Outdoor guiding & instruction (S, 66.5) | Outdoor guiding & instruction (S, 66.2) |
| 3 | Outdoor guiding & instruction (S, 65.5) | Social work & welfare (S, 66.8) | Social work & welfare (S, 66.1) | Childcare (S, 65.4) | Childcare (S, 66.1) | Childcare (S, 66) |
| 4 | Mental health & psychology (S, 65.3) | Childcare (S, 65.8) | Childcare (S, 65.3) | Coaching (S, 64.3) | Social work & welfare (S, 65.8) | Social work & welfare (S, 65.5) |
| 5 | Childcare (S, 64.9) | Elder & disability care (S, 65) | Coaching (S, 64.5) | Social work & welfare (S, 64.2) | Coaching (S, 65.4) | Coaching (S, 65.3) |
| 6 | Nursing & midwifery (S, 64.7) | Coaching (S, 64.7) | Elder & disability care (S, 64.2) | School teaching (S, 63.8) | Tutoring & language teaching (S, 64.9) | Tutoring & language teaching (S, 64.9) |
| 7 | Coaching (S, 64.5) | Mental health & psychology (S, 64.1) | Mental health & psychology (S, 63.8) | Vocational & specialist instruction (S, 63.7) | School teaching (S, 64.6) | Mental health & psychology (S, 64.5) |
| 8 | Elder & disability care (S, 64.2) | School teaching (S, 64) | School teaching (S, 63.8) | Religious & spiritual work (S, 63.6) | Mental health & psychology (S, 64.5) | School teaching (S, 64.5) |
| 9 | School teaching (S, 64) | Nursing & midwifery (S, 63.7) | Vocational & specialist instruction (S, 63.5) | Elder & disability care (S, 63.5) | Vocational & specialist instruction (S, 64.3) | Vocational & specialist instruction (S, 64.3) |
| 10 | Tutoring & language teaching (S, 63.1) | Vocational & specialist instruction (S, 63.5) | Tutoring & language teaching (S, 63.2) | Tutoring & language teaching (S, 63.4) | Elder & disability care (S, 64.2) | Elder & disability care (S, 64) |
| 11 | Learning & development (S, 62.5) | Tutoring & language teaching (S, 63.2) | Religious & spiritual work (S, 62.9) | Mental health & psychology (S, 63.2) | Religious & spiritual work (S, 64) | Religious & spiritual work (S, 63.9) |
| 12 | Dance (S, 62.1) | Fitness & wellness coaching (S, 62.6) | Nursing & midwifery (S, 62.7) | Courses, digital products & communities (S, 61.4) | Courses, digital products & communities (S, 62.8) | Courses, digital products & communities (S, 62.9) |
| 13 | Rehabilitation & allied health (S, 62) | Learning & development (S, 62.5) | Learning & development (S, 62.1) | Fitness & wellness coaching (S, 61.4) | Nursing & midwifery (S, 62.1) | Nursing & midwifery (S, 61.9) |
| 14 | Vocational & specialist instruction (S, 61.9) | Religious & spiritual work (S, 62.5) | Fitness & wellness coaching (S, 62) | Learning & development (S, 61.3) | Learning & development (S, 61.9) | Learning & development (S, 61.7) |
| 15 | Translation & interpreting (S, 61.6) | Tourism & travel (S, 62.4) | Dance (S, 61.5) | Complementary therapies (S, 60.8) | Fitness & wellness coaching (S, 61.7) | Fitness & wellness coaching (S, 61.5) |

Of v2-0.4's top 15, 12 are still in v2-0.5's top 15.

**The inputs, anchored (v2-0.4) and as v2-0.5 reads them** (0–100, ± the 90% half-range)

| Input | v2-0.4 | how | v2-0.5 | how |
|---|---|---|---|---|
| interests.R | 30.4 ± 16.5 | anchored | 28.5 ± 17.5 | normed |
| interests.I | 51.7 ± 16.5 | anchored | 41.5 ± 19.5 | normed |
| interests.A | 75.6 ± 16.5 | anchored | 72 ± 16 | normed |
| interests.S | 80.6 ± 16.5 | anchored | 88.5 ± 8.5 | normed |
| interests.E | 38.8 ± 16.5 | anchored | 42 ± 23 | normed |
| interests.C | 39.7 ± 16.5 | anchored | 36.5 ± 18.5 | normed |
| neo.Neuroticism | 44.4 ± 12.3 | anchored | 50 ± 20 | normed |
| neo.Extraversion | 65.1 ± 12.3 | anchored | 60.5 ± 19.5 | normed |
| neo.Openness | 70.2 ± 12.3 | anchored | 63 ± 27 | normed |
| neo.Agreeableness | 78.5 ± 12.3 | anchored | 75.5 ± 17.5 | normed |
| neo.Conscientiousness | 68.5 ± 12.3 | anchored | 50 ± 20 | normed |
| values.Achievement | 40.3 ± 16.5 | ipsative | 55.6 ± 16.5 | ipsative |
| values.Independence | 16.1 ± 16.5 | ipsative | 32.7 ± 16.5 | ipsative |
| values.Recognition | 0 ± 16.5 | ipsative | 18.8 ± 16.5 | ipsative |
| values.Relationships | 100 ± 16.5 | ipsative | 81.2 ± 16.5 | ipsative |
| values.Support | 64.5 ± 16.5 | ipsative | 67.3 ± 16.5 | ipsative |
| values.Working Conditions | 24.2 ± 16.5 | ipsative | 44.4 ± 16.5 | ipsative |

## Realistic maker

| Step | Strong / possible / unlikely | Archetype blend (top two) | Environment dimensions capped |
|---|---|---|---|
| v2-0.4 (before) | 16 / 125 / 64 | Maker 64.4%, Scout 7.8% | no cap |
| 1. Norms only | 16 / 124 / 65 | Maker 94%, Scout 1.7% | no cap |
| 2. + values (order statistics) | 18 / 123 / 64 | Maker 94%, Scout 1.7% | no cap |
| 3. + environment cap | 18 / 122 / 65 | Maker 94%, Scout 1.7% | autonomy 16→15%, social 27→15%, conflict 8→15%, competition 27→15% |
| 4. + weights | 21 / 114 / 70 | Maker 94%, Scout 1.7% | social 16→15% |
| 5. + ensemble (= v2-0.5) | 15 / 122 / 68 | Maker 94%, Scout 1.7% | social 16→15% |

**Top 15 at each step**

| # | v2-0.4 (before) | 1. Norms only | 2. + values (order statistics) | 3. + environment cap | 4. + weights | 5. + ensemble (= v2-0.5) |
|---|---|---|---|---|---|---|
| 1 | Ceramics, glass & instrument making (S, 62.9) | Ceramics, glass & instrument making (S, 64.6) | Industrial maintenance & technical service (S, 63.5) | Ceramics, glass & instrument making (S, 62.9) | Ceramics, glass & instrument making (S, 63.4) | Electrical & electronics engineering (S, 63.1) |
| 2 | Electrical & electronics engineering (S, 62.6) | Electrical & electronics engineering (S, 63.6) | Restoration & decorative crafts (S, 63.5) | Electrical & electronics engineering (S, 62.9) | Electrical & electronics engineering (S, 63.4) | Ceramics, glass & instrument making (S, 63) |
| 3 | Mechanical engineering (S, 61.6) | Restoration & decorative crafts (S, 62.8) | Vehicle & machinery mechanics (S, 63.4) | Industrial maintenance & technical service (S, 62.8) | Restoration & decorative crafts (S, 63.1) | Renewable energy (S, 62.8) |
| 4 | Embedded & hardware-near software (S, 61.3) | Industrial maintenance & technical service (S, 62.5) | Ceramics, glass & instrument making (S, 63.3) | Restoration & decorative crafts (S, 62.8) | Industrial maintenance & technical service (S, 63) | Industrial maintenance & technical service (S, 62.7) |
| 5 | Restoration & decorative crafts (S, 61) | Renewable energy (S, 62.5) | Electrical & electronics engineering (S, 63.3) | Vehicle & machinery mechanics (S, 62.4) | Renewable energy (S, 62.9) | Restoration & decorative crafts (S, 62.6) |
| 6 | GIS & geospatial analysis (S, 60.9) | Vehicle & machinery mechanics (S, 62.5) | Fisheries & aquaculture (S, 62.4) | Renewable energy (S, 62) | Vehicle & machinery mechanics (S, 62.8) | Vehicle & machinery mechanics (S, 62.5) |
| 7 | Industrial maintenance & technical service (S, 60.6) | Mechanical engineering (S, 62.1) | Renewable energy (S, 62.4) | Fisheries & aquaculture (S, 61.9) | Farming & horticulture (S, 62.4) | Fisheries & aquaculture (S, 62.2) |
| 8 | Renewable energy (S, 60.3) | GIS & geospatial analysis (S, 62) | Farming & horticulture (S, 62.1) | Furniture & woodcraft (S, 61.6) | Fisheries & aquaculture (S, 62.4) | Mechanical engineering (S, 62.1) |
| 9 | Vehicle & machinery mechanics (S, 60.2) | Farming & horticulture (S, 61.9) | Welding & metal fabrication (S, 62.1) | Farming & horticulture (S, 61.5) | Mechanical engineering (S, 62.3) | Farming & horticulture (S, 62) |
| 10 | Industrial & product design (S, 59.9) | Embedded & hardware-near software (S, 61.8) | Masonry, concrete & tiling (S, 62) | Masonry, concrete & tiling (S, 61.5) | Electrician (S, 61.7) | Electrician (S, 61.5) |
| 11 | Urban & transport planning (S, 59.8) | Fisheries & aquaculture (S, 61.6) | Mechanical engineering (S, 61.9) | Mechanical engineering (S, 61.5) | Masonry, concrete & tiling (S, 61.7) | Masonry, concrete & tiling (S, 61.4) |
| 12 | Fashion & styling (S, 59.4) | Masonry, concrete & tiling (S, 61) | Furniture & woodcraft (S, 61.5) | Welding & metal fabrication (S, 61.4) | Urban & transport planning (S, 61.4) | Biomedical engineering (S, 61.2) |
| 13 | Biomedical engineering (S, 59.3) | Welding & metal fabrication (S, 60.9) | Textile, print & packaging production (S, 61.5) | Textiles, leather & upholstery (S, 61) | Plumbing, heating & refrigeration (S, 61.3) | Plumbing, heating & refrigeration (S, 61.2) |
| 14 | Physics, chemistry & mathematics (S, 59.3) | Furniture & woodcraft (S, 60.6) | GIS & geospatial analysis (S, 61.4) | Plumbing, heating & refrigeration (S, 60.9) | Biomedical engineering (S, 61.2) | Urban & transport planning (S, 61.2) |
| 15 | Earth, ocean & climate sciences (S, 59.2) | Urban & transport planning (S, 60.4) | Machine operation & assembly (S, 61.4) | Electrician (S, 60.7) | Forestry & hunting (S, 61.2) | Power grid & utilities (S, 61) |

Of v2-0.4's top 15, 9 are still in v2-0.5's top 15.

**The inputs, anchored (v2-0.4) and as v2-0.5 reads them** (0–100, ± the 90% half-range)

| Input | v2-0.4 | how | v2-0.5 | how |
|---|---|---|---|---|
| interests.R | 74.6 ± 16.5 | anchored | 89 ± 9 | normed |
| interests.I | 60 ± 16.5 | anchored | 54.5 ± 19.5 | normed |
| interests.A | 53.8 ± 16.5 | anchored | 41.5 ± 19.5 | normed |
| interests.S | 33.8 ± 16.5 | anchored | 28 ± 17 | normed |
| interests.E | 33.2 ± 16.5 | anchored | 33 ± 21 | normed |
| interests.C | 45.5 ± 16.5 | anchored | 45.5 ± 19.5 | normed |
| neo.Neuroticism | 44.4 ± 12.3 | anchored | 50 ± 20 | normed |
| neo.Extraversion | 56.8 ± 12.3 | anchored | 41 ± 20 | normed |
| neo.Openness | 62.4 ± 12.3 | anchored | 46.5 ± 29.5 | normed |
| neo.Agreeableness | 68 ± 12.3 | anchored | 50 ± 24 | normed |
| neo.Conscientiousness | 72.9 ± 12.3 | anchored | 60.5 ± 19.5 | normed |
| values.Achievement | 77.8 ± 16.5 | ipsative | 55.6 ± 16.5 | ipsative |
| values.Independence | 88.9 ± 16.5 | ipsative | 67.3 ± 16.5 | ipsative |
| values.Recognition | 0 ± 16.5 | ipsative | 18.8 ± 16.5 | ipsative |
| values.Relationships | 22.2 ± 16.5 | ipsative | 44.4 ± 16.5 | ipsative |
| values.Support | 11.1 ± 16.5 | ipsative | 32.7 ± 16.5 | ipsative |
| values.Working Conditions | 100 ± 16.5 | ipsative | 81.2 ± 16.5 | ipsative |

## Enterprising hunter

| Step | Strong / possible / unlikely | Archetype blend (top two) | Environment dimensions capped |
|---|---|---|---|
| v2-0.4 (before) | 15 / 123 / 67 | Chief 42.4%, Hunter 37.5% (tentative) | no cap |
| 1. Norms only | 21 / 112 / 72 | Hunter 54.4%, Chief 38.8% (tentative) | no cap |
| 2. + values (order statistics) | 20 / 114 / 71 | Hunter 54.4%, Chief 38.8% (tentative) | no cap |
| 3. + environment cap | 22 / 116 / 67 | Hunter 54.4%, Chief 38.8% (tentative) | autonomy 7→15%, social 21→15%, competition 47→15% |
| 4. + weights | 21 / 116 / 68 | Hunter 54.4%, Chief 38.8% (tentative) | social 10→15%, competition 28→15% |
| 5. + ensemble (= v2-0.5) | 20 / 120 / 65 | Hunter 54.4%, Chief 38.8% (tentative) | social 10→15%, competition 28→15% |

**Top 15 at each step**

| # | v2-0.4 (before) | 1. Norms only | 2. + values (order statistics) | 3. + environment cap | 4. + weights | 5. + ensemble (= v2-0.5) |
|---|---|---|---|---|---|---|
| 1 | Intellectual property (S, 64.3) | Events & experiential (S, 64.8) | Events & experiential (S, 65.9) | Events & experiential (S, 63.5) | Events & experiential (S, 64.1) | Events & experiential (S, 63.8) |
| 2 | Politics & elected office (S, 63.5) | Brand marketing (S, 64.3) | Agency & studio ownership (S, 65.3) | Politics & elected office (S, 63.3) | Politics & elected office (S, 63.9) | Politics & elected office (S, 63.6) |
| 3 | Advertising & creative agencies (S, 63.3) | Intellectual property (S, 64.2) | Brand marketing (S, 65.2) | Agency & studio ownership (S, 62.7) | Agency & studio ownership (S, 63.6) | Agency & studio ownership (S, 63.2) |
| 4 | Events & experiential (S, 63.3) | Agency & studio ownership (S, 64.1) | Politics & elected office (S, 64.8) | Brand marketing (S, 62.5) | Brand marketing (S, 63.5) | Brand marketing (S, 63) |
| 5 | PR & communications (S, 63.1) | Politics & elected office (S, 64.1) | Startup founding (S, 64.7) | B2B sales (S, 62.2) | Startup founding (S, 63) | Startup founding (S, 62.7) |
| 6 | Brand marketing (S, 62.6) | Advertising & creative agencies (S, 64) | Intellectual property (S, 64.5) | Startup founding (S, 62) | Advertising & creative agencies (S, 62.7) | Advertising & creative agencies (S, 62.3) |
| 7 | Creator services (S, 62.6) | Startup founding (S, 63.9) | Advertising & creative agencies (S, 64) | Professional sport (S, 61.5) | Creator services (S, 62.5) | Creator services (S, 62.2) |
| 8 | Startup founding (S, 62.3) | B2B sales (S, 63.8) | PR & communications (S, 64) | Advertising & creative agencies (S, 61.2) | Project & programme management (S, 62.4) | Project & programme management (S, 62.2) |
| 9 | Agency & studio ownership (S, 62.2) | PR & communications (S, 63.8) | International trade & brokerage (S, 63.9) | Account management & customer success (S, 61.1) | Intellectual property (S, 62.3) | Intellectual property (S, 61.9) |
| 10 | Project & programme management (S, 62) | Project & programme management (S, 63.8) | B2B sales (S, 63.8) | Esports (S, 61.1) | Private equity, venture & principal investing (S, 62) | Private equity, venture & principal investing (S, 61.9) |
| 11 | Law firm practice (S, 61.6) | Account management & customer success (S, 63.2) | Project & programme management (S, 63.8) | Intellectual property (S, 61.1) | Account management & customer success (S, 61.8) | General management & executive leadership (S, 61.6) |
| 12 | Wealth management & financial advice (S, 61.5) | International trade & brokerage (S, 63.2) | Account management & customer success (S, 63.6) | Project & programme management (S, 61.1) | General management & executive leadership (S, 61.6) | Account management & customer success (S, 61.5) |
| 13 | B2B sales (S, 61.2) | Creator services (S, 62.9) | Creator services (S, 63.3) | Creator services (S, 61) | Esports (S, 61.5) | Esports (S, 61.4) |
| 14 | Diplomacy & international organisations (S, 61) | Professional sport (S, 62.9) | Professional sport (S, 62.9) | Private equity, venture & principal investing (S, 60.9) | Professional sport (S, 61.3) | Wealth management & financial advice (S, 61.3) |
| 15 | Account management & customer success (S, 60.6) | Esports (S, 62.7) | E-commerce (S, 62.7) | General management & executive leadership (S, 60.8) | Professional strategy games (S, 61.3) | Professional sport (S, 61.2) |

Of v2-0.4's top 15, 11 are still in v2-0.5's top 15.

**The inputs, anchored (v2-0.4) and as v2-0.5 reads them** (0–100, ± the 90% half-range)

| Input | v2-0.4 | how | v2-0.5 | how |
|---|---|---|---|---|
| interests.R | 33.6 ± 16.5 | anchored | 33 ± 19 | normed |
| interests.I | 48.8 ± 16.5 | anchored | 36.5 ± 18.5 | normed |
| interests.A | 50.7 ± 16.5 | anchored | 36.5 ± 18.5 | normed |
| interests.S | 54.7 ± 16.5 | anchored | 59 ± 20 | normed |
| interests.E | 72.8 ± 16.5 | anchored | 88 ± 10 | normed |
| interests.C | 45.5 ± 16.5 | anchored | 45.5 ± 19.5 | normed |
| neo.Neuroticism | 34.7 ± 12.3 | anchored | 31 ± 17 | normed |
| neo.Extraversion | 74.1 ± 12.3 | anchored | 78.5 ± 14.5 | normed |
| neo.Openness | 64.1 ± 12.3 | anchored | 50 ± 29 | normed |
| neo.Agreeableness | 65.4 ± 12.3 | anchored | 43.5 ± 23.5 | normed |
| neo.Conscientiousness | 68.5 ± 12.3 | anchored | 50 ± 20 | normed |
| values.Achievement | 89.7 ± 16.5 | ipsative | 67.3 ± 16.5 | ipsative |
| values.Independence | 51.7 ± 16.5 | ipsative | 55.6 ± 16.5 | ipsative |
| values.Recognition | 100 ± 16.5 | ipsative | 81.2 ± 16.5 | ipsative |
| values.Relationships | 25.9 ± 16.5 | ipsative | 44.4 ± 16.5 | ipsative |
| values.Support | 0 ± 16.5 | ipsative | 18.8 ± 16.5 | ipsative |
| values.Working Conditions | 17.2 ± 16.5 | ipsative | 32.7 ± 16.5 | ipsative |

## Artistic storyteller

| Step | Strong / possible / unlikely | Archetype blend (top two) | Environment dimensions capped |
|---|---|---|---|
| v2-0.4 (before) | 19 / 115 / 71 | Storyteller 93.9%, Healer 1.6% | no cap |
| 1. Norms only | 19 / 117 / 69 | Storyteller 91.7%, Teacher 3.1% | no cap |
| 2. + values (order statistics) | 19 / 119 / 67 | Storyteller 91.7%, Teacher 3.1% | no cap |
| 3. + environment cap | 18 / 123 / 64 | Storyteller 91.7%, Teacher 3.1% | autonomy 29→15%, social 8→15%, precision 8→15%, variety 26→15% |
| 4. + weights | 19 / 117 / 69 | Storyteller 91.7%, Teacher 3.1% | autonomy 16→15% |
| 5. + ensemble (= v2-0.5) | 19 / 121 / 65 | Storyteller 91.7%, Teacher 3.1% | autonomy 16→15% |

**Top 15 at each step**

| # | v2-0.4 (before) | 1. Norms only | 2. + values (order statistics) | 3. + environment cap | 4. + weights | 5. + ensemble (= v2-0.5) |
|---|---|---|---|---|---|---|
| 1 | Animation, VFX & 3D (S, 66.5) | Content creation (S, 66.2) | Animation, VFX & 3D (S, 66.2) | Comedy (S, 65.6) | Music performance (S, 68) | Music performance (S, 68) |
| 2 | Content creation (S, 66.2) | Animation, VFX & 3D (S, 66) | Content creation (S, 66.2) | Music performance (S, 65.6) | Animation, VFX & 3D (S, 67.6) | Comedy (S, 67.6) |
| 3 | Journalism (S, 65.7) | Courses, digital products & communities (S, 66) | Music performance (S, 65.9) | Animation, VFX & 3D (S, 64.9) | Comedy (S, 67.6) | Animation, VFX & 3D (S, 67.4) |
| 4 | Courses, digital products & communities (S, 65.4) | Music performance (S, 65.7) | Courses, digital products & communities (S, 65.5) | Courses, digital products & communities (S, 64.8) | Content creation (S, 67.3) | Content creation (S, 66.8) |
| 5 | Writing & authorship (S, 65.3) | Writing & authorship (S, 65.1) | Comedy (S, 65) | Acting (S, 64.7) | Dance (S, 66.8) | Dance (S, 66.7) |
| 6 | Music performance (S, 65.1) | Journalism (S, 64.9) | Journalism (S, 64.7) | Dance (S, 64.1) | Courses, digital products & communities (S, 66.7) | Courses, digital products & communities (S, 66.6) |
| 7 | Hosting & broadcasting (S, 63.9) | Comedy (S, 64.2) | Writing & authorship (S, 64.5) | Variety & live entertainment (S, 64) | Journalism (S, 66.3) | Acting (S, 66.3) |
| 8 | Tattoo & body art (S, 63.7) | Tattoo & body art (S, 64.2) | Dance (S, 64.3) | Content creation (S, 63.7) | Acting (S, 66.1) | Journalism (S, 66.1) |
| 9 | Comedy (S, 63.1) | Dance (S, 63.7) | Tattoo & body art (S, 64) | Journalism (S, 63.1) | Writing & authorship (S, 66.1) | Hosting & broadcasting (S, 65.7) |
| 10 | Newsletters, blogs & niche publishing (S, 63.1) | Hosting & broadcasting (S, 63.7) | Hosting & broadcasting (S, 63.9) | Writing & authorship (S, 63.1) | Hosting & broadcasting (S, 65.9) | Writing & authorship (S, 65.7) |
| 11 | Dance (S, 62.9) | Newsletters, blogs & niche publishing (S, 62.9) | Acting (S, 63.4) | Tattoo & body art (S, 62.8) | Tattoo & body art (S, 65.2) | Variety & live entertainment (S, 65.5) |
| 12 | Tutoring & language teaching (S, 62) | Acting (S, 62.8) | Newsletters, blogs & niche publishing (S, 62.6) | Hosting & broadcasting (S, 62.5) | Variety & live entertainment (S, 65.2) | Tattoo & body art (S, 65) |
| 13 | Acting (S, 61.8) | Tutoring & language teaching (S, 62.2) | Creator services (S, 62.5) | Interior design (S, 61.7) | Interior design (S, 63.7) | Interior design (S, 63.7) |
| 14 | Advertising & creative agencies (S, 61.5) | Creator services (S, 62) | Variety & live entertainment (S, 62.3) | Music production & industry (S, 61.4) | Creator services (S, 63.2) | Music production & industry (S, 63.2) |
| 15 | Music production & industry (S, 61.3) | Advertising & creative agencies (S, 61.9) | Advertising & creative agencies (S, 62.1) | Tutoring & language teaching (S, 61.3) | Music production & industry (S, 63.2) | Creator services (S, 63) |

Of v2-0.4's top 15, 12 are still in v2-0.5's top 15.

**The inputs, anchored (v2-0.4) and as v2-0.5 reads them** (0–100, ± the 90% half-range)

| Input | v2-0.4 | how | v2-0.5 | how |
|---|---|---|---|---|
| interests.R | 33.6 ± 16.5 | anchored | 33 ± 19 | normed |
| interests.I | 54.5 ± 16.5 | anchored | 45.5 ± 19.5 | normed |
| interests.A | 96.3 ± 16.5 | anchored | 91.5 ± 6.5 | normed |
| interests.S | 51.8 ± 16.5 | anchored | 54.5 ± 20.5 | normed |
| interests.E | 44 ± 16.5 | anchored | 50 ± 24 | normed |
| interests.C | 31.1 ± 16.5 | anchored | 25 ± 15 | normed |
| neo.Neuroticism | 44.4 ± 12.3 | anchored | 50 ± 20 | normed |
| neo.Extraversion | 62.4 ± 12.3 | anchored | 54.5 ± 20.5 | normed |
| neo.Openness | 77.7 ± 12.3 | anchored | 77.5 ± 19.5 | normed |
| neo.Agreeableness | 68 ± 12.3 | anchored | 50 ± 24 | normed |
| neo.Conscientiousness | 66.6 ± 12.3 | anchored | 45.5 ± 19.5 | normed |
| values.Achievement | 74.6 ± 16.5 | ipsative | 67.3 ± 16.5 | ipsative |
| values.Independence | 100 ± 16.5 | ipsative | 81.2 ± 16.5 | ipsative |
| values.Recognition | 55.6 ± 16.5 | ipsative | 55.6 ± 16.5 | ipsative |
| values.Relationships | 31.7 ± 16.5 | ipsative | 44.4 ± 16.5 | ipsative |
| values.Support | 0 ± 16.5 | ipsative | 18.8 ± 16.5 | ipsative |
| values.Working Conditions | 7.9 ± 16.5 | ipsative | 32.7 ± 16.5 | ipsative |

## Flat profile

| Step | Strong / possible / unlikely | Archetype blend (top two) | Environment dimensions capped |
|---|---|---|---|
| v2-0.4 (before) | 2 / 189 / 14 | Storyteller 22%, Healer 18.2% (tentative) | no cap |
| 1. Norms only | 0 / 205 / 0 | Hunter 11.1%, Scout 11.1% (tentative) | no cap |
| 2. + values (order statistics) | 0 / 205 / 0 | Hunter 11.1%, Scout 11.1% (tentative) | no cap |
| 3. + environment cap | 0 / 205 / 0 | Hunter 11.1%, Scout 11.1% (tentative) | pace 16→15% |
| 4. + weights | 0 / 205 / 0 | Hunter 11.1%, Scout 11.1% (tentative) | none over 15% |
| 5. + ensemble (= v2-0.5) | 0 / 205 / 0 | Hunter 11.1%, Scout 11.1% (tentative) | none over 15% |

**Top 15 at each step**

| # | v2-0.4 (before) | 1. Norms only | 2. + values (order statistics) | 3. + environment cap | 4. + weights | 5. + ensemble (= v2-0.5) |
|---|---|---|---|---|---|---|
| 1 | Product & UX/UI design (S, 56.5) | Childcare (P, 50.8) | Religious & spiritual work (P, 50.9) | Religious & spiritual work (P, 50.9) | Religious & spiritual work (P, 50.8) | Coaching (P, 50.8) |
| 2 | Graphic & brand design (S, 56.2) | Early childhood education (P, 50.8) | Early childhood education (P, 50.8) | Early childhood education (P, 50.8) | Sports business (P, 50.8) | Early childhood education (P, 50.8) |
| 3 | Animation, VFX & 3D (P, 55.1) | Sports business (P, 50.8) | Sports business (P, 50.8) | Vocational & specialist instruction (P, 50.8) | Arts & culture management (P, 50.7) | Religious & spiritual work (P, 50.8) |
| 4 | Mental health & psychology (P, 54.8) | Arts & culture management (P, 50.7) | Vocational & specialist instruction (P, 50.8) | Arts & culture management (P, 50.7) | Coaching (P, 50.7) | Courses, digital products & communities (P, 50.7) |
| 5 | Comedy (P, 54.6) | Coaching (P, 50.7) | Arts & culture management (P, 50.7) | Childcare (P, 50.7) | Early childhood education (P, 50.7) | Outdoor guiding & instruction (P, 50.7) |
| 6 | Journalism (P, 54.6) | Developer relations & technical writing (P, 50.7) | Childcare (P, 50.7) | Coaching (P, 50.7) | Outdoor guiding & instruction (P, 50.7) | Sports business (P, 50.7) |
| 7 | Acting (P, 54.5) | Elder & disability care (P, 50.7) | Coaching (P, 50.7) | Courses, digital products & communities (P, 50.7) | Childcare (P, 50.6) | Vocational & specialist instruction (P, 50.7) |
| 8 | Courses, digital products & communities (P, 54.5) | Field & territory sales (P, 50.7) | Courses, digital products & communities (P, 50.7) | Newsletters, blogs & niche publishing (P, 50.7) | Courses, digital products & communities (P, 50.6) | Arts & culture management (P, 50.6) |
| 9 | Dance (P, 54.4) | Modelling (P, 50.7) | Outdoor guiding & instruction (P, 50.7) | Outdoor guiding & instruction (P, 50.7) | Elder & disability care (P, 50.6) | Childcare (P, 50.6) |
| 10 | Game development (P, 54.3) | Sales operations & enablement (P, 50.7) | Newsletters, blogs & niche publishing (P, 50.6) | Sports business (P, 50.7) | Social work & welfare (P, 50.6) | Elder & disability care (P, 50.6) |
| 11 | Music performance (P, 54.3) | Acting (P, 50.6) | CRM, lifecycle & marketing operations (P, 50.5) | CRM, lifecycle & marketing operations (P, 50.5) | Vocational & specialist instruction (P, 50.6) | Learning & development (P, 50.6) |
| 12 | Tutoring & language teaching (P, 54.3) | CRM, lifecycle & marketing operations (P, 50.6) | Developer relations & technical writing (P, 50.5) | Developer relations & technical writing (P, 50.5) | Corrections (P, 50.5) | Nonprofits, NGOs & humanitarian work (P, 50.6) |
| 13 | School teaching (P, 54.2) | Furniture & woodcraft (P, 50.6) | Elder & disability care (P, 50.5) | Elder & disability care (P, 50.5) | Learning & development (P, 50.5) | Social work & welfare (P, 50.6) |
| 14 | Modelling (P, 54.1) | Vocational & specialist instruction (P, 50.6) | Field & territory sales (P, 50.5) | Field & territory sales (P, 50.5) | Newsletters, blogs & niche publishing (P, 50.5) | Consumer & direct sales (P, 50.5) |
| 15 | Translation & interpreting (P, 54.1) | Courses, digital products & communities (P, 50.5) | Learning & development (P, 50.5) | Learning & development (P, 50.5) | Nonprofits, NGOs & humanitarian work (P, 50.5) | Corrections (P, 50.5) |

Of v2-0.4's top 15, 1 are still in v2-0.5's top 15.

**The inputs, anchored (v2-0.4) and as v2-0.5 reads them** (0–100, ± the 90% half-range)

| Input | v2-0.4 | how | v2-0.5 | how |
|---|---|---|---|---|
| interests.R | 44.7 ± 16.5 | anchored | 50 ± 22 | normed |
| interests.I | 57.3 ± 16.5 | anchored | 50 ± 20 | normed |
| interests.A | 59.7 ± 16.5 | anchored | 50 ± 20 | normed |
| interests.S | 49 ± 16.5 | anchored | 50 ± 21 | normed |
| interests.E | 44 ± 16.5 | anchored | 50 ± 24 | normed |
| interests.C | 48.3 ± 16.5 | anchored | 50 ± 20 | normed |
| neo.Neuroticism | 44.4 ± 12.3 | anchored | 50 ± 20 | normed |
| neo.Extraversion | 60.6 ± 12.3 | anchored | 50 ± 21 | normed |
| neo.Openness | 64.1 ± 12.3 | anchored | 50 ± 29 | normed |
| neo.Agreeableness | 68 ± 12.3 | anchored | 50 ± 24 | normed |
| neo.Conscientiousness | 68.5 ± 12.3 | anchored | 50 ± 20 | normed |
| values.Achievement | 50 ± 16.5 | ipsative | 50 ± 16.5 | ipsative |
| values.Independence | 50 ± 16.5 | ipsative | 50 ± 16.5 | ipsative |
| values.Recognition | 50 ± 16.5 | ipsative | 50 ± 16.5 | ipsative |
| values.Relationships | 50 ± 16.5 | ipsative | 50 ± 16.5 | ipsative |
| values.Support | 50 ± 16.5 | ipsative | 50 ± 16.5 | ipsative |
| values.Working Conditions | 50 ± 16.5 | ipsative | 50 ± 16.5 | ipsative |


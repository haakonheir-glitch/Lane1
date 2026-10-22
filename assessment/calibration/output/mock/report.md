# Calibration report — MOCK (no model was called; numbers are made up)

- Model asked: `mock`; prompt version v1; 2026-10-22
- Answers served by: `mock` × 240
- Model calls this run: 0 (cached answers are reused and cost nothing); cost this run: $0.00
- Failed calls (dropped after retries): 0

How to read this: for each task and level, **average** is the estimated chance that an average person (50th percentile, θ = 0) gets an item right; **−1 SD** and **+1 SD** are the 16th and 84th percentiles. b is difficulty on that same SD scale (the ability with a 50% chance above guessing); a is how sharply the item separates people. These are provisional estimates, not human data.

## Summary of flags

- Calls disagree (IQR of p50 > 0.25): 0 configuration(s)
- Level not clearly separated from the one below: 1 configuration(s)
- Details in the task tables below.

## matrix

| activeRules | −1 SD | average | +1 SD | a | b | se(b) | sd(b) within | calls | IQR p50 | flags |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 78% | **91%** | 97% | 1.06 | -2.02 | 0.06 | 0.06 | 12 | 0.03 | – |
| 2 | 51% | **74%** | 89% | 1.10 | -0.78 | 0.04 | 0.09 | 12 | 0.08 | – |
| 3 | 33% | **54%** | 77% | 1.11 | 0.08 | 0.04 | 0.12 | 12 | 0.05 | – |
| 4 | 19% | **30%** | 50% | 1.12 | 1.26 | 0.06 | 0.09 | 12 | 0.07 | – |

## number_series

| level | −1 SD | average | +1 SD | a | b | se(b) | sd(b) within | calls | IQR p50 | flags |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 63% | **82%** | 93% | 1.10 | -1.13 | 0.04 | 0.11 | 12 | 0.03 | – |
| 2 | 56% | **75%** | 88% | 0.98 | -0.82 | 0.03 | 0.10 | 12 | 0.02 | – |
| 3 | 41% | **62%** | 82% | 1.13 | -0.09 | 0.05 | 0.09 | 12 | 0.02 | – |
| 4 | 33% | **48%** | 69% | 1.07 | 0.56 | 0.03 | 0.09 | 12 | 0.02 | – |

## letter_series

| level | −1 SD | average | +1 SD | a | b | se(b) | sd(b) within | calls | IQR p50 | flags |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 65% | **81%** | 91% | 0.92 | -1.25 | 0.05 | 0.10 | 12 | 0.03 | – |
| 2 | 45% | **65%** | 83% | 1.07 | -0.24 | 0.05 | 0.10 | 12 | 0.02 | – |
| 3 | 39% | **57%** | 77% | 1.05 | 0.13 | 0.04 | 0.09 | 12 | 0.04 | – |

## quant

| level | −1 SD | average | +1 SD | a | b | se(b) | sd(b) within | calls | IQR p50 | flags |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 65% | **84%** | 94% | 1.17 | -1.10 | 0.04 | 0.09 | 12 | 0.05 | – |
| 2 | 49% | **70%** | 87% | 1.14 | -0.36 | 0.07 | 0.09 | 12 | 0.06 | – |
| 3 | 40% | **55%** | 73% | 1.00 | 0.42 | 0.02 | 0.09 | 12 | 0.01 | – |
| 4 | 34% | **48%** | 69% | 1.17 | 0.70 | 0.04 | 0.09 | 12 | 0.04 | – |

## rotation2d

| cellsN | −1 SD | average | +1 SD | a | b | se(b) | sd(b) within | calls | IQR p50 | flags |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 5 | 46% | **69%** | 87% | 1.14 | -0.46 | 0.03 | 0.09 | 12 | 0.03 | ⚠ difficulty adjusted to keep levels in order (b -0.46 → -0.46) |
| 6 | 46% | **69%** | 86% | 1.11 | -0.46 | 0.05 | 0.11 | 12 | 0.05 | ⚠ difficulty adjusted to keep levels in order (b -0.47 → -0.46)<br>⚠ not clearly separated from level 5 (Δb = 0.00, needs > 0.11) |
| 7 | 37% | **56%** | 77% | 1.06 | 0.09 | 0.02 | 0.07 | 12 | 0.02 | – |
| 8 | 29% | **45%** | 66% | 1.04 | 0.66 | 0.03 | 0.09 | 12 | 0.03 | – |

## Span and speed norms

| task | mean | SD | confidence | Claude's estimate | sources |
|---|---:|---:|---|---|---|
| backward_digits | 5.26 | 1.20 | low | 5.26 / 1.20 | Expert estimate by mock (median of 3 calls). |
| corsi | 5.95 | 1.26 | moderate | 5.38 / 1.15 | Kessels, R. P. C., van Zandvoort, M. J. E., Postma, A., Kappelle, L. J., & de Haan, E. H. F. (2000). The Corsi Block-Tapping Task: standardization and normative data. Applied Neuropsychology, 7(4), 252–258. Healthy adults. Weight 0.7. Expert estimate by mock (median of 3 calls), weight 0.3. |
| symbol_match | 36.69 | 8.29 | low | 36.69 / 8.29 | Expert estimate by mock (median of 3 calls). |
| choice_rt | 493.20 | 71.61 | low | 493.20 / 71.61 | Expert estimate by mock (median of 3 calls). |

choice_rt is a median reaction time in ms: lower is faster. Balloon and delay discounting are excluded: they measure styles, not abilities.

## Appendix: one item per configuration, as the model saw it

### matrix, level 1 (`MAT-1-910100`)

```
Task: a 3×3 grid of figures follows rules across rows and columns; the bottom-right cell is missing. Choose which of 8 options completes the grid.
Shapes are drawn in black: 'empty' is an outline, 'striped' is diagonal hatching, 'solid' is filled. Several figures in one cell are laid out side by side.

Grid:
  Row 1, column 1: 3 solid arrows rotated 90°
  Row 1, column 2: 3 solid arrows rotated 315°
  Row 1, column 3: 3 solid arrows rotated 135°
  Row 2, column 1: 3 solid arrows rotated 135°
  Row 2, column 2: 3 solid arrows rotated 90°
  Row 2, column 3: 3 solid arrows rotated 315°
  Row 3, column 1: 3 solid arrows rotated 315°
  Row 3, column 2: 3 solid arrows rotated 135°
  Row 3, column 3: ?  (missing)

Options:
  A. 3 solid arrows rotated 90°
  B. 1 solid arrow rotated 135°
  C. 3 solid pentagons rotated 135°
  D. 3 solid pentagons rotated 90°
  E. 1 solid pentagon rotated 90°
  F. 1 solid arrow rotated 90°
  G. 1 solid pentagon rotated 135°
  H. 3 solid arrows rotated 135°

Correct answer: A
Time limit: 60 seconds (a countdown is visible; unanswered items count as wrong).
```

### matrix, level 2 (`MAT-2-910200`)

```
Task: a 3×3 grid of figures follows rules across rows and columns; the bottom-right cell is missing. Choose which of 8 options completes the grid.
Shapes are drawn in black: 'empty' is an outline, 'striped' is diagonal hatching, 'solid' is filled. Several figures in one cell are laid out side by side.

Grid:
  Row 1, column 1: 1 striped arrow rotated 90°
  Row 1, column 2: 1 empty (outline only) triangle rotated 90°
  Row 1, column 3: 1 solid circle rotated 90°
  Row 2, column 1: 1 empty (outline only) circle rotated 90°
  Row 2, column 2: 1 solid arrow rotated 90°
  Row 2, column 3: 1 striped triangle rotated 90°
  Row 3, column 1: 1 solid triangle rotated 90°
  Row 3, column 2: 1 striped circle rotated 90°
  Row 3, column 3: ?  (missing)

Options:
  A. 2 empty (outline only) triangles rotated 90°
  B. 1 empty (outline only) triangle rotated 90°
  C. 2 empty (outline only) arrows rotated 90°
  D. 2 striped arrows rotated 90°
  E. 1 empty (outline only) arrow rotated 90°
  F. 2 striped triangles rotated 90°
  G. 1 striped triangle rotated 90°
  H. 1 striped arrow rotated 90°

Correct answer: E
Time limit: 75 seconds (a countdown is visible; unanswered items count as wrong).
```

### matrix, level 3 (`MAT-3-910300`)

```
Task: a 3×3 grid of figures follows rules across rows and columns; the bottom-right cell is missing. Choose which of 8 options completes the grid.
Shapes are drawn in black: 'empty' is an outline, 'striped' is diagonal hatching, 'solid' is filled. Several figures in one cell are laid out side by side.

Grid:
  Row 1, column 1: 4 empty (outline only) triangles rotated 135°
  Row 1, column 2: 4 striped pentagons rotated 180°
  Row 1, column 3: 4 solid arrows rotated 225°
  Row 2, column 1: 4 solid arrows rotated 225°
  Row 2, column 2: 4 empty (outline only) triangles rotated 270°
  Row 2, column 3: 4 striped pentagons rotated 315°
  Row 3, column 1: 4 striped pentagons rotated 135°
  Row 3, column 2: 4 solid arrows rotated 180°
  Row 3, column 3: ?  (missing)

Options:
  A. 4 empty (outline only) pentagons rotated 225°
  B. 4 solid pentagons rotated 270°
  C. 4 solid pentagons rotated 225°
  D. 4 empty (outline only) triangles rotated 225°
  E. 4 empty (outline only) triangles rotated 270°
  F. 4 solid triangles rotated 270°
  G. 4 empty (outline only) pentagons rotated 270°
  H. 4 solid triangles rotated 225°

Correct answer: D
Time limit: 90 seconds (a countdown is visible; unanswered items count as wrong).
```

### matrix, level 4 (`MAT-4-910400`)

```
Task: a 3×3 grid of figures follows rules across rows and columns; the bottom-right cell is missing. Choose which of 8 options completes the grid.
Shapes are drawn in black: 'empty' is an outline, 'striped' is diagonal hatching, 'solid' is filled. Several figures in one cell are laid out side by side.

Grid:
  Row 1, column 1: 3 empty (outline only) triangles rotated 45°
  Row 1, column 2: 2 striped arrows rotated 225°
  Row 1, column 3: 1 solid pentagon rotated 135°
  Row 2, column 1: 3 striped pentagons rotated 135°
  Row 2, column 2: 2 solid triangles rotated 45°
  Row 2, column 3: 1 empty (outline only) arrow rotated 225°
  Row 3, column 1: 4 solid arrows rotated 225°
  Row 3, column 2: 3 empty (outline only) pentagons rotated 135°
  Row 3, column 3: ?  (missing)

Options:
  A. 1 empty (outline only) triangle rotated 225°
  B. 2 empty (outline only) triangles rotated 45°
  C. 2 striped triangles rotated 45°
  D. 1 striped triangle rotated 45°
  E. 2 empty (outline only) triangles rotated 225°
  F. 2 striped triangles rotated 225°
  G. 1 striped triangle rotated 225°
  H. 1 empty (outline only) triangle rotated 45°

Correct answer: C
Time limit: 105 seconds (a countdown is visible; unanswered items count as wrong).
```

### number_series, level 1 (`NUM-1-920100`)

```
Task: a series of numbers follows a rule. Choose the next term from 5 options.

Series: 68, 64, 60, 56, 52, ?
Options:
  A. 72
  B. 48
  C. 50
  D. 44
  E. 46

Correct answer: B (48)
Time limit: 50 seconds (a countdown is visible; unanswered items count as wrong).
```

### number_series, level 2 (`NUM-2-920200`)

```
Task: a series of numbers follows a rule. Choose the next term from 5 options.

Series: 8, 10, 15, 23, 34, ?
Options:
  A. 46
  B. 49
  C. 50
  D. 72
  E. 48

Correct answer: E (48)
Time limit: 60 seconds (a countdown is visible; unanswered items count as wrong).
```

### number_series, level 3 (`NUM-3-920300`)

```
Task: a series of numbers follows a rule. Choose the next term from 5 options.

Series: 2, 7, 21, 26, 78, ?
Options:
  A. 85
  B. 82
  C. 81
  D. 83
  E. 84

Correct answer: D (83)
Time limit: 70 seconds (a countdown is visible; unanswered items count as wrong).
```

### number_series, level 4 (`NUM-4-920400`)

```
Task: a series of numbers follows a rule. Choose the next term from 5 options.

Series: 3, 6, 9, 15, 24, ?
Options:
  A. 39
  B. 33
  C. 38
  D. 41
  E. 37

Correct answer: A (39)
Time limit: 80 seconds (a countdown is visible; unanswered items count as wrong).
```

### letter_series, level 1 (`LET-1-930100`)

```
Task: a series of letters follows a rule. Choose the next term from 5 options.

Series: H, J, L, N, P, ?
Options:
  A. Q
  B. P
  C. S
  D. R
  E. T

Correct answer: D (R)
Time limit: 55 seconds (a countdown is visible; unanswered items count as wrong).
```

### letter_series, level 2 (`LET-2-930200`)

```
Task: a series of letters follows a rule. Choose the next term from 5 options.

Series: C, D, F, I, M, ?
Options:
  A. R
  B. Q
  C. S
  D. P
  E. T

Correct answer: A (R)
Time limit: 65 seconds (a countdown is visible; unanswered items count as wrong).
```

### letter_series, level 3 (`LET-3-930300`)

```
Task: a series of letters follows a rule. Choose the next term from 5 options.

Series: C, W, E, U, G, ?
Options:
  A. Q
  B. T
  C. H
  D. S
  E. R

Correct answer: D (S)
Time limit: 75 seconds (a countdown is visible; unanswered items count as wrong).
```

### quant, level 1 (`Q-1-940100`)

```
Task: a word problem, solved in the head or on paper (no calculator). Choose the answer from 4 options.

A jacket costs 80 kr. It is reduced by 20%. What is the new price in kr?
Options:
  A. 64
  B. 58
  C. 70
  D. 32

Correct answer: A (64)
Time limit: 80 seconds (a countdown is visible; unanswered items count as wrong).
```

### quant, level 2 (`Q-2-940200`)

```
Task: a word problem, solved in the head or on paper (no calculator). Choose the answer from 4 options.

4 people can paint a fence in 24 hours. How many hours would 3 people need, working at the same rate?
Options:
  A. 32
  B. 29
  C. 35
  D. 64

Correct answer: A (32)
Time limit: 100 seconds (a countdown is visible; unanswered items count as wrong).
```

### quant, level 3 (`Q-3-940300`)

```
Task: a word problem, solved in the head or on paper (no calculator). Choose the answer from 4 options.

A channel has 500 subscribers and grows by 10% every month. How many subscribers will it have after 2 months?
Options:
  A. 1210
  B. 605
  C. 545
  D. 666

Correct answer: B (605)
Time limit: 120 seconds (a countdown is visible; unanswered items count as wrong).
```

### quant, level 4 (`Q-4-940400`)

```
Task: a word problem, solved in the head or on paper (no calculator). Choose the answer from 4 options.

A bet costs 83 kr. You win 500 kr with probability 20% and nothing otherwise. What is the expected profit per bet in kr? (Negative if you lose money on average.)
Options:
  A. 17
  B. -83
  C. 417
  D. 100

Correct answer: A (17)
Time limit: 140 seconds (a countdown is visible; unanswered items count as wrong).
```

### rotation2d, level 5 (`ROT-5-950500`)

```
Task: a target shape made of 5 squares and 4 options. Exactly 2 options are the target turned around its centre; the other 2 are its mirror image turned. Select both correct options (the item counts as correct only if both are selected).
On screen, each option's grid below is displayed rotated clockwise by the angle given (angles include diagonal 45° steps). The test-taker sees only the rotated pictures, not the angles.

Target (upright):
     # .
     # #
     # .
     # .

Options:
  A. displayed rotated 225°
     . #
     # #
     . #
     . #
  B. displayed rotated 270°
     # .
     # #
     # .
     # .
  C. displayed rotated 45°
     . #
     # #
     . #
     . #
  D. displayed rotated 135°
     # .
     # #
     # .
     # .

Correct answer: B and D
Time limit: 30 seconds (a countdown is visible; unanswered items count as wrong).
```

### rotation2d, level 6 (`ROT-6-950600`)

```
Task: a target shape made of 6 squares and 4 options. Exactly 2 options are the target turned around its centre; the other 2 are its mirror image turned. Select both correct options (the item counts as correct only if both are selected).
On screen, each option's grid below is displayed rotated clockwise by the angle given (angles include diagonal 45° steps). The test-taker sees only the rotated pictures, not the angles.

Target (upright):
     # # #
     # # .
     . # .

Options:
  A. displayed rotated 45°
     # # #
     # # .
     . # .
  B. displayed rotated 135°
     # # #
     . # #
     . # .
  C. displayed rotated 270°
     # # #
     # # .
     . # .
  D. displayed rotated 90°
     # # #
     . # #
     . # .

Correct answer: A and C
Time limit: 30 seconds (a countdown is visible; unanswered items count as wrong).
```

### rotation2d, level 7 (`ROT-7-950700`)

```
Task: a target shape made of 7 squares and 4 options. Exactly 2 options are the target turned around its centre; the other 2 are its mirror image turned. Select both correct options (the item counts as correct only if both are selected).
On screen, each option's grid below is displayed rotated clockwise by the angle given (angles include diagonal 45° steps). The test-taker sees only the rotated pictures, not the angles.

Target (upright):
     # # # # #
     . . . . #
     . . . . #

Options:
  A. displayed rotated 225°
     # # # # #
     # . . . .
     # . . . .
  B. displayed rotated 45°
     # # # # #
     . . . . #
     . . . . #
  C. displayed rotated 180°
     # # # # #
     # . . . .
     # . . . .
  D. displayed rotated 135°
     # # # # #
     . . . . #
     . . . . #

Correct answer: B and D
Time limit: 30 seconds (a countdown is visible; unanswered items count as wrong).
```

### rotation2d, level 8 (`ROT-8-950800`)

```
Task: a target shape made of 8 squares and 4 options. Exactly 2 options are the target turned around its centre; the other 2 are its mirror image turned. Select both correct options (the item counts as correct only if both are selected).
On screen, each option's grid below is displayed rotated clockwise by the angle given (angles include diagonal 45° steps). The test-taker sees only the rotated pictures, not the angles.

Target (upright):
     . . . # .
     # # # # .
     . . . # #
     . . . # .

Options:
  A. displayed rotated 180°
     . # . . .
     . # # # #
     # # . . .
     . # . . .
  B. displayed rotated 45°
     . # . . .
     . # # # #
     # # . . .
     . # . . .
  C. displayed rotated 135°
     . . . # .
     # # # # .
     . . . # #
     . . . # .
  D. displayed rotated 315°
     . . . # .
     # # # # .
     . . . # #
     . . . # .

Correct answer: C and D
Time limit: 30 seconds (a countdown is visible; unanswered items count as wrong).
```

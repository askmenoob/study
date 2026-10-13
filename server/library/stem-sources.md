# STEM supplementary Library units: editorial record

Checked on 2026-09-09. Owner surface: `stem.json` and this editorial record only.

## Scope and originality

The file contains 22 original Malay (Malaysia) units: mathematics and science for d1–d6 and t1–t5. Each unit has a teaching note, a distinct reading passage with two comprehension MCQs, and a self-contained practice context with four MCQs. These are selected supplementary skills, not the complete official syllabus, an official examination, or an asserted official curriculum mapping.

`src/data/banks/mathematics.ts` and `src/data/banks/scienceHumanities.ts` were read for age progression and topic scope. Their questions and third-party passages were not copied. All names, classroom stories, quantities and observational datasets in this file were composed for these units; the datasets are instructional examples, not reported experimental findings. Primary sources below were used to check scientific principles, not as passage templates. No paid API, external AI call, production system, deployment, commit or integration file was used or changed.

Early primary content uses short sentences and concrete examples. d1 mathematics stays within ten. More abstract models are introduced later, with explicit assumptions: equal fractions of the same whole, fixed-power energy use, constant-mass Newtonian motion, and reaction rates over specified intervals.

## Coverage and progression

| Level | Mathematics | Science |
|---|---|---|
| d1 | Counting, combining and taking away within 10 | Observation, evidence and prediction |
| d2 | Tens, ones and regrouping | Germination and testing water availability |
| d3 | Equal groups, multiplication and division | Absorbency and fair comparisons |
| d4 | Same-denominator fractions of equal parts | Light obstruction and shadow size |
| d5 | Decimal place value, money and change | Closed circuits and switch states |
| d6 | Percent of a stated quantity | Average speed from distance and time |
| t1 | Balanced linear equations | Density and displacement volume |
| t2 | Cylinder volume and measurement units | Heat transfer and insulation |
| t3 | Drawing scales, unit conversion and area | Electrical power and energy |
| t4 | Quadratic roots with contextual constraints | Inertia, net force and acceleration |
| t5 | Direct and inverse variation | Average reaction rates and exposed surface area |

## Primary source checks

| Unit(s) | Primary source | Checked claims and editorial limits |
|---|---|---|
| d2 science | [University of Illinois Extension: Germination](https://web.extension.illinois.edu/gpe/case3/c3facts3.html) | Germination requires water, oxygen and suitable temperature. The note does not claim that every seed has the same light requirement; the source explicitly distinguishes seeds' light needs. |
| d3 science | [Idaho National Laboratory: Make Colorful Walking Water](https://inl.gov/content/uploads/2023/04/Make-Colorful-Walking-Water.pdf), [USGS: Capillary Action and Water](https://www.usgs.gov/water-science-school/science/capillary-action-and-water) | Water can enter small spaces between fibres in absorbent material. No numerical absorbency capacities or branded comparisons were imported from either source. |
| d4 science | [Exploratorium: Light and Shadow Explorations](https://www.exploratorium.edu/tinkering/projects/light-shadow-explorations), [Exploratorium: Colored Shadows](https://www.exploratorium.edu/snacks/colored-shadows) | An object obstructs light, and changing the light/object/screen geometry changes the shadow. The unit explicitly fixes a small light source and screen, keeps the card parallel, and changes the card distance. The larger-shadow-near-source conclusion was also checked geometrically: projected size is proportional to fixed source-screen distance divided by source-object distance. No solar-angle generalisation is made. |
| d5 science | [US Energy Information Administration: Batteries, Circuits, and Transformers](https://www.eia.gov/energyexplained/electricity/batteries-circuits-and-transformers.php) | Current requires a complete path; opening the switch interrupts the circuit and closing it completes the path. Working, compatible components are assumed. Any described physical activity uses a teacher-supervised low-voltage kit; there are no mains instructions or direct battery short-circuit instructions. |
| d6 science | [NASA Glenn: Collecting Data on Running Speeds](https://www.grc.nasa.gov/www/k-12/WindTunnel/Activities/collct_rning_spee.html) | Primary educational material supports collecting distance and elapsed-time data for average speed. The original unit uses toy vehicles rather than prescribing running. All ratios are independently calculated below; total elapsed time includes the stated stop. The search extract was accessible; a subsequent direct page open returned a retrieval error. |
| t1 science; t2 mathematics unit equivalence | [American Chemical Society: What Is Density?](https://www.acs.org/middleschoolchemistry/lessonplans/chapter3/lesson1.html), [ACS: Finding Volume—The Water Displacement Method](https://www.acs.org/middleschoolchemistry/lessonplans/chapter3/lesson2.html) | Density is mass divided by volume; a fully submerged object's displaced volume is final minus initial liquid volume; 1 mL equals 1 cm³. Water's lower meniscus is read at eye level. The authored examples exclude dissolving, absorption, trapped bubbles and spills. No material-identification density table was copied. |
| t2 science | [ACS: Heat, Temperature, and Conduction](https://www.acs.org/middleschoolchemistry/lessonplans/chapter2/lesson1.html), [US Department of Energy: Heat Transfer](https://bsesc.energy.gov/training-modules/heat-transfer), [DOE: Heat Flow](https://bsesc.energy.gov/energy-basics/heat-flow) | Net spontaneous heat transfer follows a temperature difference from warmer to cooler; conduction, convection and radiation are distinct mechanisms; insulation slows heat transfer. Temperature drop is not treated as a direct energy measurement across unlike samples. Warm-water handling in the reading belongs to the teacher; the practice requires no heating. |
| t3 science | [US Energy Information Administration: Measuring Electricity](https://www.eia.gov/energyexplained/electricity/measuring-electricity.php) | Power is measured in W/kW, energy over time in Wh/kWh; 1 kW equals 1000 W. Fixed-power energy equals power times time. Original questions distinguish power from energy and do not infer brightness or efficiency from power alone. |
| t4 science | [NASA Glenn: Newton's Laws of Motion](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/newtons-laws-of-motion/) | With zero net force, rest or constant straight-line velocity persists; for constant mass, net force equals mass times acceleration. Opposing forces are combined before applying F = ma. The unit distinguishes inertia from force and acceleration from velocity. |
| t5 science | [Monash University: Rates of Reactions](https://www.monash.edu/student-academic-success/chemistry/rates-of-chemical-reactions/rates-of-reactions), [Monash University: Factors Affecting Rates of Reaction](https://www.monash.edu/student-academic-success/chemistry/rates-of-chemical-reactions/factors-affecting-rates-of-reaction) | Progress can be measured by change in gas volume over time; interval averages use changes at both endpoints. Increased exposed surface area can increase a surface reaction's rate. Data do not equate faster rate with greater final gas volume. Only these qualitative principles were used; the factors page's inconsistent wording about the ratio 48 cm² to 24 cm² was not used. No reaction recipe or chemical mixing procedure is provided. |

Basic d1 observation language and ordinary mathematical definitions are original teaching explanations; their arithmetic does not rely on external factual data. Fair-test reasoning is limited to the stated instructional setups rather than presenting the results as universal empirical laws.

## Validation record

- Parsed as JSON and validated exactly 22 distinct `(levelId, subjectId)` pairs, with no t6 unit in this assignment.
- 22 unique stable IDs, 66 unique resource titles and 132 unique question prompts.
- Every note has four paragraphs and three key points, including teaching, a worked example and a misconception.
- Every reading has exactly two MCQs; every practice has exactly four. All 132 have four distinct options, one in-range integer answer index, a nonempty teaching explanation and a nonempty hint.
- Correct-option index distribution: 0 → 29; 1 → 35; 2 → 35; 3 → 33.
- Whitespace word counts: d1–d3 notes 61–76 and readings 53–61; d4–t5 notes 102–132 and readings 67–86. These satisfy the assigned length targets.
- Every numerical MCQ answer and worked numerical note was independently recomputed. Exact rational arithmetic and integer cents avoided floating-point rounding; quadratic roots were checked with the quadratic formula independently of the authored factorisation method. Comparison calculations and interval endpoints were also checked. The ledger below contains 137 passing checks. Distractors are intentionally not statements of correct arithmetic.
- Manual review checked the remaining conceptual answer choices, assumptions, safer classroom contexts and distinction between observation and inference. Independent review identified missing colour context in d1 science practice question 2; the practice body now explicitly states that the pictured orange fruit is jingga, so the answer requires no unseen image.

## Independent arithmetic ledger

Question numbers in the ledger are one-based within `reading` or `practice`. A numeric result for a conceptual comparison records the supporting calculation. Values in the final column are computed independently, then matched to the selected answer or worked-note claim. Unicode minus signs were normalised only for the verification comparison.

| Check | Independent calculation | Verified result |
|---|---|---|
| d1/math/reading/1 | 3+4 | 7 |
| d1/math/practice/1 | 5+3 | 8 |
| d1/math/practice/2 | 5+3-2 | 6 |
| d1/math/practice/3 | 5-3 | 2 |
| d1/math/practice/4 | 5+3 | 5 + 3 = 8 |
| d2/math/reading/1 | 3*10+8 | 38 |
| d2/math/reading/2 | divmod(38+16,10) | 5 puluh 4 sa |
| d2/math/practice/1 | 4*10 | 40 |
| d2/math/practice/2 | 47+25 | 72 |
| d2/math/practice/3 | (47+25)//10 | 7 |
| d2/math/practice/4 | 47+25-20 | 52 |
| d3/math/reading/1 | 5*4 | 5 × 4 = 20 |
| d3/math/reading/2 | (5*4)/2 | 10 |
| d3/math/practice/1 | 6*5 | 30 |
| d3/math/practice/2 | (6*5)/3 | 10 |
| d3/math/practice/3 | 3*10 | 3 × 10 = 30 |
| d3/math/practice/4 | 30/5 | 6 |
| d4/math/reading/1 | (4+3)/10 | 7/10 |
| d4/math/reading/2 | 10-4-3 | 3 |
| d4/math/practice/1 | 2 of 8 | 2/8 |
| d4/math/practice/2 | 2+3 | 5/8 |
| d4/math/practice/3 | 8-2-3 | 3/8 |
| d5/math/reading/1 | 840+385 sen | RM12.25 |
| d5/math/reading/2 | 2000-840-385 sen | RM7.75 |
| d5/math/practice/1 | 680+245 sen | RM9.25 |
| d5/math/practice/2 | 1500-680-245 sen | RM5.75 |
| d5/math/practice/3 | 680+245-900 sen | RM0.25 |
| d5/math/practice/4 | 6*100+80 | RM6.80 = 680 sen |
| d6/math/reading/1 | 25/100*80 | 20 |
| d6/math/reading/2 | 100-25-35 | 40% |
| d6/math/practice/1 | 30/100*120 | 36 |
| d6/math/practice/2 | 120-30/100*120 | 84 |
| d6/math/practice/3 | 45/120*100 | 37.5% |
| d6/math/practice/4 | 120-45 | 75 |
| t1/math/reading/1 | (38-6)/4 | 8 |
| t1/math/practice/1 | (28+7)/5 | 7 |
| t1/math/practice/3 | 18/2-3 | 6 |
| t1/math/practice/4 | 4*4+1 | 4(4) + 1 = 17, jadi betul |
| t2/math/reading/1 | 10/2 | 5 cm |
| t2/math/reading/2 | 3.14*(10/2)^2*(12/2) | 471 cm³ |
| t2/math/practice/1 | 3.14*4^2 | 50.24 cm² |
| t2/math/practice/2 | 3.14*4^2*10 | 502.4 cm³ |
| t2/math/practice/3 | 3.14*4^2*5 | 251.2 cm³ |
| t2/math/practice/4 factor | (2*4)^2/4^2 | 4 |
| t3/math/reading/1 | 6*400/100 | 24 m |
| t3/math/reading/2 | 2*(3*400/100+2*400/100) | 40 m |
| t3/math/practice/1 | 12*50/100 | 6 m |
| t3/math/practice/2 | 2*100/50 | 4 cm |
| t3/math/practice/3 | (12*50/100)*(8*50/100) | 24 m² |
| t3/math/practice/4 scale ratio | (600/100)/(600/50) | 0.5 |
| t4/math/reading/1 | positive root of x²+3x−28 via quadratic formula | 4 m |
| t4/math/reading/2 | 4*(4+3) | 4 × 7 = 28 |
| t4/math/practice/1 | roots via quadratic formula, b=-8,c=15 | 3 dan 5 |
| t4/math/practice/2 | negative root via quadratic formula, b=0,c=-9 | -3 |
| t4/math/practice/3 | positive root via quadratic formula, b=2,c=-35 | 5 cm |
| t4/math/practice/4 moved constant | subtract8 on both sides | -8 |
| t5/math/reading/1 | 20*12 | 240 |
| t5/math/reading/1 second pair | 30*8 | 240 |
| t5/math/reading/1 third pair | 40*6 | 240 |
| t5/math/reading/2 | (20*12)/60 | 4 |
| t5/math/practice/1 | 21/6 | 3.5 |
| t5/math/practice/2 | 21/6*10 | 35 |
| t5/math/practice/3 | 20*3/12 | 5 |
| t5/math/practice/4 pair | 2*12 | 24 |
| t5/math/practice/4 pair | 4*6 | 24 |
| t5/math/practice/4 pair | 8*3 | 24 |
| d3/science/practice/2 | 10-6 | 4 mL |
| d3/science/reading comparison | 12>7 | 1 |
| d4/science/reading comparison | 18>9 | 1 |
| d6/science/reading/1 red | 18/6 | 3 |
| d6/science/reading/1 blue | 18/9 | 2 |
| d6/science/practice/1 | 24/8 | 3 m/s |
| d6/science/practice/2 | 24/6-24/8 | 1 m/s |
| d6/science/practice/4 | 10/(5+5) | 1 m/s |
| d6/science/practice/3 | 2*7 | 14 m |
| t1/science/reading/1 | 48/16 | 3 g/cm³ |
| t1/science/reading/2 B | 60/30 | 2 |
| t1/science/practice/1 | 65-40 | 25 cm³ |
| t1/science/practice/2 | 65/(65-40) | 2.6 g/cm³ |
| t2/science/reading/1 insulated drop | 40-36 | 4 |
| t2/science/reading/1 uninsulated drop | 40-31 | 9 |
| t3/science/reading/1 | 12/1000*5 | 0.060 kWh |
| t3/science/reading/2 A | 12*5 | 60 |
| t3/science/reading/2 B | 20*2 | 40 |
| t3/science/practice/1 | 45/1000*4 | 0.18 kWh |
| t3/science/practice/2 | 15*120 | 1800 J |
| t3/science/practice/3 | 45/1000*2 | 0.09 kWh |
| t4/science/reading/1 | 10/2 | 5 m/s² ke kanan |
| t4/science/reading/2 Q | 10/5 | 2 |
| t4/science/practice/1 | 18-6 | 12 N ke kanan |
| t4/science/practice/2 | (18-6)/4 | 3 m/s² ke kanan |
| t5/science/reading/1 R | 40/20 | 2 |
| t5/science/reading/1 S | 25/20 | 1.25 |
| t5/science/practice/1 | 45/15 | 3 cm³/s |
| t5/science/practice/2 | (65-45)/(35-15) | 1 cm³/s |
| t5/science/practice/3 | (65-65)/(55-35) | 0 cm³/s |
| d1/math/note/add | 4+2 | 6 |
| d1/math/note/subtract | 6-1 | 5 |
| d2/math/note/sa | 7+5 | 12 |
| d2/math/note/puluh | 2+1+1 | 4 |
| d2/math/note/total | 27+15 | 42 |
| d3/math/note/repeated | sum of four groups of6 | 24 |
| d3/math/note/divide | 24/4 | 6 |
| d4/math/note/sum | 3/8+2/8 | 0.625 |
| d4/math/note/baki | 1-5/8 | 0.375 |
| d5/math/note/sen | 75+60 | 135 |
| d5/math/note/total | 475+260 sen | 735 |
| d5/math/note/baki | 1000-735 sen | 265 |
| d5/math/note/check | 735+265 sen | 1000 |
| d6/math/note/40pct | 40/100*150 | 60 |
| d6/math/note/baki | 150-60 | 90 |
| d6/math/note/10pct | 10/100*150 | 15 |
| d6/math/note/200base | 40/100*200 | 80 |
| t1/math/note/subtract | 25-4 | 21 |
| t1/math/note/solve | (25-4)/3 | 7 |
| t1/math/note/check | 3*7+4 | 25 |
| t2/math/note/area | 3.14*3^2 | 28.26 |
| t2/math/note/volume | 3.14*3^2*8 | 226.08 |
| t3/math/note/cm | 7.5*200 | 1500 |
| t3/math/note/metres | 1500/100 | 15 |
| t3/math/note/plan | 8*100/200 | 4 |
| t4/math/note/root1 | quadratic formula | 5 |
| t4/math/note/root2 | quadratic formula | 9 |
| t5/math/note/k | 4*18 | 72 |
| t5/math/note/y | 72/9 | 8 |
| d6/science/note | 12/4 | 3 |
| t1/science/note/volume | 42-30 | 12 |
| t1/science/note/density | 36/(42-30) | 3 |
| t2/science/note/drop | 42-35 | 7 |
| t3/science/note/kwh | 30/1000*4 | 0.12 |
| t3/science/note/seconds | 4*60*60 | 14400 |
| t3/science/note/joules | 30*4*60*60 | 432000 |
| t4/science/note/net | 10-4 | 6 |
| t4/science/note/acceleration | (10-4)/3 | 2 |
| t5/science/note/deltaV | 48-12 | 36 |
| t5/science/note/deltaT | 30-10 | 20 |
| t5/science/note/rate | (48-12)/(30-10) | 1.8 |

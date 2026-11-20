# Feature groups

Started 2026-11-16 by Tony's decision: **nothing is placed Free or paid until the app is done.** Judging one feature at a time is hard, because a feature is often worth something only as part of something bigger. So every feature gets a line here naming the bigger thing it belongs to, and when the app is done the free/paid line is drawn over these groups rather than over hundreds of separate features.

Rules for keeping this file:

1. **Every new feature gets its line in the same pass that builds it.** A feature in two groups is listed in its main one with "also" naming the other.
2. **No line says free, paid, or a price.** This records what belongs together, nothing more.
3. **A group can be added, split or renamed** when a new feature does not fit; say why in one line under its heading.
4. **Safety is the one fixed group.** It stays Free on every tier (P28), so it is listed for completeness and is not part of the end decision.

The draft line in `lib/paidFeatures.ts` (44 lenses, 6 parts inside screens, read off the October board) stays switched on in Dev's Free mode so there is something to look at. It is a draft, and nothing new is added to it.

## Safety (fixed, always Free)

- Life > My Meds, with interaction and timing warnings
- Life > Emergency, the emergency card
- Schedules > Meds dose reminders
- Allergy cautions wherever a food is shown
- Conditions, allergies and diet in Profile
- Insights > My Meds

## Keeping a day in hand

What a person needs so the details of daily living stop living in their head. The second audience's group.

- Home, its bands and Not Tried Yet
- The food list carried packed on a phone, unpacked on first open with a screen that says what is happening
- Food list updates arrive as a small file of only the foods that changed, applied over the list the phone holds
- The header's update cloud, with a dot on a phone when a new version has downloaded and waits for a restart
- The app's words in each language carried as separate files, so an update downloads only the words that changed
- For Testers saying on a tester's computer, as on a phone, when a new installer is ready and where to get it
- Life > To Dos, Work, Upkeep, Routines, Did I Do It, Days Until, Kitchen, Look Back
- Life > Grocery List (also Planning food for me)
- Life > Projects and Interests > Projects
- Schedules > Appointments, Upkeep, Timeline
- Capture, reminders answered on the locked phone, the Diary
- Signals > Calm
- Meds and supplements taken at the same time grouped under one reminder, opening the whole list with amounts, what to take them with, the interaction rules between them and a time to move a supplement or OTC item to, in Life > My Meds > Taken together

## My conditions in depth

The app knowing a person's conditions and reading every food against them.

- Insights > Six Dimensions and condition scores, Safe Foods, Healing Stage, Advisories, Label Check, Prep, Cooking Impact
- Food lookup's For You, per condition
- A dish's depth report, per condition and stage
- Food > ready-made recipes checked against conditions and diet
- Food > My Safe Foods
- Insights > Labs, and Trends > Labs (also My history)
- Interaction-rules engine, personal rules (also Finding my patterns)

## Food and nutrients

What is in food and what a person has eaten, apart from any condition.

- Insights > Nutrients, Nutrient Ranking, Portions, Hydration, Food Lookup
- Food > Scan Product, My Food Products, My Whole Foods
- Food > Meal Builder and the builders, Fermentation Builder, My Recipes, Import Recipe
- Meal Builder's guided questions: one dish at a time, Make a new dish in its builder and back to the meal, Use one I have, a single food as it is, then anything else such as a drink
- Schedules > Hydration
- Food first, supplements for the gap (on every nutrient reading)
- The whole-foods list every food picker reads, one food per name with near-duplicates folded in, and records kept by name following a food to its new name

## Planning food for me

The app doing the planning so eating becomes following a plan.

- Schedules > Meal Plan (up to six weeks), Meals, Today's Meals, Past Meals
- Food > Find a Meal
- Family members in the meal plan
- Meal and dose timing in Today's Meals (also Safety for the warnings themselves)

## Finding my patterns

Signals recorded, and the app looking for what tends to come before them.

- Signals > Flares, Food Reactions, New Foods and leave-it-out experiments, Bowel, Bladder, Cycle, Blood Pressure, Weight, Therapies, Microbiome, Trackers, General Note, Exercise
- Trends > Pattern Finder, Make this a rule
- Trends > Compare Two
- Morning check-in and how a bigger day landed (Pacing)

## My history over time

A person's records read back over weeks, months and years.

- Trends > Nutrients, Condition scores, What You Eat, Pacing, Doses, Reactions, Ferments, Planned against eaten, Therapy response, Keeping Up
- Trends > Your Life in Squares, and its Home band
- Reports: Overview, For Your Doctor, Nutritionist, Trainer, Looking back, Caregiver, Medical costs, Garden
- Reports saved to a remembered folder
- Insights > What to bring to an appointment

## Money

- Life > Finances
- Trends > What It Costs
- Garden > Growing Costs (also Garden)
- Interests > Money, Making It Pay
- Reports > Medical costs (also My history)

## Garden

- Garden > My Zone, Sowing Calendar, Seeds, Plots and Plantings, Upcoming Tasks, Days Until, Compost, Growing Conditions, Harvest Log, Grow Setup
- From your garden on a meal, taking it off the harvest
- Insights > what the garden adds to what you eat
- Bees and beekeeping (not built)

## Reading

The written corpus.

- Life > Conditions (all nineteen), Health Literacy, Earth Matters, Search Reading
- Garden > Horticulture and the crop guides
- Food > recipes as reading

## Interests and learning

- Interests > My Interests, Sessions, Supplies, Collections, Wish List, Library, People, Days Until
- Interests > Learn: ready-made decks, decks from records, making decks of your own
- Interests > Languages
- Inside Knowledge on Home
- Share to Lifestead

## Movement

- Life > Movement, Workouts
- Schedules > Exercise
- Effort ratings (also Finding my patterns)

## People and devices

Everything that joins one person's copy to another copy, theirs or someone else's.

- Sync between a person's own devices
- Partner link (two paid copies kept in step)
- A shared bottle: one count two partners take from, in Life > My Meds
- A bottle bought outside the United States looked up in Open Food Facts, and a bottle remembered with its med, in Life > My Meds > Look up a label
- A supplement filled in from a photo of its label, English or Spanish, in Life > My Meds
- What each database said for a scanned code (openFDA, Open Food Facts, Open Products Facts, Open Beauty Facts), in Life > My Meds > Look up a label
- Steps for saving a store's picture of a label and filling a supplement from up to four pictures, in Life > My Meds
- A medicine bought outside the United States looked up by its foreign name (RxNorm crossing to the U.S. ingredient), a Spanish box through CIMA, a Canadian box by its DIN through Health Canada's Drug Product Database, a name read from a picture, each country's limits said plainly, and a red warning that a U.S. label is not the label of a box bought elsewhere (other ingredients, strength, form), in Life > My Meds > Look up a label
- The supplement form opening with the label picture, in Life > My Meds
- Food scanner: search Open Food Facts by name with the person's country first, fill a product in from its label when nothing is found, and how to add it to Open Food Facts
- Household seats, Guardian children, Caregiver (not built)
- Sharing recipes and favourites as .is files, Connections
- The desktop app

## Privacy

- App Lock, the vault (decision U4 keeps both outside any paywall; listed here so the end decision sees them)
- How Lifestead is protected: the four choices of App Lock and the vault, and a separate vault code beside App Lock (safety, so always Free like the two it joins)

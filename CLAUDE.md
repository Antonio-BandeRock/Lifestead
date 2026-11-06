# Lifestead: Autoimmune Food & Health App (Project Brief)

> **STOP AND READ FIRST: this project has TWO separate SQLite databases. Before touching either one, especially for any bulk edit or translation work, confirm which one is meant.**
> 1. `assets/data/foods_reference.db` is the LIVE database the shipped app reads from. Any edit here goes live immediately and forces a slow re-import on the user's own phone.
> 2. `unified-database/unified_foods.sqlite` is the separate, newer successor project (see its own section below). Not wired into the app at all.
>
> A session once spent hours hand-translating the LIVE database while the user believed the *unified* one was being worked on, costing roughly 8 hours in one day. Whenever the user says "the new database," "the other database," "the 2nd database," or asks for translation or bulk-edit work without naming a file, **stop and ask which one** before proceeding.

---

## How this document works

This file is the standing brief a new session reads automatically: current status, product direction, architecture decisions, and standing rules. It is deliberately kept small so it fits comfortably in context.

**The full history lives elsewhere and is not auto-loaded:**

- **`docs/CLAUDE-ARCHIVE.md`** holds the complete, unmodified 2.05M-char original of this file: the dated build journal from 2026-07-18 through 2026-08-19, plus the long-form reasoning behind every decision summarized here. Read or grep it when you need the history behind a specific decision. It is not loaded into context automatically.
- **`docs/CLAUDE-ARCHIVE-2026-09-14.md`** holds everything removed from this file since 2026-09-14, append-only. **Its last block, "CLAUDE.md as it stood on 2026-11-05", is the complete 118 KB brief from before the trim to 60 KB, under the same headings.** Where a line below says "(Archive.)", or whenever you need a mechanism's full account or the bug behind a rule, grep that block for the bold lead phrase. Not loaded into context automatically.
- **[Lifestead Notion hub](https://app.notion.com/p/3a853652f2728144bde2d78ead5227ea)** has day-by-day decisions and an explicit built-vs-planned reconciliation. New findings get written up there first.
- **[App Development Log](https://app.notion.com/p/3a853652f27281ccb21aeaa9bec8c2ae)** has the full reasoning per change.
- **`unified-database/README.md`** is the authoritative, dated history for that track (1,700+ lines, newest entry at top).

**Keep this file lean.** This file is a brief, not a log, and every session starts with all of it loaded: at 118 KB on 2026-11-05 it left so little room that a session kept compacting before it could work. A rule and what a session must know to act stay here; a build account, a version history or the workings of a mechanism go to the Notion log and, if worth keeping, get APPENDED to the archive with one pointer line left here. Never add a Status snapshot section, and never prepend a new copy of this file above the old one (that habit reached 2.05M characters and stopped Claude Code responding, twice). **The target is ~60 KB. If this file passes 65 KB, stop and archive before doing anything else.**

## What this app is

**Lifestead** since 2026-10-09 (1.0.65.4), tagline "Everything in your life has a place." It was Inside Story until then (`docs/name-knockout-2026-10-08.md`). Every name changed on 2026-10-10 except identifiers that hold records or reach a device: the Android package and iOS bundle `com.insidestoryapp.app`, the EAS project, the `hashimotosapp` scheme, the insidestoryapp.com domains and the Worker, the database file `inside_story.db`, secure-store and crypto labels, notification ids, the app://inside-story origin, and the sync, session and Tell Claude note file names. GitHub: `Antonio-BandeRock/Lifestead`. "A life's Inside Story" and The Inside Story section of Your Story keep the phrase as an idea, not as the app's name. **No text a person reads says Inside Story, messages included**: a message built around a kept file name passes it through `lib/fileInWords.ts`, and `node scripts/audit_old_name.js` must stay at 0.

**Never describe this as a Hashimoto's app, or even only an autoimmune-conditions app.** The creator's framing: "everything has an inside story… This app started to help with Hashimoto's, then decided to help with 18 other conditions, then has grown from there to include basically everything in life revolving around a person." Describe it as an everything-about-a-person's-life app that started with, and runs deepest on, food and autoimmune health. Garden, budget, family, soil microbiome, and the body are all in scope.

**Scope, stated directly:** "this is no longer just focused on Hashimoto's, it is focused on all 19 both individually and if a person has multiple of them combined." Every one of the 18 non-Hashimoto's conditions is a standing target for the same depth, not a lesser tier. Combined-condition (polyautoimmunity) management is its own named scope item, not yet built as a first-class destination.

**Who it is for, past the 19 conditions.** Direct statement, 2026-09-16: "I would like for this app to not just be viewed as being for the 19 conditions. The Autism and ADHD additions don’t much have anything to do with food at all, but the app itself is the thing that will help people who do have those neurodivergent traits to cope with daily living and all of the details that do need to be kept track of and reminding them of and making sure they have a way to keep all of those things from being on their minds. That in itself, I think will be a boon for them."

So there is a second audience with as strong a claim on this app as the health one: someone who needs an outside place to hold the details of daily living, so those details stop taking up room in their head. ADHD and autism are the named cases, and the need is wider than that (anyone recovering, grieving, caregiving, or simply carrying too much). For that person the point of the app is not the food scoring at all. It is Life, Schedules, reminders, and capture. The health depth is there when they want it, not the price of entry.

Two things follow, and they change what gets built:

1. **A feature that serves only the 19 conditions is a narrower feature than one that also serves this.** When both are within reach for the same effort, build both.
2. **The way in must not require a condition.** Onboarding, the Free tier, and the store description all still lead with health conditions. Someone who came for help running their day should recognize the app as theirs on the first screen. Not built, and a named gap.

**Never frame this as diet or nutrition treating ADHD or autism.** Nutrition supports them; it does not treat them, which is the line the Digest’s own ADHD entries already take. The daily-living support stands on its own and needs no food claim attached to it.

### The core purpose (read before any scope trade-off)

Help someone with an autoimmune condition relearn how and what to eat, and understand, personally and for their own body, how food affects them. Meal building, shopping lists, and scheduling are scaffolding that make daily use sustainable enough to generate that understanding. They are not the point. **When in doubt about priority, favor whatever helps someone discover and act on their own personal food-effect patterns over convenience features.**

Gut and microbiome healing is an explicit goal, not a side effect. The app is meant to actively help repair gut health, not just avoid trigger foods.

**Food first, and a supplement only for what food cannot supply** (direct statement, 2026-09-22). The goal is an optimal amount of every nutrient from food, with a supplement for what food cannot supply for that person (vegan, allergic and so on). So everywhere the app shows a nutrient amount it says which source met it, and neither half is advice to stop taking anything. Built in Insights > Nutrients, Home's Today's Fuel Gauges, My Meds and Trends > Nutrients. **The supplement half is always worked out per day from each supplement's start and end dates** (`getSupplementNutrientTotalsByDate`, `lib/supplementWindow.ts`), never from today's regimen stretched backwards; with no dates given it is counted across the range and the caption says so.

**When a supplement is taken belongs to scheduling.** The rules live in the interaction-rules engine and Schedules > Meds; Schedules > Today's Meals interleaves meals and doses and an opened dose reads the meals around it (`lib/doseMealTiming.ts`), writing nothing. `MEAL_AMOUNT_THAT_MATTERS` holds working thresholds, not trial doses, so each sentence names the amount; a meal nothing resolves to the food database reads as could not be checked, never as carrying nothing.

The user's reframing: people are overwhelmed and confused about food and can't put the pieces together themselves. The app's job is to remove that cognitive burden entirely, doing the correlation and discovery work *for* the person so daily eating becomes following clear, pre-solved rules. The complexity lives inside the app; what the person experiences is ease. **This makes discovery and trend-finding something the app does on the user's behalf, not a task handed to them.**

### Living with nature, not against it (standing principle, 2026-09-26)

Direct statement: "I think the app is also about how we humans live with nature. Working with it and not against by thinking we know better than nature." This was already true in the build before it was written down: gut healing as tending an ecosystem, soil fed by compost and cover crops rather than turned and dosed, no-dig beds, the Three Sisters, the symbiosis entry in Horticulture, and food first with a supplement only for the gap. It now governs choices everywhere:

1. **When the app describes two ways of doing something, the one that works with a living system comes first and gets the fuller treatment**: the gut, soil, a garden, a hive, a body's rhythms. The other way is still described fairly, never mocked.
2. **The principle never outranks evidence tiering.** Where nature's way is losing (untreated varroa mites killing colonies, a condition that needs its medication), the app says so plainly. Working with nature includes saying where it needs help, and nothing here ever becomes advice to refuse a treatment.
3. **What a person keeps alive is recorded as a relationship over time, not an output to maximise.** A harvest is what was given, a colony or a soil is tracked for how it is doing, and no screen scores a living thing for productivity.
4. **Native and local come before imported** when both are within reach: local seed, adapted queens, native pollinators, a region's traditional practices.
5. **Growing food persuades away from chemicals and toward living soil** (direct instruction, 2026-09-26): compost, mulch, no-dig, cover crops and Korean Natural Farming come first, labelled as resting mostly on farmer experience, and synthetic inputs are argued against truthfully, never mocked. Crop guides in Garden > Horticulture hold it (`lib/cropProblems.ts`, `lib/plantNutrients.ts`), and `scripts/test_crop_guides.js` keeps chemical product names out of every fix and `--links` checks every URL.

The first named consequence is **bees and beekeeping, all of it** (direct correction, 2026-09-26: "Everything, not just some things about bees"): a complete hive log in Garden and complete reading, with bee-centred beekeeping set beside conventional practice, each described fairly. The owner intends to keep bees. Not designed or built; scope in the Project Tracker row [Bees and beekeeping](https://app.notion.com/p/3e753652f272816bac9ae60e053c4d6d).

### What the app gives back in the end: a life's Inside Story (2026-09-26)

The stated end point (2026-09-26): a person's life, told through their own eyes from what they recorded over years, left to the people they choose and, if they wish, to archives built to last. Not built, and most of what it rests on is not built either; full account in the Decision row [A life's Inside Story](https://app.notion.com/p/3e753652f2728158b2a1dd56d6ac4a7f). Rules that bind everything built before it:

1. **The words are the person's.** The app gathers, lays out and prompts, and never writes the story in its own voice.
2. **It outlives the app.** A printed book or PDF plus an open-format archive readable with nothing installed, so choose export formats with that in mind from now on.
3. **Private until chosen.** Composing a legacy is a separate, deliberate act of picking what goes in; no record, and above all no diary entry, becomes part of it quietly. Other people named in an entry are shown before it is included.
4. **No company server holds it**, and giving anything to the public is said plainly to be permanent before the last step. Donating health data to research is a separate choice, never bundled in.

### International scope

Not US-centric. Three distinct components:

1. **Cited international and regional epidemiological data per condition:** how prevalence and severity vary by country or region, for all 19 conditions, with cited corroborating explanation (genetics, diet, environment, latitude, screening practices). One "Global Perspective" entry per condition, in progress.
2. **Languages, Spanish first, started 2026-10-26.** Planned: English variants (US, UK, AU), Spanish (Latin American and Spain), German, French, Finnish, Norwegian, Swedish, Japanese. Chinese and Italian were removed 2026-08-10 by direct instruction. One app carries every language. **The English stays in the source and each language is a table keyed by that exact English** (`lib/translations/es.ts`, read by `lib/i18n.ts`; missing shows in English). `components/EditableText.tsx` translates every Text; words that never reach a Text (Alert, placeholders, notifications, the PDF, any sentence with a value) need `t('{count} meals', { count })` at the moment they are shown, never at module load. Device-local choice in `lib/language.ts`, defaulting to the phone's language. Mexican Spanish first (tú, súper, platillo, padecimiento, reporte), sentence case, same no-dash and no-filler rules. Every entry is Claude's translation, not checked by a native speaker. `node scripts/i18n_coverage.js` and `node scripts/test_i18n.js` are the checks. (Archive.)
3. **Country-specific reference data.** The 22,022-food database already draws on 7 national sources (US, Canada, UK, Germany, Australia, France, Japan). Gaps: no Spanish-speaking country's data, and no Nordic source yet.

## Standing rules

These are behavior-changing and apply to every session:

- **The Rule Engine, a standing name for a recurring gap** (direct request, 2026-08-26: "it has to always apply to all of the ways the information needs to be wired up, so nothing ever gets left out"). **It is every mechanism that encodes one evidence-based nutrition or health fact as a reusable "if X then Y" rule**, as opposed to the Digest's narrative writing. Check all of these whenever a new fact enters the app:
  1. **Reference-database scoring** (`sub_criteria`/`food_scores`, `assets/data/foods_reference.db`): does this fact need a scored sub-criterion of its own on individual foods?
  2. **Condition relevance** (`sub_criterion_condition_relevance`): which of the 19 tracked conditions does this scored property actually matter for? (See the 2026-08-24 Migraine relevance-mapping precedent, `scripts/add_migraine_condition_relevance.js`, for the safe, established way to extend this.)
  3. **Recipe condition-cautions** (`scripts/compute_recipe_condition_data.js`, feeding `lib/digest/recipes.ts`): does a flagged recipe need a caution, with severity calibrated rather than read off a raw measurement?
  4. **The meal generator's rule sets** (`lib/dailyMealPlan.ts`; `NUTRIENT_SYNERGY_RULES` and `NUTRIENT_ANTAGONISM_RULES` in `lib/nutrientPairRules.ts`; `FREQUENCY_RULES`, pairing requirements): should it shape what gets recommended or flagged?
  5. **The interaction-rules engine** (`interaction_rules` table, `lib/interactionRules.ts`): is this a timing/combination caution between a food, supplement, and/or prescription, distinct from a per-food score?
  6. **Digest condition-specific content**: does a tracked condition this fact is relevant to deserve a cited research entry of its own explaining why?
  7. **Digest Basic Health content**: is this a general-population-relevant fact worth an entry of its own regardless of which conditions someone tracks?
  8. **Healing-stage advisories** (`lib/*StageAdvisory.ts`): does this matter differently at different stages of a staged condition's healing journey?
  9. **Known pairs for Trends > Compare Two** (`KNOWN_PAIRS` in `lib/compareSeries.ts`, checked by `scripts/test_compare_series.js`): does this fact give a published reason to read one recorded series against another? Each pair carries what to expect, a tier and a source. A synergy or antagonism rule reaches Compare Two by itself through its `compare.labs`.
  10. **Learn's ready-made decks** (`LEARN_DECKS` in `lib/learnDecks.ts`, checked by `scripts/test_learn.js`): is this worth knowing well enough to be asked later, and is there a way to weigh it that makes a thinking card? A card drawn from the reading names its entry in `entryId` and says nothing that entry does not; thinking cards stay the majority of every deck; a shipped card's id is never reused for different words.

  Not every fact needs all ten; the discipline is running through the list every time, not defaulting to "just write the Digest entry". Update this list if a new wiring point gets built.

- **One distance between stacked bands, everywhere: `HOME_BAND_GAP` in `components/HomeSectionBand.tsx`** (direct instruction, 2026-09-12), never a retyped 10 or 14; `HOME_BAND_CONTENT_PADDING` is a band's inner inset and the side margin of a button between bands. Every scrolling screen takes the band look: edge to edge with a left accent in the tab's colour through `makeTabBandStyles(tabColor)` in `components/TabBand.tsx`. Scroll content has no side padding and no bottom margin; bottom padding comes from `useFloatingButtonScrollPadding`. `homeBandStyle` carries View-only props, so it never goes on a `Text`.
- **The Digest owns full content; the tool areas own data** (direct instruction, 2026-08-18). The reading lenses (Conditions, Health Literacy, Earth Matters on Life; Horticulture on Garden) hold full content. Tool screens use compact rows (one line, one muted caption), with descriptions on tap via `showInfoAlert()`. Data-entry forms stay as `formCard`s.
- **Never frame Hashimoto's as more central than the other 18 tracked conditions** (memory key `feedback_no_hashimotos_primacy_framing`).
- **Home cooking over commercial and branded products.** Don't expand branded or commercial reference entries. The intended path for a store-bought item is the barcode scan, not a generic "commercial" or "préemballée" entry.
- **Writing style in app content, and in this document:** avoid the filler words "real," "genuine," and "genuinely." **No dashes used in place of ordinary punctuation:** no em dashes, en dashes or " -- "; use a colon, a comma, parentheses or a second sentence. Hyphens in compound words are fine. **No redundant "own"** ("the trial's own authors"; direct correction, 2026-08-24). It survives only in the "in its own right" and "on its own terms" idioms, standalone "on X's own", and the medical "attacks the body's own tissue."

  **Checkable, so stop checking it by memory.** Run `node scripts/audit_ai_isms.js [paths]` on anything you wrote before calling content work done; it reports `block` (fix it) and `look` (a person decides).

  **`.claude/agents/ai-ism-editor.md` is the agent that does the removing** (direct instruction, 2026-09-18): on newly written or changed content only, start and completion announced, reporting a per-category tally with before and after text. An agent written during a session is missing until Claude Code restarts; never substitute a different one.

  **Four standing consequences of the 2026-09-18 sweeps, each of which a later session will be tempted to undo:**
  1. **A Digest title says what the entry is about**, and the shape of a subject, a colon and a promising phrase is rejected as house style. Do not reintroduce it.
  2. **The `stageNote` field is gone from `DigestEntry` and from the renderer** by direct instruction. Curation rationale belongs in a code comment, not in `teaser` or `summary` either.
  3. **The "already covered" cross-reference refrain is out of customer-facing text.** A pointer naming a place a reader can reach is fine, without the word "already".
  4. **`OWNER_CHOICE` in `scripts/audit_ai_isms.js` holds two deliberate exemptions**, "Industry, Greenwashing & Honest Limits" and "Building Real Soil". Both were asked for back by name after a sweep had shortened them to quiet the detector. A false positive gets fixed in the script, never by editing the text back.
- **Every function that competes with a leading app has to beat that app, Free or paid (2026-10-07).** The bar is the leader for that one function; even or behind is a gap, written down with what closing it takes. Where the leader's edge rests on something a standing rule forbids, say so and beat it another way; never bend the rule quietly.
- **Evidence tiering is non-negotiable.** Every claim carries an honest evidence tier. A personal hypothesis must never be presented as verified medical fact, including in any doctor-facing report. Functional-medicine root-cause staging is not mainstream endocrinology consensus, and the app must not imply otherwise.
- **What the app must never say about the person (2026-09-24).** `node scripts/audit_clinical_claims.js` must stay at 0: (1) never diagnose; (2) never claim a cause from the person's own records ("tends to follow" is the most a sample of one can say); (3) never tell anybody to stop, start, skip or change a medication or its dose (timing advice from the interaction rules is fine); (4) never call something not an emergency, or a symptom nothing to worry about; (5) never let a score stand in for a clinician. A new sentence generator joins its `NAMED` list; anything intended goes in its `ALLOWED` map with a reason.
- **Pattern Finder says what it is counting against (2026-09-24).** Every count names its denominators, candidates are compared with ordinary stretches of the same length (`lib/patternBasis.ts`), and sleep and treatment changes sit beside the foods, never as the explanation (`lib/patternContext.ts`). "Test this" (`lib/foodExperiment.ts`) ends with its one-run limit; "your usual range" (`lib/yourUsual.ts`) never says what readings should be. `node scripts/test_phase_b_patterns.js` sweeps for verdict words.
- **Verification before "done":** `npx tsc --noEmit` clean across the project, `npx eslint` clean on every touched file, `node scripts/audit_ai_isms.js` clean at the `block` tier on every file whose text changed, and `git diff --stat` reviewed. On-device confirmation is a separate step and should be stated honestly as pending when it hasn't happened.
- **The App Guide and the Walkthrough stay current with every change to the app (direct instruction, 2026-11-06).** `docs/guides/` is their source of record. `node scripts/refresh_guides.js` belongs in every finishing pass: it updates the version and the changes list, and names any lens a page has no line for. Write that line, then publish both with `force: true`. The URLs are in the script.
- **The database only grows (2026-10-31, tester plan T7).** Testers keep their own records from the first day and every OTA runs the startup schema code against them, so that code adds tables, columns and indexes and never drops, renames, recreates or empties one. `node scripts/audit_additive_migrations.js` must stay at 0; a wipe the person asked for (restore, Clear the log) goes in its `ALLOWED` map with a reason.
- **The tester version opens only on an approved device (2026-10-31).** `components/TesterGate.tsx` covers it until the agreement (`lib/testerAgreement.ts`) is accepted and a signed approval held (`node scripts/approve_tester.js`). An ended one keeps every record and only covers them. **The signing seed lives only in `_backups/tester-approval` and on the approving device, never in git, an email or a chat.** `scripts/test_tester_approval.js` covers it, and `audit_tester_bundle.js` keeps the approving half out of the tester bundle.
- **Bump the version by running `node scripts/bump_version.js`, once per distinct request the user provides, not once per file changed** (direct instruction, 2026-08-23). Format `1.0.DAY.UPDATE`: **DAY is which day of work, so it increments the moment the calendar date changes and UPDATE goes back to 1** (direct correction, 2026-09-22). Nobody edits the four files by hand. `node scripts/bump_version.js --check` exits 1 when the day is stale and belongs in the same pass as `tsc`, the audits and the push. Treat the bump like git push and the Notion sync: part of finishing work, not a separate ask.
- **Metro staleness:** check whether the dev server is serving stale code before re-guessing the code (memory key `feedback_metro_staleness`). Note the 2026-08-02 counter-case: staleness can also live inside React itself, for example `useRef(fn).current` freezing a callback at first render so Fast Refresh silently ignores every later edit.
- **Neither SQLite database is in git, and neither goes back in** (2026-09-21: every commit uploaded a whole object GitHub keeps for good, and the account hit 90% of its LFS storage). Both paths are in `.gitignore`, `.gitattributes` keeps its LFS lines, and EAS still uploads both. **Run `node scripts/backup_reference_dbs.js` whenever either database changes, as part of finishing the work.** It copies them to `C:\Users\TonyR\OneDrive\Desktop\AppProject\_backups\reference-dbs\`, which is also where a fresh clone gets them.
- **Do not hand-translate remaining untranslated France_Ciqual, Norway, or Sweden rows in `foods_reference.db`.** The unified database already has them fully translated via a tested pipeline, and the owner's call is to hold until Phase 5 (merge) and Phase 7 (swap) below are done. Roughly 1,400 France_Ciqual rows already translated by hand stay live in the meantime.
- **Anything new added to the Digest follows the same structural pattern as everything already there, checked in the same pass that adds it.** Direct instruction, 2026-08-29: "Make sure that anything new added anywhere to the Digest follows the same pattern as all of the others from now on." Concretely, when adding entries to any category:
  1. **Never leave a shelf covering more than one subject undivided.** Past roughly 12 entries it needs named subgroups (`CONDITION_TOPIC_SUBGROUPS`, for every category), designed from the entry titles, with every id verified.
  2. **Never let a heading repeat the header above it.** Handled generally now by `shelfHeadingLabel`'s own `currentHeaderTitle` check, so a new category or a deeper drill-down inherits it automatically. Do not reintroduce a per-call-site workaround.
  3. **Glossary/definition entries belong in a subgroup of their own**, not mixed among research entries. Several conditions' "Core Science" shelves were badly inflated this exact way before 2026-08-29.
  4. **Verify, don't assume:** count the shelf after adding, confirm every declared id resolves, and confirm the change is in the exported bundle before calling it done.
- **No text ever sits directly on a tab's photographic background without a surface of its own** (direct instruction, 2026-08-29). In order of preference: a heading labelling one card moves inside it; a heading over a group of cards or a standalone empty, error, loading or footnote line gets a surface (`groupHeadingChip`/`panelStandalone`); an outline-only control gets a fill. **`scripts/audit_bare_text_on_background.js` and `scripts/audit_dark_text_shadow.js` must both stay at 0**; `scripts/add_style_background.js` and `scripts/wrap_bare_text_lines.js` apply fixes at scale.
- **Two classes of text, and only one of them scales with the phone** (2026-09-18; full write-up under "Text that is furniture, and text that is reading" in `lib/textSpacing.ts`):
  1. **READING text** (nearly the whole app) scales with the phone's font-size setting, uncapped, and its container grows. Never add `maxFontSizeMultiplier` or `allowFontScaling={false}` to it.
  2. **FURNITURE** (`TabHub`, `LensHub`, `MyItemsHub`) is positioned rather than flowing, so its room is budgeted through `menuLineHeight` and `menuLineBudget` in `constants/typography.ts`, never a hand-typed height. Every label carries `maxFontSizeMultiplier={MENU_MAX_FONT_SCALE}`, and the card measures against it through `useWindowDimensions().fontScale`.
  3. **PINNED** is the narrow exception: only `PageIdentityLabel` and `VersionLabel` get `allowFontScaling={false}` plus `pinnedLineHeight(size)`. A third needs a written reason.
  `node scripts/audit_chrome_font_scale.js` must stay at 0. Changing line or letter spacing restarts the app, since `constants/typography.ts` applies both at module load.
- **Anything anchored to an edge is measured against the window, not against a number somebody typed** (2026-09-18). `useWindowDimensions()` reports dp, so one measurement covers Display size, landscape, split screen, foldables and Android 16+ large screens, which ignore the orientation lock. Arithmetic in `lib/menuFit.ts` (`node scripts/test_menuFit.js`), hook `useMenuCardFit(desired, minHeight)` in `constants/floatingButton.ts`, and a clamped card scrolls through a `ScrollView` unconditionally. `node scripts/audit_menu_card_fit.js` must stay at 0.
- **Which hand works the navigation is a live, per-device setting (2026-10-05).** `lib/navigationHand.ts` (`useNavigationHand`, `getNavigationHand`, `setNavigationHand`), kept in a plain file so it never syncs. Hubs mirror through `mirrorForHand` in `constants/floatingButton.ts`. Anything new that cares which side the thumb is on reads the hook, never a typed side, so it redraws on a switch.
- **Capture over the lock screen never opens the database (2026-10-06).** `components/LockedCaptureScreen.tsx` seals what was captured to the lock's public key (`lib/lockedCaptures.ts`); the next unlock writes it. Nothing there reads a record, and nothing readable stays on disk. (Archive.)
- **Every notification is answered or dismissed on the locked phone (2026-10-11, direct instruction).** No button opens the app or takes a typed reply; a question is answered by tapping, and a longer one asks the next as a fresh notification (`lib/reminderActions.ts`). A press on a locked phone is sealed for the next unlock. **Words go through a tap on the notification, never a button** (`lockedWords`, `components/LockedWordsScreen.tsx`). `node scripts/audit_lock_answerable.js` must stay at 0.
- **Every change to a tool redoes its how-to in the same pass (2026-10-13, direct instruction).** Every lens has its tools in `TOOL_HOW_TOS` (`lib/toolHowTos.ts`), each step ringing its button through `walkMark.ref`. Added, removed, renamed or moved all count, and stale tutorial screenshots get named. `node scripts/test_tutorials.js` cannot see a new button on a lens that already has how-tos, so check that by hand.
- **One button look, defined in `constants/buttons.ts` (2026-10-28, direct instruction).** `BUTTON_PRIMARY` and `BUTTON_SECONDARY`, each with a `_COMPACT` size and a text style. A button style spreads one and never retypes fill, border, radius or padding; not-ready is dimmed with opacity. `node scripts/audit_button_style.js` must stay at 0. **Turquoise, `colors.primary`, means tap this and is never a place's identity colour**; Home bands belonging to no tab wear pearl, `colors.homeNoTab`. **Pills too:** `PILL` or `PILL_SMALL`, with `PILL_ON` over it when chosen, and `PILL_TEXT`, `PILL_ON_TEXT`. A pill whose colour carries meaning goes in the `EXEMPT` map of `node scripts/audit_pill_style.js`, which must stay at 0.
- **A link lands on the thing it names (2026-11-02, direct instruction).** A Profile link passes `params: { section: '<card key>' }`, and Profile opens that card's group and scrolls to it (`PROFILE_CARD_GROUP` in `app/profile.tsx`); a tab link names its lens. `node scripts/audit_bare_links.js` must stay at 0.
- **A button that cannot finish yet says why (2026-10-03, direct instruction).** It stays pressable while something is missing and answers with `explainNotYet('...')` from `lib/notYet.ts`, naming the missing thing in plain words. `disabled` is only for busy or saving. `node scripts/audit_silent_refusals.js` must stay at 0.
- **Lists are open-ended, and removing an entry never orphans or destroys a record** (2026-09-20). Any fixed picker gets "Add a ... of your own" (`garden_custom_terms`, `components/GardenTermField.tsx`). Removal moves what is in use to a replacement the person picks, retires what has history, and deletes only what nothing refers to. **Never a catch-all, never NULL a column, never cascade.** Decision logic stays in pure modules with tests. **Chooser lists read alphabetically** through `sortByLabel` in `lib/choiceOrder.ts`.
- **There may be notes waiting for you, and reading them is part of starting a session (Tell Claude, 1.0.49.8).** **Read `inside-story-notes.jsonl` in the Backups folder** and answer by appending a status line, never by editing one. A `wording` note carries `originalText` and `newText`, previewed on that device until marked done: change the source text, then mark it done. Do the clear notes and report them; bring an observation or an ambiguous one back first. The preview works by `metro.config.js` swapping `Text` for `components/EditableText.tsx`, and **the swap's files never import the bare name `react-native`** (`node scripts/test_editable_text_resolver.js`). Developer Tools only.
- **No topic renders as one long, undifferentiated horizontal shelf once it grows past roughly a dozen entries** (direct instruction, 2026-08-25). Basic Health topics get `subtopics`; an oversized condition topic gets an entry in `CONDITION_TOPIC_SUBGROUPS`, hooked into `groupConditionEntries`. Group by what distinguishes that shelf's entries, verified against the corpus (every id accounted for), never an arbitrary split.

**The six-phase cross-app push is finished (2026-09-23): Where did I put it, Trends > What You Eat, Keeping Up, Garden Yield, What It Costs, and From your garden (`offerGardenUse(mealId)`).** **Nothing on Keeping Up scores anybody**, enforced by `scripts/test_keeping_up.js`. Still open: the regulation and sensory tags as a band inside Symptoms & Flares. (Archive.)

**Five rules the push settled, each of which a later session will be tempted to soften.**

1. **A lens is a SUBJECT holding several bands behind the fold**, the way Nutrients holds every nutrient, which is what took roughly twenty proposed charts down to 14 lenses. The record lives on its tab and the timeline lives on Trends, so nothing on Trends writes.
2. **A period with nothing logged draws as a gap, never as a zero.** Every periodic figure is `number | null`, a blank period says so in words, the count of blanks sits under the headline, and a gapped series gets no line chart.
3. **The local-day rule.** `done_check_marks.marked_at`, `capture_notes.created_at` and `routine_runs.started_at` store UTC, so slicing ten characters puts every evening mark on tomorrow. `dayOf` in `lib/keepingUpDb.ts` goes through a `Date` for the LOCAL day, and each SQL window reaches a day past the range at both ends. Plain date columns need none of it.
4. **Units are never converted across kinds.** Weights add through `convertToGrams`; a count stays a count; anything else stays on its own line. A percentage or price is only ever taken of a weight.
5. **Only money recorded against a day is counted, and a figure is never guessed at.** `finance_recurring` rules are left out. Anything entered in both `finance_medical_bills` and `finance_entries` is counted twice and the note says so. Money on a harvest uses only prices the person recorded, is an avoided cost, and says both. Band 4 of What It Costs never says a supplement was unnecessary.

**Growing conditions as a record (2026-09-23): separate the reading from the radio.** `garden_readings` is append-only, by hand or device, and only stage 0 of four is approved: no time-series database, no backend, nothing built on Home Assistant. `scripts/test_growing_conditions.js` forbids "too low", "ideal" and "optimal". (Archive.)

**Your Story, the guided way through the app** (`lib/yourStory.ts`, `lib/yourStoryTabs.ts`, `scripts/test_your_story.js`). **An item is done when its record exists** and reopens if the record goes; no step counts, percentages, praise, blame or claimed causes. Output lens builders are checked by `scripts/test_output_lenses.js`, which a new builder joins. (Archive.)

## Technology stack (decided)

- **React Native on Expo**, for its third-party ecosystem and because dev hardware is a Windows PC plus an Android phone with no Mac: Expo Go runs the app live and EAS Build compiles in the cloud.
- **Builder:** 30 years as an IT Manager, some scripting, no prior mobile development.
- **Platform scope:** Android, iPhone, Windows, Mac (browser-installed PWA, avoiding Apple's $99/year program).
- **Config plugins:** `plugins/withAutofillDisabled.js` and `plugins/withWindowBackground.js` are the established pattern for native config changes Expo has no first-class field for.
- **The desktop app is the same code in an Electron window (`desktop/`, since 2026-09-21).** `node desktop/build-web.js` exports with `LIFESTEAD_DESKTOP=1`, `metro.config.js` swaps the natives for `lib/desktop/`, and `desktop/main.js` supplies them. The phone bundle is untouched. `isDesktopApp()` in `lib/desktop/bridge.ts` is the check; `cd desktop && npm run dist` builds the installer. **Every mechanism below, and the bug behind each rule, is in the archive; read it before re-deciding any of this.**
  - **A JS change reaches the desktop only by building and installing a new .exe.** **`node desktop/check-installer-current.js` belongs in the same pass as `bump_version.js --check`, `tsc` and the audits.** Tester installer: `cd desktop && npm run dist:test` (`electron-builder-test.yml`, `desktop/variant.js`). The two builds share `web-build/`, so run them one after the other, never at once.
  - **Two checks that must stay at 0.** `node desktop/check-packaged-files.js` (a module beside `main.js` is left out of the installer until added to `electron-builder.yml`) and `node desktop/check-collapsed-text.js --menus` after a web build (one-line Text in a fixed box shrinks to nothing in a browser).
  - **Layout on a wide window:** `lib/menuFit.ts`. Text size is page zoom (`desktop/zoom.js`). **The corner box and `VersionLabel` zoom with the artwork and are deliberately NOT pinned against desktop text size** (direct instruction, 1.0.42.24). Do not re-add it.
  - **A computer may have no touch screen (2026-10-28).** Every sideways row is `components/HorizontalScroll.tsx`, never `<ScrollView horizontal>`. `node scripts/audit_horizontal_scroll.js` must stay at 0, and anything that only works by swiping needs a mouse way too.
  - **Phone-only features say so and name the phone**, through `lib/desktop/phoneOnly.ts` (`scripts/test_phone_only.js`): camera, voice, Health Connect, Sync over Wi-Fi.
  - **On a computer OneDrive is the folder on the disk, with no sign-in**: `lib/oneDriveGraph.ts` sends every call to `lib/desktop/cloudFolder.ts`. A folder travels between device kinds by its sentence, "OneDrive / Apps / Lifestead". (Archive.)
  - **One person's two devices stay in step through the shared folder**: one encrypted copy per device plus plaintext `inside-story-sync.json` with no health content (`lib/snapshotSync.ts`, `lib/snapshotSyncDevice.ts`, `components/SnapshotSyncWatcher.tsx`). **One device has the session at a time** (`lib/syncSession.ts`, 30 minutes unused; a timer never claims it), enforced in `lib/databaseActivity.ts` (`SessionReadOnlyError`, except `withSessionGuardLifted`). **A save sends only what changed** (`lib/snapshotDelta.ts`, `scripts/test_snapshot_delta.js`). Four things hold, each bought with a bug:
    1. **Some rows and some tables never travel.** **Add a key to `DEVICE_LOCAL_META_KEYS` in `lib/snapshotSync.ts` whenever a new `app_meta` row addresses hardware, a path, a permission or a bundled file**; `DEVICE_LOCAL_TABLES` does the same for tables.
    2. **Every arrival is a three-way merge, record by record** (`lib/snapshotMerge.ts`). The agreed copy is what the OTHER device last sent; a merge marks the device unsaved only when it has something to send; **Sync Now never forces**.
    3. **What changed is said in words** (`lib/snapshotChanges.ts`), and that list rides INSIDE the encrypted snapshot, never in the plaintext record.
    4. **Nothing is said out loud** (`ANNOUNCE_MERGES` in `lib/snapshotSync.ts` is false); the log is `sync_change_log`, read on `app/sync-activity.tsx`.
  - **The same merge runs between two people, and `lib/peerRelationships.ts` is an ALLOWLIST**: nothing crosses unless a relationship names it, filtered through `tablesToSend`, refused by `lib/peerMerge.ts`. Only the shopping list today.
- **Dev and Test stay matched until it is time to give the app to testers, unless Tony says otherwise (direct instruction, 2026-11-06)**: Tony looks at Test, and only the developer tools differ. **Delivery: JS ships OTA, native ships by rebuild.** One JS change publishes on two channels, each with `--platform android` (leaving it off fails on `wa-sqlite.wasm`): `APP_VARIANT=dev ... --channel dev` and `APP_VARIANT=test ... --channel testers`, plus the Windows installers. Not `--branch preview`, which stopped at 1.0.78.23. **Publish from the `C:/Dev/wt-tester` worktree** (fast-forwarded to main), after `APP_VARIANT=test npx --yes eas-cli fingerprint:compare --build-id <build> --non-interactive` matches: updates published from this folder landed on a runtime no phone has. A rebuild from there needs `assets/data/foods_reference.db` and `google-services.json` copied in. `eas build` forces both phones to reinstall, so **gather everything rebuild-gated first**, and **`node scripts/test_notification_icon.js` must pass before any rebuild**. App links and landing pages are the Worker `inside-story-site`, from `docs/app-links`. (Archive.)

## App navigation structure

Hub-and-spoke, replacing the original four-tab plan as of 2026-07-22: a central popup-menu button (`TabHub`) instead of a persistent bottom tab bar, plus left/right swipe between tabs (`SwipeableTabScreen`). Screens with internal sub-tabs (Insights, Schedules) get a secondary hub (`LensHub`). **`constants/tabs.ts` is the single source of truth for the tab list.**

Tabs (ten), in menu and swipe order: **Home**, **Life**, **Food**, **Garden**, **Interests**, **Schedules**, **Signals**, **Insights**, **Trends**, **Reports**, then Profile and Info in TabHub. **The Digest tab is gone**: "the Digest" here and in code names the reading corpus (`lib/digest/`, `ALL_DIGEST_ENTRIES`), and no customer-facing text says "Digest". Reading lives on Life (Conditions, Health Literacy, Earth Matters, Search Reading), Garden (Horticulture) and Food (recipes). `routeForDigestEntry` in `lib/digestNavigation.ts` is the one place that knows where an entry opens.

**Life lenses:** Grocery List, Conditions, Finances, Work, Upkeep, Emergency, My Meds, Kitchen, Movement, Routines, Did I Do It, Days Until, plus the reading lenses. `components/ConditionsSection.tsx` keeps three lists that never mix: My Conditions (Profile), Family (`lib/family.ts`; joins the Meal Plan through `lib/partnerPlanning.ts` when switched on) and Other Conditions (curious about, **never feeding scoring, planning, advisories, rules, stages or safe foods**). (Archive.)

**Garden** has per-area Grow Setup (`lib/growSetupDb.ts`, `lib/growSetup.ts`, `scripts/test_grow_setup.js`), lights in place of sun indoors, and Electricity compared per day. (Archive.)

**Days Until** is two tables on one arithmetic (`lib/countdown.ts`): `garden_countdowns` tied to an area, `countdowns` tied to nothing, through `components/DaysUntilSection.tsx`. (Archive.)

Schedule lenses (2026-09-13): Meals, Today's Meals, Past Meals, Meal Plan (the one generator, up to six weeks), Hydration, Meds (prescriptions, OTC and supplements in one dose timeline; the meds themselves are defined in Life > My Meds), Appointments (with device calendar integration), Upkeep (read from Life > Upkeep), and Exercise. **A thing is defined where it lives and gets its timeline here; Schedules never defines anything.**

## Architecture decisions

*Cloud backup, sync, encryption, and household sharing are decided but **not implemented**. All app code so far is local-only and single-device. The local encrypted backup/restore and device-to-device recipe sharing that shipped in August are different, narrower features and did not become this.*

**Local-first, no company server holding health data.** The authoritative database lives on the primary account holder's device. There is no backend storing anyone's health data. This is a deliberate trust stance, not just a technical choice.

**Encrypted backup to the user's own cloud drive** (their OneDrive or Google Drive, their storage), serving as disaster recovery, multi-device sync, and household-sharing transport. Encryption is protected by a master password or a locally-generated recovery key shown once at setup. The app never holds the key, so there is intentionally **no "forgot password" flow.**

**Multi-device sync:** what shipped is the shared-folder snapshot sync in the Technology stack section, which merges three ways under a 30-minute session lock; the original design is in the archive.

**Household sharing, two access tiers** reading from a shared cloud folder:

- *Free viewer companion.* Reads periodic snapshots from a shared cloud folder (meal schedule, shopping list, trend reports). One write exception: **checking off shopping-list items** and marking tasks done, sent back as a small delta file.
- *Paid interactive companion.* Read-write access to a shared "household domain" (meal plan, shopping list, schedule) but **never** the primary's personal health domain (symptoms, labs, supplements, scoring history), which stays unreachable by any companion account.

Cross-provider sharing (OneDrive on one end, Google Drive on the other) does **not** require matching providers. The sync mechanism that makes that work is deliberately deferred to a design pass of its own.

**Sharing between people: the `.is` format.** `.is` is intended as the one general-purpose file format for anything shareable: recipes and favorites (built), plus future gardening, exercise and other non-health content. A person's health domain stays outside it, since that is the tier model's job. Build the payload shape generically from day one (an envelope type per content kind), not recipe-specific.

The standing security target, in the owner's words: "for data to be shared between two people who have the app, one of them had to send an invitation from the app to the other and the other had to accept it for their encrypted link to be associated to each other. If that encryption code is wrong from the person when you receive the data then it isn't accepted. Only the app knows what that code is between the two." Alongside that, a standing **Connections roster** so a repeat share doesn't need re-pairing, and OS-level `.is` file registration so tapping a received file from WhatsApp, email, or a file manager opens this app directly.

**Security prerequisites:** seven ordered steps (in the archive). Steps 1 to 6 are built (`tweetnacl`, `lib/deviceIdentity.ts`, `connections`, `decodeShareEnvelope` in `lib/sharing.ts`, `.is` intent filters). **Step 7, extending past recipes, is open alongside transport**, to be designed with the tier separation.

**Reminders and scheduling: contextual from day one, not clock-based.** "Take your levothyroxine" accounts for what has been logged. Local notifications for anything self-contained, and a minimal **content-blind** push relay purely for cross-device wake-up. Instant recomputation is only guaranteed in the foreground. Reminders show their freshness ("based on food logged as of 7:45am"), because a confidently wrong one is worse than an honestly uninformed one.

**Interaction rules engine, two kinds, kept visually distinct:**

- *Built-in cited rules.* Prescription, supplement, and food timing interactions (levothyroxine with calcium or iron, biotin interfering with thyroid assays), authored with the same citation discipline as the nutrition database. Should ship as a versioned data file updatable independently of app releases.
- *Personal rule builder* (built 2026-08-18). The person's own discovered pattern or their doctor's specific instruction, always labeled distinctly.
- *Synergy to build toward.* The trend engine surfacing candidate personal rules from observed patterns: "you've logged fatigue within a day of high-goitrogen meals four times this month, want to turn that into a rule?" The Pattern Finder to rule shortcut is the natural next step and was explicitly deferred out of the 2026-08-18 build.

**Late and retroactive logging** must be low-friction: guided quick-select, never a blank form, and every late entry shows its consequence.

**Reporting.** Different views over the same timestamped, taggable log data, generated entirely on-device. One `ReportDocument` renders as text and as HTML through `expo-print`. Eight reports, each defined in `lib/reportKinds.ts`; `buildReport(days, kind)` never gathers a section the report leaves out.

## Monetization tiers

Five priced tiers plus one bundled role, decided 2026-08-08. Full reasoning and feature matrix in the [Household & Monetization Tiers artifact](https://claude.ai/code/artifact/e153d351-52c7-4df5-a4c1-e134ff86c085).

| Tier | Price | Scope |
|---|---|---|
| **Free** | $0 | **The [free/paid board](https://claude.ai/artifact/U9AUm2LG8f6dzrWmHPDJCt) is the authority (2026-10-08)**, trimmed item by item; condition scoring, the Reports, Pattern Finder, sync and companions sit above its line. Always Free: safety (P28) and **what safety reads** (My Meds, dose reminders, allergies, conditions in Profile), plus The one next thing and Simple View. |
| **Individual** | $9.99/mo, $89.99/yr | The 1.0x base unit. Everything Free lacks: full condition scoring, full rules engine, Trends, Reports, full Schedule, complete Digest, and sync across the person's own devices. **Includes the person's first caregiver link** (2026-10-07). |
| **Partner** | $14.99/mo, $134.99/yr for both (~1.5x) | Two people, each with full Individual access to their own data, plus granular opt-in per-category visibility into each other's. Meals and shopping are shared by default; symptoms, labs, and notes are private by default; medications are an explicit choice at setup. Symmetric, and not an extension of the household model. |
| **Household / Family** | Free for first 2-3 seats, then $1.99/mo, $17.99/yr per seat (~0.2x) | Read access to shared meal plan, shopping list, and Trends summary, with one narrow write exception (shopping-list checkoffs, marking tasks done) and no visibility into the subscriber's personal health domain. |
| **Guardian** | $0, bundled with Individual or Partner, per child | A parent's own minor children only. Full condition tracking enabled per category by the parent, who retains full read/write, while the child's own access is granularly configured at the parent's pace. Legally simpler than Caregiver. |
| **Caregiver** | **No separate app and no charge to the caregiver.** A Free feature, off until the person who wants them as caregiver turns it on and pays: their first caregiver comes with their Individual plan (more wait on P27). | Write access to another adult's meals, medications, symptoms and schedule, never a parent's minor children. By accepted invitation only, with consent area by area or a plain attestation. **Each person cared for is a separate record.** **It can never stand in for Partner** (Q89): one way, no paid features for the caregiver's records. Q73 to Q90 in `docs/competitive-review/plan/items.txt`. |

**Safety is never behind a paywall (P28, confirmed 2026-10-06).** On every tier including Free: the emergency card, the med and supplement timing warnings from the interaction rules, allergy cautions, and the protections `scripts/audit_clinical_claims.js` enforces. Free is useful on its own; paying adds depth, people and time saved. The same items stay outside the vault when it is built, so neither a tier nor a closed vault ever hides a warning.

**Addons, later:** sleep tracking, exercise tracking, and lab result trending.

## Healing-journey stages

Decided 2026-07-31. Both halves (self-declaration with advisory, and reordering) shipped 2026-08-09 across 6 staged conditions: Hashimoto's, IBS, Celiac, IBD, Chronic Kidney Disease, and Gout. That is the full list of citable staged-food candidates across the 19.

Implementation: `lib/healingStage.ts`, `lib/healingStageAdvisory.ts`, `lib/conditionStages.ts`, `lib/conditionStageAdvisory.ts`, `lib/foodStageReordering.ts`, plus per-condition advisory modules, wired into all direct-ingredient Food builders, Profile, and `components/FoodLookup.tsx`.

**Framework:** the 5-stage healing and regression model associated with Dr. Izabella Wentz: Triage, Digging, Gut Repair, Rebalancing, Maintenance. Self-declared, and the app *suggests* a change, never silently reclassifying.

**What stage does: advisory and reordering only, never gating.** Stage-appropriate foods surface first, and anything questionable gets a color-coded flag linked to an explanation. Nothing is ever hidden or blocked.

**Evidence honesty.** Only selenium reducing TPO antibodies carries strong trial-level evidence (meta-analysis of 21 RCTs). The thiamine claim is a **3-patient case report**, the trigger rankings are one practitioner's audience survey, and the staging framework is its author explaining it. Fine to build on **provided the app labels it honestly.** (Archive.)

**Practical scoping:** only stages 2 and 3 meaningfully drive *food* decisions.

## The Unified Whole-Foods Database

`unified-database/` is a separate SQLite database (`unified_foods.sqlite`, ~115MB) and Node.js pipeline started 2026-08-10, built to become a richer, fully-auditable successor to `assets/data/foods_reference.db`. **Not merged, not wired to the app in any way.** `lib/db.ts` never reads from it and no screen touches it, so it is safe to iterate on indefinitely with zero risk to the live app.

**Why:** the current reference DB came from a one-time filter script with no testable rules. The pipeline rebuilds it reproducibly, discarding nothing, with a versioned rule engine and human review through a published audit tool.

**Status (drifts, so verify via `sqlite3.exe unified_foods.sqlite`):** 9 sources ingested. Curation restarted 2026-11-06 into `food_curation`: 2,185 foods shown, 6,389 held to compare, 24,133 hidden; 775 of 1,460 recipes can be made from the list so far. [Report and open questions](https://claude.ai/artifact/TK8WN9CaUE7ifYUXeEABC1).

**Phases:** 1 and 2 done. **3 and 4 have a first pass; the owner's questions in the report are the next step.** 5 (merge curated data), 6 (integrity verification) and 7 (atomic swap, gated on `REFERENCE_DB_VERSION`) not started. Nothing here is urgent.

**If picking this up fresh:** read `unified-database/README.md` in full first.

## Related projects

**The nutrition database** (`hashimotos_foods_combined_scored_and_nutrients_LIVE.xlsx` and `whole_foods_database_v5.sqlite` at `C:\Users\TonyR\OneDrive\Desktop\AppProject`) ships as bundled reference data via `scripts/build_food_reference_db.py`, re-imported when the workbook changes, never hand-edited in this repo.

**The companion book** teaches the Six Food-Friendliness Dimensions in prose ([Companion Book page](https://app.notion.com/p/3a853652f27281358526f3ef3f7f92c0)). Digest content and research artifacts double as its source material, so treat research with the same weight as features, written with citations, honest tiers and plain language.

## Named, unresolved risks (product, not engineering)

1. **Logging discipline and retention.** The single biggest risk to the whole vision is whether a person will log consistently enough, over weeks and months, for contextual reminders and trend correlation to mean anything. Most health-tracking apps fail here, not on missing features. Worth testing this assumption cheaply before building the full data model around it.
2. **Signal quality.** Whether symptom and food correlation-finding on noisy, confounded, n=1 personal data surfaces patterns versus things that merely look like patterns. Must be handled honestly in-product, showing confidence and never asserting causation.

## Open next steps

Each item's full wording is in the archive; rows live in the Project Tracker.

2. **On-device walkthrough of the personal rules feature.**
3. **Ingredient-rotation feature:** permanent against rotating ingredients in smoothies and salads. Unbuilt, no schema.
4. **Cloud sync, multi-device, and the Partner/Household/Guardian/Caregiver tier model**, still architecture-only. The local encrypted backup and restore (2026-08-16) and device-to-device recipe sharing (2026-08-15/16) are different, narrower features and did not become this.
6. **A home category for protein and meal-replacement powders** and, 7, **juice and fruit-drink powders**: neither belongs in `Brewing`; no decision yet.
8. **Sticky group headers spot-check** on the largest categories (Veg, Mixed, Meat).
9. **A "home brew" ingredient-based path for beer, wine and spirits**, closer to Fermentation Builder than to barcodes. No design work.
10. **The synthetic "Choline Bitartrate (Supplement Powder)" food row**: proposed, deliberately not added.
11. **The owner's questions on the unified database's curation report**, the next step on that track (see its section above).
12. **6-Week Meal Plan on-device walkthrough**; whether to extend past 6 weeks has not been asked.
13. **Subtopic-sectioning the 19 condition pages' topics**: pull per-topic counts before designing any split.
14. **Wiring conditions, allergies and diet through every tool:** still open for Today's Advisories, and whether builders' embedded `FoodLookup` gains the For You card (ask first).
15, 16, 19, 20 and 21. **CLOSED**: recipe coverage per diet, condition and meal, quick-log, and personal nutrient targets. Accounts in `docs/CLAUDE-ARCHIVE-2026-09-14.md`.
17. **A corpus-wide audit for missing cooking-water ingredient rows** across the recipes that simmer, boil or braise.
18. **Batch-remake-cadence planning for make-ahead foods**: the Fermentation Tracker knows yield and remaining, but no consumption rate or household size, so it cannot predict a next-batch reminder.
22 to 26. **Parked from a 2026-08-30 competitor review:** Get Back on Track, a weekly check-in retuning targets, TRACK mode, menstrual cycle tracking in Pattern Finder, and "allergen-aware, not allergy-safe" wording.

27. **External data program**, nine lookup projects behind one Cloudflare Worker, Decision row [three privacy shapes, one Worker](https://app.notion.com/p/3db53652f272816d8051f1d335574853). Not built.

28. **The daily-living program for the second audience**, eleven Project Tracker rows (2026-09-16). Most of it reaches Home now, Simple View and One Next Thing included; still unbuilt are **a way in that does not require a condition**, and **whether ADHD and autism become selectable profiles** without implying that diet treats them.

29. **What grows on the freed tab screens**, designed, not built ([Decision](https://app.notion.com/p/3e553652f27281c383fcc4155c7b6e79)). **What grows is made of the person's records, never awarded for them**: no streaks, levels, points, percentages, praise or animation.

30. **The competitive build plan, decided 2026-09-25, work starting 2026-09-26.** Every gap from the nine per-tab competitor reviews, 219 items in eight phases, nothing left out by direct instruction. Read `docs/competitive-review/BUILD-PLAN.md` first (start-here order, rebuild map, what waits on the owner); edit `docs/competitive-review/plan/items.txt` and regenerate rather than editing the md. Phase 1: A1, B1, C1, D1, D2, X1, F9, F1, K3, G1.

31. **Interests, the tenth tab, plus Projects and Share to Lifestead** ([Decision](https://app.notion.com/p/3e753652f27281488613cded8a054483)). All of its lenses are built; the share target needs a rebuild. Nothing pushes an interest toward earning, and [Making It Pay](https://app.notion.com/p/3e753652f2728132b238f59188fc3946) never advises starting a business or quitting a job. Languages sits on it too (item 37). Colour: rose, `colors.tabInterests`.

32. **Eighteen gaps from the 2026-09-26 review, plus the Diary**, all kept in scope by direct instruction and none ranked. Index: [Gap review 2026-09-26](https://app.notion.com/p/3e753652f2728169aff4d14fb6dc121f). The [Diary](https://app.notion.com/p/3e753652f27281c590add1a9394c2254) absorbs Signals > General Note.

33. **Working life and a resume, plus saving exports to a folder**, not built: [Working life](https://app.notion.com/p/3e753652f272819e88fcdf1f3d6d5746), [Reports saved to a folder](https://app.notion.com/p/3e753652f27281ac8312e58fdda73b4d). Health never appears on a resume unless the person puts it there.

34. **Family health history with a family tree, and Contacts**, not built: [Family health history](https://app.notion.com/p/3e753652f27281c5ac3ce8c6cdf5e8fd), [Contacts](https://app.notion.com/p/3e753652f272814bb030f58c7d1b07b0). Never a risk figure, off the between-people allowlist by default. Phone contact import is rebuild-gated.

35. **A second gap review, eleven gaps, plus Ready for tomorrow** (2026-09-26), all kept in scope by direct instruction, none built: [Second gap review](https://app.notion.com/p/3e753652f272810c8ae1cb1fcda1a6cd), [Ready for tomorrow](https://app.notion.com/p/3e753652f27281029548dd7fdd913fb4).

36. **App Lock** ([row](https://app.notion.com/p/3ed53652f27281a3908bdf3cdf65921d), `docs/app-lock-spec.md`) is built on phone and desktop (`desktop/sealedDb.js`, `scripts/test_desktop_seal.js`). **The vault** (`lib/vaultOffer.ts`, `scripts/test_vault.js`): records only, never tools; `listed` categories (meds, conditions, appointments) are only hidden by screens so safety warnings and scoring keep reading them. (Archive.)

37. **Learn, a lens on Interests, with Inside Knowledge on Home** ([Decision](https://app.notion.com/p/3f153652f27281e9ac22f22f20fddfa9)). Three rules: **most questions in every deck are critical-thinking questions**; **percentages exist only behind a link the person opens**, since progress is things now known, a count that only grows; and **ready-made decks are Free, making your own is paid**. Not gamified. **Languages is a separate lens beside Learn (1.0.82.2), never a course library, which Tony rejected on 2026-11-05**: 26 plainly named units turned on to Home, a card's +, = and minus signs on a ladder of days replayed from `learn_reviews` in place of FSRS, because FSRS has no way to say same rotation (`lib/languageBasics.ts`, `scripts/test_learn_courses.js`). Only sets taught from the app's language show. Both sets ship in every version (`lib/learnCoursesBundled.ts`). Tony settled this on 2026-11-06: flashcards of freely available material with the gaps filled in, so nothing about them is held back or waits on anyone. (Archive.)

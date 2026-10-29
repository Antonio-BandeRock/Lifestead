// A how-to for every tool on every lens (1.0.68.16), step 3 of the
// 2026-10-12 request: "a how-to for every tool on every lens, with visual
// and written steps."
//
// The tutorials (lib/tutorials.ts) began with what the guides already
// covered: getting to each lens, and the guide steps done on it. Most lenses
// have more on them than any guide names, so each tool gets a how-to here:
// a title saying what it does, the taps one line at a time, and a last line
// saying what it does for the person. lib/tutorials.ts puts the getting-there
// lines in front, so any one how-to can be started on its own from Profile.
//
// Each line that names one button carries that button's mark, and the
// screen passes the same name to walkMark.ref, so the ring lands on it
// (components/WalkMark.ts). A line that goes on past its button ("Tap Edit
// and change what you need") carries `stay`, so the line stays up while the
// form is filled in and Next moves it on. A line about a button inside a
// list rings the first row's button, the way 'garden.area' does.
//
// Written steps and pictures: the Tutorials page lists every how-to's lines
// to read, each beside a screenshot of that moment on the phone
// (lib/tutorialShots.ts), taken over USB against example records and taken
// again whenever a screen changes (decided 2026-10-12).
//
// A tab is listed in TOOL_TABS_DONE once every lens on it has its tools
// here, and scripts/test_tutorials.js then fails if a lens on it has none.
// Only a type import, so that test reads it in plain node.
//
// A band that folds is named in the line before its buttons ("Open the band
// called Who to call"), since a closed band hides them and no ring can
// reach a button that is not drawn.

import type { WalkMark } from './storyWalk';
import type { HomeSectionKey } from './visualPreferences';

// Marks first named here; a tool line may also use a mark the guides use.
export type ToolMark =
  | 'myMeds.otc'
  | 'myMeds.supplement'
  | 'myMeds.ingredient'
  | 'myMeds.saveSupplement'
  | 'myMeds.label'
  | 'myMeds.tracking'
  | 'myMeds.details'
  | 'myMeds.edit'
  | 'myMeds.schedule'
  | 'myMeds.remove'
  | 'myMeds.drugChecker'
  | 'emergency.pickContact'
  | 'emergency.savePerson'
  | 'emergency.call'
  | 'emergency.checked'
  | 'emergency.showCard'
  | 'emergency.sendCard'
  | 'emergency.copy'
  | 'emergency.wallet'
  | 'emergency.lockScreen'
  | 'todo.done'
  | 'todo.change'
  | 'todo.letGo'
  | 'todo.remove'
  | 'todo.add'
  | 'todo.showDone'
  | 'work.overview'
  | 'work.todos'
  | 'work.have'
  | 'work.ask'
  | 'work.feel'
  | 'work.use'
  | 'work.edit'
  | 'work.reset'
  | 'work.remove'
  | 'work.answerWeek'
  | 'starter.open'
  | 'starter.addTicked'
  | 'starter.makeRoutine'
  | 'upkeep.schedules'
  | 'upkeep.done'
  | 'upkeep.renew'
  | 'upkeep.edit'
  | 'upkeep.remove'
  | 'kitchen.food'
  | 'kitchen.non_food'
  | 'kitchen.add'
  | 'kitchen.saveNew'
  | 'kitchen.scan'
  | 'kitchen.row'
  | 'kitchen.place'
  | 'kitchen.useBy'
  | 'kitchen.use'
  | 'kitchen.toList'
  | 'kitchen.gone'
  | 'kitchen.giveAway'
  | 'routines.steps'
  | 'routines.change'
  | 'routines.moveDown'
  | 'routines.remove'
  | 'routines.stepDown'
  | 'routines.stepEdit'
  | 'routines.speak'
  | 'didIDoIt.yes'
  | 'didIDoIt.mistake'
  | 'didIDoIt.change'
  | 'didIDoIt.moveDown'
  | 'didIDoIt.remove'
  | 'didIDoIt.save'
  | 'daysUntil.add'
  | 'daysUntil.save'
  | 'daysUntil.done'
  | 'daysUntil.remove'
  | 'finance.overview'
  | 'finance.health'
  | 'finance.upcoming'
  | 'finance.money'
  | 'finance.goals'
  | 'finance.addIncome'
  | 'finance.billEdit'
  | 'finance.billPause'
  | 'finance.billRemove'
  | 'finance.billSave'
  | 'finance.recordSave'
  | 'finance.setLimit'
  | 'finance.limitSave'
  | 'finance.limitRemove'
  | 'finance.entryRemove'
  | 'finance.planAdd'
  | 'finance.planEdit'
  | 'finance.fsaAdd'
  | 'finance.medAdd'
  | 'finance.medPaid'
  | 'finance.medDispute'
  | 'finance.medRemove'
  | 'finance.accountAdd'
  | 'finance.accountUpdate'
  | 'finance.accountRemove'
  | 'finance.goalAdd'
  | 'finance.costAdd'
  | 'finance.contribute'
  | 'finance.goalReached'
  | 'finance.goalSetAside'
  | 'finance.goalDelete'
  | 'grocery.check'
  | 'grocery.open'
  | 'grocery.priceCamera'
  | 'grocery.sale'
  | 'grocery.priceSave'
  | 'grocery.scanItem'
  | 'grocery.compare'
  | 'grocery.removeItem'
  | 'grocery.addItem'
  | 'grocery.refresh'
  | 'grocery.scan'
  | 'grocery.scanHousehold'
  | 'grocery.send'
  | 'grocery.store'
  | 'grocery.aisles'
  | 'grocery.takeKitchen'
  | 'grocery.finish'
  | 'grocery.delete'
  | 'grocery.newList'
  | 'grocery.days'
  | 'grocery.people'
  | 'grocery.build'
  | 'grocery.earlier'
  | 'conditions.search'
  | 'conditions.curious'
  | 'conditions.extra'
  | 'conditions.topic'
  | 'family.change'
  | 'family.remove'
  | 'family.save'
  | 'movement.connect'
  | 'movement.sync'
  | 'movement.settings'
  | 'movement.stop'
  | 'movement.signal'
  | 'movement.sendWater'
  | 'movement.sendNutrition'
  | 'workouts.build'
  | 'workouts.exercise'
  | 'workouts.save'
  | 'workouts.exerciseSave'
  | 'workouts.stepSave'
  | 'workouts.start'
  | 'workouts.sets'
  | 'workouts.howTo'
  | 'workouts.takeOut'
  | 'workouts.add'
  | 'workouts.rename'
  | 'workouts.remove'
  | 'workouts.search'
  | 'workouts.gentle'
  | 'workouts.openExercise'
  | 'workouts.addTo'
  | 'workouts.myVersion'
  | 'workouts.changeExercise'
  | 'workouts.removeExercise'
  | 'workout.begin'
  | 'workout.done'
  | 'workout.ready'
  | 'workout.save'
  | 'reading.search'
  | 'reading.searchHelp'
  | 'reading.entry'
  // Home: a band's name row by its card key, a tab group's by its path.
  | `homeBand.${HomeSectionKey}`
  | `homeGroup.${string}`
  | 'home.arrangeEye'
  | 'home.arrangeGrip'
  | 'home.arrangeDone'
  | 'home.captureType'
  | 'home.captureSay'
  | 'home.captureSort'
  | 'home.nextGo'
  | 'home.nextNotNow'
  | 'home.waitingOpen'
  | 'home.waitingAnswer'
  | 'home.waitingKinds'
  | 'home.waitingChoose'
  | 'home.oneAtATime'
  | 'home.morningSleep'
  | 'home.morningEnergy'
  | 'home.morningSave'
  | 'home.morningChange'
  | 'home.mealSay'
  | 'home.mealPhoto'
  | 'home.mealFind'
  | 'home.usualHad'
  | 'home.usualElse'
  | 'home.usualList'
  | 'home.usualNotToday'
  | 'home.groceryOpen'
  | 'home.groceryType'
  | 'home.groceryAdd'
  | 'home.groceryQuickOpen'
  | 'home.pickFrom'
  | 'home.pickNew'
  | 'home.pickMark'
  | 'home.routine'
  | 'home.routineWayIn'
  | 'home.check'
  | 'home.checkWayIn'
  | 'home.workoutStart'
  | 'home.workoutDidIt'
  | 'home.ring'
  | 'home.chooseNutrients'
  | 'home.reportWindow'
  | 'home.lowStim'
  | 'header.checkUpdates'
  | 'home.readCards'
  | 'home.setupCards'
  | 'home.setupCardGo'
  | 'lens.feedsThis'
  | 'lens.feedsThisGo'
  | 'appointments.add'
  | 'appointments.addCalendar'
  | 'appointments.cancel'
  | 'appointments.completed'
  | 'appointments.edit'
  | 'appointments.import'
  | 'appointments.listBand'
  | 'appointments.remove'
  | 'appointments.save'
  | 'appointments.say'
  | 'exercise.add'
  | 'exercise.save'
  | 'hydration.indexBand'
  | 'hydration.quick'
  | 'hydration.todayBand'
  | 'hydration.undo'
  | 'mealPlan.addToSchedule'
  | 'mealPlan.days'
  | 'mealPlan.diet'
  | 'mealPlan.firstDay'
  | 'mealPlan.generate'
  | 'mealPlan.regenerateDay'
  | 'mealPlan.styles'
  | 'meds.checkBand'
  | 'meds.myMeds'
  | 'meds.skipDose'
  | 'meds.taken'
  | 'meds.todayBand'
  | 'meds.watchAlerts'
  | 'pastMeals.adjust'
  | 'pastMeals.leftovers'
  | 'pastMeals.listBand'
  | 'pastMeals.loggedAdjust'
  | 'pastMeals.loggedBand'
  | 'schedule.addCalendar'
  | 'schedule.addHousehold'
  | 'schedule.addNote'
  | 'schedule.buyingFor'
  | 'schedule.calendarView'
  | 'schedule.dayBand'
  | 'schedule.days'
  | 'schedule.eatAgain'
  | 'schedule.edit'
  | 'schedule.householdBand'
  | 'schedule.leftovers'
  | 'schedule.move'
  | 'schedule.notesBand'
  | 'schedule.offPlan'
  | 'schedule.putOnMine'
  | 'schedule.remove'
  | 'schedule.repeat'
  | 'schedule.rotate'
  | 'schedule.saveHousehold'
  | 'schedule.saveMeal'
  | 'schedule.saveNote'
  | 'schedule.saveWeek'
  | 'schedule.skip'
  | 'schedule.unplanned'
  | 'schedule.useWeek'
  | 'schedule.weekNext'
  | 'schedule.weeksBand'
  | 'timeline.calendar'
  | 'timeline.moveRest'
  | 'timeline.strip'
  | 'todaysMeals.doseBand'
  | 'todaysMeals.mealBand'
  | 'upkeepLens.add'
  | 'upkeepLens.doneToday'
  | 'upkeepLens.edit'
  | 'upkeepLens.firstBand'
  | 'signals.add'
  | 'signals.save'
  | 'signals.editFirst'
  | 'signals.photosFirst'
  | 'signals.removeFirst'
  | 'newFoods.addExperiment'
  | 'newFoods.addSeries'
  | 'newFoods.startSeries'
  | 'newFoods.startExperiment'
  | 'newFoods.resolve'
  | 'newFoods.today'
  | 'trackers.addTracker'
  | 'trackers.saveTracker'
  | 'trackers.pick'
  | 'trackers.rename'
  | 'calm.pacer'
  | 'calm.start'
  | 'calm.readAloud'
  | 'calm.play'
  | 'microbiome.form'
  | 'microbiome.photo'
  | 'microbiome.readLines'
  | 'microbiome.firstTest'
  | 'microbiome.across'
  | 'builder.kind'
  | 'builder.name'
  | 'builder.continue'
  | 'builder.addIngredients'
  | 'builder.saveAddNew'
  | 'builder.saveFinish'
  | 'builder.nudge'
  | 'builder.favorite'
  | 'builder.preview'
  | 'builder.complete'
  | 'builder.systemRecipes'
  | 'ferment.drink'
  | 'ferment.startToday'
  | 'ferment.later'
  | 'ferment.reminder'
  | 'ferment.own'
  | 'meal.startFrom'
  | 'meal.continue'
  | 'meal.addFrom'
  | 'meal.addToMeal'
  | 'meal.logNow'
  | 'meal.schedule'
  | 'meal.scheduleIt'
  | 'findMeal.scope'
  | 'findMeal.group'
  | 'findMeal.meal'
  | 'findMeal.tick'
  | 'findMeal.use'
  | 'findMeal.build'
  | 'findMeal.eatenOut'
  | 'findMeal.logOut'
  | 'findMeal.logNow'
  | 'findMeal.earlier'
  | 'findMeal.schedule'
  | 'findMeal.scheduleIt'
  | 'findMeal.replace'
  | 'findMeal.menu'
  | 'findMeal.menuPhoto'
  | 'scan.frame'
  | 'scan.ingredientsPhoto'
  | 'scan.continue'
  | 'scan.readAloud'
  | 'scan.logEaten'
  | 'scan.logIt'
  | 'scan.buy'
  | 'scan.pricePhoto'
  | 'scan.savePrice'
  | 'scan.grocery'
  | 'recipes.search'
  | 'recipes.diet'
  | 'recipes.group'
  | 'recipes.recipe'
  | 'recipes.build'
  | 'import.read'
  | 'import.paste'
  | 'import.readLines'
  | 'import.line'
  | 'import.builder'
  | 'import.open'
  | 'import.past'
  | 'garden.findZone'
  | 'garden.zone'
  | 'garden.sown'
  | 'garden.savePlanting'
  | 'garden.pastAreas'
  | 'garden.bringBack'
  | 'garden.spreadsheet'
  | 'garden.saveArea'
  | 'garden.keepOnHand'
  | 'garden.saveHarvest'
  | 'garden.addHarvest'
  | 'garden.onHand'
  | 'garden.yield'
  | 'garden.addTask'
  | 'sowing.how'
  | 'sowing.now'
  | 'sowing.every'
  | 'sowing.sky'
  | 'sowing.tradition'
  | 'seeds.add'
  | 'seeds.save'
  | 'seeds.packet'
  | 'seeds.test'
  | 'seeds.saveTest'
  | 'seeds.change'
  | 'seeds.putAway'
  | 'seeds.bringBack'
  | 'compost.start'
  | 'compost.startIt'
  | 'compost.read'
  | 'compost.action'
  | 'compost.save'
  | 'compost.turnEvery'
  | 'compost.status'
  | 'compost.deletePile'
  | 'conditions.record'
  | 'conditions.next'
  | 'conditions.measure'
  | 'conditions.measureLight'
  | 'conditions.save'
  | 'conditions.import'
  | 'conditions.sensors'
  | 'conditions.trends'
  | 'costs.add'
  | 'costs.save'
  | 'costs.combine'
  | 'costs.saveGroup'
  | 'costs.byArea'
  | 'costs.bill'
  | 'costs.saveBill'
  | 'costs.baseline'
  | 'costs.recordElectric'
  | 'costs.electricity'
  | 'crops.wrong'
  | 'crops.grow'
  | 'crops.card'
  | 'bands.band'
  | 'bands.missing'
  | 'cooking.pick'
  | 'insights.about'
  | 'insights.drill'
  | 'label.box'
  | 'label.reason'
  | 'label.sources'
  | 'labs.add'
  | 'labs.save'
  | 'labs.test'
  | 'lookup.portion'
  | 'lookup.voice'
  | 'lookup.why'
  | 'meds.addRule'
  | 'meds.delete'
  | 'meds.pause'
  | 'meds.ruleText'
  | 'meds.saveRule'
  | 'meds.source'
  | 'meds.tie'
  | 'nutrients.compare'
  | 'nutrients.row'
  | 'portions.meals'
  | 'ranking.change'
  | 'ranking.mode'
  | 'ranking.nutrient'
  | 'ranking.prep'
  | 'safe.pick'
  | 'sixDs.dimension'
  | 'sixDs.tier'
  | 'stage.pick'
  | 'compare.a'
  | 'compare.b'
  | 'compare.meals'
  | 'compare.partner'
  | 'compare.range'
  | 'compare.tags'
  | 'patterns.outcome'
  | 'patterns.rule'
  | 'patterns.save'
  | 'patterns.test'
  | 'patterns.weather'
  | 'patterns.window'
  | 'squares.crumb'
  | 'squares.now'
  | 'squares.record'
  | 'squares.square'
  | 'squares.step'
  | 'trends.band'
  | 'trends.custom'
  | 'trends.cycle'
  | 'trends.food'
  | 'trends.measure'
  | 'trends.nutrient'
  | 'trends.range'
  | 'trends.test'
  | 'reports.again'
  | 'reports.csv'
  | 'reports.custom'
  | 'reports.gardenCsv'
  | 'reports.pdf'
  | 'reports.print'
  | 'reports.range'
  | 'reports.remove'
  | 'reports.section'
  | 'reports.sections'
  | 'reports.text'
  | 'reports.who'
  | 'reports.whoSave';

export type ToolStep = {
  say: string;
  mark?: WalkMark;
  // The line goes on past its button, so a tap on it does not move on.
  stay?: boolean;
};

export type ToolHowTo = {
  // Unique on its lens.
  key: string;
  // What it does, said as something to do.
  title: string;
  steps: ToolStep[];
  // The last line: what this does for the person.
  forYou: string;
};

/** Tool how-tos by lens key, `${path}#${lens}` (Home is `/#home`). */
// Health Literacy and Earth Matters are drawn by the same reading lens, so
// they share their how-tos and differ only in the name and one closing line.
function readingHowTos(lens: string, readNote: string): ToolHowTo[] {
  return [
    {
      key: 'read',
      title: `Read an entry in ${lens}`,
      steps: [
        { say: 'Open the band with the name of the topic you want.' },
        { say: 'Swipe along a row of cards to see every entry in it. A topic with smaller groups has a row for each.' },
        { say: 'Tap Read on a card. The entry opens under the row, and Close puts it away.', mark: 'reading.entry' },
      ],
      forYou: readNote,
    },
    {
      key: 'search',
      title: `Search within ${lens}`,
      steps: [
        { say: 'Type a word or two in the search box at the top.', mark: 'reading.search', stay: true },
        { say: 'Tap a result to read it. Clear the box to go back to the bands.', mark: 'reading.entry' },
      ],
      forYou: `Only ${lens} is searched, and the best matches come first.`,
    },
    {
      key: 'dots',
      title: 'Read what the dots under a result mean',
      steps: [
        { say: 'Tap the small i at the end of the search box.', mark: 'reading.searchHelp' },
      ],
      forYou: 'A filled dot means that word is in the title, an outlined one that it is in the text, and a grey one that the entry does not have it.',
    },
    {
      key: 'related',
      title: 'Follow a link to a related entry',
      steps: [
        { say: 'Open an entry.', mark: 'reading.entry', stay: true },
        { say: 'Under Related at the end of it, tap a name.' },
      ],
      forYou: 'An entry on this lens opens in place. One that lives elsewhere opens on the tab and lens where it lives.',
    },
  ];
}

// The eleven dish builders share one screen, so they share one set of
// how-tos, worded with the dish each one makes.
function builderHowTos(o: {
  // The dish, as its Save and Complete buttons say it: Side, Baked Good.
  noun: string;
  // Lines that come before the name, picking the kind of drink or ferment.
  firstSteps?: ToolStep[];
  // Fermentation asks nothing about cooking oil or seasoning.
  noNudge?: boolean;
  // Salads and smoothies warn about several raw goitrogenic vegetables.
  goitrogens?: boolean;
}): ToolHowTo[] {
  const lower = o.noun.toLowerCase();
  const first = o.firstSteps ?? [];
  const nudge: ToolStep[] = o.noNudge
    ? []
    : [{ say: 'If it asks about cooking oil, fat or seasoning, tap + Add Ingredient to add it, or None used, continue.', mark: 'builder.nudge', stay: true }];
  const goitrogens: ToolStep[] = o.goitrogens
    ? [{ say: 'If it warns about several raw goitrogenic vegetables together, tap Go back and adjust to change them, or Continue anyway.' }]
    : [];
  return [
    {
      key: 'build',
      title: `Build a ${lower} from its ingredients`,
      steps: [
        ...first,
        { say: `Type a name for the ${lower}.`, mark: 'builder.name', stay: true },
        { say: 'Pick the number of servings and the serving size, then tap Continue.', mark: 'builder.continue' },
        {
          say: 'Tap Add Ingredients, then pick a food: say its name, look in Whole Foods or My Food Products, or pick by the nutrient it is richest in.',
          mark: 'builder.addIngredients',
        },
        { say: 'Set the quantity and units, and how it is cut and cooked. Tap Save & Add New to add the next one.', mark: 'builder.saveAddNew', stay: true },
        { say: `After the last ingredient, tap Save & Finish ${o.noun}.`, mark: 'builder.saveFinish' },
        ...nudge,
        ...goitrogens,
        { say: `Tap Complete & Save This ${o.noun}.`, mark: 'builder.complete' },
      ],
      forYou: `The ${lower} goes in My Recipes, ready to add to a meal, log or schedule without building it again.`,
    },
    {
      key: 'report',
      title: 'Read the full report before you save',
      steps: [
        ...first,
        { say: 'Name it, pick the servings and add the ingredients.', mark: 'builder.name', stay: true },
        { say: 'Tap Preview Full Report.', mark: 'builder.preview' },
        { say: 'Read it, then close it and carry on building.' },
      ],
      forYou: 'You see what the dish brings and anything in it that touches what you set in Profile, while it can still be changed.',
    },
    {
      key: 'favorite',
      title: 'Keep it as a favorite',
      steps: [
        ...first,
        { say: 'Build it the usual way.', mark: 'builder.name', stay: true },
        { say: 'Before you save, tick Also save as a Favorite, for fast reuse later.', mark: 'builder.favorite' },
        { say: `Tap Complete & Save This ${o.noun}.`, mark: 'builder.complete' },
      ],
      forYou: 'A dish you make often is kept with your favorites, so it can be added to a meal in a tap.',
    },
    {
      key: 'fromRecipe',
      title: 'Start from a recipe built into the app',
      steps: [
        ...first,
        { say: 'Under Find a Recipe, tap System Recipes (built into the app).', mark: 'builder.systemRecipes' },
        { say: 'Find the recipe, open it, and tap Build This Recipe.' },
      ],
      forYou: 'The builder opens with the recipe filled in, ready for you to change what you need before saving it.',
    },
  ];
}

// The lenses that read records kept on other tabs and lay them out in
// bands share one shape: open a band, and follow the Your Guide link when
// nothing has been recorded yet. Insights and Trends both use it.
function bandsHowTos(lens: string, bands: string, readNote: string, emptyNote: string): ToolHowTo[] {
  return [
    {
      key: 'read',
      title: `Read ${lens}`,
      steps: [
        { say: `Open a band: ${bands}.`, mark: 'bands.band' },
        { say: 'Tap it again to fold it away.' },
      ],
      forYou: readNote,
    },
    {
      key: 'empty',
      title: 'Find out what this lens needs before it can show anything',
      steps: [
        { say: 'If a line at the top says what is missing, read it.' },
        { say: 'Tap Where this fits in Your Guide.', mark: 'bands.missing' },
      ],
      forYou: emptyNote,
    },
  ];
}

// Most Trends lenses share one way of being read: pick how far back, open a
// band. The lenses that can draw period days behind their charts add one
// more how-to for that switch.
function trendsHowTos(o: {
  // What the read how-to is called: 'Read your weight over time'.
  title: string;
  // The bands, as a reader would name them, or null when the lens draws
  // its charts without bands.
  bands: string | null;
  forYou: string;
  // Garden Yield, Growing Conditions and What It Costs count by month.
  months?: boolean;
  shade?: boolean;
  more?: ToolHowTo[];
}): ToolHowTo[] {
  const range: ToolStep = o.months
    ? { say: 'Tap how far back to look: the last 12 months, the last 2 years, or everything.', mark: 'trends.range' }
    : { say: 'Tap how far back to look along the top.', mark: 'trends.range' };
  const read: ToolStep = o.bands
    ? { say: `Open a band: ${o.bands}.`, mark: 'trends.band' }
    : { say: 'Read the chart. Tap a band to fold it away or open it again.', mark: 'trends.band' };
  const list: ToolHowTo[] = [{ key: 'read', title: o.title, steps: [range, read], forYou: o.forYou }];
  if (o.shade) {
    list.push({
      key: 'shade',
      title: 'Shade the days of your period on the charts',
      steps: [{ say: 'Turn on Shade period days.', mark: 'trends.cycle' }],
      forYou: 'The period days you logged in Signals > Cycle are drawn as pale columns behind every chart on Trends. The switch shows once a period day is logged.',
    });
  }
  return [...list, ...(o.more ?? [])];
}

// A Trends lens that reads records kept on another tab says what it needs
// first, with a way into Your Guide.
function whatItNeeds(note: string): ToolHowTo {
  return {
    key: 'empty',
    title: 'Find out what this lens needs before it can show anything',
    steps: [
      { say: 'If a line at the top says what is missing, read it.' },
      { say: 'Tap Where this fits in Your Guide.', mark: 'bands.missing' },
    ],
    forYou: note,
  };
}

// The Trends lenses drawn from records kept on other tabs: pick how far
// back, open a band, and, where the lens needs a record first, follow the
// Your Guide link.
function moreTrendsHowTos(lens: string, bands: string, readNote: string, emptyNote?: string): ToolHowTo[] {
  const read: ToolHowTo = {
    key: 'read',
    title: `Read ${lens} over time`,
    steps: [
      { say: 'Tap how far back to look along the top.', mark: 'trends.range' },
      { say: `Open a band: ${bands}.`, mark: 'bands.band' },
    ],
    forYou: readNote,
  };
  return emptyNote ? [read, whatItNeeds(emptyNote)] : [read];
}

// Every report shares one set of tools: pick a range, choose its sections,
// send it, save its tables, and make it again from the history. Each lens
// differs only in what the report holds and who it is for.
function reportHowTos(o: { name: string; holds: string; rangeNote?: string; more?: ToolHowTo[] }): ToolHowTo[] {
  return [
    {
      key: 'make',
      title: `Make ${o.name}`,
      steps: [
        { say: 'Tap how far back the report should reach.', mark: 'reports.range' },
        { say: 'Read the report below. It is laid out as it will be sent.' },
      ],
      forYou: `${o.holds}${o.rangeNote ? ' ' + o.rangeNote : ''}`,
    },
    {
      key: 'custom',
      title: 'Start the report on a day you choose',
      steps: [
        { say: 'Tap Custom at the end of the range pills.', mark: 'reports.custom' },
        { say: 'Pick the year, month and day it starts from. It runs through today.' },
      ],
      forYou: 'Useful for a report covering everything since a diagnosis, a new medicine or a change you made.',
    },
    {
      key: 'sections',
      title: 'Leave a section out of the report',
      steps: [
        { say: 'Tap Sections in this report.', mark: 'reports.sections' },
        { say: 'Untick a section to leave it out. Tick it again to put it back.', mark: 'reports.section' },
      ],
      forYou: 'A section left out is not read at all, and the report says sections were left out without naming them. This report remembers the choice.',
    },
    {
      key: 'send',
      title: 'Send or print the report',
      steps: [
        { say: 'Tap Share as PDF to send it laid out as pages.', mark: 'reports.pdf' },
        { say: 'Or tap Print to print it.', mark: 'reports.print' },
        { say: 'Or tap Share as text to paste it into a message.', mark: 'reports.text' },
      ],
      forYou: 'The report is made on this device. Nothing is sent anywhere until you pick where it goes.',
    },
    {
      key: 'csv',
      title: 'Save the report as a spreadsheet',
      steps: [{ say: 'Under Save as a Spreadsheet, tap Whole report or one of its tables.', mark: 'reports.csv' }],
      forYou: 'Each file opens in any spreadsheet app, so the figures can be sorted and added up.',
    },
    {
      key: 'history',
      title: 'Make a report again, or note who it was for',
      steps: [
        { say: 'In the list of reports made, tap Make it again to rebuild one with the same sections and range.', mark: 'reports.again' },
        { say: 'Tap Who it was for to add a name.', mark: 'reports.who' },
        { say: 'Type the name or tap one used before, then tap Save.', mark: 'reports.whoSave' },
        { say: 'Tap Remove to take a line out of the list.', mark: 'reports.remove' },
      ],
      forYou: 'Every report you send or save is kept in this list. Removing a line does not touch the report wherever it was sent.',
    },
    ...(o.more ?? []),
  ];
}

export const TOOL_HOW_TOS: Record<string, ToolHowTo[]> = {
  '/life#myMeds': [
    {
      key: 'otc',
      title: 'Add a medicine bought without a prescription',
      steps: [
        { say: 'Tap + OTC drug.', mark: 'myMeds.otc' },
        { say: 'Type its name and pick it from the list. If it is not there, tap Not in the list? Enter it myself.' },
        { say: 'Fill in what you know of the dose and how often you take it, then tap Add OTC drug.' },
      ],
      forYou: 'The timing rules then check it against your other medicines, your supplements and your food, and it goes on your emergency card.',
    },
    {
      key: 'supplement',
      title: 'Add a supplement and what is in it',
      steps: [
        { say: 'Tap + Supplement.', mark: 'myMeds.supplement' },
        { say: 'Type its name.' },
        { say: 'Tap + Add ingredient for each nutrient on its label, and fill in the amount of each.', mark: 'myMeds.ingredient', stay: true },
        { say: 'Tap Add supplement.', mark: 'myMeds.saveSupplement' },
      ],
      forYou: 'What it supplies is counted beside what your food supplies, so you can see which of the two met a target.',
    },
    {
      key: 'label',
      title: 'Look up the label of a medicine',
      steps: [
        { say: 'Tap Look up a label.', mark: 'myMeds.label' },
        { say: 'Scan the barcode on the box, type the code from the pharmacy label, or type the name of the medicine.' },
      ],
      forYou: 'You can read the printed label of a medicine without the box in your hand.',
    },
    {
      key: 'details',
      title: 'See what is in one of them',
      steps: [
        { say: 'Find it in the list and tap Details under it.', mark: 'myMeds.details' },
        { say: 'Tap Hide details to fold it away again.' },
      ],
      forYou: 'What it holds and what is known about it are one tap away, without opening a form.',
    },
    {
      key: 'edit',
      title: 'Change the details of one',
      steps: [
        { say: 'Tap Edit under the one to change.', mark: 'myMeds.edit', stay: true },
        { say: 'Change what you need, then save it.' },
      ],
      forYou: 'The dose stays right everywhere the app reads it: the timing rules, the emergency card and your reports.',
    },
    {
      key: 'schedule',
      title: 'Set the times you take one',
      steps: [
        { say: 'Tap Schedule it under the one you want.', mark: 'myMeds.schedule' },
        { say: 'Schedules opens on Meds. Set the times you take it there.' },
      ],
      forYou: 'Reminders come at those times, and each dose is checked against the meals around it.',
    },
    {
      key: 'tracking',
      title: 'Stop tracking one without removing it',
      steps: [
        { say: 'Tap Tracking under it. It changes to Not tracking.', mark: 'myMeds.tracking' },
        { say: 'Tap Not tracking to start tracking it again.' },
      ],
      forYou: 'It stays on the list with everything recorded about it, ready for the next time you take it.',
    },
    {
      key: 'remove',
      title: 'Remove one for good',
      steps: [
        { say: 'Tap Remove under it.', mark: 'myMeds.remove' },
        { say: 'Tap Remove again to say yes. This cannot be undone, so use Not tracking if you may take it again.' },
      ],
      forYou: 'Your list holds only what you take, or have taken and may take again.',
    },
    {
      key: 'drugChecker',
      title: 'Check two drugs against each other',
      steps: [
        { say: 'Scroll down and open the band called Drug to drug checks.' },
        { say: 'Tap Open the Drugs.com interaction checker.', mark: 'myMeds.drugChecker' },
        { say: 'Type the names in there yourself.' },
      ],
      forYou: 'A public checker covers far more drug pairs than the rules in this app, and nothing from the app is sent to it.',
    },
  ],
  '/life#emergency': [
    {
      key: 'addPerson',
      title: 'Add someone to call',
      steps: [
        { say: 'Open the band called Who to call.' },
        { say: 'Tap Add someone.', mark: 'emergency.addPerson' },
        { say: 'Tap Pick from contacts, or type their name and number.', mark: 'emergency.pickContact', stay: true },
        { say: 'Tap Save.', mark: 'emergency.savePerson' },
      ],
      forYou: 'They go on your emergency card, and the one you choose to try first is at the top.',
    },
    {
      key: 'call',
      title: 'Call or text someone on the list',
      steps: [
        { say: 'Open the band called Who to call.' },
        { say: 'Tap Call under their name, or Text.', mark: 'emergency.call', stay: true },
      ],
      forYou: 'One tap reaches them, with no searching through your contacts.',
    },
    {
      key: 'checked',
      title: 'Say the card is still right',
      steps: [
        { say: 'Open the band called How old this is.' },
        { say: 'Read down the card, the medicines most of all, then tap I have checked it.', mark: 'emergency.checked' },
        { say: 'Tap Yes, it is right.' },
      ],
      forYou: 'The day you checked it goes onto the card, so whoever reads it knows how old it is.',
    },
    {
      key: 'sendCard',
      title: 'Send the card to someone',
      steps: [
        { say: 'Open the band called The card.' },
        { say: 'Tap Show it to read it first.', mark: 'emergency.showCard', stay: true },
        { say: 'Tap Send it to someone and pick how to send it.', mark: 'emergency.sendCard' },
      ],
      forYou: 'Someone you trust has a copy that does not depend on your phone.',
    },
    {
      key: 'medicalId',
      title: "Fill in your phone's Medical ID",
      steps: [
        { say: "Open the band called Your phone's Medical ID." },
        { say: "Tap Copy beside a line, then paste it into the same field on your phone's Medical ID screen.", mark: 'emergency.copy', stay: true },
        { say: "Tap Open the phone's settings to get to that screen." },
      ],
      forYou: "Anyone can open your phone's Medical ID from the lock screen, without unlocking the phone.",
    },
    {
      key: 'wallet',
      title: 'Make a card for your wallet',
      steps: [
        { say: 'Open the band called A card for your wallet.' },
        { say: 'Tap Make the wallet card.', mark: 'emergency.wallet' },
        { say: 'Print it, or save it to print later.' },
      ],
      forYou: 'Paper in a wallet can be found when the phone cannot be unlocked.',
    },
    {
      key: 'lockScreen',
      title: 'Show the card on the lock screen',
      steps: [
        { say: 'Open the band called On the lock screen.' },
        { say: 'Tap Choose what shows.', mark: 'emergency.lockScreen' },
        { say: 'Tick what to show, then tap Show these on the lock screen.' },
      ],
      forYou: 'Someone helping you can read it without unlocking the phone.',
    },
  ],
  '/life#work': [
    {
      key: 'use',
      title: 'Record some of a benefit used',
      steps: [
        { say: 'Tap What I Get.', mark: 'work.have' },
        { say: 'Open the band with the name of the benefit.' },
        { say: 'Tap Record some used.', mark: 'work.use', stay: true },
        { say: 'Type how much you just used, then tap Record it.' },
      ],
      forYou: 'What is left counts down, and the app says so when some of it is close to going unused before it resets.',
    },
    {
      key: 'reset',
      title: 'Say a benefit has reset',
      steps: [
        { say: 'Tap What I Get.', mark: 'work.have' },
        { say: 'Open the band with the name of the benefit.' },
        { say: 'Tap It reset.', mark: 'work.reset' },
        { say: 'Tap Start again.' },
      ],
      forYou: 'It counts down from the whole amount again.',
    },
    {
      key: 'edit',
      title: 'Change the details of a benefit',
      steps: [
        { say: 'Tap What I Get.', mark: 'work.have' },
        { say: 'Open the band with the name of the benefit.' },
        { say: 'Tap Edit.', mark: 'work.edit', stay: true },
        { say: 'Change what you need, then tap Save changes.' },
      ],
      forYou: 'The amounts and the reset day stay as your work set them.',
    },
    {
      key: 'remove',
      title: 'Remove a benefit',
      steps: [
        { say: 'Tap What I Get.', mark: 'work.have' },
        { say: 'Open the band with the name of the benefit.' },
        { say: 'Tap Remove.', mark: 'work.remove' },
        { say: 'Tap Remove again to say yes. Everything recorded against it goes too.' },
      ],
      forYou: 'What I Get holds only what your work gives you now.',
    },
    {
      key: 'ask',
      title: 'Find out what your work offers',
      steps: [
        { say: 'Tap Worth Asking.', mark: 'work.ask' },
        { say: 'Open any band and read the questions in it.' },
        { say: 'Put them to whoever runs your benefits, then add the answers under What I Get.' },
      ],
      forYou: 'You ask about what may exist, rather than this app guessing what you are owed.',
    },
    {
      key: 'todo',
      title: 'Keep a task for work',
      steps: [
        { say: 'Tap Tasks.', mark: 'work.todos' },
        { say: 'Type the task as you would say it, with a day if it has one, like "send the report on Friday".' },
        { say: 'Tap Add to the List.', mark: 'todo.add' },
      ],
      forYou: 'It shows here and in Life under Tasks beside everything else you mean to do, and reminds you on its day.',
    },
    {
      key: 'changeWeek',
      title: 'Change how you answered this week',
      steps: [
        { say: 'Tap How It Feels.', mark: 'work.feel' },
        { say: 'Tap Change this week.', mark: 'work.answerWeek', stay: true },
        { say: 'Tap a different number on any question.' },
        { say: 'Tap Save this week.', mark: 'work.saveWeek' },
      ],
      forYou: 'The week reads as it went, and the band called Each one over time shows how each question has gone week by week.',
    },
  ],
  '/life#upkeep': [
    {
      key: 'starter',
      title: 'Copy from a ready-made list',
      steps: [
        { say: 'Tap Or copy from a kitchen or bathroom list.', mark: 'starter.open' },
        { say: 'Tick the ones that apply to your home.' },
        { say: 'Tap Add the ticked.', mark: 'starter.addTicked' },
      ],
      forYou: 'Each one goes on your list. Say when each was last done and the app works out when it is due.',
    },
    {
      key: 'done',
      title: 'Say you did one today',
      steps: [
        { say: 'Open the band for the place it is in.' },
        { say: 'Tap Done today under it.', mark: 'upkeep.done' },
        { say: 'Tap Done today again to say yes.' },
      ],
      forYou: 'The next one comes due counted from the day you did it, not from a fixed month.',
    },
    {
      key: 'renew',
      title: 'Renew something that runs out on a date',
      steps: [
        { say: 'Open the band for the place it is in.' },
        { say: 'Tap Renewed under it.', mark: 'upkeep.renew', stay: true },
        { say: 'Type the new date it runs out, then tap Renewed.' },
      ],
      forYou: 'The reminder moves to the new date, so a licence or a warranty is not missed.',
    },
    {
      key: 'time',
      title: 'Find something that fits the time you have',
      steps: [
        { say: 'Open the band called I Have Some Time.' },
        { say: 'Tap How long do you have? and pick a length of time.' },
        { say: 'Tap Done today under the one you do.' },
      ],
      forYou: 'The things due or coming due that fit in that time are listed, soonest first.',
    },
    {
      key: 'who',
      title: 'Say who does one',
      steps: [
        { say: 'Open the band for the place it is in.' },
        { say: 'Tap Edit under it.', mark: 'upkeep.edit', stay: true },
        { say: 'Pick someone under Who does it, then tap Save changes.' },
        { say: 'To hand one back, tap Leave it for anyone under it. To take one, tap Take it.' },
      ],
      forYou: 'Each one says whose it is, and the people you share it with see the same.',
    },
    {
      key: 'edit',
      title: 'Change how often one comes round',
      steps: [
        { say: 'Open the band for the place it is in.' },
        { say: 'Tap Edit under it.', mark: 'upkeep.edit', stay: true },
        { say: 'Change How often, or anything else, then tap Save changes.' },
      ],
      forYou: 'The next due date is worked out again from the last time it was done.',
    },
    {
      key: 'schedules',
      title: 'See every date in order',
      steps: [
        { say: 'Tap See these by date on Schedules > Upkeep.', mark: 'upkeep.schedules' },
      ],
      forYou: 'Schedules lays them out by date beside your meals, doses and appointments.',
    },
    {
      key: 'remove',
      title: 'Remove one',
      steps: [
        { say: 'Open the band for the place it is in.' },
        { say: 'Tap Remove under it.', mark: 'upkeep.remove' },
        { say: 'Tap Remove again to say yes. When it was last done goes too.' },
      ],
      forYou: 'The list holds only what still needs doing.',
    },
  ],
  '/life#kitchen': [
    {
      key: 'add',
      title: 'Add something you have',
      steps: [
        { say: 'Tap Food, or Household for things that are not food.', mark: 'kitchen.food' },
        { say: 'Tap Add Something.', mark: 'kitchen.add' },
        { say: 'Type to search, or scroll, and tap the one you have.' },
        { say: 'Type how much you have. Where it is kept and a use-by date can be filled in below, or left blank.' },
        { say: 'Tap Add.', mark: 'kitchen.saveNew' },
      ],
      forYou: 'The grocery list knows you already have it, and Where did I put it on Home can find it.',
    },
    {
      key: 'use',
      title: 'Take off what you used',
      steps: [
        { say: 'Tap the name of the food in the list to open it.', mark: 'kitchen.row' },
        { say: 'Type how much you used under Used how much?, then tap Use.', mark: 'kitchen.use' },
      ],
      forYou: 'What is left stays right, so the grocery list asks for more when it runs low rather than when it is already gone.',
    },
    {
      key: 'gone',
      title: 'Say something is all gone',
      steps: [
        { say: 'Tap the name of the food in the list to open it.', mark: 'kitchen.row' },
        { say: 'Tap All Gone.', mark: 'kitchen.gone' },
        { say: 'Tap It is gone.' },
      ],
      forYou: 'It stops counting against your grocery list, and what it was stays on record.',
    },
    {
      key: 'toList',
      title: 'Put something on the grocery list',
      steps: [
        { say: 'Tap the name of the food in the list to open it.', mark: 'kitchen.row' },
        { say: 'Tap Add to List.', mark: 'kitchen.toList' },
      ],
      forYou: 'It goes on the grocery list you have open, in one tap.',
    },
    {
      key: 'place',
      title: 'Say where something is kept',
      steps: [
        { say: 'Tap the name of the food in the list to open it.', mark: 'kitchen.row' },
        { say: 'Tap Say where it is, or Change where it is.', mark: 'kitchen.place', stay: true },
        { say: 'Type the place, like pantry or chest freezer, then tap Save.' },
      ],
      forYou: 'Where did I put it on Home finds it, and says how long ago you wrote the place down.',
    },
    {
      key: 'useBy',
      title: 'Give something a use-by date',
      steps: [
        { say: 'Tap the name of the food in the list to open it.', mark: 'kitchen.row' },
        { say: 'Tap Give it a use-by date, or Change the use-by date.', mark: 'kitchen.useBy', stay: true },
        { say: 'Tap one of the choices, or type a date or a number of days, then tap Save.' },
      ],
      forYou: 'It shows in the band called Use soon as the day comes near, so less goes to waste.',
    },
    {
      key: 'giveAway',
      title: 'Record a harvest sold, traded or given away',
      steps: [
        { say: 'Tap the name of something from your garden or a ferment to open it.' },
        { say: 'Tap Sold, Traded or Gave Away.', mark: 'kitchen.giveAway', stay: true },
        { say: 'Pick which it was, fill in how much and who got it, then tap Record it.' },
      ],
      forYou: 'It is recorded with the harvest or batch it came from, and anything you got back in trade is added to your kitchen.',
    },
    {
      key: 'scan',
      title: 'Scan a household item onto the grocery list',
      steps: [
        { say: 'Tap Household.', mark: 'kitchen.non_food' },
        { say: 'Tap Scan One onto the Grocery List.', mark: 'kitchen.scan' },
        { say: 'Point the camera at its barcode.' },
      ],
      forYou: 'Running low on soap or paper goes on the list without typing.',
    },
  ],
  '/life#routines': [
    {
      key: 'starter',
      title: 'Start from a ready-made routine',
      steps: [
        { say: 'Tap Or start from a ready-made routine.', mark: 'starter.open' },
        { say: 'Tap one to see its steps. Tap any step you do not want, and change the name if you like.' },
        { say: 'Tap Make this routine.', mark: 'starter.makeRoutine' },
      ],
      forYou: 'It is in your routines straight away, and you can change any of it the usual way.',
    },
    {
      key: 'nudge',
      title: 'Have the phone remind you to start it',
      steps: [
        { say: 'Open the band with the name of the routine.' },
        { say: 'Tap Change.', mark: 'routines.change', stay: true },
        { say: 'Under A nudge to start it, pick an hour and minutes, then tap the days you want it.' },
        { say: 'Tap Save.' },
      ],
      forYou: 'On those days the phone says its name at that time, and tapping the reminder opens the walk at the first step.',
    },
    {
      key: 'speak',
      title: 'Have each step read aloud',
      steps: [
        { say: 'Open the band with the name of the routine.' },
        { say: 'Tap Change.', mark: 'routines.change' },
        { say: 'Tap Read each step aloud so it says on.', mark: 'routines.speak' },
        { say: 'Tap Save.' },
      ],
      forYou: 'The phone says each step as it comes up, so your eyes can stay on what your hands are doing.',
    },
    {
      key: 'editStep',
      title: 'Change a step',
      steps: [
        { say: 'Open the band with the name of the routine.' },
        { say: 'Tap Steps.', mark: 'routines.steps' },
        { say: 'Tap Edit under the step.', mark: 'routines.stepEdit', stay: true },
        { say: 'Change the words, the minutes it takes, or the check it carries, then tap Save.' },
      ],
      forYou: 'Give the steps minutes and the routine shows about how long it takes. Attach a check and the step carries a box to tap as you do it.',
    },
    {
      key: 'orderSteps',
      title: 'Put the steps in a different order',
      steps: [
        { say: 'Open the band with the name of the routine.' },
        { say: 'Tap Steps.', mark: 'routines.steps' },
        { say: 'Tap Down under a step to move it later, or Up to move it sooner.', mark: 'routines.stepDown', stay: true },
      ],
      forYou: 'The walk goes through them in the order you set.',
    },
    {
      key: 'order',
      title: 'Put your routines in a different order',
      steps: [
        { say: 'Open the band with the name of the routine.' },
        { say: 'Tap Move down to put it later in the list, or Move up to put it sooner.', mark: 'routines.moveDown', stay: true },
      ],
      forYou: 'The ones you reach for most can sit at the top.',
    },
    {
      key: 'remove',
      title: 'Remove a routine',
      steps: [
        { say: 'Open the band with the name of the routine.' },
        { say: 'Tap Remove.', mark: 'routines.remove' },
        { say: 'Tap Remove it to say yes. The steps go with it, and anything already checked off stays recorded.' },
      ],
      forYou: 'Your routines hold only the ones you still use.',
    },
  ],
  '/life#didIDoIt': [
    {
      key: 'add',
      title: 'Put something on your To Do List',
      steps: [
        { say: 'Tap + Add something to do.', mark: 'didIDoIt.add', stay: true },
        { say: 'Under What you need to do, type its name the way you would say it, like Morning pill.' },
        { say: 'Under At these times, pick the hour and minutes. Tap + Another time in the day for each time it needs doing.' },
        { say: 'Under Which days, leave every day lit or tap the days to leave out, or pick Every few days, weeks or months and say how often and from which day.' },
        { say: 'Under A reminder in the notification area, pick Remind me or No reminder.' },
        { say: 'Tap Save.', mark: 'didIDoIt.save' },
      ],
      forYou: 'It shows on your list at each of its times, and once a time is checked off it comes back at the next one.',
    },
    {
      key: 'yes',
      title: 'Mark that you just did it',
      steps: [
        { say: 'If your list sits in bands, open the band it is listed under.' },
        { say: 'Tap Yes, just did it.', mark: 'didIDoIt.yes' },
      ],
      forYou: 'That time is checked off and the line under its name says when, so the next time you wonder, the answer is there. It comes back at its next time.',
    },
    {
      key: 'mistake',
      title: 'Take back a mark made by mistake',
      steps: [
        { say: 'If your list sits in bands, open the band it is listed under.' },
        { say: 'Tap That was a mistake.', mark: 'didIDoIt.mistake' },
      ],
      forYou: 'Only the last mark goes. Everything before it stays as it was.',
    },
    {
      key: 'remind',
      title: 'Change its times or have the phone remind you',
      steps: [
        { say: 'If your list sits in bands, open the band it is listed under.' },
        { say: 'Tap Change.', mark: 'didIDoIt.change', stay: true },
        { say: 'Change the times under At these times and the days under Which days.' },
        { say: 'Under A reminder in the notification area, pick Remind me.' },
        { say: 'Tap Save.', mark: 'didIDoIt.save' },
      ],
      forYou: 'One reminder comes at each time, kept together under To Do List in the notification area. Done on it checks that time off, even with the phone locked.',
    },
    {
      key: 'order',
      title: 'Put your list in a different order',
      steps: [
        { say: 'If your list sits in bands, open the band it is listed under.' },
        { say: 'Tap Move down to put it later in the list, or Move up to put it sooner.', mark: 'didIDoIt.moveDown', stay: true },
      ],
      forYou: 'The ones you wonder about most can sit at the top.',
    },
    {
      key: 'remove',
      title: 'Remove something from your To Do List',
      steps: [
        { say: 'If your list sits in bands, open the band it is listed under.' },
        { say: 'Tap Remove.', mark: 'didIDoIt.remove' },
        { say: 'Tap Remove it to say yes. Everything recorded against it goes too.' },
      ],
      forYou: 'Your list holds only what you still need to do.',
    },
  ],
  '/life#daysUntil': [
    {
      key: 'timed',
      title: 'Count down hours and minutes',
      steps: [
        { say: 'Tap Add a Days Until Counter.', mark: 'daysUntil.add', stay: true },
        { say: 'Under Days until what?, write what it is counting to.' },
        { say: 'Under Count in, pick Hours and minutes, then write how many of each.' },
        { say: 'Tap Start Counting.', mark: 'daysUntil.save' },
      ],
      forYou: 'It counts from the moment you start it, for things like a roast in the oven or a parking meter.',
    },
    {
      key: 'started',
      title: 'Count from a day that has already gone',
      steps: [
        { say: 'Tap Add a Days Until Counter.', mark: 'daysUntil.add', stay: true },
        { say: 'Write what it is counting to and how many days it takes.' },
        { say: 'Under Started on, change the date to the day it began.' },
        { say: 'Tap Start Counting.', mark: 'daysUntil.save' },
      ],
      forYou: 'The counter starts part way through, so it shows the days left from where you really are.',
    },
    {
      key: 'garden',
      title: 'Count down for something in the garden',
      steps: [
        { say: 'Tap Add a Days Until Counter.', mark: 'daysUntil.add', stay: true },
        { say: 'Under What it is for, pick the garden area. Under For, pick one planting or leave it at the whole area.' },
        { say: 'Write what it is counting to, such as first harvest, and how many days it takes.' },
        { say: 'Tap Start Counting.', mark: 'daysUntil.save' },
      ],
      forYou: 'It shows here and in the garden under that area, and it goes with the area if the area moves to Past Areas.',
    },
    {
      key: 'done',
      title: 'Mark a counter done',
      steps: [
        { say: 'Tap Done beside it.', mark: 'daysUntil.done' },
      ],
      forYou: 'It stays in the list as the record of how long the thing took. Tap Start again to count it once more.',
    },
    {
      key: 'remove',
      title: 'Remove a counter',
      steps: [
        { say: 'Tap Remove beside it. It goes straight away, with no question first.', mark: 'daysUntil.remove' },
      ],
      forYou: 'The reminder for its day goes with it.',
    },
  ],
  '/life#finances': [
    {
      key: 'income',
      title: 'Add money that comes in',
      steps: [
        { say: 'Tap Bills & Income.', mark: 'finance.recurring' },
        { say: 'Tap Add income.', mark: 'finance.addIncome', stay: true },
        { say: 'Give it a name and an amount. If it is never the same twice, tick This amount varies month to month.' },
        { say: 'Under How often, pick how it comes round, then say which day.' },
        { say: 'Tap Add it.', mark: 'finance.billSave' },
      ],
      forYou: 'The Overview counts it in what comes in each month. For an amount that varies, record what arrives under Spending and the app works out the figure from that.',
    },
    {
      key: 'editBill',
      title: 'Change a bill',
      steps: [
        { say: 'Tap Bills & Income.', mark: 'finance.recurring' },
        { say: 'Open the band called Going out.' },
        { say: 'Tap Edit beside the bill.', mark: 'finance.billEdit', stay: true },
        { say: 'Change the amount, how often it comes, or the day it lands.' },
        { say: 'Tap Save changes.', mark: 'finance.billSave' },
      ],
      forYou: 'Every total that reads this bill uses the new figure from now on.',
    },
    {
      key: 'pauseBill',
      title: 'Pause a bill for a while',
      steps: [
        { say: 'Tap Bills & Income.', mark: 'finance.recurring' },
        { say: 'Open the band called Going out.' },
        { say: 'Tap Pause beside the bill.', mark: 'finance.billPause' },
      ],
      forYou: 'It stays in the list but stops counting in the monthly totals and under Coming Up. Tap Resume to count it again.',
    },
    {
      key: 'removeBill',
      title: 'Remove a bill',
      steps: [
        { say: 'Tap Bills & Income.', mark: 'finance.recurring' },
        { say: 'Open the band called Going out.' },
        { say: 'Tap Remove beside the bill.', mark: 'finance.billRemove' },
        { say: 'Tap Remove to say yes.' },
      ],
      forYou: 'If it has only stopped for now, Pause keeps it for later instead.',
    },
    {
      key: 'upcoming',
      title: 'See what is due in the next month',
      steps: [
        { say: 'Tap Coming Up.', mark: 'finance.upcoming' },
      ],
      forYou: 'Every bill with a set day that falls in the next 30 days, in date order. A bill with no day set does not show here until it has one.',
    },
    {
      key: 'limit',
      title: 'Set a monthly limit on a kind of spending',
      steps: [
        { say: 'Tap Spending.', mark: 'finance.spending' },
        { say: 'Open the band called Monthly limits.' },
        { say: 'Tap Set a limit.', mark: 'finance.setLimit', stay: true },
        { say: 'Pick the category and write the most you want it to come to in a month.' },
        { say: 'Tap Set it.', mark: 'finance.limitSave' },
      ],
      forYou: 'A bar shows how much of it is used so far this month and how much is left, counting bills that already fall in that category.',
    },
    {
      key: 'removeLimit',
      title: 'Remove a limit',
      steps: [
        { say: 'Tap Spending.', mark: 'finance.spending' },
        { say: 'Open the band called Monthly limits.' },
        { say: 'Tap Remove under the limit.', mark: 'finance.limitRemove' },
      ],
      forYou: 'The spending itself stays recorded. Only the limit goes.',
    },
    {
      key: 'removeEntry',
      title: 'Remove something you recorded',
      steps: [
        { say: 'Tap Spending.', mark: 'finance.spending' },
        { say: 'Open the band called Recorded in, with this month in its name.' },
        { say: 'Tap Remove beside it.', mark: 'finance.entryRemove' },
        { say: 'If it has photos, tap Remove to say yes.' },
      ],
      forYou: 'The month adds up without it straight away.',
    },
    {
      key: 'editPlan',
      title: 'Change your health plan figures',
      steps: [
        { say: 'Tap Health.', mark: 'finance.health' },
        { say: 'Open the band called Your plan this year.' },
        { say: 'Tap Edit plan.', mark: 'finance.planEdit', stay: true },
        { say: 'Change the deductible, the out-of-pocket maximum, or what was already met, then tap Save plan.' },
      ],
      forYou: 'The bars showing how much of each is met redraw with the new figures.',
    },
    {
      key: 'fsa',
      title: 'Add an HSA or FSA',
      steps: [
        { say: 'Tap Health.', mark: 'finance.health' },
        { say: 'Open the band called HSA & FSA.' },
        { say: 'Tap Add an account.', mark: 'finance.fsaAdd', stay: true },
        { say: 'Pick which kind, the plan year, what has been put in and spent so far, and for an FSA the date it has to be spent by.' },
        { say: 'Tap Save.' },
      ],
      forYou: 'It shows what is still there to spend, and an FSA warns you when money is close to being lost at the deadline.',
    },
    {
      key: 'medPaid',
      title: 'Mark a medical bill paid',
      steps: [
        { say: 'Tap Health.', mark: 'finance.health' },
        { say: 'Open the band called Medical bills.' },
        { say: 'Tap Mark paid under the bill.', mark: 'finance.medPaid' },
      ],
      forYou: 'It is recorded as paid for the amount you owed, and it still counts toward what that condition costs.',
    },
    {
      key: 'medDispute',
      title: 'Mark a medical bill as disputed',
      steps: [
        { say: 'Tap Health.', mark: 'finance.health' },
        { say: 'Open the band called Medical bills.' },
        { say: 'Tap Dispute under the bill.', mark: 'finance.medDispute' },
      ],
      forYou: 'The bill reads disputed, so you can see at a glance which ones you are still sorting out. Tap Mark paid once it is settled.',
    },
    {
      key: 'medRemove',
      title: 'Remove a medical bill',
      steps: [
        { say: 'Tap Health.', mark: 'finance.health' },
        { say: 'Open the band called Medical bills.' },
        { say: 'Tap Remove under the bill. It goes straight away.', mark: 'finance.medRemove' },
      ],
      forYou: 'It stops counting toward your deductible and toward what each condition costs.',
    },
    {
      key: 'updateBalance',
      title: 'Update an account balance',
      steps: [
        { say: 'Tap Accounts.', mark: 'finance.money' },
        { say: 'Open the band called Accounts.' },
        { say: 'Tap Update balance under the account.', mark: 'finance.accountUpdate', stay: true },
        { say: 'Write the balance as it stands today. Under Paid in or taken out since last time, write what you added, or a minus in front for what you took out.' },
        { say: 'Tap Save changes.' },
      ],
      forYou: 'Net worth moves with it, and after a second update the app can say what the account did apart from what you put in.',
    },
    {
      key: 'removeAccount',
      title: 'Remove an account',
      steps: [
        { say: 'Tap Accounts.', mark: 'finance.money' },
        { say: 'Open the band called Accounts.' },
        { say: 'Tap Remove under the account. It goes straight away.', mark: 'finance.accountRemove' },
      ],
      forYou: 'It leaves your net worth, and bills that named it no longer warn about it running short.',
    },
    {
      key: 'cost',
      title: 'Add what a goal will take',
      steps: [
        { say: 'Tap Goals.', mark: 'finance.goals' },
        { say: 'Open the band with the name of the goal.' },
        { say: 'Tap Add a cost.', mark: 'finance.costAdd', stay: true },
        { say: 'Pick what kind of cost it is, such as money or hours, say what it is and how much it takes, then tap Add this cost.' },
      ],
      forYou: 'Each cost gets a bar of its own, and with a date set on the goal it says how much a month it needs.',
    },
    {
      key: 'contribute',
      title: 'Record what went into a goal',
      steps: [
        { say: 'Tap Goals.', mark: 'finance.goals' },
        { say: 'Open the band with the name of the goal.' },
        { say: 'Tap Record what went in under the cost.', mark: 'finance.contribute', stay: true },
        { say: 'Write how much and when, then tap Record it.' },
      ],
      forYou: 'The bar for that cost moves on. Spending you tag to a goal under Spending counts too, without entering it twice.',
    },
    {
      key: 'reached',
      title: 'Mark a goal reached',
      steps: [
        { say: 'Tap Goals.', mark: 'finance.goals' },
        { say: 'Open the band with the name of the goal.' },
        { say: 'Tap Mark reached.', mark: 'finance.goalReached' },
      ],
      forYou: 'It stays in the list as a record of what you reached and what it took.',
    },
    {
      key: 'setAside',
      title: 'Set a goal aside for now',
      steps: [
        { say: 'Tap Goals.', mark: 'finance.goals' },
        { say: 'Open the band with the name of the goal.' },
        { say: 'Tap Set aside.', mark: 'finance.goalSetAside' },
      ],
      forYou: 'Everything recorded on it is kept. Tap Pick it back up whenever you want to carry on.',
    },
    {
      key: 'deleteGoal',
      title: 'Delete a goal',
      steps: [
        { say: 'Tap Goals.', mark: 'finance.goals' },
        { say: 'Open the band with the name of the goal.' },
        { say: 'Tap Delete.', mark: 'finance.goalDelete' },
        { say: 'Tap Delete to say yes. The goal, its costs and what was recorded against them all go.' },
      ],
      forYou: 'If you have only stopped for now, Set aside keeps all of it instead.',
    },
  ],
  '/life#groceryList': [
    {
      key: 'check',
      title: 'Tick things off as they go in the cart',
      steps: [
        { say: 'Tap the box beside a line as it goes in the cart.', mark: 'grocery.check', stay: true },
        { say: 'What did it cost? opens under the line. Fill it in now, or carry on and come back to it later.' },
      ],
      forYou: 'What you tick goes into your kitchen as bought, and the line at the top says how much of the list is in the cart.',
    },
    {
      key: 'price',
      title: 'Record what something cost',
      steps: [
        { say: 'Tap the arrow at the end of the line.', mark: 'grocery.open', stay: true },
        { say: 'Say the price, type it, or tap the camera to read it from the shelf label.', mark: 'grocery.priceCamera', stay: true },
        { say: 'Pick what that price covers, and say how much you bought if it asks.' },
        { say: 'If it was on offer, tap Was this a sale price?', mark: 'grocery.sale', stay: true },
        { say: 'Tap Save.', mark: 'grocery.priceSave' },
      ],
      forYou: 'The list keeps a running total, and the price is kept for that food, so later lists can compare it. A sale price is kept apart, so one cheap week does not read as the food getting cheaper.',
    },
    {
      key: 'compare',
      title: 'Work out which brand or size is cheaper',
      steps: [
        { say: 'Tap the arrow at the end of the line.', mark: 'grocery.open', stay: true },
        { say: 'Tap Compare Brands.', mark: 'grocery.compare', stay: true },
        { say: 'Write the price and size of each one you are choosing between.' },
      ],
      forYou: 'Each option is worked out per amount, so a big bottle and a small one compare fairly, and the best value is marked.',
    },
    {
      key: 'scanItem',
      title: 'Scan the product you picked for a line',
      steps: [
        { say: 'Tap the arrow at the end of the line.', mark: 'grocery.open', stay: true },
        { say: 'Tap Scan This Product.', mark: 'grocery.scanItem', stay: true },
        { say: 'Point the camera at the barcode.' },
      ],
      forYou: 'The product is tied to that line, with its price if you give one, and the app takes you back to the list.',
    },
    {
      key: 'removeItem',
      title: 'Take a line off the list',
      steps: [
        { say: 'Tap the arrow at the end of the line.', mark: 'grocery.open', stay: true },
        { say: 'Tap Remove From List. It goes straight away.', mark: 'grocery.removeItem' },
      ],
      forYou: 'Only that line goes. The meal it was for stays on your schedule.',
    },
    {
      key: 'add',
      title: 'Add something that is not for a meal',
      steps: [
        { say: 'Under Add something else, write what you need, and an amount and unit if you like.' },
        { say: 'Tap Add to List.', mark: 'grocery.addItem' },
      ],
      forYou: 'A line you add by hand stays put when the list is refreshed from your schedule.',
    },
    {
      key: 'refresh',
      title: 'Bring the list up to date with your meals',
      steps: [
        { say: 'Tap Refresh.', mark: 'grocery.refresh' },
      ],
      forYou: 'The list is worked out again from what is scheduled now. Lines you added by hand are left alone, and a message says what was kept, rewritten or dropped.',
    },
    {
      key: 'scan',
      title: 'Scan a food product onto the list',
      steps: [
        { say: 'Tap Scan a Product.', mark: 'grocery.scan', stay: true },
        { say: 'Point the camera at the barcode.' },
      ],
      forYou: 'The product becomes a line of its own, and the app brings you back to the list.',
    },
    {
      key: 'scanHousehold',
      title: 'Scan a household thing onto the list',
      steps: [
        { say: 'Tap Scan a Household Thing.', mark: 'grocery.scanHousehold', stay: true },
        { say: 'Point the camera at the barcode.' },
      ],
      forYou: 'It goes on the same list marked Non-food item, so one trip covers both.',
    },
    {
      key: 'send',
      title: 'Send the list to someone as text',
      steps: [
        { say: 'Tap Send as Text.', mark: 'grocery.send', stay: true },
        { say: 'Pick where to send it, such as a message or an email.' },
      ],
      forYou: 'Only what is still to pick up is sent, grouped the way the list is.',
    },
    {
      key: 'store',
      title: 'Say which store you are shopping at',
      steps: [
        { say: 'Tap the box under Which store? and pick the store, or add a new one.', mark: 'grocery.store' },
      ],
      forYou: 'The store is saved with the list, so prices can later be compared between stores.',
    },
    {
      key: 'aisles',
      title: 'Put the list in the order of the store aisles',
      steps: [
        { say: 'Pick the store first, under Which store?', mark: 'grocery.store' },
        { say: 'Tap Lay out a store by its aisles.', mark: 'grocery.aisles', stay: true },
        { say: 'Put the aisles in the order you walk them, then come back to the list.' },
      ],
      forYou: 'The lines read in that order whenever you shop at that store.',
    },
    {
      key: 'takeKitchen',
      title: 'Use what your kitchen already has',
      steps: [
        { say: 'Tap Take what the kitchen covers. It shows when your kitchen holds something on the list.', mark: 'grocery.takeKitchen' },
      ],
      forYou: 'Lines the kitchen covers read as taken from your kitchen, and a line it covers in part is cut to what is still to buy.',
    },
    {
      key: 'finish',
      title: 'Finish a shop',
      steps: [
        { say: 'Tap Finish Shopping.', mark: 'grocery.finish' },
      ],
      forYou: 'The list reads as finished and is kept under Earlier lists. Tap Reopen List to carry on with it.',
    },
    {
      key: 'delete',
      title: 'Delete a list',
      steps: [
        { say: 'Tap Delete List.', mark: 'grocery.delete' },
        { say: 'Tap Delete It to say yes. The list, its lines and their prices all go.' },
      ],
      forYou: 'If you only want it out of the way, Finish Shopping keeps it.',
    },
    {
      key: 'newList',
      title: 'Start a new list',
      steps: [
        { say: 'Tap Start a New List at the bottom of the list.', mark: 'grocery.newList', stay: true },
        { say: 'Pick how many days you are shopping for.', mark: 'grocery.days', stay: true },
        { say: 'Tap the plus or minus for how many people are eating.', mark: 'grocery.people', stay: true },
        { say: 'Tap Build My Grocery List.', mark: 'grocery.build' },
      ],
      forYou: 'The list is made from the meals scheduled in those days, with each amount scaled to the people eating.',
    },
    {
      key: 'earlier',
      title: 'Open an earlier list',
      steps: [
        { say: 'Tap Start a New List at the bottom of the list.', mark: 'grocery.newList', stay: true },
        { say: 'Under Earlier lists, tap the one you want.', mark: 'grocery.earlier' },
      ],
      forYou: 'It opens as it was left, with its ticks and prices.',
    },
  ],
  '/life#conditions': [
    {
      key: 'read',
      title: 'Read one topic of a condition',
      steps: [
        { say: 'Open the band with the name of the condition.' },
        { say: 'Tap a topic to open it.', mark: 'conditions.topic', stay: true },
        { say: 'Swipe along a row of cards, then tap Read on one. It opens under the row, and Close puts it away.', mark: 'reading.entry' },
        { say: 'A link at the end of an entry takes you to the entry it names.' },
      ],
      forYou: 'Each entry carries its evidence and its sources, so you can see how much weight it holds.',
    },
    {
      key: 'search',
      title: 'Search every condition on the page',
      steps: [
        { say: 'Type a word or two in the search box at the top.', mark: 'conditions.search', stay: true },
        { say: 'Tap an entry in the results to read it. Clear the box to go back to the bands.' },
      ],
      forYou: 'One search covers your conditions, your family\'s and the ones you read about.',
    },
    {
      key: 'curious',
      title: 'Read about a condition you do not track',
      steps: [
        { say: 'Under Other Conditions, tap Choose a condition and pick one.', mark: 'conditions.curious' },
      ],
      forYou: 'Its band joins the page for reading. It changes nothing about your food scores, meal plans or advice.',
    },
    {
      key: 'notInterested',
      title: 'Take a condition off Other Conditions',
      steps: [
        { say: 'Open the band with the name of the condition.' },
        { say: 'Tap No longer interested.', mark: 'conditions.extra' },
      ],
      forYou: 'Its band leaves the page. You can add it back from Choose a condition at any time.',
    },
    {
      key: 'keep',
      title: 'Keep a condition you reached from a link',
      steps: [
        { say: 'Open the band of the condition the link took you to.' },
        { say: 'Tap Keep it on this list.', mark: 'conditions.extra' },
      ],
      forYou: 'It stays under Other Conditions rather than leaving when you do.',
    },
    {
      key: 'changeMember',
      title: 'Change what a family member tracks or eats',
      steps: [
        { say: 'Under Family, tap Change beside their name.', mark: 'family.change', stay: true },
        { say: 'Change their conditions, allergies, eating style or anything else.' },
        { say: 'Tap Save.', mark: 'family.save' },
      ],
      forYou: 'If they are planned around, the next meal plan checks what you changed.',
    },
    {
      key: 'notPlanned',
      title: 'Stop planning meals around someone',
      steps: [
        { say: 'Under Family, tap Change beside their name.', mark: 'family.change', stay: true },
        { say: 'Tap Plan meals around their conditions so it is no longer ticked.', mark: 'family.planMeals', stay: true },
        { say: 'Tap Save.', mark: 'family.save' },
      ],
      forYou: 'They stay on the page with their conditions. The meal plan simply stops checking them.',
    },
    {
      key: 'removeMember',
      title: 'Remove a family member',
      steps: [
        { say: 'Under Family, tap Remove beside their name.', mark: 'family.remove' },
        { say: 'Tap Remove to say yes.' },
      ],
      forYou: 'Their conditions stop being planned around and their bands leave this page. Nothing else changes.',
    },
  ],
  '/life#movement': [
    {
      key: 'connect',
      title: 'Connect the phone\'s health data',
      steps: [
        { say: 'Tap Connect.', mark: 'movement.connect', stay: true },
        { say: 'Health Connect opens. Turn on each signal you want the app to read, then tap Allow.' },
      ],
      forYou: 'Steps, sleep, heart rate and the rest arrive here and on Trends. Nothing is read until you connect, and nothing is read in the background.',
    },
    {
      key: 'sync',
      title: 'Bring in the latest readings',
      steps: [
        { say: 'Tap Sync now.', mark: 'movement.sync' },
      ],
      forYou: 'The app also syncs each time this area opens, so this is only for when you want it straight away.',
    },
    {
      key: 'signal',
      title: 'See what one signal holds',
      steps: [
        { say: 'Open the band with the name of What the phone has.' },
        { say: 'Tap a signal to read what it holds and where it comes from.', mark: 'movement.signal' },
      ],
      forYou: 'Each signal says what in the app it feeds and which kind of device usually records it.',
    },
    {
      key: 'settings',
      title: 'Change which signals the app may read',
      steps: [
        { say: 'Tap Health Connect settings.', mark: 'movement.settings', stay: true },
        { say: 'Turn signals on or off there, then come back to the app.' },
      ],
      forYou: 'The choice is made in Health Connect itself, one signal at a time.',
    },
    {
      key: 'stop',
      title: 'Stop syncing',
      steps: [
        { say: 'Tap Stop syncing.', mark: 'movement.stop' },
      ],
      forYou: 'Nothing more is read until you connect again, and what was already synced stays. To take the permissions away as well, use Health Connect settings.',
    },
    {
      key: 'sendWater',
      title: 'Send today\'s water to the phone',
      steps: [
        { say: 'Open the band with the name of Send to the phone.' },
        { say: 'Tap Send today\'s water.', mark: 'movement.sendWater' },
      ],
      forYou: 'Other health apps on the phone can then see it. Sending again replaces what was sent earlier that day.',
    },
    {
      key: 'sendNutrition',
      title: 'Send today\'s nutrition to the phone',
      steps: [
        { say: 'Open the band with the name of Send to the phone.' },
        { say: 'Tap Send today\'s nutrition.', mark: 'movement.sendNutrition' },
      ],
      forYou: 'The day\'s totals from your meals and supplements go to Health Connect as one record. Sending again replaces what was sent earlier that day.',
    },
  ],
  '/life#workouts': [
    {
      key: 'build',
      title: 'Build a workout',
      steps: [
        { say: 'Tap + Build a workout.', mark: 'workouts.build', stay: true },
        { say: 'Give it a name, and a note if you like.' },
        { say: 'Tap Save.', mark: 'workouts.save' },
      ],
      forYou: 'A band with its name appears on this page, ready for exercises.',
    },
    {
      key: 'add',
      title: 'Add an exercise to a workout',
      steps: [
        { say: 'Open the band with the name of the workout.' },
        { say: 'Tap Pick one to add at the end, and choose an exercise. Type a word to find one fast.', mark: 'workouts.add' },
      ],
      forYou: 'It goes at the end of the workout with a starting number of sets. Drag an exercise by its grip to change the order.',
    },
    {
      key: 'addFromList',
      title: 'Add an exercise from the list of exercises',
      steps: [
        { say: 'Open the band with the name of Exercises.' },
        { say: 'Tap an exercise to open it.', mark: 'workouts.openExercise', stay: true },
        { say: 'Tap Add to a workout.', mark: 'workouts.addTo', stay: true },
        { say: 'Tap the workout it goes in.' },
      ],
      forYou: 'You can read how it is done before choosing it, and it becomes the last exercise in that workout.',
    },
    {
      key: 'sets',
      title: 'Set the sets, reps, weight and rest',
      steps: [
        { say: 'Open the band with the name of the workout.' },
        { say: 'Tap Sets and reps under an exercise.', mark: 'workouts.sets', stay: true },
        { say: 'Change the sets, the reps or the time, the weight and the rest between sets.' },
        { say: 'Tap Save.', mark: 'workouts.stepSave' },
      ],
      forYou: 'The workout follows these numbers when you do it, and the rest timer uses the rest you set.',
    },
    {
      key: 'howTo',
      title: 'See how an exercise in a workout is done',
      steps: [
        { say: 'Open the band with the name of the workout.' },
        { say: 'Tap How to do it under the exercise.', mark: 'workouts.howTo' },
      ],
      forYou: 'The steps and how to do it safely open over the page, without leaving the workout.',
    },
    {
      key: 'takeOut',
      title: 'Take an exercise out of a workout',
      steps: [
        { say: 'Open the band with the name of the workout.' },
        { say: 'Tap Take out under the exercise. It goes straight away.', mark: 'workouts.takeOut' },
      ],
      forYou: 'Only that workout changes. The exercise stays in the list for any other workout.',
    },
    {
      key: 'do',
      title: 'Do a workout',
      steps: [
        { say: 'Open the band with the name of the workout.' },
        { say: 'Tap Start this workout.', mark: 'workouts.start', stay: true },
        { say: 'Look over the plan, then tap Start.', mark: 'workout.begin', stay: true },
        { say: 'Change the reps or weight if what you did was different, then tap Done after each set.', mark: 'workout.done', stay: true },
        { say: 'During a rest, tap Ready now to go on before the timer ends.', mark: 'workout.ready', stay: true },
        { say: 'At the end, add a note if you like and tap Save.', mark: 'workout.save' },
      ],
      forYou: 'You see what was planned beside what you did, and the session goes into your exercise log, which Movement and Trends read.',
    },
    {
      key: 'rename',
      title: 'Rename a workout or change its note',
      steps: [
        { say: 'Open the band with the name of the workout.' },
        { say: 'Tap Rename.', mark: 'workouts.rename', stay: true },
        { say: 'Change the name or the note.' },
        { say: 'Tap Save.', mark: 'workouts.save' },
      ],
      forYou: 'Sessions you log from it after this carry the new name.',
    },
    {
      key: 'remove',
      title: 'Remove a workout',
      steps: [
        { say: 'Open the band with the name of the workout.' },
        { say: 'Tap Remove.', mark: 'workouts.remove' },
        { say: 'Tap Remove it to say yes.' },
      ],
      forYou: 'Sessions already logged from it stay in your exercise log, and none of the exercises are removed.',
    },
    {
      key: 'ownExercise',
      title: 'Write an exercise of your own',
      steps: [
        { say: 'Tap + An exercise of your own.', mark: 'workouts.exercise', stay: true },
        { say: 'Give it a name and a kind, and write how it is done, one step a line. The rest is optional.' },
        { say: 'Tap Save.', mark: 'workouts.exerciseSave' },
      ],
      forYou: 'It joins the list of exercises, ready to add to any workout, and photos can be added once it is saved.',
    },
    {
      key: 'myVersion',
      title: 'Make your own version of an exercise',
      steps: [
        { say: 'Open the band with the name of Exercises.' },
        { say: 'Tap an exercise to open it.', mark: 'workouts.openExercise', stay: true },
        { say: 'Tap Make my own version.', mark: 'workouts.myVersion', stay: true },
        { say: 'Change what you like, such as the steps, the numbers or a note from your physio.' },
        { say: 'Tap Save.', mark: 'workouts.exerciseSave' },
      ],
      forYou: 'Your version sits beside the one from the list, so the original is still there.',
    },
    {
      key: 'changeExercise',
      title: 'Change an exercise you wrote',
      steps: [
        { say: 'Open the band with the name of Exercises.' },
        { say: 'Tap your exercise to open it.', mark: 'workouts.openExercise', stay: true },
        { say: 'Tap Change.', mark: 'workouts.changeExercise', stay: true },
        { say: 'Change what you like, then tap Save.', mark: 'workouts.exerciseSave' },
      ],
      forYou: 'Every workout it is in shows the change.',
    },
    {
      key: 'removeExercise',
      title: 'Remove an exercise you wrote',
      steps: [
        { say: 'Open the band with the name of Exercises.' },
        { say: 'Tap your exercise to open it.', mark: 'workouts.openExercise', stay: true },
        { say: 'Tap Remove.', mark: 'workouts.removeExercise' },
        { say: 'Tap Remove it to say yes.' },
      ],
      forYou: 'If a workout still uses it, it stays there and only leaves the list of exercises to add. If none does, it is deleted with its photos.',
    },
    {
      key: 'search',
      title: 'Find an exercise',
      steps: [
        { say: 'Open the band with the name of Exercises.' },
        { say: 'Type a word in Search, such as a body part or a piece of equipment.', mark: 'workouts.search', stay: true },
        { say: 'Pick a Kind or Equipment as well to narrow it further.' },
      ],
      forYou: 'The list shows only the exercises that match, and says how many of the whole list those are.',
    },
    {
      key: 'gentle',
      title: 'Show only exercises gentle on a flare day',
      steps: [
        { say: 'Open the band with the name of Exercises.' },
        { say: 'Tap Gentle on a flare day.', mark: 'workouts.gentle' },
      ],
      forYou: 'The list keeps only the gentler exercises. Tap What this means to read how they were chosen, and tap the pill again to show them all.',
    },
  ],
  '/life#healthLiteracy': readingHowTos('Health Literacy', 'A word you met in an entry is often in the Glossary band, which the search covers as well.'),
  '/life#earthMatters': readingHowTos('Earth Matters', 'Each entry says how strong the evidence behind it is, and lists its sources.'),
  '/life#searchReading': [
    {
      key: 'search',
      title: 'Search everything there is to read',
      steps: [
        { say: 'Type a word or two in the search box: a food, a body process, an author.', mark: 'reading.search', stay: true },
        { say: 'Tap a result to read it where you are.', mark: 'reading.entry' },
      ],
      forYou: 'One search covers every condition, Health Literacy, Earth Matters, Horticulture and the recipes, and each result says where it lives.',
    },
    {
      key: 'dots',
      title: 'Read what the dots under a result mean',
      steps: [
        { say: 'Tap the small i at the end of the search box.', mark: 'reading.searchHelp' },
      ],
      forYou: 'Each word you searched gets a pill: filled when it is in the title, outlined when it is in the text, grey when that entry does not have it.',
    },
    {
      key: 'related',
      title: 'Follow a link to a related entry',
      steps: [
        { say: 'Open an entry from the results.', mark: 'reading.entry', stay: true },
        { say: 'Under Related at the end of it, tap a name.' },
      ],
      forYou: 'The app takes you to the tab and lens where that entry lives and opens it there.',
    },
  ],
  '/#home': [
    {
      key: 'openBand',
      title: 'Open and close the bands on Home',
      steps: [
        { say: 'Tap the name of a band to open it. A band named for a tab, like Signals or Food, holds that tab\'s cards inside it.', mark: 'homeGroup.log', stay: true },
        { say: 'Tap the name again to fold it shut.' },
      ],
      forYou: 'Home remembers which bands you left open, so it looks the same the next time you come back.',
    },
    {
      key: 'arrange',
      title: 'Put the bands on Home in the order you want',
      steps: [
        { say: 'Hold your finger on the name of any band, like Your Guide, until the list for arranging opens.', mark: 'homeBand.yourStory', stay: true },
        { say: 'Hold the three lines at the right end of a name and drag it up or down.', mark: 'home.arrangeGrip', stay: true },
        { say: 'To move the cards inside a group, tap the group\'s name in the list first, then drag them the same way.' },
        { say: 'Tap Done at the top when it reads the way you want.', mark: 'home.arrangeDone' },
      ],
      forYou: 'Home shows its bands in that order every time, so what you reach for most can sit at the top.',
    },
    {
      key: 'turnOff',
      title: 'Turn a band on Home off, or back on',
      steps: [
        { say: 'Hold your finger on the name of any band until the list for arranging opens.', mark: 'homeBand.yourStory', stay: true },
        { say: 'Tap the eye beside a name. A closed eye means that band is off.', mark: 'home.arrangeEye', stay: true },
        { say: 'Tap Done at the top.', mark: 'home.arrangeDone' },
      ],
      forYou: 'A band you turn off leaves Home until you turn it back on here, and nothing it holds is removed.',
    },
    {
      key: 'setupCard',
      title: 'Set something up from Your Guide',
      steps: [
        { say: 'Open the band with the name of Your Guide.', mark: 'homeBand.yourStory', stay: true },
        { say: "Tap a tab's name to open it. The one open before closes, and the one you opened moves to the top. Swipe along a row of cards to see what else it holds.", mark: 'home.setupCards', stay: true },
        { say: 'Tap a coloured chip under Where it comes back to read what that place will show you.' },
        { say: 'Tap Set It Up. It opens the exact place to do it.', mark: 'home.setupCardGo' },
      ],
      forYou: 'Once the record exists the card turns green, says since when and moves to the end of its row, so what is left to set up is always first.',
    },
    {
      key: 'captureSay',
      title: 'Say something into Capture',
      steps: [
        { say: 'Open the band with the name of Capture.', mark: 'homeBand.captureInbox', stay: true },
        { say: 'Tap Say it and speak. Tap Type it if you would rather write.', mark: 'home.captureSay' },
      ],
      forYou: 'Whatever was on your mind is kept, so you can stop holding on to it and sort it out later.',
    },
    {
      key: 'captureSort',
      title: 'Sort out what is waiting in Capture',
      steps: [
        { say: 'Open the band with the name of Capture.', mark: 'homeBand.captureInbox', stay: true },
        { say: 'When something is waiting, tap Sort it out.', mark: 'home.captureSort' },
      ],
      forYou: 'Each note is offered as the record it reads like: a grocery item, a task, a reminder, a place you put something. You say yes or change it.',
    },
    {
      key: 'nextThing',
      title: 'Do the one next thing',
      steps: [
        { say: 'Open the band with the name of One Next Thing.', mark: 'homeBand.nextThing', stay: true },
        { say: 'Read the sentence, then tap the button under it to go straight there.', mark: 'home.nextGo' },
      ],
      forYou: 'Only one thing is offered at a time, so there is no list to work through.',
    },
    {
      key: 'nextThingLater',
      title: 'Put the one next thing aside for now',
      steps: [
        { say: 'Open the band with the name of One Next Thing.', mark: 'homeBand.nextThing', stay: true },
        { say: 'Tap Not now.', mark: 'home.nextNotNow' },
      ],
      forYou: 'It steps aside while you are here, and nothing is counted against you for it.',
    },
    {
      key: 'waitingAnswer',
      title: 'Answer a reminder you missed',
      steps: [
        { say: 'Open the band with the name of Reminders Waiting for an Answer. It shows only when one is waiting.', mark: 'homeBand.waitingAnswers', stay: true },
        { say: 'Tap one of the buttons under a reminder to answer it here. Got it clears one that has nothing to record.', mark: 'home.waitingAnswer', stay: true },
        { say: 'Or tap the words of the reminder to open the place it is about.', mark: 'home.waitingOpen' },
      ],
      forYou: 'An answer here counts the same as one given on the notification, and the notification goes away.',
    },
    {
      key: 'waitingKinds',
      title: 'Stop a kind of reminder coming',
      steps: [
        { say: 'Open the band with the name of Reminders Waiting for an Answer.', mark: 'homeBand.waitingAnswers', stay: true },
        { say: 'Below the reminders, tap the kind you want to stop so it reads Off.', mark: 'home.waitingKinds', stay: true },
        { say: 'For every kind at once, tap Choose Which Reminders Come.', mark: 'home.waitingChoose' },
      ],
      forYou: 'New ones of that kind stop. Any showing now stay until you answer them.',
    },
    {
      key: 'oneAtATime',
      title: 'Check in one question at a time',
      steps: [
        { say: 'Open the band with the name of Signals, if it is closed.', mark: 'homeGroup.log', stay: true },
        { say: 'Open the band with the name of Check In, One Question at a Time.', mark: 'homeBand.oneAtATime', stay: true },
        { say: 'Tap Start.', mark: 'home.oneAtATime' },
      ],
      forYou: 'Each question has a page to itself, so there is only ever one thing to answer, and any of them can be skipped.',
    },
    {
      key: 'morningCheckin',
      title: 'Say how you slept',
      steps: [
        { say: 'Open the band with the name of Signals, if it is closed.', mark: 'homeGroup.log', stay: true },
        { say: 'Open the band with the name of Morning Check-In.', mark: 'homeBand.morningCheckin', stay: true },
        { say: 'Tap the word for how you slept.', mark: 'home.morningSleep', stay: true },
        { say: 'Tap the number for how much energy you have.', mark: 'home.morningEnergy', stay: true },
        { say: 'Add a note if you like, then tap Save.', mark: 'home.morningSave' },
      ],
      forYou: 'Your mornings sit beside your sleep readings, so Trends can lay them out over weeks.',
    },
    {
      key: 'morningChange',
      title: 'Change this morning\'s answer',
      steps: [
        { say: 'Open the band with the name of Morning Check-In, on the Signals band.', mark: 'homeBand.morningCheckin', stay: true },
        { say: 'Tap Change this morning\'s answer, pick again and tap Save the Change.', mark: 'home.morningChange' },
      ],
      forYou: 'The morning keeps one answer, the one you last saved.',
    },
    {
      key: 'mealPhoto',
      title: 'Photograph a meal now and log it later',
      steps: [
        { say: 'Open the band with the name of Food, if it is closed.', mark: 'homeGroup.food', stay: true },
        { say: 'Open the band with the name of Log a Meal.', mark: 'homeBand.logAgain', stay: true },
        { say: 'Tap No time now? Photograph it, then take a photo or choose one you have.', mark: 'home.mealPhoto' },
      ],
      forYou: 'The photo waits on Home until you have a minute to say what the meal was. Nothing is guessed from the picture and nothing is sent anywhere.',
    },
    {
      key: 'mealFind',
      title: 'Find a meal you have had before and log it',
      steps: [
        { say: 'Open the band with the name of Food, if it is closed.', mark: 'homeGroup.food', stay: true },
        { say: 'Open the band with the name of Log a Meal.', mark: 'homeBand.logAgain', stay: true },
        { say: 'Tap Log or schedule a meal.', mark: 'home.mealFind' },
      ],
      forYou: 'Food opens on a list of every meal, with a search box, so you can find one by any word in its name.',
    },
    {
      key: 'usualMeal',
      title: 'Log your usual meal with one tap',
      steps: [
        { say: 'Open the band with the name of Food, if it is closed.', mark: 'homeGroup.food', stay: true },
        { say: 'Open the band named for your usual meal. It changes with the time of day.', mark: 'homeBand.usualMeal', stay: true },
        { say: 'Tap I had it.', mark: 'home.usualHad' },
      ],
      forYou: 'The meal is logged at the usual time, with everything in it, without opening Food.',
    },
    {
      key: 'usualElse',
      title: 'Say you had something other than your usual',
      steps: [
        { say: 'Open the band named for your usual meal, on the Food band.', mark: 'homeBand.usualMeal', stay: true },
        { say: 'Tap Had something else.', mark: 'home.usualElse' },
      ],
      forYou: 'You log what you did eat, and the usual is left alone for next time.',
    },
    {
      key: 'usualSkip',
      title: 'Put the usual meal away for today',
      steps: [
        { say: 'Open the band named for your usual meal, on the Food band.', mark: 'homeBand.usualMeal', stay: true },
        { say: 'Tap Not today.', mark: 'home.usualNotToday' },
      ],
      forYou: 'It comes back tomorrow at the same time.',
    },
    {
      key: 'usualList',
      title: 'Choose your usual meals',
      steps: [
        { say: 'Open the band named for your usual meal, on the Food band.', mark: 'homeBand.usualMeal', stay: true },
        { say: 'Tap Add usual meals, or Change the list once you have some.', mark: 'home.usualList' },
      ],
      forYou: 'Each usual meal has its time of day, and Home offers it when that time comes.',
    },
    {
      key: 'scanProduct',
      title: 'Scan a product from Home',
      steps: [
        { say: 'Open the band with the name of Food, if it is closed.', mark: 'homeGroup.food', stay: true },
        { say: 'Tap Scan a Product.', mark: 'homeBand.scanProduct' },
      ],
      forYou: 'Food opens with the camera ready for the barcode.',
    },
    {
      key: 'logFlare',
      title: 'Log a flare from Home',
      steps: [
        { say: 'Open the band with the name of Signals, if it is closed.', mark: 'homeGroup.log', stay: true },
        { say: 'Tap Log a Flare.', mark: 'homeBand.logFlare' },
      ],
      forYou: 'Signals opens, where a flare is logged with how bad it is and what it felt like.',
    },
    {
      key: 'bloodPressure',
      title: 'Log a blood pressure reading',
      steps: [
        { say: 'Open the band with the name of Signals, if it is closed.', mark: 'homeGroup.log', stay: true },
        { say: 'Tap Log Blood Pressure.', mark: 'homeBand.logBloodPressure', stay: true },
        { say: 'Type the top and bottom numbers, and the pulse if you have it, then tap Save.' },
      ],
      forYou: 'The reading is saved for right now, beside the rest of your readings.',
    },
    {
      key: 'feeling',
      title: 'See the worst flare of the last two days',
      steps: [
        { say: 'Open the band with the name of Signals, if it is closed.', mark: 'homeGroup.log', stay: true },
        { say: 'Open the band with the name of How You\'re Feeling.', mark: 'homeBand.howYoureFeeling', stay: true },
        { say: 'Tap the circle to log a flare or see the whole history on Signals.' },
      ],
      forYou: 'The circle shows the worst flare or food reaction you logged in the last two days, so one that is still going on is seen on the first screen.',
    },
    {
      key: 'groceryOpen',
      title: 'Open your grocery list from Home',
      steps: [
        { say: 'Open the band with the name of Life, if it is closed.', mark: 'homeGroup.life', stay: true },
        { say: 'Open the band with the name of Grocery List.', mark: 'homeBand.groceryList', stay: true },
        { say: 'Tap Open my grocery list, or Build a grocery list if there is none yet.', mark: 'home.groceryOpen' },
      ],
      forYou: 'Life opens on the list, ready to tick things off in the shop.',
    },
    {
      key: 'groceryAdd',
      title: 'Add to the grocery list without leaving Home',
      steps: [
        { say: 'Open the band with the name of Life, if it is closed.', mark: 'homeGroup.life', stay: true },
        { say: 'Open the band with the name of Add to the Grocery List.', mark: 'homeBand.groceryQuickAdd', stay: true },
        { say: 'Type or say what you need. Several things can go in at once, like eggs, milk and bread.', mark: 'home.groceryType', stay: true },
        { say: 'Tap Add.', mark: 'home.groceryAdd' },
      ],
      forYou: 'Each one goes on your open grocery list as a line of its own. Open the list shows them there.',
    },
    {
      key: 'todayPicks',
      title: 'Pick a few things you want to do today',
      steps: [
        { say: 'Open the band with the name of Life, if it is closed.', mark: 'homeGroup.life', stay: true },
        { say: 'Open the band with the name of Today I Want To.', mark: 'homeBand.todayPicks', stay: true },
        { say: 'Tap Pick from your To Do List and choose one.', mark: 'home.pickFrom', stay: true },
        { say: 'Or type something new in the box and tap Add.', mark: 'home.pickNew' },
      ],
      forYou: 'Today holds only the few you picked, and each one can be ticked off from Home.',
    },
    {
      key: 'todayPickDone',
      title: 'Tick off something you picked for today',
      steps: [
        { say: 'Open the band with the name of Today I Want To, on the Life band.', mark: 'homeBand.todayPicks', stay: true },
        { say: 'Tap the circle beside it. Tap again to take the mark back.', mark: 'home.pickMark' },
      ],
      forYou: 'The mark is kept with its time, the same as checking it off on your To Do List.',
    },
    {
      key: 'routine',
      title: 'Run a routine from Home',
      steps: [
        { say: 'Open the band with the name of Life, if it is closed.', mark: 'homeGroup.life', stay: true },
        { say: 'Open the band with the name of Routines.', mark: 'homeBand.routines', stay: true },
        { say: 'Tap a routine to go through its steps.', mark: 'home.routine' },
      ],
      forYou: 'The steps come one after another, so nothing has to be remembered in order.',
    },
    {
      key: 'doneCheck',
      title: 'Check whether you did something',
      steps: [
        { say: 'Open the band with the name of Life, if it is closed.', mark: 'homeGroup.life', stay: true },
        { say: 'Open the band with the name of To Do List.', mark: 'homeBand.doneChecks', stay: true },
        { say: 'Read the line under each one for whether it is checked off. Tap one to open it on Life.', mark: 'home.check' },
      ],
      forYou: 'The answer to "did I already?" is on Home, so you do not have to guess.',
    },
    {
      key: 'startWorkout',
      title: 'Start a workout from Home',
      steps: [
        { say: 'Open the band with the name of Life, if it is closed.', mark: 'homeGroup.life', stay: true },
        { say: 'Open the band with the name of Start a Workout.', mark: 'homeBand.startWorkout', stay: true },
        { say: 'Tap Start beside the workout.', mark: 'home.workoutStart' },
      ],
      forYou: 'The workout opens step by step, and the session is logged when you finish.',
    },
    {
      key: 'workoutDidIt',
      title: 'Mark planned exercise as done',
      steps: [
        { say: 'Open the band with the name of Start a Workout, on the Life band.', mark: 'homeBand.startWorkout', stay: true },
        { say: 'Under Planned for today, tap Did it.', mark: 'home.workoutDidIt' },
      ],
      forYou: 'The plan on Schedules shows it as done. Undo takes it back if you tapped by mistake.',
    },
    {
      key: 'fuelGauges',
      title: 'Read today\'s nutrients at a glance',
      steps: [
        { say: 'Open the band with the name of Insights, if it is closed.', mark: 'homeGroup.insights', stay: true },
        { say: 'Open the band with the name of Today\'s Fuel Gauges.', mark: 'homeBand.fuelGauges', stay: true },
        { say: 'Tap a ring to see that nutrient on Insights.', mark: 'home.ring' },
      ],
      forYou: 'Each ring fills from what you have logged today, and says which part came from food and which from a supplement.',
    },
    {
      key: 'chooseNutrients',
      title: 'Choose which nutrients the gauges show',
      steps: [
        { say: 'Open the band with the name of Today\'s Fuel Gauges, on the Insights band.', mark: 'homeBand.fuelGauges', stay: true },
        { say: 'Tap Choose nutrients and pick the ones you want.', mark: 'home.chooseNutrients' },
      ],
      forYou: 'The gauges show the nutrients that matter to you, in place of the starting set.',
    },
    {
      key: 'makeReport',
      title: 'Make a report from Home',
      steps: [
        { say: 'Open the band with the name of Reports, if it is closed.', mark: 'homeGroup.reports', stay: true },
        { say: 'Open the band with the name of Make a Report.', mark: 'homeBand.makeReport', stay: true },
        { say: 'Tap how far back it should go.', mark: 'home.reportWindow' },
      ],
      forYou: 'Reports opens with that stretch of days, ready to read, print or hand to a doctor.',
    },
    {
      key: 'lowStimulation',
      title: 'Turn on Low Stimulation',
      steps: [
        { say: 'Open the band with the name of Profile, if it is closed.', mark: 'homeGroup.profile', stay: true },
        { say: 'Open the band with the name of Low Stimulation.', mark: 'homeBand.lowStimulation', stay: true },
        { say: 'Tap On. Tap Off to put things back.', mark: 'home.lowStim' },
      ],
      forYou: 'Flat backgrounds, nothing moving on its own, and whatever is open folded shut. Every picture and colour you picked comes back when you switch it off.',
    },
    {
      key: 'readCards',
      title: 'Read something short from Home',
      steps: [
        { say: 'Open the band with the name of Library, if it is closed.', mark: 'homeGroup.digest', stay: true },
        { say: 'Swipe along the cards and tap one to turn it over.', mark: 'home.readCards', stay: true },
        { say: 'Tap Read more on the back to open the whole entry where it lives.' },
      ],
      forYou: 'Each card is the start of an entry from the reading on Life or Garden, in the colour of the tab it lives on.',
    },
    {
      key: 'logHarvest',
      title: 'Log a harvest from Home',
      steps: [
        { say: 'Open the band with the name of Garden, if it is closed.', mark: 'homeGroup.garden', stay: true },
        { say: 'Tap Log a Harvest.', mark: 'homeBand.logHarvest' },
      ],
      forYou: 'Garden opens on the harvest log, where what the garden gave is kept by area and crop.',
    },
    {
      key: 'checkUpdates',
      title: 'Check for a new version of the app',
      steps: [
        { say: 'Tap the arrow into a cloud at the right end of the bar along the top, beside the word Lifestead.', mark: 'header.checkUpdates', stay: true },
        { say: 'Profile opens at App Updates and looks for a newer version. If there is one, you are asked before the app restarts.' },
      ],
      forYou: 'A change sent out today reaches you now, without closing the app and opening it again to find out.',
    },
  ],
  '/life#todos': [
    {
      key: 'done',
      title: 'Mark a task done',
      steps: [
        { say: 'Tap the box beside it.', mark: 'todo.done' },
      ],
      forYou: 'It moves to Done. One that repeats comes back on its next day by itself.',
    },
    {
      key: 'change',
      title: 'Change a task or its day',
      steps: [
        { say: 'Tap Change under it.', mark: 'todo.change', stay: true },
        { say: 'Change the words or the day, then tap Save.' },
      ],
      forYou: 'The reminder moves with the day you give it.',
    },
    {
      key: 'letGo',
      title: 'Let a task go without doing it',
      steps: [
        { say: 'Tap Let it go under it. On one that repeats, it says Let this one go.', mark: 'todo.letGo' },
      ],
      forYou: 'It leaves the list without being called done. One that repeats lets only this time go and comes back on its next day.',
    },
    {
      key: 'noDay',
      title: 'Keep a task with no day',
      steps: [
        { say: 'Type the task in the box at the top.' },
        { say: 'If it read a day you did not mean, tap Keep it without a day.' },
        { say: 'Tap Add to the List.', mark: 'todo.add' },
      ],
      forYou: 'It stays on the list with no reminder until it is done or let go.',
    },
    {
      key: 'showDone',
      title: 'See what is done, or open one again',
      steps: [
        { say: 'Tap Done, below the list.', mark: 'todo.showDone' },
        { say: 'Tap the box beside one to open it again.' },
      ],
      forYou: 'Nothing done is lost, and a task marked done by mistake goes back on the list.',
    },
    {
      key: 'remove',
      title: 'Remove a task',
      steps: [
        { say: 'Tap Remove under it.', mark: 'todo.remove' },
        { say: 'Tap Remove again to say yes. The record of each time it was done goes too, so mark it done or let it go if you want to keep that.' },
      ],
      forYou: 'The list holds only what you still mean to do.',
    },
  ],
  '/schedule#meals': [
    {
      key: 'view',
      title: 'See a week or a month',
      steps: [
        { say: 'Tap Week or Month at the top.', mark: 'schedule.calendarView' },
        { say: 'Tap the arrow beside the dates to go forward, or the one on the other side to go back.', mark: 'schedule.weekNext' },
        { say: 'Tap a day to see what is planned on it.', mark: 'schedule.days' },
      ],
      forYou: 'The meals planned on that day open below, in the order of the day.',
    },
    {
      key: 'unplanned',
      title: 'Put something unplanned on a day',
      steps: [
        { say: 'Tap + Schedule a meal.', mark: 'schedule.addMeal', stay: true },
        { say: 'Tap Something unplanned.', mark: 'schedule.unplanned', stay: true },
        { say: 'Type what it is, then pick the day, the meal and the time.' },
        { say: 'Tap Add to schedule.', mark: 'schedule.saveMeal' },
      ],
      forYou: 'A meal with no recipe behind it still has its place on the day, so the rest of the day is planned around it.',
    },
    {
      key: 'buyingFor',
      title: 'Say how many people a meal is bought for',
      steps: [
        { say: 'Tap + Schedule a meal, or Edit under a meal already there.', mark: 'schedule.addMeal', stay: true },
        { say: 'Tap the box under Buying for and pick how many.', mark: 'schedule.buyingFor', stay: true },
        { say: 'Tap Add to schedule, or Save changes.', mark: 'schedule.saveMeal' },
      ],
      forYou: 'The grocery list buys enough of that meal for that many people. Left as it is, it follows the number set on the Grocery List.',
    },
    {
      key: 'repeat',
      title: 'Have a meal come back on its own',
      steps: [
        { say: 'Tap + Schedule a meal, or Edit under a meal already there.', mark: 'schedule.addMeal', stay: true },
        { say: 'Pick how often it repeats.', mark: 'schedule.repeat', stay: true },
        { say: 'Tap Add to schedule, or Save changes.', mark: 'schedule.saveMeal' },
      ],
      forYou: 'The meal lands on every day it repeats, without being added each time.',
    },
    {
      key: 'skip',
      title: 'Skip a planned meal',
      steps: [
        { say: 'Open the day the meal is on.', mark: 'schedule.dayBand' },
        { say: 'Tap Skip under the meal.', mark: 'schedule.skip' },
        { say: 'To bring it back, tap Un-skip under it.' },
      ],
      forYou: 'The meal stays on the day marked skipped, so the plan still shows what was meant and what happened.',
    },
    {
      key: 'move',
      title: 'Move a meal to another day',
      steps: [
        { say: 'Tap Move under the meal.', mark: 'schedule.move' },
        { say: 'Pick which day and which meal.' },
        { say: 'Tap Move it.' },
      ],
      forYou: 'The meal goes to the new day and time, and anything tied to it, like leftovers, goes with it.',
    },
    {
      key: 'edit',
      title: 'Change a planned meal',
      steps: [
        { say: 'Tap Edit under the meal.', mark: 'schedule.edit', stay: true },
        { say: 'Change what you need, then tap Save changes.', mark: 'schedule.saveMeal' },
      ],
      forYou: 'The day, the grocery list and the reminders follow the change.',
    },
    {
      key: 'eatAgain',
      title: 'Eat a meal again on a later day',
      steps: [
        { say: 'Tap Eat again under the meal.', mark: 'schedule.eatAgain' },
        { say: 'Pick which day and which meal, then tap Add this meal.' },
        { say: 'Tap Done when every later meal is in.' },
      ],
      forYou: 'One cooking feeds the later meals too, and each one shows where it came from.',
    },
    {
      key: 'rotate',
      title: 'Swap the rotating ingredients in a meal',
      steps: [
        { say: 'Tap Rotate under a meal that has ingredients set to rotate.', mark: 'schedule.rotate' },
        { say: 'Pick a different one for each ingredient, or tap Randomize this one or Randomize all.' },
        { say: 'Tap Save.' },
      ],
      forYou: 'The same favorite comes round with different ingredients, so it does not wear thin and the variety stays in your week.',
    },
    {
      key: 'leftovers',
      title: 'Save leftovers from a meal you ate',
      steps: [
        { say: 'Tap Save leftovers under a meal already eaten.', mark: 'schedule.leftovers' },
        { say: 'Pick which day and which meal you will eat them, then tap Add this meal.' },
        { say: 'Tap Done.' },
      ],
      forYou: 'The leftovers go on that later day, and the app says how long cooked food keeps in the fridge.',
    },
    {
      key: 'calendar',
      title: 'Put a meal on your phone calendar',
      steps: [{ say: 'Tap Add to calendar under the meal.', mark: 'schedule.addCalendar' }],
      forYou: 'The meal shows in your phone calendar beside everything else in your day. Unlink calendar takes it off again.',
    },
    {
      key: 'remove',
      title: 'Remove a meal from the schedule',
      steps: [
        { say: 'Tap Remove under the meal.', mark: 'schedule.remove' },
        { say: 'Say yes when it asks.' },
      ],
      forYou: 'The meal comes off the day and off the grocery list.',
    },
    {
      key: 'offPlan',
      title: 'Say what you ate when it was not the plan',
      steps: [
        { say: 'Tap Ate out or off-plan? Say it.', mark: 'schedule.offPlan' },
        { say: 'Say what you ate, then check what it heard.' },
      ],
      forYou: 'What you ate is logged in place of what was planned, so your records match the day you had.',
    },
    {
      key: 'note',
      title: 'Add a note to a day',
      steps: [
        { say: 'Open the band called Notes.', mark: 'schedule.notesBand' },
        { say: 'Tap + Add a note to this day.', mark: 'schedule.addNote', stay: true },
        { say: 'Type the note, and a time if it has one.' },
        { say: 'Tap Add the note.', mark: 'schedule.saveNote' },
      ],
      forYou: 'The note sits on that day of the calendar, for anything that is not a meal.',
    },
    {
      key: 'saveWeek',
      title: 'Save a week to use again',
      steps: [
        { say: 'Open the band called Saved weeks.', mark: 'schedule.weeksBand' },
        { say: 'Tap Save this week.', mark: 'schedule.saveWeek', stay: true },
        { say: 'Keep the name it offers or type another, then tap Save.' },
      ],
      forYou: 'A week that worked can be put back on any later week in one go.',
    },
    {
      key: 'useWeek',
      title: 'Use a saved week',
      steps: [
        { say: 'Go to the week you want to fill.', mark: 'schedule.weekNext' },
        { say: 'Open the band called Saved weeks.', mark: 'schedule.weeksBand' },
        { say: 'Tap Use on this week beside the one you want.', mark: 'schedule.useWeek' },
      ],
      forYou: 'Its meals go onto the same weekdays of the week you are on.',
    },
    {
      key: 'household',
      title: 'Add a household meal',
      steps: [
        { say: 'Open the band called Household meal calendar.', mark: 'schedule.householdBand' },
        { say: 'Tap Add a household meal.', mark: 'schedule.addHousehold', stay: true },
        { say: 'Say what it is and which day.' },
        { say: 'Tap Add to the calendar.', mark: 'schedule.saveHousehold' },
      ],
      forYou: 'The household can see what is planned for everyone, apart from your schedule.',
    },
    {
      key: 'putOnMine',
      title: 'Put a household meal on your schedule',
      steps: [
        { say: 'Open the band called Household meal calendar.', mark: 'schedule.householdBand' },
        { say: 'Tap Put on my schedule beside it.', mark: 'schedule.putOnMine' },
      ],
      forYou: 'The meal joins your schedule, so it counts toward your day and your grocery list.',
    },
  ],
  '/schedule#todaysMeals': [
    {
      key: 'meal',
      title: 'Open a meal to cook it',
      steps: [{ say: 'Tap a meal in the day to open it.', mark: 'todaysMeals.mealBand' }],
      forYou: 'Its dishes, ingredients and steps are inside, in the order of the day.',
    },
    {
      key: 'dose',
      title: 'See how a dose sits with your meals',
      steps: [
        { say: 'Tap a dose in the day to open it.', mark: 'todaysMeals.doseBand' },
        { say: 'Read When this one is best taken, and tap a line to see why.' },
      ],
      forYou: 'It checks the dose against the meals around it, so a clash with a food is seen before it happens.',
    },
    {
      key: 'marks',
      title: 'Read the marks beside a food',
      steps: [
        { say: 'Open a meal.', mark: 'todaysMeals.mealBand' },
        { say: 'Tap the mark beside a food to see what it means for you.' },
      ],
      forYou: 'Each food says whether it suits the conditions you track, and what to look out for.',
    },
  ],
  '/schedule#pastMeals': [
    {
      key: 'adjust',
      title: 'Change a meal you already logged',
      steps: [
        { say: 'Open the band called Past meals.', mark: 'pastMeals.listBand' },
        { say: 'Tap a meal that says Adjust.', mark: 'pastMeals.adjust' },
        { say: 'Change what you ate or how much, then save it.' },
      ],
      forYou: 'Your records hold what you ate, not only what was planned.',
    },
    {
      key: 'leftovers',
      title: 'Save leftovers from a past meal',
      steps: [
        { say: 'Tap Save leftovers under the meal.', mark: 'pastMeals.leftovers' },
        { say: 'Pick which day and which meal you will eat them, then tap Add this meal.' },
        { say: 'Tap Done.' },
      ],
      forYou: 'The leftovers go on that later day, and the app says how long cooked food keeps in the fridge.',
    },
    {
      key: 'logged',
      title: 'Change a meal logged from Food',
      steps: [
        { say: 'Open the band called Logged from Food this week.', mark: 'pastMeals.loggedBand' },
        { say: 'Tap Adjust under the meal.', mark: 'pastMeals.loggedAdjust' },
      ],
      forYou: 'A meal logged by voice or a scan opens in Food, where you can put it right.',
    },
  ],
  '/schedule#dailyMealPlan': [
    {
      key: 'generate',
      title: 'Make a meal plan',
      steps: [
        { say: 'Pick what you eat.', mark: 'mealPlan.diet' },
        { say: 'Tap any eating style you follow. Hold one down to read what it means.', mark: 'mealPlan.styles' },
        { say: 'Pick how many days.', mark: 'mealPlan.days' },
        { say: 'Tap Generate My Day or Generate My Plan.', mark: 'mealPlan.generate' },
      ],
      forYou: 'Each day is built from recipes that fit how you eat and the conditions you track, with your nutrient targets in mind.',
    },
    {
      key: 'day',
      title: 'Look through a day of the plan',
      steps: [
        { say: 'Tap a day to open it.', mark: 'mealPlan.firstDay' },
        { say: 'Read its meals and what the day gives you.' },
      ],
      forYou: 'The dot on each day shows how it rated, so a day worth changing stands out.',
    },
    {
      key: 'swap',
      title: 'Swap a dish in the plan',
      steps: [
        { say: 'Open a day.', mark: 'mealPlan.firstDay' },
        { say: 'Tap Change beside a dish.' },
        { say: 'Scroll the choices, then tap Use this one, or Keep what is there.' },
      ],
      forYou: 'Only dishes that fit the same meal and how you eat are offered.',
    },
    {
      key: 'side',
      title: 'Add a side to a meal',
      steps: [
        { say: 'Open a day.', mark: 'mealPlan.firstDay' },
        { say: 'Tap Add a side under a meal.' },
        { say: 'Scroll the choices, then tap Add it.' },
      ],
      forYou: 'The side counts toward the day, so its nutrients show with the rest.',
    },
    {
      key: 'regenerate',
      title: 'Make one day again',
      steps: [
        { say: 'Open the day.', mark: 'mealPlan.firstDay' },
        { say: 'Tap Regenerate This Day.', mark: 'mealPlan.regenerateDay' },
      ],
      forYou: 'Only that day changes; the other days stay as they are.',
    },
    {
      key: 'schedule',
      title: 'Put the plan on your schedule',
      steps: [
        { say: 'Type the date to start on.' },
        { say: 'Tap Add This Day to Schedule or Add This Plan to Schedule.', mark: 'mealPlan.addToSchedule' },
      ],
      forYou: 'Every meal lands on its day in Meals, and the grocery list picks them up.',
    },
  ],
  '/schedule#hydration': [
    {
      key: 'quick',
      title: 'Log a drink in one tap',
      steps: [
        { say: 'Tap the drink you just had.', mark: 'hydration.quick' },
        { say: 'If it was a mistake, tap Take it back.', mark: 'hydration.undo' },
      ],
      forYou: 'The drink counts toward today straight away.',
    },
    {
      key: 'planned',
      title: 'Mark a planned drink',
      steps: [
        { say: "Open the band called Today's drinks.", mark: 'hydration.todayBand' },
        { say: 'Tap Log now when you have it, or Skip if you will not.' },
        { say: 'Tap Edit to change it, or Remove to take it off.' },
      ],
      forYou: 'What you drank is kept apart from what was planned.',
    },
    {
      key: 'index',
      title: 'See how your drinks hold water',
      steps: [{ say: "Open the band called How today's drinks hold water.", mark: 'hydration.indexBand' }],
      forYou: 'Some drinks keep water in the body longer than others, and this says how each of today’s compares with plain water.',
    },
  ],
  '/schedule#meds': [
    {
      key: 'myMeds',
      title: 'Add or change a med',
      steps: [
        { say: 'Tap Add or change a med in My Meds.', mark: 'meds.myMeds' },
        { say: 'Add it there, then tap Schedule it to bring it here.' },
      ],
      forYou: 'A med is defined once on Life, and its doses are timed here.',
    },
    {
      key: 'taken',
      title: 'Mark a dose taken',
      steps: [
        { say: 'Open the band called Today.', mark: 'meds.todayBand' },
        { say: 'Tap Taken beside the dose.', mark: 'meds.taken' },
      ],
      forYou: 'The dose is recorded with the time you marked it.',
    },
    {
      key: 'skip',
      title: 'Skip a dose',
      steps: [
        { say: 'Open the band called Today.', mark: 'meds.todayBand' },
        { say: 'Tap Skip beside the dose.', mark: 'meds.skipDose' },
        { say: 'To bring it back, tap Un-skip.' },
      ],
      forYou: 'A skipped dose stays on the day marked skipped, so the record shows it.',
    },
    {
      key: 'watch',
      title: 'Get alerts for doses you watch',
      steps: [{ say: 'Under Doses you watch, tap Turn alerts on.', mark: 'meds.watchAlerts' }],
      forYou: 'This phone raises an alert when a dose of someone you look after is not marked.',
    },
    {
      key: 'check',
      title: 'See what to check about timing',
      steps: [
        { say: 'Open the band called Things to check.', mark: 'meds.checkBand' },
        { say: 'Tap a line to see why it matters.' },
      ],
      forYou: 'It lists foods, supplements and meds that compete or clash, and how far apart to take them.',
    },
  ],
  '/schedule#appointments': [
    {
      key: 'add',
      title: 'Schedule an appointment',
      steps: [
        { say: 'Tap + Schedule an appointment.', mark: 'appointments.add', stay: true },
        { say: 'Fill in what it is for, who with, when and where.' },
        { say: 'Tap Schedule appointment.', mark: 'appointments.save' },
      ],
      forYou: 'You get a reminder before it, and it shows on your day.',
    },
    {
      key: 'say',
      title: 'Say an appointment out loud',
      steps: [
        { say: 'Tap + Schedule an appointment.', mark: 'appointments.add', stay: true },
        { say: 'Under Say an Appointment, say it the way you would to someone.', mark: 'appointments.say', stay: true },
        { say: 'Tap Fill the Boxes From This, check them, then tap Schedule appointment.', mark: 'appointments.save' },
      ],
      forYou: 'The boxes fill in from what you said, so you only put right what it missed.',
    },
    {
      key: 'import',
      title: 'Bring one in from your phone calendar',
      steps: [
        { say: 'Tap Import from Phone Calendar.', mark: 'appointments.import' },
        { say: 'Tap the one to bring in.' },
      ],
      forYou: 'It is copied in with its date, time and place, ready for notes and reminders.',
    },
    {
      key: 'done',
      title: 'Mark an appointment done or cancelled',
      steps: [
        { say: 'Open the band called Appointments.', mark: 'appointments.listBand' },
        { say: 'Tap Completed once it has happened.', mark: 'appointments.completed' },
        { say: 'Or tap Cancel if it is not going ahead. Un-cancel brings it back.', mark: 'appointments.cancel' },
      ],
      forYou: 'The record keeps what happened, which a report can show later.',
    },
    {
      key: 'edit',
      title: 'Change an appointment',
      steps: [
        { say: 'Tap Edit under it.', mark: 'appointments.edit', stay: true },
        { say: 'Change what you need, then tap Save changes.', mark: 'appointments.save' },
      ],
      forYou: 'The reminder moves with the new time.',
    },
    {
      key: 'calendar',
      title: 'Put an appointment on your phone calendar',
      steps: [{ say: 'Tap Add to calendar under it.', mark: 'appointments.addCalendar' }],
      forYou: 'It shows in your phone calendar too. Unlink calendar takes it off again.',
    },
    {
      key: 'remove',
      title: 'Remove an appointment',
      steps: [
        { say: 'Tap Remove under it.', mark: 'appointments.remove' },
        { say: 'If it is on your phone calendar too, pick Remove here only or Remove from both.' },
      ],
      forYou: 'It comes off the list and its reminder stops.',
    },
  ],
  '/schedule#upkeep': [
    {
      key: 'add',
      title: 'Add or change something to keep up',
      steps: [
        { say: 'Tap Add or change something in Upkeep.', mark: 'upkeepLens.add' },
        { say: 'Add it on Life, and its dates show up here.' },
      ],
      forYou: 'A service, a filter, a registration or a renewal is defined once and its due dates follow.',
    },
    {
      key: 'done',
      title: 'Say you did one today',
      steps: [
        { say: 'Open the band it is in.', mark: 'upkeepLens.firstBand' },
        { say: 'Tap Done today under it.', mark: 'upkeepLens.doneToday' },
      ],
      forYou: 'The next one comes due counted from today, and the app says when.',
    },
    {
      key: 'edit',
      title: 'Change or renew one',
      steps: [
        { say: 'Open the band it is in.', mark: 'upkeepLens.firstBand' },
        { say: 'Tap Edit in Upkeep, Renew in Upkeep or Set it up in Upkeep under it.', mark: 'upkeepLens.edit' },
      ],
      forYou: 'It opens on Life, where it is kept.',
    },
  ],
  '/schedule#timeline': [
    {
      key: 'read',
      title: 'Read your day on one line',
      steps: [
        { say: 'Scroll the strip left and right. The line marked Now is where you are in the day.', mark: 'timeline.strip' },
        { say: 'Tap anything on it to open where it lives.' },
      ],
      forYou: 'Meals, doses, appointments, routines, bills, upkeep and counters sit together in the order they come.',
    },
    {
      key: 'moveRest',
      title: 'Move what is left today to tomorrow',
      steps: [
        { say: 'Tap Move what is left today to tomorrow.', mark: 'timeline.moveRest' },
        { say: 'Read what moves and what stays, then tap Move them.' },
      ],
      forYou: 'A day that got away from you does not have to be planned again by hand.',
    },
    {
      key: 'calendar',
      title: 'Show your phone calendar on the timeline',
      steps: [{ say: "Turn on Show my phone's calendar here.", mark: 'timeline.calendar' }],
      forYou: 'Your phone calendar is read each time and shown beside the rest, never copied into the app.',
    },
  ],
  '/schedule#exercise': [
    {
      key: 'plan',
      title: 'Plan exercise',
      steps: [
        { say: 'Tap + Plan exercise.', mark: 'exercise.add', stay: true },
        { say: 'Pick what, then the day, the time and how often.' },
        { say: 'Tap Save plan.', mark: 'exercise.save' },
      ],
      forYou: 'It lands on the days you picked, and a workout from Life can be started from here.',
    },
    {
      key: 'mark',
      title: 'Mark exercise done or skipped',
      steps: [
        { say: 'Under Coming up, tap Start to begin a planned workout, or Did it once it is done.' },
        { say: 'Tap Skipped if it did not happen. Clear mark takes either back.' },
      ],
      forYou: 'The record shows what you did and what you let go, with nothing scored.',
    },
  ],
  '/log#flares': [
    {
      key: 'log',
      title: 'Log a flare',
      steps: [
        { say: 'Tap + Log a flare.', mark: 'signals.add', stay: true },
        { say: 'Say when it started and how bad it was. The 0 to 10 scale is there if you would rather use a number.' },
        { say: 'If you want, pick what it was like, what was going on, and where on the body.' },
        { say: 'Tap Save flare.', mark: 'signals.save' },
      ],
      forYou: 'Each flare is kept with its time, so Trends can lay flares beside sleep, meals and everything else you record.',
    },
    {
      key: 'edit',
      title: 'Finish or correct a flare',
      steps: [
        { say: 'Tap Edit on the flare.', mark: 'signals.editFirst', stay: true },
        { say: 'Change what it was like or what was going on, then tap Save.' },
      ],
      forYou: 'A flare logged in a hurry can be filled in later, once you feel up to it.',
    },
    {
      key: 'photos',
      title: 'Add a photo to a flare',
      steps: [
        { say: 'Tap Photos under the flare.', mark: 'signals.photosFirst', stay: true },
        { say: 'Tap Take a Photo or Choose from Library. Line Up With the Last Photo shows the last one faintly, so the next is taken from the same angle.' },
      ],
      forYou: 'A rash or a swelling looks different by tomorrow, and a photo from the day is what a doctor asks for.',
    },
    {
      key: 'remove',
      title: 'Remove a flare',
      steps: [{ say: 'Tap Remove on the flare.', mark: 'signals.removeFirst' }],
      forYou: 'A flare logged by mistake comes out of every chart that read it.',
    },
  ],
  '/log#foodReactions': [
    {
      key: 'log',
      title: 'Log a food reaction',
      steps: [
        { say: 'Tap + Log a food reaction.', mark: 'signals.add', stay: true },
        { say: 'Type what you ate or drank, then say when it started and how bad it was.' },
        { say: 'If you want, pick what it was like and where on the body.' },
        { say: 'Tap Save reaction.', mark: 'signals.save' },
      ],
      forYou: 'A reaction that starts from a food is kept apart from flares, so the food it followed stays named.',
    },
    {
      key: 'edit',
      title: 'Finish or correct a reaction',
      steps: [
        { say: 'Tap Edit on the reaction.', mark: 'signals.editFirst', stay: true },
        { say: 'Change what it was like, then tap Save.' },
      ],
      forYou: 'Details you remember later can still be added to the same reaction.',
    },
    {
      key: 'photos',
      title: 'Add a photo to a reaction',
      steps: [
        { say: 'Tap Photos under the reaction.', mark: 'signals.photosFirst', stay: true },
        { say: 'Tap Take a Photo or Choose from Library.' },
      ],
      forYou: 'Hives or swelling can be shown to a doctor as it looked on the day.',
    },
    {
      key: 'remove',
      title: 'Remove a reaction',
      steps: [{ say: 'Tap Remove on the reaction.', mark: 'signals.removeFirst' }],
      forYou: 'A reaction logged by mistake is taken out of Trends and the reports.',
    },
  ],
  '/log#newFoods': [
    {
      key: 'trial',
      title: 'Start a food trial',
      steps: [
        { say: 'Tap + Start a new food trial.', mark: 'signals.add', stay: true },
        { say: 'Type the food, or tap Pick a specific food to choose it from the food list.' },
        { say: 'Pick how to test it and for how many days to watch.' },
        { say: 'Tap Start trial, or Set it up for a trial in steps.', mark: 'signals.save' },
      ],
      forYou: 'A food you have been avoiding is brought back one at a time, with a set number of days to watch for anything.',
    },
    {
      key: 'today',
      title: 'Check in on a trial each day',
      steps: [
        { say: 'Beside Today, tap Nothing to report, or Something felt off to log what happened.', mark: 'newFoods.today' },
      ],
      forYou: 'One tap a day is enough, and the days in between are not left blank.',
    },
    {
      key: 'resolve',
      title: 'Clear or flag a food',
      steps: [
        { say: 'Once the watch is over, or sooner if something happens, tap No problems or Flag it.', mark: 'newFoods.resolve' },
      ],
      forYou: 'Cleared and flagged foods stay on the list, so you can see what you have tried and how it went.',
    },
    {
      key: 'experiment',
      title: 'Try an experiment that is not about food',
      steps: [
        { say: 'Tap + Start an experiment about something else.', mark: 'newFoods.addExperiment', stay: true },
        { say: 'Pick what you are testing and say what you will change.' },
        { say: 'Pick how many days to keep the change, what to watch, and how long to watch once you are back to usual.' },
        { say: 'Tap Start experiment.', mark: 'newFoods.startExperiment' },
        { say: 'When the days are up, tap Back to Usual on the experiment.' },
      ],
      forYou: 'A bedtime, a supplement or a walk is compared before, during and after, and the result always says it was one run.',
    },
    {
      key: 'series',
      title: 'Plan a series of foods',
      steps: [
        { say: 'Tap + Plan a series of foods.', mark: 'newFoods.addSeries', stay: true },
        { say: 'Add each food in the order you will bring them back. Move up changes the order.' },
        { say: 'Pick how many days to watch each one, then tap Start series.', mark: 'newFoods.startSeries' },
      ],
      forYou: 'Each food starts once the one before it is settled, so you never have to remember what comes next.',
    },
    {
      key: 'remove',
      title: 'Remove a trial',
      steps: [{ say: 'Tap Remove on the trial.', mark: 'signals.removeFirst' }],
      forYou: 'A trial started by mistake comes off the list.',
    },
  ],
  '/log#exercise': [
    {
      key: 'log',
      title: 'Log exercise',
      steps: [
        { say: 'Tap + Log exercise.', mark: 'signals.add', stay: true },
        { say: 'Say what you did. How long and how hard are there if you want them.' },
        { say: 'Tap Save.', mark: 'signals.save' },
      ],
      forYou: 'A quick note of what you did, read on Trends beside sleep, mood and flares.',
    },
    {
      key: 'remove',
      title: 'Remove an exercise entry',
      steps: [{ say: 'Tap Remove on the entry.', mark: 'signals.removeFirst' }],
      forYou: 'An entry logged twice comes out without a trace.',
    },
  ],
  '/log#bloodPressure': [
    {
      key: 'log',
      title: 'Log a blood pressure reading',
      steps: [
        { say: 'Tap + Log a blood pressure reading.', mark: 'signals.add', stay: true },
        { say: 'Type the top and bottom numbers, and your heart rate if the cuff showed it.' },
        { say: 'Tap Save.', mark: 'signals.save' },
      ],
      forYou: 'Readings kept with their time can go to your doctor in a report, in place of a scrap of paper.',
    },
    {
      key: 'remove',
      title: 'Remove a reading',
      steps: [{ say: 'Tap Remove on the reading.', mark: 'signals.removeFirst' }],
      forYou: 'A reading typed wrong comes out of Trends and the reports.',
    },
  ],
  '/log#therapies': [
    {
      key: 'log',
      title: 'Log a session',
      steps: [
        { say: 'Tap + Log a session.', mark: 'signals.add', stay: true },
        { say: 'Pick the kind of session and the day. Who did it, what they worked on, the length and the cost are there if you want them.' },
        { say: 'Tap Log session.', mark: 'signals.save' },
      ],
      forYou: 'Trends > Therapy Response reads your check-ins after each session, to show how long the effect lasted.',
    },
    {
      key: 'edit',
      title: 'Change a session',
      steps: [
        { say: 'Tap Edit on the session.', mark: 'signals.editFirst', stay: true },
        { say: 'Change what needs it, then tap Save changes.' },
      ],
      forYou: 'A cost or a name added later is kept with the same visit.',
    },
    {
      key: 'remove',
      title: 'Remove a session',
      steps: [{ say: 'Tap Remove on the session.', mark: 'signals.removeFirst' }],
      forYou: 'A session that did not happen comes off the record.',
    },
  ],
  '/log#generalNote': [
    {
      key: 'add',
      title: 'Add a note',
      steps: [
        { say: 'Tap + Add a note.', mark: 'signals.add', stay: true },
        { say: 'Write the note. Mood, energy and stress are there if you want to mark them.' },
        { say: 'Tap Save.', mark: 'signals.save' },
      ],
      forYou: 'Anything worth remembering has a place, with the day it happened.',
    },
    {
      key: 'remove',
      title: 'Remove a note',
      steps: [{ say: 'Tap Remove on the note.', mark: 'signals.removeFirst' }],
      forYou: 'A note you no longer want is taken out.',
    },
  ],
  '/log#nocturia': [
    {
      key: 'log',
      title: 'Log a night',
      steps: [
        { say: 'Tap + Log a night.', mark: 'signals.add', stay: true },
        { say: 'Say how many times you got up, and the first time you woke if you remember it.' },
        { say: 'Tap Save.', mark: 'signals.save' },
      ],
      forYou: 'Trends > Nights reads each night beside what you drank the evening before.',
    },
    {
      key: 'remove',
      title: 'Remove a night',
      steps: [{ say: 'Tap Remove on the night.', mark: 'signals.removeFirst' }],
      forYou: 'Logging the same night again replaces it, and Remove takes it out.',
    },
  ],
  '/log#bowel': [
    {
      key: 'log',
      title: 'Log a bowel movement',
      steps: [
        { say: 'Tap + Log a bowel movement.', mark: 'signals.add', stay: true },
        { say: 'Pick the type that comes closest. Urgency, blood, pain and a note are there if you want them.' },
        { say: 'Tap Save.', mark: 'signals.save' },
      ],
      forYou: 'The types are kept day by day, which is what a clinician will ask about.',
    },
    {
      key: 'remove',
      title: 'Remove an entry',
      steps: [{ say: 'Tap Remove on the entry.', mark: 'signals.removeFirst' }],
      forYou: 'An entry logged by mistake comes out of Trends and the reports.',
    },
  ],
  '/log#microbiome': [
    {
      key: 'photo',
      title: 'Add a test from a photo or screenshot',
      steps: [
        { say: 'Open Add a Test.', mark: 'microbiome.form', stay: true },
        { say: 'Tap Photograph the Report, or From a Screenshot for one already on your phone.', mark: 'microbiome.photo', stay: true },
        { say: 'Check each row read and confirm the ones you want kept.' },
        { say: 'Fill in the day, the company and the kind of test, then tap the save button.', mark: 'signals.save' },
      ],
      forYou: 'The results are kept the way the report printed them, without typing every line.',
    },
    {
      key: 'paste',
      title: 'Paste or type the results',
      steps: [
        { say: 'Open Add a Test.', mark: 'microbiome.form', stay: true },
        { say: 'Paste the results, one to a line, then tap Read These Lines.', mark: 'microbiome.readLines', stay: true },
        { say: 'Confirm each row, or tap Add a Row to type one in.' },
        { say: 'Tap the save button.', mark: 'signals.save' },
      ],
      forYou: 'A report sent as an email or a web page can go straight in.',
    },
    {
      key: 'change',
      title: 'Add to or remove a test',
      steps: [
        { say: 'Open the test.', mark: 'microbiome.firstTest', stay: true },
        { say: 'Tap Edit or Add Rows to change it, or Remove This Test.' },
      ],
      forYou: 'A result missed the first time can be added to the same test.',
    },
    {
      key: 'across',
      title: 'See one result across tests',
      steps: [{ say: 'Open The Same Result Across Tests.', mark: 'microbiome.across' }],
      forYou: 'Each result is laid beside the same one from your other tests, as the reports printed them.',
    },
  ],
  '/log#cycle': [
    {
      key: 'log',
      title: 'Log a period day',
      steps: [
        { say: 'Tap + Log a period day.', mark: 'signals.add', stay: true },
        { say: 'Pick how heavy it was if you want, and the day.' },
        { say: 'Tap Save.', mark: 'signals.save' },
      ],
      forYou: 'Once two cycles are logged, the average of past cycles is shown, and Pattern Finder shows the cycle day beside each flare.',
    },
    {
      key: 'remove',
      title: 'Remove a day',
      steps: [{ say: 'Tap Remove on the day.', mark: 'signals.removeFirst' }],
      forYou: 'A day logged by mistake comes out of the average.',
    },
  ],
  '/log#calm': [
    {
      key: 'breathe',
      title: 'Breathe with the pacer',
      steps: [
        { say: 'Open Breathing Pacer.', mark: 'calm.pacer', stay: true },
        { say: 'Pick a pattern, how long, and what happens at each change.' },
        { say: 'Tap Start, and breathe in as the circle grows and out as it shrinks.', mark: 'calm.start' },
      ],
      forYou: 'Nothing here is recorded or counted. It is there for the moment you need it.',
    },
    {
      key: 'read',
      title: 'Hear a relaxation script',
      steps: [
        { say: 'Open Relaxation Read Aloud.', mark: 'calm.readAloud', stay: true },
        { say: 'Pick a script, a voice and a pace.' },
        { say: 'Tap Play.', mark: 'calm.play' },
      ],
      forYou: 'The voice already on your phone reads it, including scripts you write.',
    },
  ],
  '/log#trackers': [
    {
      key: 'add',
      title: 'Make a tracker',
      steps: [
        { say: 'Tap + Add a tracker of your own.', mark: 'trackers.addTracker', stay: true },
        { say: 'Name what you want to track and pick what kind of number it is.' },
        { say: 'Tap Save.', mark: 'trackers.saveTracker' },
      ],
      forYou: 'Anything the app does not ask about can be tracked, and Trends > My Trackers draws it.',
    },
    {
      key: 'log',
      title: 'Log a tracker',
      steps: [
        { say: 'Tap the tracker.', mark: 'trackers.pick', stay: true },
        { say: 'Tap + Log and the tracker name.', mark: 'signals.add', stay: true },
        { say: 'Fill in the number and when, then tap Save.', mark: 'signals.save' },
      ],
      forYou: 'A day with nothing logged shows as a gap, never as a zero.',
    },
    {
      key: 'rename',
      title: 'Rename or remove a tracker',
      steps: [
        { say: 'Tap the tracker.', mark: 'trackers.pick', stay: true },
        { say: 'Tap Rename or remove.', mark: 'trackers.rename', stay: true },
        { say: 'Change the name and tap Save, or tap Remove this tracker.' },
      ],
      forYou: 'A tracker with entries moves to Past trackers, where what you logged stays readable.',
    },
    {
      key: 'removeEntry',
      title: 'Remove an entry',
      steps: [{ say: 'Tap Remove on the entry.', mark: 'signals.removeFirst' }],
      forYou: 'An entry typed wrong comes out of the chart.',
    },
  ],
  '/food#findMeal': [
    {
      key: 'logSaved',
      title: 'Log a meal you have saved',
      steps: [
        { say: 'Choose Your meals or System recipes.', mark: 'findMeal.scope', stay: true },
        { say: 'Open a group.', mark: 'findMeal.group' },
        { say: 'Tap a meal.', mark: 'findMeal.meal' },
        { say: 'Tap Use this meal.', mark: 'findMeal.use' },
        { say: 'Tap Log it now.', mark: 'findMeal.logNow' },
      ],
      forYou: "It goes on today's record, and the timing rules check it against your medicines and supplements.",
    },
    {
      key: 'earlier',
      title: 'Log a meal you ate earlier today',
      steps: [
        { say: 'Open a group and tap the meal.', mark: 'findMeal.meal' },
        { say: 'Tap Use this meal.', mark: 'findMeal.use' },
        { say: 'Tap Log it earlier today.', mark: 'findMeal.earlier' },
        { say: 'Set the time you ate it, then tap Log it.' },
      ],
      forYou: 'A meal logged late lands at the time you ate it, so the day reads in the order it happened.',
    },
    {
      key: 'schedule',
      title: 'Schedule a meal for later',
      steps: [
        { say: 'Open a group and tap the meal.', mark: 'findMeal.meal' },
        { say: 'Tap Use this meal.', mark: 'findMeal.use' },
        { say: 'Tap Schedule it.', mark: 'findMeal.schedule' },
        { say: 'Pick Today or Tomorrow and a time, then tap Schedule it.', mark: 'findMeal.scheduleIt' },
      ],
      forYou: "It shows in Schedules on Today's Meals at that time, beside your doses.",
    },
    {
      key: 'swap',
      title: 'Eat something other than what was planned',
      steps: [
        { say: 'Open a group and tap the meal you are eating instead.', mark: 'findMeal.meal' },
        { say: 'Tap Use this meal.', mark: 'findMeal.use' },
        { say: 'Tap Use it instead of a planned meal. It shows only when a meal is planned today.', mark: 'findMeal.replace' },
        { say: 'Tap the planned meal it takes the place of.' },
      ],
      forYou: 'The day shows what you ate in place of what was planned, without the planned meal left waiting.',
    },
    {
      key: 'combine',
      title: 'Put several dishes together as one meal',
      steps: [
        { say: 'Open a group.', mark: 'findMeal.group' },
        { say: 'Tick each dish you want in the meal.', mark: 'findMeal.tick', stay: true },
        { say: 'Tap Build a meal with these dishes.', mark: 'findMeal.build' },
        { say: 'In the Meal builder, log it now or schedule it.' },
      ],
      forYou: 'A main, a side and a drink become one meal, logged once.',
    },
    {
      key: 'eatenOut',
      title: 'Log a meal you did not cook',
      steps: [
        { say: 'Tick A restaurant, a takeaway, or a meal somebody else cooked.', mark: 'findMeal.eatenOut' },
        { say: 'Fill in where and who cooked it if you like, and under What was in it, search for each food you could see.' },
        { say: 'Tap Log it with the foods you added, or Log just that I ate out.', mark: 'findMeal.logOut' },
        { say: 'Pick Now or Earlier today.' },
      ],
      forYou: 'A meal out is still on the record, even when you cannot say everything that was in it.',
    },
    {
      key: 'menu',
      title: 'Check a menu before you order',
      steps: [
        { say: 'Open Read a Menu.', mark: 'findMeal.menu' },
        { say: 'Tap Photograph It and take a picture of the menu, or type or paste it in the box below.', mark: 'findMeal.menuPhoto', stay: true },
        { say: 'For a menu with more pages, tap Another Page.' },
      ],
      forYou: 'Each dish is checked for words that touch your allergies, conditions, eating style and food restrictions, so you know what to ask about before ordering.',
    },
  ],
  '/food#scanProduct': [
    {
      key: 'scan',
      title: 'Scan a product',
      steps: [
        { say: 'Point your camera at the barcode inside the frame.', mark: 'scan.frame', stay: true },
        { say: 'If the product is not found, tap Take a Photo of the Ingredients and photograph its ingredient list.', mark: 'scan.ingredientsPhoto', stay: true },
        { say: 'Check the words it read, then tap Continue.', mark: 'scan.continue' },
        { say: 'Read what it says about the product.' },
      ],
      forYou: 'You see what is in a packaged food, and anything in it that touches what you set in Profile, while still in the shop.',
    },
    {
      key: 'readAloud',
      title: 'Have it read to you',
      steps: [
        { say: 'Scan the product.', mark: 'scan.frame', stay: true },
        { say: 'Tap Read This to Me.', mark: 'scan.readAloud' },
        { say: 'Listen.' },
      ],
      forYou: 'Small print on a label is read out loud.',
    },
    {
      key: 'log',
      title: 'Log a product you ate',
      steps: [
        { say: 'Scan the product.', mark: 'scan.frame', stay: true },
        { say: 'Tap Log This as Eaten.', mark: 'scan.logEaten' },
        { say: 'Set how many grams and which meal it was part of, then tap Log It.', mark: 'scan.logIt' },
      ],
      forYou: 'A packaged food counts in the day beside the meals you cooked.',
    },
    {
      key: 'buy',
      title: 'Keep a product you buy, with its price',
      steps: [
        { say: 'Scan the product.', mark: 'scan.frame', stay: true },
        { say: 'Tap Buy This.', mark: 'scan.buy' },
        { say: 'Tap Take a Photo of the Price, or type the price in.', mark: 'scan.pricePhoto', stay: true },
        { say: 'Tap Save Price.', mark: 'scan.savePrice' },
        { say: 'To buy it again, tap Put It on My Grocery List.', mark: 'scan.grocery' },
      ],
      forYou: 'It is kept in My Food Products, ready to add to a recipe, with what you paid for it that day.',
    },
  ],
  '/food#mealBuilder': [
    {
      key: 'build',
      title: 'Build a meal and log it',
      steps: [
        { say: 'Pick a meal type, name it if you like, and tap Continue.', mark: 'meal.continue' },
        { say: 'Under Add from..., tap the kind of dish to add.', mark: 'meal.addFrom', stay: true },
        { say: 'Find the dish and tap Add to Meal. Do the same for each dish.', mark: 'meal.addToMeal', stay: true },
        { say: 'Tap Log This Now.', mark: 'meal.logNow' },
      ],
      forYou: "The meal goes on today's record, and the timing rules check it against your medicines and supplements.",
    },
    {
      key: 'schedule',
      title: 'Build a meal for later',
      steps: [
        { say: 'Build the meal the same way.', mark: 'meal.addFrom', stay: true },
        { say: 'Tap Save & Schedule for Later.', mark: 'meal.schedule' },
        { say: 'Pick the date and the time, then tap Schedule It.', mark: 'meal.scheduleIt' },
      ],
      forYou: "It shows in Schedules on Today's Meals at that time, beside your doses.",
    },
    {
      key: 'startFrom',
      title: 'Start from a meal you already have',
      steps: [
        { say: 'Open Start from a meal you have.', mark: 'meal.startFrom' },
        { say: 'Pick a favorite, a scheduled meal or one you logged before.' },
        { say: 'Change what you need, then log it or schedule it.' },
      ],
      forYou: 'A meal you eat often is loaded with its dishes, so you only change what is different today.',
    },
    {
      key: 'favorite',
      title: 'Keep a meal as a favorite',
      steps: [
        { say: 'Build the meal.', mark: 'meal.addFrom', stay: true },
        { say: 'Tick Also save as a Favorite, for fast reuse later.', mark: 'builder.favorite' },
        { say: 'Tap Log This Now or Save & Schedule for Later.' },
      ],
      forYou: 'Next time it is waiting under Start from a meal you have.',
    },
    {
      key: 'report',
      title: 'Read the full report before you log',
      steps: [
        { say: 'Build the meal.', mark: 'meal.addFrom', stay: true },
        { say: 'Tap Preview Full Report.', mark: 'builder.preview' },
        { say: 'Read it, then close it and log or schedule the meal.' },
      ],
      forYou: 'You see what the whole meal brings and anything in it that touches what you set in Profile, before it is on the record.',
    },
  ],
  '/food#sideBuilder': builderHowTos({ noun: 'Side' }),
  '/food#saladBuilder': builderHowTos({ noun: 'Salad', goitrogens: true }),
  '/food#smoothieBuilder': builderHowTos({ noun: 'Smoothie', goitrogens: true }),
  '/food#soupBuilder': builderHowTos({ noun: 'Soup' }),
  '/food#snackBuilder': builderHowTos({ noun: 'Snack' }),
  '/food#beverageBuilder': builderHowTos({
    noun: 'Beverage',
    firstSteps: [{ say: 'Pick the closest kind of drink. Smoothies and Fermentation open builders of their own.', mark: 'builder.kind' }],
  }),
  '/food#bakedGoodsBuilder': builderHowTos({ noun: 'Baked Good' }),
  '/food#saucesBuilder': builderHowTos({ noun: 'Sauce' }),
  '/food#handheldsBuilder': builderHowTos({ noun: 'Handheld' }),
  '/food#dessertBuilder': builderHowTos({ noun: 'Dessert' }),
  '/food#fermentationBuilder': [
    {
      key: 'premade',
      title: 'Start a premade ferment today',
      steps: [
        { say: 'Tap Yes, a Drink, or No, Something You Eat.', mark: 'ferment.drink', stay: true },
        { say: 'Pick what kind of ferment it is.', mark: 'builder.kind' },
        { say: 'Tap Start Today on the recipe you want.', mark: 'ferment.startToday' },
      ],
      forYou: 'The recipe is saved and the Fermentation Tracker starts counting the batch from today.',
    },
    {
      key: 'later',
      title: 'Get a reminder to start one later',
      steps: [
        { say: 'Tap Yes, a Drink, or No, Something You Eat.', mark: 'ferment.drink', stay: true },
        { say: 'Pick what kind of ferment it is.', mark: 'builder.kind' },
        { say: 'Tap Schedule for Later on the recipe.', mark: 'ferment.later' },
        { say: 'Type the date as year, month and day, like 2026-11-02, then tap Set Reminder.', mark: 'ferment.reminder' },
      ],
      forYou: 'A reminder comes that morning to start it.',
    },
    ...builderHowTos({
      noun: 'Fermentation',
      noNudge: true,
      firstSteps: [
        { say: 'Tap Yes, a Drink, or No, Something You Eat.', mark: 'ferment.drink', stay: true },
        { say: 'Pick what kind of ferment it is.', mark: 'builder.kind' },
        { say: 'To make your own rather than a premade one, tap Or Build Your Own Fermentation.', mark: 'ferment.own' },
      ],
    }),
  ],
  '/food#systemRecipes': [
    {
      key: 'find',
      title: 'Find a recipe',
      steps: [
        { say: 'Type a word or two in Search the recipes.', mark: 'recipes.search', stay: true },
        { say: 'To see only recipes for one eating style, pick it under Filter by diet.', mark: 'recipes.diet', stay: true },
        { say: 'Open a group.', mark: 'recipes.group' },
        { say: 'Tap a recipe to read it.', mark: 'recipes.recipe' },
        { say: 'Read the recipe and any caution on it.' },
      ],
      forYou: 'Recipes are there to read, with any caution for a condition you track shown on the recipe.',
    },
    {
      key: 'build',
      title: 'Make a recipe your own',
      steps: [
        { say: 'Open a recipe.', mark: 'recipes.recipe', stay: true },
        { say: 'Choose how many it is for, then tap Build This Recipe.', mark: 'recipes.build' },
        { say: 'Change what you need in the builder, then save it.' },
      ],
      forYou: 'It goes in My Recipes as yours, ready to log, schedule or change again.',
    },
  ],
  '/food#importRecipe': [
    {
      key: 'link',
      title: 'Bring in a recipe from a web page',
      steps: [
        { say: 'Under From a Web Link, paste the address of the recipe and tap Read the Recipe.', mark: 'import.read' },
        { say: 'Check each line. Tap Pick a food or Change the food where the match is wrong, or Leave it out.', mark: 'import.line', stay: true },
        { say: 'Under Build it as, pick the kind of dish.', mark: 'import.builder', stay: true },
        { say: 'Tap Open in the builder it names.', mark: 'import.open' },
        { say: 'Save it in the builder.' },
      ],
      forYou: 'A recipe from anywhere becomes one of yours in My Recipes, with every ingredient matched to a food the app knows.',
    },
    {
      key: 'paste',
      title: 'Paste in a list of ingredients',
      steps: [
        { say: 'Tap Paste ingredients instead.', mark: 'import.paste' },
        { say: 'Paste or type the ingredients, one to a line, then tap Read These Lines.', mark: 'import.readLines' },
        { say: 'Check each line, pick the kind of dish under Build it as, and tap Open in the builder it names.', mark: 'import.open' },
        { say: 'Save it in the builder.' },
      ],
      forYou: 'A recipe from a book, a card or a message gets in without typing each food on its own.',
    },
    {
      key: 'past',
      title: 'Go back to a recipe you brought in',
      steps: [
        { say: 'Open Imported Before.', mark: 'import.past', stay: true },
        { say: 'Tap a recipe to open it again, or tap Remove and then Remove it.' },
      ],
      forYou: 'A recipe you brought in and did not finish is still there to pick up.',
    },
  ],
  '/garden#myZone': [
    {
      key: 'find',
      title: 'Find your growing zone from where you live',
      steps: [
        { say: 'Under Find My Zone, pick your country.' },
        { say: 'Type your ZIP or postal code.' },
        { say: 'Tap Find My Zone.', mark: 'garden.findZone' },
      ],
      forYou: 'Your zone is set and the place is saved, so the frost dates, the sowing calendar and the rain on watering tasks all read from it.',
    },
    {
      key: 'set',
      title: 'Set your zone by hand',
      steps: [
        { say: 'Under Your Growing Zone, tap the Zone picker and pick your zone.', mark: 'garden.zone' },
      ],
      forYou: 'Useful when you already know your zone, or when the lookup cannot find your place.',
    },
    {
      key: 'frost',
      title: 'Read your frost dates',
      steps: [
        { say: 'Find your zone from your postal code first.', mark: 'garden.findZone', stay: true },
        { say: 'Read the Frost Dates card under it. If it could not read them, tap Try Again.' },
      ],
      forYou: 'The usual last frost of spring and first frost of autumn for your place, worked out from its weather history.',
    },
  ],
  '/garden#sowingCalendar': [
    {
      key: 'now',
      title: 'See what to sow now',
      steps: [
        { say: 'Save a place in My Zone, so the calendar knows your frost dates.' },
        { say: 'Open What to Sow Now.', mark: 'sowing.now' },
        { say: 'Tap a crop to read its timing.' },
      ],
      forYou: 'Only what opens in the next four weeks, grouped by start indoors, sow outside and plant out.',
    },
    {
      key: 'crop',
      title: 'Look up the timing for one crop',
      steps: [
        { say: 'Open Every Crop.', mark: 'sowing.every' },
        { say: 'Tap the crop.' },
      ],
      forYou: 'When to start it, when to plant it out and about how long until the first harvest.',
    },
    {
      key: 'how',
      title: 'Read how the sowing windows are worked out',
      steps: [
        { say: 'Tap How the windows are worked out.', mark: 'sowing.how' },
      ],
      forYou: 'You can see what each date rests on before you trust it with your seeds.',
    },
    {
      key: 'moon',
      title: 'See the moon and the turning of the year',
      steps: [
        { say: 'Open Moon and Sky.', mark: 'sowing.sky' },
      ],
      forYou: 'The moon today, its next phases, the equinoxes and solstices for your half of the world, and the solar term.',
    },
    {
      key: 'tradition',
      title: 'Read about planting by tradition',
      steps: [
        { say: 'Open Planting by Tradition.', mark: 'sowing.tradition' },
        { say: 'Tap a tradition to read it.' },
      ],
      forYou: 'Each tradition says how strong the evidence behind it is, so you can choose what to follow.',
    },
  ],
  '/garden#seeds': [
    {
      key: 'add',
      title: 'Add a seed packet',
      steps: [
        { say: 'Tap Add a Packet.', mark: 'seeds.add' },
        { say: 'Pick the crop the packet is for.' },
        { say: 'Fill in what the packet says: the variety, where it came from, the year it was packed for and how much is in it.' },
        { say: 'Tap Save Packet.', mark: 'seeds.save' },
      ],
      forYou: 'The packet is kept with how long seed of that crop usually stays good, so you know what to use first.',
    },
    {
      key: 'test',
      title: 'Test whether old seed still sprouts',
      steps: [
        { say: 'Open the packet.', mark: 'seeds.packet' },
        { say: 'Tap Record a Germination Test.', mark: 'seeds.test' },
        { say: 'Write how many seeds you set and how many sprouted.' },
        { say: 'Tap Save Test.', mark: 'seeds.saveTest' },
      ],
      forYou: 'You know how thickly to sow from an older packet before a bed is planted with it.',
    },
    {
      key: 'change',
      title: 'Change what a packet says',
      steps: [
        { say: 'Open the packet.', mark: 'seeds.packet' },
        { say: 'Tap Change, make the change and tap Save Packet.', mark: 'seeds.change' },
      ],
      forYou: 'The packet reads right without starting it over.',
    },
    {
      key: 'putAway',
      title: 'Put away a finished packet',
      steps: [
        { say: 'Open the packet.', mark: 'seeds.packet' },
        { say: 'Tap Put Away.', mark: 'seeds.putAway' },
      ],
      forYou: 'It leaves the list on hand and waits under Put Away with its record. Tap Bring Back there to return it.',
    },
    {
      key: 'use',
      title: 'Take what you sowed off a packet',
      steps: [
        { say: 'On Plots & Plantings, add a planting of the same crop.' },
        { say: 'Under From the Seed Packet, pick the packet and how much you sowed.' },
      ],
      forYou: 'The packet shows what is left, without counting seeds twice.',
    },
  ],
  '/garden#plotsAndPlantings': [
    {
      key: 'area',
      title: 'Add a garden area',
      steps: [
        { say: 'Tap + Add a Garden Area.', mark: 'garden.addArea' },
        { say: 'Give it a name, such as Backyard raised bed.' },
        { say: 'Pick what type of space it is. Answer the questions about sun or lights and size that you know.' },
        { say: 'Tap Save Garden Area.', mark: 'garden.saveArea' },
      ],
      forYou: 'Only the name is needed to start. The rest can be filled in whenever you like.',
    },
    {
      key: 'planting',
      title: 'Add what you are growing',
      steps: [
        { say: 'Open the area.', mark: 'garden.area' },
        { say: 'Tap + Add a Planting.', mark: 'garden.addPlanting' },
        { say: 'Pick the food you are growing.' },
        { say: 'Say how it went in, and pick the seed packet if it came from one.' },
        { say: 'Tap Save Planting.', mark: 'garden.savePlanting' },
      ],
      forYou: 'The planting is followed from going in to harvest, with what grew there before it noted so you can rotate.',
    },
    {
      key: 'sown',
      title: 'Mark a planned planting as sown',
      steps: [
        { say: 'Open the area.', mark: 'garden.area' },
        { say: 'Tap Sown Today beside the planting.', mark: 'garden.sown' },
      ],
      forYou: 'It is marked growing from today, and its expected harvest dates move to match.',
    },
    {
      key: 'status',
      title: 'Change how a planting is doing',
      steps: [
        { say: 'Open the area.', mark: 'garden.area' },
        { say: 'Beside the planting, pick Growing, Harvested, Failed or Pulled out.' },
      ],
      forYou: 'Once every grow in an area has finished, the area can move to Past Areas.',
    },
    {
      key: 'past',
      title: 'Move an area you no longer grow in to Past Areas',
      steps: [
        { say: 'Open the area.', mark: 'garden.area' },
        { say: 'Tap Move to Past Areas.', mark: 'garden.pastAreas' },
      ],
      forYou: 'Everything recorded there stays readable under Past Areas. Tap Bring it back there to return it.',
    },
    {
      key: 'spreadsheet',
      title: 'Save your garden as a spreadsheet',
      steps: [
        { say: 'Open Save as a Spreadsheet.', mark: 'garden.spreadsheet' },
        { say: 'Tap the file you want: plantings, harvests or what was done.' },
      ],
      forYou: 'A CSV file holding everything recorded, for Excel, Google Sheets, Numbers or any program that reads CSV.',
    },
  ],
  '/garden#upcomingTasks': [
    {
      key: 'add',
      title: 'Add a garden task',
      steps: [
        { say: 'Type the task, such as Water the tomatoes.' },
        { say: 'Tap Add.', mark: 'garden.addTask' },
      ],
      forYou: 'It is put on the schedule for tomorrow morning.',
    },
    {
      key: 'rain',
      title: 'See rain on a watering day',
      steps: [
        { say: 'Save a place in My Zone.' },
        { say: 'Add a watering task here.', mark: 'garden.addTask', stay: true },
        { say: 'Read the line under it for the chance of rain that day.' },
      ],
      forYou: 'You can decide whether to water. The forecast is a chance, and nothing moves or skips a task by itself.',
    },
  ],
  '/garden#daysUntil': [
    {
      key: 'add',
      title: 'Count down to something in the garden',
      steps: [
        { say: 'Tap Add a Days Until Counter.', mark: 'daysUntil.add', stay: true },
        { say: 'Under Area, pick the garden area. Under For, pick one planting or leave it at the whole area.' },
        { say: 'Write what it is counting to, such as first harvest, and how many days it takes.' },
        { say: 'Tap Start Counting.', mark: 'daysUntil.save' },
      ],
      forYou: 'It says Today on the day, the phone reminds you that morning, and it keeps counting past it until you mark it done.',
    },
    {
      key: 'done',
      title: 'Mark a counter done',
      steps: [
        { say: 'Tap Done beside it.', mark: 'daysUntil.done' },
      ],
      forYou: 'It stays in the list as the record of how long the thing took.',
    },
    {
      key: 'remove',
      title: 'Remove a counter',
      steps: [
        { say: 'Tap Remove beside it. It goes straight away, with no question first.', mark: 'daysUntil.remove' },
      ],
      forYou: 'The reminder for its day goes with it.',
    },
  ],
  '/garden#compost': [
    {
      key: 'start',
      title: 'Start a compost pile',
      steps: [
        { say: 'Tap + Start a Pile.', mark: 'compost.start' },
        { say: 'Give it a name, pick its kind and say where it is.' },
        { say: 'Tap Start It.', mark: 'compost.startIt' },
      ],
      forYou: 'A pile, bin, tumbler, worm bin or trench, each kept on a record of its own.',
    },
    {
      key: 'record',
      title: 'Record what you did to a pile',
      steps: [
        { say: 'Open the pile and tap what you did: Add Material, Turned It, Watered It, Temperature, Moisture, Took Some Out, Put It on a Plot or Note.', mark: 'compost.action' },
        { say: 'Fill in the date and what it asks for.' },
        { say: 'Tap Save.', mark: 'compost.save' },
      ],
      forYou: 'The pile shows its greens and browns, when it was last turned and watered, and what it needs from what you have recorded.',
    },
    {
      key: 'turn',
      title: 'Get a reminder to turn the pile',
      steps: [
        { say: 'Open the pile. Under Turn it every, pick how many days.', mark: 'compost.turnEvery' },
      ],
      forYou: 'The phone reminds you at 9:00 on the day it is due, and again every few days until you record a turn.',
    },
    {
      key: 'status',
      title: 'Mark a pile as curing or finished',
      steps: [
        { say: 'Open the pile. Under Status, pick where it is now.', mark: 'compost.status' },
      ],
      forYou: 'A finished pile stops asking to be turned and keeps its record.',
    },
    {
      key: 'read',
      title: 'Read about composting',
      steps: [
        { say: 'Tap Read about composting.', mark: 'compost.read' },
      ],
      forYou: 'How to build a pile and keep it working, from the reading on Horticulture.',
    },
    {
      key: 'delete',
      title: 'Delete a pile',
      steps: [
        { say: 'Open the pile and tap Delete this pile and its record.', mark: 'compost.deletePile' },
      ],
      forYou: 'Use it for a pile started by mistake. Everything recorded for it goes too.',
    },
  ],
  '/garden#growingConditions': [
    {
      key: 'record',
      title: 'Record a reading',
      steps: [
        { say: 'Tap + Record a Reading.', mark: 'conditions.record' },
        { say: 'Pick the area, and the planting if the reading is for one plant, then tap Next.', mark: 'conditions.next' },
        { say: 'Pick what you measured, then type the figure and pick its unit.' },
        { say: 'Tap Save It.', mark: 'conditions.save' },
      ],
      forYou: 'A figure read off a meter in your hand counts the same as one from a sensor.',
    },
    {
      key: 'light',
      title: 'Measure the light with this phone',
      steps: [
        { say: 'Tap Measure the Light Here.', mark: 'conditions.measureLight' },
        { say: 'Pick the area, then hold the phone where the leaves are and tap Measure With This Phone.', mark: 'conditions.measure' },
        { say: 'Tap Save It.', mark: 'conditions.save' },
      ],
      forYou: 'A rough reading of how much light the plants get, with the limits of a phone sensor said under it.',
    },
    {
      key: 'import',
      title: 'Import readings from a file',
      steps: [
        { say: 'Tap Import Readings from a File.', mark: 'conditions.import' },
        { say: 'Tap Pick a File and choose the file your meter or controller saved.' },
        { say: 'Say which column holds what, and which area the readings belong to.' },
        { say: 'Tap Import These Readings.' },
      ],
      forYou: 'A season of readings goes in at once, without typing them.',
    },
    {
      key: 'sensors',
      title: 'Read a sensor gateway on your network',
      steps: [
        { say: 'Open Sensors on Your Network.', mark: 'conditions.sensors' },
        { say: 'Tap + Add a Gateway, give it a name and its address, and pick the area.' },
        { say: 'Tap Save and Read It.' },
      ],
      forYou: 'Readings come in from the sensors without being typed, kept beside the ones you take by hand.',
    },
    {
      key: 'trends',
      title: 'See a measurement over months',
      steps: [
        { say: 'Tap Open Growing Conditions on Trends.', mark: 'conditions.trends' },
      ],
      forYou: 'One measurement month by month, and which areas have readings and which have none.',
    },
  ],
  '/garden#harvestLog': [
    {
      key: 'log',
      title: 'Log a harvest',
      steps: [
        { say: 'Tap + Add a Harvest.', mark: 'garden.addHarvest' },
        { say: 'Pick the planting it came from.' },
        { say: 'Pick the amount and the unit.' },
        { say: 'Tap Save Harvest.', mark: 'garden.saveHarvest' },
        { say: 'If it asks to keep it on hand, tap Yes, Keep It On Hand or Not This One.', mark: 'garden.keepOnHand' },
      ],
      forYou: 'What the garden gave is recorded against its planting, and food kept on hand can go into meals from My Whole Foods.',
    },
    {
      key: 'onHand',
      title: 'Change whether a harvest is on hand',
      steps: [
        { say: 'Open Recent Harvests. Beside the harvest, tap Keep on hand or Not on hand.', mark: 'garden.onHand' },
      ],
      forYou: 'Food you have eaten or given away stops being offered for meals.',
    },
    {
      key: 'yield',
      title: 'See what the garden has given over time',
      steps: [
        { say: 'Tap Open Garden Yield on Trends.', mark: 'garden.yield' },
      ],
      forYou: 'Harvests by crop and by month, in the units you weighed or counted them in.',
    },
  ],
  '/garden#growingCosts': [
    {
      key: 'add',
      title: 'Record money spent on growing',
      steps: [
        { say: 'Tap + Add a Cost.', mark: 'costs.add' },
        { say: 'Say what it was, pick its kind and type the cost.' },
        { say: 'Pick the area it was for, if it was for one.' },
        { say: 'Tap Save Cost.', mark: 'costs.save' },
      ],
      forYou: 'It goes into your budget under Garden & growing supplies and is set against what that area gives back.',
    },
    {
      key: 'byArea',
      title: 'See what each area cost',
      steps: [
        { say: 'Open By Area.', mark: 'costs.byArea' },
      ],
      forYou: 'Each area or group as one figure, beside the harvests kept from it.',
    },
    {
      key: 'combine',
      title: 'Combine areas into one group',
      steps: [
        { say: 'Open Cost Groups and tap + Combine Areas.', mark: 'costs.combine' },
        { say: 'Name the group and tick the areas in it.' },
        { say: 'Tap Save Group.', mark: 'costs.saveGroup' },
      ],
      forYou: 'Areas grown the same way stand as one figure, and an area is in one group at most so nothing counts twice.',
    },
    {
      key: 'bill',
      title: 'Add an electricity bill',
      steps: [
        { say: 'Open Electricity.', mark: 'costs.electricity' },
        { say: 'Tap + Add a Bill.', mark: 'costs.bill' },
        { say: 'Type the dates it covers and the amount. Tick This bill is from before the grow if it is.' },
        { say: 'Tap Save Bill.', mark: 'costs.saveBill' },
      ],
      forYou: 'Every bill after the one from before the grow is compared with it per day, so bills of different lengths compare fairly.',
    },
    {
      key: 'baseline',
      title: 'Mark a bill as the one from before the grow',
      steps: [
        { say: 'Open Electricity.', mark: 'costs.electricity' },
        { say: 'Tap Before the grow beside the bill.', mark: 'costs.baseline' },
      ],
      forYou: 'That bill is what every later bill is compared with.',
    },
    {
      key: 'electric',
      title: 'Record the extra electricity as a growing cost',
      steps: [
        { say: 'Open Electricity.', mark: 'costs.electricity' },
        { say: 'Tap Record it as a growing cost.', mark: 'costs.recordElectric' },
        { say: 'Check the amount and date, pick the area and tap Record.' },
      ],
      forYou: 'One month of what the bills run above the one from before the grow, counted against the area that uses it.',
    },
  ],
  '/garden#horticulture': [
    {
      key: 'wrong',
      title: 'Find out what is wrong with a plant',
      steps: [
        { say: 'Open What Is Wrong With a Plant.', mark: 'crops.wrong' },
        { say: 'Pick the crop, then pick what you see on it.' },
        { say: 'Tap a cause to read it and how to put it right from the soil.' },
      ],
      forYou: 'The likely causes for what you see, each with a way to fix it that starts with the soil.',
    },
    {
      key: 'grow',
      title: 'Read how to grow a crop',
      steps: [
        { say: 'Open How to Grow Each Crop.', mark: 'crops.grow' },
        { say: 'Type the crop in Find a crop, or swipe along the row of cards for its group.', mark: 'crops.card', stay: true },
        { say: 'Tap Read on the crop. The guide opens under the row, and Close puts it away.' },
      ],
      forYou: 'Sun, soil, pH, sowing, spacing, water and three problems the crop is known for, with sources to read further.',
    },
    ...readingHowTos('Horticulture', 'Each entry says how strong the evidence behind it is, and lists its sources.'),
  ],
  '/insights#i-today': bandsHowTos(
    'your day',
    'meals and doses, routines and checks, upkeep due, appointments this week, Days Until landing soon, or what is still open from yesterday',
    'Today in one place, read from Schedules, Life and Garden. Nothing here writes, so change a record where it lives.',
    'The line names the one record this lens needs first, and the link opens the step in Your Guide that adds it.',
  ),
  '/insights#i-signals': bandsHowTos(
    'Signals today',
    'the day by the clock, check-ins today, blood pressure today, or glucose around meals today',
    'What you logged in Signals today, laid out by the clock so a reading sits beside the meal or dose near it.',
    'The line names what to log in Signals first, and the link opens the step in Your Guide that shows how.',
  ),
  '/insights#nutrients': [
    {
      key: 'read',
      title: 'Read what today supplied, nutrient by nutrient',
      steps: [
        { say: 'Read the table. Each row gives the amount so far, your target and where it stands.' },
        { say: 'Tap a nutrient to see which foods supplied it.', mark: 'nutrients.row' },
      ],
      forYou: 'Food and supplements are shown apart, so you can see which of them reached a target.',
    },
    {
      key: 'drill',
      title: 'Narrow the table to one meal, one side or one item',
      steps: [
        { say: 'Tap the funnel button near the bottom corner.', mark: 'insights.drill' },
        { say: 'Tap a meal, then a side or an item inside it. Tap Whole Day in the trail to go back.' },
      ],
      forYou: 'The table then counts only what you picked. The same funnel works on Condition Scores and Cooking & Prep.',
    },
    {
      key: 'compare',
      title: 'Compare a nutrient with something else over time',
      steps: [
        { say: 'Tap a nutrient to open it.', mark: 'nutrients.row', stay: true },
        { say: 'Tap Compare with something else on Trends.', mark: 'nutrients.compare' },
      ],
      forYou: 'Trends opens Compare Two with this nutrient already picked, ready for a lab, a symptom or another nutrient beside it.',
    },
    {
      key: 'about',
      title: 'Read what this lens is for',
      steps: [
        { say: 'Tap the band at the top with the lens name to open its explanation.', mark: 'insights.about' },
      ],
      forYou: 'Every Insights lens has this band, so the same tap explains any of them.',
    },
  ],
  '/insights#sixDs': [
    {
      key: 'read',
      title: 'See how today scored for a condition',
      steps: [
        { say: 'Find the condition you want. Each one you track in Profile has a card of its own.' },
        { say: 'Tap a dimension to open it.', mark: 'sixDs.dimension' },
        { say: 'Tap a line inside it to see which foods landed there.', mark: 'sixDs.tier' },
      ],
      forYou: 'Each food you logged is scored against what matters for that condition, and the foods behind every score are listed.',
    },
    {
      key: 'drill',
      title: 'Score one meal on its own',
      steps: [
        { say: 'Tap the funnel button near the bottom corner.', mark: 'insights.drill' },
        { say: 'Tap the meal you want.' },
      ],
      forYou: 'Useful for seeing which meal of the day pulled a score down.',
    },
  ],
  '/insights#prep': [
    {
      key: 'read',
      title: 'See which foods today need care in how they are prepared',
      steps: [
        { say: 'Read Needs attention today. Each line names the food and how to prepare it.' },
        { say: 'Tap the funnel button to look at one meal only.', mark: 'insights.drill' },
      ],
      forYou: 'Soaking, sprouting, cooking and pairing tips, worked out from what you actually logged today.',
    },
  ],
  '/insights#hydration': [
    {
      key: 'read',
      title: 'See how much water today has supplied',
      steps: [
        { say: 'Tap the band at the top to read how water is counted.', mark: 'insights.about' },
        { say: 'Read the total and where it came from, food and drink both.' },
      ],
      forYou: 'Water in soups, fruit and cooking counts as well as what you drank. Log drinks in Schedules > Hydration.',
    },
  ],
  '/insights#advisories': [
    {
      key: 'read',
      title: 'Read the advisories today raised',
      steps: [
        { say: 'Tap the band at the top to read what can raise one.', mark: 'insights.about' },
        { say: 'Read each card. Under Today it names the food and the meal that raised it.' },
      ],
      forYou: 'Alcohol, coffee and plain fruit juice each carry a note about what they do. When nothing raised one, the lens says so.',
    },
  ],
  '/insights#foodLookup': [
    {
      key: 'pick',
      title: 'Look up a food by picking it',
      steps: [
        { say: 'Under Select a Food Category, tap a category.' },
        { say: 'Tap a type, then the food, then how it is prepared.' },
        { say: 'Tap Change beside any choice to go back and pick again.' },
      ],
      forYou: 'Its nutrients per 100g, for a portion you choose, and against your daily targets.',
    },
    {
      key: 'say',
      title: 'Look up a food by saying its name',
      steps: [
        { say: 'Under Say a Food Name, tap the microphone and say the food.', mark: 'lookup.voice' },
        { say: 'Tap the match you meant. Tap Search again to try another name.' },
      ],
      forYou: 'Quicker than going category by category when you know what you are after.',
    },
    {
      key: 'portion',
      title: 'See the nutrients for the amount you would eat',
      steps: [
        { say: 'Pick a food first.' },
        { say: 'In the Portion column, type the amount. Tap the unit below it to go back to the suggested serving.', mark: 'lookup.portion' },
      ],
      forYou: 'Every row and the share of your daily target change to that amount.',
    },
    {
      key: 'why',
      title: 'Find out why a food suits you or not',
      steps: [
        { say: 'Pick a food first.' },
        { say: 'In the card for you, tap Why.', mark: 'lookup.why' },
        { say: 'If more than one person is listed, pick the person from For.' },
      ],
      forYou: 'The reasons come from the conditions, allergies and diet in Profile, and from each household member who has them set.',
    },
  ],
  '/insights#labelCheck': [
    {
      key: 'check',
      title: 'Check an ingredient list from a label',
      steps: [
        { say: 'In Ingredients off the label, paste or type the list, or tap the microphone and read it out.', mark: 'label.box' },
        { say: 'Read the ingredients that come up below. Tap a reason to read more about it.', mark: 'label.reason' },
      ],
      forYou: 'Each ingredient is checked against the allergies, diet and conditions in Profile, plus lists that apply to anybody.',
    },
    {
      key: 'sources',
      title: 'See where the lists come from',
      steps: [
        { say: 'Check a label first.', mark: 'label.box', stay: true },
        { say: 'Tap Where these lists come from.', mark: 'label.sources' },
      ],
      forYou: 'Every list behind a flag is named, so you can judge it for yourself.',
    },
  ],
  '/insights#nutrientRanking': [
    {
      key: 'byNutrient',
      title: 'Find the foods richest in one nutrient',
      steps: [
        { say: 'Tap By Nutrient.', mark: 'ranking.mode' },
        { say: 'Tap the Nutrient picker and pick one.', mark: 'ranking.nutrient' },
        { say: 'Tap the prep picker to narrow it to raw, cooked or another state.', mark: 'ranking.prep' },
      ],
      forYou: 'Foods ranked by how much of it they hold per 100g, with animal and plant protein listed apart.',
    },
    {
      key: 'byFood',
      title: 'See what one food is richest in',
      steps: [
        { say: 'Tap By Food.', mark: 'ranking.mode' },
        { say: 'Pick the food the way Food Lookup does.' },
        { say: 'Tap Change food to pick another.', mark: 'ranking.change' },
      ],
      forYou: 'Its nutrients ranked from the most to the least, for its suggested serving.',
    },
  ],
  '/insights#cookingImpact': [
    {
      key: 'pick',
      title: 'See how cooking changes a nutrient',
      steps: [
        { say: 'Tap the Nutrient / Compound picker and pick one.', mark: 'cooking.pick' },
        { say: 'Read how much each cooking method leaves behind, and the label under it.' },
      ],
      forYou: 'Directly measured, Reasoned estimate or Baseline says how sure each figure is.',
    },
  ],
  '/insights#safeFoods': [
    {
      key: 'pick',
      title: 'Find foods with nothing flagged for you',
      steps: [
        { say: 'Tap the Category picker and pick one.', mark: 'safe.pick' },
        { say: 'Read the foods that qualify.' },
      ],
      forYou: 'Only foods with no concern across every condition you track, your diet and your allergies, all set in Profile.',
    },
  ],
  '/insights#healingStage': [
    {
      key: 'stage',
      title: 'See which foods suit each healing stage',
      steps: [
        { say: 'Tap Stage 1: Getting Started or Stage 2: Rebuilding.', mark: 'stage.pick' },
        { say: 'In Stage 2, tap a round to open it.' },
      ],
      forYou: 'Foods that suit the stage come first. Nothing is hidden, and a food that needs care says why.',
    },
  ],
  '/insights#labs': [
    {
      key: 'log',
      title: 'Log a lab result',
      steps: [
        { say: 'Tap + Log a Result.', mark: 'labs.add' },
        { say: 'Tap the Test picker and pick the test.', mark: 'labs.test' },
        { say: 'Type the value, set the date it was drawn, and add the lab if you like.' },
        { say: 'Tap Save Result.', mark: 'labs.save' },
      ],
      forYou: 'It joins your recent results and the lab charts on Trends > Labs.',
    },
    {
      key: 'read',
      title: 'Read your recent results',
      steps: [
        { say: 'Read Recent results. Each line gives the value, the date and how long ago it was.' },
      ],
      forYou: 'For results over time, open Labs on Trends.',
    },
  ],
  '/insights#myMeds': [
    {
      key: 'check',
      title: 'Read what to watch between your meds and today’s food',
      steps: [
        { say: 'Read Things to check. Tap Why? under one to read how it works.' },
        { say: 'Read Worth knowing for reference that does not apply to today.' },
      ],
      forYou: 'Timing between your medicines, supplements and what you logged today. The prescription itself stays your prescriber’s.',
    },
    {
      key: 'add',
      title: 'Add a rule of your own',
      steps: [
        { say: 'Tap + Add a Rule of Your Own.', mark: 'meds.addRule' },
        { say: 'Write what you noticed, or what you were told.', mark: 'meds.ruleText' },
        { say: 'Pick where it came from.', mark: 'meds.source' },
        { say: 'Tie it to a food or a medication if you like.', mark: 'meds.tie' },
        { say: 'Tap Save Rule.', mark: 'meds.saveRule' },
      ],
      forYou: 'Tied to a food, it shows whenever something you logged today contains that word. Your rules are labelled as yours.',
    },
    {
      key: 'manage',
      title: 'Pause or delete a rule',
      steps: [
        { say: 'Under Manage Your Rules, tap Pause to stop a rule showing, or Resume to bring it back.', mark: 'meds.pause' },
        { say: 'Tap Delete to remove it for good.', mark: 'meds.delete' },
      ],
      forYou: 'Pause keeps the rule for later. Delete asks first.',
    },
  ],
  '/insights#portions': [
    {
      key: 'meals',
      title: 'Split your daily targets across your meals',
      steps: [
        { say: 'Under Meals per day, tap how many meals you eat.', mark: 'portions.meals' },
        { say: 'Read the Daily macro targets table, per day and per meal.' },
      ],
      forYou: 'Worked out from your resting and maintenance energy, which come from Profile.',
    },
  ],
  '/insights#i-appointment': bandsHowTos(
    'what to bring to your next appointment',
    'the appointment, new lab results, flares, medicine and supplement changes, questions noted, or other appointments coming up',
    'Everything since your last visit, gathered for the next one. Questions come from what you noted beside the appointment.',
    'The line names what to add first, usually an appointment in Schedules, and the link opens the step in Your Guide.',
  ),
  '/insights#i-money': bandsHowTos(
    'money this month',
    'this month so far, against your budgets, medical bills and insurance, or food, supplements and prescriptions',
    'Only money recorded against a day is counted, read from Life > Finances.',
    'The line names what to record in Finances first, and the link opens the step in Your Guide.',
  ),
  '/insights#i-kitchen': bandsHowTos(
    'what the kitchen holds',
    'on hand, running low or getting old, or what the kitchen covers',
    'Read from Life > Kitchen, so a meal can be planned from what is already there.',
    'The line names what to record in Kitchen first, and the link opens the step in Your Guide.',
  ),
  '/insights#i-garden': bandsHowTos(
    'what the garden is giving',
    'ready or coming ready, harvests on hand, or what the garden supplied this week',
    'Read from Garden, so what is ready can go into this week’s meals.',
    'The line names what to record in Garden first, and the link opens the step in Your Guide.',
  ),
  '/trends#nutrients': trendsHowTos({
    title: 'Read a nutrient over time',
    bands: null,
    forYou: 'Food and supplements are drawn apart, so the chart shows which of them carried a nutrient on each day.',
    shade: true,
    more: [
      {
        key: 'nutrient',
        title: 'Change which nutrient the chart follows',
        steps: [{ say: 'Tap a nutrient in the row of pills.', mark: 'trends.nutrient' }],
        forYou: 'The chart redraws for that nutrient over the same days.',
      },
      {
        key: 'custom',
        title: 'Pick your own day or your own dates',
        steps: [
          { say: 'Tap Custom at the end of the range pills.', mark: 'trends.custom' },
          { say: 'Choose One day or Date range, then pick the year, month and day.' },
        ],
        forYou: 'Useful for looking at the weeks around an appointment or a change you made.',
      },
    ],
  }),
  '/trends#sixDs': trendsHowTos({
    title: 'Read your condition scores over time',
    bands: null,
    forYou: 'Each condition you picked in Profile gets a chart of the scores of what you ate, day by day.',
    shade: true,
  }),
  '/trends#variety': trendsHowTos({
    title: 'Read what you eat over time',
    bands: 'how many different foods, how many different plants, what keeps coming back, foods that feed your gut, how it gets cooked, bought ready against made at home, how your safe list has grown, or how much came out of your garden',
    forYou: 'Read from the meals you logged. A week with nothing logged shows as not logged, never as a week of eating nothing.',
    shade: true,
  }),
  '/trends#symptoms': trendsHowTos({
    title: 'Read your symptoms over time',
    bands: 'a scale you track, bowel movements, or where on the body',
    forYou: 'Read from what you logged in Signals. A day with nothing logged is left blank rather than counted as a good day.',
    shade: true,
  }),
  '/trends#eatingWindow': trendsHowTos({
    title: 'Read when you eat over time',
    bands: null,
    forYou: 'Each day shows the time of your first and last meal, from the times you logged.',
    shade: true,
  }),
  '/trends#weight': trendsHowTos({
    title: 'Read your weight over time',
    bands: null,
    forYou: 'The shaded band is your usual range, the middle of the readings you have entered. It says what your readings have been, never what they should be.',
    shade: true,
  }),
  '/trends#movement': trendsHowTos({
    title: 'Read your steps and sleep over time',
    bands: 'steps per day, or hours slept',
    forYou: 'Read from what you entered or what a connected device sent. Each chart carries your usual range.',
    shade: true,
  }),
  '/trends#workouts': moreTrendsHowTos(
    'your workouts',
    'by week, what you did, how hard it felt, planned days, or each exercise first and latest',
    'Read from the workouts you logged in Life > Movement, beside the days you planned.',
    'The line names the record to add first, and the link opens the step in Your Guide that shows how.',
  ),
  '/trends#pacing': moreTrendsHowTos(
    'your pacing',
    'your typical day, day by day, bigger days and the days after, overload and crash tags, or therapy sessions',
    'Shows how busier days sit beside the days that follow them, from what you logged. It counts and lays out, and leaves the reading to you.',
    'The line names the record to add first, and the link opens the step in Your Guide that shows how.',
  ),
  '/trends#cycle': moreTrendsHowTos(
    'your cycle',
    'what is counted, flares by cycle day, tags by week of the cycle, or a scale by week of the cycle',
    'Lines up what you logged against the day of your cycle, from the period days you logged in Signals > Cycle.',
  ),
  '/trends#labs': trendsHowTos({
    title: 'Read a lab result over time',
    bands: null,
    forYou: 'Each result you entered on Insights > Labs is a point on the chart, with a dashed line at the middle of its usual reference range where one exists.',
    shade: true,
    more: [
      {
        key: 'test',
        title: 'Pick which test to follow',
        steps: [{ say: 'Tap Pick a test and choose one.', mark: 'trends.test' }],
        forYou: 'Only tests you have entered a result for are listed.',
      },
    ],
  }),
  '/trends#groceries': trendsHowTos({
    title: 'Read what a food has cost you over time',
    bands: null,
    forYou: 'Read from the prices you recorded when you bought it.',
    shade: true,
    more: [
      {
        key: 'food',
        title: 'Pick which food to follow',
        steps: [{ say: 'Tap Pick a food and choose one.', mark: 'trends.food' }],
        forYou: 'The chart redraws for that food over the same days.',
      },
    ],
  }),
  '/trends#keepingUp': trendsHowTos({
    title: 'Read how you keep up with things over time',
    bands: 'what you tick off, routines you walk, what you capture and what happens to it, upkeep on time against late, or how work has felt',
    forYou: 'A record of what you did, read from Life. Nothing here scores you, and a blank week says nothing was marked.',
  }),
  '/trends#harvest': trendsHowTos({
    title: 'Read what your garden gave over time',
    bands: 'what the garden gave, how long each crop took, compost made and compost used, what was done before the first picking, or given away, traded and received',
    forYou: 'Read from the harvests and work you recorded in Garden. Weights add up, and a crop you count stays a count.',
    months: true,
  }),
  '/trends#conditions': trendsHowTos({
    title: 'Read your growing conditions over time',
    bands: 'a measurement, hour by hour from a device, what you are measuring, or by area',
    forYou: 'Read from the readings in Garden > Growing Conditions, typed by you or sent by a sensor.',
    months: true,
    more: [
      {
        key: 'measure',
        title: 'Change which measurement the chart follows',
        steps: [{ say: 'Tap a measurement in the row of pills.', mark: 'trends.measure' }],
        forYou: 'Rain and water given are added up. Everything else is averaged, with its low and high.',
      },
    ],
  }),
  '/trends#cost': trendsHowTos({
    title: 'Read what it costs over time',
    bands: 'what your condition costs, what eating this way costs, what the garden costs to grow, supplements and what food is reaching, or what the garden put on your plate',
    forYou: 'Only money you recorded against a day is counted. A figure is never guessed at.',
    months: true,
  }),
  '/trends#therapyResponse': trendsHowTos({
    title: 'Read how your days go around a therapy',
    bands: 'one band for each therapy you track',
    forYou: 'Days with a session are set beside days without one, as a count. It cannot say the therapy caused anything, so read it with whoever runs your treatment.',
  }),
  '/trends#hydration': moreTrendsHowTos(
    'what you drink',
    'drinks by week, by kind, time of day, or water from everything',
    'Read from the drinks you logged in Schedules > Hydration, with the water inside your food counted too.',
    'The line names the record to add first, and the link opens the step in Your Guide that shows how.',
  ),
  '/trends#bloodPressure': moreTrendsHowTos(
    'your blood pressure',
    'latest reading, by week, or time of day',
    'Read from the readings you entered in Signals or a connected device sent.',
  ),
  '/trends#bodySignals': moreTrendsHowTos(
    'what your body measures',
    'resting heart rate, heart rate through the day, heart rate variability, blood oxygen, glucose, skin temperature, breathing rate, body temperature, where these come from, or glucose around meals',
    'Read from what a connected device or watch sent, and from readings you entered.',
  ),
  '/trends#doses': moreTrendsHowTos(
    'your doses',
    'by week, time of day, or by med or supplement',
    'Read from the doses marked taken or skipped in Schedules > Meds.',
    'The line names the record to add first, and the link opens the step in Your Guide that shows how.',
  ),
  '/trends#care': moreTrendsHowTos(
    'your care visits',
    'visits by kind, by provider, or coming up',
    'Read from the appointments in Schedules > Appointments.',
  ),
  '/trends#work': moreTrendsHowTos(
    'how work has gone',
    'a week, or work beside sleep and flares',
    'Read from your weekly check-ins in Life > Work.',
    'The line names the record to add first, and the link opens the step in Your Guide that shows how.',
  ),
  '/trends#reactions': moreTrendsHowTos(
    'your reactions',
    'new foods and experiments, reactions by week, or each reaction',
    'Read from the reactions you logged and the food experiments you ran in Signals.',
    'The line names the record to add first, and the link opens the step in Your Guide that shows how.',
  ),
  '/trends#nights': moreTrendsHowTos(
    'your nights',
    'times up by week, beside the evening before, or first time up',
    'Read from the times you logged getting up in the night.',
  ),
  '/trends#trackers': trendsHowTos({
    title: 'Read your trackers over time',
    bands: 'one band for each tracker you made',
    forYou: 'Read from the trackers you set up in Signals.',
    shade: true,
  }),
  '/trends#ferments': moreTrendsHowTos(
    'your ferments',
    'batches started, going now, or made and drunk',
    'Read from the batches in Food > Fermentation.',
  ),
  '/trends#planned': moreTrendsHowTos(
    'how your meal plan went',
    'as planned by week, how the plan went, or by meal',
    'Sets the meals you planned beside the meals you logged.',
    'The line names the record to add first, and the link opens the step in Your Guide that shows how.',
  ),
  '/trends#patterns': [
    {
      key: 'read',
      title: 'See what tends to come before a flare',
      steps: [
        { say: 'Tap what to look before: flares and reactions, low mood days, low energy days, or another choice.', mark: 'patterns.outcome' },
        { say: 'Tap how many hours before to look.', mark: 'patterns.window' },
        { say: 'Open a band: specific foods, condition scoring factors, food categories, other things around the same days, weather, or worst days beside best days.', mark: 'trends.band' },
      ],
      forYou: 'Every count names what it is counted against, and each food is set beside how often it turns up on any ordinary day. Tends to come before is the most it can say from one person.',
    },
    {
      key: 'test',
      title: 'Test a food by leaving it out and bringing it back',
      steps: [
        { say: 'Open Specific foods.', mark: 'trends.band', stay: true },
        { say: 'Tap Test this beside a food.', mark: 'patterns.test' },
      ],
      forYou: 'Signals sets up the experiment: days without the food, then the food back. The result compares before, without and back, and says what one run can and cannot show.',
    },
    {
      key: 'rule',
      title: 'Turn a pattern into a reminder',
      steps: [
        { say: 'Tap Make this a rule beside a food.', mark: 'patterns.rule' },
        { say: 'Write what it should remind you of.' },
        { say: 'Tap Save this rule.', mark: 'patterns.save' },
      ],
      forYou: 'The rule shows on Insights > My Meds with your other rules, marked as yours, and speaks up when the food is logged.',
    },
    {
      key: 'weather',
      title: 'Add the weather around your flares',
      steps: [
        { say: 'Open Weather around the same days.', mark: 'trends.band', stay: true },
        { say: 'Tap Add the weather.', mark: 'patterns.weather' },
      ],
      forYou: 'Tap Use this phone\'s rough location when it asks. Only a rough location is used, and Stop adding the weather turns it off again.',
    },
  ],
  '/trends#compare': [
    {
      key: 'pick',
      title: 'Put two things on one chart',
      steps: [
        { say: 'Pick the first thing, read off the left scale.', mark: 'compare.a' },
        { say: 'Pick the second thing, read off the right scale.', mark: 'compare.b' },
        { say: 'Tap how many days back to look.', mark: 'compare.range' },
      ],
      forYou: 'Anything you record can sit beside anything else: a nutrient and a lab, sleep and mood. The chart says whether anything is known to connect the two.',
    },
    {
      key: 'partner',
      title: 'Pick something known to go with the first',
      steps: [{ say: 'Tap one of the pills under Known to be read with this.', mark: 'compare.partner' }],
      forYou: 'Each one carries what to expect on the chart and where that comes from.',
    },
    {
      key: 'tags',
      title: 'Mark the days you tagged',
      steps: [{ say: 'Under Mark the days you tagged, tap a tag.', mark: 'compare.tags' }],
      forYou: 'Those days are shaded behind both lines.',
    },
    {
      key: 'meals',
      title: 'See two nutrients meet inside one meal',
      steps: [{ say: 'When the chart says they meet inside a meal, tap Open Today\'s Meals.', mark: 'compare.meals' }],
      forYou: 'Two nutrients that help or compete with each other are read meal by meal rather than off a chart.',
    },
  ],
  '/trends#squares': [
    {
      key: 'zoom',
      title: 'Move through your life in squares',
      steps: [
        { say: 'Tap a square to go into that stretch of time.', mark: 'squares.square' },
        { say: 'Tap Previous or Next to step along.', mark: 'squares.step' },
        { say: 'Tap a level in the trail at the top to go back out.', mark: 'squares.crumb' },
        { say: 'Tap Back to now to come home.', mark: 'squares.now' },
      ],
      forYou: 'Each square is coloured by the tabs your records came from, so a busy stretch or a quiet one shows at a glance.',
    },
    {
      key: 'open',
      title: 'Open a record from a day',
      steps: [
        { say: 'Go into a day.', mark: 'squares.square', stay: true },
        { say: 'Tap a record to open it on its tab.', mark: 'squares.record' },
      ],
      forYou: 'The record opens where it lives, so a change made there shows here too.',
    },
  ],
  '/reports#overview': reportHowTos({
    name: 'the Overview',
    holds: 'Everything logged over the range in one summary: nutrients, flagged foods, symptoms, what Pattern Finder noticed, meds and supplements, movement and sleep, body readings, your rules and recent labs.',
  }),
  '/reports#r-doctor': reportHowTos({
    name: 'the report for your doctor',
    holds: 'Built for an appointment: what changed since the last visit, symptoms, doses as scheduled and as marked, meds with the interaction notes that touch them, body readings and recent labs. Food detail is left to the Nutritionist report.',
    rangeNote: 'Once an appointment has happened, Since last visit appears among the range pills.',
  }),
  '/reports#r-nutrition': reportHowTos({
    name: 'the report for a nutritionist',
    holds: 'Nutrients against targets, flagged foods, a day-by-day diary of meals beside flares and reactions, hydration, planned meals against what was eaten, and the supplements you take.',
  }),
  '/reports#r-trainer': reportHowTos({
    name: 'the report for a trainer',
    holds: 'Steps and sleep, weight and blood pressure, heart readings, hydration, nights up and how work weeks went. Conditions, medicines and symptoms are left out on purpose.',
  }),
  '/reports#r-month': reportHowTos({
    name: 'a look back',
    holds: 'The range as a whole: meals planned and eaten, doses, appointments, work weeks, reactions, nights, ferments, and what eating and the conditions cost. A stretch with nothing recorded says so.',
  }),
  '/reports#r-care': reportHowTos({
    name: 'the report for a caregiver',
    holds: 'What someone helping day to day needs: what is on today, doses, appointments, your conditions and every active medicine and supplement. Medicine questions go to the prescriber.',
  }),
  '/reports#r-medical-costs': reportHowTos({
    name: 'the medical costs report',
    holds: 'Every medical bill in the range with what was billed, paid and owed, where your insurance plan stands, and what the conditions, supplements and prescriptions cost.',
  }),
  '/reports#r-garden': reportHowTos({
    name: 'the garden record',
    holds: 'Harvests by crop and by area, how long each grow took, compost, what was sold, traded or given, and what is on hand now.',
    more: [
      {
        key: 'gardenCsv',
        title: 'Save the whole garden record as spreadsheets',
        steps: [{ say: 'Under Save as a Spreadsheet, tap plantings, harvests or what was done.', mark: 'reports.gardenCsv' }],
        forYou: 'These files hold every garden record, whatever range is picked above.',
      },
    ],
  }),
  '/reports#r-variety': reportHowTos({
    name: 'the eating variety report',
    holds: 'Different foods and plants week by week, the meals and foods that came back most, food groups not logged at all, and where meals came from. A meal that comes back often is counted, not judged.',
  }),
};

// Lenses that draw What fills this in (components/LensFeedersRow.tsx). The
// list is written out because this file imports nothing at runtime;
// scripts/test_setup_cards.js checks it against lensKeysWithFeeders().
export const LENSES_WITH_FEEDERS: readonly string[] = [
  '/trends#patterns',
  '/trends#symptoms',
  '/trends#nutrients',
  '/trends#variety',
  '/trends#eatingWindow',
  '/trends#movement',
  '/trends#weight',
  '/trends#labs',
  '/trends#bloodPressure',
  '/trends#hydration',
  '/trends#doses',
  '/trends#care',
  '/trends#reactions',
  '/trends#planned',
  '/trends#ferments',
  '/trends#groceries',
  '/trends#keepingUp',
  '/trends#cost',
  '/trends#work',
  '/trends#harvest',
  '/trends#conditions',
  '/insights#nutrients',
  '/insights#foodLookup',
  '/insights#safeFoods',
  '/insights#healingStage',
  '/insights#myMeds',
  '/reports#r-doctor',
  '/reports#r-nutrition',
  '/reports#r-trainer',
  '/reports#r-care',
  '/reports#r-medical-costs',
  '/reports#r-garden',
  '/reports#r-variety',
];

for (const key of LENSES_WITH_FEEDERS) {
  (TOOL_HOW_TOS[key] ??= []).push({
    key: 'feedsThis',
    title: 'Set up what fills this lens',
    steps: [
      { say: 'Under What fills this in, swipe along the cards. Each one is a record that this lens reads.', mark: 'lens.feedsThis', stay: true },
      { say: 'Tap Set It Up. It opens the exact place to do it.', mark: 'lens.feedsThisGo' },
    ],
    forYou: 'Once the record exists the card leaves this row. Not for me takes a card off every lens and leaves it in Your Guide on Home.',
  });
}

/** Tabs whose every lens has its tools listed above. */
export const TOOL_TABS_DONE: readonly string[] = ['/life', '/', '/schedule', '/log', '/food', '/garden', '/insights', '/trends', '/reports'];

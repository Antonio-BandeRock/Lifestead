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
  | 'reading.subgroup'
  | 'reading.entry';

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
        { say: 'If the topic has smaller groups inside it, tap one to open it.', mark: 'reading.subgroup', stay: true },
        { say: 'Tap an entry to read it. Tap it again to close it.', mark: 'reading.entry' },
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
      title: 'Keep a to-do for work',
      steps: [
        { say: 'Tap To-Do.', mark: 'work.todos' },
        { say: 'Type the to-do as you would say it, with a day if it has one, like "send the report on Friday".' },
        { say: 'Tap Add to the List.', mark: 'todo.add' },
      ],
      forYou: 'It shows here and in Life under To-Do beside everything else you mean to do, and reminds you on its day.',
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
      key: 'yes',
      title: 'Mark that you just did it',
      steps: [
        { say: 'If your checks sit in bands, open the band it is listed under.' },
        { say: 'Tap Yes, just did it.', mark: 'didIDoIt.yes' },
      ],
      forYou: 'The line under its name now says when, so the next time you wonder, the answer is there.',
    },
    {
      key: 'mistake',
      title: 'Take back a mark made by mistake',
      steps: [
        { say: 'If your checks sit in bands, open the band it is listed under.' },
        { say: 'Tap That was a mistake.', mark: 'didIDoIt.mistake' },
      ],
      forYou: 'Only the last mark goes. Everything before it stays as it was.',
    },
    {
      key: 'remind',
      title: 'Have the phone ask you',
      steps: [
        { say: 'If your checks sit in bands, open the band it is listed under.' },
        { say: 'Tap Change.', mark: 'didIDoIt.change', stay: true },
        { say: 'Under How often it comes round, pick daily, weekly or monthly.' },
        { say: 'Under A reminder to do it, pick an hour and minutes, then tap the days you want it under On these days.' },
        { say: 'Tap Save.', mark: 'didIDoIt.save' },
      ],
      forYou: 'Tapping Done on the reminder marks it here, and once it is marked it stays quiet until the next day, week or month.',
    },
    {
      key: 'order',
      title: 'Put your checks in a different order',
      steps: [
        { say: 'If your checks sit in bands, open the band it is listed under.' },
        { say: 'Tap Move down to put it later in the list, or Move up to put it sooner.', mark: 'didIDoIt.moveDown', stay: true },
      ],
      forYou: 'The ones you wonder about most can sit at the top.',
    },
    {
      key: 'remove',
      title: 'Remove a check',
      steps: [
        { say: 'If your checks sit in bands, open the band it is listed under.' },
        { say: 'Tap Remove.', mark: 'didIDoIt.remove' },
        { say: 'Tap Remove it to say yes. Everything recorded against it goes too.' },
      ],
      forYou: 'Your list holds only what you still want to ask about.',
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
        { say: 'Tap an entry to read it. A link at the end of an entry takes you to the entry it names.' },
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
  '/life#todos': [
    {
      key: 'done',
      title: 'Mark a to-do done',
      steps: [
        { say: 'Tap the box beside it.', mark: 'todo.done' },
      ],
      forYou: 'It moves to Done. One that repeats comes back on its next day by itself.',
    },
    {
      key: 'change',
      title: 'Change a to-do or its day',
      steps: [
        { say: 'Tap Change under it.', mark: 'todo.change', stay: true },
        { say: 'Change the words or the day, then tap Save.' },
      ],
      forYou: 'The reminder moves with the day you give it.',
    },
    {
      key: 'letGo',
      title: 'Let a to-do go without doing it',
      steps: [
        { say: 'Tap Let it go under it. On one that repeats, it says Let this one go.', mark: 'todo.letGo' },
      ],
      forYou: 'It leaves the list without being called done. One that repeats lets only this time go and comes back on its next day.',
    },
    {
      key: 'noDay',
      title: 'Keep a to-do with no day',
      steps: [
        { say: 'Type the to-do in the box at the top.' },
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
      forYou: 'Nothing done is lost, and a to-do marked done by mistake goes back on the list.',
    },
    {
      key: 'remove',
      title: 'Remove a to-do',
      steps: [
        { say: 'Tap Remove under it.', mark: 'todo.remove' },
        { say: 'Tap Remove again to say yes. The record of each time it was done goes too, so mark it done or let it go if you want to keep that.' },
      ],
      forYou: 'The list holds only what you still mean to do.',
    },
  ],
};

/** Tabs whose every lens has its tools listed above. */
export const TOOL_TABS_DONE: readonly string[] = ['/life'];

// Getting Set Up, laid out as cards (1.0.74.13). Direct request: "Each
// individual thing to be setup for Life sits in their own cards that move
// horizontally on the screen, but the cards themselves have direct,
// explanatory information about what it is, what you do with it, and how
// they will use the information obtained from that thing", then "Make it
// enticing, interesting, something they want to do."
//
// Every tab where records go in (Life, Food, Garden, Schedules, Signals)
// has a row of cards per part of that tab, and only for the parts of life
// the person chose. Each card says what the thing is, what you do, and
// where what you put in comes back out: GIVE_BACK_AREAS are the places on
// Insights, Trends and Reports that read it, which is why those three tabs
// have no rows of their own. Each row puts its most useful card first, and
// a card that is done moves to the end of its row and says since when.
//
// Pure: no React and no database. lib/yourStory.ts and lib/yourStoryDb.ts
// supply what is done; scripts/test_setup_cards.js checks that every card
// gives back somewhere and every give-back area has a card feeding it.

import type { BeatKey, StoryDestination, YourStoryItemKey, YourStoryView } from './yourStory';
import type { GuideRecordKey, GuideRecords } from './yourStoryGuides';

type Route = Extract<StoryDestination, { kind: 'route' }>;
type Go = Exclude<StoryDestination, { kind: 'beats' }>;

const route = (pathname: string, params?: Record<string, string>): Route => ({ kind: 'route', pathname, params });
const lifeLens = (lens: string) => route('/life', { openLifeLens: lens });
const scheduleLens = (lens: string) => route('/schedule', { openScheduleLens: lens });
const trendsLens = (lens: string) => route('/trends', { openTrendsLens: lens });
const gardenLens = (lens: string) => route('/garden', { openGardenLens: lens });
const insightsLens = (lens: string) => route('/insights', { openInsightsLens: lens });
const foodLens = (lens: string) => route('/food', { openFoodLens: lens });
const signalsLens = (lens: string) => route('/log', { openSignalsLens: lens });
const report = (kind: string) => route('/reports', { openReportsLens: kind });
const profile = route('/profile');

// WHERE IT COMES BACK. Each is one place on Insights, Trends or Reports
// that reads what the cards put in. `waitsOn` names the Your Story item
// that says how much more it needs before it can answer.
export type GiveBackKey =
  | 'patterns'
  | 'symptoms'
  | 'nutrientsTrend'
  | 'variety'
  | 'eatingWindow'
  | 'movement'
  | 'weight'
  | 'labsTrend'
  | 'bloodPressure'
  | 'hydration'
  | 'doses'
  | 'care'
  | 'reactions'
  | 'planned'
  | 'ferments'
  | 'groceryPrices'
  | 'keepingUp'
  | 'cost'
  | 'work'
  | 'gardenYield'
  | 'growingConditions'
  | 'nutrientsToday'
  | 'foodLookup'
  | 'safeFoods'
  | 'healingStage'
  | 'interactions'
  | 'reportDoctor'
  | 'reportNutrition'
  | 'reportTrainer'
  | 'reportCare'
  | 'reportCosts'
  | 'reportGarden'
  | 'reportVariety';

export type GiveBackArea = {
  key: GiveBackKey;
  label: string;
  // The tab it lives on, for its colour and icon.
  tabPath: '/insights' | '/trends' | '/reports';
  destination: Route;
  // What it shows, in one or two plain sentences.
  line: string;
  waitsOn?: YourStoryItemKey;
};

export const GIVE_BACK_AREAS: GiveBackArea[] = [
  {
    key: 'patterns',
    label: 'Pattern Finder',
    tabPath: '/trends',
    destination: trendsLens('patterns'),
    line: 'Lists what tends to come before your flares, each counted against how often it turns up on ordinary days. It can say what tends to follow, never what caused it.',
    waitsOn: 'patterns',
  },
  {
    key: 'symptoms',
    label: 'Symptoms & Flares',
    tabPath: '/trends',
    destination: trendsLens('symptoms'),
    line: 'How often each symptom came and how bad it was, week by week, so a doctor sees the shape of it rather than how you felt that morning.',
  },
  {
    key: 'nutrientsTrend',
    label: 'Nutrients over time',
    tabPath: '/trends',
    destination: trendsLens('nutrients'),
    line: 'Each nutrient across the weeks against your target, with what came from food and what came from a supplement shown apart.',
    waitsOn: 'trends',
  },
  {
    key: 'variety',
    label: 'What You Eat',
    tabPath: '/trends',
    destination: trendsLens('variety'),
    line: 'How many different foods you eat a week, what keeps coming back, and how much of it feeds your gut.',
  },
  {
    key: 'eatingWindow',
    label: 'Eating Window',
    tabPath: '/trends',
    destination: trendsLens('eatingWindow'),
    line: 'When your first and last meals of the day fall, across the weeks.',
  },
  {
    key: 'movement',
    label: 'Movement',
    tabPath: '/trends',
    destination: trendsLens('movement'),
    line: 'Minutes and kinds of movement week by week, with steps when a phone app sends them.',
    waitsOn: 'movementTrend',
  },
  {
    key: 'weight',
    label: 'Weight',
    tabPath: '/trends',
    destination: trendsLens('weight'),
    line: 'Your weight over time beside your usual range, which is what your readings have been and never what they should be.',
  },
  {
    key: 'labsTrend',
    label: 'Labs',
    tabPath: '/trends',
    destination: trendsLens('labs'),
    line: 'Each lab result over time, so a change after a new dose or a new way of eating is there to see.',
  },
  {
    key: 'bloodPressure',
    label: 'Blood Pressure',
    tabPath: '/trends',
    destination: trendsLens('bloodPressure'),
    line: 'Your readings by time of day and across the weeks.',
  },
  {
    key: 'hydration',
    label: 'Hydration',
    tabPath: '/trends',
    destination: trendsLens('hydration'),
    line: 'How much you drank each day, and which days ran short.',
  },
  {
    key: 'doses',
    label: 'Doses Over Time',
    tabPath: '/trends',
    destination: trendsLens('doses'),
    line: 'Which doses were taken, skipped or late, day by day.',
  },
  {
    key: 'care',
    label: 'Appointments & Care',
    tabPath: '/trends',
    destination: trendsLens('care'),
    line: 'Every appointment in one line through the year, with what each one was for.',
  },
  {
    key: 'reactions',
    label: 'Reactions & New Foods',
    tabPath: '/trends',
    destination: trendsLens('reactions'),
    line: 'Every reaction you noted and every food you tried out, side by side.',
  },
  {
    key: 'planned',
    label: 'Planned and Eaten',
    tabPath: '/trends',
    destination: trendsLens('planned'),
    line: 'What you planned to eat beside what you ate, so a plan that keeps slipping is easy to adjust.',
  },
  {
    key: 'ferments',
    label: 'Ferments',
    tabPath: '/trends',
    destination: trendsLens('ferments'),
    line: 'Every batch you started, how long it took and how much it made.',
  },
  {
    key: 'groceryPrices',
    label: 'Grocery Prices',
    tabPath: '/trends',
    destination: trendsLens('groceries'),
    line: 'What you buy most and what it has cost you over time.',
  },
  {
    key: 'keepingUp',
    label: 'Keeping Up',
    tabPath: '/trends',
    destination: trendsLens('keepingUp'),
    line: 'Which routines and checks got done on which days, laid out so a missed week is easy to pick back up. Nothing here scores you.',
    waitsOn: 'keepingUp',
  },
  {
    key: 'cost',
    label: 'What It Costs',
    tabPath: '/trends',
    destination: trendsLens('cost'),
    line: 'Where your money went month by month, medical and growing costs included, counted only from what you entered.',
    waitsOn: 'whatItCosts',
  },
  {
    key: 'work',
    label: 'Work',
    tabPath: '/trends',
    destination: trendsLens('work'),
    line: 'How each work week went, from your weekly check-ins, with the hard weeks easy to find.',
  },
  {
    key: 'gardenYield',
    label: 'Garden Yield',
    tabPath: '/trends',
    destination: trendsLens('harvest'),
    line: 'What each crop gave, by weight or by count, season against season.',
  },
  {
    key: 'growingConditions',
    label: 'Growing Conditions',
    tabPath: '/trends',
    destination: trendsLens('conditions'),
    line: 'Temperature, moisture and rain for each area, from readings you type in or a sensor sends.',
  },
  {
    key: 'nutrientsToday',
    label: 'Nutrients today',
    tabPath: '/insights',
    destination: insightsLens('nutrients'),
    line: "Today's nutrients against your targets, with food and supplements shown apart.",
  },
  {
    key: 'foodLookup',
    label: 'Food Lookup',
    tabPath: '/insights',
    destination: insightsLens('foodLookup'),
    line: 'Any food checked against your conditions, allergies and way of eating, with the reason behind every caution.',
  },
  {
    key: 'safeFoods',
    label: 'Safe Foods',
    tabPath: '/insights',
    destination: insightsLens('safeFoods'),
    line: 'Foods that suit every condition you track at once.',
  },
  {
    key: 'healingStage',
    label: 'Healing Stage',
    tabPath: '/insights',
    destination: insightsLens('healingStage'),
    line: 'Foods put in order for the stage of healing you are at, with nothing hidden.',
  },
  {
    key: 'interactions',
    label: 'My Meds & Interactions',
    tabPath: '/insights',
    destination: insightsLens('myMeds'),
    line: 'Which foods and supplements to keep apart from each medicine, and by how long.',
  },
  {
    key: 'reportDoctor',
    label: 'For Your Doctor',
    tabPath: '/reports',
    destination: report('r-doctor'),
    line: 'A report for your doctor of symptoms, doses, labs and what you ate, laid out on a page they can read in a few minutes.',
  },
  {
    key: 'reportNutrition',
    label: 'For a Nutritionist',
    tabPath: '/reports',
    destination: report('r-nutrition'),
    line: 'What you ate and the nutrients in it, for whoever helps you plan meals.',
  },
  {
    key: 'reportTrainer',
    label: 'For a Trainer',
    tabPath: '/reports',
    destination: report('r-trainer'),
    line: 'Your movement and how your body answered it, for a trainer or physical therapist.',
  },
  {
    key: 'reportCare',
    label: 'For a Caregiver',
    tabPath: '/reports',
    destination: report('r-care'),
    line: 'What someone helping you needs to know: medicines, allergies, routines and who to call.',
  },
  {
    key: 'reportCosts',
    label: 'Medical Costs',
    tabPath: '/reports',
    destination: report('r-medical-costs'),
    line: 'Every medical bill and what insurance paid, ready for taxes or an appeal.',
  },
  {
    key: 'reportGarden',
    label: 'Garden Record',
    tabPath: '/reports',
    destination: report('r-garden'),
    line: 'Your areas, plantings, harvests and costs for the season, kept for next year.',
  },
  {
    key: 'reportVariety',
    label: 'Eating Variety',
    tabPath: '/reports',
    destination: report('r-variety'),
    line: 'How varied your eating has been, food by food, over the weeks.',
  },
];

// THE CARDS.
export type SetupCardDef = {
  key: string;
  title: string;
  // An Ionicons name, the lens's icon where the card opens a lens.
  icon: string;
  // The one line that makes somebody want to do it.
  hook: string;
  whatItIs: string;
  whatYouDo: string;
  takes: string;
  getsBack: GiveBackKey[];
  // Cards it is worth doing next to, by key.
  worksWith?: string[];
  // Done when the Your Story item is done, or when any of these records
  // exists. A card with neither is never marked done.
  item?: YourStoryItemKey;
  records?: GuideRecordKey[];
  destination: Go;
};

export type SetupShelfDef = {
  key: string;
  title: string;
  // Shown only when one of these parts of life is chosen. Empty means
  // always shown.
  beats: BeatKey[];
  cards: SetupCardDef[];
};

export type SetupTabDef = {
  path: '/life' | '/food' | '/garden' | '/schedule' | '/log';
  title: string;
  // What the tab is for, in one line, under its name.
  line: string;
  shelves: SetupShelfDef[];
};

export const SETUP_TABS: SetupTabDef[] = [
  {
    path: '/life',
    title: 'Life',
    line: 'The things you look after, written down once so they stop taking up room in your head.',
    shelves: [
      {
        key: 'lifeHealth',
        title: 'Your health',
        beats: ['health'],
        cards: [
          {
            key: 'meds',
            title: 'My Meds',
            icon: 'flask-outline',
            hook: 'Never wonder again whether that supplement clashes with your prescription.',
            whatItIs: 'One list of every prescription, over the counter medicine and supplement you take.',
            whatYouDo: 'Add each one with its dose. Times can come later.',
            takes: 'About 2 minutes',
            getsBack: ['interactions', 'doses', 'nutrientsToday', 'reportDoctor', 'reportCare'],
            worksWith: ['doseTimes', 'emergency'],
            item: 'meds',
            destination: lifeLens('myMeds'),
          },
          {
            key: 'conditions',
            title: 'Your conditions',
            icon: 'pulse-outline',
            hook: 'Every food in the app gets checked against what you live with.',
            whatItIs: 'The health conditions you want the app to keep in mind, picked from the list of 19.',
            whatYouDo: 'Tick the ones you have. You can add a healing stage for those that have one.',
            takes: 'Under a minute',
            getsBack: ['foodLookup', 'safeFoods', 'healingStage', 'reportDoctor'],
            worksWith: ['allergies', 'meds'],
            item: 'conditions',
            destination: profile,
          },
          {
            key: 'emergency',
            title: 'Emergency card',
            icon: 'medkit-outline',
            hook: 'If you cannot speak for yourself, your phone can.',
            whatItIs: 'A card with your medicines, allergies, conditions and who to call, readable in a hurry.',
            whatYouDo: 'Check what it already knows and add your emergency contacts.',
            takes: 'About 2 minutes',
            getsBack: ['reportCare'],
            worksWith: ['meds'],
            item: 'emergency',
            destination: lifeLens('emergency'),
          },
        ],
      },
      {
        key: 'lifeMoney',
        title: 'Your money',
        beats: ['money'],
        cards: [
          {
            key: 'bills',
            title: 'Bills that come round',
            icon: 'wallet-outline',
            hook: 'A heads up before every bill, and no more late fees.',
            whatItIs: 'The bills that repeat: rent, power, phone, insurance, subscriptions.',
            whatYouDo: 'Add each bill with how much and how often.',
            takes: 'About 3 minutes',
            getsBack: ['cost'],
            worksWith: ['spending'],
            item: 'bills',
            destination: lifeLens('finances'),
          },
          {
            key: 'spending',
            title: 'What you spend',
            icon: 'cash-outline',
            hook: 'See where the month went without a spreadsheet.',
            whatItIs: 'Money in and money out, entered as it happens.',
            whatYouDo: "Add today's spending, then a little each day or once a week.",
            takes: 'Under a minute each',
            getsBack: ['cost'],
            worksWith: ['bills', 'medicalBill'],
            item: 'spending',
            destination: lifeLens('finances'),
          },
          {
            key: 'medicalBill',
            title: 'Medical bills',
            icon: 'receipt-outline',
            hook: 'Every medical bill in one place when tax time or an appeal comes.',
            whatItIs: 'Each bill from a doctor, lab, pharmacy or hospital, with what insurance paid.',
            whatYouDo: 'Add a bill with its date, amount and what was covered.',
            takes: 'About a minute each',
            getsBack: ['reportCosts', 'cost'],
            worksWith: ['insurancePlan'],
            records: ['medicalBill'],
            destination: lifeLens('finances'),
          },
          {
            key: 'insurancePlan',
            title: 'Insurance plan',
            icon: 'shield-checkmark-outline',
            hook: 'Know what is left on your deductible before you book.',
            whatItIs: 'Your health plan, its deductible and its out of pocket limit.',
            whatYouDo: 'Add the plan and its yearly amounts.',
            takes: 'About 2 minutes',
            getsBack: ['reportCosts'],
            worksWith: ['medicalBill'],
            records: ['insurancePlan'],
            destination: lifeLens('finances'),
          },
          {
            key: 'accounts',
            title: 'Accounts and goals',
            icon: 'trending-up-outline',
            hook: 'Watch savings grow toward something you chose.',
            whatItIs: 'Your accounts and anything you are saving toward.',
            whatYouDo: 'Add an account or a goal with the amount you are aiming for.',
            takes: 'About 2 minutes',
            getsBack: ['cost'],
            records: ['accounts', 'goals'],
            destination: lifeLens('finances'),
          },
        ],
      },
      {
        key: 'lifeHome',
        title: 'Your home',
        beats: ['home'],
        cards: [
          {
            key: 'upkeep',
            title: 'Upkeep',
            icon: 'construct-outline',
            hook: 'The filter, the smoke alarm, the gutters: reminded when they are due, not after.',
            whatItIs: 'The jobs around the house that come round every few weeks or months.',
            whatYouDo: 'Add a job and how often it needs doing.',
            takes: 'About a minute each',
            getsBack: ['keepingUp'],
            worksWith: ['didIDoIt'],
            item: 'upkeep',
            destination: lifeLens('upkeep'),
          },
          {
            key: 'kitchen',
            title: 'Kitchen',
            icon: 'file-tray-full-outline',
            hook: 'Ask where you put it and get an answer.',
            whatItIs: 'What is in your cupboards, fridge and freezer, and where.',
            whatYouDo: 'Add the places, then what is in each one.',
            takes: 'About 3 minutes',
            getsBack: ['groceryPrices'],
            worksWith: ['groceryList'],
            item: 'kitchen',
            destination: lifeLens('kitchen'),
          },
        ],
      },
      {
        key: 'lifeDays',
        title: 'Your days',
        beats: ['routines', 'home', 'work', 'family'],
        cards: [
          {
            key: 'routine',
            title: 'Routines',
            icon: 'footsteps-outline',
            hook: 'Mornings that run themselves, one step at a time.',
            whatItIs: 'A list of steps you do in order, like getting out the door or winding down.',
            whatYouDo: 'Make one routine with its steps, then run it when the time comes.',
            takes: 'About 2 minutes',
            getsBack: ['keepingUp'],
            worksWith: ['didIDoIt'],
            item: 'routine',
            destination: lifeLens('routines'),
          },
          {
            key: 'didIDoIt',
            title: 'Did I Do It',
            icon: 'checkmark-done-outline',
            hook: 'Did I lock the door? Take the pill? Feed the cat? Look, and know.',
            whatItIs: 'One tap marks something done, with the time, so you can check later.',
            whatYouDo: 'Add the things you tend to second guess.',
            takes: 'Under a minute',
            getsBack: ['keepingUp'],
            worksWith: ['routine'],
            item: 'didIDoIt',
            destination: lifeLens('didIDoIt'),
          },
          {
            key: 'capture',
            title: 'Capture',
            icon: 'mic-outline',
            hook: 'Say it once and let it go. It will be there when you need it.',
            whatItIs: 'A quick voice, photo or typed note, even from the locked phone.',
            whatYouDo: 'Save one note about anything on your mind.',
            takes: 'Seconds',
            getsBack: ['keepingUp'],
            worksWith: ['todo'],
            item: 'capture',
            destination: route('/capture'),
          },
          {
            key: 'todo',
            title: 'To do',
            icon: 'checkbox-outline',
            hook: 'Out of your head and onto a list that reminds you.',
            whatItIs: 'Things to do, with a day if they need one.',
            whatYouDo: 'Add the first few things on your mind.',
            takes: 'Under a minute',
            getsBack: ['keepingUp'],
            worksWith: ['capture'],
            item: 'todo',
            destination: lifeLens('todos'),
          },
          {
            key: 'daysUntil',
            title: 'Days Until',
            icon: 'hourglass-outline',
            hook: 'The trip, the birthday, the renewal: always know how far off it is.',
            whatItIs: 'A counter for any day coming up, with a reminder on the day.',
            whatYouDo: 'Add a day you are waiting for.',
            takes: 'Under a minute',
            getsBack: ['keepingUp'],
            item: 'daysUntil',
            destination: lifeLens('daysUntil'),
          },
        ],
      },
      {
        key: 'lifeWork',
        title: 'Your work',
        beats: ['work'],
        cards: [
          {
            key: 'workCheckin',
            title: 'Weekly work check-in',
            icon: 'briefcase-outline',
            hook: 'Spot the weeks that wear you down before they pile up.',
            whatItIs: 'A few questions once a week about how work went.',
            whatYouDo: "Answer this week's check-in.",
            takes: 'About a minute',
            getsBack: ['work'],
            worksWith: ['workBenefits'],
            item: 'workCheckin',
            destination: lifeLens('work'),
          },
          {
            key: 'workBenefits',
            title: 'Work benefits',
            icon: 'gift-outline',
            hook: 'Use the allowance before it runs out instead of after.',
            whatItIs: 'Benefits with a limit or a deadline: leave, allowances, health accounts.',
            whatYouDo: 'Add each benefit with its amount and when it ends.',
            takes: 'About 2 minutes',
            getsBack: ['work'],
            item: 'workBenefits',
            destination: lifeLens('work'),
          },
        ],
      },
      {
        key: 'lifeFamily',
        title: 'Your family',
        beats: ['family'],
        cards: [
          {
            key: 'familyMember',
            title: 'Family members',
            icon: 'people-outline',
            hook: "Cook once for everyone, with everyone's needs in mind.",
            whatItIs: 'The people you look after or cook for, kept on this phone.',
            whatYouDo: 'Add each person by name.',
            takes: 'Under a minute each',
            getsBack: ['safeFoods', 'reportCare'],
            worksWith: ['familyConditions'],
            item: 'familyMember',
            destination: lifeLens('conditions'),
          },
          {
            key: 'familyConditions',
            title: 'Their conditions',
            icon: 'heart-outline',
            hook: 'Meal plans that suit the whole table.',
            whatItIs: 'The conditions each family member lives with.',
            whatYouDo: 'Pick their conditions and switch on Include in meal plan.',
            takes: 'Under a minute each',
            getsBack: ['safeFoods', 'foodLookup'],
            worksWith: ['familyMember', 'mealPlan'],
            item: 'familyConditions',
            records: ['familyInMealPlan'],
            destination: lifeLens('conditions'),
          },
        ],
      },
    ],
  },
  {
    path: '/food',
    title: 'Food',
    line: 'What you eat, cook, plan and buy, each checked against what suits you.',
    shelves: [
      {
        key: 'foodYou',
        title: 'What suits you',
        beats: ['food', 'health'],
        cards: [
          {
            key: 'allergies',
            title: 'Allergies',
            icon: 'warning-outline',
            hook: 'A warning on every food and recipe that holds what you cannot eat.',
            whatItIs: 'The foods and ingredients you react to.',
            whatYouDo: 'Pick them from the list or type your own.',
            takes: 'Under a minute',
            getsBack: ['foodLookup', 'safeFoods', 'reportCare'],
            worksWith: ['eatingStyle'],
            item: 'allergies',
            destination: profile,
          },
          {
            key: 'eatingStyle',
            title: 'Way of eating',
            icon: 'leaf-outline',
            hook: 'Recipes and meal plans that already fit how you eat.',
            whatItIs: 'Vegan, low FODMAP, gluten free, paleo or any other way you eat.',
            whatYouDo: 'Pick the ones you follow.',
            takes: 'Under a minute',
            getsBack: ['foodLookup', 'safeFoods'],
            worksWith: ['allergies'],
            item: 'eatingStyle',
            destination: profile,
          },
          {
            key: 'safeFoods',
            title: 'Safe Foods',
            icon: 'shield-outline',
            hook: 'The foods that suit you, ready the moment you are hungry.',
            whatItIs: 'A list you keep of foods that work for your body.',
            whatYouDo: 'Look through the suggestions and keep the ones you like.',
            takes: 'About 2 minutes',
            getsBack: ['safeFoods', 'foodLookup'],
            records: ['safeFoods'],
            destination: insightsLens('safeFoods'),
          },
        ],
      },
      {
        key: 'foodCooking',
        title: 'Cooking and planning',
        beats: ['food', 'health'],
        cards: [
          {
            key: 'mealPlan',
            title: 'Meal Plan',
            icon: 'calendar-number-outline',
            hook: 'Up to six weeks of meals planned for you, with the shopping list done.',
            whatItIs: 'Meals chosen for your conditions, allergies and way of eating, set out day by day.',
            whatYouDo: 'Make a plan and keep the days you like.',
            takes: 'About 2 minutes',
            getsBack: ['planned', 'nutrientsTrend', 'reportNutrition'],
            worksWith: ['groceryList'],
            records: ['mealPlan'],
            destination: scheduleLens('dailyMealPlan'),
          },
          {
            key: 'savedRecipe',
            title: 'Your recipes',
            icon: 'restaurant-outline',
            hook: 'Every dish you make, checked against what suits you.',
            whatItIs: 'A recipe built from its ingredients, with its nutrients worked out.',
            whatYouDo: 'Build one dish you cook often and save it.',
            takes: 'About 3 minutes',
            getsBack: ['nutrientsTrend', 'variety', 'reportNutrition'],
            worksWith: ['mealPlan'],
            records: ['savedRecipe'],
            destination: foodLens('mealBuilder'),
          },
          {
            key: 'groceryList',
            title: 'Grocery List',
            icon: 'cart-outline',
            hook: 'One list for the store, built from what you plan to cook.',
            whatItIs: 'What you need to buy, kept by aisle, with prices if you add them.',
            whatYouDo: 'Add a few things, or fill it from your meal plan.',
            takes: 'Under a minute',
            getsBack: ['groceryPrices'],
            worksWith: ['mealPlan', 'kitchen'],
            records: ['groceryList'],
            destination: lifeLens('groceryList'),
          },
          {
            key: 'fermentation',
            title: 'Ferments',
            icon: 'flask-outline',
            hook: 'Yogurt, kraut and kombucha that feed your gut, with every batch remembered.',
            whatItIs: 'A batch you are fermenting, with its start, its culture and how much it made.',
            whatYouDo: 'Start a batch and let the app count the days.',
            takes: 'About 2 minutes',
            getsBack: ['ferments', 'variety'],
            records: ['fermentation'],
            destination: foodLens('fermentationBuilder'),
          },
          {
            key: 'scannedProduct',
            title: 'Scan a product',
            icon: 'barcode-outline',
            hook: 'Point your camera at a packet and see whether it suits you.',
            whatItIs: 'A store-bought food read from its barcode and checked against what suits you.',
            whatYouDo: 'Scan something from your cupboard.',
            takes: 'Seconds',
            getsBack: ['foodLookup', 'nutrientsToday'],
            records: ['scannedProduct'],
            destination: foodLens('scanProduct'),
          },
        ],
      },
    ],
  },
  {
    path: '/garden',
    title: 'Garden',
    line: 'What you grow, from the first bed to what it gives back.',
    shelves: [
      {
        key: 'gardenGrowing',
        title: 'What you grow',
        beats: ['garden'],
        cards: [
          {
            key: 'gardenArea',
            title: 'Garden areas',
            icon: 'grid-outline',
            hook: 'Every bed, pot and grow tent, and what has grown in each one.',
            whatItIs: 'A place you grow: a bed, a row of pots, a greenhouse, an indoor light.',
            whatYouDo: 'Add one area with its size and its light.',
            takes: 'About 2 minutes',
            getsBack: ['reportGarden', 'growingConditions'],
            worksWith: ['planting'],
            item: 'gardenArea',
            destination: gardenLens('plotsAndPlantings'),
          },
          {
            key: 'planting',
            title: 'Plantings',
            icon: 'flower-outline',
            hook: 'Know what went in where and when, every season.',
            whatItIs: 'A crop you sowed or planted in an area.',
            whatYouDo: 'Add what you planted and when.',
            takes: 'About a minute each',
            getsBack: ['gardenYield', 'reportGarden'],
            worksWith: ['gardenArea', 'harvest'],
            item: 'planting',
            destination: gardenLens('plotsAndPlantings'),
          },
          {
            key: 'harvest',
            title: 'Harvests',
            icon: 'basket-outline',
            hook: 'See what your garden gave you, season after season.',
            whatItIs: 'What you picked, by weight or by count.',
            whatYouDo: 'Log a harvest when you pick something.',
            takes: 'Under a minute',
            getsBack: ['gardenYield', 'reportGarden'],
            worksWith: ['planting'],
            item: 'harvest',
            destination: gardenLens('harvestLog'),
          },
        ],
      },
      {
        key: 'gardenSoil',
        title: 'Soil, setup and costs',
        beats: ['garden'],
        cards: [
          {
            key: 'compost',
            title: 'Compost',
            icon: 'layers-outline',
            hook: 'Turn kitchen scraps into the best thing your soil can have.',
            whatItIs: 'A compost pile or bin, with what went in and when it was turned.',
            whatYouDo: 'Add your pile and the first things that went in.',
            takes: 'About a minute',
            getsBack: ['reportGarden'],
            records: ['compost'],
            destination: gardenLens('compost'),
          },
          {
            key: 'gardenReading',
            title: 'Growing conditions',
            icon: 'thermometer-outline',
            hook: 'Learn what each bed is like through the year.',
            whatItIs: 'Temperature, soil moisture and rain for an area, typed in or from a sensor.',
            whatYouDo: 'Add a first reading for one area.',
            takes: 'Under a minute',
            getsBack: ['growingConditions'],
            records: ['gardenReading'],
            destination: gardenLens('growingConditions'),
          },
          {
            key: 'gardenSetup',
            title: 'Grow Setup',
            icon: 'bulb-outline',
            hook: 'Every light, pot and pump, with what each one cost.',
            whatItIs: 'The equipment in an area.',
            whatYouDo: 'Add the pieces you use in one area.',
            takes: 'About 2 minutes',
            getsBack: ['reportGarden', 'cost'],
            worksWith: ['gardenCost'],
            records: ['gardenSetup'],
            destination: gardenLens('plotsAndPlantings'),
          },
          {
            key: 'gardenCost',
            title: 'Growing costs',
            icon: 'pricetag-outline',
            hook: 'What your garden costs beside what it gives.',
            whatItIs: 'Seed, soil, tools, water and power spent on growing.',
            whatYouDo: 'Add what you spent this season.',
            takes: 'About a minute each',
            getsBack: ['cost', 'reportGarden'],
            records: ['gardenCost', 'electricity'],
            destination: gardenLens('growingCosts'),
          },
        ],
      },
    ],
  },
  {
    path: '/schedule',
    title: 'Schedules',
    line: 'Your day laid out by the clock: meals, water, doses and appointments.',
    shelves: [
      {
        key: 'scheduleDay',
        title: 'Your day',
        beats: ['health', 'food'],
        cards: [
          {
            key: 'meal',
            title: 'Meals',
            icon: 'restaurant-outline',
            hook: 'Every meal you log teaches the app something about your body.',
            whatItIs: 'What you ate and when.',
            whatYouDo: "Log today's first meal. Pick from recents or recipes, no blank form.",
            takes: 'About a minute',
            getsBack: ['nutrientsTrend', 'patterns', 'variety', 'eatingWindow', 'nutrientsToday', 'reportNutrition', 'reportVariety'],
            worksWith: ['checkin', 'water'],
            item: 'meal',
            destination: scheduleLens('meals'),
          },
          {
            key: 'doseTimes',
            title: 'Dose times',
            icon: 'alarm-outline',
            hook: 'A reminder at the right time, moved when a meal gets in the way.',
            whatItIs: 'When each medicine and supplement is taken, checked against your meals.',
            whatYouDo: 'Give each one on My Meds a time.',
            takes: 'About a minute',
            getsBack: ['doses', 'interactions', 'reportDoctor'],
            worksWith: ['meds'],
            records: ['doseTimes'],
            destination: scheduleLens('meds'),
          },
          {
            key: 'water',
            title: 'Water',
            icon: 'water-outline',
            hook: 'One tap a glass, and the days that run short show up.',
            whatItIs: 'What you drink through the day.',
            whatYouDo: 'Tap in your first glass.',
            takes: 'Seconds',
            getsBack: ['hydration', 'nutrientsToday'],
            worksWith: ['meal'],
            item: 'water',
            destination: scheduleLens('hydration'),
          },
          {
            key: 'appointment',
            title: 'Appointments',
            icon: 'calendar-outline',
            hook: 'Walk in with your questions ready and your records on hand.',
            whatItIs: 'A doctor, lab, therapy or any other appointment.',
            whatYouDo: 'Add the next one you have booked.',
            takes: 'Under a minute',
            getsBack: ['care', 'reportDoctor', 'reportCare'],
            records: ['appointment'],
            destination: scheduleLens('appointments'),
          },
        ],
      },
    ],
  },
  {
    path: '/log',
    title: 'Signals',
    line: 'How you feel and what your body tells you, put down when it happens.',
    shelves: [
      {
        key: 'signalsFeel',
        title: 'How you feel',
        beats: ['health'],
        cards: [
          {
            key: 'checkin',
            title: 'Daily check-in',
            icon: 'happy-outline',
            hook: 'A few taps a day, and the app starts finding what sets you off.',
            whatItIs: 'How you feel today: energy, mood, sleep and any symptoms.',
            whatYouDo: "Answer today's check-in on Home.",
            takes: 'Under a minute',
            getsBack: ['patterns', 'symptoms', 'reportDoctor'],
            worksWith: ['meal', 'flare'],
            item: 'checkin',
            destination: { kind: 'home', section: 'todaysCheckin' },
          },
          {
            key: 'flare',
            title: 'Flares',
            icon: 'pulse-outline',
            hook: 'Write it down as it happens, and see what came before it.',
            whatItIs: 'A flare or bad spell, how bad it was and what it felt like.',
            whatYouDo: 'Log a flare the next time one comes.',
            takes: 'Under a minute',
            getsBack: ['patterns', 'symptoms', 'reportDoctor'],
            worksWith: ['checkin', 'meal'],
            records: ['flare'],
            destination: signalsLens('flares'),
          },
          {
            key: 'foodReaction',
            title: 'Food reactions',
            icon: 'warning-outline',
            hook: 'Catch the foods that disagree with you.',
            whatItIs: 'A reaction you think came from something you ate.',
            whatYouDo: 'Log one when it happens, with the food if you know it.',
            takes: 'Under a minute',
            getsBack: ['reactions', 'patterns'],
            records: ['foodReaction', 'experiment'],
            destination: signalsLens('foodReactions'),
          },
        ],
      },
      {
        key: 'signalsBody',
        title: 'Your body',
        beats: ['health', 'movement'],
        cards: [
          {
            key: 'exercise',
            title: 'Movement',
            icon: 'walk-outline',
            hook: 'See how moving shapes your energy across the weeks.',
            whatItIs: 'A walk, a workout, yoga or any movement, with how long.',
            whatYouDo: 'Log what you did today.',
            takes: 'Under a minute',
            getsBack: ['movement', 'reportTrainer'],
            item: 'exercise',
            destination: { kind: 'quickLog', form: 'exercise' },
          },
          {
            key: 'labs',
            title: 'Lab results',
            icon: 'document-text-outline',
            hook: 'Every result in one place, lined up over the years.',
            whatItIs: 'Blood tests and other lab results with their dates.',
            whatYouDo: 'Add your most recent results.',
            takes: 'About 3 minutes',
            getsBack: ['labsTrend', 'reportDoctor'],
            records: ['labs'],
            destination: insightsLens('labs'),
          },
          {
            key: 'weight',
            title: 'Weight',
            icon: 'scale-outline',
            hook: 'Watch the line, not the day.',
            whatItIs: 'Your weight, whenever you weigh yourself.',
            whatYouDo: "Add today's weight in Profile.",
            takes: 'Seconds',
            getsBack: ['weight', 'reportTrainer'],
            records: ['weight'],
            destination: profile,
          },
          {
            key: 'bloodPressure',
            title: 'Blood pressure',
            icon: 'heart-outline',
            hook: 'Readings by time of day, ready for your next appointment.',
            whatItIs: 'Your blood pressure readings, if you take them.',
            whatYouDo: 'Log a reading.',
            takes: 'Under a minute',
            getsBack: ['bloodPressure', 'reportDoctor'],
            records: ['bloodPressure'],
            destination: signalsLens('bloodPressure'),
          },
        ],
      },
    ],
  },
];

// VIEWS.
export type SetupCardView = {
  def: SetupCardDef;
  // The day it was first done, or null while it is open.
  doneOn: string | null;
  setAside: boolean;
  areas: GiveBackArea[];
};

export type SetupShelfView = { def: SetupShelfDef; cards: SetupCardView[]; openCount: number };
export type SetupTabView = { def: SetupTabDef; shelves: SetupShelfView[]; openCount: number; startHere: boolean };

const AREA_BY_KEY = new Map(GIVE_BACK_AREAS.map((area) => [area.key, area]));

export function giveBackArea(key: GiveBackKey): GiveBackArea | undefined {
  return AREA_BY_KEY.get(key);
}

function earliest(days: (string | null | undefined)[]): string | null {
  let first: string | null = null;
  for (const day of days) if (day && (!first || day < first)) first = day;
  return first;
}

export function cardDoneOn(def: SetupCardDef, view: YourStoryView, records: GuideRecords): string | null {
  const fromItem = def.item ? view.allItems[def.item]?.doneOn ?? null : null;
  const fromRecords = (def.records ?? []).map((key) => records[key]);
  return earliest([fromItem, ...fromRecords]);
}

function shelfShown(shelf: SetupShelfDef, beats: readonly BeatKey[]): boolean {
  // Before any part of life is chosen every row shows, so nothing looks
  // missing.
  if (beats.length === 0 || shelf.beats.length === 0) return true;
  return shelf.beats.some((beat) => beats.includes(beat));
}

// The rows for the parts of life chosen. Each row keeps its cards in the
// order written (the most useful first) with the done ones moved to the
// end; a tab with no row shown is left out; the tab the person chose to
// start from comes first.
export function buildSetupShelves(view: YourStoryView, records: GuideRecords, startPath: string | null): SetupTabView[] {
  const tabs: SetupTabView[] = [];
  for (const tab of SETUP_TABS) {
    const shelves: SetupShelfView[] = [];
    for (const shelf of tab.shelves) {
      if (!shelfShown(shelf, view.beats)) continue;
      const cards = shelf.cards.map((def) => {
        const item = def.item ? view.allItems[def.item] : undefined;
        return {
          def,
          doneOn: cardDoneOn(def, view, records),
          setAside: item?.state === 'setAside',
          areas: def.getsBack.map((key) => AREA_BY_KEY.get(key)).filter((area): area is GiveBackArea => !!area),
        };
      });
      const open = cards.filter((card) => !card.doneOn && !card.setAside);
      const settled = cards.filter((card) => card.doneOn || card.setAside);
      shelves.push({ def: shelf, cards: [...open, ...settled], openCount: open.length });
    }
    if (shelves.length === 0) continue;
    tabs.push({
      def: tab,
      shelves,
      openCount: shelves.reduce((sum, shelf) => sum + shelf.openCount, 0),
      startHere: tab.path === startPath,
    });
  }
  const start = tabs.findIndex((tab) => tab.startHere);
  if (start > 0) tabs.unshift(...tabs.splice(start, 1));
  return tabs;
}

// What a tapped give-back chip says: the area, and how much more it needs
// when it is still waiting.
// translate is the language lookup (lib/i18n.ts t), passed in so this file
// keeps no runtime imports; each part is looked up on its own.
export function giveBackExplanation(
  area: GiveBackArea,
  view: YourStoryView,
  translate: (english: string) => string = (english) => english,
): string {
  const waiting = area.waitsOn ? view.allItems[area.waitsOn] : undefined;
  if (waiting && !waiting.doneOn && waiting.note) return `${translate(area.line)}\n\n${translate(waiting.note)}`;
  return translate(area.line);
}

export const SETUP_CARDS_HEADING = 'Set up what you want';
export const SETUP_CARDS_CAPTION =
  'Each card is one thing to set up. Swipe along a row to see more. The chips show where it comes back to you, and a tap on one says what it shows.';
export const WHAT_IT_IS_LABEL = 'What it is';
export const WHAT_YOU_DO_LABEL = 'What you do';
export const GETS_BACK_LABEL = 'Where it comes back';
export const WORKS_WITH_LABEL = 'Goes well with';
export const SET_IT_UP_LABEL = 'Set It Up';
export const OPEN_IT_LABEL = 'Open It';
export const SET_ASIDE_LABEL = 'Set aside for now';
export const START_HERE_CARD_LABEL = 'You chose to start here';

export function cardTitle(key: string): string | null {
  for (const tab of SETUP_TABS)
    for (const shelf of tab.shelves) for (const card of shelf.cards) if (card.key === key) return card.title;
  return null;
}

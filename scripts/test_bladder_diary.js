// Checks lib/bladderDiary.ts, the three-day bladder diary on Signals >
// Bladder (Q23, 1.0.91.9).
//
// 1. A diary's days, its last morning and where today falls in it.
// 2. The first trip on getting up is found before or after the Up tap.
// 3. Day and night trips split at Going to bed; the 24 hours run from
//    just after one first morning trip to the next, that one included,
//    and the night amount is the night trips plus that morning trip.
// 4. Totals and the night share are left out, with a sentence saying
//    why, when a trip has no amount or a mark is missing.
// 5. Leaks, strong urges and drinks are counted; a drink by weight is
//    never turned into a volume.
// 6. Amounts are typed and shown in the person's units and stored in mL.
// 7. No sentence judges the figures: no normal, abnormal, too, should,
//    healthy, a long dash, or "real"/"genuine".
//
// Exits non-zero on any failure.

/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
function load(relPath) {
  const source = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    throw new Error(`${relPath} imports ${name}; it must stay pure`);
  });
  return module.exports;
}

const B = load('lib/bladderDiary.ts');
let failures = 0;
let checks = 0;
function check(label, cond, detail) {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.log(`FAIL ${label}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`);
  }
}

// 1. Days and stages
const diary = { id: 'd1', startedOn: '2026-11-10', days: 3, endedOn: null };
check('three dates', JSON.stringify(B.diaryDates(diary)) === JSON.stringify(['2026-11-10', '2026-11-11', '2026-11-12']), B.diaryDates(diary));
check('last morning', B.lastMorning(diary) === '2026-11-13');
check('month end', B.addDays('2026-11-30', 1) === '2026-12-01');
check('before', B.diaryStage(diary, '2026-11-09').stage === 'before');
check('day 2', JSON.stringify(B.diaryStage(diary, '2026-11-11')) === JSON.stringify({ stage: 'day', day: 2, of: 3 }));
check('last morning stage', B.diaryStage(diary, '2026-11-13').stage === 'lastMorning');
check('done after', B.diaryStage(diary, '2026-11-14').stage === 'done');
check('ended early is done', B.diaryStage({ ...diary, endedOn: '2026-11-11' }, '2026-11-11').stage === 'done');
check('open on last morning', B.isDiaryOpen(diary, '2026-11-13'));
check('closed after', !B.isDiaryOpen(diary, '2026-11-14'));
check('stage line', B.stageLine({ stage: 'day', day: 1, of: 3 }) === 'Day 1 of 3');

// 2. The first trip on getting up
let n = 0;
const e = (at, kind, extra = {}) => ({ id: `e${++n}`, diaryId: 'd1', at, kind, volumeMl: null, urgency: null, leak: null, note: null, ...extra });
const before = [e('2026-11-10T06:40', 'void', { volumeMl: 300 })];
check('trip just before up', B.morningVoid(before, e('2026-11-10T06:50', 'up'))?.at === '2026-11-10T06:40');
check('trip too long before up', B.morningVoid([e('2026-11-10T05:00', 'void')], e('2026-11-10T06:50', 'up')) === null);
check('trip after up', B.morningVoid([e('2026-11-10T07:30', 'void')], e('2026-11-10T06:50', 'up'))?.at === '2026-11-10T07:30');
check('trip too long after up', B.morningVoid([e('2026-11-10T09:30', 'void')], e('2026-11-10T06:50', 'up')) === null);
check('no up, no morning trip', B.morningVoid(before, null) === null);

// 3. A full first day
const entries = [
  e('2026-11-10T07:00', 'up'),
  e('2026-11-10T07:05', 'void', { volumeMl: 300 }),
  e('2026-11-10T10:00', 'void', { volumeMl: 200 }),
  e('2026-11-10T14:00', 'void', { volumeMl: 250, urgency: 3 }),
  e('2026-11-10T18:00', 'void', { volumeMl: 200 }),
  e('2026-11-10T19:00', 'leak', { leak: 'small' }),
  e('2026-11-10T22:20', 'void', { volumeMl: 150 }),
  e('2026-11-10T22:30', 'bed'),
  e('2026-11-11T02:00', 'void', { volumeMl: 250 }),
  e('2026-11-11T06:50', 'up'),
  e('2026-11-11T06:55', 'void', { volumeMl: 400 }),
  // Day 2: one trip with no amount, Going to bed, then no Up on the 12th.
  e('2026-11-11T12:00', 'void'),
  e('2026-11-11T23:00', 'bed'),
  // Another diary's entry never counts.
  { ...e('2026-11-10T15:00', 'void', { volumeMl: 900 }), diaryId: 'other' },
];
const drinks = [
  { at: '2026-11-10T08:00', name: 'Tea', ml: 250 },
  { at: '2026-11-10T12:00', name: 'Soup', ml: null },
  { at: '2026-11-11T09:00', name: 'Water', ml: 500 },
];
const days = B.summariseDiary(diary, entries, drinks);
const d1 = days[0];
check('day trips', d1.dayTrips === 5, d1.dayTrips);
check('night trips', d1.nightTrips === 1, d1.nightTrips);
check('trips', d1.trips === 6, d1.trips);
check('measured', d1.measured === 6, d1.measured);
check('largest leaves out the next morning', d1.largestMl === 300, d1.largestMl);
check('24 hours', d1.totalMl === 1450, d1.totalMl);
check('night amount', d1.nightMl === 650, d1.nightMl);
check('night share', Math.abs(d1.nightShare - 650 / 1450) < 1e-9, d1.nightShare);
check('leak counted', d1.leaks.small === 1 && d1.leaks.drops === 0, d1.leaks);
check('strong urge', d1.strongUrges === 1, d1.strongUrges);
check('drinks', d1.drinks === 2 && d1.drinksMl === 250 && d1.drinksWithoutAmount === 1, d1);
check('nothing missing', d1.missing === null, d1.missing);

// 4. What is missing, in words
const d2 = days[1];
check('day 2 trips include its morning trip', d2.dayTrips === 2, d2.dayTrips);
check('day 2 night trips', d2.nightTrips === 0, d2.nightTrips);
check('no total without the next Up', d2.totalMl === null && d2.nightShare === null);
check('day 2 says the Up tap is missing', /Up for the day/.test(d2.missing || ''), d2.missing);
check('day 2 drinks', d2.drinksMl === 500, d2.drinksMl);
const d3 = days[2];
check('empty day', d3.trips === 0 && d3.dayTrips === null && d3.nightTrips === null, d3);

const unmeasured = B.summariseDay('2026-11-10', entries.map((x) => (x.at === '2026-11-10T10:00' ? { ...x, volumeMl: null } : x)).filter((x) => x.diaryId === 'd1'), []);
check('one unmeasured trip leaves totals out', unmeasured.totalMl === null && /One trip/.test(unmeasured.missing || ''), unmeasured.missing);
check('largest still shown', unmeasured.largestMl === 300);
const noBed = B.summariseDay('2026-11-10', entries.filter((x) => x.diaryId === 'd1' && x.kind !== 'bed'), []);
check('no bed: no split', noBed.dayTrips === null && noBed.nightTrips === null);
check('no bed: says so', /Going to bed/.test(noBed.missing || ''), noBed.missing);

// 5. Drinks by volume only
const toMl = (amount, unit) => ({ ml: 1, cup: 240, fl_oz: 29.5735 }[unit] != null ? amount * { ml: 1, cup: 240, fl_oz: 29.5735 }[unit] : null);
check('drink by volume', B.drinkMl([{ servingSize: 1, servingUnit: 'cup', yourSharePercent: null, dishServings: null }], toMl) === 240);
check('drink share', B.drinkMl([{ servingSize: 500, servingUnit: 'ml', yourSharePercent: 50, dishServings: null }], toMl) === 250);
check('drink by weight is not a volume', B.drinkMl([{ servingSize: 250, servingUnit: 'g', yourSharePercent: null, dishServings: null }], toMl) === null);
check('drink with no amount', B.drinkMl([{ servingSize: null, servingUnit: null, yourSharePercent: null, dishServings: null }], toMl) === null);
check('drink with no items', B.drinkMl([], toMl) === null);

// 6. Units
check('metric amount', B.formatAmount(250, 'metric') === '250 mL');
check('imperial amount', B.formatAmount(295.735, 'imperial') === '10 fl oz', B.formatAmount(295.735, 'imperial'));
check('parse empty', JSON.stringify(B.parseAmount('  ', 'metric')) === JSON.stringify({ ok: true, ml: null }));
check('parse metric', B.parseAmount('320', 'metric').ml === 320);
check('parse comma', B.parseAmount('10,5', 'imperial').ml === Math.round(10.5 * 29.5735));
check('parse rejects text', B.parseAmount('lots', 'metric').ok === false);
check('parse rejects a slip', B.parseAmount('3200', 'metric').ok === false);
check('parse rejects zero', B.parseAmount('0', 'metric').ok === false);

// Lines
const lines1 = B.dayLines(d1, 'metric');
check('split line', lines1[0] === '5 trips by day, 1 trip at night', lines1[0]);
check('night line', lines1.includes('Night: 650 mL, 45% of the 24 hours'), lines1);
check('leak line', lines1.includes('1 leak (1 small)'), lines1);
check('drinks line', lines1.includes('Drinks: 250 mL in 2 drinks, 1 with no amount'), lines1);
check('entry line', B.entryLine(entries[3], 'metric') === 'Trip, 250 mL, urge: Strong', B.entryLine(entries[3], 'metric'));
check('leak entry line', B.entryLine(entries[5], 'metric') === 'Leak, Small', B.entryLine(entries[5], 'metric'));
const rows = B.reportRows(days, 'metric');
check('report row count', rows.length === 3 && rows[0].length === B.REPORT_COLUMNS.length);
check('report share', rows[0][5] === '45%', rows[0]);

// Translated: every line goes through the translate function with its
// values named, so a Spanish phone gets whole sentences.
const asked = [];
const tr = (text, values) => { asked.push(text); return values ? text.replace(/\{(\w+)\}/g, (w, k) => (k in values ? String(values[k]) : w)) : text; };
const trLines = B.dayLines(d1, 'metric', tr);
check('translated lines match English', JSON.stringify(trLines) === JSON.stringify(lines1), trLines);
check('split asked as a sentence', asked.includes('{day} by day, {night} at night'));
check('night asked as a sentence', asked.includes('Night: {amount}, {value}% of the 24 hours'));
asked.length = 0;
B.dayLines(unmeasured, 'metric', tr);
check('one unmeasured asked whole', asked.includes('One trip in these 24 hours has no amount, so the totals are left out.'), asked);
const two = B.summariseDay('2026-11-10', entries.filter((x) => x.diaryId === 'd1').map((x) => (x.at === '2026-11-10T10:00' || x.at === '2026-11-10T14:00' ? { ...x, volumeMl: null } : x)), []);
asked.length = 0;
const twoLines = B.dayLines(two, 'metric', tr);
check('several unmeasured asked with the count', asked.includes('{unmeasured} trips in these 24 hours have no amount, so the totals are left out.') && twoLines.some((l) => l.startsWith('2 trips in these')), twoLines);
asked.length = 0;
B.entryLine(entries[3], 'metric', tr);
check('urge word asked on its own', asked.includes('Strong') && asked.includes('urge: {words}'), asked);
asked.length = 0;
check('stage asked as a sentence', B.stageLine({ stage: 'day', day: 2, of: 3 }, tr) === 'Day 2 of 3' && asked.includes('Day {day} of {of}'));

// 7. No sentence judges
const FORBIDDEN = /\b(normal|abnormal|too (much|many|few|little|high|low)|should|healthy|unhealthy|excessive|concerning|worry)\b|[–—]|\breal\b|\bgenuine/i;
const sentences = [
  B.DIARY_NOTE,
  ...days.flatMap((d) => B.dayLines(d, 'metric')),
  ...days.flatMap((d) => B.dayLines(d, 'imperial')),
  unmeasured.missing, noBed.missing,
  ...['before', 'lastMorning', 'done'].map((stage) => B.stageLine({ stage, startsOn: '2026-11-10' })),
  ...B.URGE_WORDS,
  B.parseAmount('lots', 'metric').why, B.parseAmount('3200', 'metric').why, B.parseAmount('3200', 'imperial').why,
];
for (const s of sentences) check(`no judgement: ${s}`, !FORBIDDEN.test(s || ''));

console.log(failures === 0 ? `All ${checks} bladder diary checks passed.` : `${failures} of ${checks} checks failed.`);
process.exit(failures === 0 ? 0 : 1);

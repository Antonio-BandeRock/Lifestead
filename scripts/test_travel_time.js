// Checks lib/travelTime.ts (A7, keep home time or shift to local when
// travelling): zone offsets, a home wall-clock time read on another zone's
// clock, clock changes, when a person counts as away, and the wording.
// Run: node scripts/test_travel_time.js
/* global __dirname */
const path = require('path');
const ts = require('typescript');
const fs = require('fs');

const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'travelTime.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
new Function('module', 'exports', 'require', js)(m, m.exports, require);
const T = m.exports;

let pass = 0;
let fail = 0;
function check(name, ok) {
  if (ok) pass++;
  else {
    fail++;
    console.log('FAIL', name);
  }
}

const MX = 'America/Mexico_City';
const LA = 'America/Los_Angeles';
const NY = 'America/New_York';
const TOKYO = 'Asia/Tokyo';
const at = (iso) => Date.parse(iso);

// Offsets
check('Mexico City has no clock change', T.zoneOffsetMinutes(at('2026-07-01T12:00:00Z'), MX) === -360 && T.zoneOffsetMinutes(at('2026-01-01T12:00:00Z'), MX) === -360);
check('Los Angeles summer', T.zoneOffsetMinutes(at('2026-07-01T12:00:00Z'), LA) === -420);
check('Los Angeles winter', T.zoneOffsetMinutes(at('2026-12-01T12:00:00Z'), LA) === -480);
check('Tokyo', T.zoneOffsetMinutes(at('2026-07-01T12:00:00Z'), TOKYO) === 540);
check('bad zone', T.zoneOffsetMinutes(Date.now(), 'Nowhere/Atlantis') === null);

// Wall time to instant and back
check('instant in Mexico City', T.instantInZone('2026-10-02T07:00', MX) === at('2026-10-02T13:00:00Z'));
check('instant in Tokyo', T.instantInZone('2026-10-02T07:00', TOKYO) === at('2026-10-01T22:00:00Z'));
check('wall in zone', T.wallInZone(at('2026-10-02T13:00:00Z'), LA) === '2026-10-02T06:00');
check('midnight reads 00', T.wallInZone(at('2026-10-02T06:00:00Z'), MX) === '2026-10-02T00:00');
check('bad wall', T.instantInZone('nope', MX) === null);
// Clock changes, New York 2026: forward 8 Mar at 2:00, back 1 Nov at 2:00
check('time twice takes the first', T.instantInZone('2026-11-01T01:30', NY) === at('2026-11-01T05:30:00Z'));
const gap = T.instantInZone('2026-03-08T02:30', NY);
check('time that never happens moves on', gap === at('2026-03-08T06:30:00Z') || gap === at('2026-03-08T07:30:00Z'));
check('ordinary after the change', T.instantInZone('2026-03-09T07:00', NY) === at('2026-03-09T11:00:00Z'));

// Away
const now = at('2026-10-01T18:00:00Z');
check('same zone not away', !T.isAway(MX, MX, now));
check('same clock not away', !T.isAway(MX, 'America/Monterrey', now));
check('Los Angeles away from Mexico City', T.isAway(MX, LA, now));
check('no home not away', !T.isAway(null, LA, now) && !T.isAway(MX, null, now));

// The dose moved
check('home mode moves', T.homeDoseHere('2026-10-02T07:00', 'home', MX, LA, now) === '2026-10-02T06:00');
check('home mode to Tokyo crosses midnight', T.homeDoseHere('2026-10-02T07:00', 'home', MX, TOKYO, now) === '2026-10-02T22:00');
check('home mode westward the day before', T.homeDoseHere('2026-10-02T07:00', 'home', TOKYO, MX, now) === '2026-10-01T16:00');
check('local mode stays', T.homeDoseHere('2026-10-02T07:00', 'local', MX, LA, now) === null);
check('at home stays', T.homeDoseHere('2026-10-02T07:00', 'home', MX, MX, now) === null);
check('no home stays', T.homeDoseHere('2026-10-02T07:00', 'home', null, LA, now) === null);
check('bad zone stays', T.homeDoseHere('2026-10-02T07:00', 'home', 'Nowhere/Atlantis', LA, now) === null);

// Parsing and names
check('parse mode', T.parseTravelMode('home') === 'home' && T.parseTravelMode(null) === 'local' && T.parseTravelMode('x') === 'local');
check('zone name', T.zoneName(MX) === 'Mexico City' && T.zoneName('America/Argentina/Buenos_Aires') === 'Buenos Aires' && T.zoneName('UTC') === 'UTC' && T.zoneName('Etc/GMT+5') === 'GMT+5');
check('current zone', typeof T.currentZone() === 'string');

// Captions
check('here caption', T.hereCaption('2026-10-02T07:00', '2026-10-02T06:00') === ' · 6:00 AM here');
check('here caption other day', T.hereCaption('2026-10-02T07:00', '2026-10-01T16:00') === ' · 1 Oct, 4:00 PM here');
check('noon and midnight', T.hereCaption('2026-10-02T07:00', '2026-10-02T12:00').includes('12:00 PM') && T.hereCaption('2026-10-02T07:00', '2026-10-02T00:05').includes('12:05 AM'));
check('home time words', T.homeTimeWords('2026-10-02T07:00', MX) === '7:00 AM home time (Mexico City)');
check('away line none', T.awayLine(MX, LA, 0).includes('Every med here moves to local time'));
check('away line one', T.awayLine(MX, LA, 1).includes('1 med keeps home time'));
check('away line many', T.awayLine(MX, LA, 3).includes('3 meds keep home time'));

// Q14: a step each day
check('parse step', T.parseTravelMode('step') === 'step');
check('three choices', T.TRAVEL_MODES.map((x) => x.mode).join() === 'local,home,step');
check('step arrival day rings at the old moment', T.stepDoseHere('2026-10-02T07:00', MX, LA, '2026-10-02') === '2026-10-02T06:00');
check('step one hour is done the next day', T.stepDoseHere('2026-10-03T07:00', MX, LA, '2026-10-02') === null);
check('step to Tokyo goes the shorter way', T.stepDoseHere('2026-10-02T07:00', MX, TOKYO, '2026-10-02') === '2026-10-01T22:00');
check('step to Tokyo moves 2 hours a day', T.stepDoseHere('2026-10-03T07:00', MX, TOKYO, '2026-10-02') === '2026-10-03T00:00');
check('step to Tokyo reaches local time', T.stepDoseHere('2026-10-07T07:00', MX, TOKYO, '2026-10-02') === null);
check('step home from Tokyo starts at the old moment', T.stepDoseHere('2026-10-10T07:00', TOKYO, MX, '2026-10-10') === '2026-10-10T16:00');
check('step home from Tokyo moves the next day', T.stepDoseHere('2026-10-11T07:00', TOKYO, MX, '2026-10-10') === '2026-10-11T14:00');
check('step a smaller step', T.stepDoseHere('2026-10-03T07:00', MX, TOKYO, '2026-10-02', 60) === '2026-10-02T23:00');
check('step without a trip stays', T.stepDoseHere('2026-10-02T07:00', null, LA, '2026-10-02') === null);
check('step same zone stays', T.stepDoseHere('2026-10-02T07:00', MX, MX, '2026-10-02') === null);
check('step same clock stays', T.stepDoseHere('2026-10-02T07:00', MX, 'America/Monterrey', '2026-10-02') === null);
check('a dose before the trip is at the old moment', T.stepDoseHere('2026-10-01T07:00', MX, LA, '2026-10-02') === '2026-10-01T06:00');
const trip = { from: MX, since: '2026-10-02' };
check('one reader: home', T.doseWallHere('2026-10-02T07:00', 'home', { homeZone: MX, here: LA, trip }, now) === '2026-10-02T06:00');
check('one reader: step', T.doseWallHere('2026-10-02T07:00', 'step', { homeZone: MX, here: LA, trip }, now) === '2026-10-02T06:00');
check('one reader: step with no trip', T.doseWallHere('2026-10-02T07:00', 'step', { homeZone: MX, here: LA, trip: null }, now) === null);
check('one reader: local', T.doseWallHere('2026-10-02T07:00', 'local', { homeZone: MX, here: LA, trip }, now) === null);

// Q14: noticing the move
const first = T.noticeZone(null, MX, now, '2026-10-01');
check('first look is no trip', first.zone === MX && first.from === null && T.tripOf(first) === null);
check('same clock is no trip', T.noticeZone(first, 'America/Monterrey', now, '2026-10-02') === first);
const away = T.noticeZone(first, LA, now, '2026-10-02');
check('a new clock starts a trip today', away.zone === LA && away.from === MX && away.since === '2026-10-02');
check('trip of a trip', JSON.stringify(T.tripOf(away)) === JSON.stringify({ from: MX, since: '2026-10-02' }));
check('ask on the way out', T.shouldAskTravel(away, MX, now));
const back = T.noticeZone(away, MX, now, '2026-10-09');
check('coming home steps back from the away zone', back.from === LA && back.since === '2026-10-09');
check('never asked on the way home', !T.shouldAskTravel(back, MX, now));
check('first look never asks', !T.shouldAskTravel(first, MX, now));
check('next to ask', T.nextToAsk(away, ['a', 'b']) === 'a');
const askedA = T.markAsked(away, 'a');
check('asked once', T.nextToAsk(askedA, ['a', 'b']) === 'b' && T.markAsked(askedA, 'a') === askedA);
const answered = T.answerTravel(askedA, 'travelStep', 'b');
check('an answer is kept', answered.answers.b === 'step' && answered.asked.includes('b') && T.nextToAsk(answered, ['a', 'b']) === null);
check('an unknown button keeps nothing', T.answerTravel(askedA, 'snooze', 'b') === askedA);
check('each button its choice', T.answerTravel(away, 'travelHome', 'x').answers.x === 'home' && T.answerTravel(away, 'travelLocal', 'x').answers.x === 'local');
check('written answers leave', Object.keys(T.withoutAnswers(answered, ['b']).answers).length === 0);
check('a new trip asks afresh', T.noticeZone(answered, TOKYO, now, '2026-10-05').asked.length === 0);
check('a new trip keeps unwritten answers', T.noticeZone(answered, TOKYO, now, '2026-10-05').answers.b === 'step');
const round = T.parseTravelNotice(JSON.stringify(answered));
check('the file reads back', JSON.stringify(round) === JSON.stringify(answered));
check('a broken file reads as nothing', T.parseTravelNotice('{') === null && T.parseTravelNotice('') === null && T.parseTravelNotice('{"zone":1}') === null);
const q = T.travelQuestionText(LA, 'Levothyroxine', false);
check('question names the zone and the med', q.title.values.zone === 'Los Angeles' && q.body.values.med === 'Levothyroxine');
const qh = T.travelQuestionText(LA, 'Levothyroxine', true);
check('hidden question names no med', !JSON.stringify(qh).includes('Levothyroxine'));
check('question never changes a dose', /never the dose/.test(q.body.en) && /never the dose/.test(qh.body.en));
check('away line with a stepped med', T.awayLine(MX, LA, 1, 2).includes('1 med keeps home time, and 2 meds move a step each day'));
check('away line stepped only', T.awayLine(MX, LA, 0, 1).includes('1 med moves a step each day'));

// Wording
const all = [T.TRAVEL_LEAD, ...T.TRAVEL_MODES.flatMap((x) => [x.label, x.detail]), T.modeLine('home', MX), T.modeLine('local', MX), T.modeLine('home', null), T.modeLine('step', MX), T.awayLine(MX, LA, 1, 2),
  T.travelQuestionText(LA, 'X', false).body.en, T.travelQuestionText(LA, 'X', true).body.en, T.travelQuestionText(LA, 'X', true).title.en,
  T.awayLine(MX, LA, 0), T.awayLine(MX, LA, 2), T.homeTimeWords('2026-10-02T07:00', MX)].join('\n');
check('names the prescriber', /prescriber/.test(T.TRAVEL_LEAD));
check('never changes a dose', /never changes a dose/.test(T.TRAVEL_LEAD));
check('no advice words', !/\byou should\b|\bmust\b|\bbetter\b|\brecommend/i.test(all));
check('no dashes', !/[–—]| -- | - /.test(all));
check('no filler words', !/\b(real|genuine|genuinely)\b/i.test(all));

console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

// An appointment said in one sentence, for Schedules > Appointments (step 5
// of the voice order, 1.0.66.23). "Dentist with Dr. Lopez next Tuesday at
// 3:30 at the Main Street clinic for 45 minutes" fills what it is for, the
// type, the day, the time, who with, where and how long.
//
// THE RULES IT KEEPS.
//   - It fills the form and never saves. Every part is shown beside the
//     words it came from, and Save on the form is still the only way in.
//   - A part nobody said stays empty. A day with no clock time leaves the
//     time box empty and says so, rather than taking nine in the morning the
//     way Capture's plan reading does, since an appointment's hour is the
//     one thing that cannot be guessed.
//   - A type is set only when a word names it ("lab", "dietitian",
//     "trainer", "doctor"); otherwise the form keeps the type it had.
//   - Who and where are kept as heard, unless the words fit exactly one name
//     already used on an earlier appointment, which is then used and said
//     so. Contacts will join that list once it exists.
//
// The day and the time are lib/planSentence.ts's reading, and the length is
// lib/spokenCommand.ts's, so they read the same here as they do in Capture.
//
// Pure: no database, no React. scripts/test_spoken_appointment.js checks it.
import { readPlanSentence, type PlanPiece } from './planSentence';
import { describeDuration, readDuration } from './spokenCommand';

export type SpokenAppointmentType = 'doctor' | 'lab_draw' | 'nutritionist' | 'trainer';

export type SpokenAppointment = {
  /** What it is for, or '' when nothing was left to call it. */
  title: string;
  /** Null when no word named a type. */
  appointmentType: SpokenAppointmentType | null;
  /** 'YYYY-MM-DD', or null when no day was said. */
  date: string | null;
  /** 'HH:mm', or null when no clock time was said. */
  time: string | null;
  providerName: string | null;
  location: string | null;
  minutes: number | null;
  /** Each phrase and what it was read as. */
  pieces: PlanPiece[];
  /** What it left for the person, in plain sentences. */
  unsettled: string[];
};

/** Names already used on earlier appointments. */
export type AppointmentVocabulary = { providers?: string[]; places?: string[] };

const WEEKDAY_WORDS = /^(?:sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|days|nesday|rsday|urday)?\.?$/;
const MONTH_WORDS =
  /^(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\.?$/;
const NUMBER_WORD = /^(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|noon|midday|midnight)$/;
// Words that end a name or a place: the start of a day, a time, a length or
// another part of the sentence.
const ENDS_A_NAME = new Set([
  'at', 'on', 'next', 'this', 'tomorrow', 'today', 'tonight', 'for', 'with', 'about', 'regarding', 'to',
  'from', 'starting', 'lasting', 'around', 'by', 'every', 'each', 'and', 'morning', 'afternoon', 'evening',
]);

const TYPE_WORDS: { type: SpokenAppointmentType; pattern: RegExp; label: string }[] = [
  { type: 'lab_draw', pattern: /\b(?:labs?|lab work|bloodwork|blood work|blood tests?|blood draw|draw)\b/i, label: 'Lab / bloodwork' },
  { type: 'nutritionist', pattern: /\b(?:nutritionist|dietitian|dietician)\b/i, label: 'Nutritionist' },
  { type: 'trainer', pattern: /\b(?:trainer|personal training|training session)\b/i, label: 'Trainer' },
  {
    type: 'doctor',
    pattern: /\b(?:doctor|dr\.?|physician|gp|dentist|surgeon|specialist|check-?up|[a-z]+ologist|nurse practitioner)(?![a-z])/i,
    label: 'Doctor visit',
  },
];

// A clock time somewhere in the words: "3", "3:30", "3 pm", "noon",
// "half past two", "in 20 minutes".
const CLOCK_TIME =
  /\b(?:at|by|around|about)\s+(?:\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half past|quarter past|quarter to)\b|\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)(?![a-z])|\b\d{1,2}:\d{2}\b|\b(?:noon|midday|midnight)\b|\bin\s+(?:\d+|an?|half an?)\s+(?:hours?|minutes?|mins?)\b/i;

type Token = { word: string; start: number; end: number };

function tokens(text: string): Token[] {
  const out: Token[] = [];
  for (const match of text.matchAll(/[^\s,;]+|[,;]/g)) {
    out.push({ word: match[0], start: match.index!, end: match.index! + match[0].length });
  }
  return out;
}

function bare(word: string): string {
  return word.toLowerCase().replace(/[.!?:]+$/, '');
}

function endsAName(list: Token[], i: number): boolean {
  const word = bare(list[i].word);
  if (word === ',' || word === ';') return true;
  if (/^\d/.test(word)) return true;
  if (WEEKDAY_WORDS.test(word) || MONTH_WORDS.test(word)) return true;
  if (word === 'in') {
    const next = list[i + 1] ? bare(list[i + 1].word) : '';
    return /^\d/.test(next) || NUMBER_WORD.test(next);
  }
  return ENDS_A_NAME.has(word);
}

// A run of words after "with" or "at", up to whatever starts the next part.
function takeRun(list: Token[], from: number): { first: number; last: number } | null {
  let last = from - 1;
  for (let i = from; i < list.length && !endsAName(list, i); i += 1) last = i;
  return last >= from ? { first: from, last } : null;
}

function isTimeAfterAt(list: Token[], i: number): boolean {
  const next = list[i] ? bare(list[i].word) : '';
  return !next || /^\d/.test(next) || NUMBER_WORD.test(next);
}

function tidyName(text: string): string {
  const out = text.replace(/[.,;]+$/, '').replace(/^the\s+/i, '').trim();
  return out ? out[0].toUpperCase() + out.slice(1) : '';
}

function nameWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !['dr', 'doctor', 'the', 'mr', 'mrs', 'ms', 'miss', 'prof', 'professor'].includes(word));
}

/** The one earlier name every heard word fits, or null when none or several do. */
export function matchKnownName(heard: string, known: readonly string[]): { name: string } | { several: string[] } | null {
  const said = nameWords(heard);
  if (said.length === 0) return null;
  const fits = [...new Set(known.map((name) => name.trim()).filter(Boolean))].filter((name) => {
    const words = nameWords(name);
    return said.every((word) => words.includes(word));
  });
  if (fits.length === 1) return { name: fits[0] };
  return fits.length > 1 ? { several: fits } : null;
}

function joinQuoted(names: string[]): string {
  const quoted = names.map((name) => `“${name}”`);
  return quoted.length <= 1 ? quoted.join('') : `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;
}

/** Reads one spoken sentence into the appointment form's boxes. Null for blank words. */
export function readSpokenAppointment(text: string, now: Date, vocab: AppointmentVocabulary = {}): SpokenAppointment | null {
  if (typeof text !== 'string' || !text.trim()) return null;
  const pieces: PlanPiece[] = [];
  const unsettled: string[] = [];
  // Parts taken out are blanked with spaces, so positions stay put.
  let rest = text;
  const blank = (start: number, end: number) => {
    rest = rest.slice(0, start) + ' '.repeat(end - start) + rest.slice(end);
  };

  // How long: "for 45 minutes", "lasting an hour and a half".
  let minutes: number | null = null;
  for (const match of rest.toLowerCase().matchAll(/\b(?:for|lasting)\s+/g)) {
    const from = match.index! + match[0].length;
    const length = readDuration(rest.slice(from));
    if (!length) continue;
    if (length.minutes >= 1 && length.minutes <= 1440) {
      minutes = length.minutes;
      pieces.push({ words: rest.slice(match.index!, from + length.used).trim(), reads: describeDuration(length.minutes) });
    } else {
      unsettled.push(`“${rest.slice(from, from + length.used).trim()}” is longer than a day, so the length was left empty.`);
    }
    blank(match.index!, from + length.used);
    break;
  }

  // Who with: "with Dr. Lopez".
  let providerName: string | null = null;
  {
    const list = tokens(rest);
    const at = list.findIndex((token) => bare(token.word) === 'with');
    const run = at >= 0 ? takeRun(list, at + 1) : null;
    if (run) {
      const heard = tidyName(rest.slice(list[run.first].start, list[run.last].end));
      const known = matchKnownName(heard, vocab.providers ?? []);
      if (known && 'name' in known) {
        providerName = known.name;
        pieces.push({ words: `with ${heard}`, reads: `${known.name}, the name on an earlier appointment` });
      } else {
        providerName = heard;
        pieces.push({ words: `with ${heard}`, reads: `Who with: ${heard}` });
        if (known) unsettled.push(`${joinQuoted(known.several)} all fit “${heard}”, so the name was kept as said.`);
      }
      blank(list[at].start, list[run.last].end);
    }
  }

  // Where: "at the Main Street clinic". "at 3" is a time and stays for the
  // day and time reading below.
  let location: string | null = null;
  {
    const list = tokens(rest);
    for (let i = 0; i < list.length; i += 1) {
      if (bare(list[i].word) !== 'at' || isTimeAfterAt(list, i + 1)) continue;
      const run = takeRun(list, i + 1);
      if (!run) continue;
      const heard = tidyName(rest.slice(list[run.first].start, list[run.last].end));
      const known = matchKnownName(heard, vocab.places ?? []);
      if (known && 'name' in known) {
        location = known.name;
        pieces.push({ words: `at ${heard}`, reads: `${known.name}, the place on an earlier appointment` });
      } else {
        location = heard;
        pieces.push({ words: `at ${heard}`, reads: `Where: ${heard}` });
        if (known) unsettled.push(`${joinQuoted(known.several)} all fit “${heard}”, so the place was kept as said.`);
      }
      blank(list[i].start, list[run.last].end);
      break;
    }
  }

  // The day, the time and what it is for.
  const reading = readPlanSentence(rest, now);
  let title = '';
  let date: string | null = null;
  let time: string | null = null;
  if (reading) {
    title = reading.action;
    pieces.push(...reading.pieces);
    if (reading.start) {
      date = reading.start.date;
      if (!reading.timeAssumed) time = reading.start.time;
    }
    // "Tuesday morning" reads as nine o'clock in Capture. For a visit that is
    // a guess at the hour, so only a clock time is taken.
    if (time && !CLOCK_TIME.test(rest)) {
      time = null;
      const loose = /\b(?:morning|afternoon|evening|night|tonight|lunchtime|after lunch|before lunch)\b/i.exec(rest);
      if (loose) {
        const at = pieces.findIndex((piece) => piece.words.toLowerCase().includes(loose[0].toLowerCase()) && !/^Every/.test(piece.reads));
        if (at >= 0) pieces.splice(at, 1);
        unsettled.push(`“${loose[0]}” is not a clock time, so the time was left empty.`);
      }
    }
    for (const note of reading.unsettled) {
      // Capture's note about doses and meals is about reminders, not visits.
      if (!/My Meds/.test(note)) unsettled.push(note);
    }
    if (reading.repeat.type !== 'none') {
      unsettled.push('An appointment is kept one visit at a time, so only the first visit was filled in.');
    }
    if (reading.blocked && date && /already gone by/.test(reading.blocked)) unsettled.push(reading.blocked);
  } else {
    title = rest.replace(/\s+/g, ' ').replace(/^[\s,.;:]+|[\s,.;:]+$/g, '').trim();
    title = title.replace(/^(?:i have|i've got|i got|there's|there is|book|make|add)\s+(?:an?\s+)?/i, '');
    title = title ? title[0].toUpperCase() + title.slice(1) : '';
  }
  if (date && !time) unsettled.push('No clock time was said, so the time was left empty. Say one, for example “at 3:30 pm”, or set it below.');
  if (!date) unsettled.push('No day was said, so the date was left as it was.');
  if (!title) unsettled.push('Nothing was left to call it once the rest was read. Say what it is for, for example “dentist”.');

  // The type, from the whole sentence, since "with Dr. Lopez" names a doctor.
  let appointmentType: SpokenAppointmentType | null = null;
  for (const option of TYPE_WORDS) {
    const found = option.pattern.exec(text);
    if (found) {
      appointmentType = option.type;
      pieces.push({ words: found[0], reads: `Type: ${option.label}` });
      break;
    }
  }
  if (!appointmentType) unsettled.push('No word named the kind of visit, so the type was left as it was.');

  return { title, appointmentType, date, time, providerName, location, minutes, pieces, unsettled };
}

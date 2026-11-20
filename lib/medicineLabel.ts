// A11 (1.0.53.36), reshaped by direct instruction 2026-09-26: the app shows
// the manufacturer's own label for the exact medicine in the person's hand,
// word for word, and writes no interaction rules about prescriptions of its
// own. "Reshape A11 that way and drop the rule library. Make sure the app
// makes it clear about the data being retrieved, and that it never defaults
// to something else if it can't find the searched item."
//
// So three things hold everywhere in this file:
//
//   1. A code is matched exactly. A scanned or typed NDC is turned into the
//      handful of spellings the same ten digits can take, and a label is
//      kept only when openFDA lists one of those spellings on it. Nothing
//      found means "not found", said as such, with nothing in its place.
//   2. A name search never picks for the person. Every label carrying the
//      name is listed with its maker and date, combination products marked,
//      and the person taps the one on their package.
//   3. Every screen that shows a label says where it came from, what was
//      sent to get it, when, and which version of the document it is.
//
// Pure, with no React and no network, so scripts/test_medicine_label.js
// checks every reading, query and sentence. lib/medicineLabelLookup.ts does
// the fetching and lib/medicineLabelDb.ts keeps a copy with a med.

export const OPENFDA_LABEL_URL = 'https://api.fda.gov/drug/label.json';
export const NAME_SEARCH_LIMIT = 100;

// ---------------------------------------------------------------------------
// Reading a code

export type CodeReading =
  // One or more exact spellings to look for, all naming the same product
  // or package. `shown` is the code as the person will see it echoed back.
  | { kind: 'ndc'; field: 'package_ndc' | 'product_ndc'; codes: string[]; shown: string }
  // A retail barcode from outside the United States.
  | { kind: 'not_us'; shown: string; issuedIn: string | null }
  // Anything else: a pharmacy's own barcode, a store product, a typo.
  | { kind: 'unreadable'; shown: string };

// The three ways ten NDC digits are split: labeler-product-package.
function tenDigitSpellings(d: string): string[] {
  return [
    `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`,
    `${d.slice(0, 5)}-${d.slice(5, 8)}-${d.slice(8)}`,
    `${d.slice(0, 5)}-${d.slice(5, 9)}-${d.slice(9)}`,
  ];
}

// The eleven-digit billing form pads one segment with a leading zero to
// make 5-4-2. Each segment that starts with a zero could be the padded one.
function elevenDigitSpellings(labeler: string, product: string, pkg: string): string[] {
  const out: string[] = [];
  if (labeler.startsWith('0')) out.push(`${labeler.slice(1)}-${product}-${pkg}`);
  if (product.startsWith('0')) out.push(`${labeler}-${product.slice(1)}-${pkg}`);
  if (pkg.startsWith('0')) out.push(`${labeler}-${product}-${pkg.slice(1)}`);
  return out;
}

const VALID_PACKAGE_SHAPES = new Set(['4-4-2', '5-3-2', '5-4-1']);
const VALID_PRODUCT_SHAPES = new Set(['4-4', '5-3', '5-4']);

// Where a retail code was issued, by its GS1 prefix, for the few a person
// using this app is likely to be holding. The prefix says where the code
// was issued, not where the medicine was made, and the sentence says that.
const GS1_PREFIXES: [number, number, string][] = [
  [750, 750, 'Mexico'],
  [754, 755, 'Canada'],
  [300, 379, 'France'],
  [400, 440, 'Germany'],
  [450, 459, 'Japan'],
  [490, 499, 'Japan'],
  [500, 509, 'the United Kingdom'],
  [840, 849, 'Spain'],
  [930, 939, 'Australia'],
  [640, 649, 'Finland'],
  [700, 709, 'Norway'],
  [730, 739, 'Sweden'],
  [740, 745, 'Central America'],
  [746, 746, 'the Dominican Republic'],
  [759, 759, 'Venezuela'],
  [770, 771, 'Colombia'],
  [773, 773, 'Uruguay'],
  [775, 775, 'Peru'],
  [777, 777, 'Bolivia'],
  [778, 779, 'Argentina'],
  [780, 780, 'Chile'],
  [784, 784, 'Paraguay'],
  [786, 786, 'Ecuador'],
];

function issuedIn(prefix3: string): string | null {
  const n = Number(prefix3);
  for (const [lo, hi, where] of GS1_PREFIXES) if (n >= lo && n <= hi) return where;
  return null;
}

function fromTenDigits(d: string, shown: string): CodeReading {
  return { kind: 'ndc', field: 'package_ndc', codes: tenDigitSpellings(d), shown };
}

/**
 * A code read by the camera. A U.S. medicine package carries its NDC in a
 * UPC-A barcode (number system 3) or, on prescription packages since 2023,
 * inside the GTIN of a GS1 DataMatrix. Android often reports a UPC-A as a
 * thirteen-digit EAN with a leading zero.
 */
export function readScannedCode(raw: string): CodeReading {
  const text = (raw ?? '').trim();
  // GS1 DataMatrix: an optional symbology id, an optional FNC1, then
  // application identifier 01 and a fourteen-digit GTIN. The printed form
  // puts the identifier in brackets.
  const gs1 = text.match(/^(?:\]d2)?\x1d?01(\d{14})/) ?? text.match(/\(01\)(\d{14})/);
  if (gs1) {
    const gtin = gs1[1];
    if (gtin.slice(1, 3) === '03') return fromTenDigits(gtin.slice(3, 13), gtin.slice(3, 13));
    return { kind: 'not_us', shown: gtin, issuedIn: issuedIn(gtin.slice(1, 4)) };
  }
  const digits = text.replace(/\D/g, '');
  if (digits.length !== text.length) return { kind: 'unreadable', shown: text };
  if (digits.length === 13 && digits.startsWith('0')) return readScannedCode(digits.slice(1));
  if (digits.length === 12) {
    if (digits.startsWith('3')) return fromTenDigits(digits.slice(1, 11), digits.slice(1, 11));
    return { kind: 'unreadable', shown: digits };
  }
  if (digits.length === 13) return { kind: 'not_us', shown: digits, issuedIn: issuedIn(digits.slice(0, 3)) };
  return { kind: 'unreadable', shown: text };
}

/**
 * A code the person typed from a box or a pharmacy label, with or without
 * its hyphens, in the ten-digit form, the eleven-digit billing form, or the
 * two-part product code.
 */
export function readTypedCode(raw: string): CodeReading {
  const text = (raw ?? '').trim().replace(/\s+/g, '');
  if (!text) return { kind: 'unreadable', shown: '' };
  if (/^\d+(-\d+)+$/.test(text)) {
    const parts = text.split('-');
    const shape = parts.map((p) => p.length).join('-');
    if (VALID_PACKAGE_SHAPES.has(shape)) return { kind: 'ndc', field: 'package_ndc', codes: [text], shown: text };
    if (shape === '5-4-2') {
      const codes = elevenDigitSpellings(parts[0], parts[1], parts[2]);
      return codes.length ? { kind: 'ndc', field: 'package_ndc', codes, shown: text } : { kind: 'unreadable', shown: text };
    }
    if (VALID_PRODUCT_SHAPES.has(shape)) return { kind: 'ndc', field: 'product_ndc', codes: [text], shown: text };
    return { kind: 'unreadable', shown: text };
  }
  if (!/^\d+$/.test(text)) return { kind: 'unreadable', shown: text };
  if (text.length === 10) return fromTenDigits(text, text);
  if (text.length === 11) {
    const codes = elevenDigitSpellings(text.slice(0, 5), text.slice(5, 9), text.slice(9));
    return codes.length ? { kind: 'ndc', field: 'package_ndc', codes, shown: text } : { kind: 'unreadable', shown: text };
  }
  if (text.length === 12 || text.length === 13) return readScannedCode(text);
  if (text.length === 8) {
    return { kind: 'ndc', field: 'product_ndc', codes: [`${text.slice(0, 4)}-${text.slice(4)}`, `${text.slice(0, 5)}-${text.slice(5)}`], shown: text };
  }
  if (text.length === 9) return { kind: 'ndc', field: 'product_ndc', codes: [`${text.slice(0, 5)}-${text.slice(5)}`], shown: text };
  return { kind: 'unreadable', shown: text };
}

// ---------------------------------------------------------------------------
// What gets sent

// Letters in any alphabet (so levotiroxina sódica keeps its accent),
// digits, spaces and the punctuation drug names use. Anything else is
// dropped rather than passed into the search. Before 1.0.95.2 every
// accented letter was dropped, which cut "sódica" into "s dica".
export function cleanMedicineName(raw: string): string {
  return (raw ?? '')
    .replace(/[^\p{L}\p{N} .,/+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The name without accents, the way openFDA spells every U.S. name. */
export function plainLetters(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '');
}

function quoted(field: string, value: string): string {
  return `${field}:${encodeURIComponent(`"${value}"`)}`;
}

export function codeQueryUrl(reading: Extract<CodeReading, { kind: 'ndc' }>): string {
  const terms = reading.codes.map((c) => quoted(`openfda.${reading.field}`, c)).join('+');
  return `${OPENFDA_LABEL_URL}?search=${terms}&limit=10`;
}

export function nameQueryUrl(name: string): string {
  const clean = plainLetters(cleanMedicineName(name));
  const terms = [quoted('openfda.generic_name', clean), quoted('openfda.brand_name', clean)].join('+');
  return `${OPENFDA_LABEL_URL}?search=${terms}&limit=${NAME_SEARCH_LIMIT}`;
}

export function setIdQueryUrl(setId: string): string {
  return `${OPENFDA_LABEL_URL}?search=${quoted('set_id', setId)}&limit=1`;
}

export function dailyMedUrl(setId: string): string {
  return `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(setId)}`;
}

// ---------------------------------------------------------------------------
// The label itself

export type LabelSection = { key: string; heading: string; text: string };

export type LabelDocument = {
  setId: string;
  version: string;
  effective: string | null; // YYYY-MM-DD
  brand: string | null;
  generic: string | null;
  maker: string | null;
  productType: string | null; // 'Prescription' | 'Over the counter' | as filed
  isCombination: boolean;
  packageNdcs: string[];
  productNdcs: string[];
  sections: LabelSection[];
};

// The sections a person needs to see about safety and interactions, in the
// order a label prints them, with the heading each carries on the label.
// Prescription labels in the current format, older prescription labels and
// over-the-counter Drug Facts use different sections, so all three sets are
// here and a label shows whichever it has.
export const LABEL_SECTIONS: readonly [string, string][] = [
  ['boxed_warning', 'Boxed warning'],
  ['active_ingredient', 'Active ingredient'],
  ['purpose', 'Purpose'],
  ['indications_and_usage', 'Indications and usage'],
  ['contraindications', 'Contraindications'],
  ['warnings_and_cautions', 'Warnings and precautions'],
  ['warnings', 'Warnings'],
  ['do_not_use', 'Do not use'],
  ['ask_doctor', 'Ask a doctor before use if you have'],
  ['ask_doctor_or_pharmacist', 'Ask a doctor or pharmacist before use if you are'],
  ['when_using', 'When using this product'],
  ['stop_use', 'Stop use and ask a doctor if'],
  ['pregnancy_or_breast_feeding', 'If pregnant or breast-feeding'],
  ['precautions', 'Precautions'],
  ['geriatric_use', 'Geriatric use'],
  ['drug_interactions', 'Drug interactions'],
  ['dosage_and_administration', 'Dosage and administration'],
  ['directions', 'Directions'],
  ['information_for_patients', 'Information for patients'],
  ['clinical_pharmacology', 'Clinical pharmacology'],
  ['spl_medguide', 'Medication guide'],
  ['spl_patient_package_insert', 'Patient information'],
  ['spl_unclassified_section', 'Other text on the label'],
];

function first(list: unknown): string | null {
  return Array.isArray(list) && typeof list[0] === 'string' && list[0].trim() ? list[0].trim() : null;
}

function strings(list: unknown): string[] {
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

function titleCase(s: string | null): string | null {
  if (!s) return null;
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function isoDate(yyyymmdd: unknown): string | null {
  if (typeof yyyymmdd !== 'string' || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6)}`;
}

function productTypeLabel(raw: string | null): string | null {
  if (!raw) return null;
  if (raw === 'HUMAN PRESCRIPTION DRUG') return 'Prescription';
  if (raw === 'HUMAN OTC DRUG') return 'Over the counter';
  return titleCase(raw);
}

/** One openFDA result as a document, or null when it cannot be named. */
export function toLabelDocument(result: unknown): LabelDocument | null {
  if (!result || typeof result !== 'object') return null;
  const r = result as Record<string, unknown>;
  const setId = typeof r.set_id === 'string' ? r.set_id : null;
  if (!setId) return null;
  const fda = (r.openfda && typeof r.openfda === 'object' ? r.openfda : {}) as Record<string, unknown>;
  const generic = titleCase(first(fda.generic_name));
  const brand = titleCase(first(fda.brand_name));
  // A label that openFDA could not tie to a product carries no names, and
  // nothing on screen could tell the person which medicine it is.
  if (!generic && !brand) return null;
  const sections: LabelSection[] = [];
  for (const [key, heading] of LABEL_SECTIONS) {
    const text = strings(r[key]).join('\n\n').trim();
    if (text) sections.push({ key, heading, text });
  }
  return {
    setId,
    version: typeof r.version === 'string' ? r.version : String(r.version ?? ''),
    effective: isoDate(r.effective_time),
    brand,
    generic,
    maker: titleCase(first(fda.manufacturer_name)),
    productType: productTypeLabel(first(fda.product_type)),
    isCombination: !!generic && /\sand\s|,/i.test(generic),
    packageNdcs: strings(fda.package_ndc),
    productNdcs: strings(fda.product_ndc),
    sections,
  };
}

// ---------------------------------------------------------------------------
// Deciding what came back

export type LookupAsk =
  | { kind: 'code'; reading: Extract<CodeReading, { kind: 'ndc' }> }
  | { kind: 'name'; name: string }
  | { kind: 'setId'; setId: string };

export type LookupResult =
  | { kind: 'found'; labels: LabelDocument[]; total: number }
  | { kind: 'not_found' };

/**
 * Keeps only the labels that match what was asked for exactly. A code
 * keeps a label only when that label lists one of the code's spellings; a
 * name keeps a label only when its generic or brand name holds the name as
 * whole words; a document number keeps only that document. Newest first,
 * and nothing is ever chosen here.
 */
export function matchLabels(ask: LookupAsk, results: unknown[], total: number): LookupResult {
  const docs = results.map(toLabelDocument).filter((d): d is LabelDocument => d !== null);
  let kept: LabelDocument[];
  if (ask.kind === 'code') {
    const wanted = new Set(ask.reading.codes);
    kept = docs.filter((d) => (ask.reading.field === 'package_ndc' ? d.packageNdcs : d.productNdcs).some((c) => wanted.has(c)));
  } else if (ask.kind === 'name') {
    const words = plainLetters(cleanMedicineName(ask.name)).toLowerCase();
    const pattern = new RegExp(`(^|[^a-z0-9])${words.replace(/[.+/]/g, (c) => `\\${c}`)}($|[^a-z0-9])`);
    kept = docs.filter((d) => [d.generic, d.brand].some((n) => !!n && pattern.test(plainLetters(n).toLowerCase())));
  } else {
    kept = docs.filter((d) => d.setId === ask.setId);
  }
  const seen = new Set<string>();
  kept = kept.filter((d) => (seen.has(d.setId) ? false : (seen.add(d.setId), true)));
  kept.sort((a, b) => (b.effective ?? '').localeCompare(a.effective ?? ''));
  if (kept.length === 0) return { kind: 'not_found' };
  return { kind: 'found', labels: kept, total: ask.kind === 'name' ? Math.max(total, kept.length) : kept.length };
}

// ---------------------------------------------------------------------------
// A section's sentences (A11c). A rule is started from one sentence the
// person picks, so a section's text is cut into its sentences exactly as
// printed: nothing is reworded, joined or dropped except the spaces between
// them. A cut falls after . ! or ? (and any closing quote or bracket) when
// a capital, a digit, a bullet or an opening bracket follows, never after
// an abbreviation or a single initial.

const NOT_A_SENTENCE_END = new Set(['e.g', 'i.e', 'approx', 'dr', 'mr', 'mrs', 'ms', 'no', 'vs', 'fig', 'inc', 'st', 'u.s', 'min', 'max']);

export function labelSentences(text: string): string[] {
  const sentences: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let start = 0;
    let i = 0;
    while (i < paragraph.length) {
      const ch = paragraph[i];
      if (ch === '.' || ch === '!' || ch === '?') {
        let end = i + 1;
        while (end < paragraph.length && /["'”’)\]]/.test(paragraph[end])) end += 1;
        let next = end;
        while (next < paragraph.length && /\s/.test(paragraph[next])) next += 1;
        const spaced = next > end;
        const follows = paragraph[next];
        const word = (paragraph.slice(start, i).match(/([A-Za-z.]+)$/)?.[1] ?? '').toLowerCase();
        const abbreviation = ch === '.' && (NOT_A_SENTENCE_END.has(word) || /^[a-z]$/.test(word));
        if (spaced && follows && /[A-Z0-9•(\[“"]/.test(follows) && !abbreviation) {
          const sentence = paragraph.slice(start, end).trim();
          if (sentence) sentences.push(sentence);
          start = next;
          i = next;
          continue;
        }
      }
      i += 1;
    }
    const rest = paragraph.slice(start).trim();
    if (rest) sentences.push(rest);
  }
  return sentences;
}

/** The section text split around a quoted sentence, or null when the text no longer holds it word for word. */
export function markSentence(text: string, sentence: string): { before: string; sentence: string; after: string } | null {
  const at = sentence ? text.indexOf(sentence) : -1;
  if (at < 0) return null;
  return { before: text.slice(0, at), sentence, after: text.slice(at + sentence.length) };
}

// ---------------------------------------------------------------------------
// Sentences

export function readableDate(iso: string | null): string {
  if (!iso) return 'an unknown date';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (!y || !m || !d) return iso;
  return `${d} ${months[m - 1]} ${y}`;
}

export function whatWasSent(ask: LookupAsk): string {
  if (ask.kind === 'code') return `the code ${ask.reading.shown}`;
  if (ask.kind === 'name') return `the name "${cleanMedicineName(ask.name)}"`;
  return "the label's document number";
}

/** Where the text came from, what was sent for it, and when. */
export function retrievalStatement(sent: string, retrievedAtIso: string): string {
  return `Retrieved from openFDA, the U.S. Food and Drug Administration's public data service, on ${readableDate(retrievedAtIso)}. What was sent to get it: ${sent}. Nothing about you or your other medicines was sent.`;
}

/** Which document this is. */
export function labelIdentity(doc: LabelDocument): string {
  const who = doc.maker ? ` Filed by ${doc.maker}${doc.maker.endsWith('.') ? '' : '.'}` : '';
  return `Label version ${doc.version || 'not given'}, effective ${readableDate(doc.effective)}.${who} Document ${doc.setId}.`;
}

/** What the text is, and what the app does not do with it. */
export const LABEL_SOURCE_NOTE =
  "This is the manufacturer's label as filed with the FDA, shown word for word. Lifestead does not check it against your other medicines or your meals. A pharmacist can check all of your medicines together.";

export const LABEL_FDA_CAVEAT =
  'openFDA says this text has not been altered or verified by the FDA, and it may not match the labeling on the package you have. Tables on the label appear here as plain text; DailyMed shows the full layout.';

export const SAVED_COPY_NOTE = 'This is the copy you kept. It does not change by itself; Check for a Newer Version asks openFDA again.';

export function labelName(doc: LabelDocument): string {
  if (doc.brand && doc.generic && doc.brand.toLowerCase() !== doc.generic.toLowerCase()) return `${doc.brand} (${doc.generic})`;
  return doc.brand ?? doc.generic ?? 'Unnamed label';
}

/** The one-line caption under a label in a list to pick from. */
export function labelCaption(doc: LabelDocument): string {
  const parts = [
    doc.maker ?? 'Maker not given',
    doc.productType,
    doc.effective ? `effective ${readableDate(doc.effective)}` : null,
    doc.isCombination ? `Combination product: ${doc.generic}` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function pickPrompt(ask: LookupAsk, shown: number, total: number): string {
  if (ask.kind === 'code') {
    if (shown === 1) return 'One label lists this code. Tap it to read it, and check that the maker matches your package.';
    return 'More than one label lists this code. Pick the one that matches your package; the maker is printed on the box or the pharmacy label.';
  }
  const more =
    total > shown
      ? ` Showing ${shown} of the ${total} openFDA holds. Scanning the barcode or typing the code from the box finds the exact one.`
      : '';
  const count = shown === 1 ? 'One label carries' : `${shown} labels carry`;
  return `${count} this name. Nothing opens until you pick; choose the one whose maker matches your package.${more}`;
}

export function notFoundMessage(ask: LookupAsk): string {
  if (ask.kind === 'code') {
    return `openFDA has no label for the code ${ask.reading.shown}. Nothing else is shown in its place. Check the code against the box or the pharmacy label, or search by the medicine's name.`;
  }
  if (ask.kind === 'name') {
    return `openFDA has no label with the name "${cleanMedicineName(ask.name)}". Nothing else is shown in its place. Check the spelling, or try the brand name or the generic name.`;
  }
  return 'openFDA no longer lists this label. Your kept copy stays as it is.';
}

export function notADrugCodeMessage(reading: Exclude<CodeReading, { kind: 'ndc' }>): string {
  if (reading.kind === 'not_us') {
    const where = reading.issuedIn ? `a retail code issued in ${reading.issuedIn}` : 'a retail code issued outside the United States';
    return `This is ${where}, not a U.S. drug code. openFDA holds only U.S. labels, so there is nothing to look up for it there, and nothing else is shown in its place. ${countryMedicineNote(reading.issuedIn)} ${OUTSIDE_US_WAYS}`;
  }
  return "This is not a U.S. drug code (NDC). A pharmacy's barcode usually holds its prescription number instead. The NDC is often printed on the pharmacy label or the manufacturer's box as 10 or 11 digits, and you can type it in. Nothing was looked up.";
}

export function unreachableMessage(status: number | null): string {
  return status === null
    ? 'Could not reach openFDA, so nothing was looked up. Check the connection and try again.'
    : `openFDA answered with an error (status ${status}), so nothing is shown. Try again in a minute.`;
}

export function versionCheckMessage(saved: LabelDocument, current: LabelDocument): string {
  if (saved.version === current.version) return `Your kept copy is still the current version (version ${saved.version}).`;
  return `openFDA has version ${current.version}, effective ${readableDate(current.effective)}. Your kept copy is version ${saved.version}. Nothing changes unless you replace it.`;
}

// Codes from outside the U.S. drug system (2026-11-18). A Mexican bottle,
// like most of the world's, carries a retail barcode (EAN-13, UPC-A or
// EAN-8, or a GTIN inside a DataMatrix). openFDA holds none of them, so the
// screen asks the Open Facts databases instead, and the person can tie the
// code to one of their meds so a second scan names it.

/** The digits of a retail barcode worth sending to Open Food Facts, or null. */
export function retailCodeOf(reading: CodeReading): string | null {
  if (reading.kind === 'ndc') return null;
  const d = reading.shown.trim();
  if (!/^\d+$/.test(d)) return null;
  if (![8, 12, 13, 14].includes(d.length)) return null;
  return normalRetailDigits(d);
}

function normalRetailDigits(d: string): string {
  let out = d;
  if (out.length === 14 && out.startsWith('0')) out = out.slice(1);
  if (out.length === 13 && out.startsWith('0')) out = out.slice(1);
  return out;
}

/** How a code is kept in med_barcodes, so a scan and a typed code match. */
export function codeKey(reading: CodeReading): string | null {
  if (reading.kind === 'ndc') {
    const digits = reading.shown.replace(/\D/g, '');
    return digits ? `ndc:${digits}` : null;
  }
  const retail = retailCodeOf(reading);
  if (retail) return retail;
  const text = reading.shown.trim();
  return text || null;
}

export function rememberedMedMessage(name: string): string {
  return `This is the bottle you keep as ${name} in My Meds.`;
}

export const OPEN_FACTS_CAVEAT =
  'The people who use these databases typed this in from the package; the maker did not, and nobody checks it against the bottle. Read the label you hold before relying on any amount here.';

export function openFactsNotFoundMessage(retail: string): string {
  return `No database asked holds ${retail}, so nothing is shown in its place. In My Meds a photo of the label reads its ingredients and amounts, and a picture of the label saved from a store page online usually reads best.`;
}

/**
 * The line for openFDA when a retail code was scanned: it is never asked,
 * since it holds only U.S. drug codes, and the screen says so beside what
 * the other databases answered (Tony, 2026-11-19).
 */
export function openFdaNotAskedLine(reading: Exclude<CodeReading, { kind: 'ndc' }>): string {
  const where = reading.kind === 'not_us' && reading.issuedIn ? `a retail code issued in ${reading.issuedIn}` : 'a retail code';
  return `openFDA: not asked. This is ${where}, and openFDA holds only U.S. drug codes.`;
}

export function openFactsUnreachableMessage(): string {
  return 'None of the three databases could be reached, so nothing was looked up for this code. Check the connection and try again.';
}

// ---------------------------------------------------------------------------
// A name from another country (1.0.95.2, Tony 2026-11-20: "maybe there is
// possibly a way the meds could be cross correlated to US versions that are
// the same other than their name"). openFDA holds only U.S. names, so a name
// it does not know goes to RxNorm, the U.S. National Library of Medicine's
// list of medicine names, which also holds international and Spanish names
// (paracetamol, levotiroxina, metamizol) and brands sold elsewhere (Eutirox).
// RxNorm answers with the U.S. ingredient name, and openFDA is asked again
// with that. The screen says every step, and says that a label for the same
// ingredient is not a label for the box. Checked live 2026-11-20: free, no
// key, and open to a browser (CORS *), so the computer asks it too.

export const RXNAV_BASE = 'https://rxnav.nlm.nih.gov/REST';

export function rxnavApproximateUrl(name: string): string {
  return `${RXNAV_BASE}/approximateTerm.json?term=${encodeURIComponent(plainLetters(cleanMedicineName(name)))}&maxEntries=4`;
}

export function rxnavIngredientsUrl(rxcui: string): string {
  return `${RXNAV_BASE}/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=IN`;
}

/** RxNorm's closest concept for a name, or null when it has none. */
export function bestRxcui(body: unknown): string | null {
  const candidates = (body as { approximateGroup?: { candidate?: unknown } } | null)?.approximateGroup?.candidate;
  if (!Array.isArray(candidates)) return null;
  const top = candidates.find((c) => c && typeof c === 'object' && String((c as { rank?: unknown }).rank) === '1') as
    | { rxcui?: unknown }
    | undefined;
  return top && typeof top.rxcui === 'string' && top.rxcui ? top.rxcui : null;
}

/** The U.S. ingredient names RxNorm ties to a concept, in its order. */
export function ingredientNames(body: unknown): string[] {
  const groups = (body as { relatedGroup?: { conceptGroup?: unknown } } | null)?.relatedGroup?.conceptGroup;
  if (!Array.isArray(groups)) return [];
  const names: string[] = [];
  for (const group of groups) {
    const props = (group as { conceptProperties?: unknown } | null)?.conceptProperties;
    if (!Array.isArray(props)) continue;
    for (const p of props) {
      const name = (p as { name?: unknown } | null)?.name;
      if (typeof name === 'string' && name.trim() && !names.includes(name.trim())) names.push(name.trim());
    }
  }
  return names;
}

/** The name openFDA is asked for after RxNorm, or null when nothing new was learned. */
export function crossedName(typed: string, ingredients: string[]): string | null {
  if (ingredients.length === 0) return null;
  // U.S. names for a mix mostly run alphabetically (amoxicillin and clavulanate).
  const name = [...ingredients].sort((a, b) => a.localeCompare(b)).join(' and ');
  const same = plainLetters(cleanMedicineName(typed)).toLowerCase() === plainLetters(name).toLowerCase();
  return same ? null : name;
}

export function crossingNote(typed: string, usName: string): string {
  return `openFDA has no U.S. label named "${cleanMedicineName(typed)}". RxNorm, the U.S. National Library of Medicine's list of medicine names, gives its U.S. ingredient name as ${usName}, so these are U.S. labels for ${usName}. They are labels for the same active ingredient, not for your box: the strength, the other ingredients and the form can differ, so check them against the box you hold.`;
}

export function crossingSent(typed: string, usName: string): string {
  return `the name "${cleanMedicineName(typed)}" to RxNorm, then the name "${usName}" to openFDA`;
}

export function crossingNotFoundMessage(typed: string, usName: string): string {
  return `openFDA has no label with the name "${cleanMedicineName(typed)}". RxNorm gives its U.S. ingredient name as ${usName}, and openFDA has no label for that either. Nothing else is shown in its place.`;
}

// ---------------------------------------------------------------------------
// What each country publishes (1.0.95.2, Tony 2026-11-20: "If it cannot be
// done and this is a true limitation, it needs to be said in the app in that
// area"). Checked 2026-11-20 for the countries whose languages the app is
// meant to ship in, plus Mexico and Latin America. Sources: AEMPS CIMA REST
// (live, open), ANSM BDPM (monthly files), Fimea (XML file), DMP FEST (file),
// NHSBSA dm+d (NHS TRUD account), PZN (licensed), PMDA (registration, no
// scraping), TGA ARTG (no API), COFEPRIS (no API), Health Canada DPD (live,
// open, by DIN; asked since 1.0.95.3). The file-only lists (France, Finland,
// Norway) are deliberately not carried in the app (Tony 2026-11-20: "state
// in the app ... that they are not from an automatic service so they are not
// updated automatically and that is why we don't have them").

const COUNTRY_NOTES: Record<string, string> = {
  Mexico: "COFEPRIS, Mexico's medicines regulator, publishes no list an app can ask, so no app can look up a Mexican box by its barcode.",
  Canada: "Health Canada's Drug Product Database is searched by the DIN, the eight-digit number printed on the box, not by the barcode. Type DIN and the number, for example DIN 02213265, and Lifestead asks it.",
  Spain: "Spain's medicines agency (AEMPS) publishes CIMA, its register of every medicine sold in Spain, and Lifestead asks it for the box's national code (C.N.), which you can also type in.",
  France: "France publishes its medicines list (the BDPM) only as files to download, not from an automatic service an app can ask. A copy carried in Lifestead would not update by itself and would fall out of date, which is why Lifestead does not have it, so a French box cannot be looked up by its barcode.",
  Germany: "A German box's pharmacy number (PZN) is held in a paid, licensed list, so no free service can look it up.",
  'the United Kingdom': 'The NHS medicines list (dm+d) can be downloaded only with an NHS account, and Lifestead does not ask it, so a U.K. box cannot be looked up by its barcode.',
  Japan: "Japan's medicines agency (PMDA) offers its list only after registering and does not allow apps to read its site, so a Japanese box cannot be looked up by its barcode.",
  Australia: "Australia's register of medicines (the ARTG) offers no service an app can ask, so an Australian box cannot be looked up by its barcode.",
  Sweden: "Sweden's medicines list offers no service an app can ask, so a Swedish box cannot be looked up by its barcode.",
  Finland: "Finland's medicines agency (Fimea) publishes its list only as a file to download, not from an automatic service an app can ask. A copy carried in Lifestead would not update by itself and would fall out of date, which is why Lifestead does not have it, so a Finnish box cannot be looked up by its barcode.",
  Norway: "Norway's medicines list (FEST) comes only as a file to download, not from an automatic service an app can ask. A copy carried in Lifestead would not update by itself and would fall out of date, which is why Lifestead does not have it, so a Norwegian box cannot be looked up by its barcode.",
};

/** What can and cannot be looked up for a box from this country, said plainly. */
export function countryMedicineNote(issuedIn: string | null): string {
  if (issuedIn && COUNTRY_NOTES[issuedIn]) return COUNTRY_NOTES[issuedIn];
  if (issuedIn) return `Lifestead knows of no medicines list in ${issuedIn} that an app can ask, so the box cannot be looked up by its barcode.`;
  return 'Lifestead knows of no medicines list for this code that an app can ask, so the box cannot be looked up by its barcode.';
}

/** What works for any box from outside the United States. */
export const OUTSIDE_US_WAYS =
  'What works instead: type the generic name printed on the box. On a Mexican box it is under the brand, often after "Denominación genérica". Lifestead finds its U.S. ingredient name and shows U.S. labels for the same ingredient. For the words printed on the box you have, save the picture of its label or leaflet from a store\'s page online and tap Read a Name From a Picture.';

export const OUTSIDE_US_TITLE = 'Medicines bought outside the United States';

/** Every country in one place, for the screen's info button. */
export function outsideUsGuide(): string {
  const order = ['Mexico', 'Spain', 'Canada', 'the United Kingdom', 'Australia', 'France', 'Germany', 'Sweden', 'Finland', 'Norway', 'Japan'];
  return [
    'openFDA holds only labels for medicines sold in the United States. For a box bought anywhere else:',
    ...order.map((where) => COUNTRY_NOTES[where]),
    'Central and South America: Lifestead knows of no medicines list there that an app can ask.',
    OUTSIDE_US_WAYS,
    "A U.S. label for the same ingredient describes a U.S. product. The strength, the other ingredients and how it releases can differ from the box you have, and that box's leaflet is what to follow.",
  ].join('\n\n');
}

/** A Spanish national code (C.N.) typed from the box: six digits, with or without its check digit. */
export function typedSpanishCode(raw: string): string | null {
  const m = (raw ?? '').trim().match(/^c\.?\s*n\.?\s*:?\s*(\d{6})(?:[.\-\s]?\d)?$/i);
  return m ? m[1] : null;
}

/**
 * The C.N. a Spanish medicine barcode carries, or null. Spanish medicine
 * boxes print 847000 followed by the six-digit C.N. and a check digit; no
 * published source states this outright (searched 2026-11-20), so the screen
 * only says what CIMA answered and says plainly when it answered nothing.
 */
export function scannedSpanishCode(reading: CodeReading): string | null {
  const retail = retailCodeOf(reading);
  return retail && retail.length === 13 && retail.startsWith('847000') ? retail.slice(6, 12) : null;
}

export const CIMA_BASE = 'https://cima.aemps.es/cima/rest';

export function cimaByCodeUrl(cn: string): string {
  return `${CIMA_BASE}/medicamento?cn=${encodeURIComponent(cn)}`;
}

export type SpanishMedicine = {
  cn: string;
  name: string;
  maker: string | null;
  ingredients: { name: string; amount: string | null }[];
  prescription: boolean | null;
  leafletUrl: string | null;
};

/** CIMA's answer read into what the screen shows, or null when it holds nothing. */
export function toSpanishMedicine(cn: string, body: unknown): SpanishMedicine | null {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== 'object' || typeof b.nombre !== 'string' || !b.nombre.trim()) return null;
  const ingredients = Array.isArray(b.principiosActivos)
    ? (b.principiosActivos as Record<string, unknown>[])
        .filter((p) => p && typeof p.nombre === 'string')
        .map((p) => ({
          name: String(p.nombre),
          amount: p.cantidad != null && String(p.cantidad).trim() ? `${String(p.cantidad).trim()} ${String(p.unidad ?? '').trim()}`.trim() : null,
        }))
    : [];
  const docs = Array.isArray(b.docs) ? (b.docs as Record<string, unknown>[]) : [];
  const leaflet = docs.find((d) => d && Number(d.tipo) === 2) ?? null;
  const leafletUrl = leaflet ? String(leaflet.urlHtml ?? leaflet.url ?? '') || null : null;
  return {
    cn,
    name: b.nombre.trim(),
    maker: typeof b.labtitular === 'string' && b.labtitular.trim() ? b.labtitular.trim() : null,
    ingredients,
    prescription: typeof b.receta === 'boolean' ? b.receta : null,
    leafletUrl,
  };
}

/** The ingredient names to search openFDA with after a CIMA answer. */
export function spanishIngredientQuery(found: SpanishMedicine): string {
  return found.ingredients.map((i) => i.name).join(' ');
}

export function cimaNotFoundMessage(cn: string): string {
  return `CIMA, Spain's register of medicines, has nothing under the national code ${cn}, so nothing is shown in its place. Check the C.N. printed on the box and type it in, for example C.N. 726805.`;
}

export const CIMA_SOURCE_NOTE =
  "From CIMA, the register of medicines kept by Spain's medicines agency (AEMPS). It describes the medicine authorised in Spain under this code. Read the box you hold before relying on it.";

// A Canadian box (1.0.95.3, Tony 2026-11-20): Health Canada's Drug Product
// Database answers by DIN, the eight digits printed on the box, through an
// open service that allows apps to ask it. A bare eight-digit number is
// already read as a U.S. product NDC, so a DIN is typed with the word DIN.

/** A Canadian DIN typed from the box: DIN and eight digits. */
export function typedCanadianDin(raw: string): string | null {
  const m = (raw ?? '').trim().match(/^d\.?\s*i\.?\s*n\.?\s*:?\s*(\d{8})$/i);
  return m ? m[1] : null;
}

export const DPD_BASE = 'https://health-products.canada.ca/api/drug';

/** One DPD request: the product by DIN, or a part of it by its drug code. */
export function dpdUrl(part: 'drugproduct' | 'activeingredient' | 'status' | 'schedule' | 'form', value: string): string {
  const key = part === 'drugproduct' ? 'din' : 'id';
  return `${DPD_BASE}/${part}/?${key}=${encodeURIComponent(value)}&lang=en&type=json`;
}

export function dpdPageUrl(drugCode: string): string {
  return `https://health-products.canada.ca/dpd-bdpp/info?lang=eng&code=${encodeURIComponent(drugCode)}`;
}

export type CanadianMedicine = {
  din: string;
  drugCode: string;
  name: string;
  maker: string | null;
  ingredients: { name: string; amount: string | null }[];
  prescription: boolean | null;
  status: string | null;
  form: string | null;
};

function firstOf(body: unknown): Record<string, unknown> | null {
  const one = Array.isArray(body) ? body[0] : body;
  return one && typeof one === 'object' ? (one as Record<string, unknown>) : null;
}

function textOf(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** The drug code DPD gave for a DIN, or null when it holds nothing under it. */
export function dpdDrugCode(product: unknown): string | null {
  const p = firstOf(product);
  return p && p.drug_code != null && textOf(p.brand_name) ? String(p.drug_code) : null;
}

/** DPD's answers read into what the screen shows, or null when it holds nothing. */
export function toCanadianMedicine(
  din: string,
  answers: { product: unknown; ingredients?: unknown; status?: unknown; schedule?: unknown; form?: unknown },
): CanadianMedicine | null {
  const p = firstOf(answers.product);
  const drugCode = dpdDrugCode(answers.product);
  if (!p || !drugCode) return null;
  const ingredients = Array.isArray(answers.ingredients)
    ? (answers.ingredients as Record<string, unknown>[])
        .filter((i) => i && textOf(i.ingredient_name))
        .map((i) => {
          const amount = [textOf(i.strength), textOf(i.strength_unit)].filter(Boolean).join(' ');
          const per = [textOf(i.dosage_value), textOf(i.dosage_unit)].filter(Boolean).join(' ');
          return { name: textOf(i.ingredient_name) as string, amount: amount ? (per ? `${amount} per ${per}` : amount) : null };
        })
    : [];
  const schedules = Array.isArray(answers.schedule)
    ? (answers.schedule as Record<string, unknown>[]).map((s) => (textOf(s?.schedule_name) ?? '').toUpperCase()).filter(Boolean)
    : [];
  const prescription = schedules.some((s) => s.includes('PRESCRIPTION'))
    ? true
    : schedules.length && schedules.every((s) => s === 'OTC')
      ? false
      : null;
  const forms = Array.isArray(answers.form)
    ? (answers.form as Record<string, unknown>[]).map((f) => textOf(f?.pharmaceutical_form_name)).filter((f): f is string => !!f)
    : [];
  return {
    din,
    drugCode,
    name: [textOf(p.brand_name), textOf(p.descriptor)].filter(Boolean).join(' '),
    maker: textOf(p.company_name),
    ingredients,
    prescription,
    status: textOf(firstOf(answers.status)?.status),
    form: forms.length ? forms.join(', ') : null,
  };
}

/** The ingredient names to search openFDA with after a DPD answer. */
export function canadianIngredientQuery(found: CanadianMedicine): string {
  return found.ingredients.map((i) => i.name.toLowerCase()).join(' ');
}

export function dpdNotFoundMessage(din: string): string {
  return `Health Canada's Drug Product Database has nothing under the DIN ${din}, so nothing is shown in its place. Check the eight digits after DIN on the box and type them in, for example DIN 02213265.`;
}

export const DPD_SOURCE_NOTE =
  "From Health Canada's Drug Product Database. It describes the product authorised in Canada under this DIN. Read the box you hold before relying on it.";

// Read a Name From a Picture (1.0.95.2). A box photographed round its curve
// reads badly, so the person is pointed to the flat picture a store's page
// shows; the words read from it are offered as lines to tap, largest print
// first, since the brand and the generic name are the biggest words on a box.
export type PictureLine = { text: string; height: number };

export const PICTURE_LINE_LIMIT = 12;

/** The lines worth offering as a name: letters in them, not too long, largest first, each once. */
export function nameCandidates(lines: PictureLine[]): string[] {
  const seen = new Set<string>();
  return lines
    .map((l) => ({ text: l.text.replace(/\s+/g, ' ').trim(), height: l.height }))
    .filter((l) => l.text.length >= 3 && l.text.length <= 60 && /\p{L}{3,}/u.test(l.text))
    .sort((a, b) => b.height - a.height)
    .filter((l) => {
      const key = plainLetters(l.text).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, PICTURE_LINE_LIMIT)
    .map((l) => l.text);
}

export const PICTURE_TIP =
  "A box photographed round its curve reads badly. A store's page for the product usually shows the label flat: open it on this phone, press and hold the picture, save it, then choose it here.";

export const PICTURE_PICK_PROMPT = 'Tap the line that is the medicine\'s name. The generic name is usually under the brand.';

export const PICTURE_NOTHING_READ =
  'No words came off that picture. Try the flat picture from a store\'s page, or type the name printed on the box.';

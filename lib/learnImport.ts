// Interests > Learn, cards from a table (2026-10-31, Learn part 6e). Pure,
// so scripts/test_learn.js checks it without a phone. A person pastes a
// table or opens a file (a spreadsheet saved as CSV, or the text file most
// flashcard apps export, one card per line with a tab between the sides)
// and every row becomes a card in one of their decks.
//
// The first column is the front and the second the back. A third column,
// when there is one, marks a card that asks how to weigh something (yes, x,
// 1, true, or sí). A front holding ____ becomes a gap to fill, with the back
// as what fills it; several answers that fill it go in the back separated
// by |. A first row that names its columns (front, back, question, answer,
// pregunta, respuesta) is read as headings and not made into a card.
//
// A row that cannot become a card is left out and named, by its row number
// and why, so nothing goes missing without a word. Other kinds of card are
// made in the form, since a table has no room for an option's reason.

import { emptyDraft, draftProblem, type CardDraft } from './learnMyDecks';
import { BLANK } from './learnKinds';

/** Most rows one import takes. A longer table is cut here and the cut said. */
export const IMPORT_ROW_LIMIT = 2000;

export type ImportResult = {
  drafts: CardDraft[];
  /** Rows left out, by their row number in the table as a person counts it. */
  skipped: { row: number; reason: string }[];
  /** True when the first row named its columns. */
  headings: boolean;
  /** Rows past IMPORT_ROW_LIMIT that were not read. */
  cut: number;
};

function pickDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== '') ?? '';
  if (firstLine.includes('\t')) return '\t';
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ';' : ',';
}

/** Splits a table into rows of cells, honouring quoted cells with "" inside. */
export function parseTable(text: string): string[][] {
  const delimiter = pickDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let i = 0;
  const body = text.replace(/^﻿/, '');
  while (i < body.length) {
    const ch = body[i];
    if (quoted) {
      if (ch === '"') {
        if (body[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += ch === '\r' && body[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

/** A cell as plain words: markup some flashcard apps export is taken out. */
export function plainCell(cell: string): string {
  return cell
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
}

const FRONT_HEADINGS = ['front', 'question', 'pregunta', 'frente', 'term', 'término', 'termino'];
const BACK_HEADINGS = ['back', 'answer', 'respuesta', 'reverso', 'definition', 'definición', 'definicion'];

function isHeadingRow(cells: string[]): boolean {
  const first = plainCell(cells[0] ?? '').toLowerCase();
  const second = plainCell(cells[1] ?? '').toLowerCase();
  return FRONT_HEADINGS.includes(first) && BACK_HEADINGS.includes(second);
}

const YES = ['yes', 'y', 'x', '1', 'true', 'sí', 'si'];

function rowToDraft(cells: string[]): CardDraft {
  const front = plainCell(cells[0] ?? '');
  const back = plainCell(cells[1] ?? '');
  const thinking = YES.includes(plainCell(cells[2] ?? '').toLowerCase());
  if (front.includes(BLANK)) {
    const accept = back
      .split('|')
      .map((answer) => answer.trim())
      .filter(Boolean);
    return { ...emptyDraft('blank'), front, back: accept[0] ?? '', accept: accept.join('\n'), thinking };
  }
  return { ...emptyDraft('flip'), front, back, thinking };
}

/** Every row of a pasted or opened table as a card ready to keep, or left out with why. */
export function importTable(text: string): ImportResult {
  const all = parseTable(text);
  const result: ImportResult = { drafts: [], skipped: [], headings: false, cut: 0 };
  const seen = new Set<string>();
  let read = 0;
  all.forEach((cells, index) => {
    const rowNumber = index + 1;
    if (cells.every((cell) => plainCell(cell) === '')) return;
    if (index === 0 && isHeadingRow(cells)) {
      result.headings = true;
      return;
    }
    if (read >= IMPORT_ROW_LIMIT) {
      result.cut += 1;
      return;
    }
    read += 1;
    if (cells.length < 2) {
      result.skipped.push({ row: rowNumber, reason: 'it has one column, and a card needs a front and a back' });
      return;
    }
    const draft = rowToDraft(cells);
    const problem = draftProblem(draft);
    if (problem) {
      result.skipped.push({ row: rowNumber, reason: !draft.front ? 'its front is empty' : 'its back is empty' });
      return;
    }
    const key = `${draft.front.toLowerCase()}\u0000${draft.back.toLowerCase()}`;
    if (seen.has(key)) {
      result.skipped.push({ row: rowNumber, reason: 'it is the same card as a row above it' });
      return;
    }
    seen.add(key);
    result.drafts.push(draft);
  });
  return result;
}

/** The plain words under an import before it is kept. */
export function describeImport(result: ImportResult, t: (text: string, values?: Record<string, string | number>) => string): string[] {
  const lines: string[] = [];
  const n = result.drafts.length;
  if (n === 0) lines.push(t('No row of this table can become a card yet.'));
  else lines.push(n === 1 ? t('1 card is ready to add.') : t('{n} cards are ready to add.', { n }));
  if (result.headings) lines.push(t('The first row names the columns, so it is not made into a card.'));
  for (const skip of result.skipped.slice(0, 5)) lines.push(t('Row {row} is left out: {reason}.', { row: skip.row, reason: t(skip.reason) }));
  if (result.skipped.length > 5) lines.push(t('{n} more rows are left out for the same kinds of reason.', { n: result.skipped.length - 5 }));
  if (result.cut > 0) lines.push(t('One import takes {limit} rows, so the {n} after them were not read. Put them in a second table to add them.', { limit: IMPORT_ROW_LIMIT, n: result.cut }));
  return lines;
}

// Reads the sheets of an .xlsx file into rows of strings, in plain JavaScript,
// so the same reader serves scripts/build_course_files.js on the computer and
// the in-app course import on a phone. Pure: bytes in, rows out.
//
// An .xlsx is a zip of XML. Only what a table of text needs is read: the
// workbook's list of sheets, shared strings, inline strings, and the value a
// formula last worked out. Styles, charts and the rest are skipped.

import { strFromU8, unzipSync } from 'fflate';

export type XlsxSheets = Record<string, string[][]>;

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(text: string): string {
  return text
    .replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (whole, body: string) => {
      if (body.startsWith('#x')) return String.fromCodePoint(parseInt(body.slice(2), 16));
      if (body.startsWith('#')) return String.fromCodePoint(parseInt(body.slice(1), 10));
      return NAMED[body] ?? whole;
    })
    // Excel writes a carriage return it had to keep as _x000D_.
    .replace(/_x000[dD]_/g, '')
    .replace(/\r\n?/g, '\n');
}

/** Every <t> inside a piece of XML joined, leaving out the phonetic <rPh> runs. */
function textRuns(xml: string): string {
  const plain = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let out = '';
  for (const match of plain.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)) {
    out += match[1] ?? '';
  }
  return decodeEntities(out);
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return match ? decodeEntities(match[1]) : null;
}

/** A cell reference's column as a zero-based index: A is 0, AA is 26. */
export function columnIndex(ref: string): number {
  const letters = /^[A-Za-z]+/.exec(ref)?.[0] ?? 'A';
  let index = 0;
  for (const letter of letters.toUpperCase()) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function readSheetRows(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowNumber = Number(attribute(rowMatch[1], 'r'));
    const at = Number.isFinite(rowNumber) && rowNumber > 0 ? rowNumber - 1 : rows.length;
    const row: string[] = [];
    for (const cellMatch of (rowMatch[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2] ?? '';
      const type = attribute(attrs, 't');
      const ref = attribute(attrs, 'r');
      const column = ref ? columnIndex(ref) : row.length;
      const value = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '';
      let text: string;
      if (type === 's') text = shared[Number(value)] ?? '';
      else if (type === 'inlineStr') text = textRuns(body);
      else if (type === 'b') text = value === '1' ? 'TRUE' : 'FALSE';
      else text = decodeEntities(value);
      while (row.length < column) row.push('');
      row[column] = text;
    }
    while (rows.length < at) rows.push([]);
    rows[at] = row;
  }
  return rows;
}

/**
 * Every sheet in the file, by name. Throws when the bytes are not a workbook;
 * the caller says that in words.
 */
export function readXlsx(bytes: Uint8Array): XlsxSheets {
  const files = unzipSync(bytes);
  const read = (name: string): string | null => {
    const file = files[name];
    return file ? strFromU8(file) : null;
  };
  const workbook = read('xl/workbook.xml');
  if (!workbook) throw new Error('This file holds no workbook.');

  const shared: string[] = [];
  const sharedXml = read('xl/sharedStrings.xml');
  if (sharedXml) {
    for (const match of sharedXml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)) {
      shared.push(textRuns(match[1] ?? ''));
    }
  }

  const targets = new Map<string, string>();
  for (const match of (read('xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attribute(match[0], 'Id');
    const target = attribute(match[0], 'Target');
    if (id && target) targets.set(id, target);
  }

  const sheets: XlsxSheets = {};
  for (const match of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = attribute(match[0], 'name');
    const target = targets.get(attribute(match[0], 'r:id') ?? '');
    if (!name || !target) continue;
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const xml = read(path);
    if (xml) sheets[name] = readSheetRows(xml, shared);
  }
  return sheets;
}

/** True when the bytes start the way a zip does, which an .xlsx always is. */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

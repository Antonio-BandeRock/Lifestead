// Interests > Learn, a deck on paper (2026-10-31, Learn part 6e). Pure, so
// scripts/test_learn.js checks it without a phone; components/LearnSection.tsx
// hands the page to printHtml or exportHtmlAsPdf in lib/reportPdf.ts.
//
// Two layouts, for any deck: ready-made, from the person's records, or made
// by them.
//   list   every card in turn, the question and then its answer, with why
//          each option is or is not the answer. For reading through.
//   cards  eight cards to a sheet to cut out: a page of fronts, then a page
//          of backs. Each row of backs runs the other way, so printing on
//          both sides (flipping on the long edge) puts every answer on the back of
//          its question.
//
// Only the cards go on paper. Nothing about how a person has answered, or
// when a card comes up, is printed, and nothing is counted.

import type { LearnCard, LearnDeck } from './learnDecks';
import { BLANK, kindOf, shuffledIndexes } from './learnKinds';

export type DeckPrintLayout = 'list' | 'cards';

export const PRINT_CARDS_PER_SHEET = 8;
const COLUMNS = 2;

type Translate = (text: string, values?: Record<string, string | number>) => string;
const plain: Translate = (text, values) => (values ? text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? '')) : text);

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The question side of a card as HTML: the story, the question, and whatever is chosen from. */
export function frontHtml(card: LearnCard, t: Translate = plain): string {
  const kind = kindOf(card);
  const parts: string[] = [];
  if (kind === 'case' && card.story) parts.push(`<p class="story">${esc(card.story)}</p>`);
  const question = kind === 'blank' ? card.front.split(BLANK).map(esc).join('<span class="gap"></span>') : esc(card.front);
  parts.push(`<p class="q">${question}</p>`);
  if ((kind === 'choice' || kind === 'estimate' || kind === 'case') && card.options) {
    parts.push(`<ol class="opts">${card.options.map((o, i) => `<li><span class="l">${LETTERS[i]}</span> ${esc(o.text)}</li>`).join('')}</ol>`);
  }
  if (kind === 'order' && card.items) {
    const shown = shuffledIndexes(card.items.length, card.id).map((i) => card.items![i]);
    parts.push(`<p class="hint">${esc(t('Put these in order:'))}</p><ul class="items">${shown.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`);
  }
  if (kind === 'pairs' && card.pairs) {
    const rights = shuffledIndexes(card.pairs.length, card.id).map((i) => card.pairs![i].right);
    const rows = card.pairs.map((pair, i) => `<tr><td>${i + 1}. ${esc(pair.left)}</td><td>${LETTERS[i]}. ${esc(rights[i])}</td></tr>`).join('');
    parts.push(`<p class="hint">${esc(t('Match each on the left with one on the right:'))}</p><table class="pairs">${rows}</table>`);
  }
  if (kind === 'explain') parts.push(`<p class="hint">${esc(t('Say or write it in your words, then turn over.'))}</p>`);
  return parts.join('');
}

/** The answer side of a card as HTML. `full` adds why every option is or is not the answer. */
export function backHtml(card: LearnCard, full: boolean, t: Translate = plain): string {
  const kind = kindOf(card);
  const parts: string[] = [];
  if ((kind === 'choice' || kind === 'estimate' || kind === 'case') && card.options && card.answer !== undefined && card.options[card.answer]) {
    const right = card.options[card.answer];
    parts.push(`<p class="a">${esc(t('The answer is {letter}: {text}', { letter: LETTERS[card.answer], text: right.text }))}</p>`);
    if (full) {
      parts.push(
        `<ul class="whys">${card.options
          .map((o, i) => (o.why ? `<li><span class="l">${LETTERS[i]}</span> ${esc(o.why)}</li>` : ''))
          .join('')}</ul>`,
      );
    } else if (right.why) {
      parts.push(`<p>${esc(right.why)}</p>`);
    }
  }
  if (kind === 'blank' && card.accept && card.accept.length > 0) {
    parts.push(`<p class="a">${esc(card.accept.join(' / '))}</p>`);
  }
  if (kind === 'order' && card.items) {
    parts.push(`<ol class="items">${card.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ol>`);
  }
  if (kind === 'pairs' && card.pairs) {
    const rights = shuffledIndexes(card.pairs.length, card.id).map((i) => card.pairs![i].right);
    const lines = card.pairs.map((pair, i) => `<li>${i + 1} ${LETTERS[rights.indexOf(pair.right)]}: ${esc(pair.left)}, ${esc(pair.right)}</li>`);
    parts.push(`<ul class="items">${lines.join('')}</ul>`);
  }
  if (card.back.trim()) parts.push(`<p>${esc(card.back)}</p>`);
  if (full && card.source) parts.push(`<p class="src">${esc(t('Source: {source}', { source: card.source.source }))}</p>`);
  return parts.join('');
}

const STYLE = `
  @page { margin: 14mm; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #222; font-size: 11pt; line-height: 1.4; }
  h1 { font-size: 17pt; margin: 0 0 4px; font-weight: 600; }
  .about { color: #555; margin: 0 0 14px; }
  .entry { break-inside: avoid; border-top: 1px solid #ccc; padding: 8px 0; }
  .num { color: #777; font-size: 9pt; }
  .q { margin: 2px 0 6px; font-weight: 600; }
  .story { margin: 2px 0 6px; font-style: italic; }
  .hint { margin: 4px 0 2px; color: #555; font-size: 9.5pt; }
  .answer { margin-left: 14px; padding-left: 8px; border-left: 2px solid #E29CBA; }
  .a { margin: 2px 0 4px; font-weight: 600; }
  .l { font-weight: 600; margin-right: 4px; }
  .src { color: #777; font-size: 9pt; }
  ol.opts, ul.whys, ul.items, ol.items { margin: 2px 0 4px; padding-left: 18px; }
  ol.opts { list-style: none; padding-left: 0; }
  .gap { display: inline-block; min-width: 70px; border-bottom: 1px solid #333; }
  table.pairs { border-collapse: collapse; margin: 2px 0; }
  table.pairs td { padding: 1px 12px 1px 0; vertical-align: top; }
  .sheet { break-after: page; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 62mm; gap: 0; }
  .sheet:last-child { break-after: auto; }
  .cell { border: 1px dashed #999; padding: 6mm; overflow: hidden; font-size: 10pt; }
  .cell .deck { color: #999; font-size: 8pt; margin-bottom: 4px; }
  .cell.empty { border-color: transparent; }
`;

function page(deck: LearnDeck, body: string, t: Translate): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(deck.title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`.replace(
    '</body>',
    `<p class="src">${esc(t('Printed from Lifestead.'))}</p></body>`,
  );
}

/**
 * The places of a sheet's backs: each row of fronts read from the other side
 * of the paper, so the column order turns round and every back sits behind
 * its front when the page is flipped on its long edge.
 */
export function mirroredOrder(count: number, columns: number = COLUMNS): number[] {
  const order: number[] = [];
  const rows = Math.ceil(count / columns);
  for (let row = 0; row < rows; row++) {
    for (let col = columns - 1; col >= 0; col--) order.push(row * columns + col);
  }
  return order;
}

/** The whole deck as one page of HTML in the layout chosen. */
export function renderDeckHtml(deck: LearnDeck, layout: DeckPrintLayout, t: Translate = plain): string {
  const head = `<h1>${esc(deck.title)}</h1>${deck.about ? `<p class="about">${esc(deck.about)}</p>` : ''}`;
  if (layout === 'list') {
    const entries = deck.cards
      .map(
        (card, i) =>
          `<div class="entry"><div class="num">${esc(t('Card {n}', { n: i + 1 }))}</div>${frontHtml(card, t)}<div class="answer">${backHtml(card, true, t)}</div></div>`,
      )
      .join('');
    return page(deck, head + entries, t);
  }
  const sheets: string[] = [];
  for (let start = 0; start < deck.cards.length; start += PRINT_CARDS_PER_SHEET) {
    const slice = deck.cards.slice(start, start + PRINT_CARDS_PER_SHEET);
    const cells: (LearnCard | null)[] = [...slice];
    while (cells.length % COLUMNS !== 0) cells.push(null);
    const label = `<div class="deck">${esc(deck.title)}</div>`;
    sheets.push(
      `<div class="sheet">${cells.map((card) => (card ? `<div class="cell">${label}${frontHtml(card, t)}</div>` : '<div class="cell empty"></div>')).join('')}</div>`,
    );
    sheets.push(
      `<div class="sheet">${mirroredOrder(cells.length)
        .map((i) => cells[i])
        .map((card) => (card ? `<div class="cell">${label}${backHtml(card, false, t)}</div>` : '<div class="cell empty"></div>'))
        .join('')}</div>`,
    );
  }
  return page(deck, head + sheets.join(''), t);
}

/** A file name for the PDF: lifestead-deck-the-gut-and-what-feeds-it. */
export function deckFileBase(deck: LearnDeck): string {
  const slug = deck.title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `lifestead-deck-${slug || 'cards'}`;
}

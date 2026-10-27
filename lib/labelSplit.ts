// Splits a menu label over two lines at the space that leaves the two lines
// closest in length.
//
// 2026-10-26, reported on the phone in Spanish: lens menu names such as
// "Comidas de hoy" filled their whole grid column on one line and ran into
// the label beside them, so a row of labels read as one long phrase. A label
// left to wrap by itself only breaks once it runs out of room, which is
// exactly the case that touches its neighbour. Breaking it on purpose, at the
// most even point, keeps a gap between columns.
//
// Only labels of more than one word and longer than SPLIT_FROM characters are
// split. Pure, so scripts/test_label_split.js checks it without a phone.

export const SPLIT_FROM = 10;

export function splitLabelEvenly(label: string): string {
  if (label.includes('\n')) return label;
  const words = label.trim().split(/\s+/);
  if (words.length < 2 || label.length <= SPLIT_FROM) return label;
  let best = label;
  let bestLongest = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const first = words.slice(0, i).join(' ');
    const second = words.slice(i).join(' ');
    const longest = Math.max(first.length, second.length);
    if (longest < bestLongest) {
      bestLongest = longest;
      best = `${first}\n${second}`;
    }
  }
  return best;
}

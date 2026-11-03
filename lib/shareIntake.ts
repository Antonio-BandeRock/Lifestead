// What happens to something shared into Lifestead from another app (C11,
// rebuild R1, 2026-10-02). Android's Share sheet lists Lifestead for text,
// links and images. A link that looks like a recipe opens Food > Import a
// Recipe with the link already in its box, where nothing is fetched or saved
// until the person goes on; an image becomes a Capture note with the photo
// on it; anything else becomes a Capture note in the person's words or the
// other app's. Capture is the inbox, so nothing shared is ever lost for
// being the wrong kind.
//
// Any other file (piece 3, 2026-11-03: a PDF, a document, a recording) is
// kept on a Capture note as an attached file, beside any photos shared with
// it, so it can be sorted from there. Android lists Lifestead for every kind
// of file once the rebuild widens the Share filter; until then only text and
// images arrive and this path waits.
//
// Nothing is guessed from a page's contents: deciding a link is a recipe
// would mean fetching it before the person asked, so the call is made from
// the link and its words alone, and a recipe link that is missed lands in
// Capture with the link kept whole, ready to paste into Import a Recipe.
//
// Pure, with no imports, so scripts/test_share_intake.js runs it.

export type SharedThing = {
  text: string | null;
  webUrl: string | null;
  /** Images handed over, as file paths or content URIs. */
  images: { uri: string; width: number | null; height: number | null }[];
  /** Every other file handed over, kept on the note as an attachment. */
  files: SharedFile[];
  /** A page title the other app sent, when it sent one. */
  title: string | null;
};

export type SharedFile = { uri: string; name: string | null; mimeType: string | null; sizeBytes: number | null };

export type SharePlan =
  | { kind: 'recipe'; url: string }
  | { kind: 'capture'; text: string }
  | { kind: 'photos'; text: string | null; images: SharedThing['images'] }
  | { kind: 'files'; text: string; images: SharedThing['images']; files: SharedFile[] }
  | { kind: 'nothing' };

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/i;

/** The first web link in some shared text, without trailing punctuation. */
export function firstLink(text: string | null): string | null {
  if (!text) return null;
  const match = URL_PATTERN.exec(text);
  if (!match) return null;
  return match[0].replace(/[),.;:!?\]]+$/, '');
}

/** Words that, in a link's path or the words shared with it, say recipe. */
const RECIPE_WORDS = /\b(recipes?|receta|recetas|rezept|rezepte|recette|recettes|resepti|oppskrift|recept|cooking|ricetta)\b/i;

export function looksLikeRecipe(url: string, words: string | null): boolean {
  let path = url;
  try {
    const parsed = new URL(url);
    path = `${parsed.hostname} ${parsed.pathname}`;
  } catch {
    // Not a URL the runtime can read; test the raw text.
  }
  return RECIPE_WORDS.test(path.replace(/[-_/.]+/g, ' ')) || RECIPE_WORDS.test(words ?? '');
}

function tidy(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/** The words on a note of shared files that came with no words or names. */
export const SHARED_FILE_WORDS = 'A shared file';

/** The words on a note that holds shared files: what came with them, else their names. */
export function sharedFilesText(text: string, title: string, files: readonly SharedFile[]): string {
  if (text) return text;
  if (title) return title;
  const names = files.map((file) => tidy(file.name)).filter((name) => name.length > 0);
  return names.length > 0 ? names.join(', ') : SHARED_FILE_WORDS;
}

export function planShare(thing: SharedThing): SharePlan {
  const text = tidy(thing.text);
  const title = tidy(thing.title);
  if (thing.files.length > 0) {
    return { kind: 'files', text: sharedFilesText(text, title, thing.files), images: thing.images, files: thing.files };
  }
  if (thing.images.length > 0) {
    return { kind: 'photos', text: text || title || null, images: thing.images };
  }
  const link = thing.webUrl ?? firstLink(text);
  if (link && looksLikeRecipe(link, `${title} ${text}`)) return { kind: 'recipe', url: link };
  if (text) return { kind: 'capture', text: title && !text.includes(title) ? `${title} ${text}` : text };
  if (link) return { kind: 'capture', text: title ? `${title} ${link}` : link };
  return { kind: 'nothing' };
}

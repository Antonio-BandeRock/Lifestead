// Reading and keeping a web page for a Capture note (2026-10-30). What a page
// says about itself is decided in lib/webCapture.ts with no database; this
// fetches the page when the person asks and keeps the result. See web_pages
// in lib/db.ts.

import { getDatabase } from './db';
import { fetchPageHtml } from './recipeImportDb';
import { extractWebPage, linkInNote, type WebPage, type WebPageKind } from './webCapture';

const KINDS: WebPageKind[] = ['recipe', 'study', 'product', 'video', 'article', 'page'];

type PageRow = {
  noteId: string;
  url: string;
  finalUrl: string | null;
  site: string | null;
  title: string | null;
  author: string | null;
  published: string | null;
  excerpt: string | null;
  kind: string;
};

const COLUMNS = `capture_note_id AS noteId, url, final_url AS finalUrl, site, title, author,
  published_on AS published, excerpt, kind`;

function fromRow(row: PageRow): WebPage {
  return {
    url: row.url,
    finalUrl: row.finalUrl ?? row.url,
    site: row.site ?? '',
    title: row.title ?? row.site ?? row.url,
    author: row.author,
    published: row.published,
    excerpt: row.excerpt,
    kind: KINDS.includes(row.kind as WebPageKind) ? (row.kind as WebPageKind) : 'page',
  };
}

/** The kept page of each note that has one, keyed by note id. */
export async function listWebPagesForNotes(noteIds: string[]): Promise<Map<string, WebPage>> {
  const pages = new Map<string, WebPage>();
  if (noteIds.length === 0) return pages;
  const db = await getDatabase();
  const rows = await db.getAllAsync<PageRow>(
    `SELECT ${COLUMNS} FROM web_pages WHERE capture_note_id IN (${noteIds.map(() => '?').join(', ')})`,
    ...noteIds,
  );
  for (const row of rows) pages.set(row.noteId, fromRow(row));
  return pages;
}

/**
 * Reads the first link in the note and keeps what the page says about
 * itself, replacing anything kept before. Rejects with a sentence the
 * person can act on when the note has no link or the page cannot be read.
 */
export async function readPageForNote(noteId: string, noteText: string): Promise<WebPage> {
  const link = linkInNote(noteText);
  if (!link) throw new Error('This note has no web link in it to read.');
  const { html, url, finalUrl } = await fetchPageHtml(link);
  const page = extractWebPage(html, url, finalUrl);
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM web_pages WHERE capture_note_id = ?', noteId);
    await db.runAsync(
      `INSERT INTO web_pages (id, capture_note_id, url, final_url, site, title, author, published_on, excerpt, kind,
         fetched_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `webpage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      noteId,
      page.url,
      page.finalUrl,
      page.site,
      page.title,
      page.author,
      page.published,
      page.excerpt,
      page.kind,
      now,
      now,
      now,
    );
  });
  return page;
}

/** Lets a kept page go, leaving the note and its link. */
export async function forgetPageForNote(noteId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM web_pages WHERE capture_note_id = ?', noteId);
}

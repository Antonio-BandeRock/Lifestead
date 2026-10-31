// Reading a web page kept in Capture (2026-10-30), the first way of Share
// to Lifestead: the person sends or pastes a link, and the app reads the
// page on the device only when Read the Page is tapped. What a page says
// about itself in a fixed shape is kept: its title, site, author, the day it
// was published, what kind of page it is, and a short excerpt. Nothing here
// scrapes page layout, which changes without notice.
//
// A kept page is for the person's own reading. Only a short excerpt is kept,
// never the article, and nothing here is ever passed along in a .is share,
// so someone else's writing is never handed on.
//
// What kind of page it is decides what the note offers next: a recipe goes
// to Food's Import a Recipe, a product page is offered to the grocery list,
// and a published study to Health. Each is an offer the person taps, never a
// filing made for them, the same rule Capture's suggestions keep.
//
// Pure: it imports only other pure modules, so scripts/test_web_capture.js
// runs it in plain node.

import type { CaptureDestinationKey } from './captureNotes';
import { cleanText, extractRecipeFromHtml, jsonLdBlocks, siteNameFromUrl } from './recipeImport';
import { firstLink } from './shareIntake';

export type WebPageKind = 'recipe' | 'study' | 'product' | 'video' | 'article' | 'page';

export type WebPage = {
  /** The link as it was in the note. */
  url: string;
  /** Where the site sent the reader in the end, when it redirected. */
  finalUrl: string;
  site: string;
  title: string;
  author: string | null;
  /** YYYY-MM-DD, or YYYY-MM or YYYY when the page gives no more. */
  published: string | null;
  excerpt: string | null;
  kind: WebPageKind;
};

export const WEB_PAGE_KIND_LABELS: Record<WebPageKind, string> = {
  recipe: 'A recipe',
  study: 'A published study',
  product: 'A product page',
  video: 'A video',
  article: 'An article',
  page: 'A web page',
};

/** The longest excerpt kept. A few sentences, never the piece itself. */
export const MAX_EXCERPT_LENGTH = 300;
const MAX_TITLE_LENGTH = 200;

/** The first web link in a note, or null. */
export function linkInNote(text: string): string | null {
  return firstLink(text);
}

// --- Meta tags ------------------------------------------------------------------

type MetaTags = Map<string, string[]>;

/** Every <meta> tag, keyed by its property, name or itemprop in lower case. */
export function readMetaTags(html: string): MetaTags {
  const tags: MetaTags = new Map();
  const pattern = /<meta\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const attrs = new Map<string, string>();
    const attrPattern = /([a-z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
    let attr: RegExpExecArray | null;
    while ((attr = attrPattern.exec(match[1])) !== null) {
      attrs.set(attr[1].toLowerCase(), attr[2] ?? attr[3] ?? attr[4] ?? '');
    }
    const key = (attrs.get('property') ?? attrs.get('name') ?? attrs.get('itemprop') ?? '').toLowerCase();
    const content = attrs.get('content');
    if (!key || content === undefined) continue;
    const value = cleanText(content);
    if (!value) continue;
    const list = tags.get(key) ?? [];
    list.push(value);
    tags.set(key, list);
  }
  return tags;
}

function firstTag(tags: MetaTags, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = tags.get(key)?.[0];
    if (value) return value;
  }
  return null;
}

// --- JSON-LD nodes --------------------------------------------------------------

type JsonNode = Record<string, unknown>;

function isObject(value: unknown): value is JsonNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function typesOf(node: JsonNode): string[] {
  const type = node['@type'];
  const list = typeof type === 'string' ? [type] : Array.isArray(type) ? type : [];
  return list.filter((item): item is string => typeof item === 'string').map((item) => item.replace(/^.*[/:]/, '').toLowerCase());
}

/** Every node with a @type, walking arrays and @graph, shallow first. */
function typedNodes(value: unknown, depth = 0, found: JsonNode[] = []): JsonNode[] {
  if (depth > 6) return found;
  if (Array.isArray(value)) {
    for (const item of value) typedNodes(item, depth + 1, found);
    return found;
  }
  if (!isObject(value)) return found;
  if (typesOf(value).length > 0) found.push(value);
  for (const key of ['@graph', 'mainEntity']) typedNodes(value[key], depth + 1, found);
  return found;
}

const STUDY_TYPES = ['scholarlyarticle', 'medicalscholarlyarticle'];
const ARTICLE_TYPES = ['article', 'newsarticle', 'blogposting', 'reportagenewsarticle', 'medicalwebpage', 'techarticle', 'analysisnewsarticle'];
const PRODUCT_TYPES = ['product', 'productgroup', 'individualproduct'];
const VIDEO_TYPES = ['videoobject'];

function nodeOf(nodes: JsonNode[], types: string[]): JsonNode | null {
  return nodes.find((node) => typesOf(node).some((type) => types.includes(type))) ?? null;
}

function names(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(names);
  if (isObject(value) && typeof value.name === 'string') return [value.name];
  return [];
}

// --- What the page is ------------------------------------------------------------

const STUDY_SITES = /(^|\.)(pubmed\.ncbi\.nlm\.nih\.gov|ncbi\.nlm\.nih\.gov|doi\.org|cochranelibrary\.com|thelancet\.com|nejm\.org|bmj\.com|jamanetwork\.com|nature\.com|sciencedirect\.com|frontiersin\.org|mdpi\.com|plos\.org|biomedcentral\.com|academic\.oup\.com|onlinelibrary\.wiley\.com)$/;
const VIDEO_SITES = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/;

function kindOf(html: string, url: string, tags: MetaTags, nodes: JsonNode[]): WebPageKind {
  if (extractRecipeFromHtml(html, url)) return 'recipe';
  const site = siteNameFromUrl(url);
  if (tags.has('citation_title') || tags.has('citation_doi') || nodeOf(nodes, STUDY_TYPES) || STUDY_SITES.test(site)) {
    return 'study';
  }
  const ogType = (firstTag(tags, 'og:type') ?? '').toLowerCase();
  if (nodeOf(nodes, PRODUCT_TYPES) || ogType === 'product' || ogType.startsWith('product.') || ogType === 'og:product') {
    return 'product';
  }
  if (nodeOf(nodes, VIDEO_TYPES) || ogType.startsWith('video') || VIDEO_SITES.test(site)) return 'video';
  if (nodeOf(nodes, ARTICLE_TYPES) || ogType === 'article') return 'article';
  return 'page';
}

// --- Dates ----------------------------------------------------------------------

/** 2024-03-05T10:00:00Z, 2024/03/05, 2024-03 or 2024 to the date part. */
export function normaliseDate(value: string | null): string | null {
  if (!value) return null;
  const full = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(value.trim());
  if (full) {
    const [, y, m, d] = full;
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return null;
  }
  const month = /^(\d{4})[-/](\d{1,2})$/.exec(value.trim());
  if (month && Number(month[2]) >= 1 && Number(month[2]) <= 12) return `${month[1]}-${month[2].padStart(2, '0')}`;
  const year = /^(\d{4})$/.exec(value.trim());
  return year ? year[1] : null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 2024-03-05 to "5 March 2024"; a month or a year alone reads as itself. */
export function describePublished(published: string | null): string | null {
  if (!published) return null;
  const [y, m, d] = published.split('-');
  if (d) return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  if (m) return `${MONTHS[Number(m) - 1]} ${y}`;
  return y;
}

// --- Excerpt ---------------------------------------------------------------------

/** Cut at a word boundary, ending in "..." when anything was left out. */
export function shortenExcerpt(text: string, max = MAX_EXCERPT_LENGTH): string {
  const clean = cleanText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, '')}...`;
}

/** The first paragraph long enough to say something, for a page with no description. */
function firstParagraph(html: string): string | null {
  const body = html.replace(/<(script|style|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, ' ');
  const pattern = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const text = cleanText(match[1]);
    if (text.length >= 80) return text;
  }
  return null;
}

// --- The page ---------------------------------------------------------------------

/** What a page says about itself, from its HTML. Never null: a bare page still has an address. */
export function extractWebPage(html: string, url: string, finalUrl: string = url): WebPage {
  const tags = readMetaTags(html);
  const nodes = typedNodes(jsonLdBlocks(html));
  const kind = kindOf(html, url, tags, nodes);
  const main = nodeOf(nodes, [...STUDY_TYPES, ...ARTICLE_TYPES, ...PRODUCT_TYPES, ...VIDEO_TYPES, 'recipe']);
  const site = siteNameFromUrl(finalUrl) || siteNameFromUrl(url);

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const nodeTitle = main ? names(main.headline ?? main.name)[0] ?? null : null;
  const title =
    firstTag(tags, 'citation_title') ??
    (nodeTitle ? cleanText(nodeTitle) : null) ??
    firstTag(tags, 'og:title', 'twitter:title') ??
    (titleTag ? cleanText(titleTag[1]) : '');

  const citationAuthors = tags.get('citation_author') ?? [];
  let author: string | null = null;
  if (citationAuthors.length > 0) {
    author = citationAuthors.length > 2 ? `${citationAuthors[0]} and others` : citationAuthors.join(' and ');
  } else {
    const fromNode = main ? names(main.author).map(cleanText).filter(Boolean) : [];
    const fromTag = firstTag(tags, 'author', 'article:author', 'parsely-author');
    if (fromNode.length > 0) author = fromNode.length > 2 ? `${fromNode[0]} and others` : fromNode.join(' and ');
    else if (fromTag && !/^https?:/i.test(fromTag)) author = fromTag;
  }

  const published = normaliseDate(
    firstTag(tags, 'citation_publication_date', 'citation_date', 'article:published_time', 'date', 'dc.date') ??
      (main && typeof main.datePublished === 'string' ? main.datePublished : null) ??
      (main && typeof main.uploadDate === 'string' ? main.uploadDate : null),
  );

  const description =
    firstTag(tags, 'og:description', 'description', 'twitter:description', 'citation_abstract') ??
    (main && typeof main.description === 'string' ? cleanText(main.description) : null) ??
    firstParagraph(html);

  return {
    url: url.trim(),
    finalUrl: finalUrl.trim() || url.trim(),
    site,
    title: (title || site || url).slice(0, MAX_TITLE_LENGTH),
    author: author ? author.slice(0, 120) : null,
    published,
    excerpt: description ? shortenExcerpt(description) : null,
    kind,
  };
}

/** "nature.com, Ana Ruiz and others, 5 March 2024": whichever of the three are known. */
export function describePageSource(page: Pick<WebPage, 'site' | 'author' | 'published'>): string {
  return [page.site, page.author, describePublished(page.published)].filter(Boolean).join(', ');
}

// --- What the note offers next ------------------------------------------------

export type PageOffer =
  | { kind: 'recipe'; url: string }
  | { kind: 'destination'; key: CaptureDestinationKey; reason: string };

/**
 * What a read page offers its note. A recipe goes to Import a Recipe; a
 * product page and a published study are offered a destination, with the
 * reason in words. Anything else offers nothing, and the note sorts like
 * any other.
 */
export function offerForPage(page: Pick<WebPage, 'kind' | 'url'>, destination: CaptureDestinationKey | null): PageOffer | null {
  if (page.kind === 'recipe') return { kind: 'recipe', url: page.url };
  if (destination) return null;
  if (page.kind === 'product') return { kind: 'destination', key: 'shopping', reason: 'The page reads as a product page.' };
  if (page.kind === 'study') return { kind: 'destination', key: 'health', reason: 'The page reads as a published study.' };
  return null;
}

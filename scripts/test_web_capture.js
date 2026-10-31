// Checks lib/webCapture.ts (reading a page kept in Capture): what kind of
// page it is, the title, site, author and day it gives, that the excerpt
// stays short and never holds the article, and what the note offers next.
// Run: node scripts/test_web_capture.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const cache = {};
function load(rel) {
  const file = path.join(__dirname, '..', 'lib', `${rel}.ts`);
  if (cache[file]) return cache[file];
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  cache[file] = m.exports;
  new Function('module', 'exports', 'require', outputText)(m, m.exports, (name) => {
    if (name.startsWith('./')) return load(name.slice(2));
    throw new Error(`lib/webCapture.ts must stay pure, asked for ${name}`);
  });
  cache[file] = m.exports;
  return m.exports;
}
const W = load('webCapture');

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`);
  }
}

const long = 'Selenium is a trace mineral the thyroid uses to make its hormones. '.repeat(20);

// A study page with citation tags.
const study = W.extractWebPage(
  `<html><head><title>Ignored | Journal</title>
  <meta name="citation_title" content="Selenium and TPO antibodies: a meta-analysis">
  <meta name="citation_author" content="Ruiz, Ana"><meta name="citation_author" content="Lee, Min"><meta name="citation_author" content="Ito, Ken">
  <meta name="citation_publication_date" content="2024/03/05">
  <meta name="description" content="${long}">
  </head><body><p>${long}</p></body></html>`,
  'https://www.nature.com/articles/x1',
);
check('study kind', study.kind === 'study', study.kind);
check('study title from citation', study.title === 'Selenium and TPO antibodies: a meta-analysis', study.title);
check('three authors shortened', study.author === 'Ruiz, Ana and others', study.author);
check('date normalised', study.published === '2024-03-05', study.published);
check('site without www', study.site === 'nature.com', study.site);
check('excerpt is short', study.excerpt.length <= W.MAX_EXCERPT_LENGTH + 3, study.excerpt.length);
check('excerpt ends in dots when cut', study.excerpt.endsWith('...'), study.excerpt);
check('source line', W.describePageSource(study) === 'nature.com, Ruiz, Ana and others, 5 March 2024', W.describePageSource(study));
check('study offers health', JSON.stringify(W.offerForPage(study, null)) === JSON.stringify({ kind: 'destination', key: 'health', reason: 'The page reads as a published study.' }));
check('a sorted note gets no destination offer', W.offerForPage(study, 'thought') === null);

// An article from JSON-LD in a @graph.
const article = W.extractWebPage(
  `<html><head><title>Fallback</title>
  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"Site"},{"@type":"NewsArticle","headline":"Why compost heats up","author":[{"@type":"Person","name":"Sam Hill"}],"datePublished":"2025-06-01T08:00:00Z","description":"Microbes &amp; air."}]}</script>
  </head></html>`,
  'https://garden.example.org/compost',
);
check('article kind', article.kind === 'article', article.kind);
check('headline used', article.title === 'Why compost heats up', article.title);
check('author from node', article.author === 'Sam Hill', article.author);
check('date from node', article.published === '2025-06-01', article.published);
check('entities decoded', article.excerpt === 'Microbes & air.', article.excerpt);
check('article offers nothing', W.offerForPage(article, null) === null);

// A product page from og:type.
const product = W.extractWebPage(
  `<head><meta property="og:type" content="product"><meta property="og:title" content="Stainless water filter"><meta property="og:description" content="Fits most taps."></head>`,
  'https://shop.example.com/filter',
);
check('product kind', product.kind === 'product', product.kind);
check('product offers the grocery list', W.offerForPage(product, null)?.key === 'shopping');

// A recipe page.
const recipe = W.extractWebPage(
  `<head><script type="application/ld+json">{"@type":"Recipe","name":"Lentil soup","recipeIngredient":["1 cup lentils","4 cups water"],"recipeInstructions":["Simmer."]}</script></head>`,
  'https://cook.example.com/lentil-soup',
);
check('recipe kind', recipe.kind === 'recipe', recipe.kind);
check('recipe offers the import', JSON.stringify(W.offerForPage(recipe, 'thought')) === JSON.stringify({ kind: 'recipe', url: 'https://cook.example.com/lentil-soup' }));

// A video and a bare page.
check('video by site', W.extractWebPage('<title>Clip</title>', 'https://www.youtube.com/watch?v=1').kind === 'video');
const bare = W.extractWebPage('<html><body>nothing</body></html>', 'https://example.net/a');
check('bare page kind', bare.kind === 'page', bare.kind);
check('bare page title falls back to the site', bare.title === 'example.net', bare.title);
check('bare page has no excerpt', bare.excerpt === null);
const para = W.extractWebPage(`<body><nav><p>${'menu '.repeat(30)}</p></nav><p>short</p><p>${long}</p></body>`, 'https://example.net/b');
check('excerpt skips nav and short paragraphs', para.excerpt.startsWith('Selenium'), para.excerpt);
check('redirect site used', W.extractWebPage('<title>x</title>', 'https://bit.ly/a', 'https://www.bbc.co.uk/news/1').site === 'bbc.co.uk');

// Dates.
check('month only', W.normaliseDate('2023-7') === '2023-07' && W.describePublished('2023-07') === 'July 2023');
check('year only', W.normaliseDate('2021') === '2021' && W.describePublished('2021') === '2021');
check('nonsense date', W.normaliseDate('last Tuesday') === null && W.normaliseDate('2024-13-40') === null);

// Links in notes.
check('link in a note', W.linkInNote('look at https://example.com/a later') === 'https://example.com/a');
check('no link', W.linkInNote('buy filters') === null);

// Wording.
const said = [...Object.values(W.WEB_PAGE_KIND_LABELS), study.excerpt, W.describePageSource(study), 'The page reads as a product page.', 'The page reads as a published study.'].join('\n');
for (const word of ['genuine', 'genuinely', 'real', 'honestly']) check(`no "${word}"`, !new RegExp(`\b${word}\b`, 'i').test(said));
check('no em or en dash', !/[–—]/.test(fs.readFileSync(path.join(__dirname, '..', 'lib', 'webCapture.ts'), 'utf8')));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

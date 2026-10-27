// Every piece of English the app can show outside the reading (2026-10-26),
// as the keys lib/i18n.ts looks up. Used by scripts/i18n_coverage.js and by
// the translation batches.
//
// What counts as words a person reads:
//  - JSX text, joined the way Babel hands it to a Text, with a value inside
//    it written {name} and a nested Text written <0>...</0>, which is how
//    translateChildren looks the whole Text up;
//  - string literals and template literals that read as words (a letter and
//    a space, or one capitalised word), with each ${...} written {name};
//    a ${a ? 'x' : 'y'} with two words in it gives one key per choice;
//  - 'words ' + value + ' words' chains, the same way.
// What is left out: imports, type-level strings, comparisons and case
// labels (those are keys the code tests, not words it shows), console and
// SQL, and properties and attributes whose names say they are not words
// (key, id, icon, route, style and the like).

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const FOLDERS = ['app', 'components', 'constants', 'hooks', 'lib'];
const SKIP = [
  path.join('lib', 'digest'),
  // Records the test data filler writes, which are data rather than words
  // the app says.
  path.join('lib', 'testDataGenerator.ts'),
  path.join('lib', 'translations'),
  path.join('lib', 'desktop', 'sqliteShim.ts'),
];

// The reading's entries are translated by scripts/i18n_batch.js --reading,
// but the names and descriptions around them (categories, topics, the
// groups inside a topic) are ordinary words looked up like any other.
const READING_FRAME = [
  path.join('lib', 'digest', 'index.ts'),
  path.join('lib', 'digest', 'categoryGrouping.ts'),
  path.join('lib', 'digest', 'conditionGrouping.ts'),
];

const ENTITIES = { apos: "'", quot: '"', amp: '&', lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', hellip: '…' };
function decode(text) {
  return text.replace(/&(#x?[0-9a-f]+|\w+);/gi, (whole, name) => {
    if (name[0] === '#') {
      const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name] ?? whole;
  });
}

// Babel's cleanJSXElementLiteralChild, which decides the string a Text gets.
function jsxString(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, index) => {
    if (/[^ \t]/.test(line)) last = index;
  });
  let out = '';
  lines.forEach((line, index) => {
    const isFirst = index === 0;
    const isLast = index === lines.length - 1;
    let trimmed = line.replace(/\t/g, ' ');
    if (!isFirst) trimmed = trimmed.replace(/^[ ]+/, '');
    if (!isLast) trimmed = trimmed.replace(/[ ]+$/, '');
    if (trimmed) {
      if (index !== last) trimmed += ' ';
      out += trimmed;
    }
  });
  return decode(out);
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    const skipped = SKIP.some((skip) => rel === skip || rel.startsWith(skip + path.sep));
    if (entry.isDirectory()) {
      if (skipped && READING_FRAME.some((file) => file.startsWith(rel + path.sep))) {
        for (const file of READING_FRAME) if (file.startsWith(rel + path.sep)) files.push(path.join(ROOT, file));
        continue;
      }
      if (!skipped) walk(full, files);
      continue;
    }
    if (skipped) continue;
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(full);
  }
}

const SQL = /\b(SELECT|INSERT INTO|UPDATE \w+ SET|DELETE FROM|CREATE (TABLE|INDEX)|ALTER TABLE|PRAGMA|ORDER BY|GROUP BY|LEFT JOIN|COALESCE|WHERE \w+ (=|IN|IS))\b/;
// An uppercase SQL keyword beside something only SQL writes (a column in
// snake_case, a ?, an IN list, a table.column), or a column list renamed
// with AS into camelCase.
const SQL_WORD = /\b(AND|OR|NOT|IN|LIKE|WHERE|SET|LIMIT|AS|NULL|DEFAULT|INTEGER|TEXT|REAL|BLOB|CASE|WHEN|THEN|ELSE|END|IS|ON|JOIN|DESC|ASC|VALUES|INTO|REPLACE|IGNORE|PRIMARY|KEY|REFERENCES|DISTINCT|COUNT|SUM|MAX|MIN|FROM|UPDATE|INSERT|SELECT|DELETE|EXISTS|UNION|HAVING|OFFSET|COLLATE|NOCASE|CHECK|UNIQUE|GLOB|BETWEEN|ATTACH|DATABASE)\b/;
function looksLikeSql(text) {
  if (/\b\w+ AS [a-z]+[A-Z]\w*/.test(text)) return true;
  if (!SQL_WORD.test(text)) return false;
  return /\?|\b[a-z]+_[a-z_]+\b|\(\{\w+\}\)|[=<>] ?\d|\b[a-z]+\.[a-z_]+\b|'\w*'|^\s*\w+ = /.test(text);
}

/** Whether a string reads as words somebody is shown. */
function readsAsWords(text) {
  const bare = text.replace(/\{\w+\}/g, '').replace(/<\/?\d+\/?>/g, '');
  if (!/[A-Za-z]{2}/.test(bare)) return false;
  if (SQL.test(text) || looksLikeSql(text)) return false;
  if (/^https?:|^www\.|^[\w./-]+\.(png|jpg|ts|tsx|js|json|db|txt|html|pdf|is|jsonl|sqlite|wav|mp3)$/i.test(text.trim())) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(text.trim())) return false;
  const trimmed = bare.trim();
  if (/\s/.test(trimmed)) {
    // Several words. Code with spaces in it (a CSS value, a key list) has no
    // capital and no punctuation of a sentence; words almost always do.
    if (/^[a-z0-9_.,:;=()\-'"[\]/*%<>!|&+ ]+$/.test(trimmed) && !/[a-z]{3,} [a-z]{3,} [a-z]{2,}/.test(trimmed)) return false;
    return true;
  }
  // One word: shown when it is capitalised the way a label is.
  return /^[A-Z][a-z’']+[.!?:…]?$/.test(trimmed) || /^[A-Z][a-z]+(-[A-Za-z]+)+$/.test(trimmed) || /^[A-Z]{2,5}$/.test(trimmed) && false;
}

const NOT_WORDS_NAME = /^(key|keys|id|ids|icon|iconName|iconFamily|route|routes|href|pathname|path|screen|type|kind|color|colour|tint|backgroundColor|borderColor|table|tableName|column|columns|sql|query|testID|nativeID|mode|variant|code|slug|field|metaKey|storageKey|value|values|fontFamily|fontWeight|uri|url|source|format|locale|lang|language|unitKey|ref|name_key|dbKey|channelId|categoryIdentifier|identifier|sound|style|contentContainerStyle|keyboardType|autoCapitalize|autoComplete|textContentType|returnKeyType|resizeMode|pointerEvents|animationType|presentationStyle|behavior|accessibilityRole|role|importantForAccessibility|ellipsizeMode|textBreakStrategy|dataDetectorType|lineBreakStrategyIOS|mimeType|UTI|encoding|alignItems|justifyContent|flexDirection|position|display|overflow|textAlign|textAlignVertical|transform|direction|tab|lens|section|band|sectionKey|bandKey|lensKey|tabKey|scheme|host|origin|domain|file|fileName|filename|folder|dir|extension|ext|event|action|actionId|platform|os|hand|side|edge|anchor|placement|align|easing|cacheKey|memoKey|selector)$/;

const SKIP_CALLS = /^(console\.\w+|require|import|execAsync|runAsync|getAllAsync|getFirstAsync|getAllSync|getFirstSync|runSync|execSync|prepareAsync|prepareSync|withTransactionAsync|querySelector|querySelectorAll|getElementById|addEventListener|removeEventListener|JSON\.parse|RegExp|new RegExp|\w+\.(includes|startsWith|endsWith|indexOf|lastIndexOf|split|match|matchAll|search|localeCompare|getItem|setItem|removeItem|has|delete|getAttribute|setAttribute|test|exec|padStart|padEnd)|router\.(push|replace|navigate)|navigation\.navigate|Linking\.openURL|openURL|getMeta|setMeta|deleteMeta|readMeta|writeMeta|getAppMeta|setAppMeta|emit|on|off|once|dispatchEvent|postMessage|invoke|send|fetch|Error|TypeError|RangeError)$/;

function calleeName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) {
    const left = calleeName(expression.expression);
    return left ? `${left}.${expression.name.text}` : `x.${expression.name.text}`;
  }
  return '';
}

function placeholderName(expression, used) {
  let node = expression;
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) node = node.expression;
  let name = 'value';
  if (ts.isIdentifier(node)) name = node.text;
  else if (ts.isPropertyAccessExpression(node)) name = node.name.text;
  else if (ts.isCallExpression(node)) {
    const callee = node.expression;
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && /^(toFixed|toLocaleString|toString|trim|toLowerCase)$/.test(callee.name.text)) {
      name = callee.expression.text;
    } else if (ts.isPropertyAccessExpression(callee) && ts.isPropertyAccessExpression(callee.expression)) {
      name = callee.expression.name.text;
    } else if (ts.isIdentifier(callee)) {
      name = callee.text.replace(/^(format|describe|get|make|build|show|read|to|plural|pluralize)/, '') || 'value';
      name = name.charAt(0).toLowerCase() + name.slice(1);
    }
  } else if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression)) name = node.expression.text;
  name = name.replace(/[^\w]/g, '') || 'value';
  if (/^\d/.test(name)) name = `v${name}`;
  let unique = name;
  let n = 2;
  while (used.has(unique)) unique = `${name}${n++}`;
  used.add(unique);
  return unique;
}

/** A ${a ? 'x' : 'y'} or `a ?? 'x'` with words in it: each choice, or null. */
function wordChoices(expression) {
  let node = expression;
  while (ts.isParenthesizedExpression(node)) node = node.expression;
  if (ts.isConditionalExpression(node)) {
    const a = literalText(node.whenTrue);
    const b = literalText(node.whenFalse);
    if (a !== null && b !== null) return [a, b];
  }
  return null;
}

function literalText(node) {
  while (ts.isParenthesizedExpression(node)) node = node.expression;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

/** Keys for a template literal, one per combination of word choices. */
function templateKeys(node) {
  let variants = [{ text: node.head.text, used: new Set() }];
  for (const span of node.templateSpans) {
    const choices = wordChoices(span.expression);
    const next = [];
    for (const variant of variants) {
      if (choices && choices.length * variants.length <= 8) {
        for (const choice of choices) next.push({ text: variant.text + choice + span.literal.text, used: new Set(variant.used) });
      } else {
        const used = new Set(variant.used);
        next.push({ text: `${variant.text}{${placeholderName(span.expression, used)}}${span.literal.text}`, used });
      }
    }
    variants = next;
  }
  return variants.map((variant) => variant.text);
}

/** 'a ' + x + ' b' as one key, or null when it is not a chain of words. */
function concatKey(node) {
  const parts = [];
  const flatten = (n) => {
    while (ts.isParenthesizedExpression(n)) n = n.expression;
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      flatten(n.left);
      flatten(n.right);
    } else parts.push(n);
  };
  flatten(node);
  if (!parts.some((p) => literalText(p) !== null)) return null;
  const used = new Set();
  let text = '';
  for (const part of parts) {
    const literal = literalText(part);
    if (literal !== null) text += literal;
    else if (ts.isTemplateExpression(part)) return null;
    else text += `{${placeholderName(part, used)}}`;
  }
  return text;
}

function isSkippedContext(node) {
  const parent = node.parent;
  if (!parent) return true;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent)) return true;
  if (ts.isLiteralTypeNode(parent)) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    const name = parent.name && (ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name)) ? parent.name.text : '';
    if (NOT_WORDS_NAME.test(name)) return true;
  }
  if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return true;
  if (ts.isCaseClause(parent)) return true;
  if (ts.isBinaryExpression(parent)) {
    const kind = parent.operatorToken.kind;
    if (
      kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
      kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
      kind === ts.SyntaxKind.EqualsEqualsToken ||
      kind === ts.SyntaxKind.ExclamationEqualsToken ||
      kind === ts.SyntaxKind.InKeyword
    ) {
      return true;
    }
  }
  if (ts.isJsxAttribute(parent) || (ts.isJsxExpression(parent) && parent.parent && ts.isJsxAttribute(parent.parent))) {
    const attribute = ts.isJsxAttribute(parent) ? parent : parent.parent;
    const name = attribute.name.getText();
    if (NOT_WORDS_NAME.test(name) || /Style$|Color$|^on[A-Z]|Key$|Id$|^data-/.test(name)) return true;
  }
  if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
    const name = calleeName(parent.expression);
    if (SKIP_CALLS.test(name)) return true;
    if (/\.(get|set|has)$/.test(name) && parent.arguments && parent.arguments[0] === node) return true;
  }
  if (ts.isTaggedTemplateExpression(parent)) return true;
  if (ts.isEnumMember(parent)) return true;
  return false;
}

/** The key translateChildren looks up for a JSX element's children. */
function jsxChildrenKey(children, sf) {
  const used = new Set();
  let text = '';
  let elementIndex = 0;
  let hasWords = false;
  let pieces = 0;
  for (const child of children) {
    if (ts.isJsxText(child)) {
      const words = jsxString(child.text);
      if (words) {
        text += words;
        pieces += 1;
        if (/[A-Za-z]/.test(words)) hasWords = true;
      }
    } else if (ts.isJsxExpression(child)) {
      if (!child.expression) continue;
      const literal = literalText(child.expression);
      if (literal !== null) {
        text += literal;
        if (/[A-Za-z]/.test(literal)) hasWords = true;
        pieces += 1;
      } else {
        text += `{${placeholderName(child.expression, used)}}`;
        pieces += 1;
      }
    } else if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      const index = elementIndex++;
      if (ts.isJsxElement(child)) {
        const inner = jsxChildrenKey(child.children, sf);
        text += inner && !inner.includes('<') ? `<${index}>${inner}</${index}>` : `<${index}/>`;
      } else text += `<${index}/>`;
      pieces += 1;
    } else {
      return null;
    }
  }
  if (!hasWords || pieces < 2) return null;
  return text;
}

function isTextElement(node) {
  const tag = ts.isJsxElement(node) ? node.openingElement.tagName.getText() : '';
  return /(^|\.)(Text|\w*Text|Animated\.Text)$/.test(tag);
}

function keysIn(file) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = [];
  const add = (text, node) => {
    const key = text.replace(/\r\n/g, '\n');
    if (readsAsWords(key)) found.push({ key, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
  };
  const visit = (node) => {
    if (ts.isJsxElement(node) && isTextElement(node)) {
      const whole = jsxChildrenKey(node.children, sf);
      if (whole) add(whole, node);
    }
    if (ts.isJsxText(node)) {
      const text = jsxString(node.text);
      if (/[A-Za-z]/.test(text)) add(text.trim(), node);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isSkippedContext(node) && !(node.parent && ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
        add(node.text, node);
      }
    } else if (ts.isTemplateExpression(node)) {
      if (!isSkippedContext(node)) for (const key of templateKeys(node)) add(key, node);
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const top = !(node.parent && ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken);
      if (top && !isSkippedContext(node)) {
        const key = concatKey(node);
        if (key) add(key, node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function allFiles() {
  const files = [];
  for (const folder of FOLDERS) walk(path.join(ROOT, folder), files);
  return files;
}

/** Map of key -> { count, where: 'file:line' of the first }. */
function extractAll(files = allFiles()) {
  const out = new Map();
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    for (const { key, line } of keysIn(file)) {
      const entry = out.get(key);
      if (entry) entry.count += 1;
      else out.set(key, { count: 1, where: `${rel}:${line}` });
    }
  }
  return out;
}

module.exports = { extractAll, allFiles, keysIn, readsAsWords, jsxString, ROOT };

if (require.main === module) {
  const keys = extractAll();
  let chars = 0;
  for (const key of keys.keys()) chars += key.length;
  console.log(`${keys.size} keys, ${chars} characters`);
  const outAt = process.argv.indexOf('--out');
  if (outAt >= 0) {
    fs.writeFileSync(process.argv[outAt + 1], JSON.stringify([...keys].map(([key, v]) => [key, v.where]), null, 0));
  }
}

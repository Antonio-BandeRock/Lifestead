// The app is Lifestead, and no text a person reads may say Inside Story.
// Direct instruction, 2026-10-12: "NOTHING should refer to Inside Story at
// all anymore on anything about the app, including messages like this."
// Walks every string, template and JSX text in the app's folders and reports
// any that carries the old name. Identifiers that hold records or reach a
// device keep it on purpose (file names, notification ids, crypto labels);
// those are one unbroken token with no spaces, so they pass, and a message
// that would show one goes through lib/fileInWords.ts. Must stay at 0.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOTS = ['lib', 'app', 'components', 'constants', 'hooks'];
// Case matters: insideStoryMarkup and the like are code inside an injected
// script, while Inside Story, inside-story and insidestory are what reads.
const OLD = /[Ii]nside[ -][Ss]tory|insidestory|InsideStory/;
// A folder name an older install made, looked for and never shown.
const ALLOWED = new Set(['Inside Story Photos']);

function walkDir(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const findings = [];
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walkDir(root, [])) {
    const text = fs.readFileSync(file, 'utf8');
    if (!OLD.test(text)) continue;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      let value = null;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) value = node.text;
      else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) value = node.text;
      else if (ts.isJsxText(node)) value = node.text;
      if (value !== null && OLD.test(value) && !ALLOWED.has(value)) {
        const identifier = /^[\w.:/@-]*$/.test(value.trim()) && !/^inside story/i.test(value.trim());
        // A regular expression literal or an import path is not text either.
        const inImport = ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent);
        if (!identifier && !inImport) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart());
          findings.push(file + ':' + (line + 1) + '  ' + value.trim().slice(0, 100));
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}
for (const finding of findings) console.log(finding);
console.log('audit_old_name: ' + findings.length + ' place' + (findings.length === 1 ? '' : 's') + ' where text says Inside Story');
process.exit(findings.length ? 1 : 0);

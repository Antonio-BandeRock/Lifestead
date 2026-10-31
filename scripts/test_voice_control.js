// Checks lib/voiceControl.ts: plain words into one thing to do.
const fs = require('fs');
const ts = require('typescript');
const source = fs.readFileSync(require.resolve('../lib/voiceControl.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } });
const t = {};
new Function('exports', outputText)(t);
let failed = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { failed++; console.log('FAIL', name, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); }
}
const named = (list) => list.map((name, i) => ({ id: `${name}#${i}`, name }));
const screen = {
  tabs: named(['Home', 'Food', 'Schedules', 'Signals', 'Insights', 'Trends', 'Reports', 'Garden', 'Life', 'Profile']),
  lenses: named(['Garden Areas', 'Horticulture', 'Growing Conditions', 'Days Until']),
  controls: named(['Save', 'Save and Add Another', 'Store Its Location', 'Close', 'Close', 'Add a Planting', 'Food']),
  fields: named(['Search foods', 'Notes', 'What is it? (bowling balls)']),
};
const c = (name) => screen.controls.filter((x) => x.name === name).map((x) => x.id);
check('help', t.resolveVoiceCommand('What can I say?', screen), { kind: 'help' });
check('back', t.resolveVoiceCommand('Go back.', screen), { kind: 'back' });
check('scroll down', t.resolveVoiceCommand('scroll down', screen), { kind: 'scroll', move: 'down' });
check('scroll to the top', t.resolveVoiceCommand('Scroll to the top', screen), { kind: 'scroll', move: 'top' });
check('go to tab', t.resolveVoiceCommand('Go to Garden', screen), { kind: 'tab', id: 'Garden#7' });
check('the tab', t.resolveVoiceCommand('open the Trends tab', screen), { kind: 'tab', id: 'Trends#5' });
check('lens', t.resolveVoiceCommand('Open Horticulture', screen), { kind: 'lens', id: 'Horticulture#1' });
check('lens over tab on partial', t.resolveVoiceCommand('show garden areas', screen), { kind: 'lens', id: 'Garden Areas#0' });
check('press exact', t.resolveVoiceCommand('Press Save', screen), { kind: 'press', ids: c('Save') });
check('press the button', t.resolveVoiceCommand('tap the save button', screen), { kind: 'press', ids: c('Save') });
check('press start of name', t.resolveVoiceCommand('press store its', screen), { kind: 'press', ids: c('Store Its Location') });
check('press two with one name', t.resolveVoiceCommand('Close', screen), { kind: 'press', ids: c('Close') });
check('bare name, button wins a tie', t.resolveVoiceCommand('Food', screen), { kind: 'press', ids: c('Food') });
check('go to a button', t.resolveVoiceCommand('open add a planting', screen), { kind: 'press', ids: c('Add a Planting') });
check('type in box', t.resolveVoiceCommand('Type milk in search', screen), { kind: 'type', text: 'milk', fieldIds: ['Search foods#0'] });
check('type keeps its own in', t.resolveVoiceCommand('Type one in ten in the notes', screen), { kind: 'type', text: 'one in ten', fieldIds: ['Notes#1'] });
check('search for', t.resolveVoiceCommand('Search for blueberries', screen), { kind: 'type', text: 'blueberries', fieldIds: ['Search foods#0'] });
check('type with no box', t.resolveVoiceCommand('type hello there', screen), { kind: 'type', text: 'hello there', fieldIds: screen.fields.map((f) => f.id) });
check('nothing called that', t.resolveVoiceCommand('press launch rocket', screen), { kind: 'notFound', heard: 'launch rocket' });
check('empty', t.resolveVoiceCommand('  ', screen), { kind: 'notFound', heard: '' });
check('key', t.voiceKey('The “Save” button!'), 'save');
check('ampersand', t.voiceKey('Backup & Restore'), 'backup and restore');

// Lenses on other tabs (1.0.66.26), from the directory Voice Control reads.
const dirSource = fs.readFileSync(require.resolve('../lib/voiceLensDirectory.ts'), 'utf8');
const dir = {};
new Function('exports', ts.transpileModule(dirSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText)(dir);
const titles = { '/': 'Home', '/food': 'Food', '/schedule': 'Schedules', '/log': 'Signals', '/insights': 'Insights', '/trends': 'Trends', '/reports': 'Reports', '/garden': 'Garden', '/interests': 'Interests', '/life': 'Life' };
const elsewhere = dir.VOICE_LENS_DIRECTORY.filter((l) => l.tab !== '/').map((l) => ({ id: `${l.tab}|${l.key}`, name: l.label, tab: titles[l.tab] }));
const home = { tabs: screen.tabs, lenses: [], controls: named(['Save']), fields: [], currentTab: 'Home', elsewhere };
check('every tab is in the directory', Object.keys(titles).every((tab) => dir.VOICE_LENS_DIRECTORY.some((l) => l.tab === tab)), true);
check('lens on another tab', t.resolveVoiceCommand('Open Horticulture', home), { kind: 'elsewhere', ids: ['/garden|horticulture'] });
check('lens on another tab, said bare', t.resolveVoiceCommand('Horticulture', home), { kind: 'elsewhere', ids: ['/garden|horticulture'] });
check('a tab beats a lens elsewhere', t.resolveVoiceCommand('Go to Garden', home), { kind: 'tab', id: 'Garden#7' });
const twice = t.resolveVoiceCommand('open days until', home);
check('same name on two tabs comes back as a choice', twice.kind === 'elsewhere' && twice.ids.length === 2, true);
check('naming the tab settles it', t.resolveVoiceCommand('open days until on life', home), { kind: 'elsewhere', ids: ['/life|daysUntil'] });
check('this tab first', t.resolveVoiceCommand('Open Days Until', { ...screen, currentTab: 'Garden', elsewhere }), { kind: 'lens', id: 'Days Until#3' });
check('a button here beats a lens elsewhere', t.resolveVoiceCommand('Save', home), { kind: 'press', ids: ['Save#0'] });
const { execFileSync } = require('child_process');
try {
  execFileSync(process.execPath, [require.resolve('./build_voice_lens_directory.js'), '--check'], { stdio: 'pipe' });
} catch (error) {
  failed++;
  console.log('FAIL', String(error.stdout || error.message).trim());
}

if (failed) { console.log(failed + ' failed'); process.exit(1); }
console.log('All voice control checks passed');

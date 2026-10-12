/* global __dirname */
// Checks the reminder tones (lib/alertTones.ts): every tone's file exists in
// assets/sounds, app.json bundles exactly those files, every channel id is
// one Android accepts, and the component previews every tone.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'lib/alertTones.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const { ALERT_TONES, VIBRATION_CHOICES, kindChannelId, describeAlert } = mod.exports;

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error('FAIL', message);
};

const files = ALERT_TONES.filter((t) => t.file).map((t) => t.file).sort();
for (const file of files) {
  if (!/^[a-z0-9_]+\.wav$/.test(file)) fail(`${file} is not a name Android accepts in res/raw`);
  if (!fs.existsSync(path.join(root, 'assets/sounds', file))) fail(`${file} is missing from assets/sounds`);
}
const onDisk = fs.readdirSync(path.join(root, 'assets/sounds')).filter((f) => f.endsWith('.wav')).sort();
if (JSON.stringify(onDisk) !== JSON.stringify(files)) fail(`assets/sounds holds ${onDisk.join(', ')} but the tones list ${files.join(', ')}`);

const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const plugin = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-notifications');
const bundled = ((plugin && plugin[1].sounds) || []).map((f) => path.basename(f)).sort();
if (JSON.stringify(bundled) !== JSON.stringify(files)) fail(`app.json bundles ${bundled.join(', ')}`);

const component = fs.readFileSync(path.join(root, 'components/ReminderAlertSettings.tsx'), 'utf8');
for (const file of files) if (!component.includes(`assets/sounds/${file}`)) fail(`no preview for ${file}`);

const keys = new Set();
for (const t of ALERT_TONES) {
  if (keys.has(t.key)) fail(`tone key ${t.key} twice`);
  keys.add(t.key);
}
for (const v of VIBRATION_CHOICES) {
  if (v.pattern.some((n) => !Number.isInteger(n) || n < 0)) fail(`vibration ${v.key} has a bad pattern`);
  if (v.key !== 'default' && v.key !== 'none' && v.pattern.length < 2) fail(`vibration ${v.key} has no buzz`);
}
for (const t of ALERT_TONES) {
  for (const v of VIBRATION_CHOICES) {
    const id = kindChannelId('photoSeries', { sound: t.key, vibration: v.key });
    if (!/^[A-Za-z0-9_-]+$/.test(id)) fail(`channel id ${id}`);
  }
}
if (kindChannelId('dose', { sound: 'nope', vibration: 'nope' }) !== 'kind-dose-default-default') fail('unknown keys should read as default');
if (!describeAlert(undefined).includes('Phone')) fail('describeAlert default');

if (failures === 0) console.log(`alert tones: ${files.length} tones, ${VIBRATION_CHOICES.length} vibrations, all checks pass`);
process.exit(failures === 0 ? 0 : 1);

// Checks the rules for files kept with a record (lib/attachments.ts): how a
// picked file is named and typed, what stops one being attached, how its
// copies are named in the Files folder, what a sync pass does, and the
// words under each file.
//
// The module is pure, so this runs here rather than needing a phone.
// Exits non-zero on any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
// This is a plain Node script run with node, so it does.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, () => ({}));
  return module.exports;
}

const a = load('lib/attachments.ts');

let checks = 0;
let failures = 0;
function expect(label, actual, wanted) {
  checks += 1;
  const got = JSON.stringify(actual);
  if (got !== JSON.stringify(wanted)) {
    failures += 1;
    console.log('FAIL ' + label + ': got ' + got + ', wanted ' + JSON.stringify(wanted));
  }
}

// Names and types.
expect('extension read', a.attachmentExtension('Lab Results.PDF'), 'pdf');
expect('no extension', a.attachmentExtension('README'), null);
expect('type from a specific picker type', a.attachmentMimeType('x.bin', 'application/pdf'), 'application/pdf');
expect('octet-stream falls to the extension', a.attachmentMimeType('a.docx', 'application/octet-stream'), a.ATTACHMENT_TYPES.docx);
expect('unknown stays a plain file', a.attachmentMimeType('a.xyz', null), 'application/octet-stream');
expect('extension from type', a.extensionForType('application/pdf'), 'pdf');
expect('jpeg gives jpg', a.extensionForType('image/jpeg'), 'jpg');
expect('file name keeps the extension', a.attachmentFileName('att_1_abc', 'pdf'), 'att_1_abc.pdf');
expect('file name with none', a.attachmentFileName('att_1_abc', null), 'att_1_abc.bin');
expect('ours', a.isAttachmentFileName('att_1_abc.pdf'), true);
expect('not ours', a.isAttachmentFileName('photo.jpg'), false);
expect('copy name', a.attachmentCopyName('att_1_abc'), 'att_1_abc.json');
expect('id from copy', a.idFromAttachmentCopyName('att_1_abc.json'), 'att_1_abc');
expect('a foreign file in the folder', a.idFromAttachmentCopyName('notes.json'), null);
expect('new id shape', a.newAttachmentId(5, 'Ab-9xyz12345'), 'att_5_Ab9xyz12');
expect('display name kept', a.attachmentDisplayName('  Insurance   letter.pdf ', 'pdf'), 'Insurance letter.pdf');
expect('display name when none', a.attachmentDisplayName('', 'pdf'), 'File.pdf');
const long = 'x'.repeat(200) + '.pdf';
expect('a long name keeps its extension', a.attachmentDisplayName(long, 'pdf').endsWith('.pdf'), true);
expect('a long name is cut', a.attachmentDisplayName(long, 'pdf').length <= a.ATTACHMENT_NAME_MAX, true);
expect('opening name from the person', a.openingFileName('Lab: May/June', 'att_1.pdf'), 'Lab May June.pdf');
expect('opening name keeps one extension', a.openingFileName('Lab.pdf', 'att_1.pdf'), 'Lab.pdf');

// What stops a file.
expect('empty refused', a.attachmentProblem(0) !== null, true);
expect('too large refused', a.attachmentProblem(a.ATTACHMENT_MAX_BYTES + 1) !== null, true);
expect('unknown size allowed', a.attachmentProblem(null), null);
expect('ordinary allowed', a.attachmentProblem(1000), null);

// A sync pass.
const rows = [
  { id: 'att_1_a', fileName: 'att_1_a.pdf' },
  { id: 'att_2_b', fileName: 'att_2_b.docx' },
  { id: 'att_3_c', fileName: 'att_3_c.txt' },
  { id: 'att_4_d', fileName: 'att_4_d.csv' },
];
const plan = a.planAttachmentSync({
  rows,
  localFileNames: ['att_1_a.pdf', 'att_3_c.txt'],
  folderNames: ['att_2_b.json', 'att_3_c.json', 'att_9_z.json', 'notes.json'],
  mayClearFolder: true,
});
expect('upload what the folder lacks', plan.upload, ['att_1_a']);
expect('download what is only there', plan.download, ['att_2_b']);
expect('waiting when neither', plan.waiting, ['att_4_d']);
expect('in the folder', plan.inFolder, ['att_2_b', 'att_3_c']);
expect('clears only our unreferenced copies', plan.clearFromFolder, ['att_9_z']);
const careful = a.planAttachmentSync({ rows, localFileNames: [], folderNames: ['att_9_z.json'], mayClearFolder: false });
expect('never clears unless this device saved last', careful.clearFromFolder, []);
expect('orphans', a.orphanedAttachmentFiles(['att_1_a.pdf'], ['att_1_a.pdf', 'att_7_q.pdf', 'other.txt']), ['att_7_q.pdf']);

// Words.
expect('size KB', a.attachmentSizeLabel(2048), '2 KB');
expect('size MB', a.attachmentSizeLabel(1.5 * 1024 * 1024), '1.5 MB');
expect('kind PDF', a.attachmentKindLabel({ mimeType: 'application/pdf', fileName: 'x.pdf' }), 'PDF');
expect('kind image', a.attachmentKindLabel({ mimeType: 'image/tiff', fileName: 'x.tif' }), 'Image');
expect('kind by extension', a.attachmentKindLabel({ mimeType: 'application/octet-stream', fileName: 'x.gpx' }), 'GPX file');
expect('kind plain', a.attachmentKindLabel({ mimeType: 'application/octet-stream', fileName: 'x.bin' }), 'File');
expect(
  'caption here',
  a.attachmentCaption({ mimeType: 'application/pdf', fileName: 'x.pdf', sizeBytes: 2048 }, true),
  'PDF, 2 KB',
);
expect(
  'caption on the way',
  a.attachmentCaption({ mimeType: 'application/pdf', fileName: 'x.pdf', sizeBytes: 2048 }, false).includes('other device'),
  true,
);
expect(
  'sorted oldest first',
  a.sortAttachments([{ id: 'b', createdAt: '2026-11-02' }, { id: 'a', createdAt: '2026-11-01' }]).map((x) => x.id),
  ['a', 'b'],
);

// Each place keeps only the kinds of file that belong with it.
expect('family pdf', a.attachmentFamily('application/pdf'), 'pdf');
expect('family image', a.attachmentFamily('image/heic'), 'image');
expect('family video', a.attachmentFamily('video/mp4'), 'video');
expect('family unknown', a.attachmentFamily('application/x-thing'), 'other');
expect('capture takes anything', a.attachmentSuits('capture_note', 'application/x-thing'), true);
expect('a lab report takes a pdf', a.attachmentSuits('lab_draw', 'application/pdf'), true);
expect('a lab report turns away a video', a.attachmentSuits('lab_draw', 'video/mp4'), false);
expect('upkeep takes a how-to video', a.attachmentSuits('upkeep', 'video/mp4'), true);
expect('an insurance plan turns away a song', a.attachmentSuits('insurance_plan', 'audio/mpeg'), false);
expect('a fitting file has no problem', a.attachmentTypeProblem('appointment', { mimeType: 'application/pdf', fileName: 'x.pdf' }), null);
const turned = a.attachmentTypeProblem('appointment', { mimeType: 'video/mp4', fileName: 'x.mp4' });
expect('a turned-away file names what the place takes', turned !== null && turned.includes(a.ATTACHMENT_PLACES.appointment.takes), true);
for (const [kind, place] of Object.entries(a.ATTACHMENT_PLACES)) {
  expect('removal names the file: ' + kind, place.removal.includes('{name}'), true);
  expect('takes is a sentence: ' + kind, /.$/.test(place.takes), true);
}

// No dash used as punctuation in anything a person reads.
const words = [
  a.ATTACHMENT_ON_THE_WAY,
  a.ATTACHMENT_NO_VIEWER,
  a.attachmentRemovalSentence('Lab.pdf'),
  a.attachmentProblem(0),
  a.attachmentProblem(a.ATTACHMENT_MAX_BYTES + 1),
  ...Object.values(a.ATTACHMENT_PLACES).flatMap((p) => [p.takes, p.removal]),
  turned,
];
for (const line of words) expect('no dash in: ' + line, /[–—]| -- /.test(line), false);

console.log(checks - failures + ' of ' + checks + ' checks passed.');
if (failures > 0) process.exit(1);

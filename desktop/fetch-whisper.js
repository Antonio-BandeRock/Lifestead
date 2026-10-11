#!/usr/bin/env node
// Puts the speech engine beside the desktop app (voice step 6, 1.0.66.24).
//
// The Windows app turns speech into words with whisper.cpp (MIT licence,
// github.com/ggml-org/whisper.cpp), run on this computer, so nothing said
// leaves it. This fetches one pinned release, checks it against the hash
// written below, and copies the command-line program and the libraries it
// loads into desktop/whisper/, which electron-builder.yml ships as
// resources/whisper. The folder is git-ignored; this runs at the start of
// `npm run dist` and does nothing when the folder already matches.
//
//   node desktop/fetch-whisper.js
//
// To move to a newer release, change RELEASE and SHA256 together, after the
// release has been out for two weeks, and run test_desktop_speech.js.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const RELEASE = 'b5130'; // v1.9.4, 2026-09-11
const ZIP_URL = `https://github.com/ggml-org/whisper.cpp/releases/download/${RELEASE}/whisper-bin-x64.zip`;
const SHA256 = 'f9ec6c52a2e949b62ab51fa21d0d497958f9e41c3010c157c4e42932d5316f3c';
const LICENSE_URL = 'https://raw.githubusercontent.com/ggml-org/whisper.cpp/v1.9.4/LICENSE';

// What whisper-cli.exe needs: itself, whisper and ggml, and the CPU
// variants ggml picks from at start for the processor it finds.
const KEEP = /^(whisper-cli\.exe|whisper\.dll|ggml\.dll|ggml-base\.dll|ggml-cpu-[a-z0-9]+\.dll)$/;

const target = path.join(__dirname, 'whisper');
const stamp = path.join(target, 'RELEASE.txt');

async function download(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('fetch-whisper: speech ships with the Windows app only; nothing to do here.');
    return;
  }
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8').trim() === `${RELEASE} ${SHA256}`) {
    console.log(`fetch-whisper: whisper.cpp ${RELEASE} is already in place.`);
    return;
  }
  console.log(`fetch-whisper: downloading whisper.cpp ${RELEASE}`);
  const zip = await download(ZIP_URL);
  const hash = crypto.createHash('sha256').update(zip).digest('hex');
  if (hash !== SHA256) throw new Error(`whisper.cpp ${RELEASE} does not match its hash (got ${hash}).`);

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lifestead-whisper-'));
  try {
    const zipFile = path.join(work, 'whisper.zip');
    fs.writeFileSync(zipFile, zip);
    const unpacked = path.join(work, 'unpacked');
    fs.mkdirSync(unpacked);
    // Windows' own tar reads zip files; a Git for Windows tar earlier on the
    // path does not, so it is named by its full path.
    const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
    execFileSync(tar, ['-xf', zipFile, '-C', unpacked]);
    const release = path.join(unpacked, 'Release');
    const picked = fs.readdirSync(release).filter((name) => KEEP.test(name));
    if (!picked.includes('whisper-cli.exe')) throw new Error('The release has no whisper-cli.exe.');

    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
    for (const name of picked) fs.copyFileSync(path.join(release, name), path.join(target, name));
    fs.writeFileSync(path.join(target, 'LICENSE.txt'), await download(LICENSE_URL));
    fs.writeFileSync(stamp, `${RELEASE} ${SHA256}\n`);
    console.log(`fetch-whisper: ${picked.length} files in desktop/whisper`);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`fetch-whisper: ${error.message}`);
  process.exit(1);
});

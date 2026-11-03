// Google Drive on a computer (1.0.80.6): the sign-in and every request.
//
// THE SIGN-IN RUNS IN THE PERSON'S BROWSER. Google does not allow its
// sign-in inside an app's own window, so signIn opens Google's page in the
// default browser and listens on a one-time address on this computer
// (127.0.0.1 and a port picked fresh) for Google to send the answer back.
// PKCE ties that answer to this run, so a code caught by anything else on
// the computer is worthless.
//
// THE REFRESH TOKEN IS KEPT WITH THE OTHER SECRETS (secrets.js), encrypted
// with this Windows account's key. The access token lives in memory only.
//
// THE TOKEN NEVER REACHES THE WINDOW. lib/googleDrive.ts hands each Drive
// request here through the bridge and this file attaches the token and
// sends it. That also keeps the request off the window's app:// origin,
// which Google's servers would refuse as cross-origin. Only Google's own
// addresses are sent anything.
//
// THE CLIENT. Google's Desktop app clients come with a secret that Google
// itself says cannot be kept secret in an installed app; it is read from
// google-oauth-desktop.json, which copy-google-oauth.js puts beside this
// file at build time from the backups folder, so it is never in git.

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { shell } = require('electron');

const secrets = require('./secrets');

const REFRESH_KEY = 'gdrive.refreshToken';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const SIGN_IN_WAIT_MS = 5 * 60 * 1000;
const ALLOWED_HOSTS = new Set(['www.googleapis.com']);

let accessToken = null;
let pendingSignIn = null;

function client() {
  const file = path.join(__dirname, 'google-oauth-desktop.json');
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const installed = parsed.installed ?? parsed;
    if (!installed.client_id || !installed.client_secret) return null;
    return { id: installed.client_id, secret: installed.client_secret };
  } catch {
    return null;
  }
}

function base64Url(bytes) {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function isSignedIn(userData) {
  try {
    return Boolean(secrets.get(userData, REFRESH_KEY));
  } catch {
    return false;
  }
}

const PAGE_DONE = `<!doctype html><meta charset="utf-8"><title>Lifestead</title>
<body style="font-family:system-ui,sans-serif;padding:40px;background:#f4f1ea;color:#222">
<h2 style="font-weight:normal">Lifestead is signed in to Google Drive.</h2>
<p>You can close this tab and go back to Lifestead.</p></body>`;
const PAGE_STOPPED = `<!doctype html><meta charset="utf-8"><title>Lifestead</title>
<body style="font-family:system-ui,sans-serif;padding:40px;background:#f4f1ea;color:#222">
<h2 style="font-weight:normal">The Google sign-in did not finish.</h2>
<p>You can close this tab and try again from Lifestead.</p></body>`;

async function tokenRequest(fields) {
  let response;
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
    });
  } catch {
    throw new Error('Google could not be reached. Check the connection and try again.');
  }
  const answer = await response.json().catch(() => ({}));
  return { status: response.status, answer };
}

/** Waits for Google's answer on a one-time address, then trades it for tokens. */
function runSignIn(userData) {
  const credentials = client();
  if (!credentials) {
    return Promise.resolve({
      ok: false,
      reason: 'This installer was built without its Google Drive setup. The next installer will have it.',
    });
  }
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64Url(crypto.randomBytes(16));

  return new Promise((resolve) => {
    let finished = false;
    let timer = null;
    const server = http.createServer();
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      server.close();
      resolve(result);
    };

    server.on('request', async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.pathname !== '/') {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      if (url.searchParams.get('state') !== state || (!code && !error)) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }).end(PAGE_STOPPED);
        return;
      }
      if (error || !code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(PAGE_STOPPED);
        finish({
          ok: false,
          reason: error === 'access_denied' ? 'Google Drive was not allowed, so nothing changed.' : 'The Google sign-in did not finish (' + error + ').',
        });
        return;
      }
      try {
        const { status, answer } = await tokenRequest({
          code,
          client_id: credentials.id,
          client_secret: credentials.secret,
          code_verifier: verifier,
          grant_type: 'authorization_code',
          redirect_uri: 'http://127.0.0.1:' + server.address().port,
        });
        if (status !== 200 || !answer.refresh_token || !answer.access_token) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(PAGE_STOPPED);
          finish({ ok: false, reason: 'Google did not finish the sign-in (' + (answer.error ?? status) + '). Try again in a few minutes.' });
          return;
        }
        secrets.set(userData, REFRESH_KEY, answer.refresh_token);
        accessToken = { token: answer.access_token, expiresAt: Date.now() + (answer.expires_in ?? 3600) * 1000 - 60_000 };
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(PAGE_DONE);
        finish({ ok: true });
      } catch (caught) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(PAGE_STOPPED);
        finish({ ok: false, reason: caught instanceof Error ? caught.message : 'The Google sign-in did not finish.' });
      }
    });

    server.on('error', () => finish({ ok: false, reason: 'This computer would not let Lifestead wait for Google’s answer. Try again.' }));

    server.listen(0, '127.0.0.1', () => {
      const redirect = 'http://127.0.0.1:' + server.address().port;
      const params = new URLSearchParams({
        client_id: credentials.id,
        redirect_uri: redirect,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',
        prompt: 'consent',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
      });
      timer = setTimeout(
        () => finish({ ok: false, reason: 'The Google sign-in waited five minutes with no answer, so it was stopped. Try again.' }),
        SIGN_IN_WAIT_MS,
      );
      shell.openExternal(AUTH_URL + '?' + params.toString()).catch(() =>
        finish({ ok: false, reason: 'The browser could not be opened for the Google sign-in.' }),
      );
    });
  });
}

function signIn(userData) {
  // A second press while the browser is still open waits on the same one.
  if (!pendingSignIn) {
    pendingSignIn = runSignIn(userData).finally(() => {
      pendingSignIn = null;
    });
  }
  return pendingSignIn;
}

async function signOut(userData) {
  let refresh = null;
  try {
    refresh = secrets.get(userData, REFRESH_KEY);
  } catch {
    refresh = null;
  }
  accessToken = null;
  try {
    secrets.remove(userData, REFRESH_KEY);
  } catch {
    // Nothing kept is the same outcome as removing it.
  }
  if (refresh) {
    // Revoking takes Lifestead out of the Google Account's list of apps too.
    try {
      await fetch(REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: refresh }).toString(),
      });
    } catch {
      // Offline: the local copy is gone, and the Google Account can remove the rest.
    }
  }
}

async function currentToken(userData, { fresh = false } = {}) {
  if (!fresh && accessToken && accessToken.expiresAt > Date.now()) return accessToken.token;
  const credentials = client();
  if (!credentials) throw new Error('This installer was built without its Google Drive setup.');
  let refresh = null;
  try {
    refresh = secrets.get(userData, REFRESH_KEY);
  } catch {
    refresh = null;
  }
  if (!refresh) throw new Error('Not signed in to Google Drive yet. Open the Shared Folder screen and tap Use Google Drive.');
  const { status, answer } = await tokenRequest({
    client_id: credentials.id,
    client_secret: credentials.secret,
    refresh_token: refresh,
    grant_type: 'refresh_token',
  });
  if (status !== 200 || !answer.access_token) {
    if (answer.error === 'invalid_grant') {
      // The access was removed in the Google Account, or ran out.
      try {
        secrets.remove(userData, REFRESH_KEY);
      } catch {
        // Already gone.
      }
      accessToken = null;
      throw new Error('Google no longer lets Lifestead into this Drive. Open the Shared Folder screen and tap Use Google Drive to sign in again.');
    }
    throw new Error('Google did not answer the sign-in (' + (answer.error ?? status) + '). Try again in a few minutes.');
  }
  accessToken = { token: answer.access_token, expiresAt: Date.now() + (answer.expires_in ?? 3600) * 1000 - 60_000 };
  return accessToken.token;
}

async function send(userData, request, fresh) {
  const token = await currentToken(userData, { fresh });
  const headers = { ...(request.headers ?? {}), Authorization: 'Bearer ' + token };
  let body;
  if (request.body instanceof Uint8Array) body = Buffer.from(request.body);
  else if (typeof request.body === 'string') body = request.body;
  try {
    return await fetch(request.url, { method: request.method, headers, body });
  } catch {
    throw new Error('Google Drive could not be reached. Check the connection and try again.');
  }
}

/** One Drive request from lib/googleDrive.ts, answered with its status, Location and bytes. */
async function request(userData, request) {
  let host;
  try {
    host = new URL(request.url).hostname;
  } catch {
    host = '';
  }
  if (!ALLOWED_HOSTS.has(host)) throw new Error('Only Google Drive is sent the Google sign-in.');
  let response = await send(userData, request, false);
  if (response.status === 401) response = await send(userData, request, true);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { status: response.status, location: response.headers.get('location'), body: bytes };
}

module.exports = { isSignedIn, signIn, signOut, request };

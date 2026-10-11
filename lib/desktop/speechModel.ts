// The one download the computer's speech needs (voice step 6, 1.0.66.24).
//
// desktop/speech.js turns speech into words with a 148 MB model the
// installer does not carry. The first press of a microphone on a computer
// without it asks, and only a yes starts the download; the question and what
// follows are drawn by components/DesktopSpeechHost.tsx, mounted once at the
// app root. hooks/useVoiceDictation.ts calls ensureDesktopSpeechModel before
// it listens, and listens only when it answers true.

export type DesktopSpeechAsk = { title: string; message: string; confirmLabel: string; cancelLabel: string };

type Host = {
  ask: (question: DesktopSpeechAsk) => Promise<boolean>;
  tell: (title: string, message: string) => void;
};

let host: Host | null = null;

/** components/DesktopSpeechHost.tsx registers itself here; null when it unmounts. */
export function setDesktopSpeechHost(next: Host | null): void {
  host = next;
}

function megabytes(bytes: number): number {
  return Math.round(bytes / 1_000_000);
}

export function downloadQuestion(totalBytes: number): DesktopSpeechAsk {
  return {
    title: 'Speak to Lifestead on this computer',
    message:
      `To turn what you say into words here, this computer needs a speech model, one file of about ${megabytes(totalBytes)} MB. ` +
      'It is downloaded once, from the page where the whisper.cpp project publishes it, and checked before it is used. ' +
      'After that, everything you say is turned into words on this computer and never leaves it, with or without the internet.',
    confirmLabel: 'Download It',
    cancelLabel: 'Not Now',
  };
}

export function downloadingSentence(received: number, total: number): string {
  const share = total > 0 ? Math.min(99, Math.floor((received / total) * 100)) : 0;
  return `The speech model is still downloading: ${megabytes(received)} of ${megabytes(total)} MB so far (${share}%). The microphone works once it is done, and the rest of the app can be used meanwhile.`;
}

export const DOWNLOAD_STARTED =
  'The speech model is downloading. It takes a few minutes on most connections, and the rest of the app can be used meanwhile. A message says when it is ready.';

export const DOWNLOAD_DONE = 'Speech is ready on this computer. Press any microphone to speak, and what you say stays here.';

/**
 * True when the model is on this computer and listening can start. Otherwise
 * asks (or says how the download is going) and answers false; once a
 * download finishes the person presses the microphone again.
 */
export async function ensureDesktopSpeechModel(): Promise<boolean> {
  const speech = typeof window !== 'undefined' ? window.insideStoryDesktop?.speech : undefined;
  if (!speech || !speech.shipped) return false;
  const status = await speech.status();
  if (status.model === 'ready') return true;
  if (!host) return false;
  if (status.model === 'downloading') {
    host.tell('Still Downloading', downloadingSentence(status.received, status.total));
    return false;
  }
  const yes = await host.ask(downloadQuestion(status.total));
  if (!yes) return false;
  host.tell('Downloading', DOWNLOAD_STARTED);
  void speech.downloadModel().then((result) => {
    if (result.ok) host?.tell('Speech Is Ready', DOWNLOAD_DONE);
    else host?.tell('The Download Stopped', `${result.problem} Press a microphone to try again.`);
  });
  return false;
}

// What a microphone press on a Windows computer says when it cannot listen;
// the fix is in a different place than on a phone.
export const DESKTOP_MIC_NOT_ALLOWED =
  'Windows is not letting Lifestead use the microphone. Turn it on in Windows Settings > Privacy & security > Microphone, including "Let desktop apps access your microphone", then press the microphone again.';

export const DESKTOP_NO_MICROPHONE =
  'This computer has no microphone Lifestead can open. Check that one is plugged in, switched on and not in use by another program, then press the microphone again.';

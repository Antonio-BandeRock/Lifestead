// What went wrong when the tester version closed by itself (tester plan T4).
//
// installCrashNote() puts itself in front of React Native's handler for an
// error nothing caught. A fatal one is written to a plain file before the
// app goes, synchronously, since nothing asynchronous finishes once the
// handler returns. The next time the app opens, Report a Problem offers to
// send it, and the file is removed once it has been sent or turned down.
//
// Only the error's message and stack are kept: never a record, never what
// was on screen. It is a plain file rather than a database row, because the
// database may be the thing that failed, and it is read before anything is
// open.
import { File, Paths } from 'expo-file-system';
import { formatCrash } from './problemReport';

const CRASH_FILE_NAME = 'lifestead_last_crash.txt';

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsShape = {
  getGlobalHandler: () => GlobalHandler;
  setGlobalHandler: (handler: GlobalHandler) => void;
};

function crashFile(): File {
  return new File(Paths.document, CRASH_FILE_NAME);
}

let installed = false;

export function installCrashNote(): void {
  if (installed) return;
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  // The computer app has no ErrorUtils; a failure there leaves the window
  // open, where the tester can report it as it happens.
  if (!errorUtils) return;
  installed = true;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
      try {
        const file = crashFile();
        if (!file.exists) file.create();
        file.write(formatCrash(error, new Date()));
      } catch {
        // Nothing more can be done while the app is going.
      }
    }
    previous(error, isFatal);
  });
}

/** The last crash, or null when the app has not closed by itself since. */
export function readCrashNote(): string | null {
  try {
    const file = crashFile();
    if (!file.exists) return null;
    const text = file.textSync().trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export function clearCrashNote(): void {
  try {
    const file = crashFile();
    if (file.exists) file.delete();
  } catch {
    // A file that cannot be removed is offered again next time, which is
    // the safer of the two ways to be wrong.
  }
}

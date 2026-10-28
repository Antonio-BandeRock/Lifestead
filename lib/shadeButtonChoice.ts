// Which notification shade buttons the person has turned off (1.0.75.3).
// Direct instruction, 2026-10-28: "those 3 need to be on by default and can
// be turned off if they want to. I don't see how they would intuitively know
// they were even there." Until then each button was off until somebody found
// Profile > Notification Shade Buttons, and a swipe in the shade turned one
// off for good with nothing said.
//
// So the choice that counts is kept here, apart from the native switch
// (ShadeButtons.kt), which a swipe also clears. Only Hidden picked in Profile
// is written down; everything else is wanted, and the app posts every wanted
// button that is missing from the shade on each start. A button swiped away
// is back the next time the app opens. Like the hand setting it belongs to
// the phone, not to the records, so it is a plain file that never syncs.
import { File, Paths } from 'expo-file-system';
import LockedCapture, { type ShadeButtonKind } from '../modules/locked-capture';

const HIDDEN_FILE_NAME = 'shade_buttons_hidden.txt';
export const SHADE_BUTTON_KINDS: ShadeButtonKind[] = ['voice', 'photo', 'command'];

function hiddenFile(): File {
  return new File(Paths.document, HIDDEN_FILE_NAME);
}

export function readHiddenShadeButtons(): Set<ShadeButtonKind> {
  try {
    const file = hiddenFile();
    if (!file.exists) return new Set();
    const kinds = file
      .textSync()
      .split(/\s+/)
      .filter((word): word is ShadeButtonKind => (SHADE_BUTTON_KINDS as string[]).includes(word));
    return new Set(kinds);
  } catch {
    return new Set();
  }
}

export function setShadeButtonHidden(kind: ShadeButtonKind, hidden: boolean): void {
  const kinds = readHiddenShadeButtons();
  if (hidden) kinds.add(kind);
  else kinds.delete(kind);
  try {
    hiddenFile().write([...kinds].join('\n'));
  } catch {
    // Holds until the next start, which posts the button again.
  }
}

// On every start: each wanted button is posted, again if it was swiped away,
// so it also carries the target that suits App Lock as it is now. Android
// says no while notifications are off for Lifestead, and that is left alone.
export function postWantedShadeButtons(): void {
  if (!LockedCapture) return;
  const hidden = readHiddenShadeButtons();
  if (typeof LockedCapture.showShadeButton === 'function') {
    for (const kind of SHADE_BUTTON_KINDS) {
      if (hidden.has(kind)) LockedCapture.hideShadeButton?.(kind);
      else LockedCapture.showShadeButton(kind);
    }
    return;
  }
  // A build from before 2026-10-12 shows the three together.
  if (hidden.size === 0) LockedCapture.showShadeButtons();
}

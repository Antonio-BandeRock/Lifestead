import { requireOptionalNativeModule } from 'expo';

// Null on a binary built before 1.0.62.1, on iPhone and on the desktop app,
// so every caller treats null as "this phone cannot do it yet".
export type ShadeButtonKind = 'voice' | 'photo' | 'command';

export type LockedCaptureModule = {
  /** Closes the capture screen shown over the lock screen. */
  finishCapture(): void;
  /** Keeps the Voice Note, Photo and Voice Control buttons in the notification shade. */
  showShadeButtons(): boolean;
  hideShadeButtons(): void;
  isShowingShadeButtons(): boolean;
  /**
   * One shade button at a time. Missing on a binary built before
   * 2026-10-12, where the one switch above posts all three.
   */
  showShadeButton?(kind: ShadeButtonKind): boolean;
  hideShadeButton?(kind: ShadeButtonKind): void;
  isShowingShadeButton?(kind: ShadeButtonKind): boolean;
  repostShadeButtons?(): void;
  /**
   * The emergency lines as a notification whose tap shows them over the lock
   * screen. Missing on a binary built before 1.0.63.12, so callers check
   * that it is a function and fall back to expo-notifications.
   */
  showEmergencyNotice?(title: string, body: string): boolean;
  hideEmergencyNotice?(): void;
};

export default requireOptionalNativeModule<LockedCaptureModule>('LockedCapture');

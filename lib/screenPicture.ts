// A picture of the screen for Report a Problem (tester plan T8, built on
// next-rebuild-tester because react-native-view-shot is native).
//
// Taken the moment the report sheet is asked for, before it draws, so the
// picture is of what the tester was looking at. It stays in the app's cache
// folder and goes nowhere unless the tester leaves it in and presses Send in
// their email app.
import { Platform } from 'react-native';
import { captureScreen } from 'react-native-view-shot';
import { isDesktopApp } from './desktop/bridge';

export async function takeScreenPicture(): Promise<string | null> {
  if (Platform.OS === 'web' || isDesktopApp()) return null;
  try {
    return await captureScreen({ format: 'jpg', quality: 0.7, result: 'tmpfile' });
  } catch (error) {
    console.warn('[problemReport] no picture of the screen', error);
    return null;
  }
}

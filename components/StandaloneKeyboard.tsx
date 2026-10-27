import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isDesktopApp } from '../lib/desktop/bridge';
import { ActiveInputProvider } from './ActiveInputContext';
import { AppKeyboard } from './AppKeyboard';
import { KeyboardLiftProvider, KeyboardLiftReleaser, KeyboardLiftView } from './KeyboardLift';

// The app keyboard for a screen the root one cannot reach (1.0.74.10).
//
// Direct instruction, 2026-10-27: "make sure that everywhere that requires a
// keyboard uses the app keyboard every time and never the phone keyboard.
// Also, the keyboard can never block where the user has to enter
// information." The root AppKeyboard (app/_layout.tsx) is drawn in the main
// window, so a field inside a Modal (its own native window) or in front of
// everything (the lock screen, which renders in place of the app) had either
// a keyboard drawn underneath it or no keyboard at all, which is why those
// fields used to fall back to the phone's.
//
// This wraps such a screen in a provider, a lift and a keyboard of its own.
// The inner ActiveInputProvider shadows the root one, so every AppTextInput
// inside registers here, the keyboard here types into it, and the lift here
// moves this screen's content above the keys. `followsRoute` is off because
// a Modal opens and closes without the route changing and the locked-phone
// words screen has no router at all. `bottom` is the safe-area inset, since
// none of these screens has the footer band the root keyboard sits on.
//
// The desktop mounts no drawn keyboard anywhere; a computer has a keyboard.
export function StandaloneKeyboard({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  if (isDesktopApp()) return <>{children}</>;
  return (
    <ActiveInputProvider>
      <KeyboardLiftProvider>
        <View style={styles.fill}>
          <KeyboardLiftView style={styles.fill}>{children}</KeyboardLiftView>
          <KeyboardLiftReleaser />
          <AppKeyboard followsRoute={false} bottom={insets.bottom} />
        </View>
      </KeyboardLiftProvider>
    </ActiveInputProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

// Which version of the app is running (tester plan T1, 2026-10-31).
//
// app.config.js makes three versions from one codebase: the store version,
// the tester version and the developer version, each with its own Android
// package and link scheme. The package is compiled into the build, so it is
// read here rather than anything an update carries: an update can never
// make a tester build think it is the developer one.
//
// Builds made before the three versions existed (package
// com.insidestoryapp.app, scheme hashimotosapp) read as 'legacy', and
// behave as the developer version does.
//
// Code inside the app writes its links as hashimotosapp://..., the form
// they have always had. ownLink() turns one into the running version's
// scheme at the point it leaves the app (a widget, a notification group, the
// OneDrive sign-in), so Android opens this version and not another one on
// the same phone.

import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { getDesktopBridge, isDesktopApp } from './desktop/bridge';

export type AppVariant = 'store' | 'test' | 'dev' | 'legacy';

const BY_PACKAGE: Record<string, AppVariant> = {
  'com.ghostead.lifestead': 'store',
  'com.ghostead.lifestead.test': 'test',
  'com.ghostead.lifestead.dev': 'dev',
  'com.insidestoryapp.app': 'legacy',
};

const SCHEMES: Record<AppVariant, string> = {
  store: 'lifestead',
  test: 'lifesteadtest',
  dev: 'lifesteaddev',
  legacy: 'hashimotosapp',
};

/** The scheme every link inside the app's code is written with. */
export const SOURCE_SCHEME = 'hashimotosapp';

function readVariant(): AppVariant {
  if (Platform.OS === 'web') {
    // The computer app says which installer it is through the bridge
    // (desktop/preload.js); an installer built before the tester one says
    // nothing and is the developer's.
    const said = isDesktopApp() ? getDesktopBridge().appVariant : undefined;
    return said === 'store' || said === 'test' || said === 'dev' ? said : 'legacy';
  }
  const id = Application.applicationId;
  return (id && BY_PACKAGE[id]) || 'legacy';
}

export const APP_VARIANT: AppVariant = readVariant();

/** The link scheme this version registers with the operating system. */
export const APP_SCHEME = SCHEMES[APP_VARIANT];

/** The tester version: developer tools gone, full paid, Report a Problem. */
export function isTesterBuild(): boolean {
  return APP_VARIANT === 'test';
}

/** The version that may show Developer Tools and Tell Claude. */
export function isDeveloperBuild(): boolean {
  return APP_VARIANT === 'dev' || APP_VARIANT === 'legacy';
}

/** A hashimotosapp:// link rewritten to this version's scheme. Anything
 *  else comes back unchanged. */
export function ownLink(uri: string): string {
  const prefix = SOURCE_SCHEME + '://';
  return uri.startsWith(prefix) ? APP_SCHEME + '://' + uri.slice(prefix.length) : uri;
}

/** True for a link meant for this app, in either spelling. */
export function isOwnLink(uri: string): boolean {
  return uri.startsWith(SOURCE_SCHEME + '://') || uri.startsWith(APP_SCHEME + '://');
}

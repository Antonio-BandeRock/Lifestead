/* global __dirname */
// The three versions of the app, made from one codebase (tester plan T1,
// 2026-10-31).
//
// app.json holds everything the versions share. This file reads APP_VARIANT,
// which each build profile in eas.json sets, and lays the version's identity
// over it: the name under the icon, the Android package and iOS bundle, the
// link scheme, and the icon colours.
//
//   store      Lifestead        com.ghostead.lifestead        lifestead://
//   test       Lifestead Test   com.ghostead.lifestead.test   lifesteadtest://
//   dev        Lifestead        com.ghostead.lifestead.dev    lifesteaddev://
//
// Each package is a separate app to Android, so the tester version installs
// beside the developer one and neither can read the other's records. Each
// scheme is registered in the Microsoft Entra app (redirect
// <scheme>://oauth/onedrive), and lib/appVariant.ts builds every link from
// the scheme of the version that is running.
//
// With APP_VARIANT unset, app.json is returned exactly as written. That keeps
// the runtime fingerprint of the builds already on phones, so an `eas update`
// made without the variable still reaches them.
//
// An OTA update reaches only the version it was made for: the fingerprint
// includes this config, so `APP_VARIANT=test npx eas-cli update --channel
// testers ...` matches the tester build and nothing else.

const VARIANTS = {
  store: {
    name: 'Lifestead',
    package: 'com.ghostead.lifestead',
    scheme: 'lifestead',
    inverted: false,
  },
  test: {
    name: 'Lifestead Test',
    package: 'com.ghostead.lifestead.test',
    scheme: 'lifesteadtest',
    inverted: true,
  },
  dev: {
    name: 'Lifestead',
    package: 'com.ghostead.lifestead.dev',
    scheme: 'lifesteaddev',
    inverted: false,
  },
};

function firebaseKnows(file, packageName) {
  try {
    const text = require('fs').readFileSync(require('path').join(__dirname, file), 'utf8');
    return text.includes(`"package_name": "${packageName}"`);
  } catch {
    return false;
  }
}

module.exports = ({ config }) => {
  const key = process.env.APP_VARIANT;
  if (!key) return config;
  const variant = VARIANTS[key];
  if (!variant) {
    throw new Error(`APP_VARIANT is "${key}", which is none of ${Object.keys(VARIANTS).join(', ')}`);
  }

  const android = { ...config.android, package: variant.package };
  // google-services.json names the packages Firebase knows, and the Gradle
  // step fails on a package it does not list. Until that package is added in
  // the Firebase console and the file downloaded again, the build goes without
  // it: the push wake is missing (lib/pushWake.ts checks the relay on every
  // open instead), and everything else works.
  if (android.googleServicesFile && !firebaseKnows(android.googleServicesFile, variant.package)) {
    delete android.googleServicesFile;
  }
  const ios = { ...config.ios, bundleIdentifier: variant.package };
  let icon = config.icon;
  if (variant.inverted) {
    // The tester icon is the same mark in inverted colours, so the two apps
    // on one phone are told apart at a glance (scripts/make_tester_icons.js).
    icon = './assets/brand/icon-test.png';
    android.adaptiveIcon = {
      ...config.android.adaptiveIcon,
      foregroundImage: './assets/brand/android-icon-foreground-test.png',
      backgroundColor: '#E0D5D3',
    };
  }

  return {
    ...config,
    name: variant.name,
    scheme: variant.scheme,
    icon,
    android,
    ios,
    extra: { ...config.extra, appVariant: key },
  };
};

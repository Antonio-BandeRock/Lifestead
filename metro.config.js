const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('db');

// Tell Claude's Edit wording mode (1.0.51.12): this app's own files get
// components/reactNativeWithEditableText.js when they import 'react-native',
// which is React Native with Text swapped for components/EditableText.tsx,
// so any words on screen can be tapped and changed without the files that
// draw them knowing. Libraries in node_modules, and the files that
// build the swap, get React Native itself. While the Tell Claude switch is
// off the swapped Text renders exactly as React Native's does. Neither
// @expo/fingerprint nor the runtime version reads this file, so this ships
// as an ordinary update. On the web target, which the Windows app runs,
// babel-preset-expo has already rewritten each named import into a deep
// import such as 'react-native-web/dist/exports/Text', so that path is
// swapped for components/editableTextForWeb.js the same way.
//
// The files below are left out by name, but that only works for a path
// with a slash in it. Metro caches a bare 'react-native' ONCE for every file
// outside node_modules (isSensitiveToOriginFolder in its DependencyGraph),
// so this function is asked about it once and every such file gets that
// one answer. That is why the swap's own files reach React Native through
// components/reactNativeText.js ('react-native/index') and never by the
// bare name: 1.0.51.12 did, got the swap back, and closed on launch.
// scripts/test_editable_text_resolver.js checks an Android export for it.
const OWN_SOURCE_FOLDERS = new Set(['app', 'components', 'lib', 'constants', 'hooks']);
const EDITABLE_TEXT_FILES = new Set([
  path.join(__dirname, 'components', 'reactNativeWithEditableText.js'),
  path.join(__dirname, 'components', 'EditableText.tsx'),
  path.join(__dirname, 'components', 'editableTextForWeb.js'),
  path.join(__dirname, 'components', 'reactNativeText.js'),
  path.join(__dirname, 'components', 'reactNativeText.web.js'),
  path.join(__dirname, 'components', 'voiceNamedControl.js'),
  path.join(__dirname, 'components', 'voiceWebTouchableOpacity.js'),
  path.join(__dirname, 'components', 'voiceWebTouchableHighlight.js'),
  path.join(__dirname, 'components', 'voiceWebPressable.js'),
  path.join(__dirname, 'components', 'voiceWebScrollView.js'),
  path.join(__dirname, 'components', 'voiceWebFlatList.js'),
  path.join(__dirname, 'components', 'voiceWebSectionList.js'),
]);
// Voice control (1.0.66.11) swaps the buttons and scroll views the same way,
// so each can put itself where voice commands find it; on the web target
// each deep import gets its own module. See components/voiceNamedControl.js.
const WEB_SWAPS = { Text: 'editableTextForWeb.js' };
for (const name of ['TouchableOpacity', 'TouchableHighlight', 'Pressable', 'ScrollView', 'FlatList', 'SectionList']) WEB_SWAPS[name] = `voiceWeb${name}.js`;
// A TextInput's placeholder in the app's language (2026-10-26).
WEB_SWAPS.TextInput = 'voiceWebTextInput.js';
const WEB_SWAP_MODULES = new Map();
for (const [name, file] of Object.entries(WEB_SWAPS)) {
  WEB_SWAP_MODULES.set(`react-native-web/dist/exports/${name}`, file);
  WEB_SWAP_MODULES.set(`react-native-web/dist/cjs/exports/${name}`, file);
}
function editableTextFor(context, moduleName) {
  const webSwap = WEB_SWAP_MODULES.get(moduleName);
  if (moduleName !== 'react-native' && !webSwap) return null;
  const origin = context.originModulePath;
  if (!origin || EDITABLE_TEXT_FILES.has(origin)) return null;
  const relative = path.relative(__dirname, origin);
  const top = relative.split(path.sep)[0];
  if (!OWN_SOURCE_FOLDERS.has(top)) return null;
  const swap = webSwap ?? 'reactNativeWithEditableText.js';
  return { type: 'sourceFile', filePath: path.join(__dirname, 'components', swap) };
}
{
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) =>
    editableTextFor(context, moduleName) ?? (upstream || context.resolveRequest)(context, moduleName, platform);
}

// The desktop app (desktop/, an Electron shell around this same code on
// its web target) is built with LIFESTEAD_DESKTOP=1 in the environment.
// Under that flag, and only on the web platform, a handful of modules
// resolve to a desktop stand-in in lib/desktop/ instead of the package:
// expo-sqlite becomes a bridge to SQLite running in Electron's main
// process, the 160 MB reference database is left out of the bundle (the
// installer ships it beside the app and copies it into place on first
// run), and the phone-only native modules become stubs that report
// themselves unavailable rather than failing to load. A phone build never
// sets the flag, so nothing here reaches the Android or iOS bundle, and
// @expo/fingerprint does not hash this file, so the runtime version is
// unaffected either way.
if (process.env.LIFESTEAD_DESKTOP === '1') {
  const shims = {
    'expo-sqlite': 'lib/desktop/expoSqliteShim.ts',
    'expo-secure-store': 'lib/desktop/secureStoreShim.ts',
    'expo-notifications': 'lib/desktop/notificationsShim.ts',
    'expo-file-system': 'lib/desktop/fileSystemShim.ts',
    // Voice step 6 (1.0.66.24): whisper.cpp on the computer, desktop/speech.js.
    'expo-speech-recognition': 'lib/desktop/speechRecognitionShim.ts',
    'react-native-health-connect': 'lib/desktop/unavailableModule.ts',
    'react-native-zeroconf': 'lib/desktop/unavailableModule.ts',
    '@dr.pogodin/react-native-static-server': 'lib/desktop/unavailableModule.ts',
    'rn-mlkit-ocr': 'lib/desktop/unavailableModule.ts',
    'expo-task-manager': 'lib/desktop/unavailableModule.ts',
    // Rebuild R1 (2026-10-02): Android home screen widgets.
    'react-native-android-widget': 'lib/desktop/unavailableModule.ts',
    'expo-quick-actions': 'lib/desktop/unavailableModule.ts',
    'expo-quick-actions/router': 'lib/desktop/unavailableModule.ts',
    'expo-share-intent': 'lib/desktop/unavailableModule.ts',
    'expo-contacts': 'lib/desktop/unavailableModule.ts',
    'react-native-view-shot': 'lib/desktop/unavailableModule.ts',
    'expo-mail-composer': 'lib/desktop/unavailableModule.ts',
    'expo-location': 'lib/desktop/unavailableModule.ts',
    'react-native-webview': 'lib/desktop/unavailableModule.ts',
  };
  const defaultResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web') {
      if (moduleName.endsWith('assets/data/foods_reference.db')) {
        return { type: 'empty' };
      }
      const shim = shims[moduleName];
      if (shim) {
        return { type: 'sourceFile', filePath: path.join(__dirname, shim) };
      }
    }
    return (defaultResolveRequest || context.resolveRequest)(context, moduleName, platform);
  };
}

// The tester and store versions (tester plan T2, 2026-10-31). app.config.js
// makes three versions from APP_VARIANT, and in the tester and store ones the
// developer-only modules below resolve to stand-ins in lib/variantStubs/, so
// Profile's Developer Tools card, Tell Claude, the 90-day seeder, the
// voiceover recorder and the versions bar
// are not in those bundles at all. A file is matched by where it resolved
// to, so every import path reaches the same stand-in. The developer version
// and a build from before the versions keep everything.
// lib/appVariant.ts is the second guard, at run time.
// scripts/audit_tester_bundle.js checks an exported tester bundle.
if (process.env.APP_VARIANT === 'test' || process.env.APP_VARIANT === 'store') {
  const nothing = path.join(__dirname, 'lib', 'variantStubs', 'NothingHere.tsx');
  const devOnly = new Map([
    [path.join(__dirname, 'components', 'TellClaudeHost.tsx'), nothing],
    [path.join(__dirname, 'components', 'VersionPreviewBar.tsx'), nothing],
    [path.join(__dirname, 'components', 'VoiceoverRecorder.tsx'), nothing],
    [path.join(__dirname, 'components', 'DeveloperToolsCard.tsx'), nothing],
    [path.join(__dirname, 'lib', 'devSeed.ts'), path.join(__dirname, 'lib', 'variantStubs', 'devSeed.ts')],
    [path.join(__dirname, 'components', 'ApproveTesterPanel.tsx'), nothing],
    [path.join(__dirname, 'lib', 'testerApprove.ts'), path.join(__dirname, 'lib', 'variantStubs', 'testerApprove.ts')],
  ]);
  const variantResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const result = (variantResolveRequest || context.resolveRequest)(context, moduleName, platform);
    const stub = result && result.type === 'sourceFile' ? devOnly.get(path.normalize(result.filePath)) : undefined;
    return stub ? { type: 'sourceFile', filePath: stub } : result;
  };
}

module.exports = config;

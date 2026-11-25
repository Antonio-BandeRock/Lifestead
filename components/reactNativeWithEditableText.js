// React Native with Text swapped for components/EditableText.tsx, so every
// piece of text in this app can be tapped and changed while Tell Claude's
// Edit wording mode is on (1.0.51.12). metro.config.js hands this module to
// this app's own files in place of 'react-native'; libraries in
// node_modules, EditableText.tsx and this file still get React Native itself.
//
// Since 1.0.66.11 the buttons and scroll views are swapped too, for voice
// control: components/voiceNamedControl.js wraps each so it puts itself in
// lib/voiceControlRegistry.ts while mounted, and passes every prop through.
//
// Every other export is passed through as a getter, so nothing is read from
// React Native until something asks for it, the same laziness React
// Native's own index relies on.
// 'react-native/index' rather than 'react-native': see reactNativeText.js.
const ReactNative = require('react-native/index');
const { EditableText } = require('./EditableText');
const { withVoiceName, withVoiceScroll } = require('./voiceNamedControl');
const { watchScreenReader } = require('../lib/screenReaderOn');
const { withTranslatedPlaceholder } = require('./translatedTextInput');

// Read on the first button built rather than now, for the laziness above.
let watching = false;
function voiceNamed(Original, name) {
  if (!watching) {
    watching = true;
    watchScreenReader(ReactNative.AccessibilityInfo);
  }
  return withVoiceName(Original, name);
}

const swapped = {
  Text: () => EditableText,
  TouchableOpacity: () => voiceNamed(ReactNative.TouchableOpacity, 'TouchableOpacity'),
  TouchableHighlight: () => voiceNamed(ReactNative.TouchableHighlight, 'TouchableHighlight'),
  Pressable: () => voiceNamed(ReactNative.Pressable, 'Pressable'),
  ScrollView: () => withVoiceScroll(ReactNative.ScrollView, 'ScrollView'),
  FlatList: () => withVoiceScroll(ReactNative.FlatList, 'FlatList'),
  SectionList: () => withVoiceScroll(ReactNative.SectionList, 'SectionList'),
  // Since 2026-10-26 a TextInput's placeholder is in the app's language.
  TextInput: () => withTranslatedPlaceholder(ReactNative.TextInput),
};

const withEditableText = {};
for (const key of Object.getOwnPropertyNames(ReactNative)) {
  if (key in swapped) continue;
  Object.defineProperty(withEditableText, key, {
    enumerable: true,
    configurable: true,
    get: () => ReactNative[key],
  });
}
// Built once, on first use, and the same component every time after, so a
// screen never sees a new component type between renders.
for (const key of Object.keys(swapped)) {
  let made = null;
  Object.defineProperty(withEditableText, key, {
    enumerable: true,
    configurable: true,
    get: () => {
      if (made === null) made = swapped[key]();
      return made;
    },
  });
}

module.exports = withEditableText;

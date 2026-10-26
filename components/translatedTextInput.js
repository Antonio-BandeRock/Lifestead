// Every TextInput in this app's own files with its placeholder in the app's
// language (2026-10-26). The same Metro swap that hands the app
// components/EditableText.tsx for Text hands it this for TextInput:
// components/reactNativeWithEditableText.js on the phone, and
// voiceWebTextInput.js on the desktop. Everything else reaches the input
// unchanged, including what the person types, which is never translated.
//
// Requires only 'react' and the two language modules, which import nothing
// from 'react-native', so none of them can resolve back to the swap.
const React = require('react');
const { translateIn } = require('../lib/i18n');
const { useLanguage } = require('../lib/language');

function withTranslatedPlaceholder(Original) {
  const Wrapped = React.forwardRef(function TranslatedTextInput(props, ref) {
    const language = useLanguage();
    if (language === 'en' || typeof props.placeholder !== 'string') {
      return React.createElement(Original, Object.assign({}, props, { ref }));
    }
    return React.createElement(
      Original,
      Object.assign({}, props, { ref, placeholder: translateIn(language, props.placeholder) }),
    );
  });
  Wrapped.displayName = 'TextInput';
  for (const key of Object.keys(Original)) {
    if (!(key in Wrapped)) {
      try {
        Wrapped[key] = Original[key];
      } catch {
        // A read-only static stays on the original only.
      }
    }
  }
  return Wrapped;
}

module.exports = { withTranslatedPlaceholder };

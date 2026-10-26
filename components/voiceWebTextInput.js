// The desktop half of the TextInput swap (2026-10-26): its placeholder in
// the app's language. See components/translatedTextInput.js, and
// voiceWebPressable.js for why the import names '/index'.
const Imported = require('react-native-web/dist/exports/TextInput/index');
const { withTranslatedPlaceholder } = require('./translatedTextInput');

const Original = Imported && Imported.default ? Imported.default : Imported;

module.exports = { __esModule: true, default: withTranslatedPlaceholder(Original) };

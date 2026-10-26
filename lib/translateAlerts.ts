// Every Alert.alert in the app's language (2026-10-26). The few native
// alerts left in the app are drawn by the operating system, so their words
// never pass through components/EditableText.tsx; this wraps Alert.alert
// once, at startup, so each title, message and button label is looked up
// at the moment the alert opens. Imported for its effect by app/_layout.tsx.
import { Alert, type AlertButton } from 'react-native';
import { t } from './i18n';

const original = Alert.alert.bind(Alert);
let wrapped = false;

if (!wrapped) {
  wrapped = true;
  Alert.alert = (title, message, buttons, options) =>
    original(
      typeof title === 'string' ? t(title) : title,
      typeof message === 'string' ? t(message) : message,
      buttons?.map((button: AlertButton) => (typeof button.text === 'string' ? { ...button, text: t(button.text) } : button)),
      options,
    );
}

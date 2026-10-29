// The title in a screen's header, in the app's language. A header title is
// drawn by React Navigation's own Text, which the Text swap in
// metro.config.js never reaches, so every Stack screen's title stayed in
// English with the app in Spanish (Check In, Capture, Where Is It). Given
// to the root Stack as headerTitle, so each screen keeps its English
// `title` and this turns it into words at the moment it is drawn.
import { HeaderTitle } from '@react-navigation/elements';
import type { StyleProp, TextStyle } from 'react-native';

import { translateIn } from '../lib/i18n';
import { useLanguage } from '../lib/language';

type Props = {
  children: string;
  tintColor?: string;
  style?: StyleProp<TextStyle>;
};

export default function TranslatedHeaderTitle({ children, tintColor, style }: Props) {
  const language = useLanguage();
  return (
    <HeaderTitle tintColor={tintColor} style={style}>
      {translateIn(language, children)}
    </HeaderTitle>
  );
}

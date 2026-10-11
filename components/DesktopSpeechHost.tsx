// The question before the computer's speech model downloads, and what is said
// after (lib/desktop/speechModel.ts). Mounted once at the app root
// (app/_layout.tsx); on a phone it registers nothing and draws nothing.
import { useEffect } from 'react';
import { isDesktopApp } from '../lib/desktop/bridge';
import { setDesktopSpeechHost } from '../lib/desktop/speechModel';
import { useConfirmSheet } from './ConfirmSheet';
import { useInfoAlert } from './InfoAlert';

export function DesktopSpeechHost() {
  const [confirm, confirmElement] = useConfirmSheet();
  const [showInfoAlert, infoAlertElement] = useInfoAlert();

  useEffect(() => {
    if (!isDesktopApp()) return;
    setDesktopSpeechHost({
      ask: (question) =>
        confirm({
          title: question.title,
          message: question.message,
          confirmLabel: question.confirmLabel,
          cancelLabel: question.cancelLabel,
        }),
      tell: showInfoAlert,
    });
    return () => setDesktopSpeechHost(null);
  }, [confirm, showInfoAlert]);

  return (
    <>
      {confirmElement}
      {infoAlertElement}
    </>
  );
}

// Files kept with a record (1.0.80.2): a PDF, a document, a spreadsheet or
// anything else attached to a Capture note. One compact line, a paperclip
// and the count, the way RecordPhotos shows photos; a tap opens the list,
// where each file opens in an app that reads its kind and Attach a File
// brings in another. Every rule and sentence is lib/attachments.ts.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { attachmentCaption, attachmentRemovalSentence, type Attachment, type AttachmentOwnerKind } from '../lib/attachments';
import {
  addAttachmentFromPicker,
  attachmentsHere,
  listAttachmentsOf,
  openAttachment,
  removeAttachment,
} from '../lib/attachmentsDb';
import { t } from '../lib/i18n';
import { useConfirmSheet } from './ConfirmSheet';

export function AttachedFiles({
  ownerKind,
  ownerId,
  tabColor,
  openerRef,
  openerMarkStyle,
}: {
  ownerKind: AttachmentOwnerKind;
  ownerId: string;
  tabColor: string;
  /** A how-to's ring on the opener, from the screen's walkMark. */
  openerRef?: (node: unknown) => void;
  openerMarkStyle?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Attachment[] | null>(null);
  const [here, setHere] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, confirmElement] = useConfirmSheet();

  const load = useCallback(async () => {
    const list = await listAttachmentsOf(ownerKind, ownerId);
    setItems(list);
    setHere(await attachmentsHere(list));
  }, [ownerKind, ownerId]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const handleAttach = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const result = await addAttachmentFromPicker(ownerKind, ownerId);
    setBusy(false);
    if (result.status === 'problem') setMessage(result.message);
    if (result.status === 'added') {
      setOpen(true);
      await load();
    }
  };

  const handleOpen = async (item: Attachment) => {
    setMessage(null);
    const failed = await openAttachment(item);
    if (failed) setMessage(failed);
    await load();
  };

  const handleRemove = async (item: Attachment) => {
    const ok = await confirm({
      title: t("Remove {name}?", { name: item.name }),
      message: attachmentRemovalSentence(item.name, t, ownerKind),
      confirmLabel: t('Remove'),
      destructive: true,
    });
    if (!ok) return;
    await removeAttachment(item);
    await load();
  };

  const count = items?.length ?? 0;
  const label = count === 0 ? t('Files') : t('Files ({count})', { count: String(count) });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        ref={openerRef}
        style={[styles.row, openerMarkStyle]}
        onPress={() => setOpen((value) => !value)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons name="attach-outline" size={16} color={tabColor} />
        <Text style={[styles.label, { color: tabColor }]}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={tabColor} />
      </TouchableOpacity>
      {open ? (
        <View style={styles.body}>
          {(items ?? []).map((item) => (
            <View key={item.id} style={styles.fileRow}>
              <TouchableOpacity
                style={styles.fileMain}
                onPress={() => void handleOpen(item)}
                accessibilityRole="button"
                accessibilityLabel={t("Open {name}", { name: item.name })}
              >
                <Ionicons name="document-outline" size={18} color={tabColor} />
                <View style={styles.fileText}>
                  <Text style={styles.fileName}>{item.name}</Text>
                  <Text style={styles.caption}>{attachmentCaption(item, here.has(item.id), t)}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleRemove(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("Remove {name}", { name: item.name })}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          {message ? <Text style={[styles.caption, { color: colors.statusRedOnSurface }]}>{message}</Text> : null}
          <TouchableOpacity style={styles.attachButton} onPress={handleAttach} disabled={busy} accessibilityRole="button">
            <Ionicons name="attach-outline" size={16} color={colors.textPrimary} />
            <Text style={styles.attachText}>{busy ? 'Attaching...' : 'Attach a File'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {confirmElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: { ...typography.caption, textShadowColor: 'transparent', textShadowRadius: 0 },
  body: { gap: 8, marginTop: 8 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fileMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileText: { flex: 1 },
  fileName: { ...typography.body, color: colors.textPrimary, textShadowColor: 'transparent', textShadowRadius: 0 },
  caption: { ...typography.caption, color: colors.textMuted, textShadowColor: 'transparent', textShadowRadius: 0 },
  attachButton: {
    ...BUTTON_SECONDARY_COMPACT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  attachText: { ...BUTTON_SECONDARY_TEXT },
});

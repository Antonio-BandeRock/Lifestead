import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { versionPreview } from '../lib/desktop/bridge';

// The bar along the top of one version of the app, P34 (2026-10-12). Direct
// request: "It must be a completely working version for each, not screen
// shots, with each versions settings switched on." Each version is the
// desktop app opened from the versions picker (desktop/versions.js) with
// records of its own, and this bar names which version the window is, the
// revision it is running, the revision its records were started on, and
// brings the picker back. It draws nothing in the person's own app and
// nothing on a phone, where versionPreview() is null.
export function VersionPreviewBar() {
  const preview = versionPreview();
  if (!preview) return null;
  const revision = preview.revision ? `revision ${preview.revision}` : 'revision not recorded';
  const started =
    preview.startedRevision && preview.startedRevision !== preview.revision
      ? `, records started on ${preview.startedRevision}`
      : '';
  return (
    <View style={styles.bar}>
      <Text style={styles.label} numberOfLines={2}>
        <Text style={styles.name}>{preview.label}</Text>
        {` · ${revision}${started}`}
      </Text>
      <TouchableOpacity
        style={styles.button}
        accessibilityRole="button"
        onPress={() => {
          void window.insideStoryDesktop?.versions?.showPicker();
        }}
      >
        <Text style={styles.buttonText}>All Versions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  name: {
    color: colors.textPrimary,
  },
  button: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.buttonColor,
  },
  buttonText: {
    fontSize: 13,
    color: colors.textOnButton,
  },
});

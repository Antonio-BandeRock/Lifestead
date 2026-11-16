// The welcome for people testing the app (tester plan T5, 2026-10-31).
//
// Not a one-time card. Direct decision, 2026-10-30: it stays on Home and
// also sits in Getting Set Up, so what testing asks of somebody, and how to
// say what they found, is never more than one look away. It is drawn only in
// the tester version; every other version has no such card, no switch for
// it and no place for it in Profile's lists (lib/visualPreferences.ts).
//
// T6 added the two ways a tester learns about updates: What Changed reads
// the last few release notes again, and a line appears when a new installer
// is needed, since an update over the air cannot bring native changes.
//
// Since 2026-11-15 it says when the next of the three reviews is due, and
// offers Start Your Review once it opens two weeks before
// (components/TesterReview.tsx). After the third the card is gone with the
// rest of the tester wording (lib/testerGraduation.ts).
//
// What Changed shows only once this device has been updated past the
// version it started on, and reads only the versions since then: a fresh
// install has nothing that changed for the person holding it.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BUTTON_PRIMARY,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY,
  BUTTON_SECONDARY_TEXT,
} from "../constants/buttons";
import { colors } from "../constants/colors";
import {
  formatReleaseNotesMessage,
  getReleaseNotesSince,
} from "../constants/releaseNotes";
import { textShadow, typography } from "../constants/typography";
import { APP_VERSION } from "../constants/version";
import { getFirstAppVersion } from "../lib/db";
import { t } from "../lib/i18n";
import { PROBLEM_REPORT_ADDRESS } from "../lib/problemReport";
import { openReportProblem } from "../lib/reportProblem";
import { useTesterAccess } from "../lib/testerAccess";
import { useTesterChrome, useTesterReview } from "../lib/testerGraduation";
import { REVIEW_ROUNDS, reviewPhase } from "../lib/testerReview";
import type { InstallerWaiting } from "../lib/testerInstaller";
import { checkTesterInstaller } from "../lib/testerInstallerCheck";
import { useInfoAlert } from "./InfoAlert";
import { useWalkMark } from "./WalkMark";

export const TESTER_WELCOME_TITLE = "Thank You for Testing Lifestead";

/** How many versions What Changed reads back. */
const NOTES_SHOWN = 4;

type Props = {
  /** Getting Set Up shows the heading inside the card; Home has it on the band. */
  showHeading?: boolean;
};

export function TesterWelcome({ showHeading = false }: Props) {
  const walkMark = useWalkMark();
  const [showInfoAlert, infoAlertElement] = useInfoAlert();
  const [installer, setInstaller] = useState<InstallerWaiting | null>(null);
  const router = useRouter();
  const tester = useTesterChrome();
  const access = useTesterAccess();
  const progress = useTesterReview();
  const [now] = useState(() => Date.now());
  const [firstVersion, setFirstVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!tester) return;
    let live = true;
    void getFirstAppVersion(APP_VERSION)
      .then((found) => {
        if (live) setFirstVersion(found);
      })
      .catch(() => undefined);
    void checkTesterInstaller().then((found) => {
      if (live) setInstaller(found);
    });
    return () => {
      live = false;
    };
  }, [tester]);

  if (!tester) return null;

  const showWhatChanged = () => {
    const notes = getReleaseNotesSince(firstVersion, APP_VERSION).slice(
      0,
      NOTES_SHOWN,
    );
    showInfoAlert(
      t("What Changed"),
      notes.length === 0
        ? t("There are no notes for this version yet.")
        : formatReleaseNotesMessage(notes, t),
    );
  };

  const openInstaller = () => {
    if (!installer) return;
    void Linking.openURL(installer.downloadUrl).catch(() => {
      showInfoAlert(
        t("Could Not Open the Link"),
        t("Write to {address} and we will send the new installer.", {
          address: PROBLEM_REPORT_ADDRESS,
        }),
      );
    });
  };

  const updatedSinceInstall = !!firstVersion && firstVersion !== APP_VERSION;
  const okState = access.state.kind === "ok" ? access.state : null;
  const phase = okState ? reviewPhase(progress, okState.approval.issued, now) : null;
  const dueDay = phase && phase.kind !== "graduated" ? new Date(phase.period.due).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <View style={styles.body}>
      {showHeading ? (
        <Text style={styles.heading}>{TESTER_WELCOME_TITLE}</Text>
      ) : null}
      {phase && phase.kind !== "graduated" ? (
        <View style={styles.installer}>
          <Text style={styles.line}>
            {phase.kind === "quiet"
              ? t(
                  "Review {round} of {total} is due on {day}. It opens two weeks before and asks about the parts of the app you used.",
                  { round: phase.round, total: REVIEW_ROUNDS, day: dueDay },
                )
              : phase.kind === "open"
                ? t(
                    "Review {round} of {total} is due on {day}, {count} days from now. You can start it now, and your answers are kept as you go.",
                    { round: phase.round, total: REVIEW_ROUNDS, day: dueDay, count: phase.daysLeft },
                  )
                : t("Review {round} of {total} is due now.", {
                    round: phase.round,
                    total: REVIEW_ROUNDS,
                  })}
          </Text>
          {phase.kind === "open" ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                ref={walkMark.ref('tester.review')}
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={() => router.push("/tester-review")}
                accessibilityRole="button"
              >
                <Ionicons
                  name="clipboard-outline"
                  size={18}
                  color={colors.textPrimary}
                />
                <Text style={styles.primaryButtonText}>Start Your Review</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
      {installer ? (
        <View style={styles.installer}>
          <Text style={styles.line}>
            {t(
              "A new installer, version {version}, is ready. Updates cannot bring this one by themselves. Installing it over the one you have keeps everything you have put in.",
              { version: installer.version },
            )}
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              ref={walkMark.ref('tester.installer')}
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={openInstaller}
              accessibilityRole="button"
            >
              <Ionicons
                name="download-outline"
                size={18}
                color={colors.textPrimary}
              />
              <Text style={styles.primaryButtonText}>
                Get the New Installer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      <Text style={styles.line}>
        You have the full paid version of Lifestead, with every feature turned
        on and nothing held back. Your records stay on this device, the way they
        always will.
      </Text>
      <Text style={styles.line}>
        Every 90 days there is a short review: a 1 to 5 for how easy and how
        useful each part you used is, a note by typing or the mic, and a list
        of the parts you have not tried yet. Sending it starts the next 90
        days.
      </Text>
      <Text style={styles.line}>
        After the third review, Lifestead is yours and your partner&apos;s to use
        free. The tester wording goes away, and everything you have put in
        stays.
      </Text>
      <Text style={styles.line}>
        When something goes wrong, or you wish something worked differently, tap
        the flag at the edge of the screen, or press and hold any band. Say what
        happened by typing or with the mic, and it goes by email to the people
        building the app.
      </Text>
      <Text style={styles.line}>
        Updates arrive by themselves and never take away what you have put in.
      </Text>
      <Text style={styles.line}>
        Please keep this version to yourself. It was made for you and this
        device.
      </Text>
      <Text style={styles.caption}>
        {t("Version {version}. Questions go to {address}.", {
          version: APP_VERSION,
          address: PROBLEM_REPORT_ADDRESS,
        })}
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          ref={walkMark.ref('tester.report')}
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => openReportProblem({})}
          accessibilityRole="button"
        >
          <Ionicons name="flag-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.buttonText}>Report a Problem</Text>
        </TouchableOpacity>
        {updatedSinceInstall ? (
          <TouchableOpacity
            ref={walkMark.ref('tester.whatChanged')}
            style={styles.button}
            activeOpacity={0.8}
            onPress={showWhatChanged}
            accessibilityRole="button"
          >
            <Ionicons
              name="newspaper-outline"
              size={18}
              color={colors.textPrimary}
            />
            <Text style={styles.buttonText}>What Changed</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {infoAlertElement}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  heading: {
    ...typography.sectionTitle,
    ...textShadow,
    color: colors.textPrimary,
  },
  line: { ...typography.body, ...textShadow, color: colors.textPrimary },
  caption: {
    ...typography.caption,
    ...textShadow,
    color: colors.textSecondary,
  },
  installer: { gap: 10 },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  button: {
    ...BUTTON_SECONDARY,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  buttonText: { ...BUTTON_SECONDARY_TEXT },
  primaryButton: {
    ...BUTTON_PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
});

// Interests > Learn, the course library (2026-11-05). Courses by subject, the ones
// meant for someone who reads the language the app is in listed first, and anything
// already being studied kept with them. Nothing here names a language: the matching
// is in lib/learnCourseLibrary.ts and reads each course's codes, so the list reorders
// by itself when the app's language changes.
//
// A course's name and description go through ordinary Text, so the two that ship
// with the app read in the app's language; an imported one has no entry in the table
// and shows as written. Studying opens its own screen, app/learn-course.tsx.

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWalkMark } from './WalkMark';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useTier } from '../lib/entitlement';
import { t } from '../lib/i18n';
import { useLanguage } from '../lib/language';
import { readCourseBytes, type Course } from '../lib/learnCourseFile';
import { buildLibrary, type LibraryShelf } from '../lib/learnCourseLibrary';
import { describeCourseMerge } from '../lib/learnCourseMerge';
import { keepCourseImport, listCourses, previewCourseImport, type CourseEntry, type CourseImportPreview } from '../lib/learnCoursesDb';
import { explainNotYet } from '../lib/notYet';
import { isFunctionWalled } from '../lib/paidFeatures';

const IMPORT_PAID_LINE =
  'Importing a course is part of Individual. The courses that come with the app stay open on Free, and a course you imported before stays open to study.';

type Pending = { course: Course; notes: string[]; preview: CourseImportPreview };

type Props = {
  tabColor: string;
  /** Tells the lens something it counts may have changed. */
  onChanged?: () => void;
};

export function LearnCoursesSection({ tabColor, onChanged }: Props) {
  const router = useRouter();
  const walkMark = useWalkMark();
  const appLanguage = useLanguage();
  const walled = isFunctionWalled(useTier(), 'learnMake');
  const [courses, setCourses] = useState<CourseEntry[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [doneLine, setDoneLine] = useState<string | null>(null);

  const load = useCallback(() => {
    listCourses()
      .then(setCourses)
      .catch(() => setCourses([]));
    onChanged?.();
  }, [onChanged]);

  useFocusEffect(load);

  async function pickFile() {
    if (walled) {
      explainNotYet(t(IMPORT_PAID_LINE));
      return;
    }
    setProblems([]);
    setDoneLine(null);
    setPending(null);
    let uri: string | null = null;
    try {
      const { File } = await import('expo-file-system');
      const picked = await File.pickFileAsync();
      const file = Array.isArray(picked) ? picked[0] : picked;
      if (file) uri = file.uri;
    } catch {
      // Choosing nothing lands here too, and needs no words.
      return;
    }
    if (!uri) return;
    try {
      const { File } = await import('expo-file-system');
      const read = readCourseBytes(await new File(uri).bytes(), t);
      if (!read.course) {
        setProblems(read.problems);
        return;
      }
      const preview = await previewCourseImport(read.course);
      if (preview.nothingChanged) {
        setDoneLine(t('Nothing in this course changed.'));
        return;
      }
      setPending({ course: read.course, notes: read.notes, preview });
    } catch {
      setProblems([t('This file could not be read. Open an .xlsx workbook or a .json course file.')]);
    }
  }

  async function keepPending() {
    if (!pending) return;
    try {
      const merge = await keepCourseImport(pending.course);
      setPending(null);
      setDoneLine(describeCourseMerge(merge, t));
      load();
    } catch {
      setProblems([t('This course could not be saved. Nothing was changed.')]);
    }
  }

  const library = buildLibrary(courses ?? [], appLanguage, (course) => course.settings.active);

  const shelf = (group: LibraryShelf<CourseEntry>) => (
    <View key={group.subject} style={styles.shelf}>
      <Text style={styles.heading}>{group.subject}</Text>
      {group.courses.map((course, index) => (
        <View key={course.deck.id} style={[styles.courseBlock, { borderLeftColor: tabColor }]}>
          <Text style={styles.body}>{course.deck.name}</Text>
          {course.deck.description ? <Text style={styles.caption}>{course.deck.description}</Text> : null}
          <Text style={styles.caption}>{t('{seen} of {total} cards seen', { seen: course.seen, total: course.deck.cardCount })}</Text>
          <TouchableOpacity
            ref={index === 0 ? walkMark.ref('learn.course') : undefined}
            style={[styles.primaryButton, index === 0 ? walkMark('learn.course') : null]}
            onPress={() => router.push({ pathname: '/learn-course', params: { id: course.deck.id } })}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Open Course</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Courses</Text>
      {courses === null ? <Text style={styles.caption}>Reading your courses…</Text> : null}
      {library.forYou.map(shelf)}
      {library.others.length > 0 ? (
        <TouchableOpacity onPress={() => setShowAll(!showAll)} accessibilityRole="button">
          <Text style={styles.linkText}>{showAll ? 'Show Fewer Courses' : 'Browse All Courses'}</Text>
        </TouchableOpacity>
      ) : null}
      {showAll ? library.others.map(shelf) : null}

      <TouchableOpacity
        ref={walkMark.ref('learn.importCourse')}
        style={[styles.secondaryButton, walkMark('learn.importCourse')]}
        onPress={() => void pickFile()}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>Import a Course</Text>
      </TouchableOpacity>

      {problems.length > 0 ? (
        <View style={styles.result}>
          <Text style={styles.label}>This file was not added.</Text>
          {problems.map((problem) => (
            <Text key={problem} style={styles.caption}>
              {problem}
            </Text>
          ))}
        </View>
      ) : null}

      {pending ? (
        <View style={styles.result}>
          <Text style={styles.body}>{pending.course.deck.name}</Text>
          {pending.course.deck.description ? <Text style={styles.caption}>{pending.course.deck.description}</Text> : null}
          <Text style={styles.caption}>{describeCourseMerge(pending.preview.merge, t)}</Text>
          {pending.notes.map((note) => (
            <Text key={note} style={styles.caption}>
              {note}
            </Text>
          ))}
          <View style={styles.row}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => void keepPending()} accessibilityRole="button">
              <Text style={styles.primaryText}>Keep This Course</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setPending(null)} accessibilityRole="button">
              <Text style={styles.secondaryText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {doneLine ? <Text style={styles.caption}>{doneLine}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  shelf: { gap: 6 },
  courseBlock: { gap: 6, paddingLeft: 8, borderLeftWidth: 2 },
  result: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  label: { ...typography.label, color: colors.textPrimary, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryText: BUTTON_PRIMARY_TEXT,
  secondaryButton: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryText: BUTTON_SECONDARY_TEXT,
});

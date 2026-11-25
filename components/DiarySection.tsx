// Life > Diary (1.0.96.2): what a person writes for themselves. The rules
// and sentences are lib/diary.ts, the reads and writes lib/diaryDb.ts and
// the exported page lib/diaryExport.ts.
//
// Writing works while the vault is closed; reading waits until it opens.
// What is being written is kept as a draft on this device, so leaving the
// page or locking the phone loses nothing.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BUTTON_PRIMARY,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY_COMPACT,
  BUTTON_SECONDARY_TEXT,
  PILL,
  PILL_ON,
  PILL_ON_TEXT,
  PILL_TEXT,
} from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useFadingMessage } from '../hooks/useFadingMessage';
import { countAttachmentsByOwner, listAttachmentsOf } from '../lib/attachmentsDb';
import { localStamp } from '../lib/dailyScales';
import {
  diaryNameProblem,
  diaryRows,
  entryProblem,
  entryTitle,
  findByWords,
  firstLine,
  fromDayBack,
  isDay,
  letGoOfDiary,
  LINK_KIND_LABELS,
  neighbours,
  onThisDay,
  type Diary,
  type DiaryDraft,
  type DiaryEntry,
  type DiaryLink,
  type DiaryLinkKind,
  type HealthLine,
} from '../lib/diary';
import {
  addDiary,
  deleteDiaryEntry,
  deleteEmptyDiary,
  dropDiaryDraft,
  keepDiaryDraft,
  listDiaries,
  listDiaryEntries,
  listDiaryLinkChoices,
  listDiaryLinks,
  listHealthLines,
  newDiaryEntryId,
  readDiaryDraft,
  renameDiary,
  saveDiaryEntry,
  setDiaryRetired,
  setDiaryShowsHealth,
  type DiaryLinkChoice,
} from '../lib/diaryDb';
import { diaryWhen, exportDiary } from '../lib/diaryExport';
import { t } from '../lib/i18n';
import { JOURNAL_PROMPTS, withPrompt } from '../lib/journalPrompts';
import { countMediaFor, listMediaOfKind } from '../lib/mediaDb';
import { explainNotYet } from '../lib/notYet';
import { saveOrSay } from '../lib/saveProblem';
import { buildTime24, splitTime24, type TimeOfDayInput } from '../lib/timeOfDay';
import { useOnVaultChange } from '../lib/vaultReads';
import { useVault } from '../lib/vaultSession';
import { AppTextInput } from './AppTextInput';
import { AttachedFiles } from './AttachedFiles';
import { useConfirmSheet } from './ConfirmSheet';
import { HorizontalScroll } from './HorizontalScroll';
import { NotesInput } from './NotesInput';
import { PhotoStrip } from './PhotoStrip';
import { PopoverSelect } from './PopoverSelect';
import { ReadProblem } from './ReadProblem';
import { ShowMoreButton, useShownPart } from './ShowMoreButton';
import { useTabBandStyles } from './TabBand';
import { ThumbRow } from './ThumbRow';
import { VaultClosedBand } from './VaultClosedBand';
import { VoiceRecordings } from './VoiceRecordings';
import { useWalkMark } from './WalkMark';

type Props = {
  tabColor: string;
  /** Opens this entry's page, from a timeline, Squares or Trends. */
  openEntryId?: string;
  /** Opens the writing page, from Home: a new value each press. */
  openWrite?: string;
};

type Mode = { kind: 'list' } | { kind: 'read'; id: string } | { kind: 'write'; draft: DiaryDraft };

const NONE = '__none__';

function newDraft(diaryId: string): DiaryDraft {
  return {
    entryId: newDiaryEntryId(),
    isNew: true,
    diaryId,
    happenedAt: localStamp(new Date()),
    body: '',
    isLifeEvent: false,
    lifeEventLabel: '',
    links: [],
  };
}

function draftOf(entry: DiaryEntry, links: readonly DiaryLink[]): DiaryDraft {
  return {
    entryId: entry.id,
    isNew: false,
    diaryId: entry.diaryId,
    happenedAt: entry.happenedAt,
    body: entry.body,
    isLifeEvent: entry.isLifeEvent,
    lifeEventLabel: entry.lifeEventLabel ?? '',
    links: links.filter((link) => link.entryId === entry.id).map(({ kind, targetId, label }) => ({ kind, targetId, label })),
  };
}

export function DiarySection({ tabColor, openEntryId, openWrite }: Props) {
  const router = useRouter();
  const vault = useVault();
  const closed = vault.closed && vault.categories.includes('diary');
  const healthClosed = vault.closed && vault.categories.includes('symptoms');
  const [diaries, setDiaries] = useState<Diary[] | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [links, setLinks] = useState<DiaryLink[]>([]);
  const [health, setHealth] = useState<HealthLine[]>([]);
  const [marks, setMarks] = useState<{ photos: Set<string>; files: Set<string> }>({ photos: new Set(), files: new Set() });
  const [draft, setDraft] = useState<DiaryDraft | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [readFailed, setReadFailed] = useState(false);

  const load = useCallback(async () => {
    setReadFailed(false);
    try {
      const [list, all, linkList, healthList, photos, files, kept] = await Promise.all([
        listDiaries(),
        listDiaryEntries(),
        listDiaryLinks(),
        listHealthLines(),
        listMediaOfKind('diary_entry'),
        countAttachmentsByOwner('diary_entry'),
        readDiaryDraft(),
      ]);
      setDiaries(list);
      setEntries(all);
      setLinks(linkList);
      setHealth(healthList);
      setMarks({ photos: new Set(photos.map((item) => item.ownerId)), files: new Set(files.keys()) });
      setDraft(kept);
    } catch (error) {
      console.warn('DiarySection could not be read', error);
      setReadFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useOnVaultChange(() => void load());

  // Closing the vault closes the page being read or written. The writer
  // keeps its draft as it goes.
  const wasClosed = useRef(closed);
  useEffect(() => {
    if (closed && !wasClosed.current) setMode({ kind: 'list' });
    wasClosed.current = closed;
  }, [closed]);

  const inUse = (diaries ?? []).filter((diary) => !diary.retiredAt);
  const chosen = (diaries ?? []).find((diary) => diary.id === chosenId) ?? inUse[0] ?? null;

  // What a link asked for, once the entries are here to open.
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!diaries) return;
    if (openWrite && opened.current !== `write:${openWrite}`) {
      opened.current = `write:${openWrite}`;
      const first = diaries.find((diary) => !diary.retiredAt);
      if (first) setMode({ kind: 'write', draft: newDraft(first.id) });
      return;
    }
    if (!openEntryId || opened.current === openEntryId) return;
    const entry = entries.find((item) => item.id === openEntryId);
    if (!entry) return;
    opened.current = openEntryId;
    setChosenId(entry.diaryId);
    setMode({ kind: 'read', id: entry.id });
  }, [diaries, entries, openEntryId, openWrite]);

  if (readFailed) {
    return <ReadProblem message="Your diary could not be read just now. Nothing you wrote is lost." onTryAgain={() => void load()} />;
  }
  if (!diaries || !chosen) return null;

  const openHealth = (id: string) =>
    router.push({ pathname: '/log', params: { openSignalsLens: 'generalNote', openHealthNoteId: id } });

  if (mode.kind === 'write') {
    return (
      <DiaryWriter
        key={mode.draft.entryId}
        tabColor={tabColor}
        start={mode.draft}
        diaries={diaries}
        health={healthClosed ? [] : health}
        onSaved={async (saved) => {
          setChosenId(saved.diaryId);
          await load();
          setMode(closed ? { kind: 'list' } : { kind: 'read', id: saved.entryId });
        }}
        onLeft={async () => {
          await load();
          setMode({ kind: 'list' });
        }}
      />
    );
  }

  const reading = mode.kind === 'read' ? entries.find((entry) => entry.id === mode.id) : undefined;
  if (reading) {
    return (
      <DiaryReader
        key={reading.id}
        tabColor={tabColor}
        entry={reading}
        diaries={diaries}
        entries={entries.filter((entry) => entry.diaryId === reading.diaryId)}
        links={links}
        health={health}
        onGo={(id) => setMode({ kind: 'read', id })}
        onBack={() => setMode({ kind: 'list' })}
        onChange={() => setMode({ kind: 'write', draft: draft?.entryId === reading.id ? draft : draftOf(reading, links) })}
        onRemoved={async () => {
          await load();
          setMode({ kind: 'list' });
        }}
        onOpenHealth={openHealth}
      />
    );
  }

  return (
    <DiaryList
      tabColor={tabColor}
      closed={closed}
      healthClosed={healthClosed}
      diaries={diaries}
      chosen={chosen}
      entries={entries}
      links={links}
      health={health}
      marks={marks}
      draft={draft}
      onChoose={setChosenId}
      onWrite={() => setMode({ kind: 'write', draft: newDraft(chosen.retiredAt ? inUse[0].id : chosen.id) })}
      onContinue={(kept) => setMode({ kind: 'write', draft: kept })}
      onRead={(id) => setMode({ kind: 'read', id })}
      onOpenHealth={openHealth}
      reload={load}
    />
  );
}

// --- The list -------------------------------------------------------------

function DiaryList({
  tabColor,
  closed,
  healthClosed,
  diaries,
  chosen,
  entries,
  links,
  health,
  marks,
  draft,
  onChoose,
  onWrite,
  onContinue,
  onRead,
  onOpenHealth,
  reload,
}: {
  tabColor: string;
  closed: boolean;
  healthClosed: boolean;
  diaries: Diary[];
  chosen: Diary;
  entries: DiaryEntry[];
  links: DiaryLink[];
  health: HealthLine[];
  marks: { photos: Set<string>; files: Set<string> };
  draft: DiaryDraft | null;
  onChoose: (id: string) => void;
  onWrite: () => void;
  onContinue: (draft: DiaryDraft) => void;
  onRead: (id: string) => void;
  onOpenHealth: (id: string) => void;
  reload: () => Promise<void>;
}) {
  const band = useTabBandStyles(tabColor);
  const walkMark = useWalkMark();
  const [confirm, confirmElement] = useConfirmSheet();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [words, setWords] = useState('');
  const [day, setDay] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [said, setSaid] = useFadingMessage();

  const inUse = diaries.filter((diary) => !diary.retiredAt);
  const away = diaries.filter((diary) => diary.retiredAt);
  const mine = entries.filter((entry) => entry.diaryId === chosen.id);
  const found = findByWords(isDay(day) ? fromDayBack(mine, day.trim()) : mine, words);
  // A search looks through what was written here, so health lines step aside.
  const withHealth = chosen.showHealth && !healthClosed && !words.trim();
  const healthShown = isDay(day) ? health.filter((line) => line.loggedAt.slice(0, 10) <= day.trim()) : health;
  const rows = diaryRows(found, healthShown, withHealth);
  const { shown, more, showMore } = useShownPart(rows);
  const before = onThisDay(mine, localStamp(new Date()));

  const add = async () => {
    const problem = diaryNameProblem(name, diaries);
    if (problem) return explainNotYet(problem);
    const done = await saveOrSay('The diary was not added. Try again.', async () => {
      onChoose(await addDiary(name));
      return true;
    });
    if (!done) return;
    setName('');
    setAdding(false);
    await reload();
  };

  const rename = async () => {
    const problem = diaryNameProblem(name, diaries.filter((diary) => diary.id !== chosen.id));
    if (problem) return explainNotYet(problem);
    const done = await saveOrSay('The name was not changed. Try again.', async () => {
      await renameDiary(chosen.id, name);
      return true;
    });
    if (!done) return;
    setName('');
    setRenaming(false);
    await reload();
  };

  const letGo = async () => {
    if (closed) return explainNotYet('Open the vault first, so the entries in this diary can be counted.');
    const answer = letGoOfDiary(chosen, mine.length, inUse.length);
    if (answer.action === 'refuse') return explainNotYet(answer.why);
    const ok = await confirm(
      answer.action === 'retire'
        ? {
            title: t('Put {name} away?', { name: chosen.name }),
            message: 'Everything written in it is kept, and you can open it or use it again at any time.',
            confirmLabel: t('Put Away'),
            destructive: false,
          }
        : {
            title: t('Remove {name}?', { name: chosen.name }),
            message: 'Nothing is written in it.',
            confirmLabel: t('Remove'),
            destructive: true,
          },
    );
    if (!ok) return;
    await saveOrSay('The diary was not changed. Try again.', async () => {
      if (answer.action === 'retire' || !(await deleteEmptyDiary(chosen.id))) await setDiaryRetired(chosen.id, true);
      return true;
    });
    onChoose(inUse.find((diary) => diary.id !== chosen.id)?.id ?? chosen.id);
    setManageOpen(false);
    await reload();
  };

  const letDraftGo = async (kept: DiaryDraft) => {
    const ok = await confirm({
      title: t('Let this unfinished entry go?'),
      message: kept.isNew ? 'The words, and any photos or recordings added to it, are removed.' : 'The entry goes back to how it was last saved.',
      confirmLabel: t('Let It Go'),
      destructive: true,
    });
    if (!ok) return;
    await saveOrSay('The unfinished entry is still here. Try again.', async () => {
      if (kept.isNew) await deleteDiaryEntry(kept.entryId);
      else await dropDiaryDraft(kept.entryId);
      return true;
    });
    await reload();
  };

  return (
    <>
      <View style={[band.box, styles.part]}>
        {confirmElement}
        <TouchableOpacity ref={walkMark.ref('diary.write')} style={[styles.primary, walkMark('diary.write')]} onPress={onWrite} accessibilityRole="button">
          <Text style={styles.primaryText}>{t('Write in {name}', { name: (chosen.retiredAt ? inUse[0] : chosen).name })}</Text>
        </TouchableOpacity>
        {draft ? (
          <View style={styles.panel}>
            <Text style={styles.caption}>{draft.isNew ? 'An entry you have not finished' : 'Changes you have not saved'}</Text>
            <Text style={styles.body}>{firstLine(draft.body) || t('No words yet')}</Text>
            <ThumbRow primary="first" style={styles.row}>
              <TouchableOpacity style={styles.secondary} onPress={() => onContinue(draft)} accessibilityRole="button">
                <Text style={styles.secondaryText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={() => void letDraftGo(draft)} accessibilityRole="button">
                <Text style={styles.secondaryText}>Let It Go</Text>
              </TouchableOpacity>
            </ThumbRow>
          </View>
        ) : null}
        <View ref={walkMark.ref('diary.which')} style={walkMark('diary.which')}>
          <HorizontalScroll contentContainerStyle={styles.pills}>
            {(chosen.retiredAt ? [...inUse, chosen] : inUse).map((diary) => {
              const on = diary.id === chosen.id;
              return (
                <TouchableOpacity
                  key={diary.id}
                  style={[styles.pill, on && styles.pillOn]}
                  onPress={() => onChoose(diary.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.pillText, on && styles.pillTextOn]}>{diary.name}</Text>
                </TouchableOpacity>
              );
            })}
          </HorizontalScroll>
        </View>
        <View style={styles.row}>
          <TouchableOpacity
            ref={walkMark.ref('diary.addDiary')}
            style={[styles.secondary, walkMark('diary.addDiary')]}
            onPress={() => {
              setName('');
              setRenaming(false);
              setAdding((value) => !value);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Add a Diary of Your Own</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => setManageOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: manageOpen }}>
            <Text style={styles.secondaryText}>This Diary</Text>
          </TouchableOpacity>
        </View>
        {adding ? (
          <View style={styles.panel}>
            <AppTextInput style={styles.input} placeholder="e.g. Letters to Maya, The garden, Dreams" value={name} onChangeText={setName} />
            <ThumbRow primary="first" style={styles.row}>
              <TouchableOpacity style={styles.secondary} onPress={() => void add()} accessibilityRole="button">
                <Text style={styles.secondaryText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={() => setAdding(false)} accessibilityRole="button">
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
            </ThumbRow>
          </View>
        ) : null}
        {manageOpen ? (
          <View style={styles.panel}>
            <Tick
              on={chosen.showHealth}
              label="Show my Health Journal here"
              note="Each Health Journal entry appears on its date as a marked line. It stays in the Health Journal, and opens there."
              onPress={() =>
                void saveOrSay('That was not changed. Try again.', async () => {
                  await setDiaryShowsHealth(chosen.id, !chosen.showHealth);
                  await reload();
                  return true;
                })
              }
            />
            {renaming ? (
              <>
                <AppTextInput style={styles.input} value={name} onChangeText={setName} />
                <TouchableOpacity style={styles.secondary} onPress={() => void rename()} accessibilityRole="button">
                  <Text style={styles.secondaryText}>Save the Name</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.secondary}
                  onPress={() => {
                    setAdding(false);
                    setName(chosen.name);
                    setRenaming(true);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryText}>Rename</Text>
                </TouchableOpacity>
                {chosen.retiredAt ? (
                  <TouchableOpacity
                    style={styles.secondary}
                    onPress={() =>
                      void saveOrSay('The diary was not changed. Try again.', async () => {
                        await setDiaryRetired(chosen.id, false);
                        await reload();
                        return true;
                      })
                    }
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryText}>Use Again</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.secondary} onPress={() => void letGo()} accessibilityRole="button">
                    <Text style={styles.secondaryText}>{mine.length > 0 || closed || chosen.id === 'diary_daily' ? 'Put Away' : 'Remove'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {away.length > 0 ? (
              <>
                <Text style={styles.caption}>Put away</Text>
                <View style={styles.row}>
                  {away.map((diary) => (
                    <TouchableOpacity key={diary.id} style={styles.secondary} onPress={() => onChoose(diary.id)} accessibilityRole="button">
                      <Text style={styles.secondaryText}>{t('Open {name}', { name: diary.name })}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      {closed ? (
        <VaultClosedBand color={tabColor} categories={['diary']} />
      ) : (
        <>
          {before.length > 0 ? (
            <View style={[band.box, styles.part]}>
              <Text style={styles.heading}>On this day</Text>
              {before.map((entry) => (
                <EntryRow key={entry.id} entry={entry} marks={marks} color={tabColor} onPress={() => onRead(entry.id)} />
              ))}
            </View>
          ) : null}

          <View style={[band.box, styles.part]}>
            <Text style={styles.heading}>{chosen.name}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                ref={walkMark.ref('diary.find')}
                style={[styles.secondary, walkMark('diary.find')]}
                onPress={() => setFindOpen((value) => !value)}
                accessibilityRole="button"
                accessibilityState={{ expanded: findOpen }}
              >
                <Text style={styles.secondaryText}>Find</Text>
              </TouchableOpacity>
              <TouchableOpacity
                ref={walkMark.ref('diary.export')}
                style={[styles.secondary, walkMark('diary.export')]}
                onPress={() => (entries.length === 0 ? explainNotYet('There is nothing written yet to make a PDF or a page from.') : setExportOpen((value) => !value))}
                accessibilityRole="button"
                accessibilityState={{ expanded: exportOpen }}
              >
                <Text style={styles.secondaryText}>PDF or Page</Text>
              </TouchableOpacity>
            </View>
            {findOpen ? (
              <View style={styles.panel}>
                <AppTextInput style={styles.input} placeholder="Words you wrote" value={words} onChangeText={setWords} />
                <AppTextInput style={styles.input} placeholder="From this day back, YYYY-MM-DD" value={day} onChangeText={setDay} voice={false} />
                {words.trim() || day.trim() ? (
                  <TouchableOpacity
                    style={styles.secondary}
                    onPress={() => {
                      setWords('');
                      setDay('');
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryText}>Show Everything</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            {exportOpen ? (
              <ExportPanel
                tabColor={tabColor}
                chosen={chosen}
                diaries={diaries}
                entries={entries}
                links={links}
                health={healthClosed ? [] : health}
                say={setSaid}
              />
            ) : null}
            {said ? <Text style={styles.caption}>{said}</Text> : null}
            {shown.length === 0 ? (
              <Text style={styles.caption}>{words.trim() || isDay(day) ? 'Nothing here matches that.' : 'Nothing written here yet.'}</Text>
            ) : null}
            {shown.map((row) =>
              row.kind === 'entry' ? (
                <EntryRow key={row.entry.id} entry={row.entry} marks={marks} color={tabColor} onPress={() => onRead(row.entry.id)} />
              ) : (
                <TouchableOpacity key={`health-${row.health.id}`} style={[styles.entry, { borderLeftColor: colors.tabBioCompass }]} onPress={() => onOpenHealth(row.health.id)} accessibilityRole="button">
                  <Text style={styles.caption}>{diaryWhen(row.happenedAt)}</Text>
                  <Text style={styles.body}>{t('Health Journal: {words}', { words: firstLine(row.health.words) })}</Text>
                </TouchableOpacity>
              ),
            )}
            <ShowMoreButton more={more} onPress={showMore} />
          </View>
        </>
      )}
    </>
  );
}

function EntryRow({
  entry,
  marks,
  color,
  onPress,
}: {
  entry: DiaryEntry;
  marks: { photos: Set<string>; files: Set<string> };
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.entry, { borderLeftColor: color }]} onPress={onPress} accessibilityRole="button">
      <View style={styles.entryTop}>
        <Text style={[styles.caption, styles.grow]}>{diaryWhen(entry.happenedAt)}</Text>
        {entry.isLifeEvent ? <Ionicons name="flag-outline" size={16} color={color} accessibilityLabel={t('Life event')} /> : null}
        {marks.photos.has(entry.id) ? <Ionicons name="image-outline" size={16} color={color} accessibilityLabel={t('Photos')} /> : null}
        {marks.files.has(entry.id) ? <Ionicons name="mic-outline" size={16} color={color} accessibilityLabel={t('Recordings or files')} /> : null}
      </View>
      <Text style={styles.body}>{entryTitle(entry) || t('No words')}</Text>
    </TouchableOpacity>
  );
}

function Tick({ on, label, note, onPress }: { on: boolean; label: string; note?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tick} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
      <View style={styles.grow}>
        <Text style={styles.body}>{label}</Text>
        {note ? <Text style={styles.caption}>{note}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// --- Export ---------------------------------------------------------------

type ExportScope = 'this' | 'every' | 'chosen';

function ExportPanel({
  tabColor,
  chosen,
  diaries,
  entries,
  links,
  health,
  say,
}: {
  tabColor: string;
  chosen: Diary;
  diaries: Diary[];
  entries: DiaryEntry[];
  links: DiaryLink[];
  health: HealthLine[];
  say: (message: string | null) => void;
}) {
  const [scope, setScope] = useState<ExportScope>('this');
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [withHealth, setWithHealth] = useState(false);
  const [busy, setBusy] = useState(false);
  const { shown, more, showMore } = useShownPart(entries);

  const make = async (as: 'pdf' | 'page') => {
    const list =
      scope === 'every'
        ? entries
        : scope === 'this'
          ? entries.filter((entry) => entry.diaryId === chosen.id)
          : entries.filter((entry) => ticked.has(entry.id));
    if (list.length === 0) {
      explainNotYet(scope === 'chosen' ? 'Tick the entries to put in it first.' : 'Nothing is written in this diary yet.');
      return;
    }
    const days = new Set(list.map((entry) => entry.happenedAt.slice(0, 10)));
    const lines = !withHealth ? [] : scope === 'chosen' ? health.filter((line) => days.has(line.loggedAt.slice(0, 10))) : health;
    setBusy(true);
    const result = await exportDiary({
      title: scope === 'this' ? chosen.name : t('My diary'),
      entries: list,
      diaries,
      links,
      health: lines,
      as,
    });
    setBusy(false);
    if (result.status === 'problem') say(result.message);
    if (result.status === 'done') {
      say(
        result.missing === 0
          ? t('Done. Your diary here is unchanged.')
          : result.missing === 1
            ? t('Done, without one photo or recording that has not arrived on this device yet.')
            : t('Done, without {count} photos or recordings that have not arrived on this device yet.', { count: String(result.missing) }),
      );
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.caption}>A PDF is for paper. A page keeps the photos and the sound, and opens in any browser with nothing installed. Neither is locked, so choose where it goes with care.</Text>
      <View style={styles.row}>
        {(['this', 'every', 'chosen'] as const).map((value) => (
          <TouchableOpacity key={value} style={[styles.pill, scope === value && styles.pillOn]} onPress={() => setScope(value)} accessibilityRole="button" accessibilityState={{ selected: scope === value }}>
            <Text style={[styles.pillText, scope === value && styles.pillTextOn]}>
              {value === 'this' ? chosen.name : value === 'every' ? 'Every diary' : 'Choose entries'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {scope === 'chosen' ? (
        <>
          {shown.map((entry) => (
            <Tick
              key={entry.id}
              on={ticked.has(entry.id)}
              label={entryTitle(entry) || t('No words')}
              note={diaryWhen(entry.happenedAt)}
              onPress={() =>
                setTicked((before) => {
                  const next = new Set(before);
                  if (!next.delete(entry.id)) next.add(entry.id);
                  return next;
                })
              }
            />
          ))}
          <ShowMoreButton more={more} onPress={showMore} />
        </>
      ) : null}
      {health.length > 0 ? (
        <Tick
          on={withHealth}
          label="Include my Health Journal entries"
          note={scope === 'chosen' ? 'The ones on the dates of the entries ticked.' : undefined}
          onPress={() => setWithHealth((value) => !value)}
        />
      ) : null}
      <View style={styles.row}>
        <TouchableOpacity style={styles.secondary} onPress={() => void make('pdf')} disabled={busy} accessibilityRole="button">
          <Text style={styles.secondaryText}>Make a PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => void make('page')} disabled={busy} accessibilityRole="button">
          <Text style={styles.secondaryText}>Make a Page</Text>
        </TouchableOpacity>
      </View>
      {busy ? <Text style={[styles.caption, { color: tabColor }]}>Putting it together...</Text> : null}
    </View>
  );
}

// --- Reading --------------------------------------------------------------

function DiaryReader({
  tabColor,
  entry,
  diaries,
  entries,
  links,
  health,
  onGo,
  onBack,
  onChange,
  onRemoved,
  onOpenHealth,
}: {
  tabColor: string;
  entry: DiaryEntry;
  diaries: Diary[];
  entries: DiaryEntry[];
  links: DiaryLink[];
  health: HealthLine[];
  onGo: (id: string) => void;
  onBack: () => void;
  onChange: () => void;
  onRemoved: () => Promise<void>;
  onOpenHealth: (id: string) => void;
}) {
  const band = useTabBandStyles(tabColor);
  const [confirm, confirmElement] = useConfirmSheet();
  const { earlier, later } = neighbours(entries, entry.id);
  const mine = links.filter((link) => link.entryId === entry.id);
  const about = mine.filter((link) => link.kind !== 'health');
  // A reference is followed only while its health record can be read.
  const healthLinks = mine.filter((link) => link.kind === 'health' && health.some((line) => line.id === link.targetId));

  const remove = async () => {
    const ok = await confirm({
      title: t('Remove this entry?'),
      message: 'The words, and the photos and recordings with them, are removed. A Health Journal entry it points at is not touched.',
      confirmLabel: t('Remove'),
      destructive: true,
    });
    if (!ok) return;
    const done = await saveOrSay('The entry was not removed. Try again.', async () => {
      await deleteDiaryEntry(entry.id);
      return true;
    });
    if (done) await onRemoved();
  };

  return (
    <View style={[band.box, styles.part]}>
      {confirmElement}
      <TouchableOpacity style={styles.secondary} onPress={onBack} accessibilityRole="button">
        <Text style={styles.secondaryText}>Back to the List</Text>
      </TouchableOpacity>
      <Text style={styles.caption}>{`${diaryWhen(entry.happenedAt)} · ${diaries.find((diary) => diary.id === entry.diaryId)?.name ?? ''}`}</Text>
      {entry.isLifeEvent && entry.lifeEventLabel ? <Text style={styles.heading}>{entry.lifeEventLabel}</Text> : null}
      {entry.body.trim() ? (
        <Text style={styles.reading} selectable>
          {entry.body.trim()}
        </Text>
      ) : null}
      <PhotoStrip ownerKind="diary_entry" ownerId={entry.id} tabColor={tabColor} title="Diary" />
      <VoiceRecordings ownerKind="diary_entry" ownerId={entry.id} tabColor={tabColor} readOnly />
      <AttachedFiles ownerKind="diary_entry" ownerId={entry.id} tabColor={tabColor} leaveOutSounds />
      {about.length > 0 ? <Text style={styles.caption}>{t('About: {names}', { names: about.map((link) => link.label).join(', ') })}</Text> : null}
      {healthLinks.map((link) => (
        <TouchableOpacity key={link.id} style={[styles.entry, { borderLeftColor: colors.tabBioCompass }]} onPress={() => onOpenHealth(link.targetId)} accessibilityRole="button">
          <Text style={styles.body}>{t('Health Journal: {words}', { words: link.label })}</Text>
        </TouchableOpacity>
      ))}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.secondary, !earlier && styles.dim]}
          onPress={() => (earlier ? onGo(earlier.id) : explainNotYet('This is the first entry in this diary.'))}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Earlier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondary, !later && styles.dim]}
          onPress={() => (later ? onGo(later.id) : explainNotYet('This is the newest entry in this diary.'))}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Later</Text>
        </TouchableOpacity>
      </View>
      <ThumbRow primary="first" style={styles.row}>
        <TouchableOpacity style={styles.secondary} onPress={onChange} accessibilityRole="button">
          <Text style={styles.secondaryText}>Change</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => void remove()} accessibilityRole="button">
          <Text style={styles.secondaryText}>Remove</Text>
        </TouchableOpacity>
      </ThumbRow>
    </View>
  );
}

// --- Writing --------------------------------------------------------------

async function hasFiles(entryId: string): Promise<boolean> {
  if ((await countMediaFor('diary_entry', entryId)) > 0) return true;
  return (await listAttachmentsOf('diary_entry', entryId)).length > 0;
}

async function keepOrDrop(draft: DiaryDraft): Promise<void> {
  const empty = draft.isNew && !draft.body.trim() && !draft.isLifeEvent && draft.links.length === 0 && !(await hasFiles(draft.entryId));
  if (empty) await dropDiaryDraft(draft.entryId);
  else await keepDiaryDraft(draft);
}

function DiaryWriter({
  tabColor,
  start,
  diaries,
  health,
  onSaved,
  onLeft,
}: {
  tabColor: string;
  start: DiaryDraft;
  diaries: Diary[];
  health: HealthLine[];
  onSaved: (draft: DiaryDraft) => Promise<void>;
  onLeft: () => Promise<void>;
}) {
  const band = useTabBandStyles(tabColor);
  const walkMark = useWalkMark();
  const [confirm, confirmElement] = useConfirmSheet();
  const [draft, setDraft] = useState(start);
  const [whenOpen, setWhenOpen] = useState(false);
  const [day, setDay] = useState(start.happenedAt.slice(0, 10));
  const [time, setTime] = useState<TimeOfDayInput>(splitTime24(start.happenedAt.slice(11, 16)));
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [choices, setChoices] = useState<DiaryLinkChoice[]>([]);
  const [busy, setBusy] = useState(false);

  const latest = useRef(draft);
  const changed = useRef(false);
  const finished = useRef(false);
  const change = (part: Partial<DiaryDraft>) => {
    changed.current = true;
    const next = { ...latest.current, ...part };
    latest.current = next;
    setDraft(next);
  };

  // Kept half a second after the last change, and at once on leaving or on
  // the phone going away.
  useEffect(() => {
    if (!changed.current) return undefined;
    const timer = setTimeout(() => {
      if (!finished.current) keepOrDrop(latest.current).catch((error) => console.warn('A diary draft was not kept', error));
    }, 500);
    return () => clearTimeout(timer);
  }, [draft]);
  useEffect(() => {
    const keepNow = () => {
      if (finished.current) return;
      if (!changed.current && !latest.current.isNew) return;
      keepOrDrop(latest.current).catch((error) => console.warn('A diary draft was not kept', error));
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') keepNow();
    });
    return () => {
      subscription.remove();
      keepNow();
    };
  }, []);

  useEffect(() => {
    listDiaryLinkChoices()
      .then(setChoices)
      .catch((error) => console.warn('Diary links could not be read', error));
  }, []);

  const setWhen = (nextDay: string, nextTime: TimeOfDayInput) => {
    setDay(nextDay);
    setTime(nextTime);
    const at = buildTime24(nextTime.hour, nextTime.minute, nextTime.ampm);
    change({ happenedAt: isDay(nextDay) && at ? `${nextDay.trim()}T${at}` : '' });
  };

  const save = async () => {
    if (busy) return;
    const problem = entryProblem(draft, await hasFiles(draft.entryId));
    if (problem) {
      if (!draft.happenedAt) setWhenOpen(true);
      if (draft.isLifeEvent && !draft.lifeEventLabel.trim()) setMoreOpen(true);
      explainNotYet(problem);
      return;
    }
    setBusy(true);
    const done = await saveOrSay('The entry was not saved. Try again.', async () => {
      await saveDiaryEntry(draft);
      return true;
    });
    setBusy(false);
    if (!done) return;
    finished.current = true;
    await onSaved(draft);
  };

  const keepForLater = async () => {
    const done = await saveOrSay('The unfinished entry was not kept. Try again.', async () => {
      if (changed.current || draft.isNew) await keepOrDrop(latest.current);
      return true;
    });
    if (!done) return;
    finished.current = true;
    await onLeft();
  };

  const letGo = async () => {
    const ok = await confirm({
      title: draft.isNew ? t('Let this entry go?') : t('Let these changes go?'),
      message: draft.isNew ? 'The words, and any photos or recordings added to it, are removed.' : 'The entry goes back to how it was last saved. Photos and recordings stay as they are now.',
      confirmLabel: t('Let It Go'),
      destructive: true,
    });
    if (!ok) return;
    finished.current = true;
    await saveOrSay('The entry is still here as an unfinished one. Try again.', async () => {
      if (draft.isNew) await deleteDiaryEntry(draft.entryId);
      else await dropDiaryDraft(draft.entryId);
      return true;
    });
    await onLeft();
  };

  const about = draft.links.filter((link) => link.kind !== 'health');
  const pointed = draft.links.find((link) => link.kind === 'health') ?? null;
  const diaryChoices = diaries.filter((diary) => !diary.retiredAt || diary.id === draft.diaryId);

  const addLink = (value: string) => {
    const choice = choices.find((item) => `${item.kind}|${item.targetId}` === value);
    if (!choice || draft.links.some((link) => link.kind === choice.kind && link.targetId === choice.targetId)) return;
    change({ links: [...draft.links, choice] });
  };
  const setPointed = (value: string) => {
    const rest = draft.links.filter((link) => link.kind !== 'health');
    const line = health.find((item) => item.id === value);
    change({ links: line ? [...rest, { kind: 'health' as DiaryLinkKind, targetId: line.id, label: firstLine(line.words) }] : rest });
  };

  return (
    <View style={[band.box, styles.part]}>
      {confirmElement}
      <View style={styles.entryTop}>
        <Text style={[styles.caption, styles.grow]}>
          {`${draft.happenedAt ? diaryWhen(draft.happenedAt) : t('Choose a date and a time')} · ${diaries.find((diary) => diary.id === draft.diaryId)?.name ?? ''}`}
        </Text>
        <TouchableOpacity style={styles.secondary} onPress={() => setWhenOpen((value) => !value)} accessibilityRole="button" accessibilityLabel={t('Change the date and time')}>
          <Text style={styles.secondaryText}>Change</Text>
        </TouchableOpacity>
      </View>
      {whenOpen ? (
        <View style={styles.panel}>
          <AppTextInput style={styles.input} placeholder="YYYY-MM-DD" value={day} onChangeText={(text) => setWhen(text, time)} voice={false} />
          <View style={styles.row}>
            <AppTextInput style={[styles.input, styles.timeInput]} placeholder="8" keyboardType="number-pad" maxLength={2} value={time.hour} onChangeText={(text) => setWhen(day, { ...time, hour: text })} />
            <Text style={styles.body}>:</Text>
            <AppTextInput style={[styles.input, styles.timeInput]} placeholder="00" keyboardType="number-pad" maxLength={2} value={time.minute} onChangeText={(text) => setWhen(day, { ...time, minute: text })} />
            {(['AM', 'PM'] as const).map((option) => (
              <TouchableOpacity key={option} style={[styles.pill, time.ampm === option && styles.pillOn]} onPress={() => setWhen(day, { ...time, ampm: option })} accessibilityRole="button" accessibilityState={{ selected: time.ampm === option }}>
                <Text style={[styles.pillText, time.ampm === option && styles.pillTextOn]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
      <View ref={walkMark.ref('diary.text')} style={walkMark('diary.text')}>
        <NotesInput style={[styles.input, styles.writing]} multiline textAlignVertical="top" placeholder="Write here" value={draft.body} onChangeText={(body) => change({ body })} />
      </View>
      <PhotoStrip ownerKind="diary_entry" ownerId={draft.entryId} tabColor={tabColor} title="Diary" />
      <VoiceRecordings ownerKind="diary_entry" ownerId={draft.entryId} tabColor={tabColor} />
      <AttachedFiles ownerKind="diary_entry" ownerId={draft.entryId} tabColor={tabColor} leaveOutSounds />
      <View style={styles.row}>
        <TouchableOpacity style={styles.secondary} onPress={() => setQuestionsOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: questionsOpen }}>
          <Text style={styles.secondaryText}>Give Me a Question</Text>
        </TouchableOpacity>
        <TouchableOpacity
          ref={walkMark.ref('diary.more')}
          style={[styles.secondary, walkMark('diary.more')]}
          onPress={() => setMoreOpen((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded: moreOpen }}
        >
          <Text style={styles.secondaryText}>More</Text>
        </TouchableOpacity>
      </View>
      {questionsOpen ? (
        <View style={styles.row}>
          {JOURNAL_PROMPTS.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              style={styles.pill}
              onPress={() => {
                change({ body: withPrompt(draft.body, t(prompt)) });
                setQuestionsOpen(false);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.pillText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {moreOpen ? (
        <View style={styles.panel}>
          <Text style={styles.caption}>In this diary</Text>
          <PopoverSelect
            options={diaryChoices.map((diary) => ({ label: diary.name, value: diary.id }))}
            selected={draft.diaryId}
            onSelect={(diaryId) => change({ diaryId })}
            tabColor={tabColor}
          />
          <Tick
            on={draft.isLifeEvent}
            label="This is a life event"
            note="It is drawn as a named line across the charts on Trends."
            onPress={() => change({ isLifeEvent: !draft.isLifeEvent })}
          />
          {draft.isLifeEvent ? (
            <AppTextInput style={styles.input} placeholder="e.g. Moved to the coast" value={draft.lifeEventLabel} onChangeText={(lifeEventLabel) => change({ lifeEventLabel })} />
          ) : null}
          {choices.length > 0 ? (
            <>
              <Text style={styles.caption}>What it is about</Text>
              <PopoverSelect
                options={choices.map((choice) => ({
                  label: `${t(LINK_KIND_LABELS[choice.kind as Exclude<DiaryLinkKind, 'health'>])}: ${choice.label}`,
                  value: `${choice.kind}|${choice.targetId}`,
                }))}
                selected={null}
                onSelect={addLink}
                tabColor={tabColor}
                placeholder="Choose a person, an interest or a place"
                searchable
              />
            </>
          ) : null}
          {about.map((link) => (
            <View key={`${link.kind}|${link.targetId}`} style={styles.entryTop}>
              <Text style={[styles.body, styles.grow]}>{link.label}</Text>
              <TouchableOpacity
                onPress={() => change({ links: draft.links.filter((item) => item !== link) })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('Take {name} off this entry', { name: link.label })}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          {health.length > 0 ? (
            <>
              <Text style={styles.caption}>A Health Journal entry to refer to</Text>
              <PopoverSelect
                options={[
                  { label: 'None', value: NONE },
                  ...health.map((line) => ({ label: `${line.loggedAt.slice(0, 10)}: ${firstLine(line.words)}`, value: line.id })),
                ]}
                selected={pointed?.targetId ?? NONE}
                onSelect={setPointed}
                tabColor={tabColor}
                searchable
              />
            </>
          ) : null}
        </View>
      ) : null}
      <ThumbRow primary="first" style={styles.row}>
        <TouchableOpacity
          ref={walkMark.ref('diary.save')}
          style={[styles.primary, styles.grow, walkMark('diary.save')]}
          onPress={() => void save()}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => void keepForLater()} accessibilityRole="button">
          <Text style={styles.secondaryText}>Keep for Later</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => void letGo()} accessibilityRole="button">
          <Text style={styles.secondaryText}>Let It Go</Text>
        </TouchableOpacity>
      </ThumbRow>
    </View>
  );
}

const styles = StyleSheet.create({
  part: { gap: 10 },
  panel: { gap: 10, padding: 12, borderRadius: 10, backgroundColor: colors.surfaceMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { ...PILL },
  pillOn: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillTextOn: { ...PILL_ON_TEXT },
  primary: { ...BUTTON_PRIMARY },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
  dim: { opacity: 0.5 },
  heading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  reading: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
  entry: { gap: 4, paddingLeft: 10, paddingVertical: 6, borderLeftWidth: 2 },
  entryTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
  tick: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  writing: { minHeight: 260 },
  timeInput: { width: 64 },
});

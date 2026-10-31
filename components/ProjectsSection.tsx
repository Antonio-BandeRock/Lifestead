// Projects (2026-10-30): something with several steps that may take weeks,
// be put down and picked up again, and end either finished or stopped.
// Life > Projects shows every one; the Interests tab will show its own.
//
// A project leads with its next step, so opening one after a month away
// says what to do now rather than what was planned. Pausing asks where it
// was left off, and that note is the first thing read when it is opened
// again. Stopping keeps the project as a record of what was done, and
// nothing on this screen judges how a project went or how long it took. Every
// sentence is in lib/projects.ts, checked by scripts/test_projects.js.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  PROJECT_AREA_LABELS,
  PROJECT_AREAS,
  describeLeftOff,
  describeProjectDay,
  describeProjectLines,
  describeStepCaption,
  groupProjects,
  orderSteps,
  stepState,
  type Project,
  type ProjectArea,
  type ProjectStep,
} from '../lib/projects';
import {
  addProject,
  addProjectStep,
  deleteProject,
  deleteProjectStep,
  listProjectSteps,
  listProjects,
  moveProjectStep,
  setProjectStatus,
  setProjectStepDone,
  setProjectStepParked,
  updateProject,
  updateProjectStep,
} from '../lib/projectsDb';
import { readTodoWhen } from '../lib/todos';
import { addCountdown } from '../lib/countdownDb';
import { calendarDaysBetween } from '../lib/countdown';
import { explainNotYet } from '../lib/notYet';
import { syncReminderNotifications } from '../lib/reminderNotifications';
import { AppActionSheet, type AppActionSheetAction } from './AppActionSheet';
import { useWalkMark } from './WalkMark';
import { AppTextInput } from './AppTextInput';
import { ThumbRow } from './ThumbRow';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';

function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export type ProjectScope = ProjectArea | 'everything';

type Props = {
  tabColor: string;
  /** 'everything' on Life, an area where one tab shows its own. */
  scope: ProjectScope;
};

type ProjectForm = { id: string | null; name: string; about: string; when: string; area: ProjectArea };
type StepForm = { id: string; text: string; waitingOn: string; when: string };

/** A day read from typed words, ignoring any repeat. */
function readDay(words: string): { ok: boolean; dueOn: string | null } {
  const when = readTodoWhen(words, new Date());
  return when ? { ok: true, dueOn: when.dueOn } : { ok: false, dueOn: null };
}

function dayCaption(words: string, today: string): string {
  if (!words.trim()) return 'No day';
  const day = readDay(words);
  return day.ok && day.dueOn ? describeProjectDay(day.dueOn, today) : 'Not read yet';
}

const DAY_HELP = 'The day could not be read. Try "tomorrow", "15 November" or "next Friday", or leave it empty for no day.';

export function ProjectsSection({ tabColor, scope }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [steps, setSteps] = useState<ProjectStep[]>([]);
  const [form, setForm] = useState<ProjectForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newStep, setNewStep] = useState('');
  const [stepForm, setStepForm] = useState<StepForm | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [pausing, setPausing] = useState<{ id: string; note: string } | null>(null);
  const [showClosed, setShowClosed] = useState<Record<string, boolean>>({});
  const [saidBack, setSaidBack] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; actions: AppActionSheetAction[] } | null>(null);

  const load = useCallback(async () => {
    const list = await listProjects(scope);
    setProjects(list);
    setSteps(await listProjectSteps(list.map((project) => project.id)));
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = todayLocal();
  const groups = groupProjects(projects);
  // The first project carries the tutorial rings (lib/toolHowTos.ts).
  const walkMark = useWalkMark();
  const firstId = groups[0]?.projects[0]?.id;
  const stepsOf = (id: string) => steps.filter((step) => step.projectId === id);

  async function afterChange(message: string | null) {
    setSaidBack(message);
    await load();
    void syncReminderNotifications();
  }

  function startNew() {
    setFormError(null);
    setForm({ id: null, name: '', about: '', when: '', area: scope === 'everything' ? 'life' : scope });
  }

  function startChange(project: Project) {
    setFormError(null);
    setForm({ id: project.id, name: project.name, about: project.about ?? '', when: project.dueOn ?? '', area: project.area });
  }

  async function saveForm() {
    if (!form) return;
    const name = form.name.trim();
    if (!name) {
      explainNotYet('Give the project a name first, in a few words: "Retile the bathroom" or "Learn to make cheese".');
      return;
    }
    const day = readDay(form.when);
    if (!day.ok) {
      setFormError(DAY_HELP);
      return;
    }
    const input = { name, about: form.about, area: form.area, dueOn: day.dueOn };
    if (form.id) {
      await updateProject(form.id, input);
      setForm(null);
      await afterChange(`${name}: changed.`);
    } else {
      const id = await addProject(input);
      setForm(null);
      setOpenId(id);
      await afterChange(`Started: ${name}. Add its first step below.`);
    }
  }

  async function handleAddStep(project: Project) {
    const text = newStep.trim();
    if (!text) {
      explainNotYet('Type the step first, as you would say it: "Order the tiles".');
      return;
    }
    await addProjectStep(project.id, { text });
    setNewStep('');
    await afterChange(null);
  }

  async function handleStepDone(step: ProjectStep) {
    const done = !step.doneAt;
    await setProjectStepDone(step.id, done);
    await afterChange(done ? `Done: ${step.text}.` : `${step.text}: open again.`);
  }

  async function handleMove(step: ProjectStep, direction: -1 | 1) {
    const moved = await moveProjectStep(step.id, direction);
    if (!moved) {
      explainNotYet(direction === -1 ? 'This step is already first in the plan.' : 'This step is already last in the plan.');
      return;
    }
    await afterChange(null);
  }

  async function handleParked(step: ProjectStep) {
    const parked = !step.parked;
    await setProjectStepParked(step.id, parked);
    await afterChange(parked ? `${step.text}: kept for later.` : `${step.text}: back in the plan, at the end.`);
  }

  function startStepChange(step: ProjectStep) {
    setStepError(null);
    setStepForm({ id: step.id, text: step.text, waitingOn: step.waitingOn ?? '', when: step.dueOn ?? '' });
  }

  async function saveStepForm() {
    if (!stepForm) return;
    const text = stepForm.text.trim();
    if (!text) {
      setStepError('Say what the step is.');
      return;
    }
    const day = readDay(stepForm.when);
    if (!day.ok) {
      setStepError(DAY_HELP);
      return;
    }
    await updateProjectStep(stepForm.id, { text, waitingOn: stepForm.waitingOn, dueOn: day.dueOn });
    setStepForm(null);
    await afterChange(`${text}: changed.`);
  }

  function askRemoveStep(step: ProjectStep) {
    setConfirm({
      title: `Remove ${step.text}?`,
      message: 'It comes out of the project. To keep it without it being in the plan, keep it for later instead.',
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            await deleteProjectStep(step.id);
            await afterChange(`${step.text}: removed.`);
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  async function handlePause() {
    if (!pausing) return;
    const project = projects.find((p) => p.id === pausing.id);
    await setProjectStatus(pausing.id, 'paused', pausing.note);
    setPausing(null);
    await afterChange(project ? `${project.name}: paused. It is here whenever you pick it up.` : null);
  }

  async function handleGoAgain(project: Project) {
    await setProjectStatus(project.id, 'active');
    await afterChange(`${project.name}: going again.`);
  }

  function askFinish(project: Project) {
    setConfirm({
      title: `Mark ${project.name} finished?`,
      message: 'It moves to Finished with every step it took, and its days stop reminding you.',
      actions: [
        {
          label: 'Finished',
          onPress: async () => {
            setConfirm(null);
            await setProjectStatus(project.id, 'finished');
            await afterChange(`${project.name}: finished.`);
          },
        },
        { label: 'Not yet', onPress: () => setConfirm(null) },
      ],
    });
  }

  function askStop(project: Project) {
    setConfirm({
      title: `Stop ${project.name}?`,
      message: 'It moves to Stopped and is kept as a record of what was done. It can go again at any time.',
      actions: [
        {
          label: 'Stop',
          onPress: async () => {
            setConfirm(null);
            await setProjectStatus(project.id, 'stopped');
            await afterChange(`${project.name}: stopped, kept as a record.`);
          },
        },
        { label: 'Keep going', onPress: () => setConfirm(null) },
      ],
    });
  }

  function askRemove(project: Project) {
    setConfirm({
      title: `Remove ${project.name}?`,
      message: 'It comes off the list with every step in it. To keep the record, mark it finished or stop it instead.',
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            if (openId === project.id) setOpenId(null);
            await deleteProject(project.id);
            await afterChange(`${project.name}: removed.`);
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  async function handleCountDays(project: Project) {
    if (!project.dueOn) {
      explainNotYet('Give the project a day first, with Change, and then the days to it can be counted.');
      return;
    }
    const days = calendarDaysBetween(today, project.dueOn);
    if (days < 1) {
      explainNotYet('The project day is today or has gone by, so there are no days left to count. Give it a later day with Change.');
      return;
    }
    await addCountdown({ name: project.name, about: 'A project day', startedOn: today, days });
    await afterChange(`Counting the days to ${project.name} in Days Until.`);
  }

  function renderForm() {
    if (!form) return null;
    return (
      <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
        <AppTextInput
          style={styles.textInput}
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
          placeholder="Project name: Retile the bathroom"
        />
        <AppTextInput
          style={styles.textInput}
          value={form.about}
          onChangeText={(about) => setForm({ ...form, about })}
          placeholder="What it is for (optional)"
          multiline
        />
        <AppTextInput
          style={styles.textInput}
          value={form.when}
          onChangeText={(when) => setForm({ ...form, when })}
          placeholder="A day to aim for: 15 December, or empty"
        />
        <Text style={styles.captionText}>{dayCaption(form.when, today)}</Text>
        {scope === 'everything' ? (
          <View style={styles.pillRow}>
            {PROJECT_AREAS.map((value) => {
              const on = form.area === value;
              return (
                <TouchableOpacity key={value} style={[styles.pill, on && styles.pillActive]} onPress={() => setForm({ ...form, area: value })}>
                  <Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{PROJECT_AREA_LABELS[value]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity ref={walkMark.ref('project.save')} style={styles.primaryButton} onPress={saveForm}>
            <Text style={styles.primaryButtonText}>{form.id ? 'Save' : 'Start the Project'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setForm(null)}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderStepForm() {
    if (!stepForm) return null;
    return (
      <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
        <AppTextInput
          style={styles.textInput}
          value={stepForm.text}
          onChangeText={(text) => setStepForm({ ...stepForm, text })}
          placeholder="The step"
        />
        <AppTextInput
          style={styles.textInput}
          value={stepForm.waitingOn}
          onChangeText={(waitingOn) => setStepForm({ ...stepForm, waitingOn })}
          placeholder="Waiting on someone or something (optional)"
        />
        <AppTextInput
          style={styles.textInput}
          value={stepForm.when}
          onChangeText={(when) => setStepForm({ ...stepForm, when })}
          placeholder="Its day: tomorrow, 3 November, or empty"
        />
        <Text style={styles.captionText}>{dayCaption(stepForm.when, today)}</Text>
        {stepError ? <Text style={styles.errorText}>{stepError}</Text> : null}
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={saveStepForm}>
            <Text style={styles.primaryButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStepForm(null)}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderStep(step: ProjectStep, first: boolean, editable: boolean) {
    const state = stepState(step);
    const done = state === 'done';
    const caption = describeStepCaption(step, today);
    return (
      <View key={step.id} style={styles.stepBlock}>
        <View style={styles.itemRow}>
          <TouchableOpacity
            ref={first ? walkMark.ref('project.stepDone') : undefined}
            onPress={() => handleStepDone(step)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={done ? `${step.text}, done. Open it again` : `Mark ${step.text} done`}
            hitSlop={8}
          >
            <Ionicons name={done ? 'checkbox' : 'square-outline'} size={22} color={done ? colors.textMuted : tabColor} />
          </TouchableOpacity>
          <View style={styles.itemText}>
            <Text style={[styles.bodyText, done ? styles.doneText : null]}>{step.text}</Text>
            {caption ? <Text style={styles.captionText}>{caption}</Text> : null}
          </View>
        </View>
        {stepForm?.id === step.id ? (
          renderStepForm()
        ) : editable && !done ? (
          <View style={styles.linkRow}>
            {state !== 'parked' ? (
              <>
                <TouchableOpacity ref={first ? walkMark.ref('project.stepMove') : undefined} onPress={() => handleMove(step, -1)} accessibilityLabel={`Move ${step.text} up`}>
                  <Text style={styles.linkText}>Up</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleMove(step, 1)} accessibilityLabel={`Move ${step.text} down`}>
                  <Text style={styles.linkText}>Down</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity ref={first ? walkMark.ref('project.stepChange') : undefined} onPress={() => startStepChange(step)}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity ref={first ? walkMark.ref('project.stepLater') : undefined} onPress={() => handleParked(step)}>
              <Text style={styles.linkText}>{step.parked ? 'Back in the Plan' : 'Keep for Later'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => askRemoveStep(step)}>
              <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }

  function renderProject(project: Project) {
    const own = stepsOf(project.id);
    const lines = describeProjectLines(project, own, today);
    const open = openId === project.id;
    const first = project.id === firstId;
    const going = project.status === 'active' || project.status === 'paused';
    const leftOff = describeLeftOff(project);
    const ordered = orderSteps(own);
    const firstStepId = ordered.find((step) => !step.doneAt)?.id;
    const where = scope === 'everything' && project.area !== 'life' ? PROJECT_AREA_LABELS[project.area] : null;
    return (
      <View key={project.id} style={[styles.projectBlock, { borderLeftColor: tabColor }]}>
        <TouchableOpacity
          ref={first ? walkMark.ref('project.open') : undefined}
          onPress={() => {
            setOpenId(open ? null : project.id);
            setNewStep('');
            setStepForm(null);
            setPausing(null);
          }}
          style={styles.projectHead}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={tabColor} />
          <View style={styles.itemText}>
            <Text style={styles.bodyText}>{project.name}</Text>
            {where ? <Text style={styles.captionText}>{where}</Text> : null}
            {lines.map((line) => (
              <Text key={line} style={styles.captionText}>{line}</Text>
            ))}
          </View>
        </TouchableOpacity>
        {open ? (
          <View style={styles.projectBody}>
            {leftOff ? <Text style={styles.bodyText}>{leftOff}</Text> : null}
            {project.about ? <Text style={styles.captionText}>{project.about}</Text> : null}
            {ordered.map((step) => renderStep(step, first && step.id === firstStepId, going))}
            {going ? (
              <View style={styles.addStepRow}>
                <AppTextInput
                  style={[styles.textInput, styles.flexInput]}
                  value={newStep}
                  onChangeText={setNewStep}
                  placeholder="Add a step: Order the tiles"
                  onSubmitEditing={() => handleAddStep(project)}
                  returnKeyType="done"
                />
                <TouchableOpacity ref={first ? walkMark.ref('project.addStep') : undefined} style={styles.primaryButton} onPress={() => handleAddStep(project)}>
                  <Text style={styles.primaryButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {pausing?.id === project.id ? (
              <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
                <AppTextInput
                  style={styles.textInput}
                  value={pausing.note}
                  onChangeText={(note) => setPausing({ ...pausing, note })}
                  placeholder="Where you left off (optional): grout bought, not mixed"
                  multiline
                />
                <ThumbRow primary="first" style={styles.actionRow}>
                  <TouchableOpacity style={styles.primaryButton} onPress={handlePause}>
                    <Text style={styles.primaryButtonText}>Pause It</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setPausing(null)}>
                    <Text style={styles.linkText}>Cancel</Text>
                  </TouchableOpacity>
                </ThumbRow>
              </View>
            ) : form?.id === project.id ? (
              renderForm()
            ) : (
              <View style={styles.projectLinks}>
                <TouchableOpacity ref={first ? walkMark.ref('project.change') : undefined} onPress={() => startChange(project)}>
                  <Text style={styles.linkText}>Change</Text>
                </TouchableOpacity>
                {project.status === 'active' ? (
                  <TouchableOpacity ref={first ? walkMark.ref('project.pause') : undefined} onPress={() => setPausing({ id: project.id, note: '' })}>
                    <Text style={styles.linkText}>Pause</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity ref={first ? walkMark.ref('project.pause') : undefined} onPress={() => handleGoAgain(project)}>
                    <Text style={styles.linkText}>Go Again</Text>
                  </TouchableOpacity>
                )}
                {going ? (
                  <>
                    <TouchableOpacity ref={first ? walkMark.ref('project.finish') : undefined} onPress={() => askFinish(project)}>
                      <Text style={styles.linkText}>Finished</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => askStop(project)}>
                      <Text style={styles.linkText}>Stop</Text>
                    </TouchableOpacity>
                    <TouchableOpacity ref={first ? walkMark.ref('project.countDays') : undefined} onPress={() => handleCountDays(project)}>
                      <Text style={styles.linkText}>Count the Days to It</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                <TouchableOpacity onPress={() => askRemove(project)}>
                  <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {form && !form.id ? (
        renderForm()
      ) : (
        <TouchableOpacity ref={walkMark.ref('project.new')} style={styles.primaryButton} onPress={startNew}>
          <Text style={styles.primaryButtonText}>Start a Project</Text>
        </TouchableOpacity>
      )}
      {saidBack ? <Text style={styles.captionText}>{saidBack}</Text> : null}

      {projects.length === 0 ? (
        <Text style={styles.captionText}>
          No projects yet. A project is anything with several steps that may take a while: retiling a room, building a
          raised bed, learning a craft. Each one shows its next step first, can be paused with a note of where you left
          off, and is kept as a record whether it is finished or stopped.
        </Text>
      ) : null}

      {groups.map((group) => {
        const collapsible = group.key === 'finished' || group.key === 'stopped';
        const shown = !collapsible || showClosed[group.key];
        return (
          <View key={group.key} style={styles.group}>
            {collapsible ? (
              <TouchableOpacity
                onPress={() => setShowClosed({ ...showClosed, [group.key]: !showClosed[group.key] })}
                style={styles.groupToggle}
              >
                <Ionicons name={shown ? 'chevron-down' : 'chevron-forward'} size={16} color={tabColor} />
                <Text style={styles.groupHeading}>{`${group.label} (${group.projects.length})`}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.groupHeading}>{group.label}</Text>
            )}
            {shown ? group.projects.map(renderProject) : null}
          </View>
        );
      })}

      <AppActionSheet
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        actions={confirm?.actions ?? []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  group: { gap: 8 },
  groupToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupHeading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  projectBlock: { gap: 6, paddingLeft: 8, borderLeftWidth: 2 },
  projectHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  projectBody: { gap: 8, paddingLeft: 24 },
  projectLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4 },
  stepBlock: { gap: 4 },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  doneText: { color: colors.textMuted },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemText: { flex: 1, gap: 2 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingLeft: 32 },
  addStepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flexInput: { flex: 1 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillText: { ...PILL_TEXT },
  pillTextOn: { ...PILL_ON_TEXT },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  // The form sits on a row surface of its own, since it opens both inside
  // a project and above the list.
  nestedForm: { gap: 8, padding: 12, borderRadius: 10, borderLeftWidth: 2, marginVertical: 4, backgroundColor: colors.surfaceMuted },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  errorText: { color: colors.danger },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
  pillActive: { ...PILL_ON },
});

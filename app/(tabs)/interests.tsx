import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { HelpSection } from '../../components/HelpButton';
import { useRegisterScreenHelp } from '../../components/CurrentPageHelp';
import { GatedTabContent } from '../../components/GatedTabContent';
import { CalmBands } from '../../components/HomeSectionBand';
import { makeTabBandStyles } from '../../components/TabBand';
import { LensHub, type LensOption } from '../../components/LensHub';
import { MyItemsHub, type MyItemsCategory } from '../../components/MyItemsHub';
import { PageIdentityLabel } from '../../components/PageIdentityLabel';
import { SwipeableTabScreen } from '../../components/SwipeableTabScreen';
import { MyInterestsSection } from '../../components/MyInterestsSection';
import { ProjectsSection } from '../../components/ProjectsSection';
import { InterestSessionsSection } from '../../components/InterestSessionsSection';
import { colors } from '../../constants/colors';
import { typography, textShadow } from '../../constants/typography';
import { useFloatingButtonScrollPadding } from '../../constants/floatingButton';
import { useAutoOpenLensHubSignal } from '../../hooks/useAutoOpenLensHubSignal';
import { listInterests } from '../../lib/interestsDb';
import { listProjects } from '../../lib/projectsDb';
import { useOnVaultChange } from '../../lib/vaultReads';

// The Interests tab, 2026-10-30 (1.0.77.11). What a person follows,
// practises, shares or earns from, kept as one record per interest that can
// grow from one stage to the next without being started over. Projects
// with steps sit beside them, the same projects as on Life, showing only
// the ones started here. Sessions, supplies, collections, a library, people
// and places, money and Learn come as further lenses; this first pass is
// the record itself and its projects. Nothing on this tab scores, ranks or
// pushes an interest toward earning.

const TAB_COLOR = colors.tabInterests;
const band = makeTabBandStyles(TAB_COLOR, { calm: true });

type InterestsLens = 'myInterests' | 'sessions' | 'projects';

const LENS_FULL_NAMES: Record<InterestsLens, string> = {
  myInterests: 'My Interests',
  sessions: 'Sessions',
  projects: 'Projects',
};

const MY_INTERESTS_HELP: HelpSection[] = [
  {
    heading: 'What this is for',
    body: 'Anything you are into, from bird watching to woodworking to a language you are learning. Add it once with a name, and say how you are part of it: following it, practising it, sharing it, or earning from it. Any of the four, or none yet.',
  },
  {
    heading: 'It can change',
    body: 'Turning a stage on or off is kept with the day it happened, so an interest you only read about for years and then took up shows both. Nothing about it is a level to reach, and earning is one way of being part of something, never the goal.',
  },
  {
    heading: 'Putting one down',
    body: 'Where I Left Off keeps a few words for when you come back to it. Step Back moves an interest under Stepped Back with everything it had, and Come Back to It brings it back.',
  },
];

const SESSIONS_HELP: HelpSection[] = [
  {
    heading: 'What this is for',
    body: 'Time you give to an interest: an hour at the workbench, twenty minutes of scales, an afternoon of birding. Start a timer while you go, or add it afterwards with the day and how long. A note and where you left off are optional.',
  },
  {
    heading: 'Practice times',
    body: 'Pick the days and a time for an interest and a reminder comes then. Done keeps a session for that day, and a day left unanswered is let go with nothing more said about it.',
  },
  {
    heading: 'Only a record',
    body: 'Sessions are listed by month with what they come to. A week with none is simply a week with none.',
  },
];

const PROJECTS_HELP: HelpSection[] = [
  {
    heading: 'What this is for',
    body: 'Anything with several steps that belongs to an interest: building a bookshelf, learning a piece of music, putting together an album of photos. Each one can name the interest it belongs to.',
  },
  {
    heading: 'The same projects as on Life',
    body: 'These are the same projects Life > Projects shows, kept in one place. Here you see only the ones started on this tab, with their next step under the name.',
  },
];

const LENSES: LensOption<InterestsLens>[] = [
  { key: 'myInterests', label: 'My Interests', icon: 'color-palette-outline', help: MY_INTERESTS_HELP },
  { key: 'sessions', label: 'Sessions', icon: 'timer-outline', help: SESSIONS_HELP },
  { key: 'projects', label: 'Projects', icon: 'layers-outline', help: PROJECTS_HELP },
];

const HELP_SECTIONS: HelpSection[] = [
  {
    heading: 'What this tab is for',
    body: 'The things you do because you want to: what you follow, practise, share with others, or earn a little from. One record per interest, which can grow from one of those to the next without starting over.',
  },
  {
    heading: 'Where to start',
    body: 'Open My Interests and add one. Sessions keeps the time you give it, and Projects is for anything with steps that belongs to an interest.',
  },
];

export default function InterestsScreen() {
  useRegisterScreenHelp('Interests', HELP_SECTIONS, '/interests');
  const scrollBottomPadding = useFloatingButtonScrollPadding();
  const openLensHub = useAutoOpenLensHubSignal();
  const { openInterestsLens } = useLocalSearchParams<{ openInterestsLens?: string }>();
  const [lens, setLens] = useState<InterestsLens>('myInterests');
  const [revealed, setRevealed] = useState(false);
  const [myOpen, setMyOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (openInterestsLens === 'myInterests' || openInterestsLens === 'sessions' || openInterestsLens === 'projects') {
        setLens(openInterestsLens);
        setRevealed(true);
        return;
      }
      setRevealed(false);
      return () => setRevealed(false);
    }, [openInterestsLens]),
  );

  const [interestCount, setInterestCount] = useState<number | undefined>(undefined);
  const [projectCount, setProjectCount] = useState<number | undefined>(undefined);
  const loadCounts = useCallback(async () => {
    const [interests, projects] = await Promise.all([listInterests(), listProjects('interests')]);
    setInterestCount(interests.filter((interest) => !interest.retiredAt).length);
    setProjectCount(projects.filter((project) => project.status === 'active' || project.status === 'paused').length);
  }, []);
  useOnVaultChange(() => {
    void loadCounts();
  });

  const categories: MyItemsCategory[] = [
    { id: 'interests', label: 'Interests', count: interestCount, onPress: () => { setLens('myInterests'); setRevealed(true); } },
    { id: 'projects', label: 'Projects', count: projectCount, onPress: () => { setLens('projects'); setRevealed(true); } },
  ];

  return (
    <View style={styles.screen}>
      <SwipeableTabScreen enabled={!revealed}>
        <CalmBands>
          <GatedTabContent pageTitle="Interests" variant="field" revealed={revealed} lens={lens}>
            <ScrollView style={styles.scroll} contentContainerStyle={[band.column, { paddingBottom: scrollBottomPadding }]}>
              {lens === 'myInterests' ? (
                <View style={band.box}>
                  <Text style={styles.cardTitle}>My Interests</Text>
                  <MyInterestsSection tabColor={TAB_COLOR} />
                </View>
              ) : null}
              {lens === 'sessions' ? (
                <View style={band.box}>
                  <Text style={styles.cardTitle}>Sessions</Text>
                  <InterestSessionsSection tabColor={TAB_COLOR} />
                </View>
              ) : null}
              {lens === 'projects' ? (
                <View style={band.box}>
                  <Text style={styles.cardTitle}>Projects</Text>
                  <ProjectsSection scope="interests" tabColor={TAB_COLOR} />
                </View>
              ) : null}
            </ScrollView>
          </GatedTabContent>
        </CalmBands>
      </SwipeableTabScreen>

      <PageIdentityLabel title="Interests" activeLensLabel={revealed ? LENS_FULL_NAMES[lens] : undefined} activeLensKey={lens} />
      <MyItemsHub
        label="My Interests"
        tabColor={TAB_COLOR}
        categories={categories}
        onOpen={loadCounts}
        open={myOpen}
        onOpenChange={setMyOpen}
      />
      <LensHub
        pageTitle="Interests"
        buttonLabel="Interests"
        options={LENSES}
        selected={revealed ? lens : undefined}
        columns={3}
        autoOpenSignal={openLensHub}
        onSelect={(key) => {
          setLens(key);
          setRevealed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  cardTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginBottom: 10, ...textShadow },
});

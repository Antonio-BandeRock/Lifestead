import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { NotesInput } from './NotesInput';
import { useConfirmSheet } from './ConfirmSheet';
import { useInfoAlert } from './InfoAlert';
import type { DropdownOption } from './Dropdown';
import { HOME_BAND_ACCENT_WIDTH, HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandNoHairlines, homeBandStyle, useCalmBands } from './HomeSectionBand';
import { TabBand } from './TabBand';
import { PartnerBesideBand } from './PartnerBesideBand';
import { RecallsBand } from './RecallsBand';
import { DoseGroupsBand } from './DoseGroupsBand';
import { PopoverSelect } from './PopoverSelect';
import { WhyExplainer } from './WhyExplainer';
import { RuleLabelQuote } from './RuleLabelQuote';
import { RuleSeverityTag } from './RuleSeverityTag';
import { MedDetailsPanel } from './MedDetailsPanel';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useBandFolds } from '../hooks/useBandFolds';
import { getTreatmentIdsWithLabels } from '../lib/medicineLabelDb';
import {
  createOtcTreatment,
  createPrescriptionTreatment,
  createSupplementTreatment,
  deleteTreatment,
  ensureScheduleSeriesGenerated,
  getDailyNutrientAnalysis,
  getNutrientTiming,
  getSupplementForms,
  getTreatmentNutrients,
  listAllTreatments,
  listCommonMedications,
  listTrackedNutrients,
  setTreatmentActive,
  updateOtcTreatment,
  updatePrescriptionTreatment,
  updateSupplementTreatment,
  type CommonMedication,
  type NutrientTiming,
  type SupplementForm,
  type SupplementIngredientInput,
  type TrackedNutrient,
  type TreatmentNutrientRecord,
  type TreatmentRecord,
} from '../lib/db';
import { evaluateInteractionRules, type InteractionWarning, type ReferenceOnlyRule } from '../lib/interactionRules';
import { withSeverityPrefix } from '../lib/ruleSeverity';
import { listSupplyReadings, listTreatmentDetails, type TreatmentDetails } from '../lib/medDetailsDb';
import { stepOn, taperDoseLine, type TaperStep } from '../lib/taper';
import { listTaperSteps } from '../lib/taperDb';
import { TaperPanel } from './TaperPanel';
import { InjectionPanel } from './InjectionPanel';
import { TravelTimePanel } from './TravelTimePanel';
import { getHomeZone, listTravelModes } from '../lib/travelTimeDb';
import type { TravelMode } from '../lib/travelTime';
import { listInjectionSettings, listSiteHistory, type InjectionSetting } from '../lib/injectionSitesDb';
import type { SiteUse } from '../lib/injectionSites';
import { unitsDisagree, type SupplyReading } from '../lib/medSupply';
import type { NutrientGapEntry } from '../lib/nutrientAnalysis';
import { useWalkMark } from '../components/WalkMark';
import { ThumbRow } from './ThumbRow';
import { VaultClosedBand } from './VaultClosedBand';
import { useCategoryClosed } from '../lib/vaultSession';
import { explainNotYet } from '../lib/notYet';
import { recognizeLinesFromImage, recognizeTextFromImage } from '../lib/ocr';
import { rowsFromPositionedLines } from '../lib/labImport';
import { announcePhoneOnly } from '../lib/desktop/phoneOnly';
import { matchSupplementForm, readSupplementLabel } from '../lib/spokenSupplement';
import { t, tl } from '../lib/i18n';
import {
  BUTTON_PRIMARY,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY,
  BUTTON_SECONDARY_TEXT,
  PILL,
  PILL_ON,
  PILL_ON_TEXT,
  PILL_TEXT,
} from '../constants/buttons';
import { ReadProblem } from './ReadProblem';
import { SupplyCountForm } from './SupplyCountForm';
import { declineBottle, getSharingPartner, joinBottle, listBottlesToAnswer, type SharedBottleRow } from '../lib/sharedSupplyDb';
import { saveOrSay } from '../lib/saveProblem';
import { rememberMedCode } from '../lib/medBarcodesDb';
import { takeSupplementDraft, type SupplementDraft } from '../lib/supplementDraft';
import { doseWithUnit, formatDoseAmount, parseDoseAmount, unitSingular } from '../lib/doseAmount';
import { ingredientFood, isSupplementOnlyIngredient, withSupplementIngredients } from '../lib/supplementIngredients';
import { foodTableName } from '../lib/foodSource';
import { sortByLabel } from '../lib/choiceOrder';

// My Meds, the registry of everything a person takes: prescriptions, OTC
// drugs and supplements, each with its dose, form, timing rules, interactions
// and what food already covers. Built on Schedules on 2026-08-08 and moved
// here on 2026-09-13, direct: "Schedules needs to be about the actual
// schedules for each category or topic... Both prescriptions and supplements
// should be considered within meds... Many schedules will be because of
// things contained in Life." A med is DEFINED here; its dose times are set
// on Schedules > Meds, reached from each row's Schedule it. The Supplements
// and Prescriptions lenses on Schedules, which carried their own copies of
// these forms, are gone; editing came here with them.
//
// A supplement's ingredients can be said or typed as the label reads (voice
// step 4, 1.0.66.22, lib/spokenSupplement.ts): "vitamin D 25 mcg, zinc 11
// mg, B12 500 mcg as methylcobalamin" fills one row each, with the form
// picked only when the words name exactly one form in the list. What could
// not be read is listed under the box, never guessed, and nothing is saved
// until Add supplement.

// Every band here folds, the same rule Schedules and Food follow, with the
// open state remembered per band through useBandFolds. The band itself is
// TabBand, shared with every other Life lens since 2026-09-19.

// The researched list's picker line: the generic name, the brand names, and
// the names sold in Mexico, so a search for Eutirox or Triyotex finds the
// medicine (Tony, 2026-11-18).
function medOptionLabel(med: CommonMedication): string {
  const brands = [med.commonBrandNames, med.brandNamesMexico ? t('in Mexico {brands}', { brands: med.brandNamesMexico }) : null]
    .filter(Boolean)
    .join('; ');
  return brands ? `${med.genericName} (${brands})` : med.genericName;
}

function todayDateString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Only nutrients with one unambiguous, universally agreed IU->mass
// conversion accept IU today (see lib/supplementUnits.ts) -- offered here
// regardless of which nutrient is picked, with any that can't be
// normalized surfaced honestly via Insights' "couldn't be counted" note
// rather than hidden or guessed at.
// How to fill a supplement from a store's picture of its label, which is
// flat, sharp and evenly lit, so it reads better than a photo of a curved
// bottle (Tony, 2026-11-19).
const STORE_LABEL_TITLE = "Using a store's picture of the label";
const STORE_LABEL_STEPS: string[] = [
  "A store's picture of the label is flat, sharp and evenly lit, so it reads better than a photo of a curved bottle.",
  '1. Open the product on a store website or app, such as Amazon, Mercado Libre, Walmart, a pharmacy or the maker\'s site. Search for the exact name and size printed on your bottle.',
  '2. Go through the product\'s pictures to the one showing the nutrition table: Supplement Facts on a U.S. label, Información nutrimental on a Mexican one. If the ingredients list is in another picture, save that one as well, since it names each nutrient\'s form.',
  '3. Tap the picture so it opens full size.',
  '4. Save it. In a web browser, press and hold the picture and tap Download image. In a store app that will not save pictures, zoom in until the table fills the screen and take a screenshot (on most phones, press the power and volume down buttons together), then crop it to the table.',
  '5. Back here, tap Use a Photo You Have, pick the picture and crop it to the table. If the ingredients list is in a second picture, tap Use Another Photo You Have for it.',
  '6. Check every row it fills against the bottle you hold. A store can show an older label, or the version sold in another country, and the bottle is what you take.',
];

// The form picker's last choice: type a form not on the list.
const OWN_FORM = '__own_form__';

const SUPPLEMENT_UNIT_OPTIONS: DropdownOption[] = [
  { label: 'mg', value: 'mg' },
  { label: 'mcg', value: 'mcg' },
  { label: 'g', value: 'g' },
  { label: 'IU', value: 'IU' },
];

// --- My Meds -----------------------------------------------------------
//
// A real, cited registry over the same underlying `treatments` table
// Supplements and Prescriptions already use -- plus, as of 2026-08-08, a
// third real treatment_type ('otc', see createOtcTreatment in lib/db.ts).
// Direct request: "This is a place to document all prescription,
// nonprescription over the counter drugs, and macro and micronutrients
// regimen... exact ingredients of every supplement... true interaction
// logic built in."
//
// Deliberate scope boundary, stated here and in this lens's own Info
// content above: reminder times and repeat schedules for prescriptions and
// supplements still live on those two lenses, unchanged -- adding an item
// here doesn't also set up a dose reminder for it. Building a real,
// working third parallel reminder system for OTC in the same pass as
// everything else below would have meant either rushing it or blocking
// everything on it; tracking on/off (which is what actually feeds
// interaction checking and nutrient totals) works for all three types
// today, reminders are a real, separate fast-follow.
//
// The "pick from a researched list, or enter it yourself" flow for
// prescriptions/OTC (COMMON_MED_OPTIONS below) is intentionally NOT a live
// internet lookup for medications this app doesn't already have -- that's
// a real, separate product/architecture decision (which data source, what
// it costs, what it means for this app's own local-first privacy stance)
// that hasn't been made yet, not something to silently wire up. Manual
// entry is the honest, working fallback today.
type MyMedsCategory = 'supplement' | 'prescription' | 'otc';

type MedIngredientRow = { key: string; nutrientCode: string; supplementForm: string; amount: string; unit: string };

function blankMedIngredientRow(): MedIngredientRow {
  return { key: `ingredient_${Date.now()}_${Math.random().toString(36).slice(2)}`, nutrientCode: '', supplementForm: '', amount: '', unit: 'mg' };
}

type MyMedsSupplementFormState = {
  editingId: string | null;
  name: string;
  unitsPerDay: string;
  servingUnitLabel: string;
  /**
   * How many units the label's amounts are for ("Serving size: 2 capsules").
   * The amounts are typed as printed and divided by this on save, since what
   * is stored is per one unit. A saved supplement reopens at 1, because its
   * stored amounts are already per one.
   */
  servingSize: string;
  notes: string;
  ingredients: MedIngredientRow[];
};

function blankMyMedsSupplementForm(): MyMedsSupplementFormState {
  return { editingId: null, name: '', unitsPerDay: '1', servingUnitLabel: '', servingSize: '1', notes: '', ingredients: [blankMedIngredientRow()] };
}

type MedFormState = {
  editingId: string | null;
  category: 'prescription' | 'otc';
  commonMedId: string;
  manualEntry: boolean;
  name: string;
  genericName: string;
  doseAmount: string;
  doseUnit: string;
  frequency: string;
  notes: string;
};

function blankMedForm(category: 'prescription' | 'otc'): MedFormState {
  return {
    editingId: null,
    category,
    commonMedId: '',
    manualEntry: false,
    name: '',
    genericName: '',
    doseAmount: '',
    doseUnit: '',
    frequency: '',
    notes: '',
  };
}

const EVIDENCE_TIER_LABEL: Record<string, string> = {
  established: 'Established',
  emerging: 'Emerging evidence',
  strong: 'Strong evidence',
  moderate: 'Moderate evidence',
};

type Props = {
  tabColor: string;
  // A med to open on arrival: Schedules > Meds sends "Edit in My Meds" here
  // with the med's id, so the row lands expanded rather than found by hand.
  focusTreatmentId?: string;
};

export function MyMedsSection({ tabColor, focusTreatmentId }: Props) {
  // The outline on a button a Your Story walk line names (components/WalkMark.ts).
  const walkMark = useWalkMark();
  const calm = useCalmBands();
  const styles = useMemo(() => makeStyles(tabColor, calm), [tabColor, calm]);
  const router = useRouter();
  const folds = useBandFolds();
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [ingredientsByTreatment, setIngredientsByTreatment] = useState<Record<string, TreatmentNutrientRecord[]>>({});
  const [interactionWarnings, setInteractionWarnings] = useState<InteractionWarning[]>([]);
  const [referenceOnlyRules, setReferenceOnlyRules] = useState<ReferenceOnlyRule[]>([]);
  const [detailsByTreatment, setDetailsByTreatment] = useState<Map<string, TreatmentDetails>>(new Map());
  const [tapersByTreatment, setTapersByTreatment] = useState<Map<string, TaperStep[]>>(new Map());
  const [injectionByTreatment, setInjectionByTreatment] = useState<Map<string, InjectionSetting>>(new Map());
  const [sitesByTreatment, setSitesByTreatment] = useState<Map<string, SiteUse[]>>(new Map());
  const [travelByTreatment, setTravelByTreatment] = useState<Map<string, TravelMode>>(new Map());
  const [homeZone, setHomeZone] = useState<string | null>(null);
  const [supplyByTreatment, setSupplyByTreatment] = useState<Map<string, SupplyReading>>(new Map());
  const [labelIds, setLabelIds] = useState<Set<string>>(new Set());
  const [nutrients, setNutrients] = useState<TrackedNutrient[]>([]);
  const [commonMedications, setCommonMedications] = useState<CommonMedication[]>([]);
  const [foodEntries, setFoodEntries] = useState<NutrientGapEntry[]>([]);
  // Today's amounts from food for every nutrient the food data carries,
  // including the ones with no daily target (fat, carbohydrate, inositol).
  const [foodTotals, setFoodTotals] = useState<Record<string, number>>({});
  // Ingredient rows where the person chose to type a form of their own.
  const [typingFormKeys, setTypingFormKeys] = useState<Set<string>>(new Set());
  // A row's form is typed when chosen so, or when it already holds a form
  // that is not on the list (read off a label, or saved earlier).
  function formTyped(row: MedIngredientRow, forms: SupplementForm[]): boolean {
    if (typingFormKeys.has(row.key)) return true;
    return !!row.supplementForm && !forms.some((form) => form.formName === row.supplementForm);
  }
  const [loading, setLoading] = useState(false);
  const [readFailed, setReadFailed] = useState(false);

  const [addMode, setAddMode] = useState<MyMedsCategory | null>(null);
  const [supplementForm, setSupplementForm] = useState<MyMedsSupplementFormState>(blankMyMedsSupplementForm());
  const [labelText, setLabelText] = useState('');
  const [supplementDraft, setSupplementDraft] = useState<SupplementDraft | null>(null);
  // The bottle code to keep with the supplement once it is saved.
  const pendingCode = useRef<string | null>(null);
  const [labelNote, setLabelNote] = useState<string | null>(null);
  const [readingLabel, setReadingLabel] = useState(false);
  // Where the reading's note shows: beside the pictures at the top of the
  // form, or beside the box it was said or typed into.
  const [labelNoteFromPicture, setLabelNoteFromPicture] = useState(false);
  // Every picture of this label read so far, one page each, so a round
  // bottle can be photographed a turn at a time and each picture adds to
  // the last (Tony, 2026-11-27).
  const [labelPages, setLabelPages] = useState<string[]>([]);
  const [medForm, setMedForm] = useState<MedFormState>(blankMedForm('prescription'));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // The row whose Tracking button opened the count, and the one just saved,
  // which is asked how many there are and then whether to schedule it
  // (Tony, 2026-11-18: "The count should always be asked when the new
  // supplement is saved. Then it should be asked if they want to schedule
  // this supplement or pharmaceutical.").
  const [countingId, setCountingId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<{ id: string; name: string; unit: string | null } | null>(null);
  // Bottles a partner shared that this person has not answered yet
  // (lib/sharedSupply.ts): which of their meds takes from it, a new one
  // added for it, or not theirs. pendingBottleId is the bottle a new med
  // being added will take from once saved.
  const [bottlesToAnswer, setBottlesToAnswer] = useState<SharedBottleRow[]>([]);
  const [sharingPartnerName, setSharingPartnerName] = useState<string | null>(null);
  const [bottleChoice, setBottleChoice] = useState<Record<string, string>>({});
  const [pendingBottleId, setPendingBottleId] = useState<string | null>(null);
  const [showInfoAlert, infoAlertElement] = useInfoAlert();
  const [confirmSheet, confirmSheetElement] = useConfirmSheet();
  // The med list is never refused at the database, since the timing
  // warnings read it, so the list is left out here while it is in a closed
  // vault. Adding a med and the warnings stay: the vault holds records,
  // never the tools, and safety is never behind it.
  const medsClosed = useCategoryClosed('medications');

  // Lazily loaded, cached by nutrient code -- there's no reason to fetch
  // supplement_forms/nutrient_timing for every nutrient this app tracks up
  // front when a person will only ever pick a handful.
  const [formsByNutrient, setFormsByNutrient] = useState<Record<string, SupplementForm[]>>({});
  const [timingByNutrient, setTimingByNutrient] = useState<Record<string, NutrientTiming | null>>({});

  const load = useCallback(() => {
    setLoading(true);
    setReadFailed(false);
    ensureScheduleSeriesGenerated()
      .then(() =>
        Promise.all([
          listAllTreatments(),
          listTrackedNutrients(),
          listCommonMedications(),
          getDailyNutrientAnalysis(todayDateString()),
          evaluateInteractionRules(todayDateString()),
          listTreatmentDetails(),
          listSupplyReadings(),
          getTreatmentIdsWithLabels(),
          listTaperSteps(),
          listInjectionSettings(),
          listSiteHistory(),
          listTravelModes(),
          getHomeZone().catch(() => null),
        ]),
      )
      .then(async ([loadedTreatments, loadedNutrients, loadedMeds, dailyAnalysis, evaluation, details, supply, withLabels, tapers, injection, sites, travel, home]) => {
        setTravelByTreatment(travel);
        setHomeZone(home);
        setTreatments(loadedTreatments);
        setTapersByTreatment(tapers);
        setInjectionByTreatment(injection);
        setSitesByTreatment(sites);
        setLabelIds(withLabels);
        setDetailsByTreatment(details);
        setSupplyByTreatment(supply);
        if (focusTreatmentId && loadedTreatments.some((treatment) => treatment.id === focusTreatmentId)) {
          setExpandedId(focusTreatmentId);
        }
        // Oils, fatty acids, hormones, herbs and the rest a label can hold
        // join the food database's nutrients (Tony, 2026-11-27).
        setNutrients(withSupplementIngredients(loadedNutrients));
        setCommonMedications(loadedMeds);
        setFoodEntries(dailyAnalysis.entries);
        setFoodTotals(dailyAnalysis.foodTotals ?? {});
        setInteractionWarnings(evaluation.warnings);
        setReferenceOnlyRules(evaluation.referenceOnly);
        const supplementTreatments = loadedTreatments.filter((treatment) => treatment.treatmentType === 'supplement');
        const entries = await Promise.all(
          supplementTreatments.map(async (treatment) => [treatment.id, await getTreatmentNutrients(treatment.id)] as const),
        );
        setIngredientsByTreatment(Object.fromEntries(entries));
        const [toAnswer, partner] = await Promise.all([listBottlesToAnswer(), getSharingPartner()]);
        setBottlesToAnswer(toAnswer);
        setSharingPartnerName(partner?.name ?? null);
      })
      .catch((error) => {
        console.warn('[MyMedsSection] read failed', error);
        setReadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [focusTreatmentId]);

  useFocusEffect(
    useCallback(() => {
      load();
      // A bottle looked up on the medicine label screen, to start a
      // supplement from (2026-11-18). Filled in once the nutrient list has
      // loaded, since the label text is read against it.
      const draft = takeSupplementDraft();
      if (draft) setSupplementDraft(draft);
    }, [load]),
  );

  useEffect(() => {
    if (!supplementDraft || nutrients.length === 0) return;
    const draft = supplementDraft;
    setSupplementDraft(null);
    openAddSupplement();
    pendingCode.current = draft.code;
    setSupplementForm((current) => ({ ...current, name: draft.name }));
    if (draft.labelText.trim()) {
      setLabelText(draft.labelText);
      void fillFromLabel(draft.labelText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplementDraft, nutrients]);

  // Every med ever added, active or not, since 2026-09-13: this is the one
  // place a med is defined now (the Supplements and Prescriptions lenses on
  // Schedules, which used to carry their own copies of these forms, are
  // gone), so a paused med has to be reachable here to be edited or turned
  // back on. A paused med is preserved in full and simply not counted.

  function labelFormWords(words: string): string {
    const trimmed = words.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : '';
  }

  function formatFoodAmount(amount: number): string {
    return amount >= 10 ? String(Math.round(amount)) : String(Math.round(amount * 10) / 10);
  }

  function nutrientDisplayName(code: string): string {
    return nutrients.find((nutrient) => nutrient.code === code)?.displayName ?? code;
  }

  async function ensureNutrientDataLoaded(nutrientCode: string) {
    if (!nutrientCode) return;
    if (!(nutrientCode in formsByNutrient)) {
      const forms = await getSupplementForms(nutrientCode);
      setFormsByNutrient((current) => ({ ...current, [nutrientCode]: forms }));
    }
    if (!(nutrientCode in timingByNutrient)) {
      const timing = await getNutrientTiming(nutrientCode);
      setTimingByNutrient((current) => ({ ...current, [nutrientCode]: timing }));
    }
  }

  function foodStatusFor(nutrientCode: string): NutrientGapEntry | null {
    return foodEntries.find((entry) => entry.nutrientCode === nutrientCode) ?? null;
  }

  // --- Add flow: category picker ---
  function openAddSupplement() {
    setSupplementForm(blankMyMedsSupplementForm());
    setLabelText('');
    setLabelNote(null);
    setLabelPages([]);
    setAddMode('supplement');
  }
  function openAddMed(category: 'prescription' | 'otc') {
    setMedForm(blankMedForm(category));
    setAddMode(category);
  }
  // Switching kind while adding (Tony, 2026-11-18): Setup's walk rings
  // + Prescription, and once a form was open the other kinds and Look up a
  // label were gone until it was cancelled. The switch at the top of a new
  // entry's form changes kind in place; prescription and OTC keep what was
  // typed, since they share one form.
  function switchAddKind(kind: MyMedsCategory) {
    if (kind === addMode) return;
    if (kind === 'supplement') {
      openAddSupplement();
      return;
    }
    if (addMode === 'prescription' || addMode === 'otc') {
      setMedForm((form) => ({ ...form, category: kind }));
      setAddMode(kind);
      return;
    }
    openAddMed(kind);
  }
  function renderKindSwitch(current: MyMedsCategory) {
    const kinds: { key: MyMedsCategory; label: string }[] = [
      { key: 'prescription', label: 'Prescription' },
      { key: 'otc', label: 'OTC drug' },
      { key: 'supplement', label: 'Supplement' },
    ];
    return (
      <View style={styles.kindSwitchRow}>
        {kinds.map((kind) => {
          const on = kind.key === current;
          return (
            <TouchableOpacity
              key={kind.key}
              style={on ? [PILL, PILL_ON] : PILL}
              onPress={() => switchAddKind(kind.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={on ? PILL_ON_TEXT : PILL_TEXT}>{kind.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={PILL} onPress={() => router.push('/medicine-label')} accessibilityRole="button">
          <Text style={PILL_TEXT}>Look up a label</Text>
        </TouchableOpacity>
      </View>
    );
  }
  function closeAddForm() {
    setAddMode(null);
    setSupplementForm(blankMyMedsSupplementForm());
    setLabelText('');
    setLabelNote(null);
    setLabelPages([]);
    setMedForm(blankMedForm('prescription'));
    setPendingBottleId(null);
    pendingCode.current = null;
  }

  // Editing came here on 2026-09-13 from the Supplements and Prescriptions
  // lenses, which used to be the only places a saved med could be changed.
  function openEdit(treatment: TreatmentRecord) {
    if (treatment.treatmentType === 'supplement') {
      const ingredients = ingredientsByTreatment[treatment.id] ?? [];
      setSupplementForm({
        editingId: treatment.id,
        name: treatment.name,
        unitsPerDay: String(treatment.unitsPerDay ?? 1),
        servingUnitLabel: treatment.servingUnitLabel ?? '',
        servingSize: '1',
        notes: treatment.notes ?? '',
        ingredients: ingredients.length
          ? ingredients.map((ingredient) => ({
              key: ingredient.id,
              nutrientCode: ingredient.nutrientCode,
              supplementForm: ingredient.supplementForm ?? '',
              amount: String(ingredient.amountPerUnit),
              unit: ingredient.unit,
            }))
          : [blankMedIngredientRow()],
      });
      for (const ingredient of ingredients) void ensureNutrientDataLoaded(ingredient.nutrientCode);
      setAddMode('supplement');
      return;
    }
    const category = treatment.treatmentType === 'otc' ? 'otc' : 'prescription';
    const matched = treatment.genericName ? commonMedications.find((med) => med.id === treatment.genericName) : null;
    setMedForm({
      editingId: treatment.id,
      category,
      commonMedId: matched ? matched.id : '',
      manualEntry: !matched,
      name: treatment.name,
      genericName: treatment.genericName ?? '',
      doseAmount: treatment.doseAmount != null ? String(treatment.doseAmount) : '',
      doseUnit: treatment.doseUnit ?? '',
      frequency: treatment.frequency ?? '',
      notes: treatment.notes ?? '',
    });
    setAddMode(category);
  }

  // The handoff to Schedules > Meds: the med is defined here, its times are
  // set there. 2026-09-13, direct: "if they want to add a new med to the
  // schedule, the link should take them to My Meds in Life where they add
  // the specifics about the med and then tap a button to schedule it, which
  // takes them back to My Meds schedule to add the new med."
  function scheduleIt(treatment: TreatmentRecord) {
    router.push({ pathname: '/schedule', params: { openScheduleLens: 'meds', scheduleTreatmentId: treatment.id } });
  }

  // --- Supplement ingredient rows ---
  function addIngredientRow() {
    setSupplementForm((current) => ({ ...current, ingredients: [...current.ingredients, blankMedIngredientRow()] }));
  }
  function removeIngredientRow(key: string) {
    setSupplementForm((current) => ({ ...current, ingredients: current.ingredients.filter((row) => row.key !== key) }));
  }
  function updateIngredientRow(key: string, update: Partial<MedIngredientRow>) {
    setSupplementForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((row) => (row.key === key ? { ...row, ...update } : row)),
    }));
  }

  // A photo of the label, read on the phone. Its words go into the box, and
  // every picture taken of this label is read together, so a label that
  // wraps around a round bottle can be photographed a turn at a time (Tony,
  // 2026-11-27: "it should allow for multiple images of the label"). A row
  // already filled in is not added again, so two pictures that overlap give
  // each nutrient once, and a form named in one picture fills a nutrient
  // read in another. Spanish labels read too.
  async function readLabelPhoto(from: 'camera' | 'library') {
    if (announcePhoneOnly(showInfoAlert, 'readSupplementLabel')) return;
    setReadingLabel(true);
    try {
      if (from === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showInfoAlert('Camera access needed', 'Lifestead needs your camera to read the label. You can still say or type what it lists.');
          return;
        }
      }
      const shot =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
      if (shot.canceled || shot.assets.length === 0) return;
      // A label's table often comes back a column at a time (every name,
      // then every amount), so the lines are put back into rows by where
      // they sit on the page (Tony, 2026-11-19: a Mexican multivitamin's
      // photo read as nothing with an amount). The ingredients paragraph
      // under the table gives forms only, never amounts (readSupplementLabel).
      // Each picture opens in the crop box first, so it can be cut to the
      // table (Tony, 2026-11-27: "Allow for the images taken for supplements
      // and medications are able to be cropped to the right size"). The crop
      // box takes one picture at a time, so a store page that shows the
      // table and the ingredients apart is picked one picture after another.
      const pages: string[] = [];
      for (const asset of shot.assets) {
        const lines = await recognizeLinesFromImage(asset.uri);
        const page = lines ? rowsFromPositionedLines(lines) : await recognizeTextFromImage(asset.uri);
        if (page) pages.push(page);
      }
      const text = pages.join('\n\n');
      if (!text) {
        showInfoAlert('Could not read the label', 'No words came off that photo. Try again closer and flatter, in good light, or say or type what it lists.');
        return;
      }
      setLabelText((current) => (current.trim() ? `${current.trim()}

${text}` : text));
      setLabelNoteFromPicture(true);
      const allPages = [...labelPages, ...pages];
      setLabelPages(allPages);
      await fillFromLabel(allPages.join('\n\n'), allPages);
    } catch (error) {
      console.error('[MyMedsSection] Failed to read the label photo', error);
      showInfoAlert('Could not read the label', 'Something went wrong reading that photo. You can say or type what the label lists instead.');
    } finally {
      setReadingLabel(false);
    }
  }

  // The label said or typed, read into rows added below any already filled.
  // A blank starter row is replaced rather than left above them.
  async function fillFromLabel(text: string, pages?: string[]) {
    if (!text.trim()) {
      explainNotYet('Say or type what the label lists first, for example "vitamin D 25 mcg, zinc 11 mg".');
      return;
    }
    const reading = readSupplementLabel(pages && pages.length > 1 ? pages : text);
    const tracked = new Set(nutrients.map((nutrient) => nutrient.code));
    const notes = reading.notUnderstood.map((item) => `"${item.spokenText}": ${item.reason}`);
    // A nutrient with the same amount already in the form is not added
    // again: an earlier picture of this label filled it, or it was typed.
    const rowKey = (code: string, amount: string | number, unit: string) => `${code}|${Number(amount)}|${unit}`;
    const already = new Set(
      supplementForm.ingredients.filter((row) => row.nutrientCode).map((row) => rowKey(row.nutrientCode, row.amount, row.unit)),
    );
    const filled: MedIngredientRow[] = [];
    let repeated = 0;
    for (const row of reading.rows) {
      if (already.has(rowKey(row.nutrientCode, row.amount, row.unit))) {
        repeated += 1;
        continue;
      }
      if (!tracked.has(row.nutrientCode)) {
        notes.push(`"${row.spokenText}": No nutrient this app tracks was recognised in it.`);
        continue;
      }
      let form = '';
      if (row.formWords) {
        let forms: SupplementForm[] = [];
        try {
          forms = await getSupplementForms(row.nutrientCode);
        } catch {
          forms = [];
        }
        // A form the app has research on is used by its listed name; any
        // other form the label names is kept in the label's words rather
        // than dropped (Tony, 2026-11-19: the forms on Lisa's multivitamin
        // were not read).
        form = matchSupplementForm(row.formWords, forms.map((item) => item.formName)) ?? labelFormWords(row.formWords);
      }
      filled.push({ ...blankMedIngredientRow(), nutrientCode: row.nutrientCode, supplementForm: form, amount: String(row.amount), unit: row.unit });
      void ensureNutrientDataLoaded(row.nutrientCode);
    }
    if (filled.length > 0) {
      setSupplementForm((current) => {
        const have = new Set(
          current.ingredients.filter((row) => row.nutrientCode).map((row) => rowKey(row.nutrientCode, row.amount, row.unit)),
        );
        return {
          ...current,
          ingredients: [
            ...current.ingredients.filter((row) => row.nutrientCode || row.amount),
            ...filled.filter((row) => !have.has(rowKey(row.nutrientCode, row.amount, row.unit))),
          ],
        };
      });
    }
    const lead =
      filled.length === 0
        ? repeated > 0
          ? 'Nothing new: every nutrient read here is already filled in below.'
          : 'Nothing in that could be read as a nutrient with an amount.'
        : `${filled.length === 1 ? '1 ingredient' : `${filled.length} ingredients`} filled in below. Check each one before adding the supplement.`;
    setLabelNote(notes.length ? `${lead}\n\nNot read, so nothing was guessed:\n${notes.join('\n')}` : lead);
  }

  // A8: adding a med says at once what the interaction rules now have to
  // say about it, rather than leaving it to be noticed in the bands below.
  // Rules already showing before the save are not repeated.
  async function knownRuleIds(): Promise<Set<string>> {
    try {
      const evaluation = await evaluateInteractionRules(todayDateString());
      return new Set([...evaluation.warnings.map((w) => w.ruleId), ...evaluation.referenceOnly.map((r) => r.ruleId)]);
    } catch {
      return new Set();
    }
  }

  async function announceNewRules(before: Set<string>, name: string) {
    try {
      const evaluation = await evaluateInteractionRules(todayDateString());
      const lines = [
        ...evaluation.warnings.filter((w) => !before.has(w.ruleId)).map((w) => `${withSeverityPrefix(w.severity, w.title)}: ${w.message}`),
        ...evaluation.referenceOnly.filter((r) => !before.has(r.ruleId)).map((r) => `${withSeverityPrefix(r.severity, r.title)}: ${r.guidance}`),
      ];
      if (lines.length === 0) return;
      showInfoAlert(
        `Worth knowing about ${name.trim()}`,
        `${lines.join('\n\n')}\n\nThese are timing and combination notes from the rules in this app. Your prescriber and pharmacist know your whole picture; ask them before changing how you take anything.`,
      );
    } catch {
      // The bands below still show every rule on the next load.
    }
  }

  async function handleSaveSupplement() {
    if (!supplementForm.name.trim()) {
      showInfoAlert('Almost there', "Enter the supplement's name.");
      return;
    }
    const unitsPerDay = parseDoseAmount(supplementForm.unitsPerDay);
    if (unitsPerDay === null || Number.isNaN(unitsPerDay) || unitsPerDay <= 0) {
      showInfoAlert('Almost there', 'Enter how many are taken per day, such as 1, 2, 0.5 for half or 0.25 for a quarter.');
      return;
    }
    if (!supplementForm.servingUnitLabel.trim()) {
      showInfoAlert('Almost there', 'Enter what one dose is called (e.g. capsule, tablet, scoop, powder).');
      return;
    }
    const validIngredients = supplementForm.ingredients.filter((row) => row.nutrientCode && row.amount);
    if (validIngredients.length === 0) {
      showInfoAlert('Almost there', 'Add at least one ingredient with an amount.');
      return;
    }

    // The amounts are copied from the label as printed; a label whose serving
    // is 2 capsules gives what 2 hold, so each is divided down to one.
    const servingSize = parseDoseAmount(supplementForm.servingSize) ?? 1;
    if (Number.isNaN(servingSize) || servingSize <= 0) {
      showInfoAlert('Almost there', 'Enter the serving size from the label, such as 1 or 2. Leave it at 1 if the label does not say.');
      return;
    }

    const ingredients: SupplementIngredientInput[] = validIngredients.map((row) => ({
      nutrientCode: row.nutrientCode,
      supplementForm: row.supplementForm || undefined,
      amountPerUnit: Number(String(row.amount).replace(',', '.')) / servingSize,
      unit: row.unit,
    }));

    const before = supplementForm.editingId ? null : await knownRuleIds();
    try {
      if (supplementForm.editingId) {
        await updateSupplementTreatment(supplementForm.editingId, {
          name: supplementForm.name,
          unitsPerDay,
          servingUnitLabel: supplementForm.servingUnitLabel,
          ingredients,
          notes: supplementForm.notes,
        });
      } else {
        const id = await createSupplementTreatment({
          name: supplementForm.name,
          unitsPerDay,
          servingUnitLabel: supplementForm.servingUnitLabel,
          ingredients,
          notes: supplementForm.notes,
        });
        await takeFromPendingBottle(id);
        if (pendingCode.current) await rememberMedCode(pendingCode.current, id);
        setJustSaved({ id, name: supplementForm.name.trim(), unit: supplementForm.servingUnitLabel.trim() || null });
      }
      closeAddForm();
      load();
      if (before) announceNewRules(before, supplementForm.name);
    } catch (error) {
      showInfoAlert('Could not save', error instanceof Error ? error.message : String(error));
    }
  }

  // --- Prescription / OTC form ---
  function selectCommonMed(med: CommonMedication) {
    setMedForm((current) => ({
      ...current,
      commonMedId: med.id,
      manualEntry: false,
      name: med.genericName,
      genericName: med.id,
    }));
  }

  async function handleSaveMed() {
    if (!medForm.name.trim()) {
      showInfoAlert('Almost there', 'Enter a name for this medication.');
      return;
    }
    const doseAmount = parseDoseAmount(medForm.doseAmount);
    if (doseAmount !== null && Number.isNaN(doseAmount)) {
      showInfoAlert('Almost there', 'Enter the dose as a number, such as 75, 2.5, or 0.5 for half a tablet.');
      return;
    }
    const input = {
      name: medForm.name,
      genericName: medForm.genericName || undefined,
      doseAmount: doseAmount ?? undefined,
      doseUnit: medForm.doseUnit || undefined,
      frequency: medForm.frequency || undefined,
      notes: medForm.notes || undefined,
    };
    const before = medForm.editingId ? null : await knownRuleIds();
    try {
      if (medForm.editingId) {
        if (medForm.category === 'prescription') {
          await updatePrescriptionTreatment(medForm.editingId, input);
        } else {
          await updateOtcTreatment(medForm.editingId, input);
        }
      } else {
        const id = medForm.category === 'prescription' ? await createPrescriptionTreatment(input) : await createOtcTreatment(input);
        await takeFromPendingBottle(id);
        setJustSaved({ id, name: medForm.name.trim(), unit: null });
      }
      closeAddForm();
      load();
      if (before) announceNewRules(before, medForm.name);
    } catch (error) {
      showInfoAlert('Could not save', error instanceof Error ? error.message : String(error));
    }
  }

  async function handleRemove(treatment: TreatmentRecord) {
    const ok = await confirmSheet({
      title: 'Remove this item?',
      message: `"${treatment.name}" will be permanently deleted from My Meds.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    if (!(await saveOrSay('It was not removed. Try again.', async () => { await deleteTreatment(treatment.id); return true; }))) return;
    load();
  }

  // A new med added for a bottle the partner shared takes from it at once,
  // before its count is asked, so the count form opens on the shared bottle.
  async function takeFromPendingBottle(treatmentId: string) {
    if (!pendingBottleId) return;
    const supplyId = pendingBottleId;
    setPendingBottleId(null);
    try {
      await joinBottle(supplyId, treatmentId);
    } catch (error) {
      console.warn('[MyMedsSection] could not join the shared bottle', error);
    }
  }

  async function answerBottle(bottle: SharedBottleRow, answer: 'join' | 'add' | 'decline') {
    if (answer === 'join') {
      const treatmentId = bottleChoice[bottle.id];
      if (!treatmentId) {
        explainNotYet('Pick which of your meds takes from this bottle first.');
        return;
      }
      if (!(await saveOrSay('It was not saved. Try again.', async () => { await joinBottle(bottle.id, treatmentId); return true; }))) return;
      load();
      setCountingId(treatmentId);
      return;
    }
    if (answer === 'add') {
      openAddSupplement();
      setSupplementForm((current) => ({ ...current, name: bottle.name }));
      setPendingBottleId(bottle.id);
      return;
    }
    if (!(await saveOrSay('It was not saved. Try again.', async () => { await declineBottle(bottle.id); return true; }))) return;
    load();
  }

  function renderBottlesToAnswer() {
    if (bottlesToAnswer.length === 0 || medsClosed) return null;
    const mine: DropdownOption[] = treatments
      .filter((item) => item.active)
      .map((item) => ({ label: item.name, value: item.id }));
    const who = sharingPartnerName ?? 'Your partner';
    return bottlesToAnswer.map((bottle) => (
      <View key={bottle.id} style={styles.formCard}>
        <Text style={styles.label}>{t('{name} shares a bottle of {med} with you.', { name: who, med: bottle.name })}</Text>
        <Text style={styles.fieldHint}>
          Say which of your meds takes from it, and both of your doses come off one count, so it says when the bottle gets low on both phones.
        </Text>
        {mine.length > 0 ? (
          <PopoverSelect
            selected={bottleChoice[bottle.id] ?? null}
            options={mine}
            onSelect={(value) => setBottleChoice((current) => ({ ...current, [bottle.id]: value }))}
            placeholder="Which of my meds it is"
            tabColor={tabColor}
            searchable={mine.length > 8}
          />
        ) : null}
        <ThumbRow primary="last" style={styles.formActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => void answerBottle(bottle, 'decline')}>
            <Text style={styles.secondaryButtonText}>Not mine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => void answerBottle(bottle, 'add')}>
            <Text style={styles.secondaryButtonText}>Add it to my meds</Text>
          </TouchableOpacity>
          {mine.length > 0 ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => void answerBottle(bottle, 'join')}>
              <Text style={styles.primaryButtonText}>It is this one</Text>
            </TouchableOpacity>
          ) : null}
        </ThumbRow>
      </View>
    ));
  }

  // After the count for a new one is saved or put off: whether to schedule it.
  async function finishJustSaved(saved: { id: string; name: string }) {
    setJustSaved(null);
    load();
    const schedule = await confirmSheet({
      title: 'Put it on the schedule?',
      message: t('Set the times for {name} on Schedules > Meds, so it shows with everything else for the day and each dose you mark taken comes off the count.', { name: saved.name }),
      confirmLabel: 'Schedule It',
      cancelLabel: 'Not Now',
    });
    if (schedule) router.push({ pathname: '/schedule', params: { openScheduleLens: 'meds', scheduleTreatmentId: saved.id } });
  }

  async function handleToggleActive(treatment: TreatmentRecord) {
    if (!(await saveOrSay(treatment.active ? 'It was not paused. Try again.' : 'It was not started again. Try again.', async () => { await setTreatmentActive(treatment.id, !treatment.active); return true; }))) return;
    load();
  }

  // useMemo, not a plain inline .map() -- PopoverSelect (unlike the old
  // Dropdown) is memoized against referentially-stable `options`, so a
  // fresh array on every render (e.g. every Name/Notes keystroke, which
  // re-renders this whole lens) would otherwise force these two pickers'
  // own popovers to rebuild for no real reason.
  const nutrientOptions: DropdownOption[] = useMemo(
    () => sortByLabel(nutrients.map((nutrient) => ({ label: nutrient.displayName, value: nutrient.code }))),
    [nutrients],
  );
  const commonMedOptionsForCategory: DropdownOption[] = useMemo(
    () =>
      commonMedications
        .filter((med) => med.treatmentType === medForm.category)
        .map((med) => ({
          label: medOptionLabel(med),
          value: med.id,
        })),
    [commonMedications, medForm.category],
  );
  const selectedCommonMed = commonMedications.find((med) => med.id === medForm.commonMedId) ?? null;

  function renderNutrientResearchCard(nutrientCode: string, chosenForm: string) {
    const forms = formsByNutrient[nutrientCode] ?? [];
    const timing = timingByNutrient[nutrientCode];
    const foodStatus = foodStatusFor(nutrientCode);
    const formDetail = forms.find((form) => form.formName === chosenForm);
    const linkedFood = ingredientFood(nutrientCode);

    if (!nutrientCode) return null;

    return (
      <View style={styles.myMedsResearchCard}>
        {formDetail ? (
          <>
            <Text style={styles.myMedsResearchLabel}>
              {formDetail.formName} · {EVIDENCE_TIER_LABEL[formDetail.evidenceStrength] ?? formDetail.evidenceStrength}
            </Text>
            <Text style={styles.helperText}>{formDetail.absorptionNote}</Text>
            {formDetail.giToleranceNote ? <Text style={styles.helperText}>{formDetail.giToleranceNote}</Text> : null}
            {formDetail.notes ? <Text style={styles.helperText}>{formDetail.notes}</Text> : null}
          </>
        ) : null}
        {timing ? (
          <>
            <Text style={styles.myMedsResearchLabel}>When to take it</Text>
            <Text style={styles.helperText}>{timing.bestTaken}</Text>
            {timing.avoidWith ? <Text style={styles.helperText}>Avoid taking with: {timing.avoidWith}</Text> : null}
            {timing.pairsWellWith ? <Text style={styles.helperText}>Pairs well with: {timing.pairsWellWith}</Text> : null}
          </>
        ) : null}
        {linkedFood ? (
          <>
            <Text style={styles.myMedsResearchLabel}>How it is counted</Text>
            <Text style={styles.helperText}>
              {t(
                'Counted as a typical {name}: what the record "{food}" holds in {table}, times the amount on your label. Your bottle can differ, and any nutrient the label lists itself is taken from the label instead.',
                { name: nutrientDisplayName(nutrientCode).toLowerCase(), food: linkedFood.foodName, table: foodTableName(linkedFood.source) },
              )}
            </Text>
            {linkedFood.alsoCarries ? <Text style={styles.helperText}>{t(linkedFood.alsoCarries)}</Text> : null}
            {/antioxidant/i.test(linkedFood.alsoCarries ?? '') ? (
              <Text style={styles.helperText}>
                Antioxidants are named here and never given as an amount. USDA withdrew its antioxidant table (ORAC) in 2012, saying the figures do not show what happens in the body.
              </Text>
            ) : null}
          </>
        ) : isSupplementOnlyIngredient(nutrientCode) && !nutrients.some((n) => n.code === nutrientCode && n.group !== 'supplement') ? (
          <Text style={styles.helperText}>
            {t('The food records carry no amount of {name}, so it is kept as the label gives it and not added into the nutrients for the day.', {
              name: nutrientDisplayName(nutrientCode),
            })}
          </Text>
        ) : (
        <>
        <Text style={styles.myMedsResearchLabel}>From food today</Text>
        {foodStatus ? (
          // Food alone (Lisa's phone, 2026-11-27): percentOfTarget counts the
          // supplements too, so copper read "278% of today's target from food
          // (0mg)" when the 278% was the copper tablet. The food share is
          // worked out here from fromFood, and the amount keeps its decimals.
          <Text style={styles.helperText}>
            {foodStatus.fromFood > 0
              ? t('From food logged today: about {amount} {unit}, {percent}% of the daily {name} target.', {
                  amount: formatFoodAmount(foodStatus.fromFood),
                  unit: foodStatus.unit,
                  percent: foodStatus.target > 0 ? Math.round((foodStatus.fromFood / foodStatus.target) * 100) : 0,
                  name: foodStatus.displayName,
                })
              : t('No {name} from food logged today yet.', { name: foodStatus.displayName })}
          </Text>
        ) : (
          // No daily target for this one (fat, carbohydrate and inositol
          // have none here), so there is no share of a target to give. The
          // amount from food is still counted and shown (Tony, 2026-11-19:
          // the old line said the app did not track fat or carbohydrate in
          // food at all, which was never true).
          <Text style={styles.helperText}>
            {(foodTotals[nutrientCode] ?? 0) > 0
              ? t('From food logged today: about {amount} {unit}. This app has no daily target for {name}, so no share of one is shown.', {
                  amount: formatFoodAmount(foodTotals[nutrientCode]),
                  unit: nutrients.find((nutrient) => nutrient.code === nutrientCode)?.unit ?? '',
                  name: nutrientDisplayName(nutrientCode),
                })
              : t('No {name} from food logged today yet. This app has no daily target for it, so no share of one is shown.', {
                  name: nutrientDisplayName(nutrientCode),
                })}
          </Text>
        )}
        </>
        )}
      </View>
    );
  }

  // The form for adding or editing a med. Adding draws it at the top of
  // the lens; Edit draws it right under the row being edited (Tony,
  // 2026-11-18: once a supplement was made, Edit seemed to do nothing,
  // because the form opened at the top of the lens, off the screen).
  // The record Edit was pressed on, whose form draws under its own row.
  const editingRowId = addMode === null ? null : addMode === 'supplement' ? supplementForm.editingId : medForm.editingId;

  function renderForm(inline: boolean) {
    if (addMode === null) return null;
    return addMode === 'supplement' ? (
          <View style={[styles.formCard, inline ? styles.formInline : null]}>
            {supplementForm.editingId ? null : renderKindSwitch('supplement')}
            {/* The label first, the gaps after (Tony, 2026-11-20: "they should
                be able to just start with that as their best bet for many
                ingredients and fill in the gaps after"). */}
            <Text style={styles.label}>Start with a picture of the Supplement Facts table</Text>
            {/* Which side of the box (Tony, 2026-11-27: "does it mean the
                ingredients or the front of the box?"). */}
            <Text style={styles.fieldHint}>
              Photograph the side or back of the bottle or box, where the Supplement Facts table (Información nutrimental on a Mexican label) lists each nutrient and its amount, with the ingredients list under it, which names each form. The front only shows the name, so type that under Name instead. After each picture, crop it to the table. A store&apos;s picture of the table reads best, since it is flat. On a round bottle, take several pictures, turning the bottle a little each time; each picture adds to the ones before it. The amounts and forms it finds fill in under Ingredients, and you fill in the rest after.
            </Text>
            <View style={styles.labelPhotoRow}>
              <TouchableOpacity
                ref={walkMark.ref('myMeds.labelLibrary')}
                onPress={() => void readLabelPhoto('library')}
                disabled={readingLabel}
                style={[styles.secondaryButton, styles.labelPhotoButton, readingLabel ? styles.busy : null]}
              >
                <Text style={styles.secondaryButtonText}>
                  {readingLabel ? 'Reading the Label' : labelPages.length > 0 ? 'Use Another Photo You Have' : 'Use a Photo You Have'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                ref={walkMark.ref('myMeds.labelPhoto')}
                onPress={() => void readLabelPhoto('camera')}
                disabled={readingLabel}
                style={[styles.secondaryButton, styles.labelPhotoButton, readingLabel ? styles.busy : null]}
              >
                <Text style={styles.secondaryButtonText}>
                  {labelPages.length > 0 ? 'Photograph More of the Label' : 'Photograph the Label'}
                </Text>
              </TouchableOpacity>
            </View>
            {labelPages.length > 0 ? (
              <Text style={styles.fieldHint}>
                {labelPages.length === 1
                  ? t('1 picture of this label read. Turn the bottle and take another for any part it missed.')
                  : t('{count} pictures of this label read, together. Turn the bottle and take another for any part still missing.', { count: labelPages.length })}
              </Text>
            ) : null}
            {/* A store's picture of the label reads best (Tony, 2026-11-19). */}
            <TouchableOpacity
              ref={walkMark.ref('myMeds.storeLabelHelp')}
              onPress={() => showInfoAlert(t(STORE_LABEL_TITLE), STORE_LABEL_STEPS.map((step) => t(step)).join('\n\n'))}
            >
              <Text style={styles.fieldHint}>How to save a store&apos;s picture of the label: tap here.</Text>
            </TouchableOpacity>
            {labelNote && labelNoteFromPicture ? <Text style={styles.helperText}>{labelNote}</Text> : null}
            <Text style={styles.label}>Name</Text>
            <Text style={styles.fieldHint}>What you call it. The name on the bottle works, or just the main nutrient.</Text>
            <AppTextInput
              onVoiceResult={(text) => setSupplementForm((current) => ({ ...current, name: text }))}
              micColor={tabColor}
              style={styles.input}
              placeholder="e.g. Daily Multivitamin, or just Magnesium"
              value={supplementForm.name}
              onChangeText={(text) => setSupplementForm((current) => ({ ...current, name: text }))}
            />
  
            <Text style={styles.label}>Dose</Text>
            <Text style={styles.fieldHint}>
              How many you take in a whole day, and what one of them is. One capsule in the morning and one at night is 2 capsules. Half a tablet is 0.5.
            </Text>
            <View style={styles.timeRow}>
              <AppTextInput
                style={[styles.input, styles.timeInput]}
                keyboardType="decimal-pad"
                placeholder="1, or 0.5"
                value={supplementForm.unitsPerDay}
                onChangeText={(text) => setSupplementForm((current) => ({ ...current, unitsPerDay: text }))}
              />
              <AppTextInput
                style={[styles.input, styles.doseUnitInput]}
                placeholder="capsule, tablet, scoop, powder…"
                value={supplementForm.servingUnitLabel}
                onChangeText={(text) => setSupplementForm((current) => ({ ...current, servingUnitLabel: text }))}
              />
              <Text style={styles.timeSeparator}>/ day</Text>
            </View>
  
            <Text style={styles.label}>Serving size on the label</Text>
            <Text style={styles.fieldHint}>
              Many labels give their amounts for 2 or more at once, written as &quot;Serving size: 2 capsules&quot;. Put that number here and copy the amounts exactly as printed: they are divided down to one when saved. Leave it at 1 if the label does not say.
            </Text>
            <View style={styles.timeRow}>
              <AppTextInput
                style={[styles.input, styles.timeInput]}
                keyboardType="decimal-pad"
                placeholder="1"
                value={supplementForm.servingSize}
                onChangeText={(text) => setSupplementForm((current) => ({ ...current, servingSize: text }))}
              />
              {supplementForm.servingUnitLabel.trim() ? (
                <Text style={styles.timeSeparator}>{supplementForm.servingUnitLabel.trim()}</Text>
              ) : null}
            </View>
  
            <Text style={styles.label}>Ingredients</Text>
            <Text style={styles.fieldHint}>The amounts on the label, for the serving size above.</Text>
            <Text style={styles.fieldHint}>
              Filled from the label pictures at the top, or read the label out loud or type it here and tap Fill Ingredients From This. Then check each row it fills in, and add anything it missed with + Add ingredient.
            </Text>
            <AppTextInput
              onVoiceResult={(text, isFinal) => {
                setLabelText(text);
                if (isFinal) void fillFromLabel(text);
              }}
              micColor={tabColor}
              style={styles.input}
              multiline
              placeholder="Say or type the label: vitamin D 25 mcg, zinc 11 mg, B12 500 mcg as methylcobalamin"
              value={labelText}
              onChangeText={setLabelText}
            />
            <TouchableOpacity
              onPress={() => {
                setLabelNoteFromPicture(false);
                void fillFromLabel(labelText);
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Fill Ingredients From This</Text>
            </TouchableOpacity>
            {labelNote && !labelNoteFromPicture ? <Text style={styles.helperText}>{labelNote}</Text> : null}
            {supplementForm.ingredients.map((row) => {
              const forms = formsByNutrient[row.nutrientCode] ?? [];
              const formOptions: DropdownOption[] = forms.map((form) => ({ label: form.formName, value: form.formName }));
              return (
                <View key={row.key}>
                  <View style={styles.ingredientRow}>
                    <View style={styles.ingredientNutrientCol}>
                      {/* colors.tabFood, not this lens's own TAB_COLOR (tabSchedules) --
                          2026-08-08, explicitly requested to match "the same color as
                          those on the Side Dish Builder," which passes this same
                          constant as its own tabColor. All four PopoverSelect fields
                          in this lens share it, for one consistent picker color. */}
                      <PopoverSelect
                        selected={row.nutrientCode || null}
                        options={nutrientOptions}
                        onSelect={(value) => {
                          updateIngredientRow(row.key, { nutrientCode: value, supplementForm: '' });
                          ensureNutrientDataLoaded(value);
                        }}
                        placeholder="Nutrient"
                        tabColor={colors.tabFood}
                        width={220}
                        searchable
                        searchPlaceholder="Search nutrients…"
                      />
                    </View>
                    <AppTextInput
                      style={[styles.input, styles.ingredientAmountInput]}
                      placeholder="Amount"
                      keyboardType="decimal-pad"
                      value={row.amount}
                      onChangeText={(text) => updateIngredientRow(row.key, { amount: text })}
                    />
                    <View style={styles.ingredientUnitCol}>
                      <PopoverSelect
                        selected={row.unit || null}
                        options={SUPPLEMENT_UNIT_OPTIONS}
                        onSelect={(value) => updateIngredientRow(row.key, { unit: value })}
                        tabColor={colors.tabFood}
                        minWidth={64}
                      />
                    </View>
                    <TouchableOpacity onPress={() => removeIngredientRow(row.key)} style={styles.ingredientRemove}>
                      <Text style={styles.actionTextRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {row.nutrientCode && formOptions.length > 0 && !formTyped(row, forms) ? (
                    <View style={styles.ingredientFormRow}>
                      <PopoverSelect
                        selected={row.supplementForm || null}
                        options={[...formOptions, { label: 'A form of your own', value: OWN_FORM }]}
                        onSelect={(value) => {
                          if (value === OWN_FORM) {
                            setTypingFormKeys((current) => new Set(current).add(row.key));
                            updateIngredientRow(row.key, { supplementForm: '' });
                          } else {
                            updateIngredientRow(row.key, { supplementForm: value });
                          }
                        }}
                        placeholder="Which form? (optional, but changes absorption)"
                        tabColor={colors.tabFood}
                        width={240}
                      />
                    </View>
                  ) : null}
                  {row.nutrientCode && (formOptions.length === 0 || formTyped(row, forms)) ? (
                    // Any form, in the label's words, for a nutrient with no
                    // listed forms or a form not on the list (open lists).
                    <View style={styles.ingredientFormRow}>
                      <AppTextInput
                        style={styles.input}
                        placeholder="Form on the label, such as retinyl palmitate (optional)"
                        value={row.supplementForm}
                        onChangeText={(text) => updateIngredientRow(row.key, { supplementForm: text })}
                      />
                      {formOptions.length > 0 ? (
                        <TouchableOpacity
                          onPress={() => {
                            setTypingFormKeys((current) => {
                              const next = new Set(current);
                              next.delete(row.key);
                              return next;
                            });
                            updateIngredientRow(row.key, { supplementForm: '' });
                          }}
                        >
                          <Text style={styles.fieldHint}>Pick from the listed forms instead</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                  {row.nutrientCode ? renderNutrientResearchCard(row.nutrientCode, row.supplementForm) : null}
                </View>
              );
            })}
            {supplementForm.ingredients.length > 0 ? (
              <Text style={styles.fieldHint}>
                For each row: pick the nutrient, type the amount, and pick the unit the label uses (mg, mcg, IU). Under it goes the form the label names, such as &quot;as glycinate&quot; or &quot;retinyl palmitate&quot;: pick it from the list where one appears, or type it as the label says.
              </Text>
            ) : null}
            <TouchableOpacity ref={walkMark.ref('myMeds.ingredient')} onPress={addIngredientRow} style={[styles.secondaryButton, walkMark('myMeds.ingredient')]}>
              <Text style={styles.secondaryButtonText}>+ Add ingredient</Text>
            </TouchableOpacity>
  
            <Text style={styles.label}>Notes (optional)</Text>
            <Text style={styles.fieldHint}>Anything worth remembering about it. When you take it is set after saving, with Schedule it.</Text>
            <NotesInput
              micColor={tabColor}
              style={styles.input}
              placeholder="e.g. take with food"
              value={supplementForm.notes}
              onChangeText={(text) => setSupplementForm((current) => ({ ...current, notes: text }))}
            />
  
            <ThumbRow primary="last" style={styles.formActions}>
              {supplementForm.editingId && treatments.find((item) => item.id === supplementForm.editingId)?.active ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    const editing = treatments.find((item) => item.id === supplementForm.editingId);
                    closeAddForm();
                    if (editing) void handleToggleActive(editing);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Pause it</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.secondaryButton} onPress={closeAddForm}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity ref={walkMark.ref('myMeds.saveSupplement')} style={[styles.primaryButton, walkMark('myMeds.saveSupplement')]} onPress={handleSaveSupplement}>
                <Text style={styles.primaryButtonText}>{supplementForm.editingId ? 'Save changes' : 'Add supplement'}</Text>
              </TouchableOpacity>
            </ThumbRow>
          </View>
        ) : (
          <View style={[styles.formCard, inline ? styles.formInline : null]}>
            {medForm.editingId ? null : renderKindSwitch(medForm.category)}
            <Text style={styles.label}>{medForm.category === 'prescription' ? 'Prescription' : 'OTC drug'}</Text>
  
            {!medForm.manualEntry ? (
              <>
                <PopoverSelect
                  selected={medForm.commonMedId || null}
                  options={commonMedOptionsForCategory}
                  onSelect={(value) => {
                    const med = commonMedications.find((candidate) => candidate.id === value);
                    if (med) selectCommonMed(med);
                  }}
                  placeholder="Search this app's researched list…"
                  tabColor={colors.tabFood}
                  width={260}
                  searchable
                  searchPlaceholder="e.g. levothyroxine, metformin, ibuprofen…"
                />
                <TouchableOpacity onPress={() => setMedForm((current) => ({ ...current, manualEntry: true }))}>
                  <Text style={styles.actionTextPrimary}>Not in the list? Enter it myself</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setMedForm((current) => ({ ...current, manualEntry: false, commonMedId: '' }))}>
                <Text style={styles.actionTextPrimary}>Search the researched list instead</Text>
              </TouchableOpacity>
            )}
  
            {selectedCommonMed ? (
              <View style={styles.myMedsResearchCard}>
                <Text style={styles.myMedsResearchLabel}>
                  {selectedCommonMed.drugClass} · {EVIDENCE_TIER_LABEL[selectedCommonMed.evidenceStrength] ?? selectedCommonMed.evidenceStrength}
                </Text>
                <Text style={styles.helperText}>{selectedCommonMed.commonUse}</Text>
                {selectedCommonMed.brandNamesMexico ? (
                  <Text style={styles.helperText}>{t('In Mexico: {brands}', { brands: selectedCommonMed.brandNamesMexico })}{selectedCommonMed.mexicoNotes ? ' ' + tl(selectedCommonMed.mexicoNotes) : ''}</Text>
                ) : null}
                {selectedCommonMed.thyroidRelevantNotes ? (
                  <Text style={styles.helperText}>{selectedCommonMed.thyroidRelevantNotes}</Text>
                ) : null}
                {selectedCommonMed.timingGuidance ? (
                  <Text style={styles.helperText}>Timing: {selectedCommonMed.timingGuidance}</Text>
                ) : null}
                {selectedCommonMed.keyInteractions ? (
                  <Text style={styles.helperText}>Key interactions: {selectedCommonMed.keyInteractions}</Text>
                ) : null}
              </View>
            ) : medForm.manualEntry ? (
              <Text style={styles.helperText}>
                Not in this app&apos;s researched list yet, but you can still track it with the details you know. The app cannot look this up online yet.
              </Text>
            ) : null}
  
            <Text style={styles.label}>Name</Text>
            <AppTextInput
              onVoiceResult={(text) => setMedForm((current) => ({ ...current, name: text }))}
              micColor={tabColor}
              style={styles.input}
              placeholder="e.g. Synthroid 75mcg"
              value={medForm.name}
              onChangeText={(text) => setMedForm((current) => ({ ...current, name: text }))}
            />
  
            {medForm.manualEntry ? (
              <>
                <Text style={styles.label}>Generic name (optional, helps check interactions)</Text>
                <AppTextInput
                  onVoiceResult={(text) => setMedForm((current) => ({ ...current, genericName: text }))}
                  micColor={tabColor}
                  style={styles.input}
                  placeholder="e.g. levothyroxine"
                  value={medForm.genericName}
                  onChangeText={(text) => setMedForm((current) => ({ ...current, genericName: text }))}
                />
              </>
            ) : null}
  
            <Text style={styles.label}>Dose</Text>
            <View style={styles.timeRow}>
              <AppTextInput
                style={[styles.input, styles.timeInput]}
                placeholder="75"
                keyboardType="decimal-pad"
                value={medForm.doseAmount}
                onChangeText={(text) => setMedForm((current) => ({ ...current, doseAmount: text }))}
              />
              <AppTextInput
                style={[styles.input, styles.doseUnitInput]}
                placeholder="mcg, mg…"
                value={medForm.doseUnit}
                onChangeText={(text) => setMedForm((current) => ({ ...current, doseUnit: text }))}
              />
            </View>
  
            <Text style={styles.label}>Frequency (optional)</Text>
            <AppTextInput
              onVoiceResult={(text) => setMedForm((current) => ({ ...current, frequency: text }))}
              micColor={tabColor}
              style={styles.input}
              placeholder="e.g. once daily"
              value={medForm.frequency}
              onChangeText={(text) => setMedForm((current) => ({ ...current, frequency: text }))}
            />
  
            <Text style={styles.label}>Notes (optional)</Text>
            <NotesInput
              micColor={tabColor}
              style={styles.input}
              placeholder="e.g. prescribed by Dr. …"
              value={medForm.notes}
              onChangeText={(text) => setMedForm((current) => ({ ...current, notes: text }))}
            />
  
            <ThumbRow primary="last" style={styles.formActions}>
              {medForm.editingId && treatments.find((item) => item.id === medForm.editingId)?.active ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    const editing = treatments.find((item) => item.id === medForm.editingId);
                    closeAddForm();
                    if (editing) void handleToggleActive(editing);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Pause it</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.secondaryButton} onPress={closeAddForm}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveMed}>
                <Text style={styles.primaryButtonText}>{medForm.editingId ? 'Save changes' : medForm.category === 'prescription' ? 'Add prescription' : 'Add OTC drug'}</Text>
              </TouchableOpacity>
            </ThumbRow>
          </View>
    );
  }

  // The first row on screen carries the tutorial rings for the row buttons
  // (lib/toolHowTos.ts), the way the first garden area does.
  const firstShownId = (['prescription', 'otc', 'supplement'] as const)
    .map((kind) => treatments.find((treatment) => treatment.treatmentType === kind))
    .find(Boolean)?.id;

  function renderTreatmentGroup(title: string, groupTreatments: TreatmentRecord[]) {
    if (groupTreatments.length === 0) return null;
    return (
      <TabBand folds={folds} color={tabColor} id={`life:myMeds:${title}`} title={title} icon="medkit-outline" count={groupTreatments.length}>
      <View style={styles.myMedsGroup}>
        {groupTreatments.map((treatment) => {
          const isExpanded = expandedId === treatment.id;
          const ingredients = ingredientsByTreatment[treatment.id] ?? [];
          const matchedMed = treatment.genericName ? commonMedications.find((med) => med.id === treatment.genericName) : null;
          const taperSteps = tapersByTreatment.get(treatment.id) ?? [];
          const taperToday = stepOn(taperSteps, todayDateString());
          const ownDose = treatment.doseAmount ? `${formatDoseAmount(treatment.doseAmount)}${treatment.doseUnit ? ' ' + treatment.doseUnit : ''}` : null;

          return (
            <View key={treatment.id} style={styles.row}>
              <TouchableOpacity style={styles.rowTextCol} onPress={() => setExpandedId(isExpanded ? null : treatment.id)}>
                <Text style={styles.rowTitle}>{treatment.name}</Text>
                <Text style={styles.rowMeta}>
                  {treatment.treatmentType === 'supplement'
                    ? `${doseWithUnit(Number(treatment.unitsPerDay), treatment.servingUnitLabel ?? '')}/day`
                    : [
                        taperToday ? `${taperDoseLine(taperToday)} today` : treatment.doseAmount ? `${formatDoseAmount(treatment.doseAmount)}${treatment.doseUnit ? ' ' + treatment.doseUnit : ''}` : null,
                        treatment.frequency,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'No dose details entered'}
                  {treatment.active ? '' : ` ${t('· Paused, so it is left out of nutrient totals and timing warnings')}`}
                </Text>
                {treatment.treatmentType === 'supplement' &&
                unitsDisagree(detailsByTreatment.get(treatment.id)?.supplyUnit, treatment.servingUnitLabel) ? (
                  <Text style={styles.rowMeta}>
                    {t('Taken as "{called}", counted as "{unit}". Tap Tracking to use one word for both.', {
                      called: treatment.servingUnitLabel ?? '',
                      unit: detailsByTreatment.get(treatment.id)?.supplyUnit ?? '',
                    })}
                  </Text>
                ) : null}
                {ingredients.length > 0 ? (
                  <Text style={styles.rowMeta}>
                    {ingredients
                      .map(
                        (ingredient) =>
                          `${nutrientDisplayName(ingredient.nutrientCode)}${ingredient.supplementForm ? ` (${ingredient.supplementForm})` : ''}`,
                      )
                      .join(', ')}
                  </Text>
                ) : null}
              </TouchableOpacity>

              {/* Tracking on a line of its own, the row's buttons under it
                  (Tony, 2026-11-27): a long count no longer squeezes them. */}
              <View style={styles.trackingRow}>
                <TouchableOpacity
                  ref={treatment.id === firstShownId ? walkMark.ref('myMeds.tracking') : undefined}
                  style={walkMark('myMeds.tracking')}
                  onPress={() => setCountingId(countingId === treatment.id ? null : treatment.id)}
                >
                  <Text style={supplyByTreatment.get(treatment.id)?.short ? styles.actionTextPrimary : styles.actionText}>
                    {supplyByTreatment.get(treatment.id)?.short ? t('Tracking: {left}', { left: supplyByTreatment.get(treatment.id)?.short ?? '' }) : 'Track how many'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.supplementRowActions}>
                {treatment.active ? null : (
                  <TouchableOpacity onPress={() => handleToggleActive(treatment)}>
                    <Text style={styles.actionTextPrimary}>Start again</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity ref={treatment.id === firstShownId ? walkMark.ref('myMeds.details') : undefined} style={walkMark('myMeds.details')} onPress={() => setExpandedId(isExpanded ? null : treatment.id)}>
                  <Text style={styles.actionText}>{isExpanded ? 'Hide details' : 'Details'}</Text>
                </TouchableOpacity>
                <TouchableOpacity ref={treatment.id === firstShownId ? walkMark.ref('myMeds.edit') : undefined} style={walkMark('myMeds.edit')} onPress={() => openEdit(treatment)}>
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity ref={treatment.id === firstShownId ? walkMark.ref('myMeds.schedule') : undefined} style={walkMark('myMeds.schedule')} onPress={() => scheduleIt(treatment)}>
                  <Text style={styles.actionTextPrimary}>Schedule it</Text>
                </TouchableOpacity>
                <TouchableOpacity ref={treatment.id === firstShownId ? walkMark.ref('myMeds.remove') : undefined} style={walkMark('myMeds.remove')} onPress={() => handleRemove(treatment)}>
                  <Text style={styles.actionTextRemove}>Remove</Text>
                </TouchableOpacity>
              </View>

              {countingId === treatment.id ? (
                <View style={styles.myMedsDetail}>
                  <Text style={styles.label}>{t('How many {name} do you have?', { name: treatment.name })}</Text>
                  <Text style={styles.fieldHint}>{supplyByTreatment.get(treatment.id)?.sentence ?? ''}</Text>
                  <SupplyCountForm
                    treatmentId={treatment.id}
                    name={treatment.name}
                    details={detailsByTreatment.get(treatment.id)}
                    reading={supplyByTreatment.get(treatment.id)}
                    defaultUnit={treatment.servingUnitLabel}
                    doseCalled={treatment.treatmentType === 'supplement' ? treatment.servingUnitLabel : null}
                    tabColor={tabColor}
                    onDone={(saved) => {
                      setCountingId(null);
                      if (saved) load();
                    }}
                    onProblem={showInfoAlert}
                  />
                </View>
              ) : null}

              {isExpanded ? (
                <View style={styles.myMedsDetail}>
                  {treatment.treatmentType === 'supplement'
                    ? ingredients.map((ingredient) => (
                        <View key={ingredient.id}>
                          <Text style={styles.myMedsResearchLabel}>
                            {/* The label's amount is kept per one tablet or capsule, so "10mg/dose" on a ¼ tablet a day misread it (Lisa's phone, 2026-11-27): it says what one holds and what the day comes to. */}
                            {(() => {
                              // Measured amounts read as decimals ("2.5 mg"), never as a fraction of a tablet.
                              const perOne = Number(ingredient.amountPerUnit.toFixed(3));
                              const one = treatment.servingUnitLabel?.trim() ? unitSingular(treatment.servingUnitLabel) : t('unit');
                              const name = tl(nutrientDisplayName(ingredient.nutrientCode));
                              const perDay = Number(treatment.unitsPerDay);
                              return perDay > 0
                                ? t('{nutrient}: {amount} {unit} in each {one}, so {daily} {unit} a day', {
                                    nutrient: name, amount: perOne, unit: ingredient.unit, one,
                                    daily: Number((ingredient.amountPerUnit * perDay).toFixed(3)),
                                  })
                                : t('{nutrient}: {amount} {unit} in each {one}', { nutrient: name, amount: perOne, unit: ingredient.unit, one });
                            })()}
                          </Text>
                          {renderNutrientResearchCard(ingredient.nutrientCode, ingredient.supplementForm ?? '')}
                        </View>
                      ))
                    : matchedMed ? (
                        <>
                          <Text style={styles.myMedsResearchLabel}>{matchedMed.drugClass}</Text>
                          <Text style={styles.helperText}>{matchedMed.commonUse}</Text>
                          {matchedMed.brandNamesMexico ? (
                            <Text style={styles.helperText}>{t('In Mexico: {brands}', { brands: matchedMed.brandNamesMexico })}{matchedMed.mexicoNotes ? ' ' + tl(matchedMed.mexicoNotes) : ''}</Text>
                          ) : null}
                          {matchedMed.thyroidRelevantNotes ? (
                            <Text style={styles.helperText}>{matchedMed.thyroidRelevantNotes}</Text>
                          ) : null}
                          {matchedMed.timingGuidance ? (
                            <>
                              <Text style={styles.myMedsResearchLabel}>Timing</Text>
                              <Text style={styles.helperText}>{matchedMed.timingGuidance}</Text>
                            </>
                          ) : null}
                          {matchedMed.keyInteractions ? (
                            <>
                              <Text style={styles.myMedsResearchLabel}>Key interactions</Text>
                              <Text style={styles.helperText}>{matchedMed.keyInteractions}</Text>
                            </>
                          ) : null}
                          {matchedMed.commonSideEffects ? (
                            <>
                              <Text style={styles.myMedsResearchLabel}>Common side effects</Text>
                              <Text style={styles.helperText}>{matchedMed.commonSideEffects}</Text>
                            </>
                          ) : null}
                        </>
                      ) : (
                        <Text style={styles.helperText}>
                          Not matched to this app&apos;s researched medication list; entered manually.
                        </Text>
                      )}
                  {treatment.treatmentType !== 'supplement' ? (
                    // A11: the manufacturer's label from openFDA, word for word,
                    // on its own screen. Supplements carry no FDA drug label.
                    <TouchableOpacity
                      onPress={() =>
                        router.push({ pathname: '/medicine-label', params: { treatmentId: treatment.id, treatmentName: treatment.name } })
                      }
                    >
                      <Text style={styles.actionTextPrimary}>
                        {labelIds.has(treatment.id) ? 'Read its kept label' : 'Find its label (openFDA)'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {treatment.treatmentType !== 'supplement' ? (
                    <TaperPanel
                      treatmentId={treatment.id}
                      steps={taperSteps}
                      defaultUnit={treatment.doseUnit}
                      afterDose={ownDose}
                      today={todayDateString()}
                      tabColor={tabColor}
                      onSaved={load}
                      onProblem={showInfoAlert}
                    />
                  ) : null}
                  <InjectionPanel
                    treatmentId={treatment.id}
                    name={treatment.name}
                    genericName={treatment.genericName}
                    setting={injectionByTreatment.get(treatment.id)}
                    history={sitesByTreatment.get(treatment.id) ?? []}
                    today={todayDateString()}
                    tabColor={tabColor}
                    onSaved={load}
                    onProblem={showInfoAlert}
                  />
                  <TravelTimePanel
                    treatmentId={treatment.id}
                    mode={travelByTreatment.get(treatment.id) ?? 'local'}
                    homeZone={homeZone}
                    tabColor={tabColor}
                    onSaved={load}
                    onProblem={showInfoAlert}
                  />
                  <MedDetailsPanel
                    treatmentId={treatment.id}
                    treatmentName={treatment.name}
                    details={detailsByTreatment.get(treatment.id)}
                    reading={supplyByTreatment.get(treatment.id)}
                    tabColor={tabColor}
                    onSaved={load}
                    onProblem={showInfoAlert}
                  />
                </View>
              ) : null}
              {editingRowId === treatment.id ? renderForm(true) : null}
            </View>
          );
        })}
      </View>
      </TabBand>
    );
  }

  return (
    <View style={styles.bodyContent}>
      {infoAlertElement}
      {confirmSheetElement}
      {loading ? (
        <View style={styles.bandBox}><Text style={styles.emptyText}>Loading…</Text></View>
      ) : readFailed ? (
        <ReadProblem message="Your medicines and supplements could not be read just now. Nothing you recorded is lost." onTryAgain={load} />
      ) : (
        <>
          {renderBottlesToAnswer()}
          {justSaved && addMode === null ? (
            <View style={styles.formCard}>
              <Text style={styles.label}>{t('How many {name} do you have right now?', { name: justSaved.name })}</Text>
              <Text style={styles.fieldHint}>
                Saved. Count them once and the app keeps track as you mark doses taken, and tells you before they run low.
              </Text>
              <SupplyCountForm
                treatmentId={justSaved.id}
                name={justSaved.name}
                details={detailsByTreatment.get(justSaved.id)}
                reading={supplyByTreatment.get(justSaved.id)}
                defaultUnit={justSaved.unit}
                doseCalled={justSaved.unit}
                tabColor={tabColor}
                cancelLabel="Not now"
                onDone={() => void finishJustSaved(justSaved)}
                onProblem={showInfoAlert}
              />
            </View>
          ) : addMode === null ? (
            <View style={styles.myMedsAddRow}>
              <TouchableOpacity ref={walkMark.ref('myMeds.add')} style={[styles.addButton, walkMark('myMeds.add')]} onPress={() => openAddMed('prescription')}>
                <Text style={styles.addButtonText}>+ Prescription</Text>
              </TouchableOpacity>
              <TouchableOpacity ref={walkMark.ref('myMeds.otc')} style={[styles.addButton, walkMark('myMeds.otc')]} onPress={() => openAddMed('otc')}>
                <Text style={styles.addButtonText}>+ OTC drug</Text>
              </TouchableOpacity>
              <TouchableOpacity ref={walkMark.ref('myMeds.supplement')} style={[styles.addButton, walkMark('myMeds.supplement')]} onPress={openAddSupplement}>
                <Text style={styles.addButtonText}>+ Supplement</Text>
              </TouchableOpacity>
              <TouchableOpacity ref={walkMark.ref('myMeds.label')} style={[styles.addButton, walkMark('myMeds.label')]} onPress={() => router.push('/medicine-label')}>
                <Text style={styles.addButtonText}>Look up a label</Text>
              </TouchableOpacity>
            </View>
          ) : editingRowId ? null : (
            renderForm(false)
          )}

          {interactionWarnings.length > 0 ? (
            <TabBand
              folds={folds}
              color={tabColor}
              id="life:myMeds:things-to-check"
              title="Things to check"
              icon="alert-circle-outline"
              count={interactionWarnings.length}
            >
            <View style={styles.table}>
              {interactionWarnings.map((warning, index) => (
                <View key={`${warning.ruleId}_${index}`} style={styles.interactionCard}>
                  <RuleSeverityTag severity={warning.severity} onPress={showInfoAlert} />
                  <Text style={styles.interactionTitle}>{warning.title}</Text>
                  <Text style={styles.interactionMessage}>{warning.message}</Text>
                  <Text style={styles.interactionCitation}>{warning.citation}</Text>
                  <WhyExplainer title={warning.title} mechanism={warning.mechanism} onPress={showInfoAlert} />
                  <RuleLabelQuote ruleId={warning.ruleId} />
                </View>
              ))}
            </View>
            </TabBand>
          ) : null}

          {referenceOnlyRules.length > 0 ? (
            <TabBand
              folds={folds}
              color={tabColor}
              id="life:myMeds:worth-knowing"
              title="Worth knowing (reference only, not personalized)"
              icon="information-circle-outline"
              count={referenceOnlyRules.length}
            >
            <View style={styles.table}>
              {referenceOnlyRules.map((rule) => (
                <View key={rule.ruleId} style={[styles.interactionCard, styles.interactionCardReference]}>
                  <RuleSeverityTag severity={rule.severity} onPress={showInfoAlert} />
                  <Text style={styles.interactionTitle}>{rule.title}</Text>
                  <Text style={styles.interactionMessage}>{rule.guidance}</Text>
                  <Text style={styles.interactionCitation}>{rule.citation}</Text>
                  <WhyExplainer title={rule.title} mechanism={rule.mechanism} onPress={showInfoAlert} />
                  <RuleLabelQuote ruleId={rule.ruleId} />
                </View>
              ))}
            </View>
            </TabBand>
          ) : null}

          {treatments.some((treatment) => treatment.treatmentType !== 'supplement') ? (
            <TabBand
              folds={folds}
              color={tabColor}
              id="life:myMeds:drug-checker"
              title="Drug to drug checks"
              icon="git-compare-outline"
            >
            <View style={styles.table}>
              <Text style={styles.interactionMessage}>
                The rules in this app cover timing between meds, supplements and food, and only the pairs written
                into them. A public checker covers far more drug pairs; you type the names in there yourself, and nothing from
                this app is sent.
              </Text>
              <TouchableOpacity
                ref={walkMark.ref('myMeds.drugChecker')}
                style={[styles.secondaryButton, walkMark('myMeds.drugChecker')]}
                onPress={() => Linking.openURL('https://www.drugs.com/drug_interactions.html').catch(() => undefined)}
              >
                <Text style={styles.secondaryButtonText}>Open the Drugs.com interaction checker</Text>
              </TouchableOpacity>
              <Text style={styles.interactionCitation}>
                Your pharmacist can run the same check against everything they fill for you.
              </Text>
            </View>
            </TabBand>
          ) : null}

          <RecallsBand folds={folds} tabColor={tabColor} reloadKey={treatments.length} />

          {!medsClosed ? <DoseGroupsBand folds={folds} tabColor={tabColor} reloadKey={treatments.length} /> : null}

          {medsClosed ? (
            <VaultClosedBand color={tabColor} categories={['medications']} />
          ) : treatments.length === 0 ? (
            <View style={styles.bandBox}><Text style={styles.emptyText}>Nothing here yet. Add a prescription, OTC drug, or supplement above, then tap Schedule it to set its times in Schedules.</Text></View>
          ) : (
            <>
              {renderTreatmentGroup('Prescriptions', treatments.filter((treatment) => treatment.treatmentType === 'prescription'))}
              {renderTreatmentGroup('OTC drugs', treatments.filter((treatment) => treatment.treatmentType === 'otc'))}
              {renderTreatmentGroup('Supplements', treatments.filter((treatment) => treatment.treatmentType === 'supplement'))}
            </>
          )}
        </>
      )}
      <PartnerBesideBand kind="meds" tabColor={tabColor} />
    </View>
  );
}

// 1.0.61.7: calm is true on a calm screen (Life), which drops the
// hairlines and closes the gaps to a left-accent width.
function makeStyles(tabColor: string, calm: boolean = false) {
  const bandGap = calm ? HOME_BAND_ACCENT_WIDTH : HOME_BAND_GAP;
  const edges = calm ? homeBandNoHairlines : null;
  return StyleSheet.create({
    actionText: { ...typography.captionEmphasis, color: tabColor, ...textShadow },
    actionTextPrimary: { ...typography.captionEmphasis, color: colors.primary, ...textShadow },
    actionTextRemove: { ...typography.captionEmphasis, color: colors.danger, ...textShadow },
    addButton: { ...BUTTON_PRIMARY, flexGrow: 1 },
    addButtonText: { ...BUTTON_PRIMARY_TEXT },
    bandBox: {
      ...homeBandStyle,
      ...edges,
      borderColor: tabColor,
      padding: HOME_BAND_CONTENT_PADDING,
    },
    bodyContent: { paddingTop: 5, gap: bandGap },
    doseUnitInput: { flex: 1 },
    emptyText: { ...typography.body, color: colors.textSecondary, ...textShadow },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
    formCard: {
      ...homeBandStyle,
      ...edges,
      borderColor: tabColor,
      padding: HOME_BAND_CONTENT_PADDING,
    },
    // Under the row being edited, inside that row.
    formInline: { marginTop: 10 },
    helperText: { ...typography.caption, color: tabColor, marginTop: 4, marginBottom: 8, ...textShadow },
    // What a field is asking for, under its label (Tony, 2026-11-18).
    fieldHint: { ...typography.caption, color: colors.textSecondary, marginBottom: 6, ...textShadow },
    ingredientAmountInput: { flex: 1, minWidth: 64 },
    ingredientFormRow: { marginBottom: 4 },
    ingredientNutrientCol: { flex: 2 },
    ingredientRemove: { paddingHorizontal: 6, paddingVertical: 6 },
    ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    ingredientUnitCol: { minWidth: 76 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surfaceMuted,
      ...typography.body,
      color: tabColor,
      ...textShadow,
    },
    interactionCard: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      padding: 12,
    },
    interactionCardReference: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
    interactionCitation: { ...typography.caption, color: tabColor, marginTop: 6, ...textShadow },
    interactionMessage: { ...typography.body, color: tabColor, marginTop: 4, ...textShadow },
    interactionTitle: { ...typography.bodyEmphasis, color: tabColor, ...textShadow },
    label: { ...typography.label, color: tabColor, marginBottom: 6, marginTop: 10, ...textShadow },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    myMedsAddRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    kindSwitchRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
    myMedsDetail: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    myMedsGroup: { gap: bandGap },
    myMedsResearchCard: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: tabColor,
      padding: 12,
    },
    myMedsResearchLabel: { ...typography.captionEmphasis, color: tabColor, marginTop: 4, ...textShadow },
    primaryButton: { ...BUTTON_PRIMARY },
    primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
    row: {
      borderRadius: 10,
      backgroundColor: colors.surfaceMuted,
      padding: 12,
    },
    rowMeta: { ...typography.caption, color: tabColor, marginTop: 2, ...textShadow },
    rowTextCol: { flex: 1 },
    rowTitle: { ...typography.label, color: tabColor, ...textShadow },
    secondaryButton: { ...BUTTON_SECONDARY },
    labelPhotoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    labelPhotoButton: { flexGrow: 1 },
    busy: { opacity: 0.5 },
    secondaryButtonText: { ...BUTTON_SECONDARY_TEXT },
    supplementRowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10 },
    trackingRow: { marginTop: 10 },
    table: { gap: bandGap },
    timeInput: { width: 56, textAlign: 'center' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    timeSeparator: { ...typography.label, color: tabColor, ...textShadow },
  });
}

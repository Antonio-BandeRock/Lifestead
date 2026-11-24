// The For You card: one phrase for a food against what the person set
// (allergies, eating style, food restrictions and every tracked condition),
// with the reasons behind Why, and a "For" picker when there is a family.
//
// It sat inside FoodLookup until Tony asked for it in every builder too
// (2026-11-24: "they need the specific For You card for their specific
// conditions"). A builder leaves FoodLookup the moment a food resolves, so
// it shows this on the step where the amount is set, before the food joins
// the dish.
//
// A scanned product is not in the food database and has no scores, and no
// score would read as Clean for every condition. It is checked by its
// ingredient list instead, and says so when it has none.
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { getScannedProduct } from '../lib/db';
import { routeForDigestEntry } from '../lib/digestNavigation';
import { useTier } from '../lib/entitlement';
import type { FoodOneWord } from '../lib/foodOneWord';
import {
  evaluateFoodForPerson,
  getHouseholdPeople,
  type PersonalFoodEvaluation,
  type PersonalizationProfile,
} from '../lib/foodPersonalization';
import { describeRestrictionHit } from '../lib/foodRestrictions';
import {
  HOUSEHOLD_FIT_CAPTION,
  labelFitFor,
  labelSettingsFor,
  oneWordFor,
  possessiveFor,
  whoFor,
  YOU_ID,
  type HouseholdPerson,
} from '../lib/householdFit';
import { t } from '../lib/i18n';
import { checkIngredients, type CheckedIngredient } from '../lib/ingredientFlags';
import { isLactoseEntry } from '../lib/lactose';
import { isFunctionWalled, paidFunctionLine } from '../lib/paidFeatures';
import { flagConditionConcernsForConditions } from '../lib/scannedProductFlags';
import { householdToneColor } from './HouseholdFitBand';
import { PopoverSelect } from './PopoverSelect';
import { verdictFor } from './RecipeDepthReport';
import { useWalkMark } from './WalkMark';

type LabelReading = { line: FoodOneWord; rows: CheckedIngredient[]; hasList: boolean };
type CardEvaluation = PersonalFoodEvaluation & { label?: LabelReading };

// Nothing scored: everything a scanned product says comes from `label`.
const UNSCORED: PersonalFoodEvaluation = {
  restrictionHits: [],
  safeForConditions: [],
  conditionCautions: {},
  dimensionBreakdown: {},
  dietTags: [],
  dietViolations: [],
  allergyMatch: null,
};

const conditionFlags = (codes: string[]) => (text: string) => flagConditionConcernsForConditions(text, codes);

function holdsAnything({ profile }: HouseholdPerson): boolean {
  return (
    profile.trackedConditions.length > 0 ||
    profile.dietPreferences.length > 0 ||
    profile.foodAllergies.length > 0 ||
    profile.foodRestrictions.length > 0
  );
}

function readLabel(person: HouseholdPerson, walled: boolean, name: string, ingredientsText: string | null): CardEvaluation {
  const checked = walled ? { ...person, profile: { ...person.profile, trackedConditions: [] } } : person;
  const owner = possessiveFor(person);
  const list = ingredientsText?.trim() ?? '';
  const read = list || name;
  const rows = checkIngredients(read, labelSettingsFor(checked, conditionFlags))
    .map((row) => ({ ...row, reasons: row.reasons.filter((reason) => reason.tone === 'yours') }))
    .filter((row) => row.reasons.length > 0);
  let line: FoodOneWord = labelFitFor(checked, read, conditionFlags);
  if (rows.length === 0 && holdsAnything(person)) {
    line = list
      ? { phrase: `Nothing on ${owner} lists`, tone: 'fits' }
      : { phrase: t('No ingredient list to check'), tone: 'caution' };
  }
  return { ...UNSCORED, label: { line, rows, hasList: !!list } };
}

export function ForYouCard({
  tabColor,
  foodId,
  source,
  category,
  baseName,
  profile,
  inBuilder,
}: {
  tabColor: string;
  foodId: number;
  source: string;
  category: string;
  baseName: string;
  // A caller already holding the person's profile passes it; otherwise the
  // card reads it itself.
  profile?: PersonalizationProfile;
  inBuilder?: boolean;
}) {
  const walkMark = useWalkMark();
  const router = useRouter();
  // P27: on Free the card checks allergies, diet and food avoided (safety
  // stays Free) and says the condition reading is part of Individual.
  const tier = useTier();
  const forYouWalled = isFunctionWalled(tier, 'forYou');
  const [householdPeople, setHouseholdPeople] = useState<HouseholdPerson[] | null>(null);
  // G20: one evaluation per person in the household, keyed by person id,
  // and the "for whom" switch choosing which of them the card speaks for.
  const [personalEvaluations, setPersonalEvaluations] = useState<Record<string, CardEvaluation> | null>(null);
  const [failed, setFailed] = useState(false);
  const [forWhom, setForWhom] = useState<string>(YOU_ID);
  // G15: the card leads with one phrase; the rows behind it open on a tap
  // and close again whenever the food changes.
  const [personalDetailOpen, setPersonalDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHouseholdPeople(profile)
      .then((result) => {
        if (!cancelled) setHouseholdPeople(result);
      })
      .catch((error) => {
        console.error('[ForYouCard] Failed to load the household', error);
        if (!cancelled && !profile) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const people = useMemo<HouseholdPerson[]>(
    () => householdPeople ?? (profile ? [{ id: YOU_ID, name: 'You', isYou: true, profile }] : []),
    [householdPeople, profile],
  );
  const everyone = forWhom === 'everyone' && people.length > 1;
  const activePerson = everyone ? null : (people.find((person) => person.id === forWhom) ?? people[0] ?? null);
  const personalEvaluation = activePerson ? (personalEvaluations?.[activePerson.id] ?? null) : null;

  useEffect(() => {
    if (people.length === 0) return;
    let cancelled = false;
    setPersonalDetailOpen(false);
    setPersonalEvaluations(null);
    setFailed(false);
    const read = async (): Promise<CardEvaluation[]> => {
      if (source === 'Scanned') {
        const product = await getScannedProduct(foodId);
        return people.map((person) => readLabel(person, forYouWalled, baseName, product?.ingredientsText ?? null));
      }
      return Promise.all(people.map((person) => evaluateFoodForPerson({ foodId, source, category, baseName }, person.profile)));
    };
    read()
      .then((results) => {
        if (!cancelled) setPersonalEvaluations(Object.fromEntries(people.map((person, index) => [person.id, results[index]])));
      })
      .catch((error) => {
        console.error('[ForYouCard] Failed to check the food against the household', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [people, foodId, source, category, baseName, forYouWalled]);

  if (failed || !personalEvaluations || (!everyone && !personalEvaluation)) {
    return (
      <View style={[styles.personalCard, { borderColor: tabColor }]}>
        <Text style={styles.personalCautionNote}>
          {failed
            ? 'This food could not be checked against your profile.'
            : people.length > 1
              ? 'Checking against everyone in the household…'
              : 'Checking against your profile…'}
        </Text>
      </View>
    );
  }
  const show =
    people.length > 1 ||
    (activePerson &&
      personalEvaluation &&
      (personalEvaluation.allergyMatch ||
        personalEvaluation.dietViolations.length > 0 ||
        personalEvaluation.restrictionHits.length > 0 ||
        (personalEvaluation.label && holdsAnything(activePerson)) ||
        activePerson.profile.trackedConditions.length > 0));
  if (!show) return null;

  return (
    <View style={[styles.personalCard, { borderColor: tabColor }]}>
      {people.length > 1 ? (
        <View style={styles.personalSummaryRow}>
          <Text style={[styles.personalCardLabel, { color: tabColor }]}>For</Text>
          <PopoverSelect
            options={[
              ...people.map((person) => ({ label: whoFor(person), value: person.id })),
              { label: 'Everyone', value: 'everyone' },
            ]}
            selected={everyone ? 'everyone' : (activePerson?.id ?? YOU_ID)}
            onSelect={(value) => {
              setForWhom(value);
              setPersonalDetailOpen(false);
            }}
            tabColor={tabColor}
          />
        </View>
      ) : null}
      {everyone ? (
        <>
          {people.map((person) => {
            const evaluation = personalEvaluations[person.id];
            if (!evaluation) return null;
            const line = evaluation.label?.line ?? oneWordFor(
              person,
              {
                trackedConditions: forYouWalled ? [] : person.profile.trackedConditions,
                safeForConditions: evaluation.safeForConditions,
                conditionCautions: evaluation.conditionCautions,
                dietViolations: evaluation.dietViolations,
                allergyMatch: evaluation.allergyMatch,
                restrictionHits: evaluation.restrictionHits,
              },
              { conditions: true, diet: true },
            );
            return (
              <TouchableOpacity
                key={person.id}
                style={styles.personalSummaryRow}
                onPress={() => setForWhom(person.id)}
                accessibilityRole="button"
                accessibilityLabel={`${whoFor(person)}: ${line.phrase}. Open ${possessiveFor(person)} reasons.`}
              >
                <Text style={[styles.personalCardLabel, { color: tabColor }]}>{whoFor(person)}</Text>
                <View style={[styles.personalVerdictPill, { backgroundColor: householdToneColor(line.tone) }]}>
                  <Text style={styles.personalVerdictPillText}>{line.phrase}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <Text style={styles.personalCautionNote}>{HOUSEHOLD_FIT_CAPTION} Tap a name for the reasons.</Text>
          {forYouWalled ? <Text style={styles.personalCautionNote}>{paidFunctionLine('forYou')}</Text> : null}
        </>
      ) : personalEvaluation && activePerson ? (
        <>
        {(() => {
          const oneWord = personalEvaluation.label?.line ?? oneWordFor(
            activePerson,
            {
              trackedConditions: forYouWalled ? [] : activePerson.profile.trackedConditions,
              safeForConditions: personalEvaluation.safeForConditions,
              conditionCautions: personalEvaluation.conditionCautions,
              dietViolations: personalEvaluation.dietViolations,
              allergyMatch: personalEvaluation.allergyMatch,
              restrictionHits: personalEvaluation.restrictionHits,
            },
            { conditions: true, diet: true },
          );
          const forLabel = activePerson.isYou ? 'For You' : `For ${activePerson.name}`;
          return (
            <TouchableOpacity
              ref={inBuilder ? walkMark.ref('builder.forYou') : walkMark.ref('lookup.why')}
              style={styles.personalSummaryRow}
              onPress={() => setPersonalDetailOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel={`${forLabel}: ${oneWord.phrase}. ${personalDetailOpen ? 'Hide' : 'Show'} the reasons.`}
            >
              {people.length > 1 ? null : <Text style={[styles.personalCardLabel, { color: tabColor }]}>{forLabel}</Text>}
              <View style={[styles.personalVerdictPill, { backgroundColor: householdToneColor(oneWord.tone) }]}>
                <Text style={styles.personalVerdictPillText}>{oneWord.phrase}</Text>
              </View>
              <Text style={[styles.personalDetailToggle, { color: tabColor }]}>{personalDetailOpen ? 'Hide why' : 'Why'}</Text>
            </TouchableOpacity>
          );
        })()}
        {(personalDetailOpen ? (personalEvaluation.label?.rows ?? []) : []).map((row, index) =>
          row.reasons.map((reason) => (
            <View
              key={`label-${index}-${reason.kind}-${reason.label}`}
              style={[styles.personalWarningRow, { backgroundColor: reason.kind === 'allergy' ? colors.statusRedBg : colors.statusYellowBg }]}
            >
              <Text style={[styles.personalWarningText, { color: reason.kind === 'allergy' ? colors.danger : colors.statusYellowStandalone }]}>
                {row.name}: {reason.why}
              </Text>
            </View>
          )),
        )}
        {personalEvaluation.label && (personalDetailOpen || !personalEvaluation.label.hasList) ? (
          <Text style={styles.personalCautionNote}>
            {personalEvaluation.label.hasList
              ? 'Read from the ingredient list on the package. A word can be missed, so the package is the last word.'
              : 'This product was saved without an ingredient list, so only its name could be checked. Read the package.'}
          </Text>
        ) : null}
        {personalDetailOpen && personalEvaluation.allergyMatch ? (
          <View style={[styles.personalWarningRow, { backgroundColor: colors.statusRedBg }]}>
            <Text style={[styles.personalWarningText, { color: colors.danger }]}>
              {isLactoseEntry(personalEvaluation.allergyMatch)
                ? t('Carries lactose, and lactose intolerance is on {owner} food allergy list.', {
                    owner: possessiveFor(activePerson),
                  })
                : t('Contains {name}, which is on {owner} food allergy list.', {
                    name: personalEvaluation.allergyMatch,
                    owner: possessiveFor(activePerson),
                  })}
            </Text>
          </View>
        ) : null}
        {personalDetailOpen && personalEvaluation.dietViolations.length > 0 ? (
          <View style={[styles.personalWarningRow, { backgroundColor: colors.statusYellowBg }]}>
            <Text style={[styles.personalWarningText, { color: colors.statusYellowStandalone }]}>
              Doesn&apos;t fit {possessiveFor(activePerson)} declared {personalEvaluation.dietViolations.join(', ')} preference
              {personalEvaluation.dietViolations.length === 1 ? '' : 's'}.
            </Text>
          </View>
        ) : null}
        {(personalDetailOpen ? personalEvaluation.restrictionHits : []).map((hit) => {
          const stop = hit.weight === 'allergy' && hit.strength !== 'maybe';
          return (
            <TouchableOpacity
              key={`restriction-${hit.key}`}
              style={[styles.personalWarningRow, { backgroundColor: stop ? colors.statusRedBg : colors.statusYellowBg }]}
              disabled={!hit.readingId}
              onPress={() => (hit.readingId ? router.push(routeForDigestEntry(hit.readingId)) : undefined)}
              accessibilityRole={hit.readingId ? 'button' : 'text'}
            >
              <Text style={[styles.personalWarningText, { color: stop ? colors.danger : colors.statusYellowStandalone }]}>
                {describeRestrictionHit(hit)}. {hit.why}
                {hit.readingId ? ` ${t('Tap to read more.')}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
        {personalDetailOpen && forYouWalled && activePerson.profile.trackedConditions.length > 0 ? (
          <Text style={styles.personalCautionNote}>{paidFunctionLine('forYou')}</Text>
        ) : null}
        {(personalDetailOpen && !forYouWalled && !personalEvaluation.label ? activePerson.profile.trackedConditions : []).map((condition) => {
          const verdict = verdictFor(condition.code, personalEvaluation.safeForConditions, personalEvaluation.conditionCautions);
          const caution = personalEvaluation.conditionCautions[condition.code];
          return (
            <View key={condition.code} style={styles.personalConditionRow}>
              <Text style={styles.personalConditionName}>
                {condition.name}
              </Text>
              <View style={[styles.personalVerdictPill, { backgroundColor: verdict.color }]}>
                <Text style={styles.personalVerdictPillText}>{verdict.label}</Text>
              </View>
              {caution ? <Text style={styles.personalCautionNote}>{caution.note}</Text> : null}
            </View>
          );
        })}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  personalCard: {
    borderWidth: 2,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
    gap: 6,
  },
  personalCardLabel: {
    ...typography.captionEmphasis,

    ...textShadow,

  },
  personalSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  personalDetailToggle: {
    ...typography.captionEmphasis,
    marginLeft: 'auto',

    ...textShadow,

  },
  personalWarningRow: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  personalWarningText: {
    ...typography.caption,

    ...textShadow,

  },
  personalConditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  personalConditionName: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,

    ...textShadow,

  },
  personalVerdictPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  personalVerdictPillText: {
    ...typography.captionEmphasis,
    color: colors.textOnPrimary,
    fontSize: 11,

    // Dark text: cancel any shadow inherited from a base style it is

    // composed with. See constants/typography.ts.

    textShadowColor: 'transparent',

    textShadowRadius: 0,

  },
  // The caution's own real note (e.g. "Whole-Grain Wheat Flour: rated High
  // Risk for gluten...") takes the full row width below the name/pill --
  // same pattern RecipeDepthReport.tsx already uses for the same content.
  personalCautionNote: {
    ...typography.caption,
    color: colors.textSecondary,
    flexBasis: '100%',

    ...textShadow,

  },
});

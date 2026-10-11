// Several ingredients said at once, for the Food builders (voice step 4,
// 1.0.66.22). Asked for directly: building a meal "should also be voice
// controlled so a person who has real problems with their hands due to
// arthritis" can do it.
//
// The splitting and the amounts are Say What You Ate's (lib/quickLog.ts), and
// the search is the same ladder app/voice-log.tsx walks, held to the
// builder's categories. Two things are never guessed. The preparation is
// taken only where the Food Lookup itself would take it (Raw when Raw is
// offered, or the only one there is), and otherwise the person picks it. A
// unit the builder does not offer leaves the amount for the person too, so
// "2 kg" never turns into 2 of something else. Cut and cooking method stay
// on the builder's pending card, asked one food at a time.
import type { ResolvedFoodSelection } from '../components/FoodLookup';
import {
  getPreparationMethods,
  resolveFoodChoice,
  searchReferenceFoodNamesAcrossCategories,
  type GlobalFoodMatch,
} from './db';
import { buildFoodSearchLadder, parseSpokenItem, scoreNameMatch, splitSpokenItems } from './quickLog';

export type SpokenIngredientRow = {
  key: string;
  spokenText: string;
  foodText: string;
  quantity: number;
  /** Builder unit name: 'each' is read as 'piece', the builders' word. */
  unit: string;
  candidates: GlobalFoodMatch[];
  candidateIndex: number;
  /** Preparations for the current candidate, empty when it has none. */
  preps: string[];
  prep: string | null;
};

/** One food ready for a builder's pending card. */
export type SpokenIngredient = {
  resolved: ResolvedFoodSelection;
  quantity: number;
  unit: string;
  spokenText: string;
};

const CANDIDATE_LIMIT = 8;

function builderUnit(spokenUnit: string): string {
  return spokenUnit === 'each' ? 'piece' : spokenUnit;
}

/** The preparation the Food Lookup would take by itself, or null to ask. */
export function defaultPrep(preps: string[]): string | null {
  if (preps.includes('Raw')) return 'Raw';
  return preps.length === 1 ? preps[0] : null;
}

async function prepsFor(match: GlobalFoodMatch | undefined): Promise<string[]> {
  if (!match) return [];
  return getPreparationMethods(match.category, match.subcategory, match.baseName);
}

/** Reads what was said into rows, each matched against the builder's foods. */
export async function findSpokenIngredients(
  transcript: string,
  allowedCategories: string[] | undefined,
): Promise<SpokenIngredientRow[]> {
  const items = splitSpokenItems(transcript).map(parseSpokenItem);
  return Promise.all(
    items.map(async (item, index) => {
      let matches: GlobalFoodMatch[] = [];
      if (item.foodText) {
        for (const query of buildFoodSearchLadder(item.foodText)) {
          matches = await searchReferenceFoodNamesAcrossCategories(
            query,
            allowedCategories,
            CANDIDATE_LIMIT,
          );
          if (matches.length > 0) break;
        }
      }
      const candidates = matches
        .map((match) => ({ match, score: scoreNameMatch(item.foodText, match.baseName) }))
        .sort((a, b) => b.score - a.score)
        .map((scored) => scored.match);
      const preps = await prepsFor(candidates[0]);
      return {
        key: `${index}-${item.spokenText}`,
        spokenText: item.spokenText,
        foodText: item.foodText,
        quantity: item.quantity,
        unit: builderUnit(item.unit),
        candidates,
        candidateIndex: 0,
        preps,
        prep: defaultPrep(preps),
      };
    }),
  );
}

/** The next candidate for a row, with its preparations read again. */
export async function nextCandidate(row: SpokenIngredientRow): Promise<SpokenIngredientRow> {
  if (row.candidates.length < 2) return row;
  const candidateIndex = (row.candidateIndex + 1) % row.candidates.length;
  const preps = await prepsFor(row.candidates[candidateIndex]);
  return { ...row, candidateIndex, preps, prep: defaultPrep(preps) };
}

/** Resolves a matched row to the one food row a builder records, or null. */
export async function resolveSpokenRow(row: SpokenIngredientRow): Promise<SpokenIngredient | null> {
  const match = row.candidates[row.candidateIndex];
  if (!match) return null;
  if (row.preps.length > 0 && !row.prep) return null;
  const option = await resolveFoodChoice(match.category, match.subcategory, match.baseName, row.preps.length > 0 ? row.prep : null);
  if (!option) return null;
  return {
    resolved: {
      category: match.category,
      subcategory: match.subcategory,
      baseName: match.baseName,
      prepMethod: row.preps.length > 0 ? row.prep : null,
      foodId: option.foodId,
      source: option.source,
    },
    quantity: row.quantity,
    unit: row.unit,
    spokenText: row.spokenText,
  };
}

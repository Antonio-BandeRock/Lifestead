// A personal rule waiting to be started from a sentence on an FDA label
// (A11c of the competitive build plan). The label screen leaves it here and
// opens Insights > My Meds, whose rule builder takes it once, on focus, and
// opens with the sentence filled in word for word, the label named and the
// med it was opened from chosen. Nothing is saved until the person saves it;
// a draft never taken is simply dropped by the next one.
//
// Read only from an effect or a focus callback, never during render: the
// React Compiler would freeze a plain read of module state (see
// reference_react_compiler_module_state).

export type LabelRuleDraft = {
  sentence: string;
  setId: string;
  version: string;
  /** The label version's effective date, YYYY-MM-DD, when the label gives one. */
  date: string | null;
  /** The label's name as the label screen shows it. */
  labelName: string;
  /** The med the label was opened from, when it was opened from one. */
  treatmentId: string | null;
  treatmentName: string | null;
};

let pending: LabelRuleDraft | null = null;

export function leaveLabelRuleDraft(draft: LabelRuleDraft): void {
  pending = draft;
}

/** The waiting draft, handed over once. */
export function takeLabelRuleDraft(): LabelRuleDraft | null {
  const draft = pending;
  pending = null;
  return draft;
}

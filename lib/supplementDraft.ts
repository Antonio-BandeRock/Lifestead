// A supplement waiting to be started from a bottle looked up on the
// medicine label screen (2026-11-18). The screen leaves it here and opens
// Life > My Meds, which takes it once, on focus, and opens the add form
// with the name and the label text filled in and the ingredients read from
// it. Nothing is saved until the person saves; the bottle's code is then
// kept with the new supplement so a later scan names it.
//
// Read only from an effect or a focus callback, never during render: the
// React Compiler would freeze a plain read of module state (see
// reference_react_compiler_module_state).

export type SupplementDraft = {
  name: string;
  labelText: string;
  /** The code as codeKey in lib/medicineLabel.ts spells it, or null. */
  code: string | null;
};

let pending: SupplementDraft | null = null;

export function leaveSupplementDraft(draft: SupplementDraft): void {
  pending = draft;
}

/** The waiting draft, handed over once. */
export function takeSupplementDraft(): SupplementDraft | null {
  const draft = pending;
  pending = null;
  return draft;
}

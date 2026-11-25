// What a screen reader says about a button (2026-11-24, build plan Q10 and
// Q35). Every button in the app reaches components/voiceNamedControl.js, and
// this works out, from the props and the children already there, that it is
// a button, whether it is open or closed, ticked or not, and chosen or not.
// A prop the screen gave itself always wins.
//
// Imports nothing, so the Metro swap can load it and a node test can run it.

export type SpokenState = { expanded?: boolean; checked?: boolean; selected?: boolean };
export type SpokenControl = { role: 'button' | 'checkbox' | 'radio'; state: SpokenState };

type AnyProps = Record<string, unknown>;

/** The state an icon's picture stands for, and the role that goes with it. */
const ICON_STATES: Record<string, { role?: 'checkbox' | 'radio'; state: SpokenState; needsWords?: boolean }> = {
  'chevron-up': { state: { expanded: true }, needsWords: true },
  'chevron-down': { state: { expanded: false }, needsWords: true },
  'chevron-up-outline': { state: { expanded: true }, needsWords: true },
  'chevron-down-outline': { state: { expanded: false }, needsWords: true },
  checkbox: { role: 'checkbox', state: { checked: true } },
  'checkbox-outline': { role: 'checkbox', state: { checked: true } },
  'square-outline': { role: 'checkbox', state: { checked: false } },
  'radio-button-on': { role: 'radio', state: { checked: true } },
  'radio-button-off': { role: 'radio', state: { checked: false } },
};

function hasWords(children: unknown, depth = 0): boolean {
  if (depth > 8 || children === null || children === undefined || typeof children === 'boolean') return false;
  if (typeof children === 'string') return children.trim().length > 0;
  if (typeof children === 'number') return true;
  if (Array.isArray(children)) return children.some((child) => hasWords(child, depth + 1));
  if (typeof children === 'object' && 'props' in (children as object)) {
    return hasWords((children as { props?: AnyProps }).props?.children, depth + 1);
  }
  return false;
}

/** The first icon among the children that stands for a state. A button inside this one keeps its icon to itself. */
function iconName(children: unknown, depth = 0): string | null {
  if (depth > 6 || !children || typeof children !== 'object') return null;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = iconName(child, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const props = (children as { props?: AnyProps }).props;
  if (!props || typeof props.onPress === 'function') return null;
  if (typeof props.name === 'string' && Object.prototype.hasOwnProperty.call(ICON_STATES, props.name)) return props.name;
  return iconName(props.children, depth + 1);
}

/** Whether a style, with its arrays laid over each other, is the chosen pill (PILL_ON over PILL). */
export function isChosenPill(style: unknown, buttonColor: string): boolean {
  let radius: unknown;
  let fill: unknown;
  const read = (part: unknown, depth: number) => {
    if (!part || typeof part !== 'object' || depth > 6) return;
    if (Array.isArray(part)) {
      for (const each of part) read(each, depth + 1);
      return;
    }
    const s = part as { borderRadius?: unknown; backgroundColor?: unknown };
    if (s.borderRadius !== undefined) radius = s.borderRadius;
    if (s.backgroundColor !== undefined) fill = s.backgroundColor;
  };
  read(style, 0);
  return radius === 999 && fill === buttonColor;
}

/** Whether the props belong to something a person presses and a screen reader should be told about. */
export function isSpokenButton(props: AnyProps): boolean {
  return typeof props.onPress === 'function' && props.accessible !== false;
}

/** Whether the screen already said what kind of control this is. */
export function hasRole(props: AnyProps): boolean {
  return props.accessibilityRole !== undefined || props.role !== undefined;
}

export function spokenControl(props: AnyProps, buttonColor: string): SpokenControl {
  const icon = iconName(props.children);
  const known = icon ? ICON_STATES[icon] : null;
  const state: SpokenState = {};
  let role: SpokenControl['role'] = 'button';
  if (known && (!known.needsWords || hasWords(props.children))) {
    Object.assign(state, known.state);
    if (known.role) role = known.role;
  }
  if (isChosenPill(props.style, buttonColor)) state.selected = true;
  // A state the screen gave stays as it gave it.
  const given = props.accessibilityState as SpokenState | undefined;
  if (given && (given.checked !== undefined || given.selected !== undefined || given.expanded !== undefined)) return { role, state: {} };
  for (const key of ['expanded', 'checked', 'selected'] as const) {
    if (props[`aria-${key}`] !== undefined) delete state[key];
  }
  return { role, state };
}

// The one button look in this app (2026-10-28). Direct report, on Life > My
// Meds: "I don't know what style these are following because I don't think
// any buttons are supposed to look like that. Please check that the app has
// a defined button style and apply it here. If there is no defined button
// style, we need to define one and go with it throughout the app."
//
// Half of it was defined already: the colour (colors.buttonColor, the
// ground's own button colour, with colors.textOnButton on it) and the depth
// (BUTTON_SHADOW), both from 2026-08-24. The shape never was, so every
// screen typed its own and there were 30 shapes of primaryButton alone.
// This file is the shape, and the colour and depth with it.
//
// Two kinds, each in two sizes:
//   - PRIMARY, the thing the band is for (Save, Add, + Prescription): the
//     ground's button colour, dark text, the shared shadow.
//   - SECONDARY, the other choice beside it (Cancel, Not now, Edit): the
//     surface, a hairline border, light text.
//   - COMPACT is the same look a size down, for a button sitting inside a
//     row of a list or beside a field.
//
// A style spreads one of these and adds only where it sits (margins,
// alignSelf, flex, width, a row with an icon). It never retypes a fill, a
// border, a radius or the padding, and a call site never overrides them
// inline. scripts/audit_button_style.js checks both and must stay at 0.
import { BUTTON_SHADOW, colors } from './colors';
import { textShadow, typography } from './typography';

export const BUTTON_RADIUS = 10;

const shape = {
  borderRadius: BUTTON_RADIUS,
  paddingVertical: 12,
  paddingHorizontal: 18,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const compactShape = {
  ...shape,
  paddingVertical: 8,
  paddingHorizontal: 14,
} as const;

export const BUTTON_PRIMARY = {
  ...shape,
  backgroundColor: colors.buttonColor,
  ...BUTTON_SHADOW,
} as const;

export const BUTTON_PRIMARY_COMPACT = {
  ...compactShape,
  backgroundColor: colors.buttonColor,
  ...BUTTON_SHADOW,
} as const;

export const BUTTON_SECONDARY = {
  ...shape,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
} as const;

export const BUTTON_SECONDARY_COMPACT = {
  ...compactShape,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
} as const;

// Dark text on the button colour, so no shadow (the standing rule: shadow on
// all text except dark text).
export const BUTTON_PRIMARY_TEXT = {
  ...typography.bodyEmphasis,
  color: colors.textOnButton,
  textShadowColor: 'transparent',
  textShadowRadius: 0,
  textAlign: 'center',
} as const;

export const BUTTON_SECONDARY_TEXT = {
  ...typography.bodyEmphasis,
  color: colors.textPrimary,
  ...textShadow,
} as const;

// The one pill look (2026-10-28). Direct instruction: "Just like the buttons,
// we need to have a default pill button type, and it should match the
// default buttons." A pill is a choice among a few (a day, a kind, a range):
// round ends, and the two button looks for its two states.
//   - PILL, not chosen: the surface and the hairline border of SECONDARY.
//   - PILL_ON, chosen, laid over PILL: the button colour and shadow of
//     PRIMARY, with PILL_ON_TEXT's dark text on it.
//   - PILL_SMALL is the same a size down, for a row of many short choices.
// A pill's colour no longer follows the tab it sits on; a pill whose colour
// carries a meaning (a verdict, the tab a note goes to or a card leads to)
// keeps it and is listed in
// scripts/audit_pill_style.js with the reason. The same rules as buttons:
// spread one, add only where it sits, never retype the fill, border, radius
// or padding, and never colour one inline.
export const PILL_RADIUS = 999;

const pillShape = {
  borderRadius: PILL_RADIUS,
  paddingVertical: 8,
  paddingHorizontal: 14,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

export const PILL = {
  ...pillShape,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
} as const;

export const PILL_SMALL = {
  ...PILL,
  paddingVertical: 6,
  paddingHorizontal: 10,
} as const;

export const PILL_ON = {
  backgroundColor: colors.buttonColor,
  borderColor: colors.buttonColor,
  ...BUTTON_SHADOW,
} as const;

// Pill words are the size of button words: at caption size they were hard
// to read (direct report, 2026-10-28).
export const PILL_TEXT = {
  ...typography.bodyEmphasis,
  color: colors.textPrimary,
  ...textShadow,
} as const;

// Dark text on the button colour, so no shadow.
export const PILL_ON_TEXT = {
  ...typography.bodyEmphasis,
  color: colors.textOnButton,
  textShadowColor: 'transparent',
  textShadowRadius: 0,
} as const;

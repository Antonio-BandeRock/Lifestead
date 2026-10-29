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

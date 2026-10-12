// Room inside a text box for an icon drawn over it (a mic, an information
// mark), written so it holds on the desktop as well as the phone.
//
// On the desktop react-native-web writes a style that is not from
// StyleSheet.create on the element itself, where it beats every class, and
// turns paddingHorizontal into padding-inline. So a field whose caller gave
// it paddingHorizontal: 10 kept that 10 over a StyleSheet paddingRight: 40,
// and the text ran under the mic (Today I Want To, reported 2026-10-12).
// Flattening the style and spelling the two sides out as plain paddingLeft
// and paddingRight in the same object leaves nothing to compete with them.
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

export function withSideRoom(style: StyleProp<TextStyle>, room: { left?: number; right?: number }): TextStyle {
  const field: Record<string, unknown> = { ...(StyleSheet.flatten(style) ?? {}) };
  const num = (value: unknown) => (typeof value === 'number' ? value : undefined);
  const left = num(field.paddingLeft) ?? num(field.paddingStart) ?? num(field.paddingHorizontal) ?? num(field.padding) ?? 0;
  const right = num(field.paddingRight) ?? num(field.paddingEnd) ?? num(field.paddingHorizontal) ?? num(field.padding) ?? 0;
  const vertical = num(field.paddingVertical) ?? num(field.padding);
  if (field.paddingTop === undefined && vertical !== undefined) field.paddingTop = vertical;
  if (field.paddingBottom === undefined && vertical !== undefined) field.paddingBottom = vertical;
  for (const key of ['padding', 'paddingHorizontal', 'paddingVertical', 'paddingStart', 'paddingEnd']) delete field[key];
  field.paddingLeft = Math.max(left, room.left ?? 0);
  field.paddingRight = Math.max(right, room.right ?? 0);
  return field as TextStyle;
}

// The flip card: a single card under a curved two-way arrow. It marks
// Flashcards on Interests (2026-11-13); the flash cards and reading edge
// button wears Learn's old graduation cap instead.
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * A single card under a curved two-way arrow: the front and back of active
 * recall. Drawn on a 24 grid to sit beside the Ionicons outline set.
 */
export function FlipCardIcon({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={12} width={16} height={9} rx={1.6} transform="rotate(-6 12 16.5)" />
      <Path d="M9.2 16.8l5.6-0.6" />
      <Path d="M5.2 8.6 C6.8 2.6 17.2 2.6 18.8 8.6" />
      <Path d="M3.6 7.6 L5.4 10.6 L7.3 7.9 Z" fill={color} strokeWidth={1.2} />
      <Path d="M16.7 7.9 L18.6 10.6 L20.4 7.6 Z" fill={color} strokeWidth={1.2} />
    </Svg>
  );
}

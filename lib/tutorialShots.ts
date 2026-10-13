// Pictures beside the written steps on the Tutorials page (1.0.68.16).
//
// Each picture is a screenshot of one moment of a how-to, taken on the
// phone over USB against example records, never anybody's own, and named by
// shotName in lib/tutorials.ts. scripts/capture_tutorial_shots.js writes
// this file and the images under assets/tutorials/; do not edit it by hand.
// A step with no picture yet reads as still to come.

import type { ImageSourcePropType } from 'react-native';

export type TutorialShot = { source: ImageSourcePropType; width: number; height: number };

export const TUTORIAL_SHOTS: Record<string, TutorialShot> = {};

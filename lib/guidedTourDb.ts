// The guided tour's answers (lib/guidedTour.ts holds every decision), kept
// in your_story_answers so a hidden strip stays hidden and a passed stop
// stays passed on the next start.
import { TOUR_ANSWER_KEY, TOUR_PASSED_PREFIX, tourChanged } from './guidedTour';
import { setYourStoryAnswer } from './yourStoryInterviewDb';

export async function showGuidedTour(): Promise<void> {
  await setYourStoryAnswer(TOUR_ANSWER_KEY, 'on');
  tourChanged();
}

export async function hideGuidedTour(): Promise<void> {
  await setYourStoryAnswer(TOUR_ANSWER_KEY, 'hidden');
  tourChanged();
}

export async function passTourStop(key: string): Promise<void> {
  await setYourStoryAnswer(`${TOUR_PASSED_PREFIX}${key}`, 'passed');
  tourChanged();
}

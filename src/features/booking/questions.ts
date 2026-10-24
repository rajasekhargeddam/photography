import { serviceImages } from '../../data/service-images';
import { weddingCeremonies, isCoupleShoot, ceremonyName } from './quote';
import type { BookingDraft } from './model';
type Question = {
  id: string;
  kind:
    | 'event'
    | 'shoot-type'
    | 'include'
    | 'duration'
    | 'coverage'
    | 'album'
    | 'album-size'
    | 'album-delivery'
    | 'contact';
  title: string;
  subtitle: string;
  ceremonyId?: string;
};
export function questionsFor(draft: BookingDraft): Question[] {
  const questions: Question[] = [
    {
      id: 'event',
      kind: 'event',
      title: 'What are you celebrating?',
      subtitle: 'Choose the occasion you would like us to capture.',
    },
  ];
  if (!draft.eventType) return questions;
  if (['Pre-Wedding', 'Post-Wedding'].includes(draft.eventType))
    questions.push({
      id: 'shoot-type',
      kind: 'shoot-type',
      title: 'Before or after the wedding?',
      subtitle: 'Choose the shoot you are planning.',
    });
  const definitions =
    draft.eventType === 'Marriage'
      ? weddingCeremonies
      : [{ id: 'shoot', name: ceremonyName(draft.eventType, 'shoot') }];
  for (const c of definitions) {
    if (draft.eventType === 'Marriage' && c.id !== 'wedding')
      questions.push({
        id: `include:${c.id}`,
        kind: 'include',
        ceremonyId: c.id,
        title: `Would you like ${c.name} coverage?`,
        subtitle: 'Include this occasion or move to the next question.',
      });
    if (!draft.ceremonies.some((selected) => selected.id === c.id)) continue;
    if (isCoupleShoot(draft.eventType, c.id))
      questions.push({
        id: `duration:${c.id}`,
        kind: 'duration',
        ceremonyId: c.id,
        title: `How many days for ${c.name.toLowerCase()}?`,
        subtitle: 'Coverage is charged per service, per day.',
      });
    questions.push({
      id: `coverage:${c.id}`,
      kind: 'coverage',
      ceremonyId: c.id,
      title:
        c.id === 'wedding'
          ? 'Your wedding ceremony'
          : `Choose coverage for ${c.name}`,
      subtitle: 'Select all the services you want. You can change these later.',
    });
  }
  questions.push({
    id: 'album',
    kind: 'album',
    title: 'Would you like a photo album?',
    subtitle: 'Add printed memories or keep your request digital.',
  });
  if (draft.albumQuantity > 0) {
    questions.push({
      id: 'album-size',
      kind: 'album-size',
      title: 'Choose an album size',
      subtitle:
        'Choose your preferred size. Pages, finish and final pricing require studio confirmation.',
    });
    questions.push({
      id: 'album-delivery',
      kind: 'album-delivery',
      title: 'When would you prefer your album?',
      subtitle:
        'A requested timeline, not a delivery promise. Any extra charge will be quoted separately.',
    });
  }
  questions.push({
    id: 'contact',
    kind: 'contact',
    title: 'Your quote is ready',
    subtitle:
      'Share your name and mobile number to save and review your quote.',
  });
  return questions;
}
export const eventCards = [
  {
    event: 'Marriage',
    label: 'Wedding',
    description: 'Your ceremony and the celebrations around it.',
    image: null,
  },
  {
    event: 'Pre-Wedding',
    label: 'Pre-Wedding / Post-Wedding',
    description: 'A shoot for the two of you.',
    image: serviceImages.preWedding,
  },
  {
    event: 'Engagement',
    label: 'Engagement',
    description: 'Celebrate the start of your next chapter.',
    image: null,
  },
  {
    event: 'Birthday',
    label: 'Birthday / Pre-Birthday',
    description: 'Milestones, family and celebrations.',
    image: serviceImages.kids,
  },
  {
    event: 'Maternity',
    label: 'Maternity',
    description: 'Portraits of a growing family.',
    image: null,
  },
  {
    event: 'Other',
    label: 'Other Events',
    description: 'Baby shoots, corporate events and more.',
    image: serviceImages.halfSaree,
  },
] as const;

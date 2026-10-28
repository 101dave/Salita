import { phrases, philippineCodes } from "./languages";

/**
 * Lesson vocabulary is derived from the same curated phrase table as the
 * phrasebook, so a learner can never see a word in a lesson that the
 * translator would not also recognise.
 *
 * World languages were removed along with the rest of Salita's non-Philippine
 * data; `getVocabulary` now only ever serves English and the eight Philippine
 * languages. Entries without a verified source are omitted rather than shown
 * in English as a placeholder.
 */
export function getVocabulary(language: string): { source: string; translated: string }[] {
  if (!philippineCodes.includes(language)) return [];
  return phrases
    .map((phrase) => ({ source: phrase.en, translated: phrase[language as keyof typeof phrase] }))
    .filter((entry): entry is { source: string; translated: string } => Boolean(entry.translated));
}

/** Every Philippine language shares one 12-phrase beginner track. */
export const basics = phrases.map((phrase) => phrase.en);

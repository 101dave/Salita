import type { Language } from "./types";

/**
 * Salita speaks Philippine languages, with English as the pivot language every
 * phrase and lesson is keyed on. World languages were removed on purpose: this
 * app is about understanding the Philippines, and keeping only languages we can
 * verify against dictionaries keeps every entry trustworthy.
 *
 * Each curated phrase below was checked against a published source — see
 * docs/translation-sources.md for the reference used per entry. Where a source
 * could not be found, the cell is left empty and Salita falls back to live
 * translation instead of guessing.
 */
export const languages: Language[] = [
  { code: "en", name: "English", native: "English", flag: "🇺🇸", region: "Pivot language" },
  { code: "tl", name: "Filipino", native: "Filipino", flag: "🇵🇭", region: "Across the Philippines", philippine: true, image: "/images/filipino.jpg", description: "Your first connection to the Philippines.", aiHint: "Filipino/Tagalog, the national language, spoken across the Philippines" },
  { code: "ceb", name: "Cebuano", native: "Bisaya", flag: "🇵🇭", region: "Central Visayas & Mindanao", philippine: true, image: "/images/cebuano.jpg", description: "Find your voice in the heart of the islands.", aiHint: "Cebuano (also called Bisaya or Binisaya), a Visayan language of Central Visayas and Mindanao — not Tagalog" },
  { code: "ilo", name: "Ilocano", native: "Ilokano", flag: "🇵🇭", region: "Northern Luzon", philippine: true, image: "/images/ilocano.jpg", description: "Discover the language of the north.", aiHint: "Ilocano (Ilokano), a Northern Luzon language of Ilocos and the Cordillera — not Tagalog" },
  { code: "hil", name: "Hiligaynon", native: "Ilonggo", flag: "🇵🇭", region: "Western Visayas", philippine: true, image: "/images/cebuano.jpg", description: "The warm, melodic voice of Western Visayas.", aiHint: "Hiligaynon (Ilonggo), a Visayan language of Panay, Guimaras and Negros Occidental — not Cebuano, not Tagalog" },
  { code: "war", name: "Waray", native: "Winaray", flag: "🇵🇭", region: "Eastern Visayas", philippine: true, image: "/images/filipino.jpg", description: "Make a connection in Samar and Leyte.", aiHint: "Waray-Waray (Samareño/Leyteño), a Visayan language of Samar, Leyte and Biliran — not Cebuano, not Hiligaynon" },
  { code: "pam", name: "Kapampangan", native: "Kapampangan", flag: "🇵🇭", region: "Central Luzon", philippine: true, image: "/images/ilocano.jpg", description: "A rich language from the culinary capital.", aiHint: "Kapampangan (Pampango), an Austronesian language of Pampanga and southern Tarlac in Central Luzon — not Tagalog" },
  { code: "pag", name: "Pangasinan", native: "Pangasinan", flag: "🇵🇭", region: "Pangasinan", philippine: true, image: "/images/cebuano.jpg", description: "Everyday words from the land of salt.", aiHint: "Pangasinan (Pangasinense), an Austronesian language of Pangasinan province in Central Luzon — not Ilocano, not Tagalog" },
  { code: "bcl", name: "Bikol", native: "Bikol Central", flag: "🇵🇭", region: "Bicol Region", philippine: true, image: "/images/filipino.jpg", description: "A friendly introduction to the Bicol Region.", aiHint: "Bikol Central (Legazpi/Bicolano), an Austronesian language of the Bicol Region in southern Luzon — not Tagalog" },
];

export const getLanguage = (code: string) => languages.find((language) => language.code === code) || languages[0];
export const nativeLanguages = languages.filter((language) => language.philippine);

/** Languages Salita carries curated phrasebook data for (everything but English). */
export const philippineCodes = nativeLanguages.map((language) => language.code);

export interface Phrase { en: string; tl: string; ceb: string; ilo: string; hil: string; war: string; pam: string; pag: string; bcl: string }

/** An empty string means “no published source found” — never a guess. */
export const phrases: Phrase[] = [
  { en: "Hello", tl: "Kumusta", ceb: "Kumusta", ilo: "Kablaaw", hil: "Kamusta", war: "Maupay", pam: "Komusta", pag: "Kumusta", bcl: "Kumusta" },
  { en: "Good morning", tl: "Magandang umaga", ceb: "Maayong buntag", ilo: "Naimbag a bigat", hil: "Maayong aga", war: "Maupay nga aga", pam: "Mayap a abak", pag: "Maong ya kabuasan", bcl: "Marhay na aga" },
  { en: "Thank you", tl: "Salamat", ceb: "Salamat", ilo: "Agyamanak", hil: "Salamat gid", war: "Salamat", pam: "Dakal a salamat", pag: "Salamat", bcl: "Dios mabalos" },
  { en: "How are you?", tl: "Kumusta ka?", ceb: "Kumusta ka?", ilo: "Kumusta ka?", hil: "Kamusta ka?", war: "Kumusta ka?", pam: "Komusta ka?", pag: "Kumusta ka?", bcl: "Kumusta ka?" },
  { en: "I love you", tl: "Mahal kita", ceb: "Gihigugma tika", ilo: "Ay-ayaten ka", hil: "Palangga ta ka", war: "Hinihigugma ko ikaw", pam: "Kaluguran daka", pag: "Inaro taka", bcl: "Namumutan ta ka" },
  { en: "Good afternoon", tl: "Magandang hapon", ceb: "Maayong hapon", ilo: "Naimbag a malem", hil: "Maayong hapon", war: "Maupay nga kulop", pam: "Mayap a gatpanapun", pag: "Maong ya ngarem", bcl: "Marhay na hapon" },
  { en: "Good evening", tl: "Magandang gabi", ceb: "Maayong gabii", ilo: "Naimbag a sardam", hil: "Maayong gab-i", war: "Maupay nga gab-i", pam: "Mayap a bengi", pag: "Maong ya labi", bcl: "Marhay na banggi" },
  { en: "How much is this?", tl: "Magkano ito?", ceb: "Tagpila ni?", ilo: "Mano daytoy?", hil: "Tagpila ini?", war: "Tagpira ini?", pam: "Magkanu ini?", pag: "Pigara iya?", bcl: "Gurano ini?" },
  { en: "Delicious", tl: "Masarap", ceb: "Lami", ilo: "Naimas", hil: "Namit", war: "Marasa", pam: "Manyaman", pag: "Masamit", bcl: "Masiram" },
  { en: "Welcome", tl: "Maligayang pagdating", ceb: "Maayong pag-abot", ilo: "Naragsak nga isasangbay", hil: "Maayong pag-abot", war: "Maupay nga pag-abot", pam: "Malaus ko pu", pag: "", bcl: "Maogmang pag-abot" },
  { en: "Yes", tl: "Oo", ceb: "Oo", ilo: "Wen", hil: "Huo", war: "Oo", pam: "Wa", pag: "On", bcl: "Iyo" },
  { en: "No", tl: "Hindi", ceb: "Dili", ilo: "Saan", hil: "Indi", war: "Diri", pam: "Ali", pag: "Andi", bcl: "Dai" },
];

export const extraPhrases: Record<string, Record<string, string>> = {
  "hello how are you": { en: "Hello! How are you?", tl: "Kumusta! Kumusta ka?", ceb: "Kumusta! Kumusta ka?", ilo: "Kablaaw! Kumusta ka?", hil: "Kamusta! Kamusta ka?", war: "Maupay! Kumusta ka?", pam: "Komusta! Komusta ka?", pag: "Kumusta! Kumusta ka?", bcl: "Kumusta! Kumusta ka?" },
  "home": { en: "Home", tl: "Tahanan", ceb: "Balay", ilo: "Balay", hil: "Balay", war: "Balay", pam: "Bale", pag: "Abong", bcl: "Harong" },
  "a beautiful day": { en: "A beautiful day", tl: "Isang magandang araw", ceb: "Nindot nga adlaw" },
  "where is the beach": { en: "Where is the beach?", tl: "Saan ang dalampasigan?", ceb: "Asa ang baybay?", ilo: "Sadino ti aplaya?" },
  "let us go": { en: "Let's go", tl: "Tara na", ceb: "Lakaw ta", ilo: "Mapan tayon" },
  "welcome home": { en: "Welcome home", tl: "Maligayang pag-uwi", ceb: "Maayong pag-uli" },
  "one coffee please": { en: "One coffee, please", tl: "Isang kape, pakiusap", ceb: "Usa ka kape, palihog" },
  "where is the nearest restaurant": { en: "Where is the nearest restaurant?", tl: "Saan ang pinakamalapit na kainan?", ceb: "Asa ang pinakaduol nga kan-anan?", ilo: "Sadino ti kaasitgan a panganan?" },
  "nice to meet you": { en: "Nice to meet you", tl: "Ikinagagalak kitang makilala", ceb: "Nalipay ko nga nakaila ko nimo", ilo: "Naragsakak a makaam-ammo kenka" },
  "please": { en: "Please", tl: "Pakiusap", ceb: "Palihog", ilo: "Pangngaasim", bcl: "Tabì" },
  "take care": { en: "Take care", tl: "Ingat ka", ceb: "Amping", ilo: "Agannad ka", war: "Paghirot" },
  "you are welcome": { en: "You are welcome", tl: "Walang anuman", ceb: "Walay sapayan", ilo: "Awan ania man", war: "Waray sapayan", pag: "Andi labat", bcl: "Daing ano man" },
  "i am learning filipino": { en: "I am learning Filipino", tl: "Nag-aaral ako ng Filipino", ceb: "Nagkat-on ko og Filipino", ilo: "Agsursuroak iti Filipino" },
  "let us eat": { en: "Let us eat", tl: "Kain tayo", ceb: "Mangaon ta", ilo: "Mangan tayon" },
  "thank you very much": { en: "Thank you very much", tl: "Maraming salamat", ceb: "Daghang salamat", ilo: "Agyamanak unay", hil: "Madamo gid nga salamat", war: "Damo nga salamat", pam: "Dakal a salamat", bcl: "Salamat na marhay" },
  "good night": { en: "Good night", tl: "Magandang gabi", ceb: "Maayong gabii", ilo: "Naimbag a rabii", hil: "Maayong gab-i", war: "Maupay nga gab-i", pam: "Mayap a bengi", pag: "Maong ya labi", bcl: "Marhay na banggi" },
  "sleep well": { en: "Sleep well", tl: "Matulog nang mahimbing" },
  "see you soon": { en: "See you soon", tl: "Hanggang sa muli", ceb: "Hangtod sa sunod" },
  "sorry": { en: "Sorry", tl: "Paumanhin", ceb: "Pasayloa ko", ilo: "Pakawanennak", war: "Pasaylo-a ako" },
  "where is the bathroom": { en: "Where is the bathroom?", tl: "Saan ang banyo?", ceb: "Asa ang kasilyas?", ilo: "Sadino ti kasilyas?" },
  "i do not understand": { en: "I do not understand", tl: "Hindi ko maintindihan", ceb: "Wala ko kasabot", ilo: "Saan ko maawatan", pam: "E ku buri" },
};

const englishAliases: Record<string, string[]> = {
  hello: ["hi", "hey"],
  "thank you": ["thanks"],
  "thank you very much": ["thanks a lot", "many thanks"],
  "how are you": ["how are you doing", "how is it going", "how's it going"],
  "you are welcome": ["you're welcome"],
  "let us eat": ["let's eat"],
  "i am learning filipino": ["i'm learning filipino"],
  "i do not understand": ["i don't understand"],
  "where is the nearest restaurant": ["where's the nearest restaurant"],
  "where is the bathroom": ["where's the bathroom", "where is the restroom", "where's the restroom"],
  "good night": ["goodnight"],
};

/**
 * Usage notes explain register and nuance, so a learner does not accidentally
 * sound formal, literary, or blunt. Every note reflects a documented variant.
 */
const phraseNotes: Record<string, string> = {
  hello: "Everyday speech usually opens with ‘Kumusta ka?’ — in Ilocano, ‘Kablaaw’ is the greeting itself and sounds formal, as on signs or in speeches.",
  "thank you": "Bikol ‘Dios mabalos’ is the warmer, more formal thanks, literally ‘God will reward you.’ ‘Salamat’ also works everywhere.",
  "i love you": "Waray and Bikol forms here are the fuller, heartfelt versions. Everyday Bikol also uses ‘Padaba taka’ (Legazpi) or ‘Padangat taka’ (Naga).",
  welcome: "An arrival greeting. To reply to ‘thank you,’ use ‘You’re welcome.’",
  home: "‘Tahanan’ means a home — a place of belonging, not only a building.",
  "good night": "A night farewell. For a sleep wish, use ‘Sleep well’ in your phrasebook instead.",
  yes: "Kapampangan ‘Wa’ is everyday yes; ‘Opo’ or ‘Opu’ adds respect when speaking to elders.",
  "you are welcome": "Bikol ‘Daing ano man’ and Waray ‘Waray sapayan’ both mean ‘it was nothing.’",
};

export function normalizeText(value: string) {
  let normalized = value.normalize("NFKC").toLowerCase().replace(/[’‘ʼ]/g, "'");
  const contractions: [RegExp, string][] = [
    [/\bi'm\b/g, "i am"], [/\byou're\b/g, "you are"], [/\bwe're\b/g, "we are"], [/\bthey're\b/g, "they are"],
    [/\blet's\b/g, "let us"], [/\bwhere's\b/g, "where is"], [/\bwhat's\b/g, "what is"], [/\bhow's\b/g, "how is"],
    [/\bit's\b/g, "it is"], [/\bthat's\b/g, "that is"], [/\bcan't\b/g, "cannot"], [/\bwon't\b/g, "will not"],
    [/\bdon't\b/g, "do not"], [/\bdoesn't\b/g, "does not"], [/\bdidn't\b/g, "did not"], [/\bisn't\b/g, "is not"],
    [/\baren't\b/g, "are not"], [/\bi've\b/g, "i have"], [/\bwe've\b/g, "we have"], [/\bi'll\b/g, "i will"],
  ];
  for (const [pattern, replacement] of contractions) normalized = normalized.replace(pattern, replacement);
  return normalized.replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

export interface LocalTranslation {
  text: string;
  provider: "Salita phrase library";
  quality: "curated";
  note?: string;
}

const allLocalPhrases: Record<string, string>[] = [...phrases.map((phrase) => ({ ...phrase })), ...Object.values(extraPhrases)];

function lookupLocalPhrase(text: string, source: string, target: string) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  for (const phrase of allLocalPhrases) {
    const candidates = [phrase[source], ...(source === "en" ? englishAliases[normalizeText(phrase.en)] || [] : [])].filter((value): value is string => Boolean(value));
    if (candidates.some((value) => normalizeText(value) === normalized) && phrase[target]) {
      const key = normalizeText(phrase.en);
      return { text: phrase[target], note: key === "home" && target !== "tl" ? undefined : phraseNotes[key] };
    }
  }
  return null;
}

/**
 * Prefer exact curated entries. Short, fully understood sentences can be
 * composed, but never guess at an unknown word or partially translate a phrase.
 */
export function findLocalTranslationDetails(text: string, source: string, target: string): LocalTranslation | null {
  const direct = lookupLocalPhrase(text, source, target);
  if (direct) return { ...direct, provider: "Salita phrase library", quality: "curated" };

  const segments = (text.trim().match(/[^.!?\n]+[.!?]?|\n+/g) || []).filter((segment) => /[\p{L}\p{N}]/u.test(segment));
  if (segments.length < 2 || segments.length > 8) return null;
  const translated: string[] = [];
  for (const segment of segments) {
    const value = segment.trim();
    const punctuation = value.match(/[.!?]+$/)?.[0] || "";
    const body = punctuation ? value.slice(0, -punctuation.length) : value;
    const part = lookupLocalPhrase(body, source, target);
    if (!part) return null;
    translated.push(`${part.text}${punctuation && !/[.!?]$/u.test(part.text) ? punctuation : ""}`);
  }
  return { text: translated.join(" "), provider: "Salita phrase library", quality: "curated", note: "Built entirely from curated phrases; unknown wording is never guessed." };
}

export function findLocalTranslation(text: string, source: string, target: string): string | null {
  return findLocalTranslationDetails(text, source, target)?.text || null;
}

export const lessonTitles = ["A friendly hello", "Everyday gratitude", "How are you?", "Morning connections", "Food & flavors", "Around the market", "Evening greetings", "A warm welcome", "Words that connect", "Yes, no & maybe", "Everyday conversations", "Bring it all together"];

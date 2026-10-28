import type { Language } from "./types";

export const languages: Language[] = [
  { code: "en", name: "English", native: "English", flag: "🇺🇸", region: "Global" },
  { code: "tl", name: "Filipino", native: "Filipino", flag: "🇵🇭", region: "Across the Philippines", philippine: true, image: "/images/filipino.jpg", description: "Your first connection to the Philippines." },
  { code: "ceb", name: "Cebuano", native: "Bisaya", flag: "🇵🇭", region: "Central Visayas & Mindanao", philippine: true, image: "/images/cebuano.jpg", description: "Find your voice in the heart of the islands." },
  { code: "ilo", name: "Ilocano", native: "Ilokano", flag: "🇵🇭", region: "Northern Luzon", philippine: true, image: "/images/ilocano.jpg", description: "Discover the language of the north." },
  { code: "hil", name: "Hiligaynon", native: "Ilonggo", flag: "🇵🇭", region: "Western Visayas", philippine: true, image: "/images/cebuano.jpg", description: "The warm, melodic voice of Western Visayas." },
  { code: "war", name: "Waray", native: "Winaray", flag: "🇵🇭", region: "Eastern Visayas", philippine: true, image: "/images/filipino.jpg", description: "Make a connection in Samar and Leyte." },
  { code: "pam", name: "Kapampangan", native: "Kapampangan", flag: "🇵🇭", region: "Central Luzon", philippine: true, image: "/images/ilocano.jpg", description: "A rich language from the culinary capital." },
  { code: "pag", name: "Pangasinan", native: "Pangasinan", flag: "🇵🇭", region: "Pangasinan", philippine: true, image: "/images/cebuano.jpg", description: "Everyday words from the land of salt." },
  { code: "bcl", name: "Bikol", native: "Bikol Central", flag: "🇵🇭", region: "Bicol Region", philippine: true, image: "/images/filipino.jpg", description: "A friendly introduction to the Bicol Region." },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸", region: "Europe & Americas" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷", region: "Europe & Africa" },
  { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵", region: "East Asia" },
  { code: "ko", name: "Korean", native: "한국어", flag: "🇰🇷", region: "East Asia" },
  { code: "zh-CN", name: "Chinese", native: "中文", flag: "🇨🇳", region: "East Asia" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪", region: "Europe" },
  { code: "it", name: "Italian", native: "Italiano", flag: "🇮🇹", region: "Europe" },
  { code: "pt", name: "Portuguese", native: "Português", flag: "🇵🇹", region: "Europe & Americas" },
  { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦", region: "Middle East & Africa" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳", region: "South Asia" },
  { code: "th", name: "Thai", native: "ไทย", flag: "🇹🇭", region: "Southeast Asia" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳", region: "Southeast Asia" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩", region: "Southeast Asia" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", flag: "🇲🇾", region: "Southeast Asia" },
  { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺", region: "Europe & Asia" },
  { code: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱", region: "Europe" },
  { code: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷", region: "Europe & Asia" },
  { code: "uk", name: "Ukrainian", native: "Українська", flag: "🇺🇦", region: "Europe" },
  { code: "el", name: "Greek", native: "Ελληνικά", flag: "🇬🇷", region: "Europe" },
];

export const getLanguage = (code: string) => languages.find((language) => language.code === code) || languages[0];
export const nativeLanguages = languages.filter((language) => language.philippine);

export interface Phrase { en: string; tl: string; ceb: string; ilo: string; hil: string; war: string; pam: string; pag: string; bcl: string }
export const phrases: Phrase[] = [
  { en: "Hello", tl: "Kumusta", ceb: "Kumusta", ilo: "Kablaaw", hil: "Kamusta", war: "Maupay", pam: "Komusta", pag: "Kumusta", bcl: "Kumusta" },
  { en: "Good morning", tl: "Magandang umaga", ceb: "Maayong buntag", ilo: "Naimbag a bigat", hil: "Maayong aga", war: "Maupay nga aga", pam: "Mayap a abak", pag: "Maong ya kabwasan", bcl: "Marhay na aga" },
  { en: "Thank you", tl: "Salamat", ceb: "Salamat", ilo: "Agyamanak", hil: "Salamat gid", war: "Salamat", pam: "Dakal a salamat", pag: "Salamat", bcl: "Dios mabalos" },
  { en: "How are you?", tl: "Kumusta ka?", ceb: "Kumusta ka?", ilo: "Kumusta ka?", hil: "Kamusta ka?", war: "Kumusta ka?", pam: "Komusta ka?", pag: "Kumusta ka?", bcl: "Kumusta ka?" },
  { en: "I love you", tl: "Mahal kita", ceb: "Gihigugma tika", ilo: "Ay-ayaten ka", hil: "Palangga ta ka", war: "Hinigugma ko ikaw", pam: "Kaluguran daka", pag: "Inaro taka", bcl: "Namumutan ta ka" },
  { en: "Good afternoon", tl: "Magandang hapon", ceb: "Maayong hapon", ilo: "Naimbag a malem", hil: "Maayong hapon", war: "Maupay nga kulop", pam: "Mayap a gatpanapun", pag: "Maong ya ngarem", bcl: "Marhay na hapon" },
  { en: "Good evening", tl: "Magandang gabi", ceb: "Maayong gabii", ilo: "Naimbag a rabii", hil: "Maayong gab-i", war: "Maupay nga gab-i", pam: "Mayap a bengi", pag: "Maong ya labi", bcl: "Marhay na banggi" },
  { en: "How much is this?", tl: "Magkano ito?", ceb: "Tagpila ni?", ilo: "Mano daytoy?", hil: "Tagpila ini?", war: "Tagpira ini?", pam: "Magkanu ini?", pag: "Pigara iya?", bcl: "Gurano ini?" },
  { en: "Delicious", tl: "Masarap", ceb: "Lami", ilo: "Naimas", hil: "Namit", war: "Marasa", pam: "Manyaman", pag: "Masamit", bcl: "Masiram" },
  { en: "Welcome", tl: "Maligayang pagdating", ceb: "Maayong pag-abot", ilo: "Naragsak nga isasangbay", hil: "Maayong pag-abot", war: "Maupay nga pag-abot", pam: "Malaus ko pu", pag: "Maabig ya pansabi", bcl: "Maogmang pag-abot" },
  { en: "Yes", tl: "Oo", ceb: "Oo", ilo: "Wen", hil: "Huo", war: "Oo", pam: "Wa", pag: "On", bcl: "Iyo" },
  { en: "No", tl: "Hindi", ceb: "Dili", ilo: "Saan", hil: "Indi", war: "Diri", pam: "Ali", pag: "Andi", bcl: "Dai" },
];

const extraPhrases: Record<string, Record<string, string>> = {
  "hello how are you": { en: "Hello! How are you?", tl: "Kumusta! Kumusta ka?", ceb: "Kumusta! Kumusta ka?", ilo: "Kablaaw! Kumusta ka?", es: "¡Hola! ¿Cómo estás?", fr: "Bonjour ! Comment allez-vous ?", ja: "こんにちは！お元気ですか？", ko: "안녕하세요! 어떻게 지내세요?" },
  "home": { en: "Home", tl: "Tahanan", ceb: "Balay", ilo: "Balay", hil: "Balay", war: "Balay", pam: "Bale", pag: "Abong", bcl: "Harong" },
  "where is the nearest restaurant": { en: "Where is the nearest restaurant?", tl: "Saan ang pinakamalapit na kainan?", ceb: "Asa ang pinakaduol nga kan-anan?", ilo: "Sadino ti kaasitgan a panganan?" },
  "nice to meet you": { en: "Nice to meet you", tl: "Ikinagagalak kitang makilala", ceb: "Nalipay ko nga nakaila ko nimo", ilo: "Naragsakak a makaam-ammo kenka" },
  "please": { en: "Please", tl: "Pakiusap", ceb: "Palihog", ilo: "Pangngaasim" },
  "take care": { en: "Take care", tl: "Ingat ka", ceb: "Amping", ilo: "Agannad ka" },
  "you are welcome": { en: "You are welcome", tl: "Walang anuman", ceb: "Walay sapayan", ilo: "Awan ania man" },
  "i am learning filipino": { en: "I am learning Filipino", tl: "Nag-aaral ako ng Filipino", ceb: "Nagkat-on ko og Filipino", ilo: "Agsursuroak iti Filipino" },
  "let us eat": { en: "Let us eat", tl: "Kain tayo", ceb: "Mangaon ta", ilo: "Mangan tayon" },
};

export function normalizeText(value: string) { return value.toLowerCase().normalize("NFKC").replace(/[\p{P}\p{S}]/gu, "").replace(/\s+/g, " ").trim(); }

export function findLocalTranslation(text: string, source: string, target: string): string | null {
  const normalized = normalizeText(text);
  const all: Record<string, string>[] = [...phrases.map((phrase) => ({ ...phrase })), ...Object.values(extraPhrases)];
  for (const phrase of all) {
    if (phrase[source] && normalizeText(phrase[source]) === normalized && phrase[target]) return phrase[target];
  }
  return null;
}

export const lessonTitles = ["A friendly hello", "Everyday gratitude", "How are you?", "Morning connections", "Food & flavors", "Around the market", "Evening greetings", "A warm welcome", "Words that connect", "Yes, no & maybe", "Everyday conversations", "Bring it all together"];

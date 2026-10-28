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
  { en: "Good evening", tl: "Magandang gabi", ceb: "Maayong gabii", ilo: "Naimbag a sardam", hil: "Maayong gab-i", war: "Maupay nga gab-i", pam: "Mayap a bengi", pag: "Maong ya labi", bcl: "Marhay na banggi" },
  { en: "How much is this?", tl: "Magkano ito?", ceb: "Tagpila ni?", ilo: "Mano daytoy?", hil: "Tagpila ini?", war: "Tagpira ini?", pam: "Magkanu ini?", pag: "Pigara iya?", bcl: "Gurano ini?" },
  { en: "Delicious", tl: "Masarap", ceb: "Lami", ilo: "Naimas", hil: "Namit", war: "Marasa", pam: "Manyaman", pag: "Masamit", bcl: "Masiram" },
  { en: "Welcome", tl: "Maligayang pagdating", ceb: "Maayong pag-abot", ilo: "Naragsak nga isasangbay", hil: "Maayong pag-abot", war: "Maupay nga pag-abot", pam: "Malaus ko pu", pag: "Maabig ya pansabi", bcl: "Maogmang pag-abot" },
  { en: "Yes", tl: "Oo", ceb: "Oo", ilo: "Wen", hil: "Huo", war: "Oo", pam: "Wa", pag: "On", bcl: "Iyo" },
  { en: "No", tl: "Hindi", ceb: "Dili", ilo: "Saan", hil: "Indi", war: "Diri", pam: "Ali", pag: "Andi", bcl: "Dai" },
];

export const extraPhrases: Record<string, Record<string, string>> = {
  "hello how are you": { en: "Hello! How are you?", tl: "Kumusta! Kumusta ka?", ceb: "Kumusta! Kumusta ka?", ilo: "Kablaaw! Kumusta ka?", es: "¡Hola! ¿Cómo estás?", fr: "Bonjour ! Comment allez-vous ?", ja: "こんにちは！お元気ですか？", ko: "안녕하세요! 어떻게 지내세요?" },
  "home": { en: "Home", tl: "Tahanan", ceb: "Balay", ilo: "Balay", hil: "Balay", war: "Balay", pam: "Bale", pag: "Abong", bcl: "Harong" },
  "a beautiful day": { en: "A beautiful day", tl: "Isang magandang araw", ceb: "Nindot nga adlaw" },
  "where is the beach": { en: "Where is the beach?", tl: "Saan ang dalampasigan?", ceb: "Asa ang baybay?", ilo: "Sadino ti aplaya?" },
  "let us go": { en: "Let's go", tl: "Tara na", ceb: "Lakaw ta", es: "Vamos", fr: "Allons-y", ja: "行きましょう", ko: "가요", "zh-CN": "我们走吧", de: "Los geht’s", it: "Andiamo", pt: "Vamos" },
  "welcome home": { en: "Welcome home", tl: "Maligayang pag-uwi", fr: "Bienvenue à la maison" },
  "one coffee please": { en: "One coffee, please", tl: "Isang kape, pakiusap", ceb: "Usa ka kape, palihog" },
  "where is the nearest restaurant": { en: "Where is the nearest restaurant?", tl: "Saan ang pinakamalapit na kainan?", ceb: "Asa ang pinakaduol nga kan-anan?", ilo: "Sadino ti kaasitgan a panganan?" },
  "nice to meet you": { en: "Nice to meet you", tl: "Ikinagagalak kitang makilala", ceb: "Nalipay ko nga nakaila ko nimo", ilo: "Naragsakak a makaam-ammo kenka" },
  "please": { en: "Please", tl: "Pakiusap", ceb: "Palihog", ilo: "Pangngaasim", es: "Por favor", fr: "S’il vous plaît", ja: "お願いします", ko: "부탁합니다", "zh-CN": "请", de: "Bitte", it: "Per favore", pt: "Por favor", ar: "من فضلك", hi: "कृपया", th: "กรุณา", vi: "Làm ơn", id: "Tolong", ms: "Sila", ru: "Пожалуйста", nl: "Alsjeblieft", tr: "Lütfen", uk: "Будь ласка", el: "Παρακαλώ" },
  "take care": { en: "Take care", tl: "Ingat ka", ceb: "Amping", ilo: "Agannad ka", es: "Cuídate", fr: "Prends soin de toi", ja: "気をつけてね", ko: "조심해요", "zh-CN": "保重", de: "Pass auf dich auf", it: "Abbi cura di te", pt: "Cuida-te" },
  "you are welcome": { en: "You are welcome", tl: "Walang anuman", ceb: "Walay sapayan", ilo: "Awan ania man", es: "De nada", fr: "De rien", ja: "どういたしまして", ko: "천만에요", "zh-CN": "不客气", de: "Gern geschehen", it: "Prego", pt: "De nada", ar: "على الرحب والسعة", hi: "कोई बात नहीं", th: "ไม่เป็นไร", vi: "Không có gì", id: "Sama-sama", ms: "Sama-sama", ru: "Пожалуйста", nl: "Graag gedaan", tr: "Rica ederim", uk: "Будь ласка", el: "Παρακαλώ" },
  "i am learning filipino": { en: "I am learning Filipino", tl: "Nag-aaral ako ng Filipino", ceb: "Nagkat-on ko og Filipino", ilo: "Agsursuroak iti Filipino" },
  "let us eat": { en: "Let us eat", tl: "Kain tayo", ceb: "Mangaon ta", ilo: "Mangan tayon" },
  "thank you very much": { en: "Thank you very much", tl: "Maraming salamat", ceb: "Daghang salamat", ilo: "Agyamanak unay", hil: "Madamo gid nga salamat", war: "Damo nga salamat", pam: "Dakal a salamat", bcl: "Salamat na marhay", es: "Muchas gracias", fr: "Merci beaucoup", ja: "どうもありがとうございます", ko: "정말 감사합니다", "zh-CN": "非常感谢", de: "Vielen Dank", it: "Grazie mille", pt: "Muito obrigado", ar: "شكرًا جزيلًا", hi: "बहुत धन्यवाद", th: "ขอบคุณมาก", vi: "Cảm ơn rất nhiều", id: "Terima kasih banyak", ms: "Terima kasih banyak", ru: "Большое спасибо", nl: "Hartelijk dank", tr: "Çok teşekkür ederim", uk: "Дуже дякую", el: "Ευχαριστώ πολύ" },
  "good night": { en: "Good night", tl: "Magandang gabi", ceb: "Maayong gabii", ilo: "Naimbag a rabii", hil: "Maayong gab-i", war: "Maupay nga gab-i", pam: "Mayap a bengi", pag: "Maong ya labi", bcl: "Marhay na banggi", es: "Buenas noches", fr: "Bonne nuit", ja: "おやすみなさい", ko: "안녕히 주무세요", "zh-CN": "晚安", de: "Gute Nacht", it: "Buonanotte", pt: "Boa noite", ar: "تصبح على خير", hi: "शुभ रात्रि", th: "ราตรีสวัสดิ์", vi: "Chúc ngủ ngon", id: "Selamat malam", ms: "Selamat malam", ru: "Спокойной ночи", nl: "Welterusten", tr: "İyi geceler", uk: "На добраніч", el: "Καληνύχτα" },
  "sleep well": { en: "Sleep well", tl: "Matulog nang mahimbing", es: "Que duermas bien", fr: "Dors bien", ja: "ぐっすり眠ってね", ko: "잘 자요", "zh-CN": "睡个好觉", de: "Schlaf gut", it: "Dormi bene", pt: "Dorme bem", ar: "نم جيدًا", hi: "अच्छी नींद लें", th: "นอนหลับให้สนิท", vi: "Ngủ ngon", id: "Tidur nyenyak", ms: "Tidur dengan lena", ru: "Спи хорошо", nl: "Slaap lekker", tr: "İyi uykular", uk: "Добре виспися", el: "Καλό ύπνο" },
  "see you soon": { en: "See you soon", tl: "Hanggang sa muli", ceb: "Hangtod sa sunod", es: "Hasta pronto", fr: "À bientôt", ja: "またね", ko: "또 만나요", "zh-CN": "回头见", de: "Bis bald", it: "A presto", pt: "Até logo", ar: "أراك قريبًا", hi: "फिर मिलेंगे", th: "แล้วพบกันใหม่", vi: "Hẹn gặp lại", id: "Sampai jumpa", ms: "Jumpa lagi", ru: "До скорого", nl: "Tot ziens", tr: "Görüşmek üzere", uk: "До зустрічі", el: "Τα λέμε σύντομα" },
  "sorry": { en: "Sorry", tl: "Paumanhin", ceb: "Pasayloa ko", es: "Lo siento", fr: "Pardon", ja: "ごめんなさい", ko: "미안해요", "zh-CN": "对不起", de: "Es tut mir leid", it: "Mi dispiace", pt: "Desculpa", ar: "عذرًا", hi: "मुझे माफ़ कर दो", th: "ขอโทษ", vi: "Xin lỗi", id: "Maaf", ms: "Maaf", ru: "Извините", nl: "Sorry", tr: "Üzgünüm", uk: "Вибачте", el: "Συγγνώμη" },
  "where is the bathroom": { en: "Where is the bathroom?", tl: "Saan ang banyo?", ceb: "Asa ang kasilyas?", ilo: "Sadino ti kasilyas?", es: "¿Dónde está el baño?", fr: "Où sont les toilettes ?", ja: "トイレはどこですか？", ko: "화장실이 어디예요?", "zh-CN": "洗手间在哪里？", de: "Wo ist die Toilette?", it: "Dov’è il bagno?", pt: "Onde fica o banheiro?", ar: "أين الحمام؟", hi: "बाथरूम कहाँ है?", th: "ห้องน้ำอยู่ที่ไหน", vi: "Nhà vệ sinh ở đâu?", id: "Di mana kamar mandi?", ms: "Di mana tandas?", ru: "Где туалет?", nl: "Waar is de wc?", tr: "Tuvalet nerede?", uk: "Де туалет?", el: "Πού είναι η τουαλέτα;" },
  "i do not understand": { en: "I do not understand", tl: "Hindi ko maintindihan", ceb: "Wala ko kasabot", es: "No entiendo", fr: "Je ne comprends pas", ja: "わかりません", ko: "이해하지 못해요", "zh-CN": "我不明白", de: "Ich verstehe nicht", it: "Non capisco", pt: "Não entendo", ar: "لا أفهم", hi: "मुझे समझ में नहीं आता", th: "ฉันไม่เข้าใจ", vi: "Tôi không hiểu", id: "Saya tidak mengerti", ms: "Saya tidak faham", ru: "Я не понимаю", nl: "Ik begrijp het niet", tr: "Anlamıyorum", uk: "Я не розумію", el: "Δεν καταλαβαίνω" },
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

const phraseNotes: Record<string, string> = {
  welcome: "An arrival greeting. To reply to ‘thank you,’ use ‘You’re welcome.’",
  home: "‘Tahanan’ means a home—a place of belonging, not only a building.",
  "good night": "A night farewell. For a sleep wish, use ‘Sleep well’ in your phrasebook instead.",
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
    translated.push(`${part.text}${punctuation && !/[.!?。！？]$/u.test(part.text) ? punctuation : ""}`);
  }
  return { text: translated.join(["ja", "zh-CN", "th"].includes(target) ? "" : " "), provider: "Salita phrase library", quality: "curated", note: "Built entirely from curated phrases; unknown wording is never guessed." };
}

export function findLocalTranslation(text: string, source: string, target: string): string | null {
  return findLocalTranslationDetails(text, source, target)?.text || null;
}

export const lessonTitles = ["A friendly hello", "Everyday gratitude", "How are you?", "Morning connections", "Food & flavors", "Around the market", "Evening greetings", "A warm welcome", "Words that connect", "Yes, no & maybe", "Everyday conversations", "Bring it all together"];

import { phrases } from "./languages";

const basics = ["Hello", "Good morning", "Thank you", "How are you?", "I love you", "Good evening"];
const world: Record<string, string[]> = {
  es: ["Hola", "Buenos días", "Gracias", "¿Cómo estás?", "Te quiero", "Buenas noches"],
  fr: ["Bonjour", "Bonjour", "Merci", "Comment allez-vous ?", "Je t’aime", "Bonsoir"],
  ja: ["こんにちは", "おはようございます", "ありがとうございます", "お元気ですか？", "愛しています", "こんばんは"],
  ko: ["안녕하세요", "좋은 아침이에요", "감사합니다", "어떻게 지내세요?", "사랑해요", "좋은 저녁이에요"],
  "zh-CN": ["你好", "早上好", "谢谢", "你好吗？", "我爱你", "晚上好"],
  de: ["Hallo", "Guten Morgen", "Danke", "Wie geht es dir?", "Ich liebe dich", "Guten Abend"],
  it: ["Ciao", "Buongiorno", "Grazie", "Come stai?", "Ti amo", "Buonasera"],
  pt: ["Olá", "Bom dia", "Obrigado", "Como você está?", "Eu te amo", "Boa noite"],
  ar: ["مرحبًا", "صباح الخير", "شكرًا", "كيف حالك؟", "أحبك", "مساء الخير"],
  hi: ["नमस्ते", "सुप्रभात", "धन्यवाद", "आप कैसे हैं?", "मैं आपसे प्यार करता हूँ", "शुभ संध्या"],
  th: ["สวัสดี", "สวัสดีตอนเช้า", "ขอบคุณ", "สบายดีไหม", "ฉันรักคุณ", "สวัสดีตอนเย็น"],
  vi: ["Xin chào", "Chào buổi sáng", "Cảm ơn", "Bạn khỏe không?", "Tôi yêu bạn", "Chào buổi tối"],
  id: ["Halo", "Selamat pagi", "Terima kasih", "Apa kabar?", "Aku cinta kamu", "Selamat malam"],
  ms: ["Helo", "Selamat pagi", "Terima kasih", "Apa khabar?", "Saya cinta kamu", "Selamat petang"],
  ru: ["Привет", "Доброе утро", "Спасибо", "Как дела?", "Я тебя люблю", "Добрый вечер"],
  nl: ["Hallo", "Goedemorgen", "Dank je", "Hoe gaat het?", "Ik hou van je", "Goedenavond"],
  tr: ["Merhaba", "Günaydın", "Teşekkür ederim", "Nasılsın?", "Seni seviyorum", "İyi akşamlar"],
  uk: ["Привіт", "Доброго ранку", "Дякую", "Як справи?", "Я тебе кохаю", "Добрий вечір"],
  el: ["Γεια σας", "Καλημέρα", "Ευχαριστώ", "Πώς είστε;", "Σ’ αγαπώ", "Καλησπέρα"],
};

export function getVocabulary(language: string): { source: string; translated: string }[] {
  if (world[language]) return world[language].map((translated, index) => ({ source: basics[index], translated }));
  return phrases.map((phrase) => ({ source: phrase.en, translated: phrase[language as keyof typeof phrase] || phrase.en }));
}

export function findLessonTranslation(text: string, source: string, target: string): string | null {
  const normalize = (value: string) => value.toLowerCase().replace(/[\p{P}\p{S}]/gu, "").replace(/\s+/g, " ").trim();
  if (source === "en" && world[target]) {
    const index = basics.findIndex((phrase) => normalize(phrase) === normalize(text));
    return index >= 0 ? world[target][index] : null;
  }
  if (target === "en" && world[source]) {
    const index = world[source].findIndex((phrase) => normalize(phrase) === normalize(text));
    return index >= 0 ? basics[index] : null;
  }
  return null;
}

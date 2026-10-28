import assert from "node:assert/strict";
import { findLocalTranslationDetails, getLanguage, languages, nativeLanguages, normalizeText, phrases } from "../src/lib/languages";
import { basics, getVocabulary } from "../src/lib/lessons";
import {
  AI_PROVIDER_LABEL,
  askAssistant,
  buildAssistantPrompt,
  buildTranslationPrompt,
  cleanAITranslation,
  cleanAssistantReply,
  describeLanguage,
  extractAIText,
  translateWithAI,
} from "../src/lib/ai";
import { cleanProviderText, decodeHtmlEntities, isPlausibleTranslation, protectTranslationTokens, restoreTranslationTokens, selectMyMemoryTranslation, translateWithProvider } from "../src/lib/translation";

const local = (text: string, target: string, source = "en") => findLocalTranslationDetails(text, source, target)?.text ?? null;

/* ---------------------------------------------------------------- *
 * Language list: Philippine languages only, with English as pivot
 * ---------------------------------------------------------------- */

const WORLD_CODES = ["es", "fr", "ja", "ko", "zh-CN", "de", "it", "pt", "ar", "hi", "th", "vi", "id", "ms", "ru", "nl", "tr", "uk", "el"];

assert.equal(languages.length, 9, "English plus eight Philippine languages");
assert.equal(nativeLanguages.length, 8);
assert.deepEqual(
  languages.map((language) => language.code),
  ["en", "tl", "ceb", "ilo", "hil", "war", "pam", "pag", "bcl"],
);
for (const code of WORLD_CODES) {
  assert.equal(languages.some((language) => language.code === code), false, `${code} should no longer be offered`);
  assert.equal(getLanguage(code).code, "en", `${code} should resolve to the fallback language`);
}
for (const language of languages) {
  assert.equal(language.code === "en" || language.philippine === true, true, `${language.code} must be English or a Philippine language`);
}

/* ---------------------------------------------------------------- *
 * Lesson vocabulary follows the same Philippine-only scope
 * ---------------------------------------------------------------- */

assert.equal(getVocabulary("es").length, 0, "world languages have no lesson vocabulary");
assert.equal(getVocabulary("ja").length, 0);
assert.equal(getVocabulary("en").length, 0, "English is the pivot, not a course");
assert.equal(getVocabulary("tl").length, phrases.length, "Tagalog covers every curated phrase");
assert.deepEqual(basics, phrases.map((phrase) => phrase.en));
for (const code of nativeLanguages.map((language) => language.code)) {
  const vocabulary = getVocabulary(code);
  assert.ok(vocabulary.length > 0, `${code} should have lesson vocabulary`);
  assert.ok(
    vocabulary.every((entry) => entry.translated && normalizeText(entry.translated) !== normalizeText(entry.source)),
    `${code} lesson entries must be translated, never an English placeholder`,
  );
}

/* ---------------------------------------------------------------- *
 * Normalization and curated lookup
 * ---------------------------------------------------------------- */

assert.equal(normalizeText("  You’re   welcome! "), "you are welcome");
assert.equal(normalizeText("Let’s eat"), "let us eat");
assert.equal(local("  THANK YOU!!! ", "ceb"), "Salamat");
assert.equal(local("You’re welcome", "tl"), "Walang anuman");
assert.equal(local("Let’s eat", "tl"), "Kain tayo");
assert.equal(local("Hi", "tl"), "Kumusta");
assert.equal(local("Thanks a lot", "tl"), "Maraming salamat");
assert.equal(local("Where’s the restroom?", "tl"), "Saan ang banyo?");
assert.equal(local("Good evening", "ilo"), "Naimbag a sardam");
assert.equal(local("Good night", "ilo"), "Naimbag a rabii");
assert.equal(local("A beautiful day", "tl"), "Isang magandang araw");
assert.equal(local("Where is the beach?", "tl"), "Saan ang dalampasigan?");
assert.equal(local("Let’s go", "tl"), "Tara na");
assert.equal(local("One coffee, please", "ceb"), "Usa ka kape, palihog");
assert.equal(local("Good morning! Thank you!", "tl"), "Magandang umaga! Salamat!");
assert.equal(local("Good morning! This is an unknown sentence.", "tl"), null, "never partially translate an unknown sentence");
assert.notEqual(local("Welcome", "tl"), local("You’re welcome", "tl"), "keep arrival and gratitude senses separate");
assert.equal(findLocalTranslationDetails("Home", "en", "ceb")?.note, undefined, "do not show Filipino notes for other targets");

/* ---------------------------------------------------------------- *
 * Dictionary-verified Philippine entries
 *
 * Each assertion below pins a form checked against a published source;
 * see docs/translation-sources.md. They exist so a future edit cannot
 * silently reintroduce a known-bad translation.
 * ---------------------------------------------------------------- */

// Waray: the verb carries the -hi- infix (Wikipedia, Waray phrasebooks).
assert.equal(local("I love you", "war"), "Hinihigugma ko ikaw");
assert.notEqual(local("I love you", "war"), "Hinigugma ko ikaw", "Waray ‘I love you’ needs the -hi- infix");
// Pangasinan: kabuasan is morning; the old value was the welcome greeting.
assert.equal(local("Good morning", "pag"), "Maong ya kabuasan");
// Pangasinan welcome had no verifiable source, so it is absent rather than guessed.
assert.equal(local("Welcome", "pag"), null, "omit a Pangasinan welcome we cannot source");
assert.equal(phrases.find((phrase) => phrase.en === "Welcome")?.pag, "");
// Kapampangan yes/no (Bergaño-derived dictionaries, Wiktionary).
assert.equal(local("Yes", "pam"), "Wa");
assert.equal(local("No", "pam"), "Ali");
// Kapampangan welcome (documented as “malaus ko pu”).
assert.equal(local("Welcome", "pam"), "Malaus ko pu");
// Ilocano: Kablaaw is the greeting noun; Mano daytoy? is the market question.
assert.equal(local("Hello", "ilo"), "Kablaaw");
assert.equal(local("How much is this?", "ilo"), "Mano daytoy?");
assert.equal(local("Welcome", "ilo"), "Naragsak nga isasangbay");
// Bikol: Dios mabalos is the formal thanks; Namumutan ta ka the literary love.
assert.equal(local("Thank you", "bcl"), "Dios mabalos");
assert.equal(local("I love you", "bcl"), "Namumutan ta ka");
assert.equal(local("Home", "bcl"), "Harong");
assert.equal(local("Yes", "bcl"), "Iyo");
assert.equal(local("No", "bcl"), "Dai");
// Waray greetings and gratitude.
assert.equal(local("Hello", "war"), "Maupay");
assert.equal(local("Good morning", "war"), "Maupay nga aga");
assert.equal(local("Thank you very much", "war"), "Damo nga salamat");
assert.equal(local("How much is this?", "war"), "Tagpira ini?");
// Replies to thanks that were missing for Waray, Bikol and Pangasinan.
assert.equal(local("You are welcome", "war"), "Waray sapayan");
assert.equal(local("You are welcome", "bcl"), "Daing ano man");
assert.equal(local("You are welcome", "pag"), "Andi labat");
assert.equal(local("Please", "bcl"), "Tabì");
// Cebuano and Hiligaynon staples.
assert.equal(local("Delicious", "ceb"), "Lami");
assert.equal(local("Welcome", "ceb"), "Maayong pag-abot");
assert.equal(local("How much is this?", "ceb"), "Tagpila ni?");
assert.equal(local("Delicious", "hil"), "Namit");
assert.equal(local("Good morning", "hil"), "Maayong aga");
// Notes carry register nuance rather than being decorative.
assert.match(findLocalTranslationDetails("Thank you", "en", "bcl")?.note ?? "", /Dios mabalos/);
assert.match(findLocalTranslationDetails("Yes", "en", "pam")?.note ?? "", /Opo|Opu/);
assert.match(findLocalTranslationDetails("Hello", "en", "ilo")?.note ?? "", /Kumusta/);
// Composition works between two Philippine languages, not only from English.
assert.equal(local("Maayong buntag", "tl", "ceb"), "Magandang umaga");
assert.equal(local("Salamat", "ilo", "ceb"), "Agyamanak", "Cebuano thanks renders as Ilocano thanks");
assert.equal(local("Mahal kita", "ceb", "tl"), "Gihigugma tika");
assert.equal(local("Good morning! How are you?", "hil"), "Maayong aga! Kamusta ka?", "multi-segment composition reaches every language");

// Every curated cell is either a real translation or deliberately empty.
for (const phrase of phrases) {
  for (const code of nativeLanguages.map((language) => language.code)) {
    const value = phrase[code as keyof typeof phrase];
    assert.equal(typeof value, "string", `${phrase.en}/${code} must be a string`);
    if (value) assert.ok(value.trim().length > 0, `${phrase.en}/${code} must not be blank space`);
  }
}

/* ---------------------------------------------------------------- *
 * AI translation prompts and response cleaning (no network needed)
 * ---------------------------------------------------------------- */

assert.equal(describeLanguage("ceb").label, "Cebuano");
assert.match(describeLanguage("ceb").hint ?? "", /not Tagalog/, "hints must disambiguate Cebuano from Tagalog");
assert.equal(describeLanguage("es").label, "es", "unknown codes fall back to the raw code");

const cebPrompt = buildTranslationPrompt("Good morning", "en", "ceb");
assert.match(cebPrompt, /Cebuano/);
assert.match(cebPrompt, /not Tagalog/);
assert.match(cebPrompt, /"""Good morning"""/);
assert.match(cebPrompt, /ONLY the translated text/i);
assert.match(cebPrompt, /UNKNOWN/);
assert.match(buildTranslationPrompt("Salamat", "ceb", "ilo"), /Ilocano/, "the prompt works in both directions");

assert.equal(cleanAITranslation("Maayong buntag!"), "Maayong buntag!");
assert.equal(cleanAITranslation('  "Maayong buntag!"  '), "Maayong buntag!");
assert.equal(cleanAITranslation("Translation: Maayong buntag"), "Maayong buntag");
assert.equal(cleanAITranslation("Cebuano: Maayong buntag"), "Maayong buntag");
assert.equal(cleanAITranslation("**Maayong buntag**"), "Maayong buntag");
assert.equal(cleanAITranslation("```\nMaayong buntag\n```"), "Maayong buntag");
assert.equal(cleanAITranslation("Maayong buntag\n\nAlternative: Maayong adlaw"), "Maayong buntag", "keep the first answer only");
assert.equal(cleanAITranslation("Maayong buntag\nNote: this is a greeting"), "Maayong buntag");
assert.equal(cleanAITranslation("UNKNOWN"), null);
assert.equal(cleanAITranslation("I cannot translate that reliably."), null);
assert.equal(cleanAITranslation("As an AI, I should note…"), null);
assert.equal(cleanAITranslation("   "), null);

assert.equal(extractAIText("plain text"), "plain text");
assert.equal(extractAIText(JSON.stringify({ choices: [{ message: { content: "Salamat" } }] })), "Salamat");
assert.equal(extractAIText(JSON.stringify({ text: "Salamat" })), "Salamat");
assert.equal(extractAIText(JSON.stringify({ output: "Salamat" })), "Salamat");
assert.equal(extractAIText(""), null);

assert.equal(cleanAssistantReply("## Heading\n**Bold** reply"), "Heading\nBold reply");
assert.equal(cleanAssistantReply(""), null);
assert.equal(cleanAssistantReply("I cannot help with that."), null);

/* ---------------------------------------------------------------- *
 * Provider helpers
 * ---------------------------------------------------------------- */

assert.equal(decodeHtmlEntities("&#65;&amp;&#x42;&quot;"), "A&B\"");
assert.equal(cleanProviderText("  Tom &amp; Jerry  "), "Tom & Jerry");
assert.equal(cleanProviderText("MYMEMORY WARNING: quota finished"), null);
assert.equal(cleanProviderText("   "), null);
assert.equal(isPlausibleTranslation("Hello world", "Hello world"), false);
assert.equal(isPlausibleTranslation("Hotel", "Hotel"), true, "allow one-word cognates");

const protectedMixed = protectTranslationTokens("Contact ana@example.com or call 555.");
assert.equal(protectedMixed.tokens.length, 2);
assert.equal(protectedMixed.text.includes("ana@example.com"), false);
assert.equal(restoreTranslationTokens("Kontak __SALITA_0__ o tawag __SALITA_1__.", protectedMixed), "Kontak ana@example.com o tawag 555.");
assert.equal(restoreTranslationTokens("Nawala ang mga token", protectedMixed), null, "reject a response that loses protected values");
assert.equal(protectTranslationTokens("Visit https://example.com.").tokens[0], "https://example.com");

const selected = selectMyMemoryTranslation({
  responseData: { translatedText: "Kumusta kalibotan", match: 0.4 },
  matches: [
    { segment: "Hello", translation: "Wrong fuzzy match", match: 1, quality: 100 },
    { segment: "Hello world", translation: "Kumusta mundo", match: 0.99, quality: 95 },
  ],
}, "Hello world");
assert.equal(selected, "Kumusta mundo");
assert.equal(selectMyMemoryTranslation({ responseData: { translatedText: "Hello world", match: 0 }, matches: [{ segment: "Hello world", translation: "Kumusta mundo", match: 0.8, quality: 80 }] }, "Hello world"), "Kumusta mundo");
assert.equal(selectMyMemoryTranslation({ responseData: { translatedText: "Hello world", match: 0 }, matches: [] }, "Hello world"), null);

/* ---------------------------------------------------------------- *
 * Mocked network: AI tier and classic providers
 * ---------------------------------------------------------------- */

async function testAIIntegration() {
  const originalFetch = globalThis.fetch;
  try {
    // The AI endpoint is tried as a POST first.
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      assert.match(String(input), /text\.pollinations\.ai\/openai$/);
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body)) as { messages: { content: string }[] };
      assert.match(body.messages[0].content, /Cebuano/);
      return new Response("Maayong buntag!", { status: 200 });
    }) as typeof fetch;
    const ai = await translateWithAI("Good morning", "en", "ceb");
    assert.equal(ai.text, "Maayong buntag!");
    assert.equal(ai.provider, AI_PROVIDER_LABEL);
    assert.equal(ai.quality, "ai");
    assert.match(ai.note, /AI translation/);

    // A wrapped answer is unwrapped rather than passed through.
    globalThis.fetch = (async () => new Response('Translation: "Maayong buntag"', { status: 200 })) as typeof fetch;
    assert.equal((await translateWithAI("Good morning", "en", "ceb")).text, "Maayong buntag");

    // An OpenAI-shaped JSON body is understood too.
    globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: "Naimbag a bigat" } }] }), { status: 200 })) as typeof fetch;
    assert.equal((await translateWithAI("Good morning", "en", "ilo")).text, "Naimbag a bigat");

    // A refusal must not be shown as a translation.
    globalThis.fetch = (async () => new Response("UNKNOWN", { status: 200 })) as typeof fetch;
    await assert.rejects(() => translateWithAI("Good morning", "en", "ceb"), /unusable translation/);

    // Echoing the source back is rejected as implausible.
    globalThis.fetch = (async () => new Response("Good morning everyone", { status: 200 })) as typeof fetch;
    await assert.rejects(() => translateWithAI("Good morning everyone", "en", "ceb"), /echoed the source/);

    // If POST fails, the GET form is attempted before giving up.
    const calls: string[] = [];
    globalThis.fetch = (async (input: unknown) => {
      calls.push(String(input));
      if (calls.length === 1) throw new Error("POST blocked");
      return new Response("Salamat", { status: 200 });
    }) as typeof fetch;
    assert.equal((await translateWithAI("Thank you", "en", "tl")).text, "Salamat");
    assert.equal(calls.length, 2);
    assert.match(calls[1], /text\.pollinations\.ai\//);

    // A dead endpoint rejects cleanly so callers can fall back.
    globalThis.fetch = (async () => { throw new Error("offline"); }) as typeof fetch;
    await assert.rejects(() => translateWithAI("Thank you", "en", "tl"));

    // The assistant builds a mode-aware prompt and returns a cleaned reply.
    globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { messages: { content: string }[] };
      assert.match(body.messages[0].content, /Salita/);
      assert.match(body.messages[0].content, /example sentences/i);
      assert.match(body.messages[0].content, /Waray/);
      return new Response("Here are three examples.", { status: 200 });
    }) as typeof fetch;
    const reply = await askAssistant({ mode: "examples", targetLang: "war", sourceLang: "en", sourceText: "Thank you", translatedText: "Salamat" });
    assert.equal(reply, "Here are three examples.");

    const practicePrompt = buildAssistantPrompt({ mode: "practice", targetLang: "bcl" });
    assert.match(practicePrompt, /practice conversation/i);
    assert.match(practicePrompt, /Bikol/);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testProviderIntegration() {
  const originalFetch = globalThis.fetch;
  const originalLibreUrl = process.env.LIBRETRANSLATE_URL;
  try {
    delete process.env.LIBRETRANSLATE_URL;
    globalThis.fetch = (async (input: unknown) => {
      assert.match(String(input), /api\.mymemory\.translated\.net/);
      assert.match(String(input), /langpair=en%7Ctl/);
      return new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: "Kumusta &amp; salamat", match: 0.9 }, matches: [] }), { status: 200 });
    }) as typeof fetch;
    const memory = await translateWithProvider("Hello & thanks", "en", "tl");
    assert.equal(memory.provider, "MyMemory");
    assert.equal(memory.text, "Kumusta & salamat");

    process.env.LIBRETRANSLATE_URL = "https://libre.example/";
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      assert.equal(String(input), "https://libre.example/translate");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.source, "en");
      assert.equal(body.target, "ceb");
      return new Response(JSON.stringify({ translatedText: "Maayong buntag" }), { status: 200 });
    }) as typeof fetch;
    const libre = await translateWithProvider("Good morning", "en", "ceb");
    assert.equal(libre.provider, "LibreTranslate");
    assert.equal(libre.text, "Maayong buntag");

    delete process.env.LIBRETRANSLATE_URL;
    globalThis.fetch = (async (input: unknown) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("q")?.includes("ana@example.com"), false);
      return new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: "Kontak __SALITA_0__ o tawag __SALITA_1__", match: 1 }, matches: [] }), { status: 200 });
    }) as typeof fetch;
    const mixed = await translateWithProvider("Contact ana@example.com or call 555", "en", "tl");
    assert.equal(mixed.text, "Kontak ana@example.com o tawag 555");

    process.env.LIBRETRANSLATE_URL = "https://libre.example/";
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) throw new Error("LibreTranslate is offline");
      return new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: "Salamat", match: 1 }, matches: [] }), { status: 200 });
    }) as typeof fetch;
    const fallback = await translateWithProvider("An unlisted phrase", "en", "tl");
    assert.equal(calls, 2);
    assert.equal(fallback.provider, "MyMemory");
    assert.equal(fallback.text, "Salamat");

    delete process.env.LIBRETRANSLATE_URL;
    globalThis.fetch = (async () => new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: "Hello world" }, matches: [] }), { status: 200 })) as typeof fetch;
    await assert.rejects(() => translateWithProvider("Hello world", "en", "tl"), /unusable result/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLibreUrl === undefined) delete process.env.LIBRETRANSLATE_URL;
    else process.env.LIBRETRANSLATE_URL = originalLibreUrl;
  }
}

console.log("✓ Philippine-only language list and lesson scope checks passed.");
console.log("✓ Translation normalization, curated phrases, and composition checks passed.");
console.log("✓ Dictionary-verified Philippine phrase checks passed.");
console.log("✓ AI prompt building and response cleaning checks passed.");
console.log("✓ Provider decoding, quality filtering, and exact-match selection checks passed.");
void testAIIntegration()
  .then(() => console.log("✓ Mocked AI translation and assistant checks passed."))
  .then(() => testProviderIntegration())
  .then(() => console.log("✓ Mocked provider integration and fallback checks passed."))
  .catch((error) => { console.error(error); process.exitCode = 1; });

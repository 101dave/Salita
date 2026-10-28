import assert from "node:assert/strict";
import { findLocalTranslationDetails, normalizeText } from "../src/lib/languages";
import { findLessonTranslation } from "../src/lib/lessons";
import { cleanProviderText, decodeHtmlEntities, isPlausibleTranslation, protectTranslationTokens, restoreTranslationTokens, selectMyMemoryTranslation, translateWithProvider } from "../src/lib/translation";

const local = (text: string, target: string, source = "en") => findLocalTranslationDetails(text, source, target)?.text ?? null;

assert.equal(normalizeText("  You’re   welcome! "), "you are welcome");
assert.equal(normalizeText("Let’s eat"), "let us eat");
assert.equal(local("  THANK YOU!!! ", "ceb"), "Salamat");
assert.equal(local("You’re welcome", "tl"), "Walang anuman");
assert.equal(local("Let’s eat", "tl"), "Kain tayo");
assert.equal(local("Hi", "tl"), "Kumusta");
assert.equal(local("Thank you very much", "ja"), "どうもありがとうございます");
assert.equal(local("Thanks a lot", "tl"), "Maraming salamat");
assert.equal(local("Where’s the restroom?", "tl"), "Saan ang banyo?");
assert.equal(local("Good night", "fr"), "Bonne nuit");
assert.equal(local("Sleep well", "fr"), "Dors bien");
assert.equal(local("Good evening", "ilo"), "Naimbag a sardam");
assert.equal(local("Good night", "ilo"), "Naimbag a rabii");
assert.equal(local("A beautiful day", "tl"), "Isang magandang araw");
assert.equal(local("Where is the beach?", "tl"), "Saan ang dalampasigan?");
assert.equal(local("Let’s go", "tl"), "Tara na");
assert.equal(local("One coffee, please", "ceb"), "Usa ka kape, palihog");
assert.equal(local("Welcome home", "fr"), "Bienvenue à la maison");
assert.equal(local("Good morning! Thank you!", "tl"), "Magandang umaga! Salamat!");
assert.equal(local("Good morning! This is an unknown sentence.", "tl"), null, "never partially translate an unknown sentence");
assert.notEqual(local("Welcome", "tl"), local("You’re welcome", "tl"), "keep arrival and gratitude senses separate");
assert.equal(findLocalTranslationDetails("Home", "en", "ceb")?.note, undefined, "do not show Filipino notes for other targets");

assert.equal(findLessonTranslation("Hola", "es", "fr"), "Bonjour");
assert.equal(findLessonTranslation("Good morning", "en", "ja"), "おはようございます");
assert.equal(findLessonTranslation("Good morning! How are you?", "en", "ja"), "おはようございます!お元気ですか？");
assert.equal(findLessonTranslation("Good morning! Unknown wording", "en", "ja"), null);

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
  responseData: { translatedText: "Hola mundo", match: 0.4 },
  matches: [
    { segment: "Hello", translation: "Wrong fuzzy match", match: 1, quality: 100 },
    { segment: "Hello world", translation: "Kumusta mundo", match: 0.99, quality: 95 },
  ],
}, "Hello world");
assert.equal(selected, "Kumusta mundo");
assert.equal(selectMyMemoryTranslation({ responseData: { translatedText: "Hello world", match: 0 }, matches: [{ segment: "Hello world", translation: "Kumusta mundo", match: 0.8, quality: 80 }] }, "Hello world"), "Kumusta mundo");
assert.equal(selectMyMemoryTranslation({ responseData: { translatedText: "Hello world", match: 0 }, matches: [] }, "Hello world"), null);

async function testProviderIntegration() {
  const originalFetch = globalThis.fetch;
  const originalLibreUrl = process.env.LIBRETRANSLATE_URL;
  try {
    delete process.env.LIBRETRANSLATE_URL;
    globalThis.fetch = (async (input: unknown) => {
      assert.match(String(input), /api\.mymemory\.translated\.net/);
      assert.match(String(input), /langpair=en%7Ces/);
      return new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: "Hola &amp; adiós", match: 0.9 }, matches: [] }), { status: 200 });
    }) as typeof fetch;
    const memory = await translateWithProvider("Hello & goodbye", "en", "es");
    assert.equal(memory.provider, "MyMemory");
    assert.equal(memory.text, "Hola & adiós");

    process.env.LIBRETRANSLATE_URL = "https://libre.example/";
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      assert.equal(String(input), "https://libre.example/translate");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.source, "en");
      assert.equal(body.target, "zh");
      return new Response(JSON.stringify({ translatedText: "你好" }), { status: 200 });
    }) as typeof fetch;
    const libre = await translateWithProvider("Hello", "en", "zh-CN");
    assert.equal(libre.provider, "LibreTranslate");
    assert.equal(libre.text, "你好");

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

console.log("✓ Translation normalization, curated phrases, composition, and context checks passed.");
console.log("✓ Lesson fallback and cross-language built-in phrase checks passed.");
console.log("✓ Provider decoding, quality filtering, and exact-match selection checks passed.");
void testProviderIntegration().then(() => console.log("✓ Mocked provider integration and fallback checks passed.")).catch((error) => { console.error(error); process.exitCode = 1; });

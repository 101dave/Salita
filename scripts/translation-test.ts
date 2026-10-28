import assert from "node:assert/strict";
import { findLocalTranslationDetails, normalizeText } from "../src/lib/languages";
import { findLessonTranslation } from "../src/lib/lessons";
import { cleanProviderText, decodeHtmlEntities, isPlausibleTranslation, selectMyMemoryTranslation } from "../src/lib/translation";

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

console.log("✓ Translation normalization, curated phrases, composition, and context checks passed.");
console.log("✓ Lesson fallback and cross-language reviewed phrase checks passed.");
console.log("✓ Provider decoding, quality filtering, and exact-match selection checks passed.");

# Translation sources

Salita's curated phrasebook covers English and eight Philippine languages. Every entry in
`src/lib/languages.ts` was checked against a published dictionary, phrasebook, or reference
grammar. This file records what was consulted and what changed as a result, so a future edit can be
judged against the same evidence rather than against intuition.

**The rule:** where no source could be found, the cell is left empty and Salita falls back to the
live translator. An honest gap is better than a confident guess, and the phrase library already
refuses to partially translate a sentence it does not fully understand.

## Corrections made

| Language | Phrase | Was | Now | Why |
| --- | --- | --- | --- | --- |
| Waray | I love you | `Hinigugma ko ikaw` | `Hinihigugma ko ikaw` | The verb takes the *-hi-* infix. Simple Wikipedia's Waray article and several phrasebooks give *hinihigugma* / *ginhihigugma*, not *hinigugma*. |
| Pangasinan | Good morning | `Maong ya kabwasan` | `Maong ya kabuasan` | *kabuasan* is morning. Three independent phrasebook sources give "Maong ya kabuasan"; the old spelling collided with the welcome greeting. |
| Pangasinan | Welcome | `Maabig ya pansabi` | *(removed)* | No source supports this. The only candidate found (*maong ya kabwasan*) came from a low-quality machine-generated table that also mapped "holy morning" onto good morning, so it was not trustworthy enough to publish. |

## Entries added

| Language | Phrase | Value | Source |
| --- | --- | --- | --- |
| Waray | You are welcome | `Waray sapayan` | Waray phrase collections; literally "no problem/no mention". |
| Bikol | You are welcome | `Daing ano man` | Omniglot's Bikol phrase list (reply to thank you); Wiktionary. |
| Pangasinan | You are welcome | `Andi labat` | Pangasinan phrasebook listing. |
| Bikol | Please | `Tabì` | Omniglot's Bikol phrase list. |
| Kapampangan | I do not understand | `E ku buri` | Kapampangan phrasebook listings. |
| Ilocano | Sorry | `Pakawanennak` | Ilocano phrasebook listings. |
| Ilocano | I do not understand | `Saan ko maawatan` | Ilocano phrasebook listings. |
| Ilocano / Waray | Let's go, Take care | `Mapan tayon`, `Paghirot` | Ilocano and Waray phrasebook listings. |
| Cebuano | Welcome home | `Maayong pag-uli` | Cebuano usage; *pag-uli* is the return home, distinct from *pag-abot* (arrival). |

## Verified and kept unchanged

These were already correct and are pinned by `scripts/translation-test.ts` so they cannot silently
regress.

**Kapampangan (`pam`)** — `Wa` (yes) and `Ali` (no) match Wiktionary and the Bergaño-derived
teaching material; *ali* is the documented antonym of *wa*. `Malaus ko pu` for welcome is attested
in cross-lingual dictionary data. `Mayap a abak`, `Manyaman`, `Dakal a salamat`, and `Kaluguran
daka` are all standard. A usage note records that `Opo`/`Opu` is the respectful yes.

**Ilocano (`ilo`)** — `Kablaaw` for hello is the general greeting in Omniglot's Ilocano phrase list.
It is worth knowing that *kablaaw* is the noun "a greeting" and reads formal — on signage and in
speeches — while everyday conversation opens with *Kumusta ka?* or *Naimbag nga aldaw*. That nuance
is carried in the phrase note rather than by changing the entry. `Naragsak nga isasangbay` (welcome)
and `Naragsak nga idadanon` are both given by Omniglot. `Mano daytoy?` for "how much is this?" is
confirmed by an Ilokano dictionary entry for *mano* ("how many, how much"). `Naimbag a bigat`,
`Naimbag a malem`, `Naimbag a sardam`, `Naimbag a rabii`, `Agyamanak`, and `Naimas` are standard.

**Waray (`war`)** — `Maupay` for hello and the `Maupay nga aga` / `kulop` / `gab-i` greeting series
come straight from the Wikivoyage and Wikitravel Waray phrasebooks. `Tagpira ini?` ("how much is
this?") and `Damo nga salamat` are confirmed by the same sources. `Marasa` for delicious is
attested in Waray dining expressions; `Namit` is the more common Visayan word and is used for
Hiligaynon here.

**Bikol (`bcl`)** — `Dios mabalos` is Wiktionary's *Diyós mabalós*, the formal thank-you, literally
"God will return the favour", with `Salamat` and `Salamat na marhay` as everyday equivalents.
`Namumutan ta ka` is Wiktionary's *namumutan taka*, the literary and formal form; the dialect
variants `Padaba taka` (Legazpi) and `Padangat taka` (Naga) are recorded in the phrase note.
`Harong` (house/home), `Iyo` (yes), `Dai` (no), `Marhay na aga/hapon/banggi`, `Gurano ini?`, and
`Maogmang pag-abot` are all confirmed.

**Cebuano (`ceb`)** — `Maayong pag-abot` for welcome is in the Binisaya.com Cebuano dictionary and
Omniglot. `Tagpila ni?` / `Tagpila kini?` for "how much is this?" is in the Wikivoyage Cebuano
phrasebook. `Lami` (delicious), `Nindot` (beautiful), `Walay sapayan` (you're welcome), `Maayong
buntag/hapon/gabii`, `Daghang salamat`, `Palihog`, `Amping`, and `Gihigugma tika` are standard.
`Gihigugma ko ikaw` is an equally valid variant of the same sentence.

**Hiligaynon (`hil`)** — `Maayong aga/hapon/gab-i`, `Kamusta`, and `Tagpila ini?` match the
greetings and buying tables in Wikipedia's Hiligaynon article, which also documents *tagpila* as the
derivative of *pila* that asks monetary value. `Salamat gid`, `Madamo gid nga salamat`, `Palangga ta
ka`, `Namit`, `Huo` (yes), and `Indi` (no) are standard. For welcome, `Maayong pag-abot` is kept:
Hiligaynon also uses the *abiabi* root (`Maabiabihon`, `Gina-abiabi`), but *maabiabihon* is an
adjective meaning "hospitable", so as an interjection the shared Visayan form is the safer teaching
entry.

**Pangasinan (`pag`)** — `On` (yes) and `Andi` (no) are the documented forms. `Kumusta`, `Salamat`,
`Maong ya ngarem`, `Maong ya labi`, `Inaro taka`, `Abong`, `Masamit`, and `Pigara iya?` follow
regular Pangasinan morphology (*maong* = good, *ngarem* = afternoon, *labi* = night, *aro* = love).
Note that Pangasinan is the least documented of the eight online, so its entries are the ones most
worth re-checking against a printed reference when one is available.

**Filipino (`tl`)** — the national-language entries were already correct and needed no changes.

## Scope: why only nine languages

Salita originally offered 28 languages. The nineteen non-Philippine ones were removed because the
app's purpose is understanding the Philippines, and because a small curated set can be verified
properly while a large one cannot. English is kept as the pivot: every phrase and lesson is keyed on
it, and it is the source language most learners arrive with.

Removing them also simplified the data model. Lesson vocabulary in `src/lib/lessons.ts` is now
derived directly from the same curated phrase table as the phrasebook, so a learner can never meet a
word in a lesson that the translator would not recognise. The old separate "beginner vocabulary"
fallback tier was deleted as redundant.

## The AI tier

Text the curated library does not cover goes to a keyless language model (see `src/lib/ai.ts`).
Models routinely confuse Philippine regional languages with Tagalog or with each other, so each
language carries an `aiHint` in `src/lib/languages.ts` naming its family and heartland and stating
what it is *not*. The prompt asks for the translation alone, and the response is unwrapped, checked
for refusals, and rejected if it merely echoes the source — a rejected answer falls through to
MyMemory and Google rather than reaching the learner.

AI output is labelled as AI translation in the UI and is never written back into the curated
library. The phrasebook stays human-verified.

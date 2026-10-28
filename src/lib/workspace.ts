import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, collections, translations, learningProgress, learningActivity } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { phrases } from "@/lib/languages";
import type { WorkspaceData } from "@/lib/types";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

export async function seedWorkspace(userId: string, demo = false) {
  await db.transaction(async (tx) => {
    const folders = await tx.insert(collections).values([
      { userId, title: "Everyday essentials", description: "Little phrases that open big conversations.", color: "green" },
      { userId, title: "Island adventures", description: "Your pocket companion for the next adventure.", color: "blue" },
      { userId, title: "Food & good company", description: "From a local karinderya to the family table.", color: "orange" },
    ]).returning();
    const items: (typeof translations.$inferInsert)[] = [];
    const selections = [{ code: "tl", indices: [1, 2, 7, 8, 0, 3, 4, 5] }, { code: "ceb", indices: [1, 2, 7, 8, 0, 3, 6, 9] }, { code: "ilo", indices: [0, 1, 2, 8] }, { code: "hil", indices: [1, 2] }, { code: "war", indices: [1] }, { code: "pam", indices: [2] }];
    for (const selection of selections) {
      for (const index of selection.indices) {
        const phrase = phrases[index];
        const group = index === 7 ? 1 : index === 8 ? 2 : 0;
        items.push({ userId, sourceText: phrase.en, translatedText: phrase[selection.code as keyof typeof phrase], sourceLang: "en", targetLang: selection.code, saved: true, collectionId: folders[group].id, createdAt: new Date(Date.now() - items.length * 1000 * 60 * 47) });
      }
    }
    if (demo) {
      const history = [
        ["A beautiful day", "Isang magandang araw", "tl"], ["See you soon", "Hasta pronto", "es"], ["Thank you very much", "どうもありがとうございます", "ja"], ["Good night", "Maayong gabii", "ceb"],
        ["Where is the beach?", "Saan ang dalampasigan?", "tl"], ["Let's go", "Tara na", "tl"], ["Welcome home", "Bienvenue à la maison", "fr"], ["One coffee, please", "Isang kape, pakiusap", "tl"],
      ];
      history.forEach(([sourceText, translatedText, targetLang], index) => items.push({ userId, sourceText, translatedText, sourceLang: "en", targetLang, saved: false, createdAt: new Date(Date.now() - (24 + index) * 1000 * 60 * 47) }));
    }
    await tx.insert(translations).values(items);
    await tx.insert(learningProgress).values([{ userId, language: "tl", completed: demo ? 3 : 0 }, { userId, language: "ceb", completed: demo ? 1 : 0 }, { userId, language: "ilo", completed: 0 }]);
    if (demo) await tx.insert(learningActivity).values(Array.from({ length: 7 }, (_, index) => ({ userId, language: index % 2 ? "ceb" : "tl", completedAt: new Date(Date.now() - index * 86400000) })));
  });
}

const globalSeed = globalThis as typeof globalThis & { salitaSeed?: Promise<void> };
export async function ensureDemo() {
  if (!globalSeed.salitaSeed) {
    globalSeed.salitaSeed = (async () => {
      const created = await db.insert(users).values({ id: DEMO_USER_ID, name: "Alex Morgan", email: "alex@salita.demo" }).onConflictDoNothing().returning();
      if (created.length) {
        try { await seedWorkspace(DEMO_USER_ID, true); }
        catch (error) { await db.delete(users).where(eq(users.id, DEMO_USER_ID)); throw error; }
      }
    })().catch((error) => { globalSeed.salitaSeed = undefined; throw error; });
  }
  await globalSeed.salitaSeed;
}

export async function getViewer() {
  await ensureDemo();
  const authenticated = await getAuthenticatedUser();
  if (authenticated) return authenticated;
  const [demo] = await db.select().from(users).where(eq(users.id, DEMO_USER_ID));
  return demo;
}

export async function loadWorkspace(): Promise<WorkspaceData> {
  const user = await getViewer();
  const [allTranslations, allCollections, progress, activity] = await Promise.all([
    db.select().from(translations).where(eq(translations.userId, user.id)).orderBy(desc(translations.createdAt)),
    db.select().from(collections).where(eq(collections.userId, user.id)).orderBy(collections.createdAt),
    db.select().from(learningProgress).where(eq(learningProgress.userId, user.id)),
    db.select().from(learningActivity).where(eq(learningActivity.userId, user.id)).orderBy(desc(learningActivity.completedAt)),
  ]);
  return JSON.parse(JSON.stringify({ user: { id: user.id, name: user.name, email: user.email, dailyGoal: user.dailyGoal }, isDemo: user.id === DEMO_USER_ID, translations: allTranslations, collections: allCollections, progress, activity }));
}

export async function ownsCollection(id: string, userId: string) {
  const [folder] = await db.select({ id: collections.id }).from(collections).where(and(eq(collections.id, id), eq(collections.userId, userId))).limit(1);
  return Boolean(folder);
}

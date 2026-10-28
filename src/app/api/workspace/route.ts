import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { collections, translations, users, learningProgress, learningActivity } from "@/db/schema";
import { getViewer, loadWorkspace, ownsCollection } from "@/lib/workspace";
import { languages } from "@/lib/languages";

export const dynamic = "force-dynamic";
class InputError extends Error { constructor(message: string, public status = 400) { super(message); } }
function text(value: unknown, label: string, max = 500) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new InputError(`${label} is required and must be under ${max} characters.`);
  return value.trim();
}
function uuid(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new InputError("Please choose a valid item.");
  return value;
}
function language(value: unknown) {
  if (typeof value !== "string" || !languages.some((item) => item.code === value)) throw new InputError("Please choose a supported language.");
  return value;
}
const validColors = ["green", "blue", "orange", "purple", "pink"];

export async function GET() {
  try { return Response.json(await loadWorkspace()); }
  catch (error) { console.error(error); return Response.json({ error: "Couldn’t load your workspace. Please try again." }, { status: 500 }); }
}

async function mutate(request: NextRequest, method: string) {
  try {
    const body = await request.json();
    const user = await getViewer();
    const resource = body.resource;
    if (resource === "profile" && method === "PATCH") {
      const name = text(body.name, "Name", 80);
      const dailyGoal = Number(body.dailyGoal);
      if (name.length < 2 || ![5, 10, 15, 20, 30, 60].includes(dailyGoal)) throw new InputError("Choose a daily goal and enter your full name.");
      const [updated] = await db.update(users).set({ name, dailyGoal }).where(eq(users.id, user.id)).returning({ id: users.id, name: users.name, email: users.email, dailyGoal: users.dailyGoal });
      return Response.json(updated);
    }
    if (resource === "collections") {
      if (method === "POST") {
        const title = text(body.title, "Collection name", 80);
        const description = typeof body.description === "string" ? body.description.trim().slice(0, 300) : "";
        const color = validColors.includes(body.color) ? body.color : "green";
        const [created] = await db.insert(collections).values({ userId: user.id, title, description, color }).returning();
        return Response.json(created, { status: 201 });
      }
      const id = uuid(body.id);
      const condition = and(eq(collections.id, id), eq(collections.userId, user.id));
      if (method === "DELETE") {
        const removed = await db.delete(collections).where(condition).returning({ id: collections.id });
        if (!removed.length) throw new InputError("Collection not found.", 404);
        return Response.json({ ok: true });
      }
      if (method === "PATCH") {
        const title = text(body.title, "Collection name", 80);
        const description = typeof body.description === "string" ? body.description.trim().slice(0, 300) : "";
        const color = validColors.includes(body.color) ? body.color : "green";
        const [updated] = await db.update(collections).set({ title, description, color }).where(condition).returning();
        if (!updated) throw new InputError("Collection not found.", 404);
        return Response.json(updated);
      }
    }
    if (resource === "translations") {
      if (body.collectionId) {
        const collectionId = uuid(body.collectionId);
        if (!await ownsCollection(collectionId, user.id)) throw new InputError("Collection not found.", 404);
      }
      if (method === "POST") {
        const [created] = await db.insert(translations).values({ userId: user.id, sourceText: text(body.sourceText, "Original phrase", 2000), translatedText: text(body.translatedText, "Translation", 2000), sourceLang: language(body.sourceLang), targetLang: language(body.targetLang), saved: true, collectionId: body.collectionId || null }).returning();
        return Response.json(created, { status: 201 });
      }
      const id = uuid(body.id);
      const condition = and(eq(translations.id, id), eq(translations.userId, user.id));
      if (method === "DELETE") {
        const removed = await db.delete(translations).where(condition).returning({ id: translations.id });
        if (!removed.length) throw new InputError("Phrase not found.", 404);
        return Response.json({ ok: true });
      }
      if (method === "PATCH") {
        const update: Partial<typeof translations.$inferInsert> = {};
        if (body.sourceText !== undefined) update.sourceText = text(body.sourceText, "Original phrase", 2000);
        if (body.translatedText !== undefined) update.translatedText = text(body.translatedText, "Translation", 2000);
        if (body.sourceLang !== undefined) update.sourceLang = language(body.sourceLang);
        if (body.targetLang !== undefined) update.targetLang = language(body.targetLang);
        if (typeof body.saved === "boolean") update.saved = body.saved;
        if (body.collectionId !== undefined) update.collectionId = body.collectionId || null;
        if (!Object.keys(update).length) throw new InputError("No changes were provided.");
        const [updated] = await db.update(translations).set(update).where(condition).returning();
        if (!updated) throw new InputError("Phrase not found.", 404);
        return Response.json(updated);
      }
    }
    if (resource === "lesson" && method === "POST") {
      const code = language(body.language);
      if (code === "en") throw new InputError("Choose a new language to practice.");
      const lesson = Number(body.lesson);
      if (!Number.isInteger(lesson) || lesson < 0 || lesson > 11) throw new InputError("This lesson is not available.");
      await db.insert(learningProgress).values({ userId: user.id, language: code, completed: 0 }).onConflictDoNothing();
      const result = await db.transaction(async (tx) => {
        const [progress] = await tx.select().from(learningProgress).where(and(eq(learningProgress.userId, user.id), eq(learningProgress.language, code))).for("update");
        if (progress.completed !== lesson) throw new InputError("Your progress has changed. Reopen the course to continue.", 409);
        const [updated] = await tx.update(learningProgress).set({ completed: lesson + 1, updatedAt: new Date() }).where(eq(learningProgress.id, progress.id)).returning();
        await tx.insert(learningActivity).values({ userId: user.id, language: code });
        return updated;
      });
      return Response.json(result);
    }
    throw new InputError("This action is not supported.");
  } catch (error) {
    if (error instanceof InputError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ error: "Please send a valid request." }, { status: 400 });
    console.error("Workspace mutation failed", error);
    return Response.json({ error: "Something went wrong. Your changes weren’t saved. Please try again." }, { status: 500 });
  }
}

export const POST = (request: NextRequest) => mutate(request, "POST");
export const PATCH = (request: NextRequest) => mutate(request, "PATCH");
export const DELETE = (request: NextRequest) => mutate(request, "DELETE");

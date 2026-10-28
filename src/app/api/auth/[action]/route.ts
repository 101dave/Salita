import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession, hashPassword, verifyPassword } from "@/lib/auth";
import { seedWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
const attempts = new Map<string, { count: number; reset: number }>();

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    if (action === "sign-out") { await deleteSession(); return Response.json({ ok: true }); }
    if (!["sign-in", "sign-up"].includes(action)) return Response.json({ error: "Not found" }, { status: 404 });
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) return Response.json({ error: "Enter a valid email and a password of 8–128 characters." }, { status: 400 });
    const key = `${request.headers.get("x-forwarded-for")?.split(",")[0] || "local"}:${email}`;
    const attempt = attempts.get(key);
    if (attempt && attempt.reset > Date.now() && attempt.count >= 12) return Response.json({ error: "Too many attempts. Please try again in 15 minutes." }, { status: 429 });
    if (!attempt || attempt.reset < Date.now()) attempts.set(key, { count: 1, reset: Date.now() + 900000 });
    else attempt.count++;
    if (attempts.size > 2000) for (const [id, value] of attempts) if (value.reset < Date.now()) attempts.delete(id);
    if (action === "sign-in") {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) return Response.json({ error: "That email and password don’t match. Please try again." }, { status: 401 });
      await createSession(user.id);
    } else {
      const name = String(body.name || "").trim();
      if (name.length < 2 || name.length > 80) return Response.json({ error: "Please enter your name (2–80 characters)." }, { status: 400 });
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing) return Response.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
      const [user] = await db.insert(users).values({ name, email, passwordHash: hashPassword(password) }).onConflictDoNothing().returning();
      if (!user) return Response.json({ error: "This email is already registered." }, { status: 409 });
      try { await seedWorkspace(user.id); } catch (error) { await db.delete(users).where(eq(users.id, user.id)); throw error; }
      await createSession(user.id);
    }
    attempts.delete(key);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Authentication error", error);
    return Response.json({ error: "We couldn’t complete that request. Please try again." }, { status: 500 });
  }
}

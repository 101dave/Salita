export async function request<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  let data;
  try { data = await response.json(); } catch { throw new Error("The server couldn’t be reached. Please try again."); }
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export const mutate = <T>(method: string, resource: string, payload: Record<string, unknown>) => request<T>("/api/workspace", method, { resource, ...payload });

export function getStreak(activity: { completedAt: string }[]) {
  const dates = new Set(activity.map((item) => new Date(item.completedAt).toLocaleDateString("en-CA")));
  const day = new Date();
  if (!dates.has(day.toLocaleDateString("en-CA"))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (dates.has(day.toLocaleDateString("en-CA"))) { streak++; day.setDate(day.getDate() - 1); }
  return streak;
}

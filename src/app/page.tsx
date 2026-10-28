import { loadWorkspace } from "@/lib/workspace";
import { SalitaApp } from "@/components/salita-app";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await loadWorkspace();
  return <SalitaApp initialData={data} />;
}

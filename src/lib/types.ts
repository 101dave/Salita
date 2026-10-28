export type View = "overview" | "translate" | "phrasebook" | "learn" | "collections" | "history" | "settings";

export interface Translation {
  id: string;
  userId: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  saved: boolean;
  collectionId: string | null;
  createdAt: string;
}

/**
 * `ai` is a large-language-model translation: better than generic machine
 * translation at Philippine regional languages, but still worth reviewing.
 */
export type TranslationQuality = "curated" | "remembered" | "ai" | "machine" | "direct";

export interface TranslationMetadata {
  provider: string;
  quality: TranslationQuality;
  note?: string;
}

export interface Collection {
  id: string;
  userId: string;
  title: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface Progress {
  id: string;
  language: string;
  completed: number;
  updatedAt: string;
}

export interface WorkspaceData {
  user: { id: string; name: string; email: string; dailyGoal: number };
  isDemo: boolean;
  translations: Translation[];
  collections: Collection[];
  progress: Progress[];
  activity: { language: string; completedAt: string }[];
}

export interface Language {
  code: string;
  name: string;
  native: string;
  flag: string;
  region: string;
  philippine?: boolean;
  image?: string;
  description?: string;
  /**
   * Disambiguating description handed to the AI translator. Philippine
   * regional languages are routinely confused with Tagalog or with each other,
   * so naming the language family and heartland materially improves output.
   */
  aiHint?: string;
}

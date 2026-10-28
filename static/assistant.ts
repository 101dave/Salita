/**
 * The Salita AI assistant.
 *
 * It sits beside the translator and turns a bare translation into something a
 * learner can actually use: why the wording is right, example sentences, the
 * cultural conventions around it, and a short practice conversation.
 *
 * Like the translator, it keeps its own state and only repaints its own DOM, so
 * asking a question never costs you the text you typed. It needs the network;
 * when AI is switched off in Settings, or the endpoint is unreachable, it says
 * so plainly instead of failing quietly.
 */
import { MessageCircleQuestion, RotateCcw, Send, Sparkles, Volume2, X } from "lucide";
import { askAssistant, assistantModes, assistantStarters } from "@/lib/ai";
import type { AssistantMode } from "@/lib/ai";
import { getLanguage, h, icon, iconButton, notify, replace, speak, spinner, store } from "./core";

export interface AssistantContext {
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  note?: string;
}

const context: AssistantContext = { sourceText: "", translatedText: "", sourceLang: "en", targetLang: "tl" };

/** Panels repaint when the translation they are describing changes. */
const mounted = new Set<() => void>();

export function setAssistantContext(next: Partial<AssistantContext>): void {
  Object.assign(context, next);
  for (const refresh of mounted) refresh();
}

export function getAssistantContext(): AssistantContext {
  return { ...context };
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

let requestVersion = 0;

export function AssistantPanel(): { element: HTMLElement; refresh: () => void } {
  const messages: Message[] = [];
  let loading = false;
  let error = "";

  const heading = h("span", { class: "assistant-language" });
  const transcript = h("div", { class: "assistant-transcript", "aria-live": "polite" });
  const errorBar = h("p", { class: "assistant-error", role: "alert" });
  const chips = h("div", { class: "assistant-chips" });

  const input = h("input", {
    type: "text",
    "aria-label": "Ask the assistant",
    placeholder: "Ask about this phrase…",
    autocomplete: "off",
    maxlength: "600",
    onKeyDown: (event: KeyboardEvent) => { if (event.key === "Enter") void submit(); },
  }) as HTMLInputElement;

  const sendButton = h("button", {
    class: "button primary assistant-send",
    type: "button",
    onClick: () => void submit(),
  }, icon(Send, 15), "Ask") as HTMLButtonElement;

  const offNotice = h("div", { class: "assistant-off" },
    icon(Sparkles, 18),
    h("div", null,
      h("strong", null, "Salita AI is turned off"),
      h("p", null, "Turn it on in Settings to get explanations, examples, and practice conversations. Your curated phrasebook keeps working either way.")),
    h("button", {
      class: "button secondary",
      type: "button",
      onClick: () => {
        store.prefs.aiEnabled = true;
        store.savePrefs();
        notify("Salita AI is on.");
        refresh();
      },
    }, "Turn on AI"));

  const element = h("section", { class: "assistant-card card" },
    h("div", { class: "assistant-heading" },
      h("h2", null, icon(MessageCircleQuestion, 19), "Ask about this phrase"),
      heading),
    transcript,
    chips,
    h("div", { class: "assistant-composer" }, input, sendButton));

  /* ---------------------------------------------------------- painting */

  function paintHeading() {
    const target = getLanguage(context.targetLang);
    replace(heading,
      h("span", { class: "tiny-dot" }),
      context.translatedText
        ? `${target.name} · ready to explain`
        : `Ask in ${target.name}`);
  }

  function paintTranscript() {
    if (!store.prefs.aiEnabled) {
      replace(transcript, offNotice);
      return;
    }
    if (!messages.length && !loading) {
      replace(transcript, ...assistantStarters.map((starter) => h("button", {
        class: "assistant-starter",
        type: "button",
        onClick: () => { input.value = starter.prompt; void submit(starter.mode); },
      }, icon(Sparkles, 14), starter.label)));
      return;
    }

    const nodes: Node[] = messages.map((message) => {
      if (message.role === "user") {
        return h("div", { class: "assistant-message user" },
          h("div", { class: "assistant-bubble" }, message.text));
      }
      const bubble = h("div", { class: "assistant-bubble" }, ...splitReply(message.text));
      const listen = iconButton("Listen to the reply", icon(Volume2, 15), () => {
        speak(message.text, context.targetLang === "en" ? context.sourceLang : context.targetLang);
      }, "assistant-listen");
      return h("div", { class: "assistant-message assistant" }, bubble, listen);
    });

    if (loading) {
      nodes.push(h("div", { class: "assistant-message assistant" },
        h("div", { class: "assistant-bubble assistant-thinking" }, spinner(15), "Thinking…")));
    }
    replace(transcript, ...nodes);
    if (error) {
      errorBar.textContent = error;
      if (!errorBar.isConnected) element.insertBefore(errorBar, element.querySelector(".assistant-composer"));
    } else errorBar.remove();
    transcript.scrollTop = transcript.scrollHeight;
  }

  function paintChips() {
    if (!store.prefs.aiEnabled || (!messages.length && !loading)) { replace(chips); return; }
    replace(chips,
      ...assistantModes.map((mode) => h("button", {
        class: "assistant-chip",
        type: "button",
        disabled: loading,
        onClick: () => void submit(mode.id),
      }, mode.label)),
      messages.length ? iconButton("Clear conversation", icon(X, 14), clear, "assistant-clear") : false,
      h("button", {
        class: "assistant-chip assistant-chip-again",
        type: "button",
        disabled: loading,
        onClick: () => void submit("chat", messages.filter((message) => message.role === "user").pop()?.text),
      }, icon(RotateCcw, 13), "Ask again"));
  }

  function paintComposer() {
    const enabled = store.prefs.aiEnabled;
    input.disabled = !enabled || loading;
    sendButton.disabled = !enabled || loading;
    replace(sendButton, loading ? spinner(15) : icon(Send, 15), loading ? "Asking" : "Ask");
    input.placeholder = context.translatedText
      ? "Ask about this phrase…"
      : "Ask anything about Philippine languages…";
  }

  function refresh() {
    paintHeading();
    paintTranscript();
    paintChips();
    paintComposer();
  }

  /* --------------------------------------------------------- behaviour */

  function clear() {
    requestVersion += 1;
    messages.length = 0;
    loading = false;
    error = "";
    refresh();
  }

  async function submit(mode?: AssistantMode, questionText?: string) {
    if (loading) return;
    if (!store.prefs.aiEnabled) {
      notify("Turn on Salita AI in Settings to use the assistant.", "error");
      return;
    }

    const question = (questionText ?? input.value).trim();
    const resolvedMode: AssistantMode = mode ?? (question ? "chat" : "explain");
    if (resolvedMode === "chat" && !question) {
      error = "Type a question, or pick one of the suggestions.";
      refresh();
      return;
    }

    const label = question || assistantModes.find((item) => item.id === resolvedMode)?.label || "Tell me more";
    messages.push({ role: "user", text: label });
    input.value = "";
    error = "";
    loading = true;
    const version = ++requestVersion;
    refresh();

    try {
      const reply = await askAssistant({
        mode: resolvedMode,
        ...(question ? { question } : {}),
        ...(context.sourceText ? { sourceText: context.sourceText } : {}),
        ...(context.translatedText ? { translatedText: context.translatedText } : {}),
        sourceLang: context.sourceLang,
        targetLang: context.targetLang,
        ...(context.note ? { note: context.note } : {}),
      });
      if (version !== requestVersion) return;
      messages.push({ role: "assistant", text: reply });
    } catch (err) {
      if (version !== requestVersion) return;
      // Surface only messages we wrote for the learner; raw network and
      // provider errors are noise, so they get the friendly offline wording.
      const message = err instanceof Error ? err.message : "";
      error = /wait a minute|turned off|choose a supported|ask a question/i.test(message)
        ? message
        : "The assistant couldn’t reach the AI service just now. Your curated phrasebook still works offline.";
    } finally {
      if (version === requestVersion) {
        loading = false;
        refresh();
      }
    }
  }

  /** Keep the reply readable: blank-line paragraphs become separate elements. */
  function splitReply(text: string): Node[] {
    return text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => h("p", null, ...block.split("\n").flatMap((line, index, lines) =>
        index < lines.length - 1 ? [line, h("br")] : [line])));
  }

  mounted.add(refresh);
  refresh();
  return { element, refresh };
}

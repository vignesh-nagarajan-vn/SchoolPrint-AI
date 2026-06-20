"use client";

import * as React from "react";
import { Loader2, Mic, Send, Square, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { askAgent, speak, voiceConfigured } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ActionCard } from "@/lib/types";

const LANGS = [
  { value: "en-US", label: "English" },
  { value: "es-US", label: "Spanish" },
  { value: "hi-IN", label: "Hindi" },
  { value: "zh-CN", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "fr-FR", label: "French" },
];

const PROMPTS = [
  "What should we fix first before Friday volleyball?",
  "What needs human review?",
  "Plan a sports event for 250 people",
];

function clean(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .trim();
}

export function VoiceAgent({ onCards }: { onCards?: (cards: ActionCard[]) => void }) {
  const [query, setQuery] = React.useState(
    "What should we fix first before Friday volleyball?"
  );
  const [language, setLanguage] = React.useState("en-US");
  const [answer, setAnswer] = React.useState("");
  const [kicker, setKicker] = React.useState("Ready");
  const [busy, setBusy] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [autoSpeak, setAutoSpeak] = React.useState(true);

  const ttsConfigured = React.useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = React.useRef<any>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    voiceConfigured().then((v) => {
      ttsConfigured.current = v;
    });
  }, []);

  const stopAudio = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const playTts = React.useCallback(
    async (text: string) => {
      const c = clean(text);
      if (!c) return;
      stopAudio();
      if (ttsConfigured.current) {
        const blob = await speak(c, language);
        if (blob) {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
          await audio.play().catch(() => {});
          return;
        }
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(c);
        utter.lang = language;
        utter.rate = 0.98;
        window.speechSynthesis.speak(utter);
      }
    },
    [language, stopAudio]
  );

  const ask = React.useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      stopAudio();
      setBusy(true);
      setKicker("Thinking");
      setAnswer("Reading logs and retrieved context…");
      try {
        const data = await askAgent(text, language);
        setAnswer(data.answer);
        setKicker(data.used_llm ? "Gemma response" : "Fallback response");
        if (data.action_cards?.length) onCards?.(data.action_cards);
        if (autoSpeak) playTts(data.answer);
      } catch {
        setAnswer(
          "The Pulse Agent backend is unreachable. Start the FastAPI server (uvicorn) or set PULSE_API_BASE, then try again."
        );
        setKicker("Offline");
      } finally {
        setBusy(false);
      }
    },
    [language, autoSpeak, playTts, stopAudio, onCards]
  );

  const toggleMic = React.useCallback(() => {
    const SR =
      typeof window !== "undefined"
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    if (!SR) {
      setAnswer("Voice input isn't supported in this browser. Type your question instead.");
      setKicker("No mic");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    stopAudio();
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = language;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      setListening(true);
      setKicker("Listening");
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string;
      setQuery(transcript);
      ask(transcript);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      setListening(false);
      setKicker("Mic error");
      if (e.error === "not-allowed") {
        setAnswer("Microphone access is blocked. Allow mic access and try again.");
      }
    };
    rec.onend = () => setListening(false);
    rec.start();
  }, [listening, language, ask, stopAudio]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
      {/* Mic button — the centerpiece */}
      <div className="flex flex-col items-center">
        <h2 className="mb-5 font-display text-2xl font-bold text-foreground">Voice Agent</h2>
        <div className="relative">
          {listening && (
            <span className="pointer-events-none absolute inset-0 -z-10 m-auto h-28 w-28 animate-pulse-ring rounded-full bg-destructive/30" />
          )}
          <button
            onClick={toggleMic}
            aria-label={listening ? "Stop listening" : "Speak to Pulse Agent"}
            className={cn(
              "flex h-28 w-28 items-center justify-center rounded-full border-2 shadow-sm transition active:scale-95",
              listening
                ? "border-destructive bg-destructive text-destructive-foreground"
                : "border-foreground bg-foreground text-background hover:bg-foreground/90"
            )}
          >
            {busy ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : listening ? (
              <Square className="h-9 w-9" />
            ) : (
              <Mic className="h-11 w-11" />
            )}
          </button>
        </div>
      </div>

      {/* Language + question */}
      <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row">
        <div className="w-full sm:w-44">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger aria-label="Language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask(query);
            }}
            placeholder="Ask the Pulse Agent…"
            aria-label="Ask the Pulse Agent"
          />
          <Button onClick={() => ask(query)} disabled={busy} className="shrink-0">
            <Send className="h-4 w-4" />
            Ask
          </Button>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setQuery(p);
              ask(p);
            }}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Answer */}
      <Card className="mt-6 w-full p-5">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {kicker}
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="accent-foreground"
              />
              Read aloud
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => playTts(answer)}
              disabled={!answer}
            >
              <Volume2 className="h-4 w-4" />
              Replay
            </Button>
          </div>
        </div>
        <div className="space-y-2 pt-4 text-sm leading-relaxed">
          {answer ? (
            clean(answer)
              .split(/\n+/)
              .filter(Boolean)
              .map((line, i) => <p key={i}>{line}</p>)
          ) : (
            <p className="text-muted-foreground">
              Ask the Pulse Agent for a ranked action plan across food, water, energy,
              and events.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

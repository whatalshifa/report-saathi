"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Reads text aloud with the browser's own voices (the Web Speech API): free, nothing leaves the device.

const hasSpeech = () =>
  typeof window !== "undefined" &&
  typeof window.speechSynthesis?.getVoices === "function" &&
  typeof window.SpeechSynthesisUtterance === "function";

const normalise = (lang: string) => lang.replace("_", "-").toLowerCase();

/** A voice for this language: the exact one ("hi-IN") if the device has it, else any of the language ("hi"). */
function findVoice(tag: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const wanted = normalise(tag);
  const primary = wanted.split("-")[0];
  return (
    voices.find((v) => normalise(v.lang) === wanted) ?? voices.find((v) => normalise(v.lang).split("-")[0] === primary)
  );
}

// Voices load after the page does (Chrome fills the list later and fires voiceschanged).
function subscribe(onChange: () => void) {
  if (!hasSpeech()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

/** Short pieces: some browsers stop reading one long utterance part-way through. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * `available` is false when this device has no voice for `tag` (a BCP 47 tag such as "hi-IN"),
 * so the caller can hide its button. Speech stops when `tag` changes and when the component unmounts.
 */
export function useSpeech(tag: string) {
  const available = useSyncExternalStore(
    subscribe,
    () => hasSpeech() && findVoice(tag) !== undefined,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);
  // Counts each reading, so callbacks from one that was stopped can't touch the next.
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current++;
    if (hasSpeech()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (parts: string[]) => {
      const voice = hasSpeech() ? findVoice(tag) : undefined;
      const pieces = parts.flatMap(sentences);
      if (!voice || pieces.length === 0) return;
      window.speechSynthesis.cancel();
      const id = ++run.current;
      const finish = () => {
        if (run.current === id) setSpeaking(false);
      };
      const fail = () => {
        if (run.current === id) stop();
      };
      pieces.forEach((text, i) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 0.95; // a little slower, for listeners who are new to it
        if (i === pieces.length - 1) utterance.onend = finish;
        utterance.onerror = fail;
        window.speechSynthesis.speak(utterance);
      });
      setSpeaking(true);
    },
    [tag, stop],
  );

  // A different language, or leaving the page, ends what was being read.
  useEffect(() => stop, [tag, stop]);

  return { available, speaking, speak, stop };
}

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { playSound, primeAudio, type SoundName } from "@/lib/sounds";

const KEY = "baithak.sound";
const EVENT = "baithak.sound.changed";

function read(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

/**
 * localStorage is an external store, so it's subscribed to rather than mirrored
 * into state from an effect. `true` is the server snapshot, which matches the
 * default and keeps the first client render identical to the markup.
 */
function subscribeToPreference(onChange: () => void) {
  // Arm the audio engine on the first click anywhere, so a sound fired after an
  // await (a sign-up response, say) isn't blocked for lacking a gesture.
  primeAudio();
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Sound is on by default, but only ever fires on milestones — never on
 * navigation or ordinary clicks. The preference is remembered, and muting is
 * one click away in the account menu.
 */
export function useSound() {
  const enabled = useSyncExternalStore(subscribeToPreference, read, () => true);

  // Returns a promise so callers that are about to navigate can give the sound
  // a moment to actually start — otherwise a router.push can cut it off before
  // the audio element has buffered.
  const play = useCallback(async (name: SoundName) => {
    if (read()) await playSound(name);
  }, []);

  const toggle = useCallback(() => {
    const next = !read();
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // Private browsing — the toggle just won't persist.
    }
    window.dispatchEvent(new Event(EVENT));
    // Confirm audibly that sound is back on.
    if (next) playSound("stamp");
  }, []);

  return { enabled, play, toggle };
}

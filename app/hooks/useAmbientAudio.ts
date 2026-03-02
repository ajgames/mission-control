import { useEffect, useRef } from "react";
import { Howl } from "howler";

/*
 * 🔊 useAmbientAudio
 * ────────────────────────────────────────────
 * Manages a looping background track via Howler.js.
 *
 * Browsers won't let audio play until the user
 * has interacted with the page — so we start
 * playback when the pilot engages controls
 * and fade it gently on disengage.
 *
 * The sound never fully stops. It fades to a
 * whisper, because even when you step away
 * from the controls, the ship keeps humming.
 *
 *    ♪ ── ── ── ── ── 🔈 ── ── ── ── ── ♪
 */

const ACTIVE_VOLUME = 0.45;
const IDLE_VOLUME = 0.12;
const FADE_MS = 1500;

export function useAmbientAudio(src: string, active: boolean) {
  const howlRef = useRef<Howl | null>(null);
  const started = useRef(false);

  // create the Howl once, tear it down on unmount
  useEffect(() => {
    const howl = new Howl({
      src: [src],
      loop: true,
      volume: 0,
      html5: true, // streaming — don't load the whole file into memory
    });

    howlRef.current = howl;

    return () => {
      howl.unload();
      howlRef.current = null;
    };
  }, [src]);

  // react to active/idle transitions
  useEffect(() => {
    const howl = howlRef.current;
    if (!howl) return;

    if (active) {
      // first engagement — kick off playback
      if (!started.current) {
        howl.play();
        started.current = true;
      }
      howl.fade(howl.volume(), ACTIVE_VOLUME, FADE_MS);
    } else if (started.current) {
      // disengage — fade to a hum, don't kill it
      howl.fade(howl.volume(), IDLE_VOLUME, FADE_MS);
    }
  }, [active]);
}

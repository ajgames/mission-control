import { useEffect, useRef } from "react";
import { Howl } from "howler";

/*
 * 🔊 useAmbientAudio — the ship's heartbeat
 * ────────────────────────────────────────────
 * A seamless ambient loop using crossfade overlap.
 *
 * The trick: instead of letting Howler hard-restart
 * at the loop boundary (which clicks like a Geiger
 * counter near a reactor leak), we run TWO instances
 * of the same track. When one approaches its end,
 * the next fades in underneath — like relay runners
 * passing a baton made of sound.
 *
 * The overlap window is just long enough that your
 * brain never hears the seam. The ship hums forever
 * and the void stays seamless.
 *
 *    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░
 *                ░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░
 *                              ░░░░░▓▓▓▓▓▓▓▓▓▓▓▓...
 *    ─────────────────────────────────────────────→ t
 */

const ACTIVE_VOLUME = 0.45;
const IDLE_VOLUME = 0.12;
const FADE_MS = 1500;
const CROSSFADE_MS = 4000;
const CROSSFADE_SAFETY_MS = 500; // extra buffer so outgoing never reaches EOF

export function useAmbientAudio(src: string, active: boolean) {
  const stateRef = useRef({
    started: false,
    targetVolume: 0,
    currentHowl: null as Howl | null,
    nextHowl: null as Howl | null,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  // build a fresh Howl instance pre-loaded and ready to go
  const createHowl = (volume: number): Howl =>
    new Howl({
      src: [src],
      loop: false,
      volume,
    });

  // schedule the next crossfade handoff
  const scheduleCrossfade = () => {
    const s = stateRef.current;
    const howl = s.currentHowl;
    if (!howl || !s.started) return;

    // clear any existing timer so we don't stack handoffs
    if (s.timer) clearTimeout(s.timer);

    const duration = howl.duration() * 1000;
    if (duration <= 0) return; // not loaded yet, onload will retry

    // fire the crossfade well before the track ends —
    // the safety margin means the outgoing track gets
    // stopped before EOF, never hitting that boundary click
    const delay = Math.max(0, duration - CROSSFADE_MS - CROSSFADE_SAFETY_MS);

    s.timer = setTimeout(() => {
      performCrossfade();
    }, delay);
  };

  // the handoff — old track fades out, new track fades in
  const performCrossfade = () => {
    const s = stateRef.current;
    if (!s.started) return;

    const outgoing = s.currentHowl;
    const vol = s.targetVolume;

    // new instance starts silent and fades up
    const incoming = createHowl(0);
    s.currentHowl = incoming;

    // Howler caches decoded audio buffers — after the first
    // play, subsequent Howls with the same src load instantly
    // from cache. The "load" event fires before we can attach
    // a listener, so the baton drops and the relay dies in
    // silence. We check state() first to catch the fast path.
    const startIncoming = () => {
      incoming.play();
      incoming.fade(0, vol, CROSSFADE_MS);
      scheduleCrossfade();
    };

    if (incoming.state() === "loaded") {
      startIncoming();
    } else {
      incoming.once("load", startIncoming);
    }

    // old instance fades out then gets killed before it
    // ever reaches EOF — no boundary click, no pop, just
    // a gentle disappearance like a star at dawn
    if (outgoing) {
      outgoing.fade(outgoing.volume(), 0, CROSSFADE_MS);
      const kill = () => {
        outgoing.stop();
        outgoing.unload();
      };
      outgoing.once("fade", kill);
      // safety net in case the fade event doesn't fire
      setTimeout(kill, CROSSFADE_MS + 200);
    }
  };

  // lifecycle — create the first instance, clean up on unmount
  useEffect(() => {
    const s = stateRef.current;
    s.currentHowl = createHowl(0);

    return () => {
      if (s.timer) clearTimeout(s.timer);
      s.currentHowl?.unload();
      s.nextHowl?.unload();
      s.currentHowl = null;
      s.nextHowl = null;
      s.started = false;
      s.timer = null;
    };
  }, [src]);

  // react to active/idle transitions
  useEffect(() => {
    const s = stateRef.current;
    const howl = s.currentHowl;
    if (!howl) return;

    if (active) {
      s.targetVolume = ACTIVE_VOLUME;

      if (!s.started) {
        // first engagement — the pilot takes the helm
        s.started = true;

        const kickoff = () => {
          howl.play();
          howl.fade(0, ACTIVE_VOLUME, FADE_MS);
          scheduleCrossfade();
        };

        if (howl.state() === "loaded") {
          kickoff();
        } else {
          howl.once("load", kickoff);
        }
      } else {
        howl.fade(howl.volume(), ACTIVE_VOLUME, FADE_MS);
      }
    } else if (s.started) {
      s.targetVolume = IDLE_VOLUME;
      howl.fade(howl.volume(), IDLE_VOLUME, FADE_MS);
    }
  }, [active]);
}

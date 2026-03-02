import { Scene } from "~/components/Scene";

/*
 * 🏠 Home Route
 * ────────────────────────────────────────────
 * There's no place like home.
 * Especially when home is a spaceship cockpit
 * orbiting an alien world at 7.66 km/s.
 *
 * Dorothy had it easy.
 */

export function meta() {
  return [
    { title: "Mission Control" },
    {
      name: "description",
      content: "A spaceship cockpit overlooking a planet. You're the pilot now.",
    },
  ];
}

export default function Home() {
  return <Scene />;
}

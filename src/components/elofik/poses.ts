/** Pozy Elofika (grafiki marki). Moduł wspólny dla serwera i przeglądarki. */

/** Pozy podstawowe (duże grafiki) + emocje i zajęcia z arkusza postaci (public/brand/elofik/emocje). */
const BASE = {
  idle: "/brand/elofik/idle.webp",
  telling: "/brand/elofik/idle.webp",
  waving: "/brand/elofik/excited.webp",
  happy: "/brand/elofik/excited.webp",
  amazed: "/brand/elofik/surprised.webp",
  listening: "/brand/elofik/curious.webp",
  pondering: "/brand/elofik/thinking.webp",
  sleepy: "/brand/elofik/sleepy.webp",
} as const;

const EMOTIONS = [
  "hello", "laughing", "confident", "thinking", "idea", "surprised", "worried", "grumpy",
  "sad", "jumping", "love", "hug", "sleeping", "scared", "detective", "wink",
  "reading", "hiking", "stargazing", "drawing", "building", "music", "calm",
] as const;

export type ElofikMood = keyof typeof BASE | (typeof EMOTIONS)[number];

/** Nastrój → plik grafiki. */
export const ELOFIK_POSES: Record<ElofikMood, string> = {
  ...BASE,
  ...(Object.fromEntries(EMOTIONS.map((e) => [e, `/brand/elofik/emocje/${e}.webp`])) as Record<(typeof EMOTIONS)[number], string>),
};

/**
 * Domyślne sceny ilustracji bajek startowych (blok zmienny — wygląd Elofika jest w character bible).
 * Admin może je edytować przy bajce (Admin → CMS → bajka → Ilustracje); zmiana sceny = nowy klucz cache.
 */
import type { SceneSpec } from "@/lib/ai/elofik-bible";

export const DEFAULT_SCENES: Record<string, SceneSpec> = {
  "dzien-01-tajemniczy-slad": {
    location: "A lush fairytale forest at the edge of a glade, mossy path, ancient oak with a cozy hollow, delicate flowers.",
    action: "Elofik kneels on the mossy path, examining tiny glowing silver footprints with delighted curiosity, one hand near his big pointed ear as if listening.",
    mood: "Curiosity, wonder, safe adventure.",
    timeAndLighting: "Early morning sunlight filtering through leaves, dewdrops sparkling.",
    supportingCharacters: "A tiny hedgehog with softly glowing firefly-like quill tips peeking from behind a mossy stone.",
    props: "Tiny glowing silver footprints, navy-and-gold storybook in his satchel.",
    composition: "Medium-wide shot, Elofik in the foreground, footprints leading into the forest.",
  },
  "dzien-02-most-z-kamykow": {
    location: "A sparkling forest stream with flat stepping stones, ferns and blueberry bushes on the far bank.",
    action: "Elofik and a small otter carefully place a big flat stone to finish a stepping-stone bridge, Elofik smiling patiently.",
    mood: "Patience, teamwork, quiet pride.",
    timeAndLighting: "Warm golden late-afternoon light reflecting on the water.",
    supportingCharacters: "One friendly small otter.",
    props: "Flat stones, blueberries on the other side.",
    composition: "Wide storytelling view across the stream, Elofik clearly visible.",
  },
  "dzien-03-chmura-ktora-sie-bala": {
    location: "A grassy hilltop above a dry meadow, a soft pastel sky.",
    action: "Elofik gently encourages a small shy fluffy cloud, gesturing kindly; the first raindrops begin to fall and a rainbow appears.",
    mood: "Courage, kindness, hope.",
    timeAndLighting: "Soft pastel daylight turning golden, a delicate rainbow.",
    supportingCharacters: "One small shy cloud with a gentle face.",
    props: "First raindrops, rainbow.",
    composition: "Medium-wide shot, Elofik on the hilltop looking up at the cloud.",
  },
  "dzien-04-zgubiona-melodia": {
    location: "A mossy branch in the enchanted forest at a quiet glade.",
    action: "Elofik sits on the branch next to a nightingale, eyes closed, imagining a melody; colorful musical notes swirl around like fireflies.",
    mood: "Imagination, gentle magic, joy.",
    timeAndLighting: "Warm golden afternoon light.",
    supportingCharacters: "One small nightingale.",
    props: "Floating glowing musical notes (abstract shapes, no notation text).",
    composition: "Medium shot focused on Elofik and the bird.",
  },
  "dzien-05-mrowki-i-wielki-lisc": {
    location: "The forest floor among moss, pebbles and tiny flowers, seen at a low angle.",
    action: "Elofik guides a line of tiny ants carrying one huge green leaf together, counting 'one, two, three' with a cheerful gesture.",
    mood: "Teamwork, encouragement, fun.",
    timeAndLighting: "Bright late-morning light.",
    supportingCharacters: "A group of tiny friendly ants.",
    props: "One huge green leaf.",
    composition: "Low-angle wide shot, Elofik kneeling beside the ants.",
  },
  "dzien-06-zegar-z-muszelek": {
    location: "A sandy lakeshore in the enchanted forest at sunset.",
    action: "Elofik and a friendly turtle arrange twelve shells in a circle around a stick like a sundial; Elofik points at the pink shell.",
    mood: "Learning, friendship, calm.",
    timeAndLighting: "Warm sunset light with long soft shadows.",
    supportingCharacters: "One friendly turtle.",
    props: "Twelve shells in a circle, one pink shell, a stick.",
    composition: "Medium-wide shot, the shell circle clearly readable.",
  },
  "dzien-07-zaginiona-gwiazda": {
    location: "A moonlit hilltop with silver grass under a vast starry sky.",
    action: "Elofik holds a tiny glowing fallen star in his cupped hands, about to help it fly back into the sky.",
    mood: "Perseverance, tenderness, wonder.",
    timeAndLighting: "Deep navy night, soft moonlight and warm golden starlight.",
    supportingCharacters: "A few fireflies and a friendly owl in the distance.",
    props: "Tiny glowing star, small lantern.",
    composition: "Wide cinematic composition, strong silhouette of Elofik against the stars.",
  },
};

/** Scena zastępcza dla bajek bez zdefiniowanej sceny — z promptu ilustracji i streszczenia. */
export function fallbackScene(story: { illustrationPrompt: string; summary: string }): SceneSpec {
  return {
    location: "An enchanted forest world matching the story.",
    action: story.illustrationPrompt || story.summary,
    mood: "Warm, curious, magical.",
    timeAndLighting: "Warm golden light.",
    supportingCharacters: "As described in the action, if any.",
    props: "Navy-and-gold storybook in Elofik's satchel.",
    composition: "Medium-wide shot, Elofik clearly visible.",
  };
}

/**
 * ELOFIK — character bible (źródło: ELOFIK_Prompt_Ilustracje — master prompt do generowania ilustracji).
 *
 * Priorytet absolutny: identyczność wizualna bohatera > efektowność pojedynczego kadru.
 * Blok CHARACTER_AND_STYLE_PROMPT jest kanoniczny — NIE tłumaczyć i NIE przeredagowywać między bajkami.
 * Zmiana treści = nowa PROMPT_VERSION (nowe klucze cache, stare ilustracje zostają w historii).
 */

export const PROMPT_VERSION = "1.0";

export const CHARACTER_AND_STYLE_PROMPT = `Create a premium children's storybook illustration featuring ELOFIK, the EXACT SAME RECURRING CHARACTER used throughout the Elofik brand.

CHARACTER IDENTITY — INVARIANT:
Elofik is a lovable, non-Christmas young boy elf, visually around 5–7 years old. He has a soft, round, friendly face; very large expressive warm brown eyes; a small rounded nose; subtle freckles and peachy cheeks; a cheerful, kind smile; large, softly pointed elf ears; and thick, fluffy, slightly tousled, wavy caramel-chestnut hair with a distinctive forelock. His youthful proportions and facial structure must remain recognizably identical in every illustration.

SIGNATURE OUTFIT — INVARIANT:
Elofik wears a cozy moss-green/sage-green fantasy tunic or hoodie-like top with delicate botanical/book motifs, loose warm beige trousers, soft brown boots, a brown belt and a small leather crossbody satchel. He is often accompanied by the SAME navy-blue magical storybook with elegant warm-gold decorations. No Christmas hat. Keep the outfit identity and palette consistent; adapt only small functional props when the story demands it.

VISUAL STYLE — INVARIANT:
Polished, high-end, soft three-dimensional/semi-3D children's picture-book artwork. Rounded friendly forms, gently detailed plush-like materials, warm cinematic lighting, gorgeous but controlled atmosphere, a believable cohesive fantasy world, expressive child-friendly emotions, subtle magical gold glows, and sophisticated editorial composition. Elofik should feel lovable, safe, intelligent, and plush-mascot-ready. The image must look like one frame from a consistent illustrated book series, not like a new character design.

CORE COLOR SYSTEM:
Warm ivory/cream #FFF9F0, deep navy #26344A, warm gold #F6C76D, soft peach #F8DDD0, moss/sage green clothing, caramel/chestnut-brown hair, and warm brown leather accessories. Environmental colors may change to fit the story while Elofik's identity colors stay stable.

CONSISTENCY RULES:
Treat the supplied character reference image as the definitive visual source of truth. Match his face shape, eye design, eye color, hairstyle, hair silhouette, pointed ears, costume language, color relationships, and overall character proportions as closely as possible. Do NOT redesign Elofik. Only adjust pose, expression, action, background, storytelling props, time of day, and composition as specified in the scene.

DO NOT INCLUDE:
Christmas or Santa elf imagery, red-and-white holiday outfits, holiday ornaments, horror/dark fantasy styling, sinister sharp facial traits, a different child or animal in place of Elofik, adult-looking anatomy, a changed hairstyle or different hair color, flat vector icon styling, low-detail stock clipart, photorealistic humans, random text, logos, captions, or watermarks.

VISUAL PRIORITY:
1. Preserve Elofik's recognizable identity.
2. Tell the specific story scene clearly.
3. Deliver beautiful, warm, polished premium children's artwork.`;

export type ImageType = "COVER" | "INTERIOR" | "CHARACTER_ONLY";

export const FORMAT_PROMPTS: Record<ImageType, string> = {
  COVER:
    "Create a premium children's story cover illustration. Elofik must be instantly readable at small mobile-thumbnail size. Use an iconic composition with a clear focal point. Reserve a visually quiet area near the upper portion for a title to be added later by the app. DO NOT render the title or any other text into the image.",
  INTERIOR:
    "Create a cinematic interior storybook scene that illustrates one specific moment of the narrative. A richer background and wider storytelling composition are welcome, but Elofik must remain clearly recognizable. Do not render typography, text, or a border.",
  CHARACTER_ONLY:
    "Create a clean isolated illustration of Elofik in the canonical outfit, with his whole recognizable silhouette visible, a simple unobtrusive background or transparent background if supported, without lettering or scenery. Suitable for use as an app mascot asset.",
};

export interface SceneSpec {
  location: string;
  action: string;
  mood: string;
  timeAndLighting: string;
  supportingCharacters: string;
  props: string;
  composition: string;
}

export const SCENE_FIELDS: { key: keyof SceneSpec; label: string }[] = [
  { key: "location", label: "Location (miejsce)" },
  { key: "action", label: "Action (co robi Elofik)" },
  { key: "mood", label: "Story emotion (emocja)" },
  { key: "timeAndLighting", label: "Time and lighting (pora i światło)" },
  { key: "supportingCharacters", label: "Supporting characters (postacie)" },
  { key: "props", label: "Story-specific props (rekwizyty)" },
  { key: "composition", label: "Composition / camera (kadr)" },
];

/**
 * Ochrona przed nadpisaniem tożsamości postaci: pola sceny to wyłącznie jednowierszowe dane,
 * bez prób wydawania poleceń modelowi (te frazy są usuwane), z limitem długości.
 */
export function sanitizeSceneField(value: string, max = 320): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\b(ignore|disregard|forget|override)\b[^.]*\b(instructions?|rules?|prompt|character|identity)\b[^.]*\.?/gi, "")
    .replace(/\b(redesign|change|different)\s+(elofik|his|the character)[^.]*\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeScene(s: Partial<SceneSpec>): SceneSpec {
  const f = (k: keyof SceneSpec, fallback = "") => sanitizeSceneField(s[k] ?? fallback) || fallback;
  return {
    location: f("location"),
    action: f("action"),
    mood: f("mood"),
    timeAndLighting: f("timeAndLighting"),
    supportingCharacters: f("supportingCharacters", "None."),
    props: f("props", "None."),
    composition: f("composition"),
  };
}

export function sceneBlock(scene: SceneSpec, type: ImageType): string {
  return `STORY SCENE:
Location: ${scene.location}
Action: ${scene.action}
Story emotion: ${scene.mood}
Time and lighting: ${scene.timeAndLighting}
Supporting characters (if any): ${scene.supportingCharacters}
Story-specific props: ${scene.props}
Composition / camera: ${scene.composition}
Image use: ${type === "CHARACTER_ONLY" ? "CHARACTER_ONLY" : type === "COVER" ? "COVER" : "INTERIOR"}

Maintain Elofik's canonical character identity and visual art style exactly. If a new prop or supporting character appears, it must not obscure or alter Elofik's face, signature ears, hair silhouette, or recognizable outfit.`;
}

/** Pełny prompt: stały blok + wariant formatu + blok sceny. */
export function buildImagePrompt(type: ImageType, scene: Partial<SceneSpec>): string {
  return [CHARACTER_AND_STYLE_PROMPT, FORMAT_PROMPTS[type], sceneBlock(sanitizeScene(scene), type)].join("\n\n");
}

/** Wspierane rozmiary: modele gpt-image-2.x przyjmują dowolne WxH (wielokrotności 16), starsze — 3 standardowe. */
export function sizeFor(type: ImageType, model: string): string {
  const flexible = /^gpt-image-2/.test(model);
  if (type === "COVER") return flexible ? "1152x1536" : "1024x1536"; // 3:4 (lub 2:3)
  if (type === "INTERIOR") return "1536x1024"; // 3:2
  return "1024x1024";
}

/** Pozy maskotki do UI (CHARACTER_ONLY) — odpowiadają nastrojom komponentu <Elofik mood>. */
export const MASCOT_POSES: Record<"idle" | "waving" | "happy" | "listening" | "telling" | "sleepy", { label: string; scene: SceneSpec }> = {
  idle: {
    label: "Spokojny (domyślny)",
    scene: { location: "Plain transparent background.", action: "Elofik stands facing the viewer, relaxed and friendly, holding his navy-and-gold storybook at his side.", mood: "Warm, welcoming, calm.", timeAndLighting: "Soft even studio light with a warm golden rim.", supportingCharacters: "None.", props: "Navy-and-gold storybook, satchel.", composition: "Full-body, centered, whole silhouette visible, front view." },
  },
  waving: {
    label: "Macha na powitanie",
    scene: { location: "Plain transparent background.", action: "Elofik waves hello with one raised hand (waving with the hand, the arm stays relaxed), big cheerful smile.", mood: "Joyful, welcoming.", timeAndLighting: "Soft even studio light with a warm golden rim.", supportingCharacters: "None.", props: "Satchel; storybook tucked under the other arm.", composition: "Full-body, centered, whole silhouette visible." },
  },
  happy: {
    label: "Radość",
    scene: { location: "Plain transparent background.", action: "Elofik hops with joy, eyes happily squinting, hugging his storybook, tiny golden sparkles around him.", mood: "Delighted, excited.", timeAndLighting: "Soft even studio light with a warm golden rim.", supportingCharacters: "None.", props: "Storybook, a few small golden sparkles.", composition: "Full-body, centered, whole silhouette visible." },
  },
  listening: {
    label: "Nasłuchuje (rytuał Hej Elofik)",
    scene: { location: "Plain transparent background.", action: "Elofik tilts his head and cups one hand behind his big pointed ear, listening attentively with a curious, expectant smile.", mood: "Attentive, curious, kind.", timeAndLighting: "Soft even studio light with a warm golden rim.", supportingCharacters: "None.", props: "Satchel.", composition: "Full-body, centered, whole silhouette visible, slight three-quarter view." },
  },
  telling: {
    label: "Opowiada",
    scene: { location: "Plain transparent background.", action: "Elofik holds his open storybook and tells a story with an expressive open-mouth smile and one hand gesturing.", mood: "Engaging, warm, storytelling.", timeAndLighting: "Soft even studio light; warm golden glow rising from the open book.", supportingCharacters: "None.", props: "Open navy-and-gold storybook.", composition: "Full-body, centered, whole silhouette visible." },
  },
  sleepy: {
    label: "Na dobranoc",
    scene: { location: "Plain transparent background.", action: "Elofik yawns sleepily with half-closed eyes, hugging his storybook like a pillow.", mood: "Peaceful, cozy, bedtime.", timeAndLighting: "Soft cool moonlight with a gentle warm golden rim.", supportingCharacters: "None.", props: "Storybook.", composition: "Full-body, centered, whole silhouette visible." },
  },
};

export type MascotPose = keyof typeof MASCOT_POSES;

/**
 * Grafiki strony głównej i strony dla dziadków (Admin → Ilustracje → Grafiki strony).
 * Zatwierdzone zastępują wektorowe ilustracje; do czasu akceptacji strona pokazuje wersję wektorową.
 */
export const LANDING_SCENES: { slot: "hero" | "ritual" | "words" | "family" | "goodnight"; label: string; where: string; type: ImageType; scene: SceneSpec }[] = [
  {
    slot: "hero",
    label: "Hero — zaproszenie do opowieści",
    where: "Strona główna, pierwszy ekran",
    type: "INTERIOR",
    scene: { location: "The edge of an enchanted forest on a soft grassy hill at dusk, ancient friendly trees with glowing lanterns hanging from branches, a winding path leading into the woods, distant rolling hills.", action: "Elofik sits on a mossy stone holding his open navy-and-gold storybook, from which warm golden light and tiny sparkles rise; he looks toward the viewer with a welcoming smile, as if inviting the child into the story.", mood: "Magical, cozy, inviting, full of wonder.", timeAndLighting: "Blue-hour twilight sky with the first stars and a gentle crescent moon; warm golden glow from the book and lanterns.", supportingCharacters: "A tiny curious firefly or two; no other characters.", props: "Open storybook with abstract golden swirls only (no readable text), satchel, fireflies.", composition: "Wide cinematic composition, Elofik in the right third, calm darker sky in the upper left, whole silhouette and face clearly readable." },
  },
  {
    slot: "ritual",
    label: "Rytuał „Hej Elofik!” — nasłuchuje",
    where: "Strona główna, sekcja rytuału (nocne tło)",
    type: "INTERIOR",
    scene: { location: "A cozy child's bedroom at night seen from a soft rug, a round window with a starry sky and a big gentle moon, a small bookshelf, a moon-shaped night lamp.", action: "Elofik tilts his head and cups one hand behind his big pointed ear, listening attentively with a delighted, expectant smile, as if he just heard someone call his name.", mood: "Warm anticipation, intimate, safe.", timeAndLighting: "Deep navy night with cool moonlight from the window and a warm golden lamp glow.", supportingCharacters: "None; a plush toy on the bed at most.", props: "Satchel with a soft golden glow, storybook resting nearby.", composition: "Medium full-body shot, Elofik centered-left, window with moon on the right." },
  },
  {
    slot: "words",
    label: "Słowo dnia — torba na słowa",
    where: "Strona główna, sekcja „Jak uczymy nowych słów”",
    type: "INTERIOR",
    scene: { location: "A magical meadow of tall flowers at golden hour with floating dandelion seeds.", action: "Elofik gently opens his satchel and a single glowing golden orb of light (a 'new word') floats out; he watches it with gentle wonder.", mood: "Curiosity, gentle discovery.", timeAndLighting: "Warm golden hour sunlight, soft bokeh.", supportingCharacters: "A small butterfly.", props: "Satchel, one glowing orb of light, NO letters or text anywhere.", composition: "Medium shot, Elofik and the glowing orb as the clear focal point." },
  },
  {
    slot: "family",
    label: "Rodzina i dziadkowie słuchają bajki",
    where: "Strona dla dziadków i sekcja „Dla rodziców i dziadków”",
    type: "INTERIOR",
    scene: { location: "A warm, cozy living room in the evening with a big soft armchair, a knitted blanket, a bookshelf and a window with a starry sky.", action: "Elofik stands on the armrest telling a story with an expressive smile and one hand gesturing, while a stylized grandmother and grandfather sit together on the sofa with a small child between them, all listening happily.", mood: "Closeness, warmth, family joy.", timeAndLighting: "Warm golden lamp light with a cool blue window.", supportingCharacters: "A stylized kind grandmother with silver hair and round glasses, a smiling grandfather with grey hair, and a small stylized child seen mostly from the side; all in the same storybook style, not realistic portraits.", props: "Storybook, knitted blanket, cups of tea.", composition: "Wide shot, Elofik clearly the hero on the left, family on the right." },
  },
  {
    slot: "goodnight",
    label: "Na dobranoc — Elofik macha z leśnej ścieżki",
    where: "Strona główna, końcowe wezwanie do działania",
    type: "INTERIOR",
    scene: { location: "A moonlit forest path with glowing mushrooms, fireflies and a small wooden signpost without any text, a starry sky above the treetops.", action: "Elofik waves goodbye with one raised hand (waving with the hand, the arm stays relaxed), holding his storybook under the other arm, smiling warmly.", mood: "Gentle, calm, promise of tomorrow's adventure.", timeAndLighting: "Calm night, soft silver moonlight with warm golden firefly glow.", supportingCharacters: "Fireflies only.", props: "Storybook, satchel, blank signpost.", composition: "Wide composition, Elofik centered in the lower half, plenty of calm sky above." },
  },
];

/** Dziesięć scen testowych spójności (sekcja 5 specyfikacji). */
export const TEST_SCENES: { id: string; title: string; type: ImageType; scene: SceneSpec }[] = [
  { id: "01", title: "Ciepły dom / powitanie", type: "COVER", scene: { location: "A cozy magical home reading nook with warm windows, wooden shelves, soft cushions, plants, and a welcoming lamp.", action: "Elofik holds an open navy-and-gold storybook and waves hello to the viewer.", mood: "Joyful, welcoming, reassuring.", timeAndLighting: "Gentle golden afternoon light.", supportingCharacters: "None.", props: "A few books and subtle golden sparkles.", composition: "Medium full-body shot; the face and hands are clear." } },
  { id: "02", title: "Zamek tajemnic", type: "COVER", scene: { location: "A beautiful enchanted castle library with high arches, old shelves, ornate doors, and softly glowing lanterns.", action: "Elofik discovers a mysterious glowing symbol in a book and looks delighted by the discovery.", mood: "Curiosity and wonder.", timeAndLighting: "Warm gold light mixed with cool navy castle shadows.", supportingCharacters: "None.", props: "Ancient scrolls, magic storybook, a few floating motes of light.", composition: "Three-quarter full-body view, castle clearly readable in the background." } },
  { id: "03", title: "Zaczarowany las", type: "INTERIOR", scene: { location: "A lush fairytale forest with mossy paths, softly glowing mushrooms, ancient trees, and delicate flowers.", action: "Elofik kneels to inspect tiny mysterious footprints in the ground.", mood: "Playful curiosity, safe adventure.", timeAndLighting: "Early morning sunlight filtering through leaves.", supportingCharacters: "A friendly squirrel watching nearby.", props: "Storybook tucked in Elofik's satchel, tiny footprints.", composition: "Wide storytelling view with Elofik in the foreground." } },
  { id: "04", title: "Przygoda z gwiazdami", type: "COVER", scene: { location: "A dreamy hilltop under a vast starry sky with gentle constellations and distant mountains.", action: "Elofik points up at a surprising new constellation while holding his book.", mood: "Awe, discovery and curiosity.", timeAndLighting: "Deep navy night, soft moonlight and warm golden magic.", supportingCharacters: "None.", props: "A small brass telescope.", composition: "Wide cinematic composition, strong silhouette of Elofik." } },
  { id: "05", title: "Pokój dziecka na dobranoc", type: "INTERIOR", scene: { location: "A calm, cozy child's bedroom with a soft blanket, bookshelf, moon-shaped night lamp and a window showing a gentle starry sky.", action: "Elofik sits on a rug, reading his magical book with a quiet, comforting smile.", mood: "Peaceful, warm, safe.", timeAndLighting: "Gentle bedtime lighting, warm lamp glow and cool blue window light.", supportingCharacters: "A small plush toy on the bed, no realistic child portraits.", props: "Storybook, cushions.", composition: "Medium-wide shot emphasizing comforting atmosphere." } },
  { id: "06", title: "Nad morzem", type: "COVER", scene: { location: "A bright seaside shore with rolling blue waves, pastel dunes, shells and distant sailboats.", action: "Elofik finds an unusual shell and examines it carefully, smiling in surprise.", mood: "Excited discovery, summer adventure.", timeAndLighting: "Golden morning sunlight with gentle cool ocean blues.", supportingCharacters: "A friendly crab near the shell.", props: "Shell, satchel, storybook.", composition: "Cheerful full-body view, beach setting recognizable." } },
  { id: "07", title: "Odkrywca dinozaurów", type: "COVER", scene: { location: "A lush prehistoric valley with towering ferns, warm cliffs and a distant waterfall.", action: "Elofik cautiously but joyfully observes a small friendly dinosaur emerging from the ferns.", mood: "Wonder and courage without fear.", timeAndLighting: "Warm daylight, atmospheric mist.", supportingCharacters: "One cute non-scary small dinosaur.", props: "A hand-drawn map and satchel.", composition: "Wide adventurous scene with Elofik as the foreground hero." } },
  { id: "08", title: "Pomysłowy warsztat", type: "INTERIOR", scene: { location: "A charming inventors' workshop filled with simple wooden mechanisms, paper sketches, cogs and little glowing lamps.", action: "Elofik proudly tests a tiny handmade flying machine, delighted that his idea worked.", mood: "Resourcefulness, persistence, joyful creativity.", timeAndLighting: "Warm indoor afternoon light.", supportingCharacters: "None.", props: "Safe wooden gadget, sketches, tools suitable for a whimsical children's setting.", composition: "Mid-shot focused on Elofik's expression and the invention." } },
  { id: "09", title: "W ogrodzie pełnym słów", type: "INTERIOR", scene: { location: "A magical botanical garden with colorful flowers, butterflies, bright leaves and winding stone paths.", action: "Elofik kneels to help a small hedgehog reach a safe path through the flowers.", mood: "Kindness, empathy, warmth.", timeAndLighting: "Soft golden spring morning.", supportingCharacters: "One friendly hedgehog and a butterfly.", props: "Storybook resting safely in Elofik's satchel.", composition: "Tender story moment, Elofik clearly visible." } },
  { id: "10", title: "Skok do magicznej książki", type: "COVER", scene: { location: "A magical story portal opening above a large navy-and-gold book in a bright fantasy library.", action: "Elofik leaps happily toward the swirling pages, inviting the viewer to enter the story with him.", mood: "Exhilarating, joyful adventure, magical anticipation.", timeAndLighting: "Golden light from the book, balanced by warm cream and deep navy shadows.", supportingCharacters: "None.", props: "Floating pages with abstract patterns ONLY, not readable text; golden sparkles.", composition: "Dynamic full-body composition, Elofik's face and signature ears remain readable." } },
];

/** Checklista akceptacji (sekcja 6) — wyświetlana przy każdej ilustracji w panelu. */
export const ACCEPTANCE_CHECKLIST = [
  "Twarz, nos, oczy i piegi zgodne z kanonem",
  "Ten sam karmelowy kolor i układ włosów",
  "To samo położenie, kształt i proporcje uszu",
  "Kostium szałwiowo-zielony + beżowe spodnie + brązowe dodatki",
  "Brak skojarzeń ze Świętym Mikołajem i Bożym Narodzeniem",
  "Scena oddaje fabułę konkretnej bajki",
  "Czytelny bohater w miniaturze mobilnej",
  "Brak pseudo-liter, niespójnej typografii i watermarków",
  "Właściwy format i miejsce na tytuł (okładka)",
];

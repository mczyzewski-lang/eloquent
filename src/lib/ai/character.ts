/**
 * Wzorzec postaci Elofika — wspólny prefiks każdego promptu ilustracji.
 * Zmiany tutaj = zmiana wyglądu bohatera w całej aplikacji (podbij CHARACTER_SHEET_VERSION).
 */
export const CHARACTER_SHEET_VERSION = "ELF_V3";

/** Arkusz referencyjny dołączany do każdego generowania (scripts/render-reference.tsx). */
export const REFERENCE_IMAGE_PATH = "public/brand/elofik-reference.png";

export const ELOFIK_CHARACTER_SHEET = `
Main character: ELOFIK — a small, cuddly storytelling ELF (not an animal, not a fennec fox, not an elephant).
- Softly pointed elf ears (his signature feature): clearly elfin but SHORT and WIDE — broad, leaf-shaped, pointing sideways and slightly up, sticking out only about a third of the head width, never long or horn-like; gently expressive.
- Gentle, intelligent, large warm-brown eyes; friendly child-like face; warm smile; rosy cheeks.
- Soft, slightly tousled chestnut-caramel hair.
- Warm peach-beige skin.
- Cozy sage-green knitted sweater, comfy warm-brown cloth boots, small leather word-bag across his shoulder with a faint golden glow.
- Proportions of a plush toy: rounded head, soft compact body, short limbs — easy to turn into a real plush.
- NO pointed Christmas hat, NO bells, NO red-and-green costume, NO reindeer, NO Santa, NO winter-holiday decorations.
Style: premium children's picture-book illustration in the SAME clean, soft, rounded vector style as the reference sheet —
smooth shapes, gentle gradients, no harsh outlines, warm golden light, subtle magical sparkles, calm composition,
cream (#FFF9F0) and peach (#F8DDD0) atmosphere with navy (#26344A) accents and warm gold (#F6C76D) highlights.
Never include text, logos or watermarks. Child-safe, calm, gentle.
`.trim();

export function illustrationPrompt(scene: string): string {
  const clean = scene.replace(/[\r\n]+/g, " ").slice(0, 600);
  return `${ELOFIK_CHARACTER_SHEET}\n\nScene: ${clean}`;
}

/**
 * Prompt okładki bajki. Obraz referencyjny jest przekazywany razem z promptem —
 * model ma odwzorować TĘ postać, a nie wymyślać nowego elfa.
 */
export function coverPrompt(story: { title: string; wordOfDay: string; illustrationPrompt: string; summary: string }): string {
  const scene = (story.illustrationPrompt || story.summary).replace(/[\r\n]+/g, " ").slice(0, 600);
  return [
    "The attached image is the official character reference sheet of ELOFIK. Draw EXACTLY this character:",
    "same face, same large warm-brown eyes, same short wide leaf-shaped elf ears, same tousled caramel hair with a small curl on top,",
    "same sage-green sweater, same brown boots, same small brown word-bag with a golden star on a diagonal strap. Do not redesign him, do not change his proportions, colours or outfit.",
    "Draw only ONE Elofik. Do not copy the reference layout, the white background or the caption text.",
    "",
    ELOFIK_CHARACTER_SHEET,
    "",
    `Book cover illustration for the bedtime audio story (do not write the title): ${scene}`,
    "Composition: wide landscape picture-book cover, Elofik clearly visible in the middle third, full scene background,",
    "keep the top-left corner and the bottom fifth calm and uncluttered (labels and the title are overlaid by the app).",
    "Absolutely no text, letters, numbers, logos or watermarks anywhere in the image.",
  ].join("\n");
}

export const PALETTE = {
  cream: "#FFF9F0",
  navy: "#26344A",
  gold: "#F6C76D",
  peach: "#F8DDD0",
  sage: "#9DB89A",
  teal: "#6FB7B0",
  skin: "#F3CBA8",
  hair: "#B9784A",
} as const;

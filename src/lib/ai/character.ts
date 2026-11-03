/**
 * Wzorzec postaci Elofika — wspólny prefiks każdego promptu ilustracji.
 * Zmiany tutaj = zmiana wyglądu bohatera w całej aplikacji (podbij CHARACTER_SHEET_VERSION).
 */
export const CHARACTER_SHEET_VERSION = "ELF_V2";

export const ELOFIK_CHARACTER_SHEET = `
Main character: ELOFIK — a small, cuddly storytelling ELF (not an animal, not a fennec fox, not an elephant).
- Softly pointed elf ears (his signature feature): clearly elfin but SHORT and proportionate — they stick out only about a third of the head width, never long or horn-like; gently expressive.
- Gentle, intelligent, large warm-brown eyes; friendly child-like face; warm smile; rosy cheeks.
- Soft, slightly tousled chestnut-caramel hair.
- Warm peach-beige skin.
- Cozy sage-green knitted sweater, comfy warm-brown cloth boots, small leather word-bag across his shoulder with a faint golden glow.
- Proportions of a plush toy: rounded head, soft compact body, short limbs — easy to turn into a real plush.
- NO pointed Christmas hat, NO bells, NO red-and-green costume, NO reindeer, NO Santa, NO winter-holiday decorations.
Style: premium children's storybook 3D illustration, soft felt and knitted fabric textures, warm golden light,
subtle magical sparkles, shallow depth of field, cream (#FFF9F0) and peach (#F8DDD0) atmosphere with navy (#26344A) accents and warm gold (#F6C76D) highlights.
Never include text, logos or watermarks. Child-safe, calm, gentle.
`.trim();

export function illustrationPrompt(scene: string): string {
  const clean = scene.replace(/[\r\n]+/g, " ").slice(0, 600);
  return `${ELOFIK_CHARACTER_SHEET}\n\nScene: ${clean}`;
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

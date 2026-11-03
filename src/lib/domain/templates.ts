/**
 * Silnik szablonów tekstowych dla segmentów i powitań.
 *
 * Zmienne:   {child}            → forma zwrotu (wołacz / zdrobnienie wg ustawień rodzica)
 *            {child.name}       → mianownik imienia dziecka
 *            {mom} {dad} {grandma} {grandpa} {brother} {sister} {dog} {cat} {other} → mianownik imienia bliskiego
 * Rodzaj:    {g:Gotowy|Gotowa|Gotowi}  → wg rodzaju gramatycznego dziecka (trzecia forma = neutralna)
 *
 * Reguła redakcyjna: imiona bliskich występują w szablonach WYŁĄCZNIE w mianowniku
 * („Babcia Basia powiedziała…”), dzięki czemu nietypowe imiona nie wymagają odmiany.
 */
import type { GrammaticalGender } from "./names";

export type RelationType = "mom" | "dad" | "grandma" | "grandpa" | "brother" | "sister" | "dog" | "cat" | "other";

export const RELATION_TYPES: RelationType[] = ["mom", "dad", "grandma", "grandpa", "brother", "sister", "dog", "cat", "other"];

export interface TemplateContext {
  child: { name: string; address: string; gender: GrammaticalGender | null };
  family: Partial<Record<RelationType, string>>;
  /** Dodatkowe zmienne, np. {giver} w bajce prezentowej. Zawsze w mianowniku. */
  extra?: Record<string, string>;
}

const VAR_RE = /\{([a-z]+)(?:\.([a-z]+))?\}/g;
const GENDER_RE = /\{g:([^|}]*)\|([^|}]*)\|([^}]*)\}/g;

/** Zwraca listę wymaganych zmiennych rodzinnych w szablonie. */
export function requiredRelations(template: string): RelationType[] {
  const out = new Set<RelationType>();
  for (const m of template.matchAll(VAR_RE)) {
    if ((RELATION_TYPES as string[]).includes(m[1])) out.add(m[1] as RelationType);
  }
  return [...out];
}

export function usesChild(template: string): boolean {
  return /\{child(\.name)?\}/.test(template) || /\{g:/.test(template);
}

export class MissingVariableError extends Error {
  constructor(public variable: string) {
    super(`Brak wartości dla zmiennej {${variable}}`);
  }
}

export function renderTemplate(template: string, ctx: TemplateContext): string {
  const withGender = template.replace(GENDER_RE, (_, m: string, f: string, n: string) =>
    ctx.child.gender === "m" ? m : ctx.child.gender === "f" ? f : n,
  );
  return withGender.replace(VAR_RE, (_, key: string, sub?: string) => {
    if (key === "child") return sub === "name" ? ctx.child.name : ctx.child.address;
    const v = ctx.extra?.[key] ?? ctx.family[key as RelationType];
    if (!v) throw new MissingVariableError(key);
    return v;
  });
}

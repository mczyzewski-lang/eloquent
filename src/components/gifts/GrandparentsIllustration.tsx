import { Elofik, Sparkles } from "@/components/elofik/Elofik";

/** Zastępcza ilustracja strony dla dziadków (do czasu akceptacji sceny „Rodzina” w Admin → Ilustracje). */
export function GrandparentsIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute inset-8 rounded-full bg-gold/30 blur-3xl" aria-hidden />
      <Sparkles />
      <div className="relative mx-auto w-4/5">
        <Elofik mood="telling" title="Elofik opowiada bajkę" />
      </div>
    </div>
  );
}

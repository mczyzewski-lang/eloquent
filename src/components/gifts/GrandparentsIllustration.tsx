import { Elofik, Sparkles } from "@/components/elofik/Elofik";

/** Zastępcza ilustracja strony dla dziadków (do czasu akceptacji sceny „Rodzina” w Admin → Ilustracje). */
export function GrandparentsIllustration() {
  return (
    <div className="relative mx-auto w-2/3 max-w-xs lg:w-full lg:max-w-md">
      <Sparkles />
      <div className="relative mx-auto w-4/5">
        <Elofik mood="telling" title="Elofik opowiada bajkę" />
      </div>
    </div>
  );
}

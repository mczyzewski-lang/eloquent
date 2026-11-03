import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo Elofika (grafika marki: public/brand/).
 * - "horizontal": postać z książką + napis obok — nagłówki
 * - "full": oryginalny układ (postać nad napisem) — stopka, strony specjalne
 */
export function Logo({ className, variant = "horizontal", priority = false }: { className?: string; variant?: "horizontal" | "full"; priority?: boolean }) {
  if (variant === "full") {
    return <Image src="/brand/elofik-logo.png" alt="Elofik" width={943} height={998} priority={priority} className={cn("h-auto w-36", className)} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Image src="/brand/elofik-mark.png" alt="" width={900} height={646} priority={priority} className="h-12 w-auto" />
      <Image src="/brand/elofik-wordmark.png" alt="Elofik" width={943} height={352} priority={priority} className="h-8 w-auto" />
    </span>
  );
}

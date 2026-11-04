import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo Elofika (grafika marki: public/brand/elofik-logo.png — Elofik z książką w granatowym kole + napis).
 * - "horizontal": kompaktowe logo do nagłówków
 * - "full": większe logo — stopka, strony specjalne
 */
export function Logo({ className, variant = "horizontal", priority = false }: { className?: string; variant?: "horizontal" | "full"; priority?: boolean }) {
  return (
    <Image
      src="/brand/elofik-logo.webp"
      alt="Elofik"
      width={600}
      height={653}
      priority={priority}
      className={cn(variant === "full" ? "h-auto w-36" : "h-14 w-auto", className)}
    />
  );
}

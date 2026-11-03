import Link from "next/link";
import { Logo } from "@/components/elofik/Elofik";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader({ variant = "parents" }: { variant?: "parents" | "grandparents" | "app" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-navy/5 bg-cream/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href={variant === "app" ? "/app" : "/"} aria-label="Elofik — strona główna">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {variant === "app" ? (
            <>
              <Link href="/app" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>Bajki</Link>
              <Link href="/konto" className={buttonVariants({ variant: "soft", size: "sm" })}>Konto rodzica</Link>
            </>
          ) : (
            <>
              <Link href={variant === "parents" ? "/dla-dziadkow" : "/"} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
                {variant === "parents" ? "Dla dziadków" : "Dla rodziców"}
              </Link>
              <Link href="/logowanie" className={buttonVariants({ variant: "soft", size: "sm" })}>Zaloguj</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-navy/5 bg-cream-deep/50 py-12 text-sm text-muted">
      <div className="container-page grid gap-8 sm:grid-cols-3">
        <div>
          <Logo className="text-xl" />
          <p className="mt-3 max-w-xs">Elofik — codziennie jedno mądre słowo.<br />Little stories. Big words.</p>
        </div>
        <ul className="space-y-2">
          <li><Link href="/dla-dziadkow" className="hover:text-navy">Prezent od dziadków</Link></li>
          <li><Link href="/subskrypcja" className="hover:text-navy">Abonament</Link></li>
          <li><Link href="/demo" className="hover:text-navy">Demo</Link></li>
        </ul>
        <ul className="space-y-2">
          <li><Link href="/polityka-prywatnosci" className="hover:text-navy">Polityka prywatności</Link></li>
          <li><Link href="/regulamin" className="hover:text-navy">Regulamin</Link></li>
          <li><a href="mailto:pomoc@elofik.com" className="hover:text-navy">pomoc@elofik.com</a></li>
        </ul>
      </div>
      <p className="container-page mt-8 text-xs">© {new Date().getFullYear()} Elofik. Bajki dla dzieci słuchane pod opieką dorosłych.</p>
    </footer>
  );
}

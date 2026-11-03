"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Coins, Image as ImageIcon, LayoutDashboard, MessageCircle, Mic2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bajki", label: "CMS bajek", icon: BookOpen },
  { href: "/admin/ilustracje", label: "Ilustracje", icon: ImageIcon },
  { href: "/admin/glos", label: "Głos Elofika", icon: Mic2 },
  { href: "/admin/powitania", label: "Powitania", icon: MessageCircle },
  { href: "/admin/koszty", label: "Koszty AI", icon: Coins },
  { href: "/admin/ustawienia", label: "Ustawienia i klucze API", icon: Settings },
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Panel administracyjny" className="flex gap-0.5 overflow-x-auto lg:flex-col">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[5px] px-2 py-1 text-[13.5px] text-[#5f5e5b] hover:bg-[rgb(55_53_47/0.06)]",
              active && "bg-[rgb(55_53_47/0.08)] font-medium text-[#37352f]",
            )}
          >
            <Icon className="h-4 w-4 text-[#91918e]" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

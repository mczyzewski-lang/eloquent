import { Elofik, Sparkles } from "@/components/elofik/Elofik";

/** Elofik, dziecko i dziadkowie — prosta, ciepła kompozycja wektorowa. */
export function GrandparentsIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute inset-8 rounded-full bg-gold/25 blur-3xl" aria-hidden />
      <Sparkles />
      <svg viewBox="0 0 400 300" className="relative w-full" role="img" aria-label="Babcia, dziadek i wnuk słuchają opowieści Elofika">
        <ellipse cx="200" cy="285" rx="170" ry="10" fill="#26344A" opacity="0.1" />
        {/* babcia */}
        <g transform="translate(40 120)">
          <path d="M10 160 Q10 90 60 90 Q110 90 110 160 Z" fill="#C98F9A" />
          <circle cx="60" cy="62" r="36" fill="#F3CBA8" />
          <path d="M24 60 Q24 20 60 22 Q96 20 96 60 Q86 40 60 42 Q34 40 24 60Z" fill="#E6E2DC" />
          <circle cx="60" cy="22" r="14" fill="#E6E2DC" />
          <circle cx="48" cy="64" r="8" fill="none" stroke="#6B7486" strokeWidth="2.5" />
          <circle cx="72" cy="64" r="8" fill="none" stroke="#6B7486" strokeWidth="2.5" />
          <path d="M50 80 Q60 88 70 80" stroke="#B5524A" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        {/* dziadek */}
        <g transform="translate(250 110)">
          <path d="M10 170 Q10 96 60 96 Q110 96 110 170 Z" fill="#6F8FB0" />
          <circle cx="60" cy="64" r="38" fill="#F3CBA8" />
          <path d="M26 56 Q30 30 50 28 Q40 40 42 48 Z M94 56 Q90 30 70 28 Q80 40 78 48 Z" fill="#D9D4CC" />
          <path d="M40 84 Q60 100 80 84 Q78 96 60 98 Q42 96 40 84Z" fill="#E6E2DC" />
          <circle cx="48" cy="64" r="4" fill="#4A2F22" />
          <circle cx="72" cy="64" r="4" fill="#4A2F22" />
        </g>
        {/* dziecko */}
        <g transform="translate(150 170)">
          <path d="M14 110 Q14 64 50 64 Q86 64 86 110 Z" fill="#F6C76D" />
          <circle cx="50" cy="40" r="28" fill="#F3CBA8" />
          <path d="M22 38 Q22 10 50 12 Q78 10 78 38 Q70 24 50 26 Q30 24 22 38Z" fill="#8A5A3B" />
          <circle cx="41" cy="42" r="3.5" fill="#4A2F22" />
          <circle cx="59" cy="42" r="3.5" fill="#4A2F22" />
          <path d="M42 54 Q50 60 58 54" stroke="#B5524A" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      </svg>
      <div className="absolute left-1/2 top-0 w-28 -translate-x-1/2 sm:w-32">
        <Elofik mood="telling" />
      </div>
    </div>
  );
}

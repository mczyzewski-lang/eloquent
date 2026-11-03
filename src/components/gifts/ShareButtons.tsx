"use client";

import { useState } from "react";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/client/analytics";

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Button variant="soft" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); track("gift_shared", { via: "copy" }); }}>
        <Copy className="h-5 w-5" /> {copied ? "Skopiowano!" : "Skopiuj link"}
      </Button>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => track("gift_shared", { via: "whatsapp" })} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 font-display font-semibold text-white">
        <MessageCircle className="h-5 w-5" /> WhatsApp
      </a>
      <Button variant="soft" disabled={!canShare} onClick={() => { void navigator.share?.({ title: "Elofik", text, url }); track("gift_shared", { via: "native" }); }}>
        <Share2 className="h-5 w-5" /> Udostępnij
      </Button>
    </div>
  );
}

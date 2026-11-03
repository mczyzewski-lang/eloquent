"use client";
import { useEffect } from "react";
import { track } from "@/lib/client/analytics";

export function PageView({ event, props }: { event: string; props?: Record<string, string | number | boolean | null> }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    track(event, { ...props, utm_source: params.get("utm_source"), utm_campaign: params.get("utm_campaign"), ref: params.get("ref") });
    const ref = params.get("ref");
    if (ref && /^[a-z0-9]{6,12}$/.test(ref)) {
      try {
        localStorage.setItem("elofik_ref", ref);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

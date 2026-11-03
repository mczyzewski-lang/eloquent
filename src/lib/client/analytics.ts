"use client";
/** Lekki klient analityki — anonimowy identyfikator w localStorage, bez cookies śledzących. */
export function anonId(): string {
  try {
    let id = localStorage.getItem("elofik_anon");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("elofik_anon", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function track(name: string, props: Record<string, string | number | boolean | null> = {}) {
  try {
    const body = JSON.stringify({ name, props, anonId: anonId() });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    else void fetch("/api/analytics", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {
    /* analityka nigdy nie blokuje UX */
  }
}

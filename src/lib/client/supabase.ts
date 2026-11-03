"use client";
import { createBrowserClient } from "@supabase/ssr";

export function browserSupabase(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}

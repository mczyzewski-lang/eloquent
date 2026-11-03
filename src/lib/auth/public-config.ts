import { config, isDemoMode } from "@/lib/config";
import type { AuthConfig } from "@/components/onboarding/AuthForm";

export function authConfig(): AuthConfig {
  return { demo: isDemoMode(), supabaseUrl: config.supabase.url, supabaseAnonKey: config.supabase.anonKey };
}

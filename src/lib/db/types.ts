/** Wiersze tabel (snake_case — 1:1 z migracjami SQL w supabase/migrations). */
import type { GrammaticalGender, AddressStyle } from "@/lib/domain/names";
import type { RelationType } from "@/lib/domain/templates";
import type { StoryVersion } from "@/lib/domain/story";
import type { CostProvider, CostPurpose } from "@/lib/domain/budget";
import type { ReferralReward } from "@/lib/domain/referral";

export interface UserRow { id: string; email: string | null; phone?: string | null; is_admin: boolean; created_at: string }

/** Własna bajka rodziny (pomysł rodzica → AI → głos Elofika). `story` to StoryVersion ze zmiennymi zamiast imion. */
export interface CustomStoryRow { id: string; family_id: string; child_id: string | null; story_id: string; idea: string; title: string; word: string; story: Record<string, unknown>; created_at: string }

/** Jednorazowy kod logowania SMS (przechowywany wyłącznie jako HMAC). */
export interface PhoneOtpRow { id: string; phone: string; code_hash: string; expires_at: string; attempts: number; consumed_at: string | null; created_at: string }

export interface FamilyRow {
  id: string;
  owner_user_id: string;
  timezone: string;
  locale: "pl" | "en" | "es" | "de" | "fr";
  activated_at: string | null;
  referral_code: string;
  referred_by_code: string | null;
  voice_greeting_enabled: boolean;
  voice_consent_at: string | null;
  marketing_consent_at: string | null;
  stripe_customer_id: string | null;
  /** Stała pora słuchania (rutyna) — patrz lib/domain/routine.ts */
  listening_routine?: string | null;
  /** Aktywne dziecko (gdy w rodzinie jest więcej dzieci) */
  active_child_id?: string | null;
  created_at: string;
}

export interface ChildProfileRow {
  id: string;
  family_id: string;
  name: string;
  age: number;
  diminutive: string | null;
  vocative_override: string | null;
  diminutive_vocative_override: string | null;
  gender: GrammaticalGender | null;
  address_style: AddressStyle;
  created_at: string;
}

export interface FamilyMemberRow { id: string; family_id: string; relation: RelationType; name: string; sort_order: number; created_at: string }
export interface InterestRow { id: string; label_pl: string; label_en: string; icon: string }
export interface ChildInterestRow { id: string; child_id: string; interest_id: string }

export interface StoryRow {
  id: string; // slug
  day_number: number;
  locale: string;
  current_version: number;
  status: StoryVersion["status"];
  scheduled_for: string | null;
  /** Okładka wygenerowana przez OpenAI (ścieżka w storage) — wspólna dla wszystkich rodzin. */
  cover_path?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryVersionRow {
  id: string;
  story_id: string;
  version: number;
  data: StoryVersion; // pełny manifest (segmenty dodatkowo w story_segments w SQL)
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AudioCacheRow {
  id: string;
  cache_key: string;
  storage_path: string;
  duration_ms: number;
  chars: number;
  provider: "elevenlabs" | "mock";
  voice_version: string;
  segment_type: string;
  shared: boolean;
  hits: number;
  created_at: string;
}

export interface AudioAssemblyRow {
  id: string;
  assembly_key: string;
  story_id: string;
  story_version: number;
  storage_path: string;
  duration_ms: number;
  segment_keys: string[];
  timeline: { segmentId: string; startMs: number; endMs: number; text: string }[];
  created_at: string;
}

export interface FamilyAssemblyRow { id: string; family_id: string; story_id: string; assembly_key: string; created_at: string }

export interface GreetingTemplateRow {
  id: string;
  variant_id: string;
  locale: string;
  kind: "FIRST_MEETING" | "RETURNING_NEXT_DAY" | "RETURNING_SAME_DAY" | "RETURNING_AFTER_BREAK";
  template: string;
  active: boolean;
  updated_at: string;
}

export interface GreetingAudioRow {
  id: string;
  child_name_key: string;
  variant_id: string;
  voice_version: string;
  locale: string;
  address: string;
  cache_key: string;
  text: string;
  created_at: string;
}

export interface VoiceGreetingSessionRow {
  id: string;
  family_id: string;
  story_id: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  outcome: "pending" | "recognized" | "failed" | "timeout" | "error" | "skipped";
  attempt: number;
  // UWAGA: nie zapisujemy nagrania ani pełnej transkrypcji — tylko wynik dopasowania.
  match_confidence: number | null;
}

export interface ListeningProgressRow {
  id: string;
  family_id: string;
  story_id: string;
  position_sec: number;
  duration_sec: number;
  completed: boolean;
  play_count: number;
  favorite: boolean;
  /** Rodzic potwierdził rozmowę o słowie dnia — odsłuchanie ≠ opanowanie słowa. */
  word_discussed: boolean;
  first_played_at: string | null;
  last_played_at: string | null;
}

export interface StoryUnlockRow { id: string; family_id: string; story_id: string; day_number: number; unlocked_at: string }

export interface SubscriptionRow {
  id: string;
  family_id: string;
  source: "stripe" | "gift" | "referral" | "demo";
  stripe_subscription_id: string | null;
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "unpaid" | "expired";
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  family_id: string | null;
  stripe_invoice_id: string | null;
  stripe_session_id: string | null;
  kind: "subscription" | "gift";
  amount_gross: number;
  currency: string;
  status: "paid" | "failed" | "refunded";
  created_at: string;
}

export interface GiftPurchaseRow {
  id: string;
  buyer_email: string;
  giver_name: string;
  giver_relation: "grandma" | "grandpa" | "other";
  child_name: string;
  child_age: number;
  family_members: { relation: RelationType; name: string }[];
  interests: string[];
  parent_email: string | null;
  stripe_session_id: string | null;
  status: "pending" | "paid" | "redeemed" | "expired" | "refunded";
  token_hash: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_family_id: string | null;
  created_at: string;
}

export interface GiftEntitlementRow { id: string; family_id: string; gift_purchase_id: string; starts_at: string; ends_at: string; created_at: string }

export interface GiftStoryRow {
  id: string;
  token_hash: string;
  child_name: string;
  child_age: number;
  giver_relation: "grandma" | "grandpa";
  giver_name: string;
  interests: string[];
  assembly_key: string | null;
  expires_at: string;
  play_count: number;
  created_at: string;
}

export interface ReferralRow {
  id: string;
  referrer_family_id: string;
  referee_family_id: string;
  status: "pending" | "qualified" | "rejected";
  reason: string | null;
  qualified_at: string | null;
  created_at: string;
}

export interface ReferralRewardRow { id: string; family_id: string; reward: ReferralReward; granted_at: string }

export interface GenerationJobRow {
  id: string;
  type: "render_story" | "render_greeting" | "generate_core" | "generate_script" | "generate_illustration" | "send_daily_email";
  payload: Record<string, unknown>;
  status: "queued" | "running" | "done" | "failed";
  attempts: number;
  max_attempts: number;
  run_at: string;
  locked_at: string | null;
  locked_by: string | null;
  error: string | null;
  dedupe_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiCostLogRow {
  id: string;
  provider: CostProvider;
  purpose: CostPurpose;
  usd: number;
  units: number; // znaki TTS / sekundy STT / tokeny / obrazy
  cache_hit: boolean;
  family_id: string | null;
  story_id: string | null;
  created_at: string;
}

export interface AnalyticsEventRow {
  id: string;
  name: string;
  family_id: string | null;
  anon_id: string | null;
  props: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface NotificationPreferencesRow {
  id: string;
  family_id: string;
  email_daily: boolean;
  push_enabled: boolean;
  send_hour: number;
  updated_at: string;
}

export interface AdminAuditLogRow { id: string; actor_user_id: string; action: string; target: string | null; meta: Record<string, unknown>; created_at: string }

/** Ustawienia z panelu admina. Sekrety zaszyfrowane (AES-256-GCM), nigdy nie wracają do przeglądarki. */
export interface AppSettingRow { id: string; key: string; value_encrypted: string; updated_by: string | null; updated_at: string }

/** Kandydaci na głos Elofika (Voice Design ElevenLabs lub głos z biblioteki) z próbką demo. */
export interface VoiceCandidateRow {
  id: string;
  source: "design" | "library";
  name: string;
  description: string;
  generated_voice_id: string | null; // podgląd z Voice Design (przed zapisaniem)
  voice_id: string | null; // zapisany głos w bibliotece ElevenLabs
  preview_path: string | null; // próbka demo w storage
  demo_text: string;
  /** To samo demo w różnych modelach TTS (porównanie v2 / v3 / …). */
  model_demos?: { model: string; path: string | null; error: string | null }[];
  created_at: string;
}

/** Wersjonowane, niezmienne obrazy referencyjne Elofika (master reference + character sheet). */
export interface ReferenceAssetRow {
  id: string;
  kind: "master" | "sheet";
  version: number;
  label: string;
  storage_path: string;
  status: "proposed" | "approved" | "retired";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

/** Ilustracje (okładki, sceny, maskotki) — każda wersja osobno, publikacja dopiero po akceptacji. */
export interface IllustrationRow {
  id: string;
  /** storyId bajki lub "__mascot__" (pozy maskotki do UI) lub "__test__" (sceny testowe spójności) */
  story_id: string;
  story_version: number;
  image_type: "COVER" | "INTERIOR" | "CHARACTER_ONLY";
  slot: string | null; // np. poza maskotki: idle/waving/…, id sceny testowej
  version: number;
  scene: Record<string, string>;
  prompt: string;
  prompt_version: string;
  reference_id: string;
  reference_version: number;
  model: string;
  size: string;
  quality: string;
  cache_key: string;
  storage_path: string | null;
  status: "pending" | "approved" | "rejected" | "failed";
  est_usd: number;
  error: string | null;
  created_by: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface RateLimitRow { id: string; key: string; window_start: string; count: number }

export interface Tables {
  users: UserRow;
  families: FamilyRow;
  child_profiles: ChildProfileRow;
  family_members: FamilyMemberRow;
  interests: InterestRow;
  child_interests: ChildInterestRow;
  stories: StoryRow;
  story_versions: StoryVersionRow;
  audio_cache: AudioCacheRow;
  audio_assemblies: AudioAssemblyRow;
  family_assemblies: FamilyAssemblyRow;
  greetings: GreetingTemplateRow;
  greeting_audio_cache: GreetingAudioRow;
  voice_greeting_sessions: VoiceGreetingSessionRow;
  listening_progress: ListeningProgressRow;
  story_unlocks: StoryUnlockRow;
  subscriptions: SubscriptionRow;
  payments: PaymentRow;
  gift_purchases: GiftPurchaseRow;
  gift_entitlements: GiftEntitlementRow;
  gift_stories: GiftStoryRow;
  referrals: ReferralRow;
  referral_rewards: ReferralRewardRow;
  generation_jobs: GenerationJobRow;
  ai_cost_logs: AiCostLogRow;
  analytics_events: AnalyticsEventRow;
  notification_preferences: NotificationPreferencesRow;
  admin_audit_logs: AdminAuditLogRow;
  rate_limits: RateLimitRow;
  phone_otps: PhoneOtpRow;
  custom_stories: CustomStoryRow;
  app_settings: AppSettingRow;
  voice_candidates: VoiceCandidateRow;
  reference_assets: ReferenceAssetRow;
  illustrations: IllustrationRow;
}

export type TableName = keyof Tables;

export type FilterOp<V> = V | null | { gte?: V; lte?: V; gt?: V; lt?: V; in?: V[]; neq?: V | null };
export type Filter<T> = { [K in keyof T]?: FilterOp<T[K]> };

export interface FindOptions<T> {
  orderBy?: { column: keyof T & string; ascending?: boolean };
  limit?: number;
}

export interface Db {
  find<N extends TableName>(table: N, filter?: Filter<Tables[N]>, opts?: FindOptions<Tables[N]>): Promise<Tables[N][]>;
  findOne<N extends TableName>(table: N, filter: Filter<Tables[N]>): Promise<Tables[N] | null>;
  count<N extends TableName>(table: N, filter?: Filter<Tables[N]>): Promise<number>;
  insert<N extends TableName>(table: N, row: Omit<Tables[N], "id"> & { id?: string }): Promise<Tables[N]>;
  update<N extends TableName>(table: N, filter: Filter<Tables[N]>, patch: Partial<Tables[N]>): Promise<Tables[N][]>;
  /** Wstawia albo aktualizuje wiersz wg kolumn unikalnych `conflict`. */
  upsert<N extends TableName>(table: N, row: Omit<Tables[N], "id"> & { id?: string }, conflict: (keyof Tables[N] & string)[]): Promise<Tables[N]>;
  delete<N extends TableName>(table: N, filter: Filter<Tables[N]>): Promise<number>;
  /** Atomowo przejmuje najstarsze zadanie z kolejki (FOR UPDATE SKIP LOCKED w Postgres). */
  claimJob(workerId: string, types?: GenerationJobRow["type"][]): Promise<GenerationJobRow | null>;
  /** Atomowy licznik (rate limiting / liczniki wywołań). */
  incrementCounter(key: string, windowStart: string): Promise<number>;
}

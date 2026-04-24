// ── SUPABASE STORAGE ADAPTER ──
// Replaces window.storage with Supabase backend
// Table: kv_store (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── API giống window.storage để không phải đổi code cũ ──

export const storage = {
  async get(key) {
    try {
      const { data, error } = await supabase
        .from("kv_store")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error || !data) return null;
      return { key, value: data.value };
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      const { error } = await supabase
        .from("kv_store")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) { console.warn("[supabase] set error:", key, error.message); return null; }
      return { key, value };
    } catch (e) {
      console.warn("[supabase] set exception:", e);
      return null;
    }
  },

  async delete(key) {
    try {
      await supabase.from("kv_store").delete().eq("key", key);
      return { key, deleted: true };
    } catch {
      return null;
    }
  },

  async list(prefix) {
    try {
      let q = supabase.from("kv_store").select("key");
      if (prefix) q = q.like("key", `${prefix}%`);
      const { data } = await q;
      return { keys: (data || []).map((r) => r.key) };
    } catch {
      return { keys: [] };
    }
  },
};

// ── REALTIME SYNC ──
// Gọi hàm này 1 lần trong App để lắng nghe thay đổi từ Supabase
// callback(key, value) được gọi mỗi khi có INSERT/UPDATE trên kv_store
export function subscribeToChanges(callback) {
  const channel = supabase
    .channel("kv_store_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "kv_store" },
      (payload) => {
        const { new: row } = payload;
        if (row?.key && row?.value) {
          try {
            callback(row.key, JSON.parse(row.value));
          } catch {
            callback(row.key, row.value);
          }
        }
      }
    )
    .subscribe();

  // Trả về hàm unsubscribe để cleanup
  return () => supabase.removeChannel(channel);
}


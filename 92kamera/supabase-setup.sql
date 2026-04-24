-- Chạy lệnh này trong Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS kv_store (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cho phép đọc/ghi không cần login (anon key)
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON kv_store
  FOR ALL
  USING (true)
  WITH CHECK (true);

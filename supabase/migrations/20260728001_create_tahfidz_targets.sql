-- Create tahfidz_targets table for storing weekly targets per student
CREATE TABLE IF NOT EXISTS tahfidz_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  kelas TEXT NOT NULL,
  target_mingguan INTEGER NOT NULL DEFAULT 15,
  surat_mulai TEXT DEFAULT '',
  ayat_mulai TEXT DEFAULT '',
  surat_selesai TEXT DEFAULT '',
  ayat_selesai TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nama, kelas)
);

-- Enable Row Level Security
ALTER TABLE tahfidz_targets ENABLE ROW LEVEL SECURITY;

-- Allow anon access (since the app uses anon key)
CREATE POLICY anon_select ON tahfidz_targets FOR SELECT USING (true);
CREATE POLICY anon_insert ON tahfidz_targets FOR INSERT WITH CHECK (true);
CREATE POLICY anon_update ON tahfidz_targets FOR UPDATE USING (true);
CREATE POLICY anon_delete ON tahfidz_targets FOR DELETE USING (true);

-- Create tahfidz_pengecualian table for storing exclusion days
-- (Tahsin Teori, kegiatan, libur nasional) per kelas per tanggal.
-- Baris dengan `guru` TERISI = pengecualian kelompok (semua siswa yang
-- dibimbing guru tsb di kelas itu); `guru` kosong = pengecualian seluruh kelas.
CREATE TABLE IF NOT EXISTS tahfidz_pengecualian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas TEXT NOT NULL,
  tanggal DATE NOT NULL,
  alasan TEXT NOT NULL DEFAULT '',
  guru TEXT DEFAULT '',
  catatan TEXT DEFAULT '',
  dibuat_oleh TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kelas, tanggal, guru)
);

DROP TRIGGER IF EXISTS trg_tahfidz_pengecualian_updated_at ON tahfidz_pengecualian;
CREATE TRIGGER trg_tahfidz_pengecualian_updated_at
  BEFORE UPDATE ON tahfidz_pengecualian
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable Row Level Security
ALTER TABLE tahfidz_pengecualian ENABLE ROW LEVEL SECURITY;

-- Allow anon access (since the app uses anon key)
CREATE POLICY anon_select ON tahfidz_pengecualian FOR SELECT USING (true);
CREATE POLICY anon_insert ON tahfidz_pengecualian FOR INSERT WITH CHECK (true);
CREATE POLICY anon_update ON tahfidz_pengecualian FOR UPDATE USING (true);
CREATE POLICY anon_delete ON tahfidz_pengecualian FOR DELETE USING (true);
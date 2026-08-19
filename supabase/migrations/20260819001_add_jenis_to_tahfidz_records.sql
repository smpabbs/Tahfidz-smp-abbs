-- Add `jenis` column for Murojaah / Tilawah tracking.
-- Every row is tagged 'ziyadah' | 'murojaah' | 'tilawah' by originating tab,
-- including absence rows (menghafal = sakit/sertifikasi/lainnya) — this is
-- what makes Rekap's Jenis filter find an absence logged from the
-- Murajaah/Tilawah tab. Default 'ziyadah' so pre-existing rows behave as before.
ALTER TABLE tahfidz_records
  ADD COLUMN IF NOT EXISTS jenis TEXT NOT NULL DEFAULT 'ziyadah'
  CHECK (jenis IN ('ziyadah', 'murojaah', 'tilawah'));
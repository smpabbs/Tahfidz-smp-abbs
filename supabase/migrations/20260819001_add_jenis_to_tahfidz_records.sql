-- Add `jenis` column for Murojaah / Tilawah tracking.
-- Positive activities used by the input form: 'ziyadah' | 'murojaah' | 'tilawah'.
-- Absence records keep `menghafal` = sakit/sertifikasi/lainnya and tipos NULL.
-- Default 'ziyadah' so existing rows (and new rows) behave as before.
ALTER TABLE tahfidz_records
  ADD COLUMN IF NOT EXISTS jenis TEXT NOT NULL DEFAULT 'ziyadah'
  CHECK (jenis IN ('ziyadah', 'murojaah', 'tilawah'));
-- Baseline schema untuk 4 tabel inti yang sudah ada di project Supabase
-- SEBELUM migration tracking dimulai (migration pertama yang tercatat
-- di repo ini baru 20260728001) — dibuat lewat dashboard/SQL editor
-- Supabase langsung, jadi DDL aslinya tidak pernah masuk repo.
--
-- Tujuan file ini murni DOKUMENTASI/REPRODUKSI: `CREATE TABLE IF NOT
-- EXISTS` supaya aman dijalankan berkali-kali dan tidak menyentuh tabel
-- yang sudah ada di project produksi (no-op kalau tabel sudah ada).
-- Struktur kolom & tipe di bawah direkonstruksi dari dua sumber:
--   1. Payload yang dikirim/dibaca kode klien (js/services/database.js,
--      js/features/master-data.js, js/ui/dropdowns.js)
--   2. Sample row nyata dari tiap tabel (dibaca read-only lewat anon key,
--      REST API Supabase) untuk memastikan tipe (uuid/text/numeric/bool)
--      bukan tebakan buta.
-- BUKAN introspeksi langsung ke information_schema (perlu service_role
-- key yang sengaja tidak dipakai/diminta di sini) — jadi constraint yang
-- tidak kelihatan dari pola pemakaian di atas (RLS policy, index
-- tambahan, NOT NULL yang tidak esensial) mungkin tidak lengkap. Kolom
-- `jenis` SENGAJA tidak dimasukkan di sini — itu ditambahkan belakangan
-- oleh 20260819001_add_jenis_to_tahfidz_records.sql, urutan file ini
-- (tanggal lebih awal) memastikan ALTER itu tetap jalan sesudahnya.

-- ============================================================
-- Trigger bersama: auto-update kolom updated_at tiap kali UPDATE.
-- Data produksi (baris sample tahfidz_records/master_*) menunjukkan
-- updated_at berubah independen dari created_at padahal kode klien
-- (database.js/master-data.js) tidak pernah mengirim updated_at secara
-- eksplisit — kuat dugaan trigger seperti ini sudah ada di produksi.
-- DROP+CREATE supaya idempotent (Postgres tidak punya
-- "CREATE TRIGGER IF NOT EXISTS").
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- tahfidz_records — satu baris per aktivitas (Ziyadah/Murajaah/Tilawah)
-- per siswa per hari. Diisi dari tab Input, dibaca/diedit dari tab Hasil.
-- ============================================================
CREATE TABLE IF NOT EXISTS tahfidz_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guru         TEXT,
  token_guru   TEXT,
  nama         TEXT NOT NULL,
  kelas        TEXT NOT NULL,
  whatsapp     TEXT,
  tanggal      DATE NOT NULL,
  baris        NUMERIC NOT NULL DEFAULT 0,
  menghafal    TEXT NOT NULL DEFAULT 'ya',
  alasan       TEXT DEFAULT '',
  surat        TEXT DEFAULT '',
  ayat_dari    NUMERIC,
  ayat_sampai  NUMERIC,
  keterangan   TEXT DEFAULT '',
  catatan      TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_tahfidz_records_updated_at ON tahfidz_records;
CREATE TRIGGER trg_tahfidz_records_updated_at
  BEFORE UPDATE ON tahfidz_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- master_siswa — dropdown "Nama Siswa" di tab Input, dikelola di
-- Master Data. whatsapp dipakai untuk notifikasi ke orang tua.
-- ============================================================
CREATE TABLE IF NOT EXISTS master_siswa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        TEXT NOT NULL,
  kelas_name  TEXT NOT NULL,
  whatsapp    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_master_siswa_updated_at ON master_siswa;
CREATE TRIGGER trg_master_siswa_updated_at
  BEFORE UPDATE ON master_siswa
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- master_kelas — dropdown "Kelas" di tab Input & filter Hasil.
-- ============================================================
CREATE TABLE IF NOT EXISTS master_kelas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas_name  TEXT NOT NULL,
  label       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_master_kelas_updated_at ON master_kelas;
CREATE TRIGGER trg_master_kelas_updated_at
  BEFORE UPDATE ON master_kelas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- master_guru — dropdown "Nama Guru" di tab Input. token_fonnte dipakai
-- untuk mengirim notifikasi WA atas nama guru yang login.
-- ============================================================
CREATE TABLE IF NOT EXISTS master_guru (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          TEXT NOT NULL,
  token_fonnte  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_master_guru_updated_at ON master_guru;
CREATE TRIGGER trg_master_guru_updated_at
  BEFORE UPDATE ON master_guru
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CATATAN PENTING: Row Level Security & grants TIDAK direkonstruksi di
-- sini — anon key project ini terbukti bisa SELECT bebas dari semua
-- tabel di atas (dicek read-only saat menulis migrasi ini), jadi RLS
-- kemungkinan disabled atau punya policy permisif untuk role anon.
-- Kalau file ini dipakai untuk membangun ulang project dari nol,
-- pastikan atur RLS/policy secara manual sesuai kebutuhan keamanan yang
-- diinginkan — jangan asumsikan default Postgres (RLS off) otomatis
-- aman untuk project publik.

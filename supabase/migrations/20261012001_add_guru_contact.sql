-- Tambah kontak guru (nomor WA + gender) di master_guru — dipakai fitur
-- pengingat WA otomatis (routing pengirim berdasarkan gender target,
-- lihat scripts/kirim-pengingat-guru.mjs). Data per-baris diisi langsung
-- via UPDATE terpisah (bukan di migration ini) supaya nomor HP tidak
-- ikut masuk riwayat migration sebagai teks polos.

ALTER TABLE master_guru
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('putra', 'putri'));

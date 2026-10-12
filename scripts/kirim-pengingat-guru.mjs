// ====================================================
// scripts/kirim-pengingat-guru.mjs
// Pengingat WA otomatis ke guru yang belum input setoran tahfidz.
// Dijalankan oleh .github/workflows/pengingat-guru.yml (GitHub Actions
// schedule), bisa juga dijalankan manual: `node scripts/kirim-pengingat-guru.mjs`
//
// Spesifikasi (disepakati 9 Okt 2026, lihat memory wa-pengingat-guru.md):
// - Routing pengirim berdasar GENDER target (bukan pengirim tetap):
//   guru putra belum isi -> dikirim dari token Ustadzah Naya
//   guru putri belum isi -> dikirim dari token Us Fahmi
// - Cakupan: semua sesi due sejak baseline BASELINE_DATE s.d. hari ini,
//   ikut semua aturan pengecualian yang sudah ada di lapor/index.html
//   (libur/kegiatan, kelompok Tahsin Teori, Tasmi Akbar Selasa jam 1-2).
// - 1 pesan per guru merangkum semua sesi bolong, jam berurutan digabung,
//   TANPA batas panjang, TANPA kalimat "dikirim otomatis oleh sistem".
// - Dikirim ulang (daftar lengkap) tiap kali dijalankan selama masih
//   bolong -- tidak ada dedup, ini disengaja.
// - Delay random 45-120 detik antar kirim ke Fonnte (anti-banned).
//
// Env opsional untuk uji aman (lihat README di workflow):
//   DRY_RUN=1              -> hitung & tampilkan pesan, TIDAK kirim ke Fonnte
//   TEST_OVERRIDE_PHONE=62x -> semua pesan asli dibelokkan ke 1 nomor ini

const SUPABASE_URL = 'https://djybwvdjipxftxmtqjbt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeWJ3dmRqaXB4ZnR4bXRxamJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODI5NzgsImV4cCI6MjA5NDY1ODk3OH0.vKFaGeIHieNQuXvepaA-GuUqlJ7QjIPmwB7ZKo3Kx8U';
const JADWAL_URL = 'https://raw.githubusercontent.com/smpabbs/jadwalguruabbs/main/index.html';
const FONNTE_SEND_URL = 'https://api.fonnte.com/send';

const BASELINE_DATE = '2026-10-01';

// Nama "atasan" yang jadi pengirim, sesuai peran yang disepakati (bukan
// sekadar "cari sembarang putra/putri" -- role ini melekat ke 2 orang ini).
const SENDER_UNTUK_PUTRA = 'Ustadzah Naya';
const SENDER_UNTUK_PUTRI = 'Us Fahmi';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const TEST_OVERRIDE_PHONE = process.env.TEST_OVERRIDE_PHONE || null;

// Nickname di jadwal -> nama canonical master_guru/app_settings (disamakan
// dengan JADWAL_NAME_MAP di lapor/index.html).
const JADWAL_NAME_MAP = {
  'Ustadz Andi': 'Ustadz Andi',
  'Ust Andi': 'Ustadz Andi',
  'Us Ida': 'Ustadzah Ida',
  'Ustadzah Ida': 'Ustadzah Ida',
  'Us Rizqia': 'Ustadzah Rizqia',
  'Ustadzah Rizqia': 'Ustadzah Rizqia',
  'Us Usaidah': 'Ustadzah Usaidah',
  'Ustadzah Usaidah': 'Ustadzah Usaidah',
  'Us Naya': 'Ustadzah Naya',
  'Ustadzah Naya': 'Ustadzah Naya',
  'Us Fahmi': 'Us Fahmi',
  'Ust Fahmi': 'Us Fahmi',
  'Ust Amiin': 'Ust Amiin',
  'Amin': 'Ust Amiin',
  'Amiin': 'Ust Amiin',
  'ust Yoki': 'ust Yoki',
  'Yoki': 'ust Yoki',
  'Ust Yoki': 'ust Yoki',
};

const HARI_ID = { Monday: 'Senin', Tuesday: 'Selasa', Wednesday: 'Rabu', Thursday: 'Kamis', Friday: 'Jumat', Saturday: 'Sabtu' };
const HARI_BY_GETDAY = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' }; // 0=Minggu diabaikan
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// ================= UTIL TANGGAL =================

function toDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function nowWib() {
  // Runner GitHub Actions jalan di UTC -- WIB = UTC+7.
  const nowUtc = new Date();
  return new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
}

function todayWibStr() {
  const wib = nowWib();
  return wib.getUTCFullYear() + '-' + String(wib.getUTCMonth() + 1).padStart(2, '0') + '-' + String(wib.getUTCDate()).padStart(2, '0');
}

function nowWibHHMMStr() {
  const wib = nowWib();
  return String(wib.getUTCHours()).padStart(2, '0') + ':' + String(wib.getUTCMinutes()).padStart(2, '0');
}

function fmtTglIndo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const hari = HARI_ID[HARI_BY_GETDAY[d.getUTCDay()] || ''] || '';
  return `${hari}, ${d.getUTCDate()} ${BULAN_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ================= NORMALISASI NAMA (port dari lapor/index.html) =================

function normNameKey(s) {
  return (s || '').trim()
    .replace(/[‘’'"“”`]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
}

function normalizeKelas(raw) {
  const m = String(raw || '').trim().toUpperCase().match(/^([789][A-F])/);
  return m ? m[1] : null;
}

// ================= JADWAL (port dari lapor/index.html) =================

function extractDataBlob(html) {
  const marker = 'var DATA = ';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('Marker "var DATA = " tidak ditemukan di jadwalguruabbs');
  const braceStart = html.indexOf('{', start);
  let depth = 0, inStr = false, strCh = '', esc = false;
  for (let i = braceStart; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; strCh = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return html.slice(braceStart, i + 1); }
  }
  throw new Error('DATA blob tidak balanced');
}

async function fetchJadwal() {
  const res = await fetch(JADWAL_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' saat ambil jadwal dari GitHub');
  const html = await res.text();
  return JSON.parse(extractDataBlob(html));
}

function buildQuranSessions(DATA, validKelasSet) {
  const sessions = new Map();
  Object.values(DATA.teachers || {}).forEach(teacher => {
    Object.entries(teacher.cells || {}).forEach(([cellKey, entries]) => {
      const [day, period] = cellKey.split('|');
      (entries || []).forEach(entry => {
        if (entry.subject !== 'Quran') return;
        const kelasNorm = normalizeKelas(entry.class);
        if (!kelasNorm || !validKelasSet.has(kelasNorm)) return;
        const key = day + '|' + period + '|' + kelasNorm;
        if (!sessions.has(key)) {
          sessions.set(key, { day, jam: period, start: entry.start, end: entry.end, kelas: kelasNorm, guruNick: new Set() });
        }
        sessions.get(key).guruNick.add(teacher.nickname);
      });
    });
  });
  return Array.from(sessions.values()).map(s => ({
    ...s,
    guru: Array.from(s.guruNick).map(nick => JADWAL_NAME_MAP[nick] || nick),
  }));
}

// ================= SUPABASE REST =================

async function restSelect(table, params) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`REST ${table} HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function restSelectPaged(table, baseParams) {
  const PAGE = 1000;
  const all = [];
  let offset = 0;
  for (;;) {
    const chunk = await restSelect(table, `${baseParams}&limit=${PAGE}&offset=${offset}`);
    all.push(...chunk);
    if (chunk.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function loadMasterSiswa() {
  return restSelectPaged('master_siswa', 'select=nama,kelas_name&is_active=eq.true');
}

async function loadTahfidzRecordsSince(dateStr) {
  return restSelectPaged('tahfidz_records', `select=nama,kelas,tanggal&tanggal=gte.${dateStr}`);
}

async function loadPengecualianSince(dateStr) {
  return restSelectPaged('tahfidz_pengecualian', `select=kelas,tanggal,guru,alasan&tanggal=gte.${dateStr}`);
}

async function loadPatokanNorm() {
  const rows = await restSelect('app_settings', "select=value&key=eq.patokan_guru_pengampu");
  let raw = rows[0] && rows[0].value ? rows[0].value : null;
  if (typeof raw === 'string') raw = JSON.parse(raw);
  const norm = {};
  if (raw) {
    Object.entries(raw).forEach(([kelas, map]) => {
      norm[kelas] = {};
      Object.entries(map || {}).forEach(([nama, guru]) => {
        norm[kelas][normNameKey(nama)] = guru;
      });
    });
  }
  return norm;
}

async function loadMasterGuruAktif() {
  return restSelect('master_guru', 'select=nama,whatsapp,gender,token_fonnte&is_active=eq.true');
}

// ================= LOGIKA DUE (port dari buildOccs lapor/index.html) =================

function guruSiswaSet(kelas, guru, siswaByKelas, patokanNorm) {
  const gk = normNameKey(guru);
  const pk = patokanNorm[kelas] || {};
  const set = new Set();
  (siswaByKelas.get(kelas) || []).forEach(nm => {
    if (normNameKey(pk[normNameKey(nm)] || '') === gk) set.add(nm);
  });
  return set;
}

/**
 * Hitung semua occurrence due dari baseline s.d. hari ini, lalu kumpulkan
 * sesi bolong per guru (termasuk daftar NAMA siswa yang belum -- ini
 * turunan baru, gstats di lapor/index.html cuma simpan angka).
 */
function buildBolongPerGuru({ quranSessions, siswaByKelas, excIdx, recIdx, patokanNorm, startStr, endStr, todayStr, nowWibHHMM }) {
  const perGuru = new Map(); // nama canonical -> array of {dateStr, kelas, jam, start, end, missingNames}

  const cur = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  while (cur <= end) {
    const dayName = HARI_BY_GETDAY[cur.getUTCDay()];
    const dateStr = toDateStr(cur);
    if (dayName) {
      quranSessions.forEach(s => {
        if (s.day !== dayName) return;
        const roster = siswaByKelas.get(s.kelas) || [];
        if (roster.length === 0) return;

        const isTasmi = s.day === 'Tuesday' && (s.jam === '1' || s.jam === '2');
        const excRows = excIdx.get(s.kelas + '|' + dateStr) || [];
        const kelasRows = excRows.filter(r => !r.guru);
        const klpRows = excRows.filter(r => r.guru);

        let exc = isTasmi ? 'Tasmi Akbar' : null;
        if (!exc && kelasRows.length) exc = 'kelas';

        const excNames = new Set();
        if (!exc && klpRows.length) {
          const pk = patokanNorm[s.kelas] || {};
          const gset = new Set(klpRows.map(r => normNameKey(r.guru)));
          roster.forEach(nm => {
            const g = pk[normNameKey(nm)];
            if (g && gset.has(normNameKey(g))) excNames.add(nm);
          });
        }

        const recorded = recIdx.get(s.kelas + '|' + dateStr) || new Set();
        // Sesi hari ini baru dihitung due kalau jam selesainya sudah lewat
        // jam pengecekan saat ini (buffer) -- sesuai spesifikasi 9 Okt.
        // Tanggal sebelum hari ini selalu due (hari itu sudah lewat semua).
        const belumWaktunyaHariIni = dateStr === todayStr && s.end > nowWibHHMM;
        const due = dateStr <= todayStr && !exc && !belumWaktunyaHariIni;
        if (!due) return;

        (s.guru || []).forEach(guruCanon => {
          const gset = guruSiswaSet(s.kelas, guruCanon, siswaByKelas, patokanNorm);
          const missing = [...gset].filter(nm => !excNames.has(nm) && !recorded.has(nm));
          const total = [...gset].filter(nm => !excNames.has(nm));
          if (missing.length === 0 || total.length === 0) return;
          if (!perGuru.has(guruCanon)) perGuru.set(guruCanon, []);
          perGuru.get(guruCanon).push({
            dateStr, kelas: s.kelas, jam: s.jam, start: s.start, end: s.end,
            missingNames: missing, total: total.length,
          });
        });
      });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return perGuru;
}

/** Hari ini libur kelas-lebar kalau SEMUA kelas aktif punya pengecualian guru-kosong di tanggal ini. */
function isHariLiburPenuh(todayStr, siswaByKelas, excIdx) {
  const activeKelas = [...siswaByKelas.keys()].filter(k => (siswaByKelas.get(k) || []).length > 0);
  if (activeKelas.length === 0) return false;
  return activeKelas.every(k => {
    const rows = excIdx.get(k + '|' + todayStr) || [];
    return rows.some(r => !r.guru);
  });
}

// ================= FORMAT PESAN =================

function gabungRentangJam(entries) {
  // entries: semua baris bolong utk 1 guru pada kelas+tanggal yg sama.
  // Gabung jam yang berurutan/berdekatan jadi satu baris "jam A-B".
  const periods = entries.map(e => parseInt(e.jam, 10)).filter(n => !Number.isNaN(n));
  const jamLabel = periods.length
    ? (Math.min(...periods) === Math.max(...periods) ? String(Math.min(...periods)) : `${Math.min(...periods)}-${Math.max(...periods)}`)
    : entries[0].jam;
  const start = entries.reduce((a, e) => (e.start < a ? e.start : a), entries[0].start);
  const endT = entries.reduce((a, e) => (e.end > a ? e.end : a), entries[0].end);
  const missing = [...new Set(entries.flatMap(e => e.missingNames))];
  const total = Math.max(...entries.map(e => e.total));
  return { jamLabel, start, endT, missing, total };
}

function buildPesanGuru(guruCanon, sebutan, panggilan, entriesList) {
  // Group per kelas+tanggal supaya jam berurutan bisa digabung.
  const byKelasTgl = new Map();
  entriesList.forEach(e => {
    const key = e.kelas + '|' + e.dateStr;
    if (!byKelasTgl.has(key)) byKelasTgl.set(key, []);
    byKelasTgl.get(key).push(e);
  });

  const baris = [...byKelasTgl.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, entries]) => {
      const [kelas, dateStr] = key.split('|');
      const g = gabungRentangJam(entries);
      return `📅 ${fmtTglIndo(dateStr)} — ${kelas} jam ${g.jamLabel} (${g.start}-${g.endT}) — ${g.missing.length} dari ${g.total} siswa belum: ${g.missing.join(', ')}`;
    });

  return `Assalamu'alaikum ${sebutan} ${panggilan},\n\nDicek dari sistem, berikut sesi setoran tahfidz yang belum diisi laporannya:\n\n${baris.join('\n\n')}`;
}

function panggilanDari(namaCanon) {
  return namaCanon.replace(/^(Ustadzah|Ustadz|Us\.?|Ust\.?)\s+/i, '').trim();
}

// ================= FONNTE =================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function kirimFonnte(token, target, message) {
  if (DRY_RUN) {
    console.log(`   [DRY_RUN] akan kirim ke ${target} (token ${token.slice(0, 6)}...)`);
    console.log('   --- isi pesan ---');
    console.log('   ' + message.replace(/\n/g, '\n   '));
    console.log('   --- /isi pesan ---');
    return { status: true, dryRun: true };
  }
  const res = await fetch(FONNTE_SEND_URL, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ target, message, countryCode: '62' }),
  });
  return res.json();
}

// ================= MAIN =================

async function main() {
  const todayStr = todayWibStr();
  const nowWibHHMM = nowWibHHMMStr();
  console.log(`=== Pengingat guru belum input -- dijalankan ${todayStr} ${nowWibHHMM} (WIB) ===`);
  if (DRY_RUN) console.log('*** MODE DRY_RUN -- tidak ada WA yang benar-benar terkirim ***');
  if (TEST_OVERRIDE_PHONE) console.log(`*** Semua pesan dibelokkan ke TEST_OVERRIDE_PHONE=${TEST_OVERRIDE_PHONE} ***`);

  const [DATA, siswaRows, records, pengecualian, patokanNorm, guruAktif] = await Promise.all([
    fetchJadwal(),
    loadMasterSiswa(),
    loadTahfidzRecordsSince(BASELINE_DATE),
    loadPengecualianSince(BASELINE_DATE),
    loadPatokanNorm(),
    loadMasterGuruAktif(),
  ]);

  const siswaByKelas = new Map();
  siswaRows.forEach(s => {
    if (!siswaByKelas.has(s.kelas_name)) siswaByKelas.set(s.kelas_name, []);
    siswaByKelas.get(s.kelas_name).push(s.nama);
  });
  const validKelasSet = new Set(siswaByKelas.keys());

  const { sessions: quranSessions } = (() => {
    const list = buildQuranSessions(DATA, validKelasSet);
    return { sessions: list };
  })();

  const excIdx = new Map();
  pengecualian.forEach(r => {
    const key = r.kelas + '|' + r.tanggal;
    if (!excIdx.has(key)) excIdx.set(key, []);
    excIdx.get(key).push(r);
  });

  const recIdx = new Map();
  records.forEach(r => {
    const key = r.kelas + '|' + r.tanggal;
    if (!recIdx.has(key)) recIdx.set(key, new Set());
    recIdx.get(key).add(r.nama);
  });

  if (isHariLiburPenuh(todayStr, siswaByKelas, excIdx)) {
    console.log('Hari ini libur kelas-lebar (semua kelas aktif dikecualikan) -- lewati run ini.');
    return;
  }

  const perGuru = buildBolongPerGuru({
    quranSessions, siswaByKelas, excIdx, recIdx, patokanNorm,
    startStr: BASELINE_DATE, endStr: todayStr, todayStr, nowWibHHMM,
  });

  if (perGuru.size === 0) {
    console.log('Tidak ada guru dengan sesi bolong. Selesai, tidak ada WA dikirim.');
    return;
  }

  const guruByNama = new Map(guruAktif.map(g => [g.nama, g]));
  const senderPutra = guruByNama.get(SENDER_UNTUK_PUTRA);
  const senderPutri = guruByNama.get(SENDER_UNTUK_PUTRI);
  if (!senderPutra || !senderPutra.token_fonnte) throw new Error(`Token Fonnte ${SENDER_UNTUK_PUTRA} tidak ditemukan di master_guru`);
  if (!senderPutri || !senderPutri.token_fonnte) throw new Error(`Token Fonnte ${SENDER_UNTUK_PUTRI} tidak ditemukan di master_guru`);

  const targets = [];
  for (const [guruCanon, entriesList] of perGuru.entries()) {
    const info = guruByNama.get(guruCanon);
    if (!info) { console.warn(`⚠️ Guru "${guruCanon}" ada sesi bolong tapi tidak ditemukan di master_guru aktif -- dilewati.`); continue; }
    if (!info.whatsapp) { console.warn(`⚠️ Guru "${guruCanon}" tidak punya nomor WA di master_guru -- dilewati.`); continue; }
    if (info.gender !== 'putra' && info.gender !== 'putri') { console.warn(`⚠️ Guru "${guruCanon}" tidak punya gender valid -- dilewati.`); continue; }

    const sebutan = info.gender === 'putra' ? 'Ustadz' : 'Ustadzah';
    const senderToken = info.gender === 'putra' ? senderPutra.token_fonnte : senderPutri.token_fonnte;
    const senderNama = info.gender === 'putra' ? SENDER_UNTUK_PUTRA : SENDER_UNTUK_PUTRI;
    const message = buildPesanGuru(guruCanon, sebutan, panggilanDari(guruCanon), entriesList);
    const phone = TEST_OVERRIDE_PHONE || info.whatsapp;

    targets.push({ guruCanon, phone, senderNama, senderToken, message, jumlahSesiBolong: entriesList.length });
  }

  console.log(`\n${targets.length} guru akan diingatkan:`);
  targets.forEach(t => console.log(`  - ${t.guruCanon} <- dari ${t.senderNama} (${t.jumlahSesiBolong} sesi bolong)`));
  console.log('');

  let sukses = 0, gagal = 0;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    console.log(`[${i + 1}/${targets.length}] Mengirim ke ${t.guruCanon} (${t.phone}) dari ${t.senderNama}...`);
    try {
      const resp = await kirimFonnte(t.senderToken, t.phone, t.message);
      if (resp.status === true || resp.dryRun) {
        sukses++;
        console.log('   OK:', JSON.stringify(resp));
      } else {
        gagal++;
        console.log('   GAGAL:', JSON.stringify(resp));
      }
    } catch (err) {
      gagal++;
      console.log('   ERROR:', err.message);
    }

    if (i < targets.length - 1 && !DRY_RUN) {
      const delay = Math.floor(Math.random() * 76 + 45) * 1000; // 45-120 detik
      console.log(`   menunggu ${Math.round(delay / 1000)}s sebelum kirim berikutnya...`);
      await sleep(delay);
    }
  }

  console.log(`\n=== Selesai: ${sukses} sukses, ${gagal} gagal, dari ${targets.length} guru ===`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

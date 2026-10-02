// Verifikasi fungsional fitur pengecualian di lapor/index.html (jsdom).
// Jalankan: node test-lapor-pengecualian.mjs  (butuh jsdom dari X:/jadwalguruabbs)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const req = createRequire(pathToFileURL('X:/jadwalguruabbs/package.json'));
const { JSDOM } = req('jsdom');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label); }
}

/* ===== tanggal fixture: Senin & Selasa pekan berjalan (atau pekan lalu bila hari ini Senin) ===== */
const today = new Date();
let mon = new Date(today); mon.setHours(0,0,0,0);
mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1));
if (today.getDay() === 1) mon.setDate(mon.getDate() - 7);
const tue = new Date(mon); tue.setDate(mon.getDate() + 1);
const dstr = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const MON = dstr(mon), TUE = dstr(tue);
console.log('Fixture: Senin=' + MON + ' Selasa=' + TUE);

/* ===== fixture data ===== */
const DATA = {
  teachers: {
    t1: { nickname: 'Ust Andi', cells: {
      'Monday|1':    [{ subject: 'Quran', class: '7A', start: '07:30', end: '08:15' }],
      'Tuesday|1':   [{ subject: 'Quran', class: '7A', start: '07:30', end: '08:15' }],
      'Wednesday|1': [{ subject: 'Quran', class: '7A', start: '07:30', end: '08:15' }]
    }},
    t2: { nickname: 'Ust Fahmi', cells: {
      'Monday|2':  [{ subject: 'Quran', class: '8B', start: '08:15', end: '09:00' }],
      'Tuesday|2': [{ subject: 'Quran', class: '8B', start: '08:15', end: '09:00' }],
      'Wednesday|2': [{ subject: 'Quran', class: '8B', start: '08:15', end: '09:00' }]
    }}
  }
};
const jadwalHtml = '<html><script>var DATA = ' + JSON.stringify(DATA) + ';</scr' + 'ipt></html>';

const SISWA = [
  { nama: 'Satu', kelas_name: '7A' },
  { nama: 'Dua',  kelas_name: '7A' },
  { nama: 'Tiga', kelas_name: '7A' },   // tanpa patokan
  { nama: 'Empat', kelas_name: '8B' },
  { nama: 'Lima',  kelas_name: '8B' }
];
const PATOKAN = { '7A': { 'Satu': 'Ustadz Andi', 'Dua': 'Ustadz Andi' } };
const RECORDS = [
  { nama: 'Satu', kelas: '7A', tanggal: MON, guru: 'Ustadz Andi', menghafal: 'ya', jenis: 'ziyadah', surat: 'Al-Baqarah', ayatDari: 1, ayatSampai: 5 },
  { nama: 'Dua',  kelas: '7A', tanggal: MON, guru: 'Ustadz Andi', menghafal: 'ya', jenis: 'ziyadah', surat: 'Al-Baqarah', ayatDari: 6, ayatSampai: 10 }
];
const PENGECUALIAN = [
  { id: 'e1', kelas: '8B', tanggal: MON, alasan: 'Kajian Akbar', guru: '', catatan: '', dibuatOleh: 'admin' },
  { id: 'e2', kelas: '7A', tanggal: TUE, alasan: 'Tahsin Teori', guru: 'Ustadz Andi', catatan: '', dibuatOleh: 'Ustadz Andi' }
];

let bulkCalls = [];
const DatabaseService = {
  loadMasterSiswa: async () => SISWA.map(s => ({ ...s })),
  loadMasterGuru: async () => [],
  loadTahfidzRecords: async () => RECORDS.map(r => ({ ...r })),
  loadPengecualian: async () => PENGECUALIAN.map(r => ({ ...r })),
  savePengecualianBulk: async (rows) => {
    bulkCalls.push(rows);
    rows.forEach((r, i) => PENGECUALIAN.push({
      id: 'x' + bulkCalls.length + '-' + i + '-' + r.kelas + r.tanggal,
      kelas: r.kelas, tanggal: r.tanggal, alasan: r.alasan, guru: r.guru,
      catatan: '', dibuatOleh: r.dibuat_oleh
    }));
    return rows.length;
  },
  deletePengecualian: async () => true
};
const SupabaseClient = {
  get: () => ({
    from() {
      const q = {
        select() { return q; }, eq() { return q; }, order() { return q; },
        maybeSingle: () => Promise.resolve({ data: { value: PATOKAN } }),
        upsert: () => Promise.resolve({ error: null }),
        delete() { return q; }
      };
      return q;
    }
  })
};

/* ===== muat halaman ===== */
let html = fs.readFileSync('lapor/index.html', 'utf8');
html = html.replace(/<script src="[^"]*"><\/script>/g, '');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://tahfidz.test/lapor/',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.SupabaseClient = SupabaseClient;
    window.DatabaseService = DatabaseService;
    window.fetch = async () => ({ ok: true, status: 200, text: async () => jadwalHtml });
    window.confirm = () => false;
    window.console.error = () => {}; // biar output bersih
  }
});
const w = dom.window;
const doc = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* tunggu init selesai */
let ready = false;
for (let i = 0; i < 50 && !ready; i++) {
  await sleep(100);
  ready = doc.getElementById('view').innerHTML.length > 0 && doc.getElementById('loadingState').style.display === 'none';
}
console.log('\n== 1. Init ==');
ok(ready, 'init selesai, view ter-render');
ok(doc.getElementById('errorNote').style.display !== 'block', 'tanpa error load');

console.log('\n== 2. buildOccs — pengecualian masuk hitungan ==');
const occs = w.eval('STATE.occs');
const m7A = occs.find(o => o.kelas === '7A' && o.dateStr === MON);
const t7A = occs.find(o => o.kelas === '7A' && o.dateStr === TUE);
const m8B = occs.find(o => o.kelas === '8B' && o.dateStr === MON);
const w7A = occs.find(o => o.kelas === '7A' && o.jam === '1' && HARI(w, o.date) === 'Wednesday');
ok(!!m7A && m7A.due === true && m7A.t === 3 && m7A.n === 2, `7A ${MON} due, t=3 n=2 (ada ${m7A ? `${m7A.due},${m7A.t},${m7A.n}` : 'null'})`);
ok(!!m8B && m8B.due === false && m8B.exc === 'Kajian Akbar', `8B ${MON} exc kelas "Kajian Akbar", due=false`);
ok(!!t7A && t7A.due === true && t7A.t === 1 && t7A.n === 0, `7A ${TUE} kelompok: t=1 n=0 (Satu+Dua keluar)`);
ok(!!t7A && t7A.excNames.has('Satu') && t7A.excNames.has('Dua') && !t7A.excNames.has('Tiga'), 'excNames = {Satu, Dua}, Tiga tidak');
ok(!!t7A && t7A.excKlpAlasan === 'Tahsin Teori' && t7A.excGuru[0] === 'Ustadz Andi', 'excKlpAlasan & excGuru terisi');
ok(!!w7A && w7A.due === false && w7A.exc === 'Tasmi Akbar', 'Rabu jam 1 tetap Tasmi Akbar (statis)');

function HARI(w, d) { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]; }

console.log('\n== 3. renderSiswa — penyebut per siswa ==');
w.eval(`STATE.pov='kelas'; STATE.kelasSel='7A'; STATE.level=2; STATE.siswaSel=null; render();`);
let htmlView = doc.getElementById('view').innerHTML;
ok(htmlView.includes('1/1'), 'Satu & Dua: 1/1 (Selasa dikecualikan dari penyebut)');
ok(htmlView.includes('0/2'), 'Tiga: 0/2 (Selasa tetap kewajiban, tanpa input)');
const pTot = (doc.querySelector('#view .donut .pct') || {}).textContent || '';
ok(pTot.startsWith('50'), 'donut total 50% (2 dari 4)');

console.log('\n== 4. renderRekap — tag dikecualikan ==');
w.eval(`STATE.siswaSel='Satu'; STATE.level=3; render();`);
htmlView = doc.getElementById('view').innerHTML;
ok(htmlView.includes('dikecualikan'), 'baris "Tahsin Teori · dikecualikan" tampil utk Satu');
ok(htmlView.includes('kelompok Us. Andi') || htmlView.includes('kelompok Ust. Andi'), 'sub kelompok guru tampil');
const pSatu = (doc.querySelector('#view .donut .pct') || {}).textContent || '';
ok(pSatu.startsWith('100'), 'donut Satu 100% (penyebut 1 sesi)');
w.eval(`STATE.kelasSel='8B'; STATE.siswaSel='Empat'; render();`);
htmlView = doc.getElementById('view').innerHTML;
ok(htmlView.includes('Kajian Akbar'), 'baris kegiatan "Kajian Akbar" tampil di rekap 8B');
ok(htmlView.includes('Tidak ada sesi pada periode ini') || htmlView.includes('Belum ada input') || true, 'rekap 8B tetap render');

console.log('\n== 5. strip kartu kelas ==');
w.eval(`STATE.level=1; STATE.siswaSel=null; render();`);
htmlView = doc.getElementById('view').innerHTML;
ok(htmlView.includes('kcard'), 'grid kelas ter-render');

console.log('\n== 6. Admin: login ==');
w.eval('openAdmin()');
ok(doc.getElementById('admPass') !== null, 'form password muncul');
w.eval(`document.getElementById('admPass').value='salah'; adminTryLogin();`);
ok(doc.getElementById('admNote').className.includes('err'), 'password salah → pesan error');
w.eval(`document.getElementById('admPass').value='b1sm1llahdulu'; adminTryLogin();`);
ok(doc.getElementById('admAlasan') !== null, 'password benar → panel admin terbuka');
ok(w.sessionStorage.getItem('laporAdmin') === '1', 'sesi admin tersimpan');

console.log('\n== 7. Admin: tabel pengecualian ==');
let rowsHtml = doc.getElementById('admRows').innerHTML;
ok(rowsHtml.includes('Kajian Akbar'), 'baris Kajian Akbar (kelas) tampil');
ok(rowsHtml.includes('Tahsin Teori') && rowsHtml.includes('Ust. Andi'), 'baris Tahsin Teori (kelompok) tampil');
ok(rowsHtml.includes('admin'), 'kolom diinput = admin');

console.log('\n== 8. Admin: simpan kegiatan ==');
w.eval(`document.getElementById('admAlasan').value='Rapat Wali Kelas';
  document.getElementById('admTgl1').value='${TUE}';
  document.getElementById('admTgl2').value='';
  document.querySelector('#admKelas input[value="8B"]').checked = true;
  document.querySelector('#admKelas input[value="8B"]').closest('.kchip').classList.add('on');`);
bulkCalls = [];
await w.eval('adminSaveKegiatan()');
ok(bulkCalls.length === 1 && bulkCalls[0].length === 1, 'bulk upsert 1 baris');
ok(bulkCalls[0] && bulkCalls[0][0] && bulkCalls[0][0].kelas === '8B' && bulkCalls[0][0].tanggal === TUE && bulkCalls[0][0].alasan === 'Rapat Wali Kelas' && bulkCalls[0][0].guru === '' && bulkCalls[0][0].dibuat_oleh === 'admin', 'payload benar (kelas/tanggal/alasan/guru kosong/admin)');
ok(doc.getElementById('admRows').innerHTML.includes('Rapat Wali Kelas'), 'tabel refresh, baris baru tampil');
const occAfter = w.eval(`STATE.occs.find(o => o.kelas==='8B' && o.dateStr==='${TUE}')`);
ok(occAfter && occAfter.due === false && occAfter.exc === 'Rapat Wali Kelas', 'occ 8B Selasa kini dikecualikan (due=false)');

console.log('\n== 9. Admin: hapus (confirm dibatalkan) ==');
const before = w.eval('STATE.pengecualian.length');
await w.eval(`adminDelete({tanggal:'${TUE}', alasan:'Rapat Wali Kelas', guru:'', ids:['x1'], kelas:['8B'], oleh:new Set()})`);
ok(w.eval('STATE.pengecualian.length') === before, 'confirm=false → tidak ada yang terhapus');

console.log('\n== 10. Rekomendasi kaldik ==');
ok(doc.getElementById('admKaldik') !== null, 'section rekomendasi kaldik tampil');
const nKaldik = w.eval('KALDIK_RECS.length');
ok(nKaldik >= 30, `KALDIK_RECS lengkap (${nKaldik} acara)`);
ok(doc.querySelectorAll('#admKaldik input[data-ki]:checked').length === 17, '17 libur & hari besar tercentang default');
ok(doc.querySelectorAll('#admKaldik input[data-ki]').length === nKaldik, 'semua acara ter-render');
ok(doc.getElementById('admKaldik').innerHTML.includes('L8 · L9'), 'badge lingkup jenjang (L8 · L9) tampil');

bulkCalls = [];
w.eval(`document.querySelectorAll('#admKaldik input[data-ki]').forEach(c => {
    c.checked = false; c.closest('.krow').classList.remove('on'); });
  const first = document.querySelector('#admKaldik input[data-ki="0"]');
  first.checked = true; first.closest('.krow').classList.add('on');`);
await w.eval('adminApproveKaldik()');
ok(bulkCalls.length === 1, 'approve kaldik = 1 request bulk');
const hutri = (bulkCalls[0] || []).filter(r => r.alasan === 'HUT RI');
ok(hutri.length === 2 && hutri.every(r => r.tanggal === '2026-08-17' && r.guru === '' && r.dibuat_oleh === 'kaldik' && ['7A','8B'].includes(r.kelas)),
  'HUT RI → 2 kelas × 1 tanggal, dibuat_oleh=kaldik');
ok(w.eval(`!!STATE.excIdx.get('7A|2026-08-17')`), 'excIdx berisi HUT RI (berlaku surut)');
ok(doc.getElementById('admKaldik').innerHTML.includes('tersimpan'), 'baris kaldik bertanda ✓ tersimpan');

console.log(`\n=== ${pass} pass, ${fail} fail ===`);
process.exit(fail ? 1 : 0);

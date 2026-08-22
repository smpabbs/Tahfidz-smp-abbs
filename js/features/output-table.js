// ====================================================
// js/features/output-table.js - TABEL OUTPUT & EXPORT
// ====================================================

const OutputTable = {
  
  /**
   * Inisialisasi
   */
  init() {
    this.addSyncUI();
    console.log('✅ OutputTable initialized');
  },

  /**
   * Update tabel dengan data terbaru
   */
  async update() {
    const tbody = document.querySelector('#outputTable tbody');
    const thead = document.querySelector('#outputTable thead');
    const summary = document.getElementById('tableSummary');

    if (!tbody || !thead) return;

    // Tampilkan loading
    tbody.innerHTML = '<tr><td colspan="13" class="no-data">⏳ Memuat data...</td></tr>';

    try {
      // Load data dari Supabase
      AppState.tahfidzRecords = await DatabaseService.loadTahfidzRecords();
      AppState.setSyncStatus('success', `Data terbaru (${AppState.totalRecords} records)`);

      // Render tabel
      this.render(tbody, thead, summary);
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      tbody.innerHTML = '<tr><td colspan="13" class="no-data">❌ Gagal memuat data</td></tr>';
      AppState.setSyncStatus('error', 'Gagal memuat data');
    }
  },

  /**
   * Render tabel
   */
  render(tbody, thead, summary) {
    const filtered = this.getFilteredData();

    this.renderStats();

    // Clear
    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (filtered.length === 0) {
      thead.innerHTML = '<tr><th colspan="13">Data Capaian Tahfidz</th></tr>';
      tbody.innerHTML = '<tr><td colspan="13" class="no-data">Belum ada data</td></tr>';
      if (summary) summary.textContent = 'Menampilkan 0 data';
      const cards = document.getElementById('outputCards');
      if (cards) cards.innerHTML = '<div class="no-data">Belum ada data</div>';
      return;
    }

    // Header 2-baris — mengikuti struktur format-tabel-dekstop.xlsx:
    // Awal/Akhir masing2 dipecah jadi Surat+Ayat, Jenis & Total jadi
    // kolom sendiri (rowspan per kelompok jenis, lihat buildStudentRows).
    thead.innerHTML = `
      <tr>
        <th rowspan="2">No</th><th rowspan="2">Nama Siswa</th><th rowspan="2">Kelas</th>
        <th rowspan="2">Jenis</th><th rowspan="2">Tanggal</th>
        <th colspan="2">Awal</th><th colspan="2">Akhir</th>
        <th rowspan="2">Nilai</th><th rowspan="2">Baris/Halaman</th>
        <th rowspan="2">Total</th><th rowspan="2">Aksi</th>
      </tr>
      <tr><th>Surat</th><th>Ayat</th><th>Surat</th><th>Ayat</th></tr>
    `;

    // Group by siswa
    const grouped = this.groupBySiswa(filtered);
    const sorted = this.sortSiswa(Object.values(grouped));

    // Build rows — tiap siswa dipecah per kelompok jenis (Ziyadah lalu
    // Murajaah lalu Tilawah, urutan tetap AppConfig.POSITIVE_JENIS),
    // supaya kolom Jenis & Total bisa di-rowspan per kelompok itu.
    let globalNo = 1;
    sorted.forEach((siswa, studentIdx) => {
      const rows = this.buildStudentRows(siswa);
      rows.forEach((rowInfo, i) => {
        const isFirstOfStudent = i === 0;
        const isNewStudent = studentIdx > 0 && isFirstOfStudent;
        const row = this.createRow(rowInfo, siswa, globalNo, isFirstOfStudent, isNewStudent);
        tbody.appendChild(row);
      });

      globalNo++;
    });

    // Summary
    if (summary) {
      const totalSiswa = sorted.length;
      summary.textContent = `Menampilkan ${totalSiswa} siswa (${filtered.length} data)`;
    }

    this.renderMobileCards(sorted);
  },

  /**
   * Kartu ringkas di atas tabel — dihitung dari bulan berjalan,
   * bukan sumber data baru (AppState.tahfidzRecords + baris/keterangan
   * yang sudah ada).
   */
  renderStats() {
    const box = document.getElementById('outputStats');
    if (!box) return;

    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthRecords = (AppState.tahfidzRecords || []).filter(d => d && d.tanggal && d.tanggal.startsWith(ym));

    const byJenis = (d, j) => d.menghafal === 'ya' && (d.jenis || 'ziyadah') === j;

    const ziyadahRecords = monthRecords.filter(d => byJenis(d, 'ziyadah'));
    const murojaahRecords = monthRecords.filter(d => byJenis(d, 'murojaah'));
    const tilawahRecords = monthRecords.filter(d => byJenis(d, 'tilawah'));

    const totalBaris = monthRecords.reduce((sum, d) => sum + (parseFloat(d.baris) || 0), 0);
    const graded = ziyadahRecords.filter(d => d.keterangan);
    const mumtazCount = graded.filter(d => d.keterangan === 'Mumtaz').length;
    const pctMumtaz = graded.length > 0 ? Math.round((mumtazCount / graded.length) * 100) : 0;

    box.innerHTML = `
      <div class="stat-tile">
        <div class="stat-l">Ziyadah</div>
        <div class="stat-v">${ziyadahRecords.length}</div>
        <div class="stat-d">setoran baru tercatat</div>
      </div>
      <div class="stat-tile">
        <div class="stat-l">Murajaah</div>
        <div class="stat-v">${murojaahRecords.length}</div>
        <div class="stat-d">murajaah tercatat</div>
      </div>
      <div class="stat-tile">
        <div class="stat-l">Tilawah</div>
        <div class="stat-v">${tilawahRecords.length}</div>
        <div class="stat-d">tilawah tercatat</div>
      </div>
      <div class="stat-tile">
        <div class="stat-l">Total Baris</div>
        <div class="stat-v">${totalBaris}</div>
        <div class="stat-d">≈ ${Math.round(totalBaris / 20)} halaman mushaf</div>
      </div>
      <div class="stat-tile">
        <div class="stat-l">Nilai Mumtaz</div>
        <div class="stat-v">${pctMumtaz}%</div>
        <div class="stat-d">dari ziyadah bernilai</div>
      </div>
    `;
  },

  /**
   * Kartu terkelompok per siswa untuk layar sempit — dibangun dari
   * grouping yang sama (groupBySiswa/sortSiswa) yang dipakai tabel
   * desktop, lalu dipecah lagi per jenis aktivitas (Ziyadah/Murajaah/
   * Tilawah) supaya subtotal per jenis kebaca tanpa harus scroll jauh.
   * Tiap kelompok jenis cuma menampilkan 3 entri terakhir (terbaru) —
   * selebihnya disembunyikan di balik tombol "Lihat Detail" yang
   * membuka modal berisi riwayat lengkap kelompok itu. Tombol
   * Ubah/Hapus (di kartu maupun di modal) memanggil EditInline.toggle()
   * dan OutputTable.deleteRecord() yang sama persis dengan tabel,
   * dengan originalIndex yang sama — tidak ada logika yang digandakan.
   */
  renderMobileCards(sorted) {
    const box = document.getElementById('outputCards');
    if (!box) return;

    const VISIBLE_LIMIT = 3;

    box.innerHTML = sorted.map(siswa => {
      const total = siswa.totalBaris;
      const initials = siswa.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

      const groupsHtml = AppConfig.POSITIVE_JENIS.map(jenis => {
        const all = siswa.entries
          .filter(e => (e.jenis || 'ziyadah') === jenis)
          .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        if (all.length === 0) return '';

        const subtotal = all.reduce((sum, e) => sum + (e.menghafal === 'ya' ? (parseFloat(e.baris) || 0) : 0), 0);
        const visible = all.slice(-VISIBLE_LIMIT);
        const hiddenCount = all.length - visible.length;
        const rowsHtml = visible.map(entry => this.renderEntryRow(entry)).join('');
        const moreHtml = hiddenCount > 0
          ? `<button type="button" class="jmore" onclick="OutputTable.showDetail('${this._jsAttr(siswa.nama)}','${this._jsAttr(siswa.kelas)}','${jenis}')">Lihat Detail — ${all.length} entri semua →</button>`
          : '';

        return `
          <div class="jgroup ${jenis}">
            <div class="jgroup-h">
              <span class="jgroup-name">${AppConfig.JENIS_LABELS[jenis]}</span>
              <span class="jgroup-total">${subtotal} ${this.unitFor(jenis)}</span>
            </div>
            ${rowsHtml}
            ${moreHtml}
          </div>
        `;
      }).join('');

      return `
        <div class="ocard">
          <div class="ocard-h">
            <div class="oav">${initials}</div>
            <div class="owho">
              <div class="onm">${siswa.nama}</div>
              <div class="okl">Kelas ${siswa.kelas} · ${siswa.entries.length} entri</div>
            </div>
            <div class="otot"><div class="ov">${total}</div><div class="ol">baris</div></div>
          </div>
          ${groupsHtml}
        </div>
      `;
    }).join('');
  },

  /**
   * Satuan tampilan per jenis — Ziyadah pakai "baris", Murajaah &
   * Tilawah pakai "halaman" (dipakai bareng oleh subtotal kelompok
   * dan baris entri supaya konsisten).
   * @param {string} jenis
   * @returns {string}
   */
  unitFor(jenis) {
    return (jenis === 'murojaah' || jenis === 'tilawah') ? 'halaman' : 'baris';
  },

  /**
   * Render satu baris entri (dipakai bareng oleh kartu mobile —
   * kelompok 3-terakhir — dan modal Lihat Detail, supaya markup tidak
   * digandakan/bisa beda antara keduanya).
   * @param {object} entry - record dengan originalIndex
   * @returns {string}
   */
  renderEntryRow(entry) {
    const isTidak = entry.menghafal !== 'ya';
    if (isTidak) {
      const label = entry.alasan || AppConfig.MENGHAFAL_LABELS[entry.menghafal] || 'tanpa alasan';
      return `
        <div class="oerow absent">
          <div class="odt">${this.formatTanggal(entry.tanggal)}</div>
          <div class="omid"><div class="osurat">Tidak setoran — ${label}</div></div>
          <div class="oacts">
            <button class="btn-edit" onclick="OutputTable.editFromDetail(${entry.originalIndex})" title="Edit"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
            <button class="btn-delete" onclick="OutputTable.deleteRecord(${entry.originalIndex})" title="Hapus"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
          </div>
        </div>
      `;
    }
    const ayat = entry.ayatDari && entry.ayatSampai
      ? `${parseFloat(entry.ayatDari)} – ${parseFloat(entry.ayatSampai)}`
      : (entry.ayatDari ? parseFloat(entry.ayatDari).toString() : '—');
    const cls = this.nilaiClass(entry.keterangan);
    return `
      <div class="oerow">
        <div class="odt">${this.formatTanggal(entry.tanggal)}</div>
        <div class="omid">
          <div class="osurat">${entry.surat || '—'} <span class="oayat">· ${ayat}</span></div>
          <div class="ometa">
            <span class="opill ${cls}">${entry.keterangan || '—'}</span>
            <span class="obaris">${parseFloat(entry.baris) || 0} ${this.unitFor(entry.jenis)}</span>
          </div>
        </div>
        <div class="oacts">
          <button class="btn-edit" onclick="OutputTable.editFromDetail(${entry.originalIndex})" title="Edit"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          <button class="btn-delete" onclick="OutputTable.deleteRecord(${entry.originalIndex})" title="Hapus"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
        </div>
      </div>
    `;
  },

  /**
   * Buka modal "Lihat Detail" — riwayat lengkap satu siswa untuk satu
   * jenis aktivitas (dipanggil dari tombol jmore di kartu mobile).
   * Mengambil ulang data dari getFilteredData() (sumber originalIndex
   * yang sama dengan groupBySiswa) supaya index tetap valid untuk
   * Ubah/Hapus dari dalam modal.
   * @param {string} nama
   * @param {string} kelas
   * @param {string} jenis
   */
  showDetail(nama, kelas, jenis) {
    const entries = this.getFilteredData()
      .map((d, index) => ({ ...d, originalIndex: index }))
      .filter(d => d.nama === nama && d.kelas === kelas && (d.jenis || 'ziyadah') === jenis)
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    const subtotal = entries.reduce((sum, e) => sum + (e.menghafal === 'ya' ? (parseFloat(e.baris) || 0) : 0), 0);

    const title = document.getElementById('detailModalTitle');
    if (title) title.textContent = `${AppConfig.JENIS_LABELS[jenis] || jenis} — ${nama}`;

    const sub = document.getElementById('detailModalSub');
    if (sub) sub.textContent = `Kelas ${kelas} · ${entries.length} entri · Total ${subtotal} ${this.unitFor(jenis)}`;

    const body = document.getElementById('detailModalBody');
    if (body) {
      body.innerHTML = entries.map(entry => this.renderEntryRow(entry)).join('') || '<div class="no-data">Belum ada data</div>';
    }

    Modal.open('detailModal');
  },

  /**
   * Ubah entri dari dalam modal Lihat Detail — tutup modal dulu baru
   * panggil EditInline.toggle() yang sama dengan tabel/kartu (field
   * edit ditulis ke <tr> tabel desktop yang tetap ada di DOM; CSS
   * :has(.edit-input) yang menampilkannya di layar sempit).
   * @param {number} index
   */
  editFromDetail(index) {
    Modal.close('detailModal');
    EditInline.toggle(index);
  },

  /**
   * Escape nilai untuk disisipkan sebagai argumen string JS di dalam
   * atribut onclick="..." (HTML pakai kutip dua, literal JS pakai
   * kutip satu) — supaya nama/kelas yang mengandung tanda kutip tidak
   * merusak markup.
   * @param {string} str
   * @returns {string}
   */
  _jsAttr(str) {
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  },

  /**
   * Dapatkan data terfilter
   */
  getFilteredData() {
    const filterKelas = document.getElementById('filterKelas')?.value || '';
    const filterBulan = document.getElementById('filterBulan')?.value || '';
    const filterTahun = document.getElementById('filterTahun')?.value || '';
    const filterJenis = document.getElementById('filterJenis')?.value || '';

    return AppState.tahfidzRecords.filter(d => {
      if (!d || !d.nama) return false;
      if (filterKelas && d.kelas !== filterKelas) return false;

      if (filterJenis) {
        const j = d.menghafal === 'ya' ? (d.jenis || 'ziyadah') : d.jenis;
        if (j !== filterJenis) return false;
      }

      if (filterBulan || filterTahun) {
        if (!d.tanggal) return false;
        const [tahun, bulan] = d.tanggal.split('-');
        if (filterBulan && bulan !== filterBulan) return false;
        if (filterTahun && tahun !== filterTahun) return false;
      }

      return true;
    });
  },

  /**
   * Group data by siswa
   */
  groupBySiswa(data) {
    const result = {};
    data.forEach((d, index) => {
      const key = `${d.nama}-${d.kelas}`;
      if (!result[key]) {
        result[key] = {
          nama: d.nama,
          kelas: d.kelas,
          entries: [],
          totalBaris: 0,
          rowspan: 0
        };
      }
      result[key].entries.push({ ...d, originalIndex: index });
      result[key].totalBaris += parseFloat(d.baris) || 0;
      result[key].rowspan++;
    });
    return result;
  },

  /**
   * Sort siswa data
   */
  sortSiswa(data) {
    return data.sort((a, b) => {
      if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
      return a.nama.localeCompare(b.nama);
    });
  },

  /**
   * Nama jenis aktivitas (Ziyadah/Murajaah/Tilawah) utk tampilan & export.
   * Berlaku juga untuk baris absen (Sakit/Sertifikasi/Lainnya) — setiap
   * tab Setoran menandai jenis-nya sendiri di data, bukan cuma yang "Ya".
   * @param {object} e - record
   * @returns {string|null}
   */
  jenisName(e) {
    if (!e) return null;
    return AppConfig.JENIS_LABELS[e.jenis] || AppConfig.JENIS_LABELS.ziyadah;
  },

  /**
   * Class warna pil nilai (Mumtaz/Jayid Jiddan/Jayid) — dipakai bareng oleh
   * tabel desktop (createRow) dan kartu mobile (renderMobileCards) supaya
   * pewarnaan konsisten di kedua tampilan.
   * @param {string} keterangan
   * @returns {string}
   */
  nilaiClass(keterangan) {
    const map = { Mumtaz: 'mumtaz', 'Jayid Jiddan': 'jj', Jayid: 'jayid' };
    return map[keterangan] || 'jayid';
  },

  /**
   * Pecah entri satu siswa jadi baris tabel per kelompok jenis (Ziyadah
   * lalu Murajaah lalu Tilawah), tiap entri diberi tahu apakah dia baris
   * pertama kelompok jenisnya (untuk rowspan kolom Jenis & Total) beserta
   * rowspan dan subtotal kelompok itu. Dipakai bareng oleh createRow
   * (tabel desktop).
   * @param {object} siswa - dari groupBySiswa (punya .entries + .rowspan)
   * @returns {Array<object>}
   */
  buildStudentRows(siswa) {
    const groups = AppConfig.POSITIVE_JENIS
      .map(jenis => ({
        jenis,
        entries: siswa.entries
          .filter(e => (e.jenis || 'ziyadah') === jenis)
          .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      }))
      .filter(g => g.entries.length > 0);

    const rows = [];
    groups.forEach(g => {
      const subtotal = g.entries.reduce((sum, e) => sum + (e.menghafal === 'ya' ? (parseFloat(e.baris) || 0) : 0), 0);
      g.entries.forEach((entry, i) => {
        rows.push({
          entry,
          jenis: g.jenis,
          isFirstOfJenisGroup: i === 0,
          jenisGroupRowspan: g.entries.length,
          jenisSubtotal: subtotal
        });
      });
    });
    return rows;
  },

  /**
   * Buat row tabel — struktur mengikuti format-tabel-dekstop.xlsx: kolom
   * Jenis & Total di-rowspan per kelompok jenis (buildStudentRows), Awal/
   * Akhir masing2 dipecah Surat+Ayat (satu field `surat` disimpan sebagai
   * "Awal → Akhir" saat lintas surat — lihat input-form.js). Sel yang bisa
   * diedit dapat class semantik (.cell-tanggal, .cell-awal-surat, dst)
   * supaya EditInline tidak perlu menghitung posisi kolom.
   */
  createRow(rowInfo, siswa, globalNo, isFirstOfStudent, isNewStudent) {
    const { entry, jenis, isFirstOfJenisGroup, jenisGroupRowspan, jenisSubtotal } = rowInfo;
    const row = document.createElement('tr');
    row.className = `jenis-${jenis}` + (isNewStudent ? ' new-student' : '');
    row.setAttribute('data-original-index', entry.originalIndex);
    row.setAttribute('data-menghafal', entry.menghafal || 'ya');

    const isTidak = entry.menghafal !== 'ya';
    const unit = this.unitFor(jenis);

    const suratParts = (entry.surat || '').split('→').map(s => s.trim()).filter(Boolean);
    const suratAwal = suratParts[0] || '—';
    const suratAkhir = suratParts.length > 1 ? suratParts[1] : suratAwal;
    const ayatAwal = (entry.ayatDari !== null && entry.ayatDari !== undefined && entry.ayatDari !== '') ? parseFloat(entry.ayatDari) : '—';
    const ayatAkhir = (entry.ayatSampai !== null && entry.ayatSampai !== undefined && entry.ayatSampai !== '') ? parseFloat(entry.ayatSampai) : '—';

    const keteranganDisplay = (isTidak || !entry.keterangan)
      ? '—'
      : `<span class="opill ${this.nilaiClass(entry.keterangan)}">${entry.keterangan}</span>`;
    const barisDisplay = isTidak ? '0' : `${(parseFloat(entry.baris) || 0)} ${unit}`;

    const awalAkhirCells = isTidak
      ? `<td colspan="4" class="not-memorizing cell-absent">Tidak setoran — ${entry.alasan || AppConfig.MENGHAFAL_LABELS[entry.menghafal] || 'tanpa alasan'}</td>`
      : `<td class="cell-awal-surat">${suratAwal}</td><td class="cell-awal-ayat">${ayatAwal}</td><td class="cell-akhir-surat">${suratAkhir}</td><td class="cell-akhir-ayat">${ayatAkhir}</td>`;

    const actionBtns = `
      <button class="btn-edit" onclick="EditInline.toggle(${entry.originalIndex})" title="Edit"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
      <button class="btn-delete" onclick="OutputTable.deleteRecord(${entry.originalIndex})" title="Hapus"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
    `;

    let html = '';
    if (isFirstOfStudent) {
      html += `<td rowspan="${siswa.rowspan}">${globalNo}</td>`;
      html += `<td rowspan="${siswa.rowspan}"><strong>${siswa.nama}</strong></td>`;
      html += `<td rowspan="${siswa.rowspan}"><span class="kelas-badge">${siswa.kelas}</span></td>`;
    }
    if (isFirstOfJenisGroup) {
      html += `<td rowspan="${jenisGroupRowspan}"><span class="jenis-tag ${jenis}">${AppConfig.JENIS_LABELS[jenis]}</span></td>`;
    }
    html += `<td class="cell-tanggal">${this.formatTanggal(entry.tanggal)}</td>`;
    html += awalAkhirCells;
    html += `<td class="cell-nilai">${keteranganDisplay}</td>`;
    html += `<td class="cell-baris">${barisDisplay}</td>`;
    if (isFirstOfJenisGroup) {
      html += `<td rowspan="${jenisGroupRowspan}" class="total-cell">${jenisSubtotal} ${unit}</td>`;
    }
    html += `<td>${actionBtns}</td>`;

    row.innerHTML = html;
    return row;
  },

  /**
   * Hapus record
   */
  async deleteRecord(index) {
    const data = this.getFilteredData()[index];
    if (!data) return;

    const ok = await ConfirmDialog.show(
      `Siswa  : ${data.nama}\nKelas  : ${data.kelas}\nTanggal: ${data.tanggal}\n\nData akan dihapus permanen!`,
      { title: 'Hapus Data?', confirmText: 'Ya, Hapus', danger: true }
    );
    if (!ok) return;

    try {
      await DatabaseService.deleteTahfidzRecord(data.id);
      NotificationService.success('Data berhasil dihapus!');
      this.update();
    } catch (error) {
      NotificationService.error('Gagal menghapus data: ' + error.message);
    }
  },

  /**
   * Format tanggal
   */
  formatTanggal(dateStr) {
    if (!dateStr) return '';
    try {
      const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [y, m, d] = clean.split('-');
      return `${d}/${m}/${y.slice(2)}`;
    } catch {
      return dateStr;
    }
  },

  // ==========================================
  // EXPORT
  // ==========================================

  /**
   * Export ke CSV
   */
  exportCSV() {
    const data = this.getFilteredData();
    if (data.length === 0) {
      NotificationService.warning('Tidak ada data untuk di-export!');
      return;
    }

    const grouped = this.groupBySiswa(data);
    const sorted = this.sortSiswa(Object.values(grouped));
    const rows = [['No', 'Nama', 'Kelas', 'Tanggal', 'Jenis', 'Surat', 'Ayat', 'Keterangan', 'Baris', 'Total']];

    let no = 1;
    sorted.forEach(siswa => {
      siswa.entries.sort((a, b) => a.tanggal.localeCompare(b.tanggal)).forEach((e, i) => {
        rows.push([
          i === 0 ? no : '',
          i === 0 ? siswa.nama : '',
          i === 0 ? siswa.kelas : '',
          this.formatTanggal(e.tanggal),
          this.jenisName(e) || '—',
          e.menghafal !== 'ya' ? '—' : (e.surat || '—'),
          e.menghafal !== 'ya' ? (e.alasan || AppConfig.MENGHAFAL_LABELS[e.menghafal] || '—') : `${e.ayatDari || ''}${e.ayatSampai ? ' – ' + e.ayatSampai : ''}`,
          e.menghafal !== 'ya' ? '—' : (e.keterangan || '—'),
          e.baris || 0,
          i === 0 ? siswa.totalBaris : ''
        ]);
      });
      no++;
    });

    const csv = rows.map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\n');
    this.downloadFile(csv, 'capaian-tahfidz.csv', 'text/csv');
    NotificationService.success('File CSV berhasil diunduh!');
  },

  /**
   * Export ke Excel (HTML format)
   */
  exportExcel() {
    const data = this.getFilteredData();
    if (data.length === 0) {
      NotificationService.warning('Tidak ada data untuk di-export!');
      return;
    }

    const grouped = this.groupBySiswa(data);
    const sorted = this.sortSiswa(Object.values(grouped));
    
    let html = `<html><head><meta charset="UTF-8"><title>Laporan Tahfidz</title></head><body>`;
    html += `<h2>Laporan Capaian Tahfidz</h2>`;
    html += `<p>Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>`;
    html += `<table border="1" cellpadding="5" cellspacing="0">`;
    html += `<tr><th>No</th><th>Nama</th><th>Kelas</th><th>Tanggal</th><th>Jenis</th><th>Surat</th><th>Ayat</th><th>Ket</th><th>Baris</th><th>Total</th></tr>`;

    let no = 1;
    sorted.forEach(siswa => {
      siswa.entries.sort((a, b) => a.tanggal.localeCompare(b.tanggal)).forEach((e, i) => {
        html += `<tr>`;
        html += `<td>${i === 0 ? no : ''}</td>`;
        html += `<td>${i === 0 ? siswa.nama : ''}</td>`;
        html += `<td>${i === 0 ? siswa.kelas : ''}</td>`;
        html += `<td>${this.formatTanggal(e.tanggal)}</td>`;
        html += `<td>${this.jenisName(e) || '—'}</td>`;
        html += `<td>${e.menghafal !== 'ya' ? '—' : e.surat || '—'}</td>`;
        html += `<td>${e.menghafal !== 'ya' ? (e.alasan || AppConfig.MENGHAFAL_LABELS[e.menghafal] || '—') : `${e.ayatDari || ''}${e.ayatSampai ? ' – ' + e.ayatSampai : ''}`}</td>`;
        html += `<td>${e.menghafal !== 'ya' ? '—' : e.keterangan || '—'}</td>`;
        html += `<td>${e.baris || 0}</td>`;
        html += `<td>${i === 0 ? siswa.totalBaris : ''}</td>`;
        html += `</tr>`;
      });
      no++;
    });

    html += `</table></body></html>`;
    this.downloadFile(html, 'laporan-tahfidz.xls', 'application/vnd.ms-excel');
    NotificationService.success('File Excel berhasil diunduh!');
  },

  /**
   * Download file
   */
  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ==========================================
  // SYNC UI
  // ==========================================

  /**
   * Tambah UI sync status
   */
  addSyncUI() {
    const tableInfo = document.querySelector('#output .table-info');
    if (!tableInfo || document.querySelector('.sync-container')) return;

    const syncDiv = document.createElement('div');
    syncDiv.className = 'sync-container';
    syncDiv.innerHTML = `
      <div class="sync-controls">
        <button class="btn-sync" onclick="OutputTable.update()"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 4v5h-5"/></svg>Refresh Data</button>
        <div id="syncStatus" class="sync-status">Menunggu sync...</div>
      </div>
    `;
    tableInfo.appendChild(syncDiv);
  }
};

console.log('✅ OutputTable module loaded');
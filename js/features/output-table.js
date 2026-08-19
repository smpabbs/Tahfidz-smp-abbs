// ====================================================
// js/features/output-table.js - TABEL OUTPUT & EXPORT
// ====================================================

const OutputTable = {
  
  /**
   * Inisialisasi
   */
  init() {
    this.addSyncUI();
    this.startAutoSync();
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
    tbody.innerHTML = '<tr><td colspan="10" class="no-data">⏳ Memuat data...</td></tr>';

    try {
      // Load data dari Supabase
      AppState.tahfidzRecords = await DatabaseService.loadTahfidzRecords();
      AppState.setSyncStatus('success', `Data terbaru (${AppState.totalRecords} records)`);

      // Render tabel
      this.render(tbody, thead, summary);
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      tbody.innerHTML = '<tr><td colspan="10" class="no-data">❌ Gagal memuat data</td></tr>';
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
      thead.innerHTML = '<tr><th colspan="10">Data Capaian Tahfidz</th></tr>';
      tbody.innerHTML = '<tr><td colspan="10" class="no-data">Belum ada data</td></tr>';
      if (summary) summary.textContent = 'Menampilkan 0 data';
      const cards = document.getElementById('outputCards');
      if (cards) cards.innerHTML = '<div class="no-data">Belum ada data</div>';
      return;
    }

    // Header
    thead.innerHTML = `
      <tr>
        <th>No</th><th>Nama Siswa</th><th>Kelas</th><th>Tanggal</th>
        <th>Surat</th><th>Ayat</th><th>Keterangan</th><th>Baris</th>
        <th>Total</th><th>Aksi</th>
      </tr>
    `;

    // Group by siswa
    const grouped = this.groupBySiswa(filtered);
    const sorted = this.sortSiswa(Object.values(grouped));

    // Build rows
    let globalNo = 1;
    sorted.forEach(siswa => {
      const sortedEntries = siswa.entries.sort((a, b) => 
        a.tanggal.localeCompare(b.tanggal)
      );

      sortedEntries.forEach((entry, i) => {
        const isFirst = i === 0;
        const row = this.createRow(entry, siswa, globalNo, isFirst);
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
   * desktop. Tombol Ubah/Hapus memanggil EditInline.toggle() dan
   * OutputTable.deleteRecord() yang sama persis dengan tabel, dengan
   * originalIndex yang sama — tidak ada logika yang digandakan.
   */
  renderMobileCards(sorted) {
    const box = document.getElementById('outputCards');
    if (!box) return;

    const nilaiClass = { Mumtaz: 'mumtaz', 'Jayid Jiddan': 'jj', Jayid: 'jayid' };

    box.innerHTML = sorted.map(siswa => {
      const total = siswa.totalBaris;
      const initials = siswa.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const entries = siswa.entries
        .slice()
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
        .map(entry => {
          const isTidak = entry.menghafal !== 'ya';
          if (isTidak) {
            const label = entry.alasan || AppConfig.MENGHAFAL_LABELS[entry.menghafal] || 'tanpa alasan';
            return `
              <div class="oerow absent">
                <div class="odt">${this.formatTanggal(entry.tanggal)}</div>
                <div class="omid"><div class="osurat">Tidak setoran — ${label}</div></div>
              </div>
            `;
          }
          const ayat = entry.ayatDari && entry.ayatSampai
            ? `${parseFloat(entry.ayatDari)} – ${parseFloat(entry.ayatSampai)}`
            : (entry.ayatDari ? parseFloat(entry.ayatDari).toString() : '—');
          const cls = nilaiClass[entry.keterangan] || 'jayid';
          const mJenis = entry.jenis && entry.jenis !== 'ziyadah'
            ? `<span class="jenis-tag">${this.jenisName(entry)}</span> ` : '';
          return `
            <div class="oerow">
              <div class="odt">${this.formatTanggal(entry.tanggal)}</div>
              <div class="omid">
                <div class="osurat">${mJenis}${entry.surat || '—'} <span class="oayat">· ${ayat}</span></div>
                <div class="ometa">
                  <span class="opill ${cls}">${entry.keterangan || '—'}</span>
                  <span class="obaris">${parseFloat(entry.baris) || 0} baris</span>
                </div>
              </div>
              <div class="oacts">
                <button class="btn-edit" onclick="EditInline.toggle(${entry.originalIndex})" title="Edit"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
                <button class="btn-delete" onclick="OutputTable.deleteRecord(${entry.originalIndex})" title="Hapus"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
              </div>
            </div>
          `;
        })
        .join('');

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
          ${entries}
        </div>
      `;
    }).join('');
  },

  /**
   * Dapatkan data terfilter
   */
  getFilteredData() {
    const filterKelas = document.getElementById('filterKelas')?.value || '';
    const filterBulan = document.getElementById('filterBulan')?.value || '';
    const filterTahun = document.getElementById('filterTahun')?.value || '';

    return AppState.tahfidzRecords.filter(d => {
      if (!d || !d.nama) return false;
      if (filterKelas && d.kelas !== filterKelas) return false;

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
   * Nama jenis aktivitas (Ziyadah/Murajaah/Tilawah) utk tampilan & export
   * @param {object} e - record
   * @returns {string|null} label, atau null untuk absence
   */
  jenisName(e) {
    if (!e || e.menghafal !== 'ya') return null;
    return AppConfig.JENIS_LABELS[e.jenis] || AppConfig.JENIS_LABELS.ziyadah;
  },

  /**
   * Buat row tabel
   */
  createRow(entry, siswa, globalNo, isFirst) {
    const row = document.createElement('tr');
    row.className = (entry.originalIndex % 2 === 0) ? 'even' : 'odd';
    row.setAttribute('data-original-index', entry.originalIndex);
    row.setAttribute('data-menghafal', entry.menghafal || 'ya');

    const isTidak = entry.menghafal !== 'ya';
    const cellClass = isTidak ? 'not-memorizing' : '';

    // Format data
    const suratDisplay = isTidak ? '—' : (entry.surat || '—');
    const ayatDisplay = isTidak
      ? (entry.alasan || AppConfig.MENGHAFAL_LABELS[entry.menghafal] || 'Tidak menghafal')
      : (entry.ayatDari && entry.ayatSampai
          ? `${parseFloat(entry.ayatDari)} – ${parseFloat(entry.ayatSampai)}`
          : (entry.ayatDari ? parseFloat(entry.ayatDari).toString() : '—'));
    const keteranganDisplay = isTidak ? '—' : (entry.keterangan || '—');
    const barisDisplay = isTidak ? '0' : (parseFloat(entry.baris) || 0).toString();
    const jenisName = this.jenisName(entry);
    const jenisTag = (jenisName && entry.jenis && entry.jenis !== 'ziyadah')
      ? `<span class="jenis-tag">${jenisName}</span> `
      : '';

    if (isFirst) {
      row.innerHTML = `
        <td rowspan="${siswa.rowspan}">${globalNo}</td>
        <td rowspan="${siswa.rowspan}"><strong>${siswa.nama}</strong></td>
        <td rowspan="${siswa.rowspan}"><span class="kelas-badge">${siswa.kelas}</span></td>
        <td>${this.formatTanggal(entry.tanggal)}</td>
        <td class="${cellClass}">${jenisTag}${suratDisplay}</td>
        <td class="${cellClass}">${ayatDisplay}</td>
        <td class="${cellClass}">${keteranganDisplay}</td>
        <td>${barisDisplay}</td>
        <td rowspan="${siswa.rowspan}" class="total-cell">${siswa.totalBaris}</td>
        <td>
          <button class="btn-edit" onclick="EditInline.toggle(${entry.originalIndex})" title="Edit"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          <button class="btn-delete" onclick="OutputTable.deleteRecord(${entry.originalIndex})" title="Hapus"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
        </td>
      `;
    } else {
      row.innerHTML = `
        <td>${this.formatTanggal(entry.tanggal)}</td>
        <td class="${cellClass}">${suratDisplay}</td>
        <td class="${cellClass}">${ayatDisplay}</td>
        <td class="${cellClass}">${keteranganDisplay}</td>
        <td>${barisDisplay}</td>
        <td>
          <button class="btn-edit" onclick="EditInline.toggle(${entry.originalIndex})" title="Edit"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          <button class="btn-delete" onclick="OutputTable.deleteRecord(${entry.originalIndex})" title="Hapus"><svg class="ico-sm" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
        </td>
      `;
    }

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
  },

  /**
   * Auto sync setiap 30 detik
   */
  startAutoSync() {
    setInterval(() => {
      if (AppState.currentTab === 'output') {
        console.log('🔄 Auto-syncing...');
        this.update();
      }
    }, AppConfig.AUTO_SYNC_INTERVAL);
  }
};

console.log('✅ OutputTable module loaded');
// ====================================================
// js/features/import-data.js - IMPORT DATA CSV/EXCEL
// ====================================================

const ImportManager = {
  
  currentType: '',
  parsedData: [],
  validatedData: [],
  errors: [],

  /**
   * Buka modal import
   * @param {string} type - 'siswa' | 'kelas' | 'guru'
   */
  openModal(type) {
    this.currentType = type;
    this.parsedData = [];
    this.validatedData = [];
    this.errors = [];

    // Update judul modal
    const titles = {
      siswa: '📥 Import Data Siswa',
      kelas: '📥 Import Data Kelas',
      guru: '📥 Import Data Guru'
    };
    Modal.setTitle('modalImport', titles[type] || '📥 Import Data');

    // Reset UI
    this.clearFile();
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('btnImport').disabled = true;

    Modal.open('modalImport');
    this.setupFileInput();
  },

  /**
   * Setup file input listener
   */
  setupFileInput() {
    const input = document.getElementById('importFile');
    if (input) {
      input.removeEventListener('change', this._fileHandler);
      this._fileHandler = (e) => this.handleFileSelect(e);
      input.addEventListener('change', this._fileHandler);
    }
  },

  /**
   * Handle file yang dipilih
   */
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Tampilkan info file
    const fileNameEl = document.getElementById('fileName');
    const fileInfoEl = document.getElementById('fileInfo');
    if (fileNameEl) fileNameEl.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
    if (fileInfoEl) fileInfoEl.style.display = 'flex';

    // Baca file
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        this.parseCSV(content);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Untuk Excel, coba parse sebagai CSV dulu
        NotificationService.warning('Format Excel perlu konversi. Gunakan CSV untuk hasil terbaik.');
        this.parseCSV(content);
      } else {
        NotificationService.error('Format tidak didukung! Gunakan CSV.');
      }
    };

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reader.readAsText(file); // fallback
    }
  },

  /**
   * Parse CSV
   */
  parseCSV(csvText) {
    try {
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        NotificationService.error('File kosong atau hanya header!');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
      
      // Parse data
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/["']/g, ''));
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        data.push(row);
      }

      this.parsedData = data;
      console.log(`✅ Parsed ${data.length} rows`);

      this.validateData();
      this.showPreview();

    } catch (error) {
      console.error('❌ Parse error:', error);
      NotificationService.error('Gagal parsing file: ' + error.message);
    }
  },

  /**
   * Validasi data
   */
  validateData() {
    this.errors = [];
    this.validatedData = [];

    if (this.parsedData.length === 0) {
      NotificationService.error('Tidak ada data untuk divalidasi!');
      return;
    }

    switch (this.currentType) {
      case 'siswa': this.validateSiswa(); break;
      case 'kelas': this.validateKelas(); break;
      case 'guru': this.validateGuru(); break;
    }

    console.log(`✅ Valid: ${this.validatedData.length} | Errors: ${this.errors.length}`);
  },

  /**
   * Validasi data siswa
   */
  validateSiswa() {
    this.parsedData.forEach((row, index) => {
      const errors = [];
      
      if (!row.nama) errors.push('Nama wajib diisi');
      if (!row.kelas_name && !row.kelas) errors.push('Kelas wajib diisi');

      const validRow = {
        nama: row.nama || '',
        kelas_name: (row.kelas_name || row.kelas || '').toUpperCase(),
        whatsapp: row.whatsapp || '',
        isDuplicate: false,
        isNewKelas: false
      };

      // Cek kelas
      const kelasExists = AppState.masterKelas.some(k => k.kelas_name === validRow.kelas_name);
      if (!kelasExists) {
        validRow.isNewKelas = true;
        errors.push(`Kelas "${validRow.kelas_name}" belum ada, akan dibuat otomatis`);
      }

      // Cek duplikat
      const duplicate = AppState.masterSiswa.find(s => 
        s.nama.toLowerCase() === validRow.nama.toLowerCase() && 
        s.kelas_name === validRow.kelas_name
      );
      if (duplicate) {
        validRow.isDuplicate = true;
        errors.push('Data sudah ada, akan dilewati');
      }

      // Hanya tambahkan ke errors jika bukan info
      const realErrors = errors.filter(e => !e.includes('akan dibuat') && !e.includes('dilewati'));
      if (realErrors.length > 0) {
        this.errors.push({ row: index + 2, errors: realErrors, data: validRow });
      }

      this.validatedData.push(validRow);
    });
  },

  /**
   * Validasi data kelas
   */
  validateKelas() {
    this.parsedData.forEach((row, index) => {
      const errors = [];
      
      if (!row.kelas_name && !row.nama_kelas) errors.push('Nama kelas wajib diisi');

      const validRow = {
        kelas_name: (row.kelas_name || row.nama_kelas || '').toUpperCase(),
        label: row.label || row.kelas_name || row.nama_kelas || '',
        isDuplicate: false
      };

      const duplicate = AppState.masterKelas.find(k => k.kelas_name === validRow.kelas_name);
      if (duplicate) {
        validRow.isDuplicate = true;
        errors.push('Kelas sudah ada, akan dilewati');
      }

      if (errors.length > 0 && !errors.some(e => e.includes('dilewati'))) {
        this.errors.push({ row: index + 2, errors });
      }

      this.validatedData.push(validRow);
    });
  },

  /**
   * Validasi data guru
   */
  validateGuru() {
    this.parsedData.forEach((row, index) => {
      const errors = [];
      
      if (!row.nama) errors.push('Nama guru wajib diisi');
      if (!row.token_fonnte && !row.token) errors.push('Token wajib diisi');

      const validRow = {
        nama: row.nama || '',
        token_fonnte: row.token_fonnte || row.token || '',
        isDuplicate: false
      };

      const duplicate = AppState.masterGuru.find(g => 
        g.nama.toLowerCase() === validRow.nama.toLowerCase()
      );
      if (duplicate) {
        validRow.isDuplicate = true;
        errors.push('Guru sudah ada, akan dilewati');
      }

      if (errors.length > 0 && !errors.some(e => e.includes('dilewati'))) {
        this.errors.push({ row: index + 2, errors });
      }

      this.validatedData.push(validRow);
    });
  },

  /**
   * Tampilkan preview
   */
  showPreview() {
    const previewSection = document.getElementById('previewSection');
    if (!previewSection) return;

    previewSection.style.display = 'block';

    // Info
    const previewInfo = document.getElementById('previewInfo');
    if (previewInfo) {
      previewInfo.innerHTML = `
        <strong>📊 Total:</strong> ${this.parsedData.length} | 
        <strong>✅ Valid:</strong> ${this.validatedData.length} | 
        <strong>❌ Error:</strong> ${this.errors.length}
      `;
    }

    // Tabel preview
    if (this.validatedData.length > 0) {
      const headers = Object.keys(this.validatedData[0]).filter(k => !k.startsWith('is'));
      
      const thead = document.getElementById('previewTableHead');
      const tbody = document.getElementById('previewTableBody');
      
      if (thead) thead.innerHTML = `<tr>${headers.map(h => `<th>${h.replace('_', ' ')}</th>`).join('')}</tr>`;
      
      if (tbody) {
        tbody.innerHTML = this.validatedData.slice(0, 10).map((row, i) => `
          <tr class="${this.errors.some(e => e.row === i + 2) ? 'preview-row-error' : 'preview-row-valid'}">
            ${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}
          </tr>
        `).join('');
      }
    }

    // Validation summary
    const summary = document.getElementById('validationSummary');
    if (summary) {
      if (this.errors.length === 0) {
        summary.innerHTML = '<div class="validation-summary all-valid"><div class="validation-item valid"><span class="validation-icon">✅</span> Semua data valid! Siap diimport.</div></div>';
      } else {
        summary.innerHTML = `
          <div class="validation-summary has-errors">
            <h5>⚠️ ${this.errors.length} masalah:</h5>
            ${this.errors.slice(0, 5).map(e => `
              <div class="validation-item error"><span class="validation-icon">❌</span> Baris ${e.row}: ${e.errors.join(', ')}</div>
            `).join('')}
          </div>
        `;
      }
    }

    // Enable import button
    const btnImport = document.getElementById('btnImport');
    if (btnImport) {
      btnImport.disabled = this.validatedData.length === 0;
    }
  },

  /**
   * Clear file
   */
  clearFile() {
    const fileInput = document.getElementById('importFile');
    const fileInfo = document.getElementById('fileInfo');
    const preview = document.getElementById('previewSection');
    const btnImport = document.getElementById('btnImport');

    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (preview) preview.style.display = 'none';
    if (btnImport) btnImport.disabled = true;

    this.parsedData = [];
    this.validatedData = [];
    this.errors = [];
  },

  /**
   * Eksekusi import
   */
  async executeImport() {
    if (this.validatedData.length === 0) {
      NotificationService.error('Tidak ada data valid!');
      return;
    }

    const confirmed = await ConfirmDialog.show(
      `✅ ${this.validatedData.filter(d => !d.isDuplicate).length} data baru akan diimport\n` +
      `🔄 ${this.validatedData.filter(d => d.isDuplicate).length} data duplikat dilewati\n` +
      `${this.errors.length > 0 ? `❌ ${this.errors.length} error dilewati\n` : ''}`,
      { title: `Import Data ${this.currentType.toUpperCase()}`, confirmText: 'Ya, Import' }
    );

    if (!confirmed) return;

    NotificationService.loading('Mengimport data...');

    let success = 0;
    let fail = 0;

    for (const item of this.validatedData) {
      if (item.isDuplicate) continue;

      try {
        switch (this.currentType) {
          case 'siswa':
            await DatabaseService.saveMasterSiswa({
              nama: item.nama,
              kelas_name: item.kelas_name,
              whatsapp: item.whatsapp,
              is_active: true,
              sort_order: 1,
              created_at: new Date().toISOString()
            });
            break;

          case 'kelas':
            await DatabaseService.saveMasterKelas({
              kelas_name: item.kelas_name,
              label: item.label || item.kelas_name,
              sort_order: AppState.masterKelas.length + 1,
              created_at: new Date().toISOString()
            });
            break;

          case 'guru':
            await DatabaseService.saveMasterGuru({
              nama: item.nama,
              token_fonnte: item.token_fonnte,
              is_active: true,
              sort_order: AppState.masterGuru.length + 1,
              created_at: new Date().toISOString()
            });
            break;
        }
        success++;
      } catch (error) {
        console.error('❌ Import error:', error);
        fail++;
      }
    }

    NotificationService.hide();
    
    let msg = `✅ ${success} data berhasil diimport`;
    if (fail > 0) msg += `\n❌ ${fail} data gagal`;
    NotificationService.show(fail > 0 ? 'warning' : 'success', msg, 5000);

    // Reload master data
    await MasterData.loadAll();
    Modal.close('modalImport');
  },

  /**
   * Download template CSV
   */
  downloadTemplate() {
    let csv = '';

    switch (this.currentType) {
      case 'siswa':
        csv = 'nama,kelas_name,whatsapp\nAhmad,9A,0859106544812\nSiti,9B,0859106544812';
        break;
      case 'kelas':
        csv = 'kelas_name,label\n9A,9A\n9B,9B';
        break;
      case 'guru':
        csv = 'nama,token_fonnte\nUst. Ahmad,nCkVWGeAvA9zpBRn4ynh';
        break;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `template-${this.currentType}.csv`;
    a.click();

    NotificationService.success('Template diunduh!');
  },

  /**
   * Format ukuran file
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  },

  _fileHandler: null
};

console.log('✅ ImportManager module loaded');
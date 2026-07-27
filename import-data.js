// import-data.js - IMPORT DATA MANAGEMENT
// ====================================================

// 🎯 GLOBAL VARIABLES
let currentImportType = ''; // 'siswa', 'kelas', atau 'guru'
let parsedData = [];
let validatedData = [];
let importErrors = [];

// 📥 OPEN IMPORT MODAL
// ====================================================

/**
 * Open import modal
 */
function openImportModal(type) {
  currentImportType = type;
  
  // Update modal title
  const titles = {
    'siswa': '📥 Import Data Siswa',
    'kelas': '📥 Import Data Kelas',
    'guru': '📥 Import Data Guru'
  };
  
  document.getElementById('modalImportTitle').textContent = titles[type] || '📥 Import Data';
  
  // Reset modal
  clearFile();
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('btnImport').disabled = true;
  
  openModal('modalImport');
}

// 📁 FILE HANDLING
// ====================================================

/**
 * Handle file select
 */
async function handleFileSelect(event) {
  const file = event.target.files[0];
  
  if (!file) return;
  
  // Show file info
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileInfo').style.display = 'flex';
  document.querySelector('.upload-placeholder').style.display = 'none';
  
  // Parse file
  showNotification('loading', 'Membaca file...', 0);
  
  try {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
      await parseCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      await parseExcel(file);
    } else {
      throw new Error('Format file tidak didukung');
    }
    
    // Validate data
    await validateImportData();
    
    // Show preview
    showPreview();
    
    removeExistingNotification();
    
  } catch (error) {
    console.error('Error parsing file:', error);
    showNotification('error', 'Gagal membaca file: ' + error.message);
    clearFile();
  }
}

/**
 * Parse CSV file
 */
function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        parsedData = results.data;
        console.log('✅ CSV parsed:', parsedData.length, 'rows');
        resolve();
      },
      error: function(error) {
        reject(error);
      }
    });
  });
}

/**
 * Parse Excel file
 */
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON
        parsedData = XLSX.utils.sheet_to_json(firstSheet, { raw: false });
        
        console.log('✅ Excel parsed:', parsedData.length, 'rows');
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = function(error) {
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Clear file
 */
function clearFile() {
  document.getElementById('importFile').value = '';
  document.getElementById('fileInfo').style.display = 'none';
  document.querySelector('.upload-placeholder').style.display = 'block';
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('btnImport').disabled = true;
  
  parsedData = [];
  validatedData = [];
  importErrors = [];
}

// ✅ VALIDATION
// ====================================================

/**
 * Validate import data based on type
 */
async function validateImportData() {
  validatedData = [];
  importErrors = [];
  
  switch(currentImportType) {
    case 'siswa':
      await validateSiswaData();
      break;
    case 'kelas':
      await validateKelasData();
      break;
    case 'guru':
      await validateGuruData();
      break;
  }
  
  console.log('✅ Validation complete:', validatedData.length, 'valid,', importErrors.length, 'errors');
}

/**
 * Validate siswa data
 */
async function validateSiswaData() {
  // Ensure kelas data is loaded
  if (masterKelasData.length === 0) {
    await loadMasterKelas();
  }
  
  // Get existing siswa for duplicate check
  const existingSiswa = masterSiswaData.map(s => s.nama.toLowerCase().trim());
  
  for (let i = 0; i < parsedData.length; i++) {
    const row = parsedData[i];
    const errors = [];
    
    // Validate nama
    if (!row.nama || row.nama.trim() === '') {
      errors.push('Nama tidak boleh kosong');
    }
    
    // Validate kelas
    if (!row.kelas || row.kelas.trim() === '') {
      errors.push('Kelas tidak boleh kosong');
    }
    
    // Validate whatsapp
    if (!row.whatsapp || row.whatsapp.trim() === '') {
      errors.push('WhatsApp tidak boleh kosong');
    } else {
      const normalized = normalizeWhatsApp(row.whatsapp);
      if (!normalized) {
        errors.push('Format WhatsApp tidak valid');
      }
    }
    
    if (errors.length === 0) {
      validatedData.push({
        nama: row.nama.trim(),
        kelas_name: row.kelas.trim().toUpperCase(),
        whatsapp: normalizeWhatsApp(row.whatsapp),
        rowIndex: i + 1,
        isDuplicate: existingSiswa.includes(row.nama.trim().toLowerCase()),
        isNewKelas: !masterKelasData.some(k => k.kelas_name === row.kelas.trim().toUpperCase())
      });
    } else {
      importErrors.push({
        rowIndex: i + 1,
        data: row,
        errors: errors
      });
    }
  }
}

/**
 * Validate kelas data
 */
async function validateKelasData() {
  const existingKelas = masterKelasData.map(k => k.kelas_name.toLowerCase());
  
  for (let i = 0; i < parsedData.length; i++) {
    const row = parsedData[i];
    const errors = [];
    
    // Validate kelas_name
    if (!row.kelas_name || row.kelas_name.trim() === '') {
      errors.push('Nama kelas tidak boleh kosong');
    }
    
    if (errors.length === 0) {
      const kelasName = row.kelas_name.trim().toUpperCase();
      validatedData.push({
        kelas_name: kelasName,
        label: kelasName,
        rowIndex: i + 1,
        isDuplicate: existingKelas.includes(kelasName.toLowerCase())
      });
    } else {
      importErrors.push({
        rowIndex: i + 1,
        data: row,
        errors: errors
      });
    }
  }
}

/**
 * Validate guru data
 */
async function validateGuruData() {
  const existingGuru = masterGuruData.map(g => g.nama.toLowerCase().trim());
  
  for (let i = 0; i < parsedData.length; i++) {
    const row = parsedData[i];
    const errors = [];
    
    // Validate nama
    if (!row.nama || row.nama.trim() === '') {
      errors.push('Nama guru tidak boleh kosong');
    }
    
    // Validate token
    if (!row.token_fonnte || row.token_fonnte.trim() === '') {
      errors.push('Token Fonnte tidak boleh kosong');
    }
    
    if (errors.length === 0) {
      validatedData.push({
        nama: row.nama.trim(),
        token_fonnte: row.token_fonnte.trim(),
        rowIndex: i + 1,
        isDuplicate: existingGuru.includes(row.nama.trim().toLowerCase())
      });
    } else {
      importErrors.push({
        rowIndex: i + 1,
        data: row,
        errors: errors
      });
    }
  }
}

/**
 * Normalize WhatsApp number to 628xxx format
 */
function normalizeWhatsApp(whatsapp) {
  if (!whatsapp) return null;
  
  // Remove all non-numeric characters
  let cleaned = whatsapp.toString().replace(/\D/g, '');
  
  // Convert to 628xxx format
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  } else if (cleaned.startsWith('628')) {
    // Already in correct format
  } else if (cleaned.startsWith('62')) {
    // Already starts with 62, keep as is
  } else {
    return null; // Invalid format
  }
  
  // Validate length (Indonesian phone: 10-15 digits)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }
  
  return cleaned;
}

// 👁️ PREVIEW
// ====================================================

/**
 * Show preview of data
 */
function showPreview() {
  const previewSection = document.getElementById('previewSection');
  const previewInfo = document.getElementById('previewInfo');
  const previewTableHead = document.getElementById('previewTableHead');
  const previewTableBody = document.getElementById('previewTableBody');
  const validationSummary = document.getElementById('validationSummary');
  const btnImport = document.getElementById('btnImport');
  
  // Show section
  previewSection.style.display = 'block';
  
  // Update info
  const totalRows = parsedData.length;
  const validRows = validatedData.length;
  const errorRows = importErrors.length;
  
  previewInfo.innerHTML = `
    <span><strong>Total:</strong> ${totalRows} baris</span>
    <span><strong>Valid:</strong> <span style="color: #a3be8c;">${validRows}</span></span>
    <span><strong>Error:</strong> <span style="color: #bf616a;">${errorRows}</span></span>
  `;
  
  // Build table header
  let headerHTML = '<tr>';
  headerHTML += '<th style="width: 50px;">Baris</th>';
  
  switch(currentImportType) {
    case 'siswa':
      headerHTML += '<th>Nama</th><th>Kelas</th><th>WhatsApp</th><th style="width: 80px;">Status</th>';
      break;
    case 'kelas':
      headerHTML += '<th>Nama Kelas</th><th style="width: 80px;">Status</th>';
      break;
    case 'guru':
      headerHTML += '<th>Nama Guru</th><th>Token Fonnte</th><th style="width: 80px;">Status</th>';
      break;
  }
  
  headerHTML += '</tr>';
  previewTableHead.innerHTML = headerHTML;
  
  // Build table body (show max 50 rows)
  const maxPreview = 50;
  let bodyHTML = '';
  
  // Show valid data
  validatedData.slice(0, maxPreview).forEach(item => {
    const rowClass = item.isDuplicate ? 'preview-row-error' : 'preview-row-valid';
    bodyHTML += `<tr class="${rowClass}">`;
    bodyHTML += `<td>${item.rowIndex}</td>`;
    
    switch(currentImportType) {
      case 'siswa':
        bodyHTML += `<td>${item.nama}</td>`;
        bodyHTML += `<td>${item.kelas_name}${item.isNewKelas ? ' <span class="status-badge error">Kelas Baru</span>' : ''}</td>`;
        bodyHTML += `<td>${item.whatsapp}</td>`;
        bodyHTML += `<td><span class="status-badge ${item.isDuplicate ? 'error' : 'valid'}">${item.isDuplicate ? 'Update' : '✓'}</span></td>`;
        break;
      case 'kelas':
        bodyHTML += `<td>${item.kelas_name}</td>`;
        bodyHTML += `<td><span class="status-badge ${item.isDuplicate ? 'error' : 'valid'}">${item.isDuplicate ? 'Skip' : '✓'}</span></td>`;
        break;
      case 'guru':
        bodyHTML += `<td>${item.nama}</td>`;
        bodyHTML += `<td>${item.token_fonnte.substring(0, 15)}...</td>`;
        bodyHTML += `<td><span class="status-badge ${item.isDuplicate ? 'error' : 'valid'}">${item.isDuplicate ? 'Update' : '✓'}</span></td>`;
        break;
    }
    
    bodyHTML += '</tr>';
  });
  
  // Show error data
  importErrors.slice(0, maxPreview).forEach(item => {
    bodyHTML += `<tr class="preview-row-error">`;
    bodyHTML += `<td>${item.rowIndex}</td>`;
    
    switch(currentImportType) {
      case 'siswa':
        bodyHTML += `<td>${item.data.nama || '-'}</td>`;
        bodyHTML += `<td>${item.data.kelas || '-'}</td>`;
        bodyHTML += `<td>${item.data.whatsapp || '-'}</td>`;
        break;
      case 'kelas':
        bodyHTML += `<td>${item.data.kelas_name || '-'}</td>`;
        break;
      case 'guru':
        bodyHTML += `<td>${item.data.nama || '-'}</td>`;
        bodyHTML += `<td>${item.data.token_fonnte || '-'}</td>`;
        break;
    }
    
    bodyHTML += `<td><span class="status-badge error">✗</span></td>`;
    bodyHTML += '</tr>';
    bodyHTML += `<tr class="preview-row-error"><td colspan="10"><span class="error-tooltip">${item.errors.join(', ')}</span></td></tr>`;
  });
  
  if (totalRows > maxPreview) {
    bodyHTML += `<tr><td colspan="10" class="no-data">... dan ${totalRows - maxPreview} baris lainnya</td></tr>`;
  }
  
  previewTableBody.innerHTML = bodyHTML;
  
  // Validation summary
  let summaryHTML = '<strong>Ringkasan Validasi:</strong><br>';
  
  if (errorRows > 0) {
    summaryHTML += `<div class="validation-item error"><span class="validation-icon">❌</span> ${errorRows} baris mengandung error dan akan dilewati</div>`;
  }
  
  if (validRows > 0) {
    const duplicateCount = validatedData.filter(d => d.isDuplicate).length;
    const newCount = validRows - duplicateCount;
    
if (newCount > 0) {
      summaryHTML += `<div class="validation-item valid"><span class="validation-icon">✅</span> ${newCount} data baru akan ditambahkan</div>`;
    }
    
    if (duplicateCount > 0) {
      summaryHTML += `<div class="validation-item error"><span class="validation-icon">🔄</span> ${duplicateCount} data duplikat akan diupdate</div>`;
    }
    
    if (currentImportType === 'siswa') {
      const newKelasCount = validatedData.filter(d => d.isNewKelas).length;
      if (newKelasCount > 0) {
        const uniqueNewKelas = [...new Set(validatedData.filter(d => d.isNewKelas).map(d => d.kelas_name))];
        summaryHTML += `<div class="validation-item error"><span class="validation-icon">🆕</span> ${uniqueNewKelas.length} kelas baru akan dibuat otomatis: ${uniqueNewKelas.join(', ')}</div>`;
      }
    }
  }
  
  validationSummary.innerHTML = summaryHTML;
  validationSummary.className = errorRows > 0 ? 'validation-summary has-errors' : 'validation-summary all-valid';
  
  // Enable/disable import button
  btnImport.disabled = validRows === 0;
  btnImport.textContent = validRows > 0 ? `💾 Import ${validRows} Data` : '💾 Import Data';
}

// 💾 EXECUTE IMPORT
// ====================================================

/**
 * Execute import to Supabase
 */
async function executeImport() {
  if (validatedData.length === 0) {
    showNotification('error', 'Tidak ada data valid untuk diimport!');
    return;
  }
  
  const confirmation = confirm(
    `Konfirmasi Import:\n\n` +
    `✅ ${validatedData.length} data akan diproses\n` +
    `${importErrors.length > 0 ? `❌ ${importErrors.length} data error akan dilewati\n` : ''}` +
    `\nLanjutkan import?`
  );
  
  if (!confirmation) return;
  
  try {
    showNotification('loading', 'Mengimport data ke database...', 0);
    
    let successCount = 0;
    let updateCount = 0;
    let failCount = 0;
    
    switch(currentImportType) {
      case 'siswa':
        ({ successCount, updateCount, failCount } = await importSiswa());
        break;
      case 'kelas':
        ({ successCount, updateCount, failCount } = await importKelas());
        break;
      case 'guru':
        ({ successCount, updateCount, failCount } = await importGuru());
        break;
    }
    
    // Show result
    let resultMessage = `Import selesai!\n\n`;
    if (successCount > 0) resultMessage += `✅ ${successCount} data berhasil ditambahkan\n`;
    if (updateCount > 0) resultMessage += `🔄 ${updateCount} data berhasil diupdate\n`;
    if (failCount > 0) resultMessage += `❌ ${failCount} data gagal diimport`;
    
    showNotification('success', resultMessage, 8000);
    
    // Reload data
    await loadAllMasterData();
    
    // Close modal
    closeModal('modalImport');
    
  } catch (error) {
    console.error('Error importing data:', error);
    showNotification('error', 'Gagal mengimport data: ' + error.message);
  }
}

/**
 * Import siswa to Supabase
 */
async function importSiswa() {
  let successCount = 0;
  let updateCount = 0;
  let failCount = 0;
  
  // Group by kelas to create new kelas first
  const newKelasNames = [...new Set(validatedData.filter(d => d.isNewKelas).map(d => d.kelas_name))];
  
  // Create new kelas first
  for (const kelasName of newKelasNames) {
    try {
      const maxOrder = masterKelasData.reduce((max, k) => Math.max(max, k.sort_order || 0), 0);
      
      const { error } = await supabase
        .from('master_kelas')
        .insert([{
          kelas_name: kelasName,
          label: kelasName,
          sort_order: maxOrder + 1,
          created_at: new Date().toISOString()
        }]);
      
      if (error) {
        console.error('Error creating kelas:', kelasName, error);
      } else {
        console.log('✅ Created new kelas:', kelasName);
      }
    } catch (error) {
      console.error('Error creating kelas:', error);
    }
  }
  
  // Reload kelas data
  await loadMasterKelas();
  
  // Import siswa
  for (const siswa of validatedData) {
    try {
      if (siswa.isDuplicate) {
        // Update existing siswa
        const { error } = await supabase
          .from('master_siswa')
          .update({
            kelas_name: siswa.kelas_name,
            whatsapp: siswa.whatsapp,
            updated_at: new Date().toISOString()
          })
          .eq('nama', siswa.nama);
        
        if (error) throw error;
        updateCount++;
      } else {
        // Insert new siswa
        const maxOrder = masterSiswaData
          .filter(s => s.kelas_name === siswa.kelas_name)
          .reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
        
        const { error } = await supabase
          .from('master_siswa')
          .insert([{
            nama: siswa.nama,
            kelas_name: siswa.kelas_name,
            whatsapp: siswa.whatsapp,
            sort_order: maxOrder + 1,
            is_active: true,
            created_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
        successCount++;
      }
    } catch (error) {
      console.error('Error importing siswa:', siswa.nama, error);
      failCount++;
    }
  }
  
  return { successCount, updateCount, failCount };
}

/**
 * Import kelas to Supabase
 */
async function importKelas() {
  let successCount = 0;
  let updateCount = 0;
  let failCount = 0;
  
  for (const kelas of validatedData) {
    try {
      if (kelas.isDuplicate) {
        // Skip duplicate kelas
        updateCount++;
        continue;
      }
      
      // Insert new kelas
      const maxOrder = masterKelasData.reduce((max, k) => Math.max(max, k.sort_order || 0), 0);
      
      const { error } = await supabase
        .from('master_kelas')
        .insert([{
          kelas_name: kelas.kelas_name,
          label: kelas.label,
          sort_order: maxOrder + 1,
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      successCount++;
      
    } catch (error) {
      console.error('Error importing kelas:', kelas.kelas_name, error);
      failCount++;
    }
  }
  
  return { successCount, updateCount, failCount };
}

/**
 * Import guru to Supabase
 */
async function importGuru() {
  let successCount = 0;
  let updateCount = 0;
  let failCount = 0;
  
  for (const guru of validatedData) {
    try {
      if (guru.isDuplicate) {
        // Update existing guru
        const { error } = await supabase
          .from('master_guru')
          .update({
            token_fonnte: guru.token_fonnte,
            updated_at: new Date().toISOString()
          })
          .eq('nama', guru.nama);
        
        if (error) throw error;
        updateCount++;
      } else {
        // Insert new guru
        const maxOrder = masterGuruData.reduce((max, g) => Math.max(max, g.sort_order || 0), 0);
        
        const { error } = await supabase
          .from('master_guru')
          .insert([{
            nama: guru.nama,
            token_fonnte: guru.token_fonnte,
            sort_order: maxOrder + 1,
            is_active: true,
            created_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
        successCount++;
      }
    } catch (error) {
      console.error('Error importing guru:', guru.nama, error);
      failCount++;
    }
  }
  
  return { successCount, updateCount, failCount };
}

// 📋 DOWNLOAD TEMPLATE
// ====================================================

/**
 * Download Excel template
 */
function downloadTemplate() {
  let templateData = [];
  let filename = '';
  
  switch(currentImportType) {
    case 'siswa':
      templateData = [
        { nama: 'Ahmad', kelas: '9A', whatsapp: '081234567890' },
        { nama: 'Budi', kelas: '9A', whatsapp: '081234567891' },
        { nama: 'Citra', kelas: '9B', whatsapp: '081234567892' }
      ];
      filename = 'template_siswa.xlsx';
      break;
      
    case 'kelas':
      templateData = [
        { kelas_name: '9A' },
        { kelas_name: '9B' },
        { kelas_name: '9C' }
      ];
      filename = 'template_kelas.xlsx';
      break;
      
    case 'guru':
      templateData = [
        { nama: 'Ust. Ahmad', token_fonnte: 'masukkan_token_fonnte_disini' },
        { nama: 'Ust. Yoki', token_fonnte: 'masukkan_token_fonnte_disini' }
      ];
      filename = 'template_guru.xlsx';
      break;
  }
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // Set column widths
  const colWidths = [];
  Object.keys(templateData[0]).forEach(key => {
    colWidths.push({ wch: 20 });
  });
  ws['!cols'] = colWidths;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  
  // Download
  XLSX.writeFile(wb, filename);
  
  showNotification('success', 'Template berhasil didownload!');
}

// 🌐 DRAG & DROP SUPPORT
// ====================================================

// Setup drag and drop
document.addEventListener('DOMContentLoaded', function() {
  const uploadArea = document.getElementById('fileUploadArea');
  
  if (!uploadArea) return;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
      uploadArea.classList.add('dragover');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
      uploadArea.classList.remove('dragover');
    }, false);
  });
  
  uploadArea.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      document.getElementById('importFile').files = files;
      handleFileSelect({ target: { files: files } });
    }
  }
});

// 🌐 EXPORT GLOBAL FUNCTIONS
// ====================================================

window.openImportModal = openImportModal;
window.handleFileSelect = handleFileSelect;
window.clearFile = clearFile;
window.executeImport = executeImport;
window.downloadTemplate = downloadTemplate;

console.log('✅ Import Data JS Loaded');
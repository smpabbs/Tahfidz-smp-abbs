// ====================================================
// js/ui/confirm-dialog.js - DIALOG KONFIRMASI KUSTOM
// Pengganti window.confirm() bawaan browser, dipakai di semua
// aksi yang butuh persetujuan user (hapus data, kirim rekap, dll).
// ====================================================

const ConfirmDialog = {

  _resolve: null,

  /**
   * Tampilkan dialog konfirmasi
   * @param {string} message - Pesan (boleh multi-baris pakai \n)
   * @param {object} options - { title, confirmText, cancelText, danger }
   * @returns {Promise<boolean>} - true jika user menekan tombol konfirmasi
   */
  show(message, options = {}) {
    const {
      title = 'Konfirmasi',
      confirmText = 'Ya, Lanjutkan',
      cancelText = 'Batal',
      danger = false
    } = options;

    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;

    const okBtn = document.getElementById('confirmModalOk');
    okBtn.textContent = confirmText;
    okBtn.className = 'btn-submit' + (danger ? ' btn-danger' : '');

    document.getElementById('confirmModalCancel').textContent = cancelText;

    Modal.open('confirmModal');

    return new Promise(resolve => {
      this._resolve = resolve;
    });
  },

  /**
   * Selesaikan dialog — dipanggil oleh tombol Ya/Batal, tombol ×,
   * klik di luar modal, atau tombol Escape (lewat Modal.close).
   * @param {boolean} value
   */
  resolve(value) {
    const modal = document.getElementById('confirmModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
    if (this._resolve) {
      this._resolve(value);
      this._resolve = null;
    }
  }
};

console.log('✅ ConfirmDialog module loaded');

// ====================================================
// js/ui/modal.js - MODAL UI MANAGER
// ====================================================

const Modal = {
  
  /**
   * Buka modal
   * @param {string} modalId - ID element modal
   */
  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`❌ Modal not found: ${modalId}`);
      return;
    }

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Mencegah scroll background
    console.log(`✅ Modal opened: ${modalId}`);
  },

  /**
   * Tutup modal
   * @param {string} modalId - ID element modal
   */
  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`❌ Modal not found: ${modalId}`);
      return;
    }

    // confirmModal punya promise yang harus di-resolve — biarkan
    // ConfirmDialog yang menutupnya (lewat backdrop klik/Escape/tombol ×)
    if (modalId === 'confirmModal' && typeof ConfirmDialog !== 'undefined') {
      ConfirmDialog.resolve(false);
      return;
    }

    modal.style.display = 'none';
    document.body.style.overflow = ''; // Kembalikan scroll

    // Reset form di dalam modal
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
    }

    console.log(`✅ Modal closed: ${modalId}`);
  },

  /**
   * Tutup semua modal yang terbuka
   */
  closeAll() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
      const form = modal.querySelector('form');
      if (form) form.reset();
    });
    document.body.style.overflow = '';
    console.log('✅ All modals closed');
  },

  /**
   * Update judul modal
   * @param {string} modalId - ID modal
   * @param {string} title - Judul baru
   */
  setTitle(modalId, title) {
    const titleEl = document.getElementById(`${modalId}Title`);
    if (titleEl) {
      titleEl.textContent = title;
    }
  },

  /**
   * Inisialisasi event listener
   */
  init() {
    // Tutup modal saat klik di luar konten
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.close(e.target.id);
      }
    });

    // Tutup modal dengan tombol Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal[style*="display: block"]');
        if (openModal) {
          this.close(openModal.id);
        }
      }
    });

    // Tutup modal saat klik tombol close
    document.querySelectorAll('.modal .close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          this.close(modal.id);
        }
      });
    });

    console.log('✅ Modal events initialized');
  }
};

console.log('✅ Modal module loaded');
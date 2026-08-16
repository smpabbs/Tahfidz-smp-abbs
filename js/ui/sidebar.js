// ====================================================
// js/ui/sidebar.js - SIDEBAR COLLAPSE + DATE (UI ONLY)
// Purely visual: collapses the desktop sidebar and shows
// today's date under the nav. Doesn't touch AppState or
// any data/logic module.
// ====================================================

(function () {
  function initSidebarCollapse() {
    var btn = document.getElementById('sidebarCollapseBtn');
    var shell = document.getElementById('appShell');
    if (!btn || !shell) return;
    btn.addEventListener('click', function () {
      shell.classList.toggle('sidebar-collapsed');
    });
  }

  function renderSidebarDate() {
    var el = document.getElementById('sidebarDate');
    if (!el) return;
    var days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
    var months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    var d = new Date();
    el.textContent = days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  initSidebarCollapse();
  renderSidebarDate();
})();

console.log('✅ Sidebar UI module loaded');

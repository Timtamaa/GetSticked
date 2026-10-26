/* ==========================================================
   APP — navigasi antar halaman (satu aplikasi, banyak halaman)

   Halaman dipilih lewat hash URL (#stickup, #recovery), sehingga
   tombol back/forward dan refresh browser tetap bekerja.
   Menambah halaman baru: tambahkan satu entri di PAGES, satu
   <div class="app-page" id="page-..."> di index.html, dan satu
   tautan <a class="nav-link" data-page="..."> di menu.
   ========================================================== */

(function () {
  const PAGES = {
    stickup:  { title: 'Stick-Up Gauge — Simulasi Per-Meter' },
    recovery: { title: 'Recovery Sample — Stick-Up Gauge' },
  };
  const DEFAULT_PAGE = 'stickup';

  const links = document.querySelectorAll('.nav-link[data-page]');

  function showPage() {
    let key = window.location.hash.replace('#', '');
    if (!PAGES[key]) key = DEFAULT_PAGE;

    Object.keys(PAGES).forEach((k) => {
      const el = document.getElementById('page-' + k);
      if (el) el.hidden = (k !== key);
    });

    links.forEach((a) => {
      const active = a.dataset.page === key;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    document.title = PAGES[key].title;
  }

  window.addEventListener('hashchange', showPage);
  showPage();
})();

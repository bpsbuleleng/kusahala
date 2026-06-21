/* =====================================================================
 *  app.js — helper yang dipakai semua halaman
 * ===================================================================== */

// Format Rupiah: 10000 -> "Rp10.000"
function rupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID');
}

// Cegah XSS saat menaruh teks DB ke innerHTML
function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// URL publik gambar barang di Supabase Storage.
// Bila kosong / "default.jpg", pakai placeholder lokal.
function imgUrl(namaFile) {
  if (!namaFile || namaFile === 'default.jpg') {
    return 'img/placeholder.svg';
  }
  // sudah berupa URL penuh? pakai apa adanya
  if (/^https?:\/\//.test(namaFile)) return namaFile;
  return sb.storage.from(BUCKET).getPublicUrl(namaFile).data.publicUrl;
}

// Toast kecil ala marketplace (tanpa library)
function toast(msg, type = 'dark') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast-mini toast-${type}`;
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2200);
}

// Header + bottom-nav bersama. Panggil renderShell('index') di tiap halaman.
function renderShell(active) {
  const cartCount = (typeof Cart !== 'undefined') ? Cart.totalQty() : 0;

  const top = document.getElementById('app-header');
  if (top) {
    top.innerHTML = `
      <div class="topbar">
        <a class="brand" href="index.html">🛒 Koperasi</a>
        <div class="topbar-search">
          <input id="global-search" type="search" placeholder="Cari barang di koperasi..." autocomplete="off">
          <span class="ts-ico">🔍</span>
        </div>
        <a class="topbar-cart" href="keranjang.html" title="Keranjang">
          🛍️<span class="cart-badge" id="cart-badge" ${cartCount ? '' : 'hidden'}>${cartCount}</span>
        </a>
      </div>`;
  }

  const bottom = document.getElementById('app-bottomnav');
  if (bottom) {
    const item = (id, href, ico, label) =>
      `<a class="bn-item ${active === id ? 'active' : ''}" href="${href}">
         <span class="bn-ico">${ico}</span><span>${label}</span></a>`;
    bottom.innerHTML = `
      ${item('index', 'index.html', '🏠', 'Belanja')}
      ${item('pesanan', 'pesanan.html', '🏆', 'Juara')}
      ${item('keranjang', 'keranjang.html', '🛍️', 'Keranjang')}
      ${item('admin', 'admin-barang.html', '⚙️', 'Admin')}`;
  }
}

// Perbarui badge jumlah keranjang di header
function refreshCartBadge() {
  const b = document.getElementById('cart-badge');
  if (!b) return;
  const c = Cart.totalQty();
  b.textContent = c;
  b.hidden = c === 0;
}
